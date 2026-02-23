import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, requireSuperAdmin } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || !requireSuperAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [tenantCount, siteCount, adminCount, feedbackCount, recentFeedback] =
    await Promise.all([
      prisma.tenant.count(),
      prisma.site.count(),
      prisma.admin.count(),
      prisma.feedback.count(),
      prisma.feedback.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          message: true,
          category: true,
          status: true,
          createdAt: true,
          site: { select: { name: true } },
          tenantId: true,
        },
      }),
    ]);

  const tenantNames = await prisma.tenant.findMany({
    where: {
      id: { in: recentFeedback.map((f) => f.tenantId) },
    },
    select: { id: true, name: true },
  });

  const tenantMap = Object.fromEntries(tenantNames.map((t) => [t.id, t.name]));

  return NextResponse.json({
    stats: { tenantCount, siteCount, adminCount, feedbackCount },
    recentFeedback: recentFeedback.map((f) => ({
      ...f,
      tenantName: tenantMap[f.tenantId] || "Unknown",
    })),
  });
}
