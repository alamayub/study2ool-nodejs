import { saveUser, updateUserStatus } from "../db/queries/users.js";
import { generateAvatarURL, UserStatus } from "../utils/utils.js";
import callHandlers from "./calls.js";
import messageHandlers from "./messages.js";
import quizHandlers from "./quiz.js";
import roomHandlers from "./rooms.js";
import videoHandlers from "./video.js";

export default function registerSocketHandlers(io, usersList, roomsList, roomsUsers, roomsMessages, quizzesList, quizzesQuestions, quizzesUsers, quizzesAnswers, videosList) {
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Register handlers by feature
    callHandlers(io, socket, usersList);
    messageHandlers(io, socket, usersList, roomsList, roomsMessages);
    roomHandlers(io, socket, usersList, roomsList, roomsUsers, roomsMessages);
    quizHandlers(io, socket, usersList, quizzesList, quizzesQuestions, quizzesUsers, quizzesAnswers);
    videoHandlers(io, socket, usersList, roomsList, videosList);

    // General user handling
    socket.on("register-user", async ({ uid, displayName }) => {
      try {
        const now = new Date().toISOString();
        var user = usersList.get(uid);
        if(user) {
          await updateUserStatus(uid, UserStatus.ONLINE, now);
        } else {
          const photoURL = generateAvatarURL(uid);
          user = { 
            uid, 
            photoURL, 
            displayName, 
            status: UserStatus.ONLINE,
            timestamp: now,
          };
          await saveUser(user);
        }
        const newUser = {
          ...user,
          socketId: socket.id, 
        }
        usersList.set(uid, newUser);
        const usersArr = Array.from(usersList.values());
        socket.emit("users-list", usersArr); // Only me
        socket.broadcast.emit("user-registered", newUser); // everyone except me 

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
      } catch (error) {
        socket.emit("error", { message: "Error while registering user!" });
      }
    });

    // --- Disconnect ---
    socket.on("disconnect", async () => {
      const now = new Date().toISOString();
      console.log(`User disconnected: ${socket.id}`);
      const user = Array.from(usersList.values()).find(u => u.socketId === socket.id);
      if (user) {
        user.status = UserStatus.OFFLINE;
        user.timestamp = now;
        usersList.set(user.uid, user);
        await updateUserStatus(user.uid, UserStatus.OFFLINE, now);
        socket.broadcast.emit("user-updated", user);
      }
    });
  });
}

/*Global scope: io.emit() // everyone including me
Private client: socket.emit() // Only me
All in a room (with sender): io.to(roomId).emit()
All in a room (without sender): socket.to(roomId).emit()*/