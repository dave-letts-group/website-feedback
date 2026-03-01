import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { createToken } from "@/lib/auth";
import { verifyNotionCredentials } from "@/lib/notion";
import { verifyGithubCredentials } from "@/lib/github";
import { verifyWebhookCredentials } from "@/lib/webhook";

export async function POST(request: NextRequest) {
  try {
    const {
      tenantName,
      domain,
      adminEmail,
      adminPassword,
      adminName,
      notionApiKey,
      notionDbId,
      githubToken,
      githubRepo,
      webhookUrl,
      webhookToken,
    } = await request.json();

    if (!tenantName || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: "Tenant name, admin email, and password are required" },
        { status: 400 }
      );
    }

    const nKey = notionApiKey?.trim() || "";
    const nDb = notionDbId?.trim() || "";
    const hasNotion = !!(nKey && nDb);
    if (nKey && !nDb) {
      return NextResponse.json(
        { error: "Notion Database ID is required when providing an API key" },
        { status: 400 }
      );
    }
    if (!nKey && nDb) {
      return NextResponse.json(
        { error: "Notion API Key is required when providing a Database ID" },
        { status: 400 }
      );
    }
    if (hasNotion) {
      const check = await verifyNotionCredentials(nKey, nDb);
      if (!check.valid) {
        return NextResponse.json(
          { error: `Notion: ${check.error}` },
          { status: 400 }
        );
      }
    }

    const gToken = githubToken?.trim() || "";
    const gRepo = githubRepo?.trim() || "";
    const hasGithub = !!(gToken && gRepo);
    if (gToken && !gRepo) {
      return NextResponse.json(
        { error: "GitHub repository is required when providing a token" },
        { status: 400 }
      );
    }
    if (!gToken && gRepo) {
      return NextResponse.json(
        { error: "GitHub token is required when providing a repository" },
        { status: 400 }
      );
    }
    if (hasGithub) {
      const check = await verifyGithubCredentials(gToken, gRepo);
      if (!check.valid) {
        return NextResponse.json(
          { error: `GitHub: ${check.error}` },
          { status: 400 }
        );
      }
    }

    const wUrl = webhookUrl?.trim() || "";
    const wToken = webhookToken?.trim() || "";
    const hasWebhook = !!(wUrl && wToken);
    if (wUrl && !wToken) {
      return NextResponse.json(
        { error: "Webhook bearer token is required when providing a callback URL" },
        { status: 400 }
      );
    }
    if (!wUrl && wToken) {
      return NextResponse.json(
        { error: "Webhook callback URL is required when providing a bearer token" },
        { status: 400 }
      );
    }
    if (hasWebhook) {
      const check = await verifyWebhookCredentials(wUrl, wToken);
      if (!check.valid) {
        return NextResponse.json(
          { error: `Webhook: ${check.error}` },
          { status: 400 }
        );
      }
    }

    const existingAdmin = await prisma.admin.findUnique({
      where: { email: adminEmail },
    });
    if (existingAdmin) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    const tenant = await prisma.tenant.create({
      data: {
        name: tenantName,
        admins: {
          create: {
            email: adminEmail,
            password: hashedPassword,
            name: adminName || null,
            role: "owner",
          },
        },
        sites: {
          create: {
            name: tenantName,
            domain: domain || null,
            notionApiKey: hasNotion ? nKey : null,
            notionDbId: hasNotion ? nDb : null,
            notionEnabled: hasNotion,
            githubToken: hasGithub ? gToken : null,
            githubRepo: hasGithub ? gRepo : null,
            githubEnabled: hasGithub,
            webhookUrl: hasWebhook ? wUrl : null,
            webhookToken: hasWebhook ? wToken : null,
            webhookEnabled: hasWebhook,
          },
        },
      },
      include: { admins: true, sites: true },
    });

    const admin = tenant.admins[0];
    const site = tenant.sites[0];
    const token = await createToken({
      adminId: admin.id,
      tenantId: tenant.id,
      role: "owner",
      isSuperAdmin: false,
    });

    const response = NextResponse.json({
      success: true,
      siteKey: site.siteKey,
      tenantId: tenant.id,
      siteId: site.id,
    });

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Setup error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
