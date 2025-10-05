import { generateAvatarURL } from "../utils/utils.js";
import callHandlers from "./calls.js";
import messageHandlers from "./messages.js";
import quizHandlers from "./quiz.js";
import roomHandlers from "./rooms.js";

export default function registerSocketHandlers(io, usersList, roomsList, roomsUsers, roomsMessages, quizzesList, quizzesQuestions, quizzesUsers, quizzesAnswers) {
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Register handlers by feature
    callHandlers(io, socket, usersList);
    messageHandlers(io, socket, usersList, roomsList, roomsMessages);
    roomHandlers(io, socket, usersList, roomsList, roomsUsers, roomsMessages);
    quizHandlers(io, socket, usersList, quizzesList, quizzesQuestions, quizzesUsers, quizzesAnswers);

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
      usersList.set(uid, map);
      const usersArr = Array.from(usersList.values());
      socket.emit("users-list", usersArr); // Only me
      socket.broadcast.emit("user-joined", map); // everyone except me 

      const roomsArray = Array.from(roomsList.entries()).map(
        ([roomId, roomInfo]) => ({
          room: roomInfo,
          users: roomsUsers.get(roomId) || {},
          messages: roomsMessages.get(roomId) || {},
        })
      );
      socket.emit("rooms-list", roomsArray);

      const quizzesArray = Array.from(quizzesList.entries()).map(
        ([quizId, quizInfo]) => ({
          quiz: quizInfo,
          users: quizzesUsers.get(quizId) || {},
          answers: quizzesAnswers.get(quizId) || {},
          questions: quizzesQuestions.get(quizId) || {},
        })
      );
      socket.emit("quizzes-list", quizzesArray);
    });

    // --- Disconnect ---
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
      const user = Array.from(usersList.values()).find(u => u.socketId === socket.id);
      if (user) {
        user.status = "offline";
        user.timestamp = new Date().toISOString();
        usersList.set(user.uid, user);
        socket.broadcast.emit("user-updated", user);
      }
    });
  });
}

/*Global scope: io.emit() // everyone including me
Private client: socket.emit() // Only me
All in a room (with sender): io.to(roomId).emit()
All in a room (without sender): socket.to(roomId).emit()*/