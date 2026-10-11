"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, Badge, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { faNum } from "@/lib/data";
import { formatJalaliLong } from "@/lib/jalali";
import { useT } from "@/lib/i18n/provider";

/* ------------------------------- انواع ------------------------------- */

type VaultDoc = {
  id: number;
  name: string;
  category: string;
  mime: string;
  size: number;
  encrypted: boolean;
  kdfSalt: string | null;
  keyCheck: string | null;
  createdAt: string;
};

type Phase = "idle" | "encrypting" | "uploading";

const CATEGORIES = ["قرارداد", "دادخواست", "هویتی", "سند", "سایر"] as const;

/** allowlist سمت کلاینت — فقط برای بازخورد سریع؛ مرجع نهایی allowlist سرور است */
const ALLOWED_MIME: Record<string, true> = {
  "application/pdf": true,
  "image/png": true,
  "image/jpeg": true,
  "image/webp": true,
  "image/heic": true,
  "image/heif": true,
  "application/msword": true,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": true,
  "application/zip": true,
  "text/plain": true,
};

const ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.webp,.heic,.heif,.doc,.docx,.zip,.txt,application/pdf,image/png,image/jpeg,image/webp,image/heic,image/heif,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip,text/plain";

/* --------------------------- رمزنگاری مرورگر --------------------------- */
/**
 * فرمول: salt تصادفی ۱۶ بایتی → کلید = PBKDF2(SHA-256، ۲۵۰٬۰۰۰ دور) → AES-GCM 256
 * خروجی رمز = IV(۱۲ بایت) || ciphertext — keyCheck = hex(۸ بایت اول SHA-256(salt || عبارت عبور))
 * کلید و عبارت عبور هرگز از مرورگر خارج نمی‌شوند.
 */

function subtle(): SubtleCrypto | null {
  return typeof crypto !== "undefined" && typeof crypto.subtle !== "undefined" ? crypto.subtle : null;
}

function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

function fromHex(hex: string): Uint8Array {
  const clean = hex.length % 2 ? `0${hex}` : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 250000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** اثر کوتاه کلید برای تشخیص «عبارت عبور اشتباه» — hex(8 بایت اول SHA-256(salt || pass)) */
async function keyCheckHex(passphrase: string, salt: Uint8Array): Promise<string> {
  const enc = new TextEncoder();
  const passBytes = enc.encode(passphrase);
  const data = new Uint8Array(salt.length + passBytes.length);
  data.set(salt, 0);
  data.set(passBytes, salt.length);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data as BufferSource));
  return toHex(digest.slice(0, 8));
}

async function encryptFile(
  file: File,
  passphrase: string,
): Promise<{ file: File; kdfSalt: string; keyCheck: string }> {
  const s = subtle();
  if (!s) throw new Error("no-subtle");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const plain = new Uint8Array(await file.arrayBuffer());
  const cipher = new Uint8Array(await s.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, plain as BufferSource));
  const out = new Uint8Array(iv.length + cipher.length);
  out.set(iv, 0);
  out.set(cipher, iv.length);
  // نام اصلی فایل حفظ می‌شود — پسوند .enc نمی‌گیرد؛ پرچم encrypted کافی است
  const encFile = new File([out as BlobPart], file.name, { type: file.type || "application/octet-stream" });
  return { file: encFile, kdfSalt: toHex(salt), keyCheck: await keyCheckHex(passphrase, salt) };
}

async function decryptBytes(bytes: Uint8Array, passphrase: string, saltHex: string): Promise<Uint8Array> {
  const s = subtle();
  if (!s) throw new Error("no-subtle");
  const salt = fromHex(saltHex);
  const iv = bytes.slice(0, 12);
  const cipher = bytes.slice(12);
  const key = await deriveKey(passphrase, salt);
  const plain = await s.decrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, cipher as BufferSource);
  return new Uint8Array(plain);
}

/* ------------------------------ کمکی‌ها ------------------------------ */

/** اندازهٔ خوانا با ارقام فارسی */
function faSize(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return faNum(0) + " بایت";
  if (n < 1024) return `${faNum(n)} بایت`;
  if (n < 1024 * 1024) return `${faNum(Math.round(n / 1024))} کیلوبایت`;
  return `${faNum((n / (1024 * 1024)).toFixed(1))} مگابایت`;
}

function docIcon(mime: string) {
  if (mime === "application/pdf") return "document" as const;
  if (mime.startsWith("image/")) return "file" as const;
  if (mime.includes("word")) return "book" as const;
  return "file" as const;
}

