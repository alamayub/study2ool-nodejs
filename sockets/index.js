import { generateAvatarURL } from "../utils/utils.js";
import callHandlers from "./calls.js";
import messageHandlers from "./messages.js";
import quizHandlers from "./quiz.js";
import roomHandlers from "./rooms.js";

export default function registerSocketHandlers(io, users, rooms, quizzesList, quizzesQuestions, quizzesUsers, quizzesAnswers) {
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Register handlers by feature
    callHandlers(io, socket, users);
    messageHandlers(io, socket, users, rooms);
    roomHandlers(io, socket, users, rooms);
    quizHandlers(io, socket, users, quizzesList, quizzesQuestions, quizzesUsers, quizzesAnswers);

    // General user handling
    socket.on("register", ({ uid, displayName }) => {
      const photoURL = generateAvatarURL(uid);
      const map = { 
        socketId: socket.id, 
        uid, 
        photoURL, 
        displayName, 
        status: "online",
        timestamp: new Date().toISOString(),
      };
      users.set(uid, map);
      const usersList = Array.from(users.values());
      socket.emit("users-list", usersList); // Only me
      socket.broadcast.emit("user-joined", map); // everyone except me 
      const roomsList = Array.from(rooms.values());
      socket.emit("rooms-list", roomsList);
      const quizzesArray = Array.from(quizzesList.entries()).map(
        ([quizId, quizInfo]) => ({
          quiz: quizInfo,
          users: quizzesUsers.get(quizId) || [],
          answers: quizzesAnswers.get(quizId) || [],
          questions: quizzesQuestions.get(quizId) || [],
        })
      );
      socket.emit("quizzes-list", quizzesArray);
    });

    // --- Disconnect ---
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
      const user = Array.from(users.values()).find(u => u.socketId === socket.id);
      if (user) {
        user.status = "offline";
        user.timestamp = new Date().toISOString();
        users.set(user.uid, user);
        socket.broadcast.emit("user-updated", user);
      }
    });
  });
}

/*Global scope: io.emit() // everyone including me
Private client: socket.emit() // Only me
All in a room (with sender): io.to(roomId).emit()
All in a room (without sender): socket.to(roomId).emit()*/