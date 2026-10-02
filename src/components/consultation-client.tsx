"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { io, Socket } from "socket.io-client";
import { formatJalaliTime } from "@/lib/jalali";
import { Icon } from "@/components/icons";

/**
 * کامپوننت مشاوره تصویری + متنی real-time با WebRTC.
 *
 * نحوه کار:
 * 1. هر دو طرف (موکل و وکیل) وارد یک room می‌شن با roomId یکسان
 * 2. Signaling از طریق socket.io mini-service روی پورت 3003
 * 3. WebRTC برای ویدیو/صدا peer-to-peer (بدون نرم‌افزار واسط)
 * 4. چت متنی هم از طریق socket.io real-time
 *
 * توجه: اتصال به signaling server از طریق Caddy gateway با XTransformPort=3003
 */

const SIGNALING_PORT = 3003;

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
  const [connected, setConnected] = useState(false);
  const [peerReady, setPeerReady] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [peerTyping, setPeerTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const iceServers: RTCIceServer[] = useMemo(
    () => {
      const servers: RTCIceServer[] = [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ];
      // TURN server (برای عبور از NAT restrictive مثل ایران)
      // در صورت تنظیم env، فعال می‌شه
      const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
      const turnUser = process.env.NEXT_PUBLIC_TURN_USER;
      const turnPass = process.env.NEXT_PUBLIC_TURN_PASS;
      if (turnUrl && turnUser && turnPass) {
        servers.push({
          urls: turnUrl,
          username: turnUser,
          credential: turnPass,
        });
      }
      return servers;
    },
    []
  );

  /** ساخت اتصال WebRTC — قبل از effect ثبت socket تعریف شده تا hoisting درست باشد. */
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers });
    peerConnectionRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit("ice-candidate", { roomId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    return pc;
  }, [roomId, iceServers]);

  // اتصال به signaling server
  useEffect(() => {
    const socket = io("/", {
      path: "/",
      query: { XTransformPort: SIGNALING_PORT },
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join-room", { roomId, role, name });
    });

    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => setError("اتصال به سرور ناموفق بود"));

    socket.on("peer-ready", () => setPeerReady(true));
    socket.on("room-update", (data: { peers: { role: string; name?: string }[] }) => {
      if (data.peers.length === 2) setPeerReady(true);
    });

    socket.on("peer-left", () => {
      setPeerReady(false);
      setInCall(false);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    });

    socket.on("offer", async (data: { sdp: any; from: string }) => {
      if (!peerConnectionRef.current) {
        createPeerConnection();
      }
      await peerConnectionRef.current?.setRemoteDescription(data.sdp);
      const answer = await peerConnectionRef.current?.createAnswer();
      await peerConnectionRef.current?.setLocalDescription(answer);
      socket.emit("answer", { roomId, sdp: answer });
    });

    socket.on("answer", async (data: { sdp: any }) => {
      await peerConnectionRef.current?.setRemoteDescription(data.sdp);
    });

    socket.on("ice-candidate", async (data: { candidate: any }) => {
      await peerConnectionRef.current?.addIceCandidate(data.candidate);
    });

    socket.on("chat-message", (data: { message: string; sender: string; timestamp: string }) => {
      setChatMessages((prev) => [...prev, { ...data, isOwn: false }]);
    });

    socket.on("peer-typing", (data: { isTyping: boolean }) => {
      setPeerTyping(data.isTyping);
    });

    return () => {
      socket.disconnect();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      peerConnectionRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, role, name]);

  // اسکرول به پایین chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current?.emit("offer", { roomId, sdp: offer });
      setInCall(true);
    } catch (err) {
      setError("دسترسی به دوربین/میکروفون ممکن نیست. لطفاً اجازه دسترسی بدهید.");
    }
  };

  const endCall = () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    setInCall(false);
    socketRef.current?.emit("leave-room", { roomId });
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
    if (!chatInput.trim() || !socketRef.current) return;
    const msg = chatInput.trim();
    socketRef.current.emit("chat-message", { roomId, message: msg, sender: name });
    setChatMessages((prev) => [
      ...prev,
      { sender: name, message: msg, timestamp: new Date().toISOString(), isOwn: true },
    ]);
    setChatInput("");
    socketRef.current.emit("typing", { roomId, isTyping: false });
  };

  const onChatInput = (val: string) => {
    setChatInput(val);
    socketRef.current?.emit("typing", { roomId, isTyping: val.length > 0 });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* بخش ویدیو */}
      <div className="lg:col-span-2">
        <div className="relative aspect-video overflow-hidden rounded-2xl border border-border bg-black">
          {/* ویدیوی远程 (وکیل/موکل طرف مقابل) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="h-full w-full object-cover"
            style={{ transform: "scaleX(-1)" }}
          />
          {!peerReady && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/70">
              <div className="h-12 w-12 animate-pulse rounded-full bg-white/20" />
              <p className="text-sm">{connected ? "منتظر طرف مقابل..." : "در حال اتصال..."}</p>
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

        {/* دکمه شروع تماس */}
        {!inCall && peerReady && (
          <button
            onClick={startCall}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-all active:scale-95"
          >
            <Icon name="video" className="h-5 w-5" />
            شروع تماس تصویری
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
                  className={`flex flex-col gap-1 ${msg.isOwn ? "items-start" : "items-end"}`}
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
                    {formatJalaliTime(msg.timestamp)}
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
              placeholder="پیام بنویسید..."
              className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <button
              onClick={sendChat}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all active:scale-90"
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
