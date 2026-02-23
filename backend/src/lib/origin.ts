/**
 * Extract the hostname from an Origin or Referer header value.
 */
export function extractHostname(value: string): string | null {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    const trimmed = value.trim().toLowerCase();
    return trimmed || null;
  }
}

/**
 * Check whether a hostname matches an allowed domain pattern.
 *
 * Rules:
 *   - "example.com"  matches  example.com, www.example.com, staging.example.com
 *   - "localhost"     matches  localhost
 *   - Comparison is case-insensitive
 */
function matchesDomain(hostname: string, pattern: string): boolean {
  const h = hostname.toLowerCase();
  const p = pattern.toLowerCase().trim();
  if (!p) return false;

  if (h === p) return true;
  if (h.endsWith(`.${p}`)) return true;

  return false;
}

/**
 * Parse the tenant's domain field (comma-separated) into a list of patterns.
 */
function parseAllowedDomains(domain: string | null | undefined): string[] {
  if (!domain) return [];
  return domain
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

export interface OriginCheckResult {
  allowed: boolean;
  hostname: string | null;
  enforced: boolean;
}

/**
 * Validate a request's origin against the tenant's configured domain(s).
 *
 * - If the tenant has no domain configured, any origin is allowed (enforced=false).
 * - If the tenant has domain(s), the origin must match one of them.
 * - Returns the extracted hostname for storage on the feedback record.
 */
export function checkOrigin(
  request: { headers: { get(name: string): string | null } },
  tenantDomain: string | null | undefined
): OriginCheckResult {
  const origin =
    request.headers.get("origin") || request.headers.get("referer");
  const hostname = origin ? extractHostname(origin) : null;

  if (origin && origin.startsWith("chrome-extension://")) {
    return { allowed: true, hostname: "chrome-extension", enforced: false };
  }

  const allowed = parseAllowedDomains(tenantDomain);

  if (allowed.length === 0) {
    return { allowed: true, hostname, enforced: false };
  }

  if (!hostname) {
    return { allowed: false, hostname: null, enforced: true };
  }

  const match = allowed.some((pattern) => matchesDomain(hostname, pattern));
  return { allowed: match, hostname, enforced: true };
}

/**
 * Build CORS headers scoped to the validated origin instead of wildcard.
 */
export function corsHeaders(
  request: { headers: { get(name: string): string | null } },
  tenantDomain?: string | null
): Record<string, string> {
  const origin = request.headers.get("origin");
  const allowed = parseAllowedDomains(tenantDomain);

  let allowOrigin = "*";

  if (origin && origin.startsWith("chrome-extension://")) {
    allowOrigin = origin;
  } else if (origin && allowed.length > 0) {
    const hostname = extractHostname(origin);
    if (hostname && allowed.some((p) => matchesDomain(hostname, p))) {
      allowOrigin = origin;
    }
  } else if (origin) {
    allowOrigin = origin;
  }

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Site-Key",
    ...(allowOrigin !== "*" && { Vary: "Origin" }),
  };
}
