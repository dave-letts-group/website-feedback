import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, requireRole } from "@/lib/auth";
import { verifyNotionCredentials } from "@/lib/notion";
import { verifyGithubCredentials } from "@/lib/github";
import { verifyWebhookCredentials } from "@/lib/webhook";

function maskSecret(value: string | null): string | null {
  return value ? "••••••••" : null;
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

  return NextResponse.json({
    site: {
      ...site,
      notionApiKey: maskSecret(site.notionApiKey),
      githubToken: maskSecret(site.githubToken),
      webhookToken: maskSecret(site.webhookToken),
    },
  });
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
      githubToken,
      githubRepo,
      webhookUrl,
      webhookToken,
    } =
      body;

    if (notionApiKey && notionDbId) {
      const check = await verifyNotionCredentials(notionApiKey, notionDbId);
      if (!check.valid) {
        return NextResponse.json(
          { error: `Notion: ${check.error}`, notionError: true },
          { status: 400 },
        );
      }
    }

    if (githubToken && githubRepo) {
      const check = await verifyGithubCredentials(githubToken, githubRepo);
      if (!check.valid) {
        return NextResponse.json(
          { error: `GitHub: ${check.error}`, githubError: true },
          { status: 400 },
        );
      }
    }

    const nextWebhookUrl =
      webhookUrl !== undefined ? webhookUrl?.trim() || null : site.webhookUrl;
    const nextWebhookToken =
      webhookToken !== undefined
        ? webhookToken?.trim() || null
        : site.webhookToken;

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

    const data: Record<string, string | null> = {};

    if (name !== undefined) data.name = name.trim();
    if (domain !== undefined) data.domain = domain?.trim() || null;

    if (notionApiKey && notionDbId) {
      data.notionApiKey = notionApiKey;
      data.notionDbId = notionDbId;
    } else if (notionApiKey === null || notionDbId === null) {
      data.notionApiKey = null;
      data.notionDbId = null;
    }

    if (githubToken && githubRepo) {
      data.githubToken = githubToken;
      data.githubRepo = githubRepo;
    } else if (githubToken === null || githubRepo === null) {
      data.githubToken = null;
      data.githubRepo = null;
    }

    if (webhookUrl !== undefined) data.webhookUrl = nextWebhookUrl;
    if (webhookToken !== undefined) data.webhookToken = nextWebhookToken;

    const updated = await prisma.site.update({ where: { id }, data });

    return NextResponse.json({
      site: {
        ...updated,
        notionApiKey: maskSecret(updated.notionApiKey),
        githubToken: maskSecret(updated.githubToken),
        webhookToken: maskSecret(updated.webhookToken),
      },
    });
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
