import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, requireRole } from "@/lib/auth";
import { sendInviteEmail } from "@/lib/email";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!requireRole(session, "owner", "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const invites = await prisma.invite.findMany({
    where: {
      tenantId: session.tenantId,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      role: true,
      token: true,
      expiresAt: true,
      createdAt: true,
      invitedBy: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json({ invites });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!requireRole(session, "owner", "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { email, role } = await request.json();

    if (!email?.trim()) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 },
      );
    }

    const validRoles = ["owner", "admin", "member"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    if (!session.isSuperAdmin && session.role === "admin" && role !== "member") {
      return NextResponse.json(
        { error: "Admins can only invite members" },
        { status: 403 },
      );
    }

    const existingAdmin = await prisma.admin.findFirst({
      where: { email: email.trim(), tenantId: session.tenantId },
    });
    if (existingAdmin) {
      return NextResponse.json(
        { error: "This email already has an account in this team" },
        { status: 409 },
      );
    }

    const pendingInvite = await prisma.invite.findFirst({
      where: {
        email: email.trim(),
        tenantId: session.tenantId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (pendingInvite) {
      return NextResponse.json(
        { error: "A pending invite already exists for this email" },
        { status: 409 },
      );
    }

    const invite = await prisma.invite.create({
      data: {
        tenantId: session.tenantId,
        email: email.trim(),
        role,
        invitedById: session.adminId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      select: {
        id: true,
        email: true,
        role: true,
        token: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invite.token}`;

    const [inviter, tenant] = await Promise.all([
      prisma.admin.findUnique({
        where: { id: session.adminId },
        select: { name: true, email: true },
      }),
      prisma.tenant.findUnique({
        where: { id: session.tenantId },
        select: { name: true },
      }),
    ]);

    sendInviteEmail({
      to: invite.email,
      inviteUrl,
      inviterName: inviter?.name || inviter?.email || "A team member",
      teamName: tenant?.name || "your team",
      role: invite.role,
    });

    return NextResponse.json({ invite, inviteUrl }, { status: 201 });
  } catch (error) {
    console.error("Invite creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
