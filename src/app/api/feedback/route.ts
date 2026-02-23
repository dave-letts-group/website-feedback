import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { syncFeedbackToNotion } from "@/lib/notion";
import { syncFeedbackToGithub } from "@/lib/github";
import { checkOrigin, corsHeaders } from "@/lib/origin";

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return NextResponse.json(null, {
    headers: {
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Site-Key",
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
      metadata: feedback.metadata,
      createdAt: feedback.createdAt,
    };

    syncFeedbackToNotion(site.id, feedback.id, feedbackData);
    syncFeedbackToGithub(site.id, feedback.id, feedbackData);

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
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("siteId");
  const status = searchParams.get("status");
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where: Record<string, unknown> = { tenantId: session.tenantId };
  if (siteId) where.siteId = siteId;
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
