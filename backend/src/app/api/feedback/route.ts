import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { verifyApiKey, extractApiKey } from "@/lib/apiKey";
import { syncFeedbackToNotion } from "@/lib/notion";
import { syncFeedbackToGithub } from "@/lib/github";
import { syncFeedbackToWebhook } from "@/lib/webhook";
import { sendFeedbackReceivedEmail } from "@/lib/email";
import { checkOrigin, corsHeaders } from "@/lib/origin";

interface FeedbackSnapshot {
  id: string;
  message: string;
  category: string;
  userName: string | null;
  pageUrl: string | null;
}

async function notifyTeamOfFeedback(
  siteId: string,
  tenantId: string,
  feedbackId: string,
  feedback: FeedbackSnapshot,
  siteName: string
) {
  try {
    const admins = await prisma.admin.findMany({
      where: { tenantId },
      select: { email: true },
    });

    const emails = admins.map((a) => a.email);
    if (emails.length === 0) return;

    const feedbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/feedback/${feedbackId}`;

    sendFeedbackReceivedEmail({
      to: emails,
      siteName,
      category: feedback.category,
      message: feedback.message,
      userName: feedback.userName,
      pageUrl: feedback.pageUrl,
      feedbackUrl,
    });
  } catch (error) {
    console.error(`Email notification failed for feedback ${feedbackId}:`, error);
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return NextResponse.json(null, {
    headers: {
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Site-Key, Authorization, X-API-Key",
      ...(origin && { Vary: "Origin" }),
    },
  });
}

export async function POST(request: NextRequest) {
  const fallbackCors = corsHeaders(request);

  try {
    const siteKey = request.headers.get("x-site-key");
    if (!siteKey) {
      return NextResponse.json(
        { error: "Missing site key" },
        { status: 401, headers: fallbackCors }
      );
    }

    const site = await prisma.site.findUnique({ where: { siteKey } });
    if (!site) {
      return NextResponse.json(
        { error: "Invalid site key" },
        { status: 401, headers: fallbackCors }
      );
    }

    const cors = corsHeaders(request, site.domain);

    const originCheck = checkOrigin(request, site.domain);
    if (!originCheck.allowed) {
      return NextResponse.json(
        {
          error: "Origin not allowed for this site key",
          origin: originCheck.hostname,
        },
        { status: 403, headers: cors }
      );
    }

    const body = await request.json();
    if (!body.message?.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400, headers: cors }
      );
    }

    const feedback = await prisma.feedback.create({
      data: {
        siteId: site.id,
        tenantId: site.tenantId,
        pageTitle: body.pageTitle || null,
        pageId: body.pageId || null,
        pageUrl: body.pageUrl || null,
        urlParams: body.urlParams || null,
        userId: body.userId || null,
        userName: body.userName || null,
        message: body.message.trim(),
        category: body.category || "general",
        rating: body.rating ? parseInt(body.rating, 10) : null,
        screenshot: body.screenshot || null,
        metadata: body.metadata || null,
        userAgent: body.userAgent || null,
        sourceDomain: originCheck.hostname,
      },
    });

    const feedbackData = {
      id: feedback.id,
      pageTitle: feedback.pageTitle,
      pageUrl: feedback.pageUrl,
      pageId: feedback.pageId,
      userId: feedback.userId,
      userName: feedback.userName,
      message: feedback.message,
      category: feedback.category,
      rating: feedback.rating,
      status: feedback.status,
      screenshot: feedback.screenshot,
      metadata: feedback.metadata,
      createdAt: feedback.createdAt,
    };

    await Promise.all([
      syncFeedbackToNotion(site.id, feedback.id, feedbackData),
      syncFeedbackToGithub(site.id, feedback.id, feedbackData),
      syncFeedbackToWebhook(site.id, feedback.id, feedbackData),
    ]);

    notifyTeamOfFeedback(site.id, site.tenantId, feedback.id, feedbackData, site.name);

    return NextResponse.json(
      { id: feedback.id, success: true },
      { headers: cors }
    );
  } catch (error) {
    console.error("Feedback submission error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: fallbackCors }
    );
  }
}

export async function GET(request: NextRequest) {
  // Try session auth first
  const session = await getSession();

  // If no session, try API key auth
  let tenantId: string;
  let siteFilter: string | undefined;

  if (session) {
    tenantId = session.tenantId;
  } else {
    const apiKey = extractApiKey(request.headers);
    if (!apiKey) {
      return NextResponse.json(
        { error: "Unauthorized - session or Bearer token required" },
        { status: 401 }
      );
    }

    const verified = await verifyApiKey(apiKey, ["feedback:read"]);
    if (!verified) {
      return NextResponse.json(
        { error: "Invalid or expired API key" },
        { status: 401 }
      );
    }

    tenantId = verified.tenantId;
    siteFilter = verified.siteId; // API key is scoped to specific site
  }

  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("siteId");
  const status = searchParams.get("status");
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where: Record<string, unknown> = { tenantId };

  // API key auth: restrict to the site the key belongs to
  if (siteFilter) {
    where.siteId = siteFilter;
  } else if (siteId) {
    // Session auth: allow filtering by siteId
    where.siteId = siteId;
  }

  if (status && status !== "all") where.status = status;
  if (category && category !== "all") where.category = category;
  if (search) {
    where.OR = [
      { message: { contains: search, mode: "insensitive" } },
      { pageTitle: { contains: search, mode: "insensitive" } },
      { userName: { contains: search, mode: "insensitive" } },
    ];
  }

  const [feedback, total] = await Promise.all([
    prisma.feedback.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        pageTitle: true,
        pageUrl: true,
        userId: true,
        userName: true,
        message: true,
        category: true,
        rating: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.feedback.count({ where }),
  ]);

  return NextResponse.json({ feedback, total, page, limit });
}
