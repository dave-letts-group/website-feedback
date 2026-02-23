import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, requireSuperAdmin } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || !requireSuperAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      sites: {
        select: {
          id: true,
          name: true,
          domain: true,
          siteKey: true,
          createdAt: true,
          _count: { select: { feedback: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      admins: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isSuperAdmin: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const feedbackCount = await prisma.feedback.count({
    where: { tenantId: id },
  });

  return NextResponse.json({
    tenant: {
      ...tenant,
      feedbackCount,
      sites: tenant.sites.map((s) => ({
        ...s,
        feedbackCount: s._count.feedback,
        _count: undefined,
      })),
    },
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || !requireSuperAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  if (id === session.tenantId) {
    return NextResponse.json(
      { error: "Cannot delete your own tenant" },
      { status: 400 },
    );
  }

  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.feedback.deleteMany({ where: { tenantId: id } }),
    prisma.invite.deleteMany({ where: { tenantId: id } }),
    prisma.site.deleteMany({ where: { tenantId: id } }),
    prisma.admin.deleteMany({ where: { tenantId: id } }),
    prisma.tenant.delete({ where: { id } }),
  ]);

  return NextResponse.json({ success: true });
}
