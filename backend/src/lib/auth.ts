import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./db";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "change-me-in-production-please"
);

export interface SessionPayload {
  adminId: string;
  tenantId: string;
  role: string;
  isSuperAdmin: boolean;
}

export async function createToken(payload: SessionPayload) {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;
  if (!token) return null;

  const jwt = await verifyToken(token);
  if (!jwt) return null;

  const admin = await prisma.admin.findUnique({
    where: { id: jwt.adminId },
    select: { role: true, isSuperAdmin: true },
  });

  if (!admin) return null;
  return { ...jwt, role: admin.role, isSuperAdmin: admin.isSuperAdmin };
}

export function requireRole(session: SessionPayload, ...roles: string[]) {
  if (session.isSuperAdmin) return true;
  return roles.includes(session.role);
}

export function requireSuperAdmin(session: SessionPayload) {
  return session.isSuperAdmin === true;
}
