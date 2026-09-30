"use client";

import { useState } from "react";
import { ConsultationClient } from "@/components/consultation-client";
import { Container, Button } from "@/components/ui";
import { Icon } from "@/components/icons";

/**
 * صفحه‌ی مشاوره live — ویدیو + چت real-time روی سایت.
 * کاربر ابتدا یک room ID وارد می‌کند (یا از وکیل می‌گیرد) و سپس وارد مشاوره می‌شود.
 */
export default function LiveConsultationPage() {
  const [roomId, setRoomId] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"client" | "lawyer">("client");
  const [started, setStarted] = useState(false);

  if (started && roomId && name) {
    return (
      <Container className="py-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">مشاوره زنده</h1>
            <p className="text-xs text-muted">
              Room: {roomId} · نقش: {role === "client" ? "موکل" : "وکیل"}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setStarted(false)}>
            خروج
          </Button>
        </div>
        <ConsultationClient roomId={roomId} role={role} name={name} />
      </Container>
    );
  }

  return (
    <Container className="py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Icon name="video" className="h-8 w-8" />
          </span>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">مشاوره تصویری و متنی زنده</h1>
          <p className="mt-2 text-sm text-muted">
            مشاوره حقوقی تصویری و متنی به‌صورت real-time و بدون نرم‌افزار واسط، مستقیماً در سایت.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">نام شما</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثلاً: علی رضایی"
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">کد مشاوره (Room ID)</label>
              <input
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="کد را از وکیل خود بگیرید"
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">نقش</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setRole("client")}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                    role === "client"
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-surface text-foreground-soft"
                  }`}
                >
                  موکل
                </button>
                <button
                  onClick={() => setRole("lawyer")}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                    role === "lawyer"
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-surface text-foreground-soft"
                  }`}
                >
                  وکیل
                </button>
              </div>
            </div>
            <Button
              onClick={() => setStarted(true)}
              disabled={!roomId || !name}
              icon="video"
              className="w-full"
            >
              ورود به مشاوره
            </Button>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-muted">
          برای تست: دو تب باز کنید، یک‌بار به‌عنوان موکل و یک‌بار به‌عنوان وکیل با Room ID یکسان وارد شوید.
        </p>
      </div>
    </Container>
  );
}
