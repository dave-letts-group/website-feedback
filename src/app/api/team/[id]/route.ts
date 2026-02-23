import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, requireRole } from "@/lib/auth";

const VALID_ROLES = ["owner", "admin", "member"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!requireRole(session, "owner")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (id === session.adminId) {
    return NextResponse.json(
      { error: "Cannot change your own role" },
      { status: 400 },
    );
  }

  const target = await prisma.admin.findUnique({ where: { id } });
  if (!target || target.tenantId !== session.tenantId) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  try {
    const { role } = await request.json();
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    if (target.role === "owner" && role !== "owner") {
      const ownerCount = await prisma.admin.count({
        where: { tenantId: session.tenantId, role: "owner" },
      });
      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: "Cannot remove the last owner" },
          { status: 400 },
        );
      }
    }

    const updated = await prisma.admin.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, name: true, role: true },
    });

    return NextResponse.json({ member: updated });
  } catch (error) {
    console.error("Role update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!requireRole(session, "owner", "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (id === session.adminId) {
    return NextResponse.json(
      { error: "Cannot remove yourself" },
      { status: 400 },
    );
  }

  const target = await prisma.admin.findUnique({ where: { id } });
  if (!target || target.tenantId !== session.tenantId) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (!session.isSuperAdmin && session.role === "admin" && target.role !== "member") {
    return NextResponse.json(
      { error: "Admins can only remove members" },
      { status: 403 },
    );
  }

  if (target.role === "owner") {
    const ownerCount = await prisma.admin.count({
      where: { tenantId: session.tenantId, role: "owner" },
    });
    if (ownerCount <= 1) {
      return NextResponse.json(
        { error: "Cannot remove the last owner" },
        { status: 400 },
      );
    }
  }

  await prisma.admin.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
