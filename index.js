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

const usersList = new Map();
const roomsList = new Map();
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
