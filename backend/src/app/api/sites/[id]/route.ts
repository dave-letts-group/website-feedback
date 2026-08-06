import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, requireRole } from "@/lib/auth";
import { verifyNotionCredentials } from "@/lib/notion";
import { verifyGithubCredentials } from "@/lib/github";
import { verifyWebhookCredentials } from "@/lib/webhook";

function maskSecret(value: string | null): string | null {
  return value ? "••••••••" : null;
}

type SiteRecord = Awaited<ReturnType<typeof prisma.site.findUniqueOrThrow>>;

function serializeSite(site: SiteRecord) {
  const { notionApiKey, githubToken, webhookToken, ...safeSite } = site;

  return {
    ...safeSite,
    hasNotionApiKey: Boolean(notionApiKey),
    notionApiKeyPreview: maskSecret(notionApiKey),
    hasGithubToken: Boolean(githubToken),
    githubTokenPreview: maskSecret(githubToken),
    hasWebhookToken: Boolean(webhookToken),
    webhookTokenPreview: maskSecret(webhookToken),
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const site = await prisma.site.findUnique({ where: { id } });
  if (!site || site.tenantId !== session.tenantId) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  return NextResponse.json({ site: serializeSite(site) });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!requireRole(session, "owner", "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const site = await prisma.site.findUnique({ where: { id } });
  if (!site || site.tenantId !== session.tenantId) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const {
      name,
      domain,
      notionApiKey,
      notionDbId,
      notionEnabled,
      githubToken,
      githubRepo,
      githubEnabled,
      webhookUrl,
      webhookToken,
      webhookEnabled,
    } =
      body;

    const nextNotionApiKey =
      notionApiKey !== undefined ? notionApiKey?.trim() || null : site.notionApiKey;
    const nextNotionDbId =
      notionDbId !== undefined ? notionDbId?.trim() || null : site.notionDbId;
    const nextGithubToken =
      githubToken !== undefined ? githubToken?.trim() || null : site.githubToken;
    const nextGithubRepo =
      githubRepo !== undefined ? githubRepo?.trim() || null : site.githubRepo;
    const nextWebhookUrl =
      webhookUrl !== undefined ? webhookUrl?.trim() || null : site.webhookUrl;
    const nextWebhookToken =
      webhookToken !== undefined ? webhookToken?.trim() || null : site.webhookToken;

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

    if (
      (notionApiKey !== undefined || notionDbId !== undefined) &&
      nextNotionApiKey &&
      nextNotionDbId
    ) {
      const check = await verifyNotionCredentials(nextNotionApiKey, nextNotionDbId);
      if (!check.valid) {
        return NextResponse.json(
          { error: `Notion: ${check.error}`, notionError: true },
          { status: 400 },
        );
      }
    }

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

    if (
      (githubToken !== undefined || githubRepo !== undefined) &&
      nextGithubToken &&
      nextGithubRepo
    ) {
      const check = await verifyGithubCredentials(nextGithubToken, nextGithubRepo);
      if (!check.valid) {
        return NextResponse.json(
          { error: `GitHub: ${check.error}`, githubError: true },
          { status: 400 },
        );
      }
    }

    if (nextWebhookUrl && !nextWebhookToken) {
      return NextResponse.json(
        { error: "Webhook bearer token is required when setting a callback URL" },
        { status: 400 },
      );
    }
    if (!nextWebhookUrl && nextWebhookToken) {
      return NextResponse.json(
        { error: "Webhook callback URL is required when setting a bearer token" },
        { status: 400 },
      );
    }

    if (
      (webhookUrl !== undefined || webhookToken !== undefined) &&
      nextWebhookUrl &&
      nextWebhookToken
    ) {
      const check = await verifyWebhookCredentials(nextWebhookUrl, nextWebhookToken);
      if (!check.valid) {
        return NextResponse.json(
          { error: `Webhook: ${check.error}`, webhookError: true },
          { status: 400 },
        );
      }
    }

    const data: Record<string, string | boolean | null> = {};

    if (name !== undefined) data.name = name.trim();
    if (domain !== undefined) data.domain = domain?.trim() || null;

    if (notionApiKey !== undefined) data.notionApiKey = nextNotionApiKey;
    if (notionDbId !== undefined) data.notionDbId = nextNotionDbId;

    if (githubToken !== undefined) data.githubToken = nextGithubToken;
    if (githubRepo !== undefined) data.githubRepo = nextGithubRepo;

    if (webhookUrl !== undefined) data.webhookUrl = nextWebhookUrl;
    if (webhookToken !== undefined) data.webhookToken = nextWebhookToken;
    if (notionEnabled !== undefined) data.notionEnabled = !!notionEnabled;
    if (githubEnabled !== undefined) data.githubEnabled = !!githubEnabled;
    if (webhookEnabled !== undefined) data.webhookEnabled = !!webhookEnabled;

    const updated = await prisma.site.update({ where: { id }, data });

    return NextResponse.json({ site: serializeSite(updated) });
  } catch (error) {
    console.error("Site update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!requireRole(session, "owner")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const site = await prisma.site.findUnique({ where: { id } });
  if (!site || site.tenantId !== session.tenantId) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  const siteCount = await prisma.site.count({
    where: { tenantId: session.tenantId },
  });
  if (siteCount <= 1) {
    return NextResponse.json(
      { error: "Cannot delete the last site" },
      { status: 400 },
    );
  }

  await prisma.feedback.deleteMany({ where: { siteId: id } });
  await prisma.site.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
