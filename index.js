import express from "express";
import http from "http";
import { v4 as uuidv4 } from "uuid";
import { Server } from "socket.io";
import { generateAvatarURL, generateRoomAvatarURL } from "./utils/utils.js";

const app = express();
const server = http.createServer(app);

// socket.io setup
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  // transports: ["websocket", "polling"],
});

// Map to store users: socketId -> { uid, displayName }
const users = new Map();
const rooms = new Map();

function sendLatestRoomsList() {
  const enrichedrooms = Array.from(rooms.values()).map((cls) => ({
    ...cls,
    host: users.get(cls.host) || { uid: cls.host, displayName: "Unknown" },
    users: cls.users.map(
      (uid) => users.get(uid) || { uid, displayName: "Unknown" }
    ),
  }));

  io.emit("rooms-list", enrichedrooms);
}

function updateUsersList() {
  io.emit(
    "users-list",
    [...users.entries()].map(([socketId, user]) => ({ socketId, ...user }))
  );
}

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // --- Register User ---
  socket.on("register", ({ uid, displayName }) => {
    const photoURL = generateAvatarURL(uid);
    users.set(socket.id, { uid, photoURL, displayName });
    // Broadcast updated users to all clients
    updateUsersList();
    sendLatestRoomsList();
  });

  // --- Call Offer ---
  socket.on("call-user", ({ to, offer, from }) => {
    console.log(`Call from ${from} to ${to}`);
    const user = users.get(from);
    console.log(user);
    io.to(to).emit("incoming-call", { from: { ...user, socketId: from }, offer });
  });

  // --- Call Answer ---
  socket.on("answer-call", ({ to, answer }) => {
    console.log(`Answer sent to ${to}`);
    io.to(to).emit("call-answered", { answer });
  });

  // --- ICE Candidates ---
  socket.on("ice-candidate", ({ to, candidate }) => {
    if (candidate) {
      io.to(to).emit("ice-candidate", { candidate });
    }
  });

  // --- Reject Call ---
  socket.on("reject-call", ({ to }) => {
    io.to(to).emit("call-rejected");
  });

  // --- End Call ---
  socket.on("end-call", ({ to }) => {
    io.to(to).emit("call-ended");
  });

  // --- create room ---
  socket.on("create-room", ({ name, description }) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const host = socket.id; 
    const photoURL = generateRoomAvatarURL(name);

    const map = {
      id,
      photoURL,
      name: name || `Room ${id}`,
      description: description || "This is room description!",
      host,
      createdDate: now,
      lastMessage: null,
      lastModified: now,
      messages: [],
      users: [host], 
    };

    rooms.set(id, map);
    socket.join(id);
    sendLatestRoomsList();
  })

  // --- Join room ---
  socket.on("join-room", ({ roomId }) => {
    const cls = rooms.get(roomId);
    if (!cls) {
      socket.emit("error", { message: "room not found" });
      return;
    }

    if (!cls.users.includes(socket.id)) {
      cls.users.push(socket.id);
      cls.lastModified = new Date().toISOString();
    }

    rooms.set(roomId, cls);
    socket.join(roomId);
    const user = users.get(socket.id) || { uid: socket.id, displayName: "Unknown" };
    const message = `${user.displayName} has joined the room!`;
    const room = rooms.get(roomId);
    const map = {
      ...room,
      host: users.get(room.host) || { uid: room.host, displayName: "Unknown" },
      users: room.users.map(
        (uid) => users.get(uid) || { uid, displayName: "Unknown" }
      ),
    };
    io.to(roomId).emit("user-joined", { user: user, roomId, message, room: map });
    socket.emit("room-joined", { room: map });
    socket.emit('all-message', { roomId, messages: rooms.get(roomId).messages });
    sendLatestRoomsList();
  });

  // --- Leave room ---
  socket.on("leave-room", ({ roomId }) => {
    const cls = rooms.get(roomId);
    if (!cls) return;

    cls.users = cls.users.filter((u) => u !== socket.id);
    cls.lastModified = new Date().toISOString();

    rooms.set(roomId, cls);
    socket.leave(roomId);
    const user = users.get(socket.id) || { uid: socket.id, displayName: "Unknown" };
    const message = `${user.displayName} has joined the room!` ;
    o.to(roomId).emit("user-left", { user: user, roomId, message });
    sendLatestRoomsList();
  });

  // --- Leave room ---
  socket.on("close-room", ({ roomId }) => {
    const room = rooms.get(roomId);
    if(!room) return;
    if(room.host !== socket.id) {
      socket.emit("error", { message: "only host can close the room!" });
      return;
    }
    socket.leave(roomId);
    rooms.delete(roomId);
    socket.emit("room-closed", { roomId, message: "room closed by the owner!" });
    sendLatestRoomsList();
  });

  // --- send message ---
  socket.on("send-message", ({ roomId, message }) => {
    const cls = rooms.get(roomId);
    if (!cls) {
      socket.emit("error", { message: "room not found" });
      return;
    }

    const now = new Date().toISOString();
    const msg = {
      id: Date.now(),
      sender: users.get(socket.id) || { uid: socket.id, displayName: "Unknown" },
      message,
      timestamp: now,
    };

    cls.messages.push(msg);
    cls.lastMessage = msg;
    cls.lastModified = now;

    rooms.set(roomId, cls);

    // Broadcast to all sockets in the room
    io.to(roomId).emit("new-message", { roomId, message: msg });
  });

  // --- Disconnect ---
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    users.delete(socket.id);
    updateUsersList();
    const room = rooms.values().find((r) => r.host === socket.id);
    if (room) {
      rooms.delete(room.id);
      socket.leave(room.id);
      socket.emit("room-diconnected", { message: "room disconnected by the owner!" });
      sendLatestRoomsList();
    }
  });
});

// --- Start server ---
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
