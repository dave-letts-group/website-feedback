import { prisma } from "./db";

export interface ApiKeyPayload {
  id: string;
  siteId: string;
  tenantId: string;
  name: string;
  permissions: string[];
}

/**
 * Verify an API key and check permissions
 * @param key - The API key to verify
 * @param requiredPermissions - Permissions required for the operation
 * @returns The API key payload if valid, null if invalid or insufficient permissions
 */
export async function verifyApiKey(
  key: string,
  requiredPermissions: string[]
): Promise<ApiKeyPayload | null> {
  // Case-insensitive key check (hex keys should be lowercase)
  const normalizedKey = key.trim().toLowerCase();

  const apiKey = await prisma.apiKey.findUnique({
    where: { key: normalizedKey },
    include: { site: true },
  });

  if (!apiKey) {
    // Fallback search in case it was stored differently (though it shouldn't be)
    const fallbackKey = await prisma.apiKey.findFirst({
      where: { key: { equals: normalizedKey, mode: 'insensitive' } },
      include: { site: true },
    });
    if (!fallbackKey) return null;
    return {
      id: fallbackKey.id,
      siteId: fallbackKey.siteId,
      tenantId: fallbackKey.tenantId,
      name: fallbackKey.name,
      permissions: fallbackKey.permissions,
    };
  }

  // Check if expired
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return null;
  }

  // Check permissions - ensure permissions is an array
  const keyPermissions = Array.isArray(apiKey.permissions) ? apiKey.permissions : [];
  if (!requiredPermissions.every((p) => keyPermissions.includes(p))) {
    return null;
  }

  // Update lastUsedAt for usage tracking
  await prisma.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {
      // Ignore errors on lastUsedAt update - don't fail the request
    });

  return {
    id: apiKey.id,
    siteId: apiKey.siteId,
    tenantId: apiKey.tenantId,
    name: apiKey.name,
    permissions: apiKey.permissions,
  };
}

export function extractApiKey(request: Request): string | null {
  const headers = request.headers;

  // 1. Try Authorization header
  const auth = headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim() || null;
  }

  // 2. Try X-API-Key header
  let xApiKey = headers.get("x-api-key");
  if (xApiKey) {
    // Handle case where people put "Bearer " in X-API-Key too
    if (xApiKey.toLowerCase().startsWith("bearer ")) {
      xApiKey = xApiKey.slice(7).trim();
    }
    return xApiKey || null;
  }

  // 3. Try query parameter (fallback for quick testing)
  const url = new URL(request.url);
  const queryKey = url.searchParams.get("api_key") || url.searchParams.get("key");
  if (queryKey) return queryKey;

  return null;
}

/**
 * Generate a secure random API key
 * @returns A 64-character hex string
 */
export function generateApiKey(): string {
  const crypto = require("crypto");
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Create a new API key for a site
 * @param siteId - The site to create the key for
 * @param tenantId - The tenant ID (for validation)
 * @param name - Human-readable name for the key
 * @param permissions - Array of permission strings
 * @param expiresInDays - Optional expiration in days
 * @returns The created API key (including the raw key value)
 */
export async function createApiKey({
  siteId,
  tenantId,
  name,
  permissions,
  expiresInDays,
}: {
  siteId: string;
  tenantId: string;
  name: string;
  permissions: string[];
  expiresInDays?: number;
}) {
  const key = generateApiKey();
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const apiKey = await prisma.apiKey.create({
    data: {
      siteId,
      tenantId,
      name,
      key,
      permissions,
      expiresAt,
    },
    select: {
      id: true,
      name: true,
      key: true, // Return the raw key (only time it's visible)
      permissions: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return apiKey;
}