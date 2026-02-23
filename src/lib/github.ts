import { prisma } from "./db";

const GITHUB_API = "https://api.github.com";

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

const CATEGORY_LABELS: Record<string, string[]> = {
  bug: ["bug"],
  feature: ["enhancement"],
  general: ["feedback"],
};

function buildIssueTitle(feedback: FeedbackData): string {
  const prefix =
    feedback.category === "bug"
      ? "Bug"
      : feedback.category === "feature"
        ? "Feature Request"
        : "Feedback";

  const snippet =
    feedback.message.length > 80
      ? feedback.message.slice(0, 77) + "..."
      : feedback.message;

  return `[${prefix}] ${snippet}`;
}

function buildIssueBody(
  feedback: FeedbackData,
  adminBaseUrl: string | undefined
): string {
  const lines: string[] = [];

  lines.push(feedback.message);
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("| Field | Value |");
  lines.push("|-------|-------|");

  if (feedback.pageTitle)
    lines.push(`| **Page Title** | ${feedback.pageTitle} |`);
  if (feedback.pageUrl)
    lines.push(`| **Page URL** | ${feedback.pageUrl} |`);
  if (feedback.pageId)
    lines.push(`| **Page ID** | ${feedback.pageId} |`);
  if (feedback.userName)
    lines.push(`| **User** | ${feedback.userName} |`);
  if (feedback.userId)
    lines.push(`| **User ID** | ${feedback.userId} |`);
  if (feedback.category)
    lines.push(`| **Category** | ${feedback.category} |`);
  if (feedback.rating)
    lines.push(
      `| **Rating** | ${"★".repeat(feedback.rating)}${"☆".repeat(5 - feedback.rating)} |`
    );

  lines.push(
    `| **Submitted** | ${feedback.createdAt.toISOString()} |`
  );

  if (feedback.metadata) {
    lines.push("");
    lines.push("<details><summary>Metadata</summary>");
    lines.push("");
    lines.push("```json");
    lines.push(JSON.stringify(feedback.metadata, null, 2));
    lines.push("```");
    lines.push("</details>");
  }

  if (adminBaseUrl) {
    lines.push("");
    lines.push(
      `[View in Admin Portal](${adminBaseUrl}/admin/feedback/${feedback.id})`
    );
  }

  lines.push("");
  lines.push(
    "*Created automatically by [LettsFeedback](https://github.com)*"
  );

  return lines.join("\n");
}

export async function createGithubIssue(
  token: string,
  repo: string,
  feedback: FeedbackData
): Promise<string | null> {
  const adminBaseUrl = process.env.NEXT_PUBLIC_APP_URL;

  const labels = CATEGORY_LABELS[feedback.category] || ["feedback"];

  const body = {
    title: buildIssueTitle(feedback),
    body: buildIssueBody(feedback, adminBaseUrl),
    labels,
  };

  const response = await fetch(`${GITHUB_API}/repos/${repo}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `GitHub API error ${response.status}: ${errorBody}`
    );
  }

  const result = await response.json();
  return result.html_url || null;
}

/**
 * Fire-and-forget: creates a GitHub issue and stores the URL back on the feedback row.
 * Logs errors but never throws, so it won't break the main feedback flow.
 */
export async function syncFeedbackToGithub(
  siteId: string,
  feedbackId: string,
  feedback: FeedbackData
) {
  try {
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: { githubToken: true, githubRepo: true },
    });

    if (!site?.githubToken || !site?.githubRepo) return;

    const issueUrl = await createGithubIssue(
      site.githubToken,
      site.githubRepo,
      feedback
    );

    if (issueUrl) {
      await prisma.feedback.update({
        where: { id: feedbackId },
        data: { githubIssueUrl: issueUrl },
      });
    }
  } catch (error) {
    console.error(`GitHub sync failed for feedback ${feedbackId}:`, error);
  }
}

/**
 * Verify that a GitHub token has access to the specified repository.
 */
export async function verifyGithubCredentials(
  token: string,
  repo: string
): Promise<{ valid: boolean; error?: string; repoName?: string }> {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    return {
      valid: false,
      error: "Repository must be in owner/repo format (e.g. acme/my-app)",
    };
  }

  try {
    const response = await fetch(`${GITHUB_API}/repos/${repo}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { valid: false, error: "Invalid GitHub token" };
      }
      if (response.status === 403) {
        return {
          valid: false,
          error: "Token does not have access to this repository",
        };
      }
      if (response.status === 404) {
        return {
          valid: false,
          error:
            "Repository not found. Check the owner/repo format and token permissions.",
        };
      }
      return {
        valid: false,
        error: `GitHub API returned ${response.status}`,
      };
    }

    const data = await response.json();

    if (!data.has_issues) {
      return {
        valid: false,
        error: "Issues are disabled on this repository",
      };
    }

    const perms = data.permissions || {};
    if (!perms.push && !perms.admin) {
      return {
        valid: false,
        error:
          "Token needs write access (push permission) to create issues",
      };
    }

    return { valid: true, repoName: data.full_name };
  } catch (error) {
    return {
      valid: false,
      error: `Connection failed: ${(error as Error).message}`,
    };
  }
}
