"use client";

import { useEffect, useRef, useState } from "react";

/* ============================================================
   VoiceInputButton — دکمهٔ میکروفون ورودی صوتی چت هوشمند
   ضبط با MediaRecorder → POST /api/ai/asr → onText(text)
   حالت‌ها: idle → recording (قرمز pulse) → transcribing (اسپینر)
   سقف ضبط: ۶۰ ثانیه — پاک‌سازی کامل در unmount
   ============================================================ */

type VoicePhase = "idle" | "recording" | "transcribing";

type VoiceInputButtonProps = {
  onText: (text: string) => void;
  disabled?: boolean;
  testid?: string;
};

const MAX_RECORD_MS = 60_000;

/** آیکن میکروفون — در src/components/icons.tsx کلید "mic" موجود نیست، SVG inline */
function MicIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

export function VoiceInputButton({
  onText,
  disabled = false,
  testid = "voice-input",
}: VoiceInputButtonProps) {
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [error, setError] = useState("");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aliveRef = useRef(true); // کامپوننت mount است؟
  const cancelledRef = useRef(false); // ضبط لغو شد (unmount) → نتیجه دور ریخته شود

  /* پاک‌سازی خودکار خطا بعد از ۶ ثانیه */
  useEffect(() => {
    if (!error) return;
    const id = setTimeout(() => setError(""), 6000);
    return () => clearTimeout(id);
  }, [error]);

  /* cleanup کامل در unmount: توقف ترک‌ها + تایمر + قطع ضبط فعال */
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      cancelledRef.current = true;
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      try {
        const rec = recorderRef.current;
        if (rec && rec.state !== "inactive") {
          rec.onstop = null; // نتیجه دور ریخته شود — هیچ fetchی بعد از unmount
          rec.stop();
        }
      } catch {
        /* noop */
      }
      recorderRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  function stopTracks() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function clearTimer() {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  async function transcribe() {
    const mimeType = recorderRef.current?.mimeType || "audio/webm";
    recorderRef.current = null;
    try {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      chunksRef.current = [];
      if (!blob || blob.size === 0) {
        if (aliveRef.current) {
          setPhase("idle");
          setError("صدایی ضبط نشد. لطفاً دوباره تلاش کنید.");
        }
        return;
      }
      const form = new FormData();
      form.append("audio", blob, "voice.webm");
      const res = await fetch("/api/ai/asr", { method: "POST", body: form });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; text?: string; error?: string }
        | null;
      if (!aliveRef.current) return;
      if (data?.ok && data.text && String(data.text).trim()) {
        setPhase("idle");
        onText(String(data.text));
      } else {
        // خطای صادقانهٔ سرور — هیچ‌وقت ساکت نیستیم
        setPhase("idle");
        setError(data?.error || "تبدیل گفتار به متن ناموفق بود. دوباره تلاش کنید.");
      }
    } catch {
      if (aliveRef.current) {
        setPhase("idle");
        setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
      }
    }
  }

  async function startRecording() {
    setError("");
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setError("مرورگر شما از ضبط صدا پشتیبانی نمی‌کند. لطفاً از مرورگر به‌روزشده استفاده کنید.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!aliveRef.current) {
        // در انتظار اجازه، unmount شد
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : undefined;
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      cancelledRef.current = false;
      rec.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stopTracks();
        clearTimer();
        if (!aliveRef.current || cancelledRef.current) return;
        setPhase("transcribing");
        void transcribe();
      };
      recorderRef.current = rec;
      rec.start();
      setPhase("recording");
      // سقف ۶۰ ثانیه — توقف خودکار
      timerRef.current = setTimeout(() => {
        try {
          if (recorderRef.current && recorderRef.current.state !== "inactive") {
            recorderRef.current.stop();
          }
        } catch {
          /* noop */
        }
      }, MAX_RECORD_MS);
    } catch (err) {
      stopTracks();
      setPhase("idle");
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setError("دسترسی به میکروفون رد شد. لطفاً مجوز میکروفون را در مرورگر فعال کنید.");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setError("میکروفونی پیدا نشد. اتصال میکروفون را بررسی کنید.");
      } else {
        setError("شروع ضبط ناموفق بود. لطفاً دوباره تلاش کنید.");
      }
    }
  }

  function stopRecording() {
    clearTimer();
    try {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
    } catch {
      /* noop */
    }
  }

  const isRecording = phase === "recording";
  const isTranscribing = phase === "transcribing";

  const label = isRecording
    ? "در حال ضبط — برای پایان کلیک کنید"
    : isTranscribing
      ? "در حال تبدیل گفتار به متن…"
      : "ورودی صوتی — برای شروع ضبط کلیک کنید";

  return (
    <span className="relative inline-flex shrink-0" data-testid={testid}>
      <button
        type="button"
        data-testid={`${testid}-btn`}
        onClick={isRecording ? stopRecording : startRecording}
        // حین ضبط همیشه امکان توقف باشد، حتی اگر چت loading شود
        disabled={(disabled && !isRecording) || isTranscribing}
        aria-label={label}
        aria-pressed={isRecording}
        title={label}
        className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50 ${
          isRecording
            ? "animate-pulse border-danger bg-danger text-white shadow-sm"
            : "border-border-strong bg-background text-foreground-soft hover:border-primary hover:text-primary"
        }`}
      >
        {isTranscribing ? (
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden
          />
        ) : isRecording ? (
          <span className="h-4 w-4 rounded-[3px] bg-current" aria-hidden />
        ) : (
          <MicIcon />
        )}
      </button>
      {error && (
        <span
          role="alert"
          className="absolute left-0 top-full z-40 mt-1 max-w-64 rounded-lg bg-background px-2.5 py-1.5 text-[11px] leading-5 text-danger shadow-sm ring-1 ring-danger/30"
        >
          {error}
        </span>
      )}
    </span>
  );
}
