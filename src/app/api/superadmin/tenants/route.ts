import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, requireSuperAdmin } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || !requireSuperAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      _count: {
        select: {
          sites: true,
          admins: true,
        },
      },
    },
  });

  const tenantsWithStats = await Promise.all(
    tenants.map(async (t) => {
      const feedbackCount = await prisma.feedback.count({
        where: { tenantId: t.id },
      });
      return {
        id: t.id,
        name: t.name,
        createdAt: t.createdAt,
        siteCount: t._count.sites,
        memberCount: t._count.admins,
        feedbackCount,
      };
    }),
  );

  return NextResponse.json({ tenants: tenantsWithStats });
}
