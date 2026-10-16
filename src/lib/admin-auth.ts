import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, isDbConfigured } from "@/db";
import { adminUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword } from "@/lib/user-auth";

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

/**
 * True when admin sessions can at least be signed/verified (ADMIN_SECRET >= 32).
 * ورود ادمین‌های دیتابیسی فقط به SECRET وابسته است، نه به EMAIL/PASSWORD مالک.
 */
export function isAdminSecretConfigured(): boolean {
  return requiredOrNull("ADMIN_SECRET") !== null;
}

const COOKIE = "dadban_admin";
const TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

/** نشست ادمین — id=0 یعنی مالک (env)؛ id>0 یعنی ادمین جدول admin_users */
export interface AdminSession {
  id: number;
  email: string;
  name: string;
  role: string;
  /** لیست کلیدهای دسترسی — «*» یعنی همه (مدیر کل) */
  permissions: string[];
}

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

/** تجزیهٔ CSV/آرایهٔ دسترسی‌ها به آرایهٔ تمیز — «*» فقط به‌تنهایی */
export function parsePermissions(raw: string | string[] | null | undefined): string[] {
  const list = Array.isArray(raw) ? raw : String(raw ?? "").split(",");
  const out: string[] = [];
  for (const item of list) {
    const key = String(item ?? "").trim();
    if (!key) continue;
    if (key === "*") return ["*"];
    out.push(key);
  }
  return out;
}

function ownerSession(email: string): AdminSession {
  return { id: 0, email: email.trim().toLowerCase(), name: "مدیر کل", role: "super_admin", permissions: ["*"] };
}

/** امضای کوکی نشست ادمین (v2 — شامل id/نقش/دسترسی‌ها) */
export function signAdminSession(s: AdminSession): string {
  const payload = Buffer.from(
    JSON.stringify({ v: 2, id: s.id, e: s.email, n: s.name, r: s.role, p: s.permissions, exp: Date.now() + TTL_MS }),
  ).toString("base64url");
  const sig = createHmac("sha256", required("ADMIN_SECRET")).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

/** سازگاری با کد قبلی — امضای نشست مالک از env */
export function signSession(email: string): string {
  return signAdminSession(ownerSession(email));
}

/** پارس و تأیید رمزنگاری کوکی — بدون تماس با دیتابیس */
function parseAdminSessionToken(token: string | undefined): AdminSession | null {
  if (!token) return null;
  try {
    const sec = requiredOrNull("ADMIN_SECRET");
    if (!sec) return null; // secret misconfigured → treat as signed out, never 500
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return null;
    const expected = createHmac("sha256", sec).update(payload).digest("base64url");
    if (!safeEq(sig, expected)) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof data.exp !== "number" || data.exp <= Date.now()) return null;
    if (data.v === 2) {
      return {
        id: Number(data.id) || 0,
        email: String(data.e ?? ""),
        name: String(data.n ?? "ادمین"),
        role: String(data.r ?? "custom"),
        permissions: Array.isArray(data.p) ? data.p.map((x: unknown) => String(x)) : [],
      };
    }
    // کوکی نسخهٔ ۱ (قبل از چند-کاربره شدن) — فقط مالک env
    if (
      typeof data.e === "string" &&
      data.e.trim().toLowerCase() === (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase()
    ) {
      return ownerSession(data.e);
    }
    return null;
  } catch {
    return null;
  }
}

/** سازگاری با کد قبلی — فقط تأیید امضا و انقضا */
export function verifySession(token: string | undefined): boolean {
  return parseAdminSessionToken(token) !== null;
}

/**
 * نشست فعلی ادمین — برای ادمین‌های دیتابیسی (id>0) اعتبار لحظه‌ای چک می‌شود
 * (غیرفعال‌سازی/تغییر دسترسی بلافاصله اعمال می‌شود). مالک (id=0) بدون دیتابیس کار می‌کند.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  try {
    const store = await cookies();
    const session = parseAdminSessionToken(store.get(COOKIE)?.value);
    if (!session) return null;
    if (session.id > 0) {
      if (!isDbConfigured()) return null;
      try {
        const rows = await db.select().from(adminUsers).where(eq(adminUsers.id, session.id)).limit(1);
        const row = rows[0];
        if (!row || !row.isActive) return null;
        session.name = row.name;
        session.role = row.role;
        session.permissions = row.role === "super_admin" ? ["*"] : parsePermissions(row.permissions);
      } catch {
        return null;
      }
    }
    return session;
  } catch {
    return null;
  }
}

export async function isAdmin(): Promise<boolean> {
  return (await getAdminSession()) !== null;
}

/** آیا نشست به این کلید دسترسی دارد؟ (مدیر کل همیشه بله) */
export function hasPerm(s: AdminSession | null, perm: string): boolean {
  if (!s) return false;
  if (s.role === "super_admin" || s.permissions.includes("*")) return true;
  return s.permissions.includes(perm);
}

/** آیا نشست حداقل به یکی از این کلیدها دسترسی دارد؟ */
export function hasAnyPerm(s: AdminSession | null, perms: string[]): boolean {
  return perms.some((p) => hasPerm(s, p));
}

/** آیا این نشست «مدیر کل» است؟ */
export function isSuperAdmin(s: AdminSession | null): boolean {
  return !!s && (s.role === "super_admin" || s.permissions.includes("*"));
}

/**
 * ورود ادمین — ۱) مالک از env  ۲) ادمین‌های فعال جدول admin_users.
 * خروجی null یعنی اعتبارنامهٔ نامعتبر.
 */
export async function verifyAdminLogin(emailRaw: string, password: string): Promise<AdminSession | null> {
  const email = String(emailRaw ?? "").trim().toLowerCase();
  if (!email || !password) return null;
  // ۱) مالک از env
  if (checkCredentials(email, password)) return ownerSession(email);
  // ۲) ادمین‌های دیتابیسی
  if (!isDbConfigured()) return null;
  try {
    const rows = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
    const row = rows[0];
    if (!row || !row.isActive) return null;
    if (!verifyPassword(password, row.passwordHash)) return null;
    void db
      .update(adminUsers)
      .set({ lastLoginAt: new Date() })
      .where(eq(adminUsers.id, row.id))
      .catch(() => {});
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      permissions: row.role === "super_admin" ? ["*"] : parsePermissions(row.permissions),
    };
  } catch {
    return null;
  }
}

/**
 * گارد صفحات سرور-رندر ادمین — لاگین اجباری + (اختیاری) دسترسی.
 * بدون دسترسی → بازگشت به داشبورد (منو بر اساس دسترسی فیلتر شده است).
 */
export async function guardAdminPage(perm?: string): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (perm && !hasPerm(session, perm)) redirect("/admin?denied=" + encodeURIComponent(perm));
  return session;
}

export function cookieName(): string {
  return COOKIE;
}
