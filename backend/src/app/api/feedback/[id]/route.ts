import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const feedback = await prisma.feedback.findFirst({
    where: { id, tenantId: session.tenantId },
  });

  if (!feedback)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(feedback);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const result = await prisma.feedback.updateMany({
    where: { id, tenantId: session.tenantId },
    data: { status: body.status },
  });

  if (result.count === 0)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
