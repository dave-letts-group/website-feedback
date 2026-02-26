import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, requireRole } from "@/lib/auth";
import { generateApiKey } from "@/lib/apiKey";

interface RouteParams {
  params: Promise<{ id: string; keyId: string }>;
}

// GET /api/sites/[id]/api-keys/[keyId] - Get single API key details
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: siteId, keyId } = await params;

  // Verify site belongs to this tenant
  const site = await prisma.site.findFirst({
    where: { id: siteId, tenantId: session.tenantId },
  });

  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  const apiKey = await prisma.apiKey.findFirst({
    where: { id: keyId, siteId },
    select: {
      id: true,
      name: true,
      permissions: true,
      expiresAt: true,
      createdAt: true,
      lastUsedAt: true,
      // NOTE: Never return the raw key
    },
  });

  if (!apiKey) {
    return NextResponse.json({ error: "API key not found" }, { status: 404 });
  }

  return NextResponse.json({ apiKey });
}

// DELETE /api/sites/[id]/api-keys/[keyId] - Revoke/delete an API key
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!requireRole(session, "owner", "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: siteId, keyId } = await params;

  // Verify site belongs to this tenant
  const site = await prisma.site.findFirst({
    where: { id: siteId, tenantId: session.tenantId },
  });

  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  // Delete the API key
  const result = await prisma.apiKey.deleteMany({
    where: { id: keyId, siteId },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "API key not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: "API key revoked" });
}

// POST /api/sites/[id]/api-keys/[keyId]/refresh - Generate new key value (rotate)
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!requireRole(session, "owner", "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: siteId, keyId } = await params;

  // Check if this is a refresh request (path ends with /refresh)
  const url = new URL(request.url);
  if (!url.pathname.endsWith("/refresh")) {
    return NextResponse.json({ error: "Invalid endpoint" }, { status: 404 });
  }

  // Verify site belongs to this tenant
  const site = await prisma.site.findFirst({
    where: { id: siteId, tenantId: session.tenantId },
  });

  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  // Generate new key
  const newKey = generateApiKey();

  // Update the API key with new value
  const apiKey = await prisma.apiKey.updateMany({
    where: { id: keyId, siteId },
    data: { key: newKey, lastUsedAt: null },
  });

  if (apiKey.count === 0) {
    return NextResponse.json({ error: "API key not found" }, { status: 404 });
  }

  // Fetch the updated key to return
  const updatedKey = await prisma.apiKey.findFirst({
    where: { id: keyId, siteId },
    select: {
      id: true,
      name: true,
      key: true, // Return new raw key only on refresh
      permissions: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    apiKey: {
      ...updatedKey,
      warning: "Store this new key securely - the old key is now invalid",
    },
  });
}
