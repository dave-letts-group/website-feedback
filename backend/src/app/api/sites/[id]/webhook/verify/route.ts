import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, requireRole } from "@/lib/auth";
import { verifyWebhookCredentials } from "@/lib/webhook";

export async function POST(
  request: NextRequest,
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
  const site = await prisma.site.findUnique({ where: { id } });
  if (!site || site.tenantId !== session.tenantId) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  let body: { webhookUrl?: string; webhookToken?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const webhookUrl = body.webhookUrl?.trim() || site.webhookUrl || "";
  const webhookToken = body.webhookToken?.trim() || site.webhookToken || "";

  if (!webhookUrl || !webhookToken) {
    return NextResponse.json(
      { error: "Webhook URL and bearer token must be configured before verification" },
      { status: 400 },
    );
  }

  const check = await verifyWebhookCredentials(webhookUrl, webhookToken);
  if (!check.valid) {
    return NextResponse.json(
      { error: check.error || "Webhook verification failed", webhookError: true },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true, message: "Webhook verification succeeded" });
}
