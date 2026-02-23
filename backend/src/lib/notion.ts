import { prisma } from "./db";

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

interface FeedbackData {
  id: string;
  pageTitle: string | null;
  pageUrl: string | null;
  pageId: string | null;
  userId: string | null;
  userName: string | null;
  message: string;
  category: string;
  rating: number | null;
  status: string;
  metadata: unknown;
  createdAt: Date;
}

interface NotionProperty {
  type: string;
  [key: string]: unknown;
}

function truncate(text: string | null | undefined, max = 2000): string {
  if (!text) return "";
  return text.length > max ? text.slice(0, max) : text;
}

function notionHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "Notion-Version": NOTION_VERSION,
  };
}

async function fetchDbSchema(
  apiKey: string,
  dbId: string
): Promise<Record<string, NotionProperty>> {
  const res = await fetch(`${NOTION_API}/databases/${dbId}`, {
    headers: notionHeaders(apiKey),
  });
  if (!res.ok) throw new Error(`Failed to fetch Notion DB schema: ${res.status}`);
  const db = await res.json();
  return db.properties || {};
}

function findProperty(
  schema: Record<string, NotionProperty>,
  candidates: string[],
  expectedType?: string
): { name: string; type: string } | null {
  const lowerCandidates = candidates.map((c) => c.toLowerCase());
  for (const [name, prop] of Object.entries(schema)) {
    const lower = name.toLowerCase();
    if (lowerCandidates.includes(lower)) {
      if (!expectedType || prop.type === expectedType) {
        return { name, type: prop.type };
      }
    }
  }
  return null;
}

function findTitleProperty(
  schema: Record<string, NotionProperty>
): string | null {
  for (const [name, prop] of Object.entries(schema)) {
    if (prop.type === "title") return name;
  }
  return null;
}

interface StatusGroup {
  id: string;
  name: string;
  color: string;
  option_ids?: string[];
  options?: Array<{ id: string; name: string; color: string }>;
}

function resolveStatusOption(
  schema: Record<string, NotionProperty>,
  propName: string,
  value: string
): string | null {
  const prop = schema[propName];
  if (!prop || prop.type !== "status") return value;

  const statusConfig = prop.status as { options?: Array<{ name: string }>; groups?: StatusGroup[] } | undefined;
  const options = statusConfig?.options || [];
  const optionNames = options.map((o) => o.name.toLowerCase());

  if (optionNames.includes(value.toLowerCase())) {
    return options.find((o) => o.name.toLowerCase() === value.toLowerCase())!.name;
  }

  const STATUS_MAP: Record<string, string[]> = {
    new: ["not started", "to do", "todo", "backlog", "open", "pending", "new"],
    reviewed: ["in progress", "in review", "reviewing", "under review", "active"],
    archived: ["done", "complete", "completed", "closed", "archived", "resolved"],
  };

  const candidates = STATUS_MAP[value.toLowerCase()] || [];
  for (const candidate of candidates) {
    const match = options.find((o) => o.name.toLowerCase() === candidate);
    if (match) return match.name;
  }

  if (options.length > 0) return options[0].name;
  return null;
}

function setProp(
  properties: Record<string, unknown>,
  propName: string,
  propType: string,
  value: string | number | null | undefined,
  schema?: Record<string, NotionProperty>
) {
  if (value === null || value === undefined || value === "") return;

  switch (propType) {
    case "title":
      properties[propName] = {
        title: [{ text: { content: truncate(String(value), 200) } }],
      };
      break;
    case "rich_text":
      properties[propName] = {
        rich_text: [{ text: { content: truncate(String(value)) } }],
      };
      break;
    case "select":
      properties[propName] = { select: { name: String(value) } };
      break;
    case "status": {
      const resolved = schema
        ? resolveStatusOption(schema, propName, String(value))
        : String(value);
      if (resolved) {
        properties[propName] = { status: { name: resolved } };
      }
      break;
    }
    case "multi_select":
      properties[propName] = {
        multi_select: [{ name: String(value) }],
      };
      break;
    case "number":
      properties[propName] = { number: Number(value) };
      break;
    case "url":
      properties[propName] = { url: String(value) };
      break;
    case "date":
      properties[propName] = { date: { start: String(value) } };
      break;
    case "email":
      properties[propName] = { email: String(value) };
      break;
    case "phone_number":
      properties[propName] = { phone_number: String(value) };
      break;
    case "checkbox":
      properties[propName] = { checkbox: Boolean(value) };
      break;
  }
}

