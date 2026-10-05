"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ConsultationClient } from "@/components/consultation-client";
import { ConsultChatPanel } from "@/components/consultation/consult-chat-panel";
import { Container, Button, Badge, Avatar } from "@/components/ui";
import { Icon } from "@/components/icons";
import { formatJalaliDateTime, relativeTimeJalali } from "@/lib/jalali";

/**
 * صفحه‌ی مشاوره زنده — دو نقش:
 *
 * ۱) موکل: با کد مشاوره وارد تماس تصویری/چت real-time می‌شود (ConsultationClient).
 *
 * ۲) وکیل: پنل وکیل — با انتخاب پروفایل خودش «آنلاین» می‌شود (heartbeat هر ۳۰ ثانیه)،
 *    صندوق گفتگوهای موکل‌ها را می‌بیند و همان‌جا به گفتگوها پاسخ می‌دهد.
 *    حضور آنلاین همان چیزی است که در صفحه مشاوره به موکل‌ها نشان داده می‌شود.
 */

interface LawyerOpt {
  slug: string;
  name: string;
  city: string;
  photoUrl: string | null;
  avatarColor: string;
}

interface Thread {
  roomId: string;
  clientName: string;
  lastBody: string;
  lastSender: string;
  lastAt: string;
  total: number;
}

const HEARTBEAT_MS = 30_000;
const INBOX_POLL_MS = 5_000;

