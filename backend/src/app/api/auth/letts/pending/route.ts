import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE_SETUP, verifyLettsSetupAssertion } from "@/lib/letts-auth";

/** Returns Letts profile for setup form prefill (cookie set by OAuth callback). */
export async function GET() {
  const store = await cookies();
  const jwt = store.get(COOKIE_SETUP)?.value;
  const p = await verifyLettsSetupAssertion(jwt);
  if (!p) {
    return NextResponse.json({ profile: null });
  }
  return NextResponse.json({
    profile: { email: p.email, name: p.name },
  });
}
