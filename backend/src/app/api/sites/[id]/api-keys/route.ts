import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, requireRole } from "@/lib/auth";
import { createApiKey } from "@/lib/apiKey";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: siteId } = await params;

  const site = await prisma.site.findFirst({
    where: { id: siteId, tenantId: session.tenantId },
  });
  if (!site)
    return NextResponse.json({ error: "Site not found" }, { status: 404 });

  const apiKeys = await prisma.apiKey.findMany({
    where: { siteId },
    select: {
      id: true,
      name: true,
      permissions: true,
      expiresAt: true,
      createdAt: true,
      lastUsedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ apiKeys });
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!requireRole(session, "owner", "admin"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: siteId } = await params;

  const site = await prisma.site.findFirst({
    where: { id: siteId, tenantId: session.tenantId },
  });
  if (!site)
    return NextResponse.json({ error: "Site not found" }, { status: 404 });

  try {
    const { name, permissions = ["feedback:write"], expiresInDays } = await request.json();

    if (!name?.trim())
      return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const apiKey = await createApiKey({
      siteId,
      tenantId: session.tenantId,
      name: name.trim(),
      permissions,
      expiresInDays,
    });

    return NextResponse.json({
      apiKey,
      warning: "Store this key securely — it will not be shown again",
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
