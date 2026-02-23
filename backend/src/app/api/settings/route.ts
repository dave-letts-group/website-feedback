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

    const site = await prisma.site.findUnique({ where: { id: siteId } });
    if (!site || (!session.isSuperAdmin && site.tenantId !== session.tenantId)) {
      return NextResponse.json(
        { error: "Site not found" },
        { status: 404 }
      );
    }

    if (notionApiKey && notionDbId) {
      const check = await verifyNotionCredentials(notionApiKey, notionDbId);
      if (!check.valid) {
        return NextResponse.json(
          { error: `Notion: ${check.error}`, notionError: true },
          { status: 400 }
        );
      }
    }

    if (githubToken && githubRepo) {
      const check = await verifyGithubCredentials(githubToken, githubRepo);
      if (!check.valid) {
        return NextResponse.json(
          { error: `GitHub: ${check.error}`, githubError: true },
          { status: 400 }
        );
      }
    }

    const data: Record<string, string | null> = {};

    if ("notionApiKey" in body) {
      data.notionApiKey = notionApiKey || null;
    }
    if ("notionDbId" in body) {
      data.notionDbId = notionDbId || null;
    }
    if ("githubToken" in body) {
      data.githubToken = githubToken || null;
    }
    if ("githubRepo" in body) {
      data.githubRepo = githubRepo || null;
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
