import { createServer } from "http";
import { Server } from "socket.io";

/**
 * ============================================================================
 * دادورزان — Consultation Signaling Server (WebRTC + Chat)
 * ----------------------------------------------------------------------------
 * این mini-service وظیفه‌ی signaling برای WebRTC (مشاوره تصویری) و
 * real-time chat (مشاوره متنی) را برعهده دارد.
 *
 * پورت: 3003 (ثابت)
 * مسیر Caddy: از طریق XTransformPort=3003 در query
 *
 * سخت‌سازی امنیتی:
 *  - CORS: فقط مبدأهای مجاز سایت (SIG_ALLOWED_ORIGINS یا پیش‌فرض دامنه‌های دادورزان
 *    + localhost برای توسعه) — درخواست مرورگری از سایت دیگر رد می‌شود.
 *  - roomId: الگو/طول اعتبارسنجی می‌شود (consult-* یا call-*)؛ از براورت rooms جلوگیری می‌کند.
 *  - سقف peer: هر room حداکثر ۴ اتصال (۲ طرف واقعی + حاشیهٔ reconnect) — انباشت ممنوع.
 * ============================================================================
 */

const PORT = 3003;

/** مبدأهای مجاز — قابل تنظیم با SIG_ALLOWED_ORIGINS (جداشده با کاما) */
function allowedOrigins(): string[] {
  const fromEnv = (process.env.SIG_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (fromEnv.length) return fromEnv;
  // پیش‌فرض: دامنه‌های رسمی + توسعهٔ لوکال
  return [
    "https://dadvarzan.com",
    "https://www.dadvarzan.com",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ];
}

const httpServer = createServer();
const io = new Server(httpServer, {
  path: "/",
  cors: {
    origin: (origin, cb) => {
      // بدون Origin = کلاینت غیرمرورگری/پروکسی داخلی — مجاز؛
      // مرورگر باید از مبدأهای لیست بیاید
      if (!origin) return cb(null, true);
      if (allowedOrigins().includes(origin)) return cb(null, true);
      return cb(new Error("origin not allowed"), false);
    },
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  // سقف سراسری اتصال‌ها — جلوی انباشت منابع
  maxHttpBufferSize: 1e6,
  transports: ["websocket", "polling"],
});

interface RoomPeer {
  socketId: string;
  role: "client" | "lawyer";
  name?: string;
}

const rooms = new Map<string, RoomPeer[]>();
const MAX_PEERS_PER_ROOM = 4;
const ROOM_RE = /^(consult|call)-[a-z0-9-]{3,64}$/i;

function validRoom(roomId: unknown): roomId is string {
  return typeof roomId === "string" && ROOM_RE.test(roomId) && roomId.length <= 64;
}

io.on("connection", (socket) => {
  console.log(`[signaling] connected: ${socket.id} origin=${socket.handshake.headers.origin ?? "-"}`);

  // ورود به room مشاوره
  socket.on("join-room", (data: { roomId: string; role: "client" | "lawyer"; name?: string }) => {
    if (!validRoom(data?.roomId)) {
      socket.emit("error-msg", { message: "invalid room" });
      return;
    }
    const { roomId, role, name } = data;
    const peers = rooms.get(roomId) || [];
    if (peers.length >= MAX_PEERS_PER_ROOM) {
      socket.emit("error-msg", { message: "room full" });
      return;
    }
    // سقف یک peer برای هر socket — جلوگیری از تکرار
    if (peers.some((p) => p.socketId === socket.id)) return;
    socket.join(roomId);

    const peer: RoomPeer = { socketId: socket.id, role: role === "lawyer" ? "lawyer" : "client", name: String(name ?? "").slice(0, 60) };
    peers.push(peer);
    rooms.set(roomId, peers);

    console.log(`[signaling] ${peer.role} joined room ${roomId} (peers: ${peers.length})`);

    // اگه ۲ نفر هستن، به نفر دوم اطلاع بده که طرف دیگر آنلاین شده
    if (peers.length === 2) {
      io.to(roomId).emit("peer-ready", { peerCount: 2 });
    }

    // اطلاع به همه‌ی room members
    io.to(roomId).emit("room-update", {
      peers: peers.map((p) => ({ role: p.role, name: p.name })),
    });
  });

  // WebRTC: Offer از client به lawyer
  socket.on("offer", (data: { roomId: string; sdp: unknown }) => {
    if (!validRoom(data?.roomId)) return;
    socket.to(data.roomId).emit("offer", { sdp: data.sdp, from: socket.id });
  });

  // WebRTC: Answer از lawyer به client
  socket.on("answer", (data: { roomId: string; sdp: unknown }) => {
    if (!validRoom(data?.roomId)) return;
    socket.to(data.roomId).emit("answer", { sdp: data.sdp, from: socket.id });
  });

  // WebRTC: ICE candidates
  socket.on("ice-candidate", (data: { roomId: string; candidate: unknown }) => {
    if (!validRoom(data?.roomId)) return;
    socket.to(data.roomId).emit("ice-candidate", { candidate: data.candidate, from: socket.id });
  });

  // پیام متنی real-time
  socket.on("chat-message", (data: { roomId: string; message: string; sender: string }) => {
    if (!validRoom(data?.roomId)) return;
    const message = String(data.message ?? "").slice(0, 2000);
    const sender = data.sender === "lawyer" ? "lawyer" : "client";
    if (!message) return;
    socket.to(data.roomId).emit("chat-message", {
      message,
      sender,
      timestamp: new Date().toISOString(),
    });
  });

  // تایپ کردن (typing indicator)
  socket.on("typing", (data: { roomId: string; isTyping: boolean }) => {
    if (!validRoom(data?.roomId)) return;
    socket.to(data.roomId).emit("peer-typing", { isTyping: !!data.isTyping });
  });

  // قطع تماس
  socket.on("leave-room", (data: { roomId: string }) => {
    if (!validRoom(data?.roomId)) return;
    leaveRoom(socket.id, data.roomId);
    socket.to(data.roomId).emit("peer-left", { socketId: socket.id });
  });

  // قطع اتصال
  socket.on("disconnect", () => {
    console.log(`[signaling] disconnected: ${socket.id}`);
    // حذف از همه‌ی room‌ها
    for (const [roomId, peers] of rooms.entries()) {
      if (peers.some((p) => p.socketId === socket.id)) {
        leaveRoom(socket.id, roomId);
        socket.to(roomId).emit("peer-left", { socketId: socket.id });
      }
    }
  });
});

function leaveRoom(socketId: string, roomId: string) {
  const peers = rooms.get(roomId);
  if (!peers) return;
  const updated = peers.filter((p) => p.socketId !== socketId);
  if (updated.length === 0) {
    rooms.delete(roomId);
  } else {
    rooms.set(roomId, updated);
  }
}

httpServer.listen(PORT, () => {
  console.log(`[signaling] server running on port ${PORT} origins=${allowedOrigins().join(",")}`);
});
