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

registerSocketHandlers(io, users, rooms);

// --- Start server ---
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
