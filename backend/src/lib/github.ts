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
    "*Created automatically by [WebFeedback](https://github.com)*"
  );

  return lines.join("\n");
}

export async function createGithubIssue(
  token: string,
  repo: string,
  feedback: FeedbackData
): Promise<{ url: string | null; number: number | null }> {
  const adminBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/+$/, "");

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
  return {
    url: result.html_url || null,
    number: result.number || null,
  };
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
      select: { githubToken: true, githubRepo: true, githubEnabled: true },
    });

    if (!site?.githubToken || !site?.githubRepo || !site.githubEnabled) return;

    const issue = await createGithubIssue(
      site.githubToken,
      site.githubRepo,
      feedback
    );

    if (issue.url) {
      await prisma.feedback.update({
        where: { id: feedbackId },
        data: {
          githubIssueUrl: issue.url,
          githubIssueNumber: issue.number,
        },
      });
    }
  } catch (error) {
    console.error(`GitHub sync failed for feedback ${feedbackId}:`, error);
  }
}

/**
 * Close or reopen a GitHub issue.
 */
async function updateGithubIssueState(
  token: string,
  repo: string,
  issueNumber: number,
  state: "open" | "closed"
): Promise<void> {
  const response = await fetch(
    `${GITHUB_API}/repos/${repo}/issues/${issueNumber}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ state }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `GitHub API error ${response.status}: ${errorBody}`
    );
  }
}

/**
 * When feedback status changes, sync the state to GitHub.
 * Closing feedback → closes GitHub issue. Reopening → reopens it.
 */
export async function syncStatusToGithub(
  feedbackId: string,
  newStatus: string
) {
  try {
    const feedback = await prisma.feedback.findUnique({
      where: { id: feedbackId },
      select: {
        githubIssueNumber: true,
        siteId: true,
      },
    });

    if (!feedback?.githubIssueNumber) return;

    const site = await prisma.site.findUnique({
      where: { id: feedback.siteId },
      select: { githubToken: true, githubRepo: true, githubEnabled: true },
    });

    if (!site?.githubToken || !site?.githubRepo || !site.githubEnabled) return;

    const ghState = newStatus === "Closed" ? "closed" : "open";
    await updateGithubIssueState(
      site.githubToken,
      site.githubRepo,
      feedback.githubIssueNumber,
      ghState
    );
  } catch (error) {
    console.error(
      `GitHub status sync failed for feedback ${feedbackId}:`,
      error
    );
  }
}

/**
 * Fetch a GitHub issue's current state, title, and number.
 * Used to sync status when viewing feedback in the admin portal.
 */
export async function fetchGithubIssueState(
  token: string,
  repo: string,
  issueNumber: number
): Promise<{ state: string; title: string; number: number } | null> {
  try {
    const response = await fetch(
      `${GITHUB_API}/repos/${repo}/issues/${issueNumber}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        next: { revalidate: 0 },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    return {
      state: data.state,
      title: data.title,
      number: data.number,
    };
  } catch {
    return null;
  }
}

/**
 * Check GitHub issue state and sync back to feedback if it changed.
 * Returns the GitHub issue info for display purposes.
 */
export async function checkAndSyncGithubState(
  feedbackId: string
): Promise<{ state: string; title: string; number: number; url: string } | null> {
  try {
    const feedback = await prisma.feedback.findUnique({
      where: { id: feedbackId },
      select: {
        githubIssueNumber: true,
        githubIssueUrl: true,
        status: true,
        siteId: true,
      },
    });

    if (!feedback?.githubIssueNumber || !feedback.githubIssueUrl) return null;

    const site = await prisma.site.findUnique({
      where: { id: feedback.siteId },
      select: { githubToken: true, githubRepo: true, githubEnabled: true },
    });

    if (!site?.githubToken || !site?.githubRepo || !site.githubEnabled) return null;

    const ghIssue = await fetchGithubIssueState(
      site.githubToken,
      site.githubRepo,
      feedback.githubIssueNumber
    );

    if (!ghIssue) return null;

    // Sync: if GitHub issue was closed but feedback is still open, close it
    if (ghIssue.state === "closed" && feedback.status !== "Closed") {
      await prisma.feedback.update({
        where: { id: feedbackId },
        data: { status: "Closed" },
      });
    }
    // Sync: if GitHub issue was reopened but feedback is closed, reopen it
    if (ghIssue.state === "open" && feedback.status === "Closed") {
      await prisma.feedback.update({
        where: { id: feedbackId },
        data: { status: "New" },
      });
    }

    return {
      ...ghIssue,
      url: feedback.githubIssueUrl,
    };
  } catch (error) {
    console.error(`GitHub state check failed for feedback ${feedbackId}:`, error);
    return null;
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
