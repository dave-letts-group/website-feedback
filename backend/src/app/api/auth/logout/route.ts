import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  COOKIE_REFRESH,
  clearLettsCookies,
  revokeLettsToken,
} from "@/lib/letts-auth";

export async function POST() {
  const store = await cookies();
  const refresh = store.get(COOKIE_REFRESH)?.value;
  if (refresh) {
    await revokeLettsToken(refresh);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete("auth-token");
  clearLettsCookies(response);
  return response;
}