function buildNotionProperties(
  feedback: FeedbackData,
  schema: Record<string, NotionProperty>,
  adminBaseUrl: string | undefined
) {
  const properties: Record<string, unknown> = {};

  const titleProp = findTitleProperty(schema);
  if (titleProp) {
    const userName = feedback.userName || "Anonymous";
    const title = `${userName}: ${feedback.category} — ${truncate(feedback.message, 80)}`;
    setProp(properties, titleProp, "title", title);
  }

  const mapping: [string[], string | number | null | undefined, string?][] = [
    [["message", "feedback", "description", "content", "details"], feedback.message],
    [["category", "type", "kind"], feedback.category],
    [["status", "state"], feedback.status],
    [["submitted date", "date", "submitted", "created", "created at", "createdat"], feedback.createdAt.toISOString()],
    [["page title", "pagetitle", "page"], feedback.pageTitle],
    [["page url", "pageurl", "url", "link", "source url", "sourceurl"], feedback.pageUrl],
    [["page id", "pageid"], feedback.pageId],
    [["user name", "username", "user", "name", "submitted by", "submittedby", "author"], feedback.userName],
    [["user id", "userid"], feedback.userId],
    [["rating", "score", "stars"], feedback.rating],
    [["metadata", "meta", "extra", "custom data", "customdata"], feedback.metadata ? JSON.stringify(feedback.metadata) : null],
    [["admin link", "adminlink", "admin url", "adminurl", "portal link", "portallink"], adminBaseUrl ? `${adminBaseUrl}/admin/feedback/${feedback.id}` : null],
  ];

  for (const [candidates, value] of mapping) {
    if (value === null || value === undefined) continue;
    const match = findProperty(schema, candidates);
    if (match && match.name !== titleProp) {
      setProp(properties, match.name, match.type, value, schema);
    }
  }

  return properties;
}

export async function pushFeedbackToNotion(
  notionApiKey: string,
  notionDbId: string,
  feedback: FeedbackData
): Promise<string | null> {
  const adminBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/+$/, "");

  const schema = await fetchDbSchema(notionApiKey, notionDbId);
  const properties = buildNotionProperties(feedback, schema, adminBaseUrl);

  const body = {
    parent: { database_id: notionDbId },
    properties,
  };

  const response = await fetch(`${NOTION_API}/pages`, {
    method: "POST",
    headers: notionHeaders(notionApiKey),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Notion API error ${response.status}: ${errorBody}`
    );
  }

  const result = await response.json();
  return result.id || null;
}

/**
 * Fire-and-forget: saves to Notion and stores the page ID back on the feedback row.
 * Logs errors but never throws, so it won't break the main feedback flow.
 */
export async function syncFeedbackToNotion(
  siteId: string,
  feedbackId: string,
  feedback: FeedbackData
) {
  try {
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: { notionApiKey: true, notionDbId: true },
    });

    if (!site?.notionApiKey || !site?.notionDbId) return;

    const notionPageId = await pushFeedbackToNotion(
      site.notionApiKey,
      site.notionDbId,
      feedback
    );

    if (notionPageId) {
      await prisma.feedback.update({
        where: { id: feedbackId },
        data: { notionPageId },
      });
    }
  } catch (error) {
    console.error(`Notion sync failed for feedback ${feedbackId}:`, error);
  }
}

/**
 * Verify that a Notion API key and database ID are valid by querying the database.
 */
export async function verifyNotionCredentials(
  apiKey: string,
  dbId: string
): Promise<{ valid: boolean; error?: string; dbTitle?: string }> {
  try {
    const response = await fetch(`${NOTION_API}/databases/${dbId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Notion-Version": NOTION_VERSION,
      },
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      if (response.status === 401) {
        return { valid: false, error: "Invalid Notion API key" };
      }
      if (response.status === 404) {
        return {
          valid: false,
          error:
            "Database not found. Make sure the integration has access to the database.",
        };
      }
      return {
        valid: false,
        error: (body as { message?: string }).message || `Notion API returned ${response.status}`,
      };
    }

    const db = await response.json();
    const title =
      db.title?.[0]?.plain_text || db.title?.[0]?.text?.content || "Untitled";
    return { valid: true, dbTitle: title };
  } catch (error) {
    return {
      valid: false,
      error: `Connection failed: ${(error as Error).message}`,
    };
  }
}
