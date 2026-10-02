import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

function required(name: "ADMIN_EMAIL" | "ADMIN_PASSWORD" | "ADMIN_SECRET"): string {
  const value = process.env[name];
  if (!value || (name === "ADMIN_SECRET" && value.length < 32)) throw new Error(`${name} must be configured`);
  return value;
}

/**
 * Returns the configured value, or null when it is missing/too short.
 * Verification paths must use this: a misconfigured admin secret must
 * degrade to "not authenticated" instead of crashing the page with a 500.
 */
function requiredOrNull(name: "ADMIN_EMAIL" | "ADMIN_PASSWORD" | "ADMIN_SECRET"): string | null {
  const value = process.env[name];
  if (!value || (name === "ADMIN_SECRET" && value.length < 32)) return null;
  return value;
}

/** True when the admin credentials + session secret are fully configured. */
export function isAdminAuthConfigured(): boolean {
  return (
    requiredOrNull("ADMIN_EMAIL") !== null &&
    requiredOrNull("ADMIN_PASSWORD") !== null &&
    requiredOrNull("ADMIN_SECRET") !== null
  );
}
const COOKIE = "dadban_admin";
const TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function safeEq(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function checkCredentials(email: string, password: string): boolean {
  const adminEmail = requiredOrNull("ADMIN_EMAIL");
  const adminPassword = requiredOrNull("ADMIN_PASSWORD");
  if (!adminEmail || !adminPassword) return false; // misconfigured → login rejected, never 500
  return safeEq(email.trim().toLowerCase(), adminEmail.toLowerCase()) && safeEq(password, adminPassword);
}

export function signSession(email: string): string {
  const payload = Buffer.from(JSON.stringify({ e: email, exp: Date.now() + TTL_MS })).toString("base64url");
  const sig = createHmac("sha256", required("ADMIN_SECRET")).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifySession(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const sec = requiredOrNull("ADMIN_SECRET");
    if (!sec) return false; // secret misconfigured → treat as signed out, never 500
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return false;
    const expected = createHmac("sha256", sec).update(payload).digest("base64url");
    if (!safeEq(sig, expected)) return false;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof data.exp === "number" && data.exp > Date.now();
  } catch {
    return false;
  }
}

export async function isAdmin(): Promise<boolean> {
  try {
    const store = await cookies();
    return verifySession(store.get(COOKIE)?.value);
  } catch {
    return false;
  }
}

export function cookieName(): string {
  return COOKIE;
}
