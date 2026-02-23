import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [tenant, sites] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: session.tenantId },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    }),
    prisma.site.findMany({
      where: { tenantId: session.tenantId },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...tenant,
    sites,
    role: session.role,
  });
}
