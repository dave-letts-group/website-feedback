import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, createToken, requireSuperAdmin } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !requireSuperAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tenantId } = await request.json();
  if (!tenantId) {
    return NextResponse.json(
      { error: "tenantId is required" },
      { status: 400 },
    );
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { sites: { take: 1, orderBy: { createdAt: "asc" } } },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const token = await createToken({
    adminId: session.adminId,
    tenantId: tenant.id,
    role: "owner",
    isSuperAdmin: true,
  });

  const response = NextResponse.json({
    success: true,
    tenantId: tenant.id,
    tenantName: tenant.name,
  });

  response.cookies.set("auth-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  if (tenant.sites[0]) {
    response.cookies.set("current-site-id", tenant.sites[0].id, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return response;
}
