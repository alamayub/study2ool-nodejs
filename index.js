import express from "express";
import http from "http";
import { Server } from "socket.io";
import registerSocketHandlers from "./sockets/index.js";
import { initDB } from "./db/postgres.js";
import { getAllUsers } from "./db/queries/users.js";
import { getAllRooms } from "./db/queries/rooms.js";

const app = express();
const server = http.createServer(app);

// socket.io setup
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

await initDB();
const users = await getAllUsers();
const rooms = await getAllRooms();
const usersList = users;
const roomsList = rooms;
const roomsUsers = new Map();
const roomsMessages = new Map();
const quizzesList = new Map();
const quizzesQuestions = new Map();
const quizzesUsers = new Map();
const quizzesAnswers = new Map();


registerSocketHandlers(io, usersList, roomsList, roomsUsers, roomsMessages, quizzesList, quizzesQuestions, quizzesUsers, quizzesAnswers);

// --- Start server ---
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
