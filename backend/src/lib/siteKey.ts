import { randomBytes } from "crypto";

export function generateSiteKey(): string {
  return randomBytes(24).toString("base64url");
}
