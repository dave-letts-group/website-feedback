import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, createToken, requireSuperAdmin } from "@/lib/auth";

export async function POST() {
  const session = await getSession();
  if (!session || !requireSuperAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = await prisma.admin.findUnique({
    where: { id: session.adminId },
    select: { tenantId: true, role: true },
  });

  if (!admin) {
    return NextResponse.json({ error: "Admin not found" }, { status: 404 });
  }

  const token = await createToken({
    adminId: session.adminId,
    tenantId: admin.tenantId,
    role: admin.role,
    isSuperAdmin: true,
  });

  const response = NextResponse.json({ success: true });

  response.cookies.set("auth-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  response.cookies.delete("current-site-id");

  return response;
}