function saveBlob(data: Uint8Array | ArrayBuffer | Blob, filename: string, type: string) {
  const blob = new Blob([data as BlobPart], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** آپلود با XHR برای داشتن درصد پیشرفت واقعی */
function xhrUpload(
  form: FormData,
  onProgress: (p: number) => void,
): Promise<{ status: number; data: Record<string, unknown> | null }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/vault");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
    };
    xhr.onload = () => {
      onProgress(100);
      let data: Record<string, unknown> | null = null;
      try {
        data = JSON.parse(xhr.responseText) as Record<string, unknown>;
      } catch {
        /* پاسخ غیر JSON */
      }
      resolve({ status: xhr.status, data });
    };
    xhr.onerror = () => reject(new Error("network"));
    xhr.send(form);
  });
}

/* --------------------------- کامپوننت اصلی --------------------------- */

/**
 * گاوصندوق اسناد شخصی — آپلود (اختیاری: رمزنگاری AES-GCM در مرورگر با عبارت عبور)،
 * فهرست، دانلود با رمزگشایی محلی و حذف. هیچ موفقیت ساختگی‌ای وجود ندارد.
 */
export default function VaultManager() {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingBytesRef = useRef<ArrayBuffer | null>(null);

  const [docs, setDocs] = useState<VaultDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbDown, setDbDown] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [category, setCategory] = useState<string>("سایر");
  const [encryptOn, setEncryptOn] = useState(false);
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [cryptoOk, setCryptoOk] = useState(true);

  const [pendingDoc, setPendingDoc] = useState<VaultDoc | null>(null);
  const [pendingPass, setPendingPass] = useState("");
  const [pendingShow, setPendingShow] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [pendingBusy, setPendingBusy] = useState(false);

  useEffect(() => {
    // بررسی Web Crypto پس از mount تا با SSR همخوان بماند (file:// بدون crypto.subtle است)
    queueMicrotask(() => setCryptoOk(subtle() !== null));
  }, []);

  useEffect(() => {
    if (!msg) return;
    const timer = window.setTimeout(() => setMsg(null), 5000);
    return () => window.clearTimeout(timer);
  }, [msg]);

  /* بارگذاری فهرست اسناد */
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/vault");
      const data = (await res.json().catch(() => null)) as { ok?: boolean; documents?: VaultDoc[]; error?: string } | null;
      if (data?.ok && Array.isArray(data.documents)) {
        setDocs(data.documents);
        setDbDown(false);
      } else if (res.status !== 401) {
        if (data?.error === "db unavailable") setDbDown(true);
        else setMsg({ ok: false, text: t("فهرست اسناد بارگذاری نشد.") });
      }
    } catch {
      setMsg({ ok: false, text: t("خطا در ارتباط با سرور") });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  /* آپلود — رمزنگاری اختیاری در مرورگر، سپس ارسال با درصد پیشرفت واقعی */
  const upload = useCallback(
    async (file: File) => {
      setMsg(null);
      if (file.size > 5 * 1024 * 1024) {
        setMsg({ ok: false, text: t("حجم فایل بیش از ۵ مگابایت است.") });
        return;
      }
      const mime = (file.type || "application/octet-stream").toLowerCase().split(";")[0].trim();
      if (!ALLOWED_MIME[mime]) {
        setMsg({
          ok: false,
          text: t("این فرمت پذیرفته نمی‌شود. فرمت‌های مجاز: PDF، تصویر، Word، ZIP و متن ساده."),
        });
        return;
      }

      let payload: Blob = file;
      let kdfSalt: string | undefined;
      let keyCheck: string | undefined;

      if (encryptOn) {
        const s = subtle();
        if (!s) {
          setMsg({ ok: false, text: t("مرورگر شما از رمزنگاری مرورگری (Web Crypto) پشتیبانی نمی‌کند؛ آپلود رمزنگاری‌شده ممکن نیست.") });
          return;
        }
        if (pass.length < 8) {
          setMsg({ ok: false, text: t("عبارت عبور باید حداقل ۸ کاراکتر باشد.") });
          return;
        }
        if (pass !== pass2) {
          setMsg({ ok: false, text: t("تکرار عبارت عبور مطابقت ندارد.") });
          return;
        }
        setPhase("encrypting");
        setProgress(0);
        try {
          const enc = await encryptFile(file, pass);
          payload = enc.file;
          kdfSalt = enc.kdfSalt;
          keyCheck = enc.keyCheck;
        } catch {
          setPhase("idle");
          setMsg({ ok: false, text: t("رمزنگاری در مرورگر ناموفق بود؛ آپلود انجام نشد.") });
          return;
        }
      }

      setPhase("uploading");
      setProgress(0);
      try {
        const form = new FormData();
        form.set("file", payload, file.name);
        form.set("category", category);
        form.set("encrypted", encryptOn ? "1" : "0");
        if (kdfSalt) form.set("kdfSalt", kdfSalt);
        if (keyCheck) form.set("keyCheck", keyCheck);

        const { status, data } = await xhrUpload(form, setProgress);
        const doc = data?.document as
          | { id: number; name: string; category: string; size: number; encrypted: boolean; createdAt?: string }
          | undefined;
        if (status >= 200 && status < 300 && data?.ok && doc) {
          const row: VaultDoc = {
            id: doc.id,
            name: doc.name,
            category: doc.category,
            mime,
            size: doc.size,
            encrypted: !!doc.encrypted,
            kdfSalt: kdfSalt ?? null,
            keyCheck: keyCheck ?? null,
            createdAt: doc.createdAt ?? new Date().toISOString(),
          };
          setDocs((prev) => [row, ...prev]);
          setDbDown(false);
          setMsg({
            ok: true,
            text: encryptOn ? t("سند با رمزنگاری مرورگر بارگذاری شد.") : t("سند بارگذاری شد."),
          });
        } else if (status === 401) {
          setMsg({ ok: false, text: t("ابتدا وارد حساب خود شوید.") });
        } else if (data?.error === "db unavailable") {
          setDbDown(true);
          setMsg({ ok: false, text: t("گاوصندوق موقتاً در دسترس نیست.") });
        } else {
          const errText = typeof data?.error === "string" ? data.error : t("بارگذاری سند ناموفق بود.");
          setMsg({ ok: false, text: errText });
        }
      } catch {
        setMsg({ ok: false, text: t("خطا در ارتباط با سرور") });
      } finally {
        setPhase("idle");
        setProgress(0);
        setPass("");
        setPass2("");
        setShowPass(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [category, encryptOn, pass, pass2, t],
  );

  /* دانلود — اگر رمزنگاری‌شده باشد، ابتدا عبارت عبور پرسیده می‌شود */
  const handleDownload = useCallback(
    async (doc: VaultDoc) => {
      setMsg(null);
      setBusyId(doc.id);
      try {
        const res = await fetch(`/api/vault?id=${encodeURIComponent(String(doc.id))}`);
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          if (data?.error === "db unavailable") setDbDown(true);
          setMsg({ ok: false, text: data?.error && data.error !== "db unavailable" ? data.error : t("دانلود سند ناموفق بود.") });
          return;
        }
        const buf = await res.arrayBuffer();
        if (res.headers.get("X-Vault-Encrypted") === "1") {
          if (!doc.kdfSalt) {
            setMsg({ ok: false, text: t("اطلاعات رمزگشایی این سند کامل نیست.") });
            return;
          }
          pendingBytesRef.current = buf;
          setPendingDoc(doc);
          setPendingPass("");
          setPendingShow(false);
          setPendingError(null);
          return;
        }
        saveBlob(buf, doc.name, doc.mime || "application/octet-stream");
      } catch {
        setMsg({ ok: false, text: t("خطا در ارتباط با سرور") });
      } finally {
        setBusyId(null);
      }
    },
    [t],
  );

  /* دانلود خام — بایت‌های رمزنگاری‌شده، بدون رمزگشایی (پسوند .enc) */
  const rawDownload = useCallback(
    async (doc: VaultDoc, bytes?: ArrayBuffer | null) => {
      try {
        if (bytes) {
          saveBlob(bytes, `${doc.name}.enc`, "application/octet-stream");
          return;
        }
        const res = await fetch(`/api/vault?id=${encodeURIComponent(String(doc.id))}`);
        if (!res.ok) {
          setMsg({ ok: false, text: t("دانلود سند ناموفق بود.") });
          return;
        }
        saveBlob(await res.arrayBuffer(), `${doc.name}.enc`, "application/octet-stream");
      } catch {
        setMsg({ ok: false, text: t("خطا در ارتباط با سرور") });
      }
    },
    [t],
  );

  /* رمزگشایی و ذخیره — بررسی keyCheck پیش از decrypt */
  const decryptAndSave = useCallback(async () => {
    const doc = pendingDoc;
    if (!doc || !doc.kdfSalt) return;
    const s = subtle();
    if (!s) {
      setPendingError(t("مرورگر شما از رمزنگاری مرورگری (Web Crypto) پشتیبانی نمی‌کند."));
      return;
    }
    setPendingBusy(true);
    setPendingError(null);
    try {
      const bytes = new Uint8Array(pendingBytesRef.current ?? new ArrayBuffer(0));
      const salt = fromHex(doc.kdfSalt);
      const check = await keyCheckHex(pendingPass, salt);
      if (check.toLowerCase() !== (doc.keyCheck ?? "").toLowerCase()) {
        setPendingError(t("عبارت عبور اشتباه است."));
        return;
      }
      const plain = await decryptBytes(bytes, pendingPass, doc.kdfSalt);
      saveBlob(plain, doc.name, doc.mime || "application/octet-stream");
      pendingBytesRef.current = null;
      setPendingDoc(null);
      setPendingPass("");
    } catch {
      setPendingError(t("رمزگشایی ناموفق بود — محتوای سند در دسترس نیست."));
    } finally {
      setPendingBusy(false);
    }
  }, [pendingDoc, pendingPass, t]);

  const closePending = useCallback(() => {
    pendingBytesRef.current = null;
    setPendingDoc(null);
    setPendingPass("");
    setPendingError(null);
    setPendingBusy(false);
  }, []);

  useEffect(() => {
    if (!pendingDoc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePending();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pendingDoc, closePending]);

  /* حذف سند — فقط مالک، با تأیید صریح */
  const remove = useCallback(
    async (id: number) => {
      if (!window.confirm(t("این سند از گاوصندوق حذف شود؟ این عمل بازگشت‌پذیر نیست."))) return;
      setDeletingId(id);
      try {
        const res = await fetch(`/api/vault?id=${encodeURIComponent(String(id))}`, { method: "DELETE" });
        const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
        if (res.ok && data?.ok) {
          setDocs((prev) => prev.filter((d) => d.id !== id));
          setMsg({ ok: true, text: t("سند حذف شد.") });
        } else if (res.status === 401) {
          setMsg({ ok: false, text: t("ابتدا وارد حساب خود شوید.") });
        } else {
          setMsg({ ok: false, text: data?.error ?? t("حذف سند ناموفق بود.") });
        }
      } catch {
        setMsg({ ok: false, text: t("خطا در ارتباط با سرور") });
      } finally {
        setDeletingId(null);
      }
    },
    [t],
  );

  const busy = phase !== "idle";

  return (
    <>
      <Card hover={false} data-testid="vault-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-bold text-foreground">
            <Icon name="lock" className="h-5 w-5 text-primary" />
            {t("گاوصندوق اسناد")}
          </h2>
          {!loading && !dbDown && (
            <Badge tone="neutral">
              {t("سند")} {faNum(docs.length)}
            </Badge>
          )}
        </div>

        {/* یادداشت امنیتی — صادقانه و بدون اغراق */}
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-border bg-surface-2/60 p-3 text-xs leading-6 text-muted">
          <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0 text-accent-text" aria-hidden />
          <p>
            {t(
              "فایل‌های رمزنگاری‌شده فقط با عبارت عبور شما باز می‌شوند؛ عبارت عبور نزد سرور ذخیره نمی‌شود و در صورت فراموشی بازیابی‌پذیر نیست.",
            )}
          </p>
        </div>

        {dbDown && (
          <p role="alert" className="mt-3 rounded-xl bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
            {t("گاوصندوق موقتاً در دسترس نیست — لطفاً کمی بعد دوباره تلاش کنید.")}
          </p>
        )}

        {/* کنترل‌های آپلود */}
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
            {t("دستهٔ سند")}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={busy}
              aria-label={t("دستهٔ سند")}
              className="min-h-11 rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-foreground disabled:opacity-60"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted">{t("رمزنگاری با عبارت عبور")}</span>
            <button
              type="button"
              role="switch"
              aria-checked={encryptOn}
              aria-label={t("رمزنگاری با عبارت عبور")}
              data-testid="vault-encrypted-toggle"
              disabled={busy || !cryptoOk}
              title={cryptoOk ? undefined : t("مرورگر شما از Web Crypto پشتیبانی نمی‌کند")}
              onClick={() => setEncryptOn((v) => !v)}
              className={`relative inline-flex h-11 w-[76px] items-center rounded-full px-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                encryptOn ? "bg-accent" : "border border-border bg-surface-2"
              }`}
            >
              <span
                aria-hidden
                className={`h-8 w-8 rounded-full bg-white shadow-sm transition-all ${encryptOn ? "mr-auto" : "ml-auto"}`}
              />
            </button>
          </div>

          {encryptOn && cryptoOk && (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end">
              <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
                {t("عبارت عبور (حداقل ۸ کاراکتر)")}
                <span className="relative block">
                  <input
                    dir="ltr"
                    type={showPass ? "text" : "password"}
                    value={pass}
                    maxLength={128}
                    disabled={busy}
                    autoComplete="new-password"
                    onChange={(e) => setPass(e.target.value)}
                    aria-label={t("عبارت عبور")}
                    className="h-11 w-full min-w-52 rounded-xl border border-border bg-surface pl-20 pr-3 text-sm text-foreground disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute left-0 top-1/2 inline-flex h-11 min-w-16 -translate-y-1/2 items-center justify-center rounded-lg text-xs font-semibold text-foreground-soft hover:bg-surface-2"
                    aria-label={showPass ? t("پنهان کردن عبارت عبور") : t("نمایش عبارت عبور")}
                  >
                    {showPass ? t("پنهان") : t("نمایش")}
                  </button>
                </span>
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
                {t("تکرار عبارت عبور")}
                <input
                  dir="ltr"
                  type={showPass ? "text" : "password"}
                  value={pass2}
                  maxLength={128}
                  disabled={busy}
                  autoComplete="new-password"
                  onChange={(e) => setPass2(e.target.value)}
                  aria-label={t("تکرار عبارت عبور")}
                  className="h-11 w-full min-w-52 rounded-xl border border-border bg-surface px-3 text-sm text-foreground disabled:opacity-60"
                />
              </label>
            </div>
          )}

          <div>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="sr-only"
              id="vault-file-input"
              aria-label={t("آپلود سند جدید")}
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
              }}
            />
            <button
              type="button"
              data-testid="vault-upload"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              <Icon name="plus" className="h-4 w-4" aria-hidden />
              {busy ? (phase === "encrypting" ? t("در حال رمزنگاری…") : t("در حال بارگذاری…")) : t("آپلود سند جدید")}
            </button>
          </div>
        </div>

        {!cryptoOk && (
          <p className="mt-2 text-xs leading-6 text-muted">
            {t("مرورگر شما از Web Crypto پشتیبانی نمی‌کند؛ آپلود رمزنگاری‌شده در دسترس نیست و ادامهٔ بدون رمز مجاز نیست.")}
          </p>
        )}

        {busy && (
          <div className="mt-3" role="progressbar" aria-valuenow={phase === "encrypting" ? undefined : progress} aria-label={t("پیشرفت آپلود سند")}>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className={`h-full rounded-full bg-primary ${phase === "encrypting" ? "w-full animate-pulse" : "transition-all duration-200"}`}
                style={phase === "encrypting" ? undefined : { width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted">
              {phase === "encrypting"
                ? t("سند در مرورگر شما با AES-GCM رمزنگاری می‌شود…")
                : `${t("در حال بارگذاری")} ${faNum(progress)}٪`}
            </p>
          </div>
        )}

        {msg && (
          <p
            role="status"
            className={`mt-3 rounded-xl px-3 py-2 text-xs font-semibold ${
              msg.ok ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
            }`}
          >
            {msg.text}
          </p>
        )}

        <p className="mt-3 text-xs leading-6 text-muted">
          {t("فایل‌های PDF، تصویر، Word، ZIP یا متن ساده تا سقف ۵ مگابایت — فقط برای خودتان ذخیره می‌شود.")}
        </p>

        {/* فهرست اسناد */}
        {loading ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted">
            <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            {t("در حال بارگذاری…")}
          </p>
        ) : !dbDown && docs.length ? (
          <ul data-testid="vault-list" className="nice-scroll mt-4 max-h-96 space-y-3 overflow-y-auto pl-1">
            {docs.map((d) => (
              <li key={d.id} className="rounded-xl border border-border p-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-foreground-soft">
                    <Icon name={docIcon(d.mime)} className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground" title={d.name}>
                      {d.name}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
                      <Badge tone="primary">{d.category}</Badge>
                      {d.encrypted && (
                        <Badge tone="accent" icon="lock">
                          {t("رمزنگاری‌شده")}
                        </Badge>
                      )}
                      <span>{faSize(d.size)}</span>
                      <span aria-hidden>•</span>
                      <span>{formatJalaliLong(d.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      data-testid="vault-download"
                      disabled={busyId === d.id}
                      onClick={() => void handleDownload(d)}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-foreground transition-colors hover:bg-surface-2 disabled:opacity-50"
                      aria-label={`${t("دانلود")} ${d.name}`}
                    >
                      <Icon name="arrow" className="h-3.5 w-3.5 rotate-180" aria-hidden />
                      {busyId === d.id ? "…" : t("دانلود")}
                    </button>
                    <button
                      type="button"
                      data-testid="vault-delete"
                      disabled={deletingId === d.id}
                      onClick={() => void remove(d.id)}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-danger/10 px-3 text-xs font-semibold text-danger transition-colors hover:bg-danger/20 disabled:opacity-50"
                      aria-label={`${t("حذف")} ${d.name}`}
                    >
                      <Icon name="trash" className="h-3.5 w-3.5" aria-hidden />
                      {deletingId === d.id ? t("در حال حذف…") : t("حذف")}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          !dbDown && (
            <p className="mt-4 rounded-xl border border-dashed border-border p-6 text-center text-sm leading-7 text-muted">
              {t("هنوز سندی در گاوصندوق ندارید — اولین سند را با دکمهٔ «آپلود سند جدید» آپلود کنید.")}
            </p>
          )
        )}
      </Card>

      {/* دیالوگ عبارت عبور برای رمزگشایی — کلید هرگز از مرورگر خارج نمی‌شود */}
      {pendingDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t("رمزگشایی سند")}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !pendingBusy) closePending();
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 card-shadow">
            <div className="flex items-start justify-between gap-3">
              <h3 className="flex items-center gap-2 font-bold text-foreground">
                <Icon name="lock" className="h-5 w-5 text-accent-text" aria-hidden />
                {t("رمزگشایی سند")}
              </h3>
              <button
                type="button"
                onClick={closePending}
                disabled={pendingBusy}
                aria-label={t("بستن")}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                <Icon name="x" className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <p className="mt-2 text-xs leading-6 text-muted">
              {t("«" + pendingDoc.name + "» با عبارت عبور رمزنگاری شده است. رمزگشایی فقط در همین مرورگر انجام می‌شود.")}
            </p>
            <div className="mt-4">
              <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
                {t("عبارت عبور")}
                <span className="relative block">
                  <input
                    dir="ltr"
                    autoFocus
                    type={pendingShow ? "text" : "password"}
                    value={pendingPass}
                    maxLength={128}
                    disabled={pendingBusy}
                    autoComplete="off"
                    onChange={(e) => setPendingPass(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && pendingPass) void decryptAndSave();
                    }}
                    aria-label={t("عبارت عبور سند")}
                    className="h-11 w-full rounded-xl border border-border bg-surface pl-20 pr-3 text-sm text-foreground disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setPendingShow((v) => !v)}
                    className="absolute left-0 top-1/2 inline-flex h-11 min-w-16 -translate-y-1/2 items-center justify-center rounded-lg text-xs font-semibold text-foreground-soft hover:bg-surface-2"
                    aria-label={pendingShow ? t("پنهان کردن عبارت عبور") : t("نمایش عبارت عبور")}
                  >
                    {pendingShow ? t("پنهان") : t("نمایش")}
                  </button>
                </span>
              </label>
              {pendingError && (
                <p role="alert" className="mt-2 rounded-xl bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
                  {pendingError}
                </p>
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                variant="accent"
                icon="check"
                disabled={pendingBusy || !pendingPass}
                onClick={() => void decryptAndSave()}
              >
                {pendingBusy ? t("در حال رمزگشایی…") : t("رمزگشایی و دانلود")}
              </Button>
              <Button variant="outline" disabled={pendingBusy} onClick={closePending}>
                {t("انصراف")}
              </Button>
            </div>
            <div className="mt-3">
              <button
                type="button"
                onClick={() => void rawDownload(pendingDoc, pendingBytesRef.current)}
                className="inline-flex min-h-11 items-center text-xs font-semibold text-muted underline underline-offset-4 transition-colors hover:text-foreground"
              >
                {t("دانلود خام (رمزنگاری‌شده)")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
