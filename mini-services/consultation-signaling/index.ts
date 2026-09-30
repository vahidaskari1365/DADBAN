import { createServer } from "http";
import { Server } from "socket.io";

/**
 * ============================================================================
 * sharifmand — Consultation Signaling Server (WebRTC + Chat)
 * ----------------------------------------------------------------------------
 * این mini-service وظیفه‌ی signaling برای WebRTC (مشاوره تصویری) و
 * real-time chat (مشاوره متنی) را برعهده دارد.
 *
 * پورت: 3003 (ثابت)
 * مسیر Caddy: از طریق XTransformPort=3003 در query
 *
 * ساختار:
 *  - rooms: هر مشاوره یک room اختصاصی بین موکل و وکیل
 *  - events: join-room، offer، answer، ice-candidate، chat-message، leave-room
 * ============================================================================
 */

const PORT = 3003;
const httpServer = createServer();
const io = new Server(httpServer, {
  path: "/",
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

interface RoomPeer {
  socketId: string;
  role: "client" | "lawyer";
  name?: string;
}

const rooms = new Map<string, RoomPeer[]>();

io.on("connection", (socket) => {
  console.log(`[signaling] connected: ${socket.id}`);

  // ورود به room مشاوره
  socket.on("join-room", (data: { roomId: string; role: "client" | "lawyer"; name?: string }) => {
    const { roomId, role, name } = data;
    socket.join(roomId);

    const peers = rooms.get(roomId) || [];
    const peer: RoomPeer = { socketId: socket.id, role, name };
    peers.push(peer);
    rooms.set(roomId, peers);

    console.log(`[signaling] ${role} joined room ${roomId} (peers: ${peers.length})`);

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
  socket.on("offer", (data: { roomId: string; sdp: any }) => {
    socket.to(data.roomId).emit("offer", { sdp: data.sdp, from: socket.id });
  });

  // WebRTC: Answer از lawyer به client
  socket.on("answer", (data: { roomId: string; sdp: any }) => {
    socket.to(data.roomId).emit("answer", { sdp: data.sdp, from: socket.id });
  });

  // WebRTC: ICE candidates
  socket.on("ice-candidate", (data: { roomId: string; candidate: any }) => {
    socket.to(data.roomId).emit("ice-candidate", { candidate: data.candidate, from: socket.id });
  });

  // پیام متنی real-time
  socket.on("chat-message", (data: { roomId: string; message: string; sender: string }) => {
    socket.to(data.roomId).emit("chat-message", {
      message: data.message,
      sender: data.sender,
      timestamp: new Date().toISOString(),
    });
  });

  // تایپ کردن (typing indicator)
  socket.on("typing", (data: { roomId: string; isTyping: boolean }) => {
    socket.to(data.roomId).emit("peer-typing", { isTyping: data.isTyping });
  });

  // قطع تماس
  socket.on("leave-room", (data: { roomId: string }) => {
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
  console.log(`[signaling] server running on port ${PORT}`);
});
