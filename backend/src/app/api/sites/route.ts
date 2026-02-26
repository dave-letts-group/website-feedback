import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, requireRole } from "@/lib/auth";
import { verifyApiKey, extractApiKey } from "@/lib/apiKey";

export async function GET(request: NextRequest) {
  // Try session auth first
  const session = await getSession();
  if (session) {
    const sites = await prisma.site.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { feedback: true } },
      },
    });

    return NextResponse.json({
      sites: sites.map((s) => ({
        id: s.id,
        name: s.name,
        domain: s.domain,
        siteKey: s.siteKey,
        createdAt: s.createdAt,
        feedbackCount: s._count.feedback,
      })),
    });
  }

  // Try API key auth
  const apiKey = extractApiKey(request.headers);
  if (apiKey) {
    const verified = await verifyApiKey(apiKey, ["sites:read"]);
    if (!verified) {
      return NextResponse.json(
        { error: "Invalid API key or insufficient permissions" },
        { status: 401 }
      );
    }

    // API key is scoped to a specific site
    const site = await prisma.site.findFirst({
      where: { id: verified.siteId, tenantId: verified.tenantId },
      include: {
        _count: { select: { feedback: true } },
      },
    });

    if (!site) {
      return NextResponse.json({ sites: [] });
    }

    return NextResponse.json({
      sites: [{
        id: site.id,
        name: site.name,
        domain: site.domain,
        siteKey: site.siteKey,
        createdAt: site.createdAt,
        feedbackCount: site._count.feedback,
      }],
    });
  }

  return NextResponse.json(
    { error: "Unauthorized - session or Bearer token required" },
    { status: 401 }
  );
}

export async function POST(request: NextRequest) {
  const session = await getSession();

  let tenantId: string;

  if (session) {
    if (!requireRole(session, "owner", "admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    tenantId = session.tenantId;
  } else {
    const apiKey = extractApiKey(request.headers);
    if (!apiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const verified = await verifyApiKey(apiKey, ["sites:write"]);
    if (!verified) {
      return NextResponse.json(
        { error: "Invalid API key or insufficient permissions" },
        { status: 401 }
      );
    }
    tenantId = verified.tenantId;
  }

  try {
    const { name, domain } = await request.json();
    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 },
      );
    }

    // Create site and API key in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const site = await tx.site.create({
        data: {
          tenantId,
          name: name.trim(),
          domain: domain?.trim() || null,
        },
        select: {
          id: true,
          name: true,
          domain: true,
          siteKey: true,
          createdAt: true,
        },
      });

      // Create default API key for the site
      const apiKey = await tx.apiKey.create({
        data: {
          siteId: site.id,
          tenantId,
          name: `${site.name} - Default Key`,
          key: require("crypto").randomBytes(32).toString("hex"),
          permissions: ["feedback:read", "feedback:write", "sites:read"],
        },
        select: {
          id: true,
          name: true,
          key: true,
          permissions: true,
          expiresAt: true,
          createdAt: true,
        },
      });

      return { site, apiKey };
    });

    return NextResponse.json(
      {
        site: result.site,
        apiKey: {
          ...result.apiKey,
          // NOTE: This is the only time the raw key is returned
          // Store it securely - it cannot be retrieved later
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Site creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
