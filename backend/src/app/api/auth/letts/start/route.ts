import { NextRequest, NextResponse } from "next/server";
import {
  attachLettsOAuthCookie,
  generatePkceCodeVerifier,
  isLettsOAuthConfigured,
  lettsEndpoints,
  lettsRedirectUri,
  pkceCodeChallengeS256,
  randomState,
  signLettsOAuthState,
} from "@/lib/letts-auth";

export async function GET(request: NextRequest) {
  if (!isLettsOAuthConfigured()) {
    return NextResponse.json(
      {
        error:
          "Letts SSO is not configured: set LETTS_AUTH_CLIENT_ID and LETTS_AUTH_CLIENT_SECRET in the server environment (see https://auth.letts.group/docs).",
      },
      { status: 503 },
    );
  }

  const redirectUri = lettsRedirectUri();
  if (!redirectUri) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_APP_URL must be set for Letts SSO" },
      { status: 503 },
    );
  }

  const intent = request.nextUrl.searchParams.get("intent");
  const inviteToken = request.nextUrl.searchParams.get("token") || undefined;

  if (intent !== "login" && intent !== "setup" && intent !== "invite") {
    return NextResponse.json(
      { error: "intent must be login, setup, or invite" },
      { status: 400 },
    );
  }

  if (intent === "invite" && !inviteToken) {
    return NextResponse.json(
      { error: "token is required when intent=invite" },
      { status: 400 },
    );
  }

  const st = randomState();
  const cv = generatePkceCodeVerifier();
  const stateJwt = await signLettsOAuthState({
    st,
    cv,
    intent,
    it: inviteToken,
  });

  const clientId = process.env.LETTS_AUTH_CLIENT_ID!.trim();
  const url = new URL(lettsEndpoints().authorize);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", st);
  url.searchParams.set("code_challenge", pkceCodeChallengeS256(cv));
  url.searchParams.set("code_challenge_method", "S256");

  const response = NextResponse.redirect(url.toString());
  attachLettsOAuthCookie(response, stateJwt);
  return response;
}
