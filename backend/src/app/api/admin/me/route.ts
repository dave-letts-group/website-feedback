import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await prisma.admin.findUnique({
    where: { id: session.adminId },
    select: { id: true, name: true, email: true, role: true, isSuperAdmin: true },
  });

  if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ admin });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { name, currentPassword, newPassword } = body;

    const admin = await prisma.admin.findUnique({ where: { id: session.adminId } });
    if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data: { name?: string; password?: string } = {};

    if (name !== undefined) {
      data.name = name.trim() || null;
    }

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: "Current password is required" }, { status: 400 });
      }
      const valid = await bcrypt.compare(currentPassword, admin.password);
      if (!valid) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      }
      if (newPassword.length < 8) {
        return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
      }
      data.password = await bcrypt.hash(newPassword, 10);
    }

    await prisma.admin.update({ where: { id: session.adminId }, data });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
