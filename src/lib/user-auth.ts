import { createHmac, timingSafeEqual, randomBytes, scryptSync } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET must be configured with at least 32 characters");
  return value;
}

/**
 * Returns the configured session secret, or null when it is missing/too short.
 * Verification paths must use this: a misconfigured secret must degrade to
 * "signed out" instead of crashing the page with a 500.
 */
function secretOrNull(): string | null {
  const value = process.env.AUTH_SECRET;
  return value && value.length >= 32 ? value : null;
}

/** True when user sessions can be issued/verified (AUTH_SECRET >= 32 chars). */
export function isUserAuthConfigured(): boolean {
  return secretOrNull() !== null;
}
const COOKIE = "dadban_user";
const TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const calc = scryptSync(password, salt, 64).toString("hex");
    const a = Buffer.from(calc);
    const b = Buffer.from(hash);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function safeEq(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function signUserSession(userId: number, role: string): string {
  const payload = Buffer.from(JSON.stringify({ uid: userId, role, exp: Date.now() + TTL_MS })).toString("base64url");
  const sig = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyUserSession(token: string | undefined): { uid: number; role: string } | null {
  if (!token) return null;
  try {
    const sec = secretOrNull();
    if (!sec) return null; // secret misconfigured → treat as signed out, never 500
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return null;
    const expected = createHmac("sha256", sec).update(payload).digest("base64url");
    if (!safeEq(sig, expected)) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof data.exp !== "number" || data.exp < Date.now()) return null;
    return { uid: Number(data.uid), role: String(data.role ?? "client") };
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  try {
    const store = await cookies();
    const session = verifyUserSession(store.get(COOKIE)?.value);
    if (!session) return null;
    const [user] = await db.select().from(users).where(eq(users.id, session.uid));
    return user ?? null;
  } catch {
    return null;
  }
}

export function userCookieName(): string {
  return COOKIE;
}
