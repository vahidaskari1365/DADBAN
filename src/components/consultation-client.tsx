"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { formatJalaliTime } from "@/lib/jalali";
import { Icon } from "@/components/icons";

/**
 * کامپوننت مشاوره تصویری + صوتی + متنی real-time.
 *
 * معماری (بدون نیاز به WebSocket — سازگار با Vercel):
 * 1. هر دو طرف (موکل و وکیل) یک «کد مشاوره» یکسان وارد می‌کنند.
 * 2. سیگنالینگ WebRTC (offer/answer/ICE) و چت متنی از طریق
 *    /api/consultations/signal روی همان دامنه (HTTP polling) رد و بدل می‌شود.
 * 3. صدا/ویدیو پس از برقراری، مستقیم P2P با WebRTC است (DTLS/SRTP رمزنگاری‌شده).
 * 4. STUN گوگل/کلافلیر + TURN عمومی openrelay برای عبور از NAT محدود ایران.
 * 5. چت متنی روی سرور ۲۴ ساعت ماندگار است (تاریخچه جلسه).
 */

/** سرورهای ICE — STUN + TURN عمومی برای عبور از NAT محدود ایران */
const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
  {
    urls: ["turn:openrelay.metered.ca:80", "turn:openrelay.metered.ca:443", "turn:openrelay.metered.ca:443?transport=tcp"],
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

const POLL_MS = 1300;
const HEARTBEAT_MS = 8000;

type SignalKind = "join" | "offer" | "answer" | "ice" | "chat" | "typing" | "leave";

interface SignalRow {
  id: number;
  clientId: string;
  sender: string;
  kind: SignalKind;
  payload: unknown;
  at: string;
}

interface ChatMessage {
  sender: string;
  message: string;
  timestamp: string;
  isOwn?: boolean;
}

interface ConsultationClientProps {
  roomId: string;
  role: "client" | "lawyer";
  name: string;
}

export function ConsultationClient({ roomId, role, name }: ConsultationClientProps) {
  const [peerReady, setPeerReady] = useState(false);
  const [remoteName, setRemoteName] = useState<string | null>(null);
  const [inCall, setInCall] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [peerTyping, setPeerTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("در حال اتصال...");

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const clientIdRef = useRef<string>("");
  const lastIdRef = useRef(0);
  const pcRefBusy = useRef(false);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const pollFailRef = useRef(0);
  const lastTypingSentRef = useRef(0);

  const iceServers = useMemo(() => ICE_SERVERS, []);

  const send = useCallback(
    async (kind: SignalKind, payload: unknown) => {
      try {
        await fetch("/api/consultations/signal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room: roomId, clientId: clientIdRef.current, sender: name, kind, payload }),
          keepalive: kind === "leave",
        });
      } catch {
        /* خطای شبکه — چرخه بعدی دوباره تلاش می‌شود */
      }
    },
    [roomId, name],
  );

  /** دریافت استریم محلی با کاهش تدریجی: ویدیو+صدا → فقط صدا */
  const getLocalStream = useCallback(async (): Promise<MediaStream> => {
    try {
      return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch {
      return await navigator.mediaDevices.getUserMedia({ audio: true });
    }
  }, []);

  /** ساخت اتصال WebRTC و پردازش offer/answer از طرف مقابل */
  const ensurePeerConnection = useCallback((): RTCPeerConnection => {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection({ iceServers });
    pcRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) void send("ice", event.candidate.toJSON());
    };
    pc.ontrack = (event) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") setStatus("تماس برقرار است");
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        setInCall(false);
        setStatus("تماس قطع شد");
      }
    };
    return pc;
  }, [iceServers, send]);

  const flushPendingIce = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;
    const queued = pendingIceRef.current;
    pendingIceRef.current = [];
    for (const c of queued) {
      try {
        await pc.addIceCandidate(c);
      } catch {
        /* candidate نامعتبر */
      }
    }
  }, []);

  /** پردازش سیگنال‌های دریافتی از طرف مقابل */
  const handleSignals = useCallback(
    async (rows: SignalRow[]) => {
      for (const row of rows) {
        if (row.clientId === clientIdRef.current) continue; // پیام خودمان — نمایش داده شده
        setPeerReady(true);
        if (row.sender) setRemoteName(row.sender);

        switch (row.kind) {
          case "chat": {
            const p = row.payload as { message?: string; timestamp?: string } | null;
            const msg = String(p?.message ?? "").slice(0, 4000);
            if (msg) {
              setChatMessages((prev) => [
                ...prev,
                { sender: row.sender, message: msg, timestamp: String(p?.timestamp ?? row.at), isOwn: false },
              ]);
              setPeerTyping(false);
            }
            break;
          }
          case "typing": {
            setPeerTyping(Boolean((row.payload as { isTyping?: boolean })?.isTyping));
            break;
          }
          case "join": {
            break;
          }
          case "leave": {
            setPeerReady(false);
            setInCall(false);
            setRemoteName(null);
            setStatus("طرف مقابل خارج شد");
            localStreamRef.current?.getTracks().forEach((t) => t.stop());
            localStreamRef.current = null;
            pcRef.current?.close();
            pcRef.current = null;
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
            if (localVideoRef.current) localVideoRef.current.srcObject = null;
            break;
          }
          case "offer": {
            // سمت موکل offer می‌فرستد؛ وکیل پاسخ می‌دهد
            try {
              const pc = ensurePeerConnection();
              await pc.setRemoteDescription(new RTCSessionDescription((row.payload as { type: string; sdp: string })));
              await flushPendingIce();
              const stream = await getLocalStream().catch(() => null);
              if (stream) {
                localStreamRef.current = stream;
                if (localVideoRef.current) localVideoRef.current.srcObject = stream;
                stream.getTracks().forEach((t) => pc.addTrack(t, stream));
                setInCall(true);
              } else {
                setInCall(true); // بدون میکروفون — فقط شنونده
              }
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              await send("answer", { type: answer.type, sdp: answer.sdp });
            } catch {
              setError("برقراری تماس ناموفق بود.");
            }
            break;
          }
          case "answer": {
            try {
              const pc = pcRef.current;
              if (pc && pc.signalingState === "have-local-offer") {
                await pc.setRemoteDescription(new RTCSessionDescription((row.payload as { type: string; sdp: string })));
                await flushPendingIce();
              }
            } catch {
              /* ignore */
            }
            break;
          }
          case "ice": {
            const cand = row.payload as RTCIceCandidateInit | null;
            if (!cand) break;
            try {
              const pc = pcRef.current;
              if (pc && pc.remoteDescription) {
                await pc.addIceCandidate(cand);
              } else {
                pendingIceRef.current.push(cand); // قبل از رسیدن offer/answer
              }
            } catch {
              /* candidate نامعتبر */
            }
            break;
          }
        }
      }
    },
    [ensurePeerConnection, flushPendingIce, getLocalStream, send],
  );

  // راه‌اندازی جلسه — polling + heartbeat
  useEffect(() => {
    if (!roomId || !name) return;
    let disposed = false;
    clientIdRef.current =
      typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `c-${Date.now()}-${Math.random()}`;

    void send("join", { role });

    const poll = setInterval(async () => {
      if (disposed) return;
      try {
        const res = await fetch(`/api/consultations/signal?room=${encodeURIComponent(roomId)}&since=${lastIdRef.current}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("poll failed");
        const data = (await res.json()) as { ok: boolean; signals?: SignalRow[] };
        pollFailRef.current = 0;
        if (!data.ok || !data.signals?.length) return;
        for (const s of data.signals) {
          if (s.id > lastIdRef.current) lastIdRef.current = s.id;
        }
        await handleSignals(data.signals);
      } catch {
        pollFailRef.current += 1;
        if (pollFailRef.current >= 3) {
          setStatus("ارتباط با سرور مشاوره برقرار نشد");
        }
      }
    }, POLL_MS);

    const heartbeat = setInterval(() => {
      if (!disposed) void send("join", { role });
    }, HEARTBEAT_MS);

    return () => {
      disposed = true;
      clearInterval(poll);
      clearInterval(heartbeat);
      void send("leave", { role });
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      pcRef.current?.close();
      pcRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, role, name]);

  // اسکرول به پایین chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  /** موکل تماس را شروع می‌کند (offer) — وکیل خودکار پاسخ می‌دهد */
  const startCall = async () => {
    try {
      const stream = await getLocalStream();
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = ensurePeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await send("offer", { type: offer.type, sdp: offer.sdp });
      setInCall(true);
      setStatus("در حال برقراری تماس...");
    } catch {
      setError("دسترسی به دوربین/میکروفون ممکن نیست. لطفاً اجازه دسترسی بدهید.");
    }
  };

  const endCall = () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    setInCall(false);
    setStatus(remoteName ? "متصل" : "در انتظار طرف مقابل...");
  };

  const toggleMic = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMicOn(audioTrack.enabled);
    }
  };

  const toggleCam = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setCamOn(videoTrack.enabled);
    }
  };

  const sendChat = () => {
    const msg = chatInput.trim();
    if (!msg || !peerReady) return;
    const timestamp = new Date().toISOString();
    void send("chat", { message: msg, timestamp });
    setChatMessages((prev) => [...prev, { sender: name, message: msg, timestamp, isOwn: true }]);
    setChatInput("");
    lastTypingSentRef.current = 0;
    void send("typing", { isTyping: false });
  };

  const onChatInput = (val: string) => {
    setChatInput(val);
    const now = Date.now();
    if (now - lastTypingSentRef.current > 2500) {
      lastTypingSentRef.current = now;
      void send("typing", { isTyping: val.length > 0 });
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* بخش ویدیو */}
      <div className="lg:col-span-2">
        <div className="relative aspect-video overflow-hidden rounded-2xl border border-border bg-black">
          {/* ویدیوی طرف مقابل (وکیل/موکل) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="h-full w-full object-cover"
            style={{ transform: "scaleX(-1)" }}
          />
          {!inCall && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center text-white/70">
              <div className="h-12 w-12 animate-pulse rounded-full bg-white/20" />
              <p className="text-sm">
                {status}
                {peerReady && remoteName ? ` — ${remoteName} آنلاین است` : ""}
              </p>
            </div>
          )}
          {/* ویدیوی محلی (picture-in-picture) */}
          {inCall && (
            <div className="absolute bottom-3 left-3 h-24 w-32 overflow-hidden rounded-lg border-2 border-white/30 bg-black sm:h-28 sm:w-36">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
            </div>
          )}
          {/* کنترل‌ها */}
          {inCall && (
            <div className="absolute inset-x-0 bottom-0 flex justify-center gap-2 bg-gradient-to-t from-black/60 to-transparent p-3">
              <button
                onClick={toggleMic}
                className={`flex h-11 w-11 items-center justify-center rounded-full transition-all active:scale-90 ${
                  micOn ? "bg-white/20 text-white" : "bg-red-500 text-white"
                }`}
                aria-label={micOn ? "قطع میکروفون" : "روشن کردن میکروفون"}
              >
                <Icon name="chat" className="h-5 w-5" />
              </button>
              <button
                onClick={toggleCam}
                className={`flex h-11 w-11 items-center justify-center rounded-full transition-all active:scale-90 ${
                  camOn ? "bg-white/20 text-white" : "bg-red-500 text-white"
                }`}
                aria-label={camOn ? "قطع دوربین" : "روشن کردن دوربین"}
              >
                <Icon name="video" className="h-5 w-5" />
              </button>
              <button
                onClick={endCall}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-red-500 text-white transition-all active:scale-90"
                aria-label="قطع تماس"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 9c-1.6 0-3.15.25-4.6.7v3.42c0 .4-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.956.956 0 0 1-.29-.7c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28a11.27 11.27 0 0 0-2.67-1.85.996.996 0 0 1-.56-.9V9.7C15.15 9.25 13.6 9 12 9z" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* دکمه شروع تماس — موکل شروع می‌کند */}
        {!inCall && peerReady && role === "client" && (
          <button
            onClick={startCall}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-all active:scale-95"
          >
            <Icon name="video" className="h-5 w-5" />
            شروع تماس تصویری / صوتی
          </button>
        )}

        {error && (
          <div className="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
      </div>

      {/* بخش چت متنی */}
      <div className="flex flex-col rounded-2xl border border-border bg-surface">
        <div className="border-b border-border p-3">
          <h3 className="text-sm font-bold text-foreground">چت متنی</h3>
          <p className="mt-0.5 text-[10px] text-muted">
            {peerReady
              ? `متصل${remoteName ? ` — ${remoteName}` : ""} · تاریخچه ۲۴ ساعت ذخیره می‌شود`
              : status}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-3" style={{ maxHeight: "400px" }}>
          {chatMessages.length === 0 ? (
            <p className="text-center text-xs text-muted mt-8">
              پیام‌ها اینجا نمایش داده می‌شوند
            </p>
          ) : (
            <div className="space-y-2">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col gap-1 ${msg.isOwn ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      msg.isOwn
                        ? "bg-primary-soft text-foreground"
                        : "bg-surface-3 text-foreground"
                    }`}
                  >
                    {msg.message}
                  </div>
                  <span className="text-[10px] text-muted">
                    {msg.isOwn ? "شما" : msg.sender} · {formatJalaliTime(msg.timestamp)}
                  </span>
                </div>
              ))}
              {peerTyping && (
                <div className="flex items-center gap-2 text-xs text-muted">
                  <span className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted"></span>
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: "0.1s" }}></span>
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: "0.2s" }}></span>
                  </span>
                  طرف مقابل در حال تایپ...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>
        <div className="border-t border-border p-3">
          <div className="flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => onChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
              placeholder={peerReady ? "پیام بنویسید..." : "در انتظار ورود طرف مقابل..."}
              disabled={!peerReady}
              className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:opacity-50"
            />
            <button
              onClick={sendChat}
              disabled={!peerReady}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all active:scale-90 disabled:opacity-50"
              aria-label="ارسال"
            >
              <Icon name="send" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
