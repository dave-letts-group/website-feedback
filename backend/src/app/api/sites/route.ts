import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, requireRole } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sites = await prisma.site.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      domain: true,
      siteKey: true,
      createdAt: true,
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

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!requireRole(session, "owner", "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { name, domain } = await request.json();
    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 },
      );
    }

    const site = await prisma.site.create({
      data: {
        tenantId: session.tenantId,
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

    return NextResponse.json({ site }, { status: 201 });
  } catch (error) {
    console.error("Site creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
