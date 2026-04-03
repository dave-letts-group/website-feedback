import { SignJWT, jwtVerify } from "jose";
import { createHash, randomBytes } from "crypto";
import type { NextResponse } from "next/server";

/**
 * LettsGroup Auth (OIDC): https://auth.letts.group/.well-known/openid-configuration
 *
 * Server env:
 *   LETTS_AUTH_CLIENT_ID
 *   LETTS_AUTH_CLIENT_SECRET
 *   NEXT_PUBLIC_APP_URL (origin for redirect_uri)
 * Optional:
 *   LETTS_AUTH_ISSUER — override issuer (default https://auth.letts.group)
 *
 * Client: set NEXT_PUBLIC_LETTS_SSO_ENABLED=true to show SSO buttons.
 *
 * Letts requires PKCE (RFC 7636): code_challenge on /authorize, code_verifier on /token.
 */

const COOKIE_OAUTH = "letts-oauth-state";
const COOKIE_REFRESH = "letts-refresh-token";
const COOKIE_SETUP = "letts-setup-assertion";

const secret = () =>
  new TextEncoder().encode(
    process.env.JWT_SECRET || "change-me-in-production-please",
  );

export function lettsIssuer() {
  return (process.env.LETTS_AUTH_ISSUER || "https://auth.letts.group").replace(
    /\/+$/,
    "",
  );
}

export function lettsEndpoints() {
  const b = lettsIssuer();
  return {
    authorize: `${b}/authorize`,
    token: `${b}/token`,
    userinfo: `${b}/userinfo`,
    revoke: `${b}/revoke`,
  };
}

export function isLettsOAuthConfigured() {
  return !!(
    process.env.LETTS_AUTH_CLIENT_ID?.trim() &&
    process.env.LETTS_AUTH_CLIENT_SECRET?.trim()
  );
}

export function appBaseUrl() {
  const u = (process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/+$/, "");
  return u;
}

export function lettsRedirectUri() {
  const base = appBaseUrl();
  if (!base) return "";
  return `${base}/api/auth/letts/callback`;
}

export type LettsOAuthIntent = "login" | "setup" | "invite";

export interface LettsOAuthStatePayload {
  st: string;
  /** PKCE code_verifier (stored server-side in signed cookie until token exchange) */
  cv: string;
  intent: LettsOAuthIntent;
  /** Invite acceptance token when intent === "invite" */
  it?: string;
}

export async function signLettsOAuthState(
  payload: LettsOAuthStatePayload,
): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("letts-oauth")
    .setExpirationTime("15m")
    .sign(secret());
}

export async function verifyLettsOAuthState(
  token: string | undefined,
): Promise<LettsOAuthStatePayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), {
      subject: "letts-oauth",
    });
    const p = payload as unknown as LettsOAuthStatePayload;
    if (!p.st || !p.cv || !p.intent) return null;
    return p;
  } catch {
    return null;
  }
}

export interface LettsSetupAssertion {
  typ: "letts-setup";
  email: string;
  name: string | null;
  sub: string;
}

export async function signLettsSetupAssertion(
  data: Omit<LettsSetupAssertion, "typ">,
): Promise<string> {
  const payload: LettsSetupAssertion = { typ: "letts-setup", ...data };
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("letts-setup")
    .setExpirationTime("15m")
    .sign(secret());
}

export async function verifyLettsSetupAssertion(
  token: string | undefined,
): Promise<LettsSetupAssertion | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), {
      subject: "letts-setup",
    });
    const p = payload as unknown as LettsSetupAssertion;
    if (p.typ !== "letts-setup" || !p.email || !p.sub) return null;
    return p;
  } catch {
    return null;
  }
}

export interface LettsTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}

export async function exchangeLettsCode(
  code: string,
  redirectUri: string,
  codeVerifier: string,
): Promise<LettsTokenResponse> {
  const clientId = process.env.LETTS_AUTH_CLIENT_ID!.trim();
  const clientSecret = process.env.LETTS_AUTH_CLIENT_SECRET!.trim();
  const { token } = lettsEndpoints();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
    code_verifier: codeVerifier,
  });
  const res = await fetch(token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Letts token error: ${res.status} ${t}`);
  }
  return res.json() as Promise<LettsTokenResponse>;
}

export interface LettsUserInfo {
  sub: string;
  email?: string;
  name?: string;
}

export async function fetchLettsUserInfo(
  accessToken: string,
): Promise<LettsUserInfo> {
  const { userinfo } = lettsEndpoints();
  const res = await fetch(userinfo, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Letts userinfo error: ${res.status} ${t}`);
  }
  return res.json() as Promise<LettsUserInfo>;
}

export async function revokeLettsToken(refreshToken: string) {
  const clientId = process.env.LETTS_AUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.LETTS_AUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return;
  const { revoke } = lettsEndpoints();
  const body = new URLSearchParams({
    token: refreshToken,
    token_type_hint: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
  });
  try {
    await fetch(revoke, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch {
    // best-effort revoke
  }
}

const cookieBase = {
  path: "/",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
};

export function attachLettsOAuthCookie(response: NextResponse, jwt: string) {
  response.cookies.set(COOKIE_OAUTH, jwt, {
    ...cookieBase,
    maxAge: 60 * 15,
  });
}

export function attachLettsRefreshCookie(
  response: NextResponse,
  refreshToken: string,
) {
  response.cookies.set(COOKIE_REFRESH, refreshToken, {
    ...cookieBase,
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function attachLettsSetupCookie(response: NextResponse, jwt: string) {
  response.cookies.set(COOKIE_SETUP, jwt, {
    ...cookieBase,
    maxAge: 60 * 15,
  });
}

export function clearLettsOAuthCookie(response: NextResponse) {
  response.cookies.set(COOKIE_OAUTH, "", { ...cookieBase, maxAge: 0 });
}

export function clearLettsSetupAssertionCookie(response: NextResponse) {
  response.cookies.set(COOKIE_SETUP, "", { ...cookieBase, maxAge: 0 });
}

export function clearLettsCookies(response: NextResponse) {
  response.cookies.set(COOKIE_OAUTH, "", { ...cookieBase, maxAge: 0 });
  response.cookies.set(COOKIE_REFRESH, "", { ...cookieBase, maxAge: 0 });
  response.cookies.set(COOKIE_SETUP, "", { ...cookieBase, maxAge: 0 });
}

export function randomState() {
  return randomBytes(32).toString("base64url");
}

/** RFC 7636: 43–128 char URL-safe verifier */
export function generatePkceCodeVerifier() {
  return randomBytes(32).toString("base64url");
}

export function pkceCodeChallengeS256(codeVerifier: string) {
  return createHash("sha256").update(codeVerifier).digest("base64url");
}

export { COOKIE_OAUTH, COOKIE_REFRESH, COOKIE_SETUP };