export default function LiveConsultationPage() {
  /* ─── انتخاب نقش ─── */
  const [mode, setMode] = useState<"client" | "lawyer">("client");

  /* ─── حالت موکل (تماس تصویری با کد) ─── */
  const [roomId, setRoomId] = useState("");
  const [name, setName] = useState("");
  const [started, setStarted] = useState(false);

  /* ─── حالت وکیل (پنل حضور + صندوق گفتگو) ─── */
  const [lawyers, setLawyers] = useState<LawyerOpt[]>([]);
  const [mySlug, setMySlug] = useState("");
  const [panelOn, setPanelOn] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [openThread, setOpenThread] = useState<Thread | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inboxRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const me = lawyers.find((l) => l.slug === mySlug) ?? null;

  /* وکلا برای انتخاب پروفایل وکیل */
  useEffect(() => {
    fetch("/api/lawyers")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setLawyers(d.lawyers); })
      .catch(() => {});
  }, []);

  const ping = useCallback((state: "online" | "offline") => {
    if (!mySlug) return;
    const lw = lawyers.find((l) => l.slug === mySlug);
    fetch("/api/lawyers/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: mySlug, name: lw?.name ?? "", state }),
      keepalive: state === "offline",
    }).catch(() => {});
  }, [mySlug, lawyers]);

  /* heartbeat حضور + صندوق گفتگوها */
  const loadThreads = useCallback(() => {
    if (!mySlug) return;
    fetch(`/api/consultation/chat?lawyerSlug=${encodeURIComponent(mySlug)}&threads=1`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) setThreads(d.threads ?? []); })
      .catch(() => {});
  }, [mySlug]);

  useEffect(() => {
    if (!panelOn || !mySlug) return;
    ping("online");
    heartbeatRef.current = setInterval(() => ping("online"), HEARTBEAT_MS);
    loadThreads();
    inboxRef.current = setInterval(loadThreads, INBOX_POLL_MS);
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (inboxRef.current) clearInterval(inboxRef.current);
    };
  }, [panelOn, mySlug, ping, loadThreads]);

  /* خروج با بستن تب — بهترین تلاش با keepalive */
  useEffect(() => {
    if (!panelOn || !mySlug) return;
    const onLeave = () => ping("offline");
    window.addEventListener("pagehide", onLeave);
    return () => {
      window.removeEventListener("pagehide", onLeave);
      ping("offline");
    };
  }, [panelOn, mySlug, ping]);

  /* ─── نمای تماس تصویری موکل (بدون تغییر) ─── */
  if (mode === "client" && started && roomId && name) {
    return (
      <Container className="py-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">مشاوره زنده</h1>
            <p className="text-xs text-muted">Room: {roomId} · نقش: موکل</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setStarted(false)}>
            خروج
          </Button>
        </div>
        <ConsultationClient roomId={roomId} role="client" name={name} />
      </Container>
    );
  }

  /* ─── نمای پنل وکیل ─── */
  if (mode === "lawyer" && panelOn && me) {
    return (
      <Container className="py-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {me.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={me.photoUrl} alt="" className="h-11 w-11 rounded-xl object-cover" />
            ) : (
              <Avatar name={me.name} color={me.avatarColor} size="sm" />
            )}
            <div>
              <h1 className="text-lg font-bold text-foreground">پنل وکیل — {me.name}</h1>
              <p className="flex items-center gap-1.5 text-xs text-success">
                <span className="h-2 w-2 animate-pulse rounded-full bg-success" />
                آنلاین هستید — در فهرست وکلای صفحه مشاوره سبز دیده می‌شوید
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { ping("offline"); setPanelOn(false); }}
          >
            خروج و آفلاین شدن
          </Button>
        </div>

        {/* صندوق گفتگوها */}
        <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Icon name="chat" className="h-4 w-4 text-primary" />
              صندوق گفتگوهای موکل‌ها
            </h2>
            <Badge tone="neutral">{threads.length ? `${threads.length} گفتگو` : "بدون گفتگو"}</Badge>
          </div>

          {threads.length === 0 ? (
            <p className="rounded-xl border border-border bg-surface-2/50 px-4 py-6 text-center text-xs leading-6 text-muted">
              هنوز گفتگویی ندارید. با آنلاین بودن، گفتگوهای شروع‌شده از صفحه مشاوره همین‌جا نمایش داده می‌شود.
            </p>
          ) : (
            <ul className="max-h-[55vh] space-y-2 overflow-y-auto" data-testid="lawyer-inbox">
              {threads.map((t) => (
                <li key={t.roomId}>
                  <button
                    onClick={() => setOpenThread(t)}
                    className="w-full cursor-pointer rounded-xl border border-border bg-surface-2/40 p-3 text-right transition-colors hover:border-primary/40 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm font-bold text-foreground">
                        <Icon name="user" className="h-4 w-4 text-primary" />
                        {t.clientName}
                        {t.lastSender === "client" && (
                          <Badge tone="primary">پیام جدید</Badge>
                        )}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted">{relativeTimeJalali(t.lastAt)}</span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs text-muted">{t.lastBody}</p>
                    <p className="mt-1 text-[10px] text-muted">
                      {formatJalaliDateTime(t.lastAt)} · {t.total} پیام
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* گفتگوی باز */}
        {openThread && me && (
          <ConsultChatPanel
            lawyer={{ slug: me.slug, name: me.name, avatarColor: me.avatarColor, photoUrl: me.photoUrl, city: me.city }}
            role="lawyer"
            initialRoomId={openThread.roomId}
            clientDisplayName={openThread.clientName}
            onClose={() => { setOpenThread(null); loadThreads(); }}
          />
        )}

        <p className="mt-4 text-center text-[11px] leading-5 text-muted">
          تا وقتی این صفحه باز است، وضعیت شما «آنلاین» است. با بستن صفحه یا زدن «خروج»، آفلاین می‌شوید.
        </p>
      </Container>
    );
  }

  /* ─── نمای ورود ─── */
  return (
    <Container className="py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Icon name="video" className="h-8 w-8" />
          </span>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">مشاوره تصویری و متنی زنده</h1>
          <p className="mt-2 text-sm leading-7 text-muted">
            موکل: با کد مشاوره وارد تماس شوید. وکیل: پنل خود را باز کنید تا آنلاین شوید و به گفتگوهای موکل‌ها پاسخ دهید.
          </p>
        </div>

        {/* انتخاب نقش */}
        <div className="mb-4 grid grid-cols-2 gap-2" role="group" aria-label="انتخاب نقش">
          <button
            onClick={() => setMode("client")}
            aria-pressed={mode === "client"}
            className={`rounded-xl border px-3 py-3 text-sm font-bold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              mode === "client"
                ? "border-primary bg-primary-soft text-primary"
                : "border-border bg-surface text-foreground-soft hover:border-primary/40"
            }`}
          >
            <Icon name="user" className="ml-1 inline h-4 w-4" /> موکل هستم
          </button>
          <button
            onClick={() => setMode("lawyer")}
            aria-pressed={mode === "lawyer"}
            className={`rounded-xl border px-3 py-3 text-sm font-bold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              mode === "lawyer"
                ? "border-primary bg-primary-soft text-primary"
                : "border-border bg-surface text-foreground-soft hover:border-primary/40"
            }`}
          >
            <Icon name="badge" className="ml-1 inline h-4 w-4" /> وکیل هستم
          </button>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          {mode === "client" ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="lc-name" className="mb-1.5 block text-sm font-medium text-foreground">نام شما</label>
                <input
                  id="lc-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثلاً: علی رضایی"
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="lc-room" className="mb-1.5 block text-sm font-medium text-foreground">کد مشاوره (Room ID)</label>
                <input
                  id="lc-room"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="کد را از وکیل خود بگیرید"
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <Button
                onClick={() => setStarted(true)}
                disabled={!roomId || !name}
                icon="video"
                className="w-full"
              >
                ورود به مشاوره تصویری
              </Button>
              <p className="text-center text-xs leading-6 text-muted">
                برای گفتگوی متنی با وکیل، از <a href="/consultation" className="font-bold text-primary underline underline-offset-4">صفحه مشاوره</a> وکیل را انتخاب کنید.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label htmlFor="lc-profile" className="mb-1.5 block text-sm font-medium text-foreground">پروفایل وکیل خود را انتخاب کنید</label>
                <select
                  id="lc-profile"
                  value={mySlug}
                  onChange={(e) => setMySlug(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
                  data-testid="lawyer-profile-select"
                >
                  <option value="">انتخاب پروفایل…</option>
                  {lawyers.map((l) => (
                    <option key={l.slug} value={l.slug}>{l.name} — {l.city}</option>
                  ))}
                </select>
              </div>
              <Button
                onClick={() => setPanelOn(true)}
                disabled={!mySlug}
                icon="bolt"
                className="w-full"
                data-testid="lawyer-panel-enter"
              >
                ورود به پنل و آنلاین شدن
              </Button>
              <p className="text-center text-[11px] leading-5 text-muted">
                با ورود، وضعیت شما در صفحه مشاوره «آنلاین» نمایش داده می‌شود و گفتگوهای موکل‌ها در صندوق شما می‌آید.
              </p>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}
