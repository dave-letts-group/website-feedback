import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, requireRole } from "@/lib/auth";
import { verifyNotionCredentials } from "@/lib/notion";
import { verifyGithubCredentials } from "@/lib/github";

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!requireRole(session, "owner", "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { siteId, notionApiKey, notionDbId, githubToken, githubRepo } = body;

    if (!siteId) {
      return NextResponse.json(
        { error: "siteId is required" },
        { status: 400 }
      );
    }

    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: {
        tenantId: true,
        notionApiKey: true,
        notionDbId: true,
        githubToken: true,
        githubRepo: true,
      },
    });
    if (!site || (!session.isSuperAdmin && site.tenantId !== session.tenantId)) {
      return NextResponse.json(
        { error: "Site not found" },
        { status: 404 }
      );
    }

    const notionChanging = "notionApiKey" in body || "notionDbId" in body;
    const nextNotionApiKey =
      "notionApiKey" in body ? notionApiKey?.trim() || null : site.notionApiKey;
    const nextNotionDbId =
      "notionDbId" in body ? notionDbId?.trim() || null : site.notionDbId;

    if (notionChanging) {
      if (nextNotionApiKey && !nextNotionDbId) {
        return NextResponse.json(
          { error: "Notion database ID is required when setting an API key" },
          { status: 400 },
        );
      }
      if (!nextNotionApiKey && nextNotionDbId) {
        return NextResponse.json(
          { error: "Notion API key is required when setting a database ID" },
          { status: 400 },
        );
      }
      if (nextNotionApiKey && nextNotionDbId) {
        const check = await verifyNotionCredentials(nextNotionApiKey, nextNotionDbId);
        if (!check.valid) {
          return NextResponse.json(
            { error: `Notion: ${check.error}`, notionError: true },
            { status: 400 },
          );
        }
      }
    }

    const githubChanging = "githubToken" in body || "githubRepo" in body;
    const nextGithubToken =
      "githubToken" in body ? githubToken?.trim() || null : site.githubToken;
    const nextGithubRepo =
      "githubRepo" in body ? githubRepo?.trim() || null : site.githubRepo;

    if (githubChanging) {
      if (nextGithubToken && !nextGithubRepo) {
        return NextResponse.json(
          { error: "GitHub repository is required when setting a token" },
          { status: 400 },
        );
      }
      if (!nextGithubToken && nextGithubRepo) {
        return NextResponse.json(
          { error: "GitHub token is required when setting a repository" },
          { status: 400 },
        );
      }
      if (nextGithubToken && nextGithubRepo) {
        const check = await verifyGithubCredentials(nextGithubToken, nextGithubRepo);
        if (!check.valid) {
          return NextResponse.json(
            { error: `GitHub: ${check.error}`, githubError: true },
            { status: 400 },
          );
        }
      }
    }

    const data: Record<string, string | null> = {};

    if ("notionApiKey" in body) {
      data.notionApiKey = nextNotionApiKey;
    }
    if ("notionDbId" in body) {
      data.notionDbId = nextNotionDbId;
    }
    if ("githubToken" in body) {
      data.githubToken = nextGithubToken;
    }
    if ("githubRepo" in body) {
      data.githubRepo = nextGithubRepo;
    }

    await prisma.site.update({
      where: { id: siteId },
      data,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
