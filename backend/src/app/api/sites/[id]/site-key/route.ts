import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, requireRole } from "@/lib/auth";
import { extractApiKey, verifyApiKey } from "@/lib/apiKey";
import { generateSiteKey } from "@/lib/siteKey";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();

  let tenantId: string;
  let siteScopeId: string | null = null;

  if (session) {
    if (!requireRole(session, "owner", "admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    tenantId = session.tenantId;
  } else {
    const apiKey = extractApiKey(request);
    if (!apiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const verified = await verifyApiKey(apiKey, ["sites:write"]);
    if (!verified) {
      return NextResponse.json(
        { error: "Invalid API key or insufficient permissions" },
        { status: 401 },
      );
    }

    tenantId = verified.tenantId;
    siteScopeId = verified.siteId;
  }

  const site = await prisma.site.findFirst({
    where: { id, tenantId },
    select: { id: true },
  });

  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  if (siteScopeId && siteScopeId !== id) {
    return NextResponse.json(
      { error: "API key cannot rotate another site's key" },
      { status: 403 },
    );
  }

  const updated = await prisma.site.update({
    where: { id },
    data: { siteKey: generateSiteKey() },
    select: {
      id: true,
      name: true,
      siteKey: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    site: updated,
    warning: "Store this new site key securely. The previous key is now invalid.",
  });
}
