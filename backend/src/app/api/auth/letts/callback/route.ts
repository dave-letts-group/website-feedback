import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { createToken } from "@/lib/auth";
import {
  COOKIE_OAUTH,
  attachLettsRefreshCookie,
  attachLettsSetupCookie,
  clearLettsOAuthCookie,
  exchangeLettsCode,
  fetchLettsUserInfo,
  lettsRedirectUri,
  signLettsSetupAssertion,
  verifyLettsOAuthState,
} from "@/lib/letts-auth";

function redirect(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const oauthCookie = cookieStore.get(COOKIE_OAUTH)?.value;

  const oauthErr = request.nextUrl.searchParams.get("error");
  if (oauthErr) {
    const r = redirect(
      request,
      `/admin/login?letts_error=${encodeURIComponent(oauthErr)}`,
    );
    clearLettsOAuthCookie(r);
    return r;
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  if (!code || !state) {
    const r = redirect(request, "/admin/login?letts_error=missing_code");
    clearLettsOAuthCookie(r);
    return r;
  }

  const payload = await verifyLettsOAuthState(oauthCookie);
  if (!payload || payload.st !== state) {
    const r = redirect(request, "/admin/login?letts_error=invalid_state");
    clearLettsOAuthCookie(r);
    return r;
  }

  const redirectUri = lettsRedirectUri();
  if (!redirectUri) {
    const r = redirect(request, "/admin/login?letts_error=config");
    clearLettsOAuthCookie(r);
    return r;
  }

  let tokens;
  try {
    tokens = await exchangeLettsCode(code, redirectUri, payload.cv);
  } catch {
    const r = redirect(request, "/admin/login?letts_error=token_exchange");
    clearLettsOAuthCookie(r);
    return r;
  }

  let profile;
  try {
    profile = await fetchLettsUserInfo(tokens.access_token);
  } catch {
    const r = redirect(request, "/admin/login?letts_error=userinfo");
    clearLettsOAuthCookie(r);
    return r;
  }

  const emailRaw = profile.email?.trim();
  if (!emailRaw) {
    const r = redirect(request, "/admin/login?letts_error=no_email");
    clearLettsOAuthCookie(r);
    return r;
  }

  const email = emailRaw.toLowerCase();
  const name = profile.name?.trim() || null;
  const sub = profile.sub;

  if (payload.intent === "setup") {
    const setupJwt = await signLettsSetupAssertion({ email, name, sub });
    const r = redirect(request, "/setup");
    clearLettsOAuthCookie(r);
    attachLettsSetupCookie(r, setupJwt);
    if (tokens.refresh_token) {
      attachLettsRefreshCookie(r, tokens.refresh_token);
    }
    return r;
  }

  if (payload.intent === "invite") {
    const inviteToken = payload.it;
    if (!inviteToken) {
      const r = redirect(request, "/admin/login?letts_error=invite_missing");
      clearLettsOAuthCookie(r);
      return r;
    }

    const invite = await prisma.invite.findUnique({
      where: { token: inviteToken },
    });

    if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
      const r = redirect(
        request,
        `/invite/${encodeURIComponent(inviteToken)}?letts_error=invalid_invite`,
      );
      clearLettsOAuthCookie(r);
      return r;
    }

    if (invite.email.trim().toLowerCase() !== email) {
      const r = redirect(
        request,
        `/invite/${encodeURIComponent(inviteToken)}?letts_error=email_mismatch`,
      );
      clearLettsOAuthCookie(r);
      return r;
    }

    const existing = await prisma.admin.findUnique({
      where: { email: invite.email },
    });
    if (existing) {
      const r = redirect(
        request,
        `/invite/${encodeURIComponent(inviteToken)}?letts_error=exists`,
      );
      clearLettsOAuthCookie(r);
      return r;
    }

    const [admin] = await prisma.$transaction([
      prisma.admin.create({
        data: {
          email: invite.email,
          password: null,
          lettsSub: sub,
          name,
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

    const r = redirect(request, "/admin");
    clearLettsOAuthCookie(r);
    r.cookies.set("auth-token", authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    if (tokens.refresh_token) {
      attachLettsRefreshCookie(r, tokens.refresh_token);
    }
    return r;
  }

  // login
  let admin = await prisma.admin.findFirst({
    where: { lettsSub: sub },
  });

  if (!admin) {
    admin = await prisma.admin.findFirst({
      where: {
        OR: [{ email: emailRaw }, { email }],
      },
    });
  }

  if (!admin) {
    const r = redirect(request, "/admin/login?letts_error=no_account");
    clearLettsOAuthCookie(r);
    return r;
  }

  if (admin.lettsSub && admin.lettsSub !== sub) {
    const r = redirect(request, "/admin/login?letts_error=account_conflict");
    clearLettsOAuthCookie(r);
    return r;
  }

  if (!admin.lettsSub) {
    await prisma.admin.update({
      where: { id: admin.id },
      data: { lettsSub: sub },
    });
  }

  const authToken = await createToken({
    adminId: admin.id,
    tenantId: admin.tenantId,
    role: admin.role,
    isSuperAdmin: admin.isSuperAdmin,
  });

  const r = redirect(request, "/admin");
  clearLettsOAuthCookie(r);
  r.cookies.set("auth-token", authToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  if (tokens.refresh_token) {
    attachLettsRefreshCookie(r, tokens.refresh_token);
  }
  return r;
}
