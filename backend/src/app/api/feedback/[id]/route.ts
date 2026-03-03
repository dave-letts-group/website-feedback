import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { verifyApiKey, extractApiKey } from "@/lib/apiKey";

const VALID_STATUSES = ["New", "Pending", "In Progress", "Closed"];

async function getTenantAndSite(request: NextRequest): Promise<{
  tenantId: string;
  siteId?: string;
} | null> {
  // Try session auth first
  const session = await getSession();
  if (session) {
    return { tenantId: session.tenantId };
  }

  // Try API key auth
  const apiKey = extractApiKey(request.headers);
  if (apiKey) {
    const verified = await verifyApiKey(apiKey, ["feedback:read"]);
    if (verified) {
      return { tenantId: verified.tenantId, siteId: verified.siteId };
    }
  }

  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getTenantAndSite(request);
  if (!auth) {
    return NextResponse.json(
      { error: "Unauthorized - session or API key required" },
      { status: 401 }
    );
  }

  const { id } = await params;
  const where: { id: string; tenantId: string; siteId?: string } = {
    id,
    tenantId: auth.tenantId,
  };

  // API key auth: restrict to site
  if (auth.siteId) {
    where.siteId = auth.siteId;
  }

  const feedback = await prisma.feedback.findFirst({ where });

  if (!feedback) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(feedback);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Try session auth first
  const session = await getSession();
  if (session) {
    const { id } = await params;
    const body = await request.json();

    if (!body.status || !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const result = await prisma.feedback.updateMany({
      where: { id, tenantId: session.tenantId },
      data: { status: body.status },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  }

  // Try API key auth (requires feedback:write permission)
  const apiKey = extractApiKey(request.headers);
  if (apiKey) {
    const verified = await verifyApiKey(apiKey, ["feedback:write"]);
    if (!verified) {
      return NextResponse.json(
        { error: "Invalid API key or insufficient permissions" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    if (!body.status || !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const result = await prisma.feedback.updateMany({
      where: { id, tenantId: verified.tenantId, siteId: verified.siteId },
      data: { status: body.status },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json(
    { error: "Unauthorized - session or Bearer token required" },
    { status: 401 }
  );
}
