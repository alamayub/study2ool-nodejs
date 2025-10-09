import express from "express";
import http from "http";
import { Server } from "socket.io";
import registerSocketHandlers from "./sockets/index.js";
import { initDB } from "./db/postgres.js";
import { getAllUsers } from "./db/queries/users.js";
import { getAllRooms } from "./db/queries/rooms.js";
import { getAllVideos } from "./db/queries/videos.js";

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
const usersList = await getAllUsers();
const roomsList = await getAllRooms();
const roomsUsers = new Map();
const roomsMessages = new Map();
const quizzesList = new Map();
const quizzesQuestions = new Map();
const quizzesUsers = new Map();
const quizzesAnswers = new Map();
const videosList = await getAllVideos();


registerSocketHandlers(io, usersList, roomsList, roomsUsers, roomsMessages, quizzesList, quizzesQuestions, quizzesUsers, quizzesAnswers, videosList);

// --- Start server ---
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
