import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createToken } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { tenant: { select: { name: true } } },
  });

  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "Invite not found or expired" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    email: invite.email,
    role: invite.role,
    tenantName: invite.tenant.name,
    expiresAt: invite.expiresAt,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const invite = await prisma.invite.findUnique({
    where: { token },
  });

  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "Invite not found or expired" },
      { status: 404 },
    );
  }

  try {
    const { name, password } = await request.json();

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const existingAdmin = await prisma.admin.findUnique({
      where: { email: invite.email },
    });
    if (existingAdmin) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [admin] = await prisma.$transaction([
      prisma.admin.create({
        data: {
          email: invite.email,
          password: hashedPassword,
          name: name?.trim() || null,
          tenantId: invite.tenantId,
          role: invite.role,
        },
      }),
      prisma.invite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      }),
    ]);

    const authToken = await createToken({
      adminId: admin.id,
      tenantId: admin.tenantId,
      role: admin.role,
      isSuperAdmin: false,
    });

    const response = NextResponse.json(
      { success: true, tenantId: admin.tenantId },
      { status: 201 },
    );
    response.cookies.set("auth-token", authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Invite accept error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
