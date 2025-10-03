import express from "express";
import http from "http";
import { Server } from "socket.io";
import registerSocketHandlers from "./sockets/index.js";

const app = express();
const server = http.createServer(app);

// socket.io setup
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

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
  const activeUsers = Array.from(users.values());
  io.emit("users-list", activeUsers);
}

registerSocketHandlers(io, users, rooms, sendLatestRoomsList, updateUsersList);

// --- Start server ---
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
