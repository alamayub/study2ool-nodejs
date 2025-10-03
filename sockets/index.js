import { generateAvatarURL } from "../utils/utils.js";
import callHandlers from "./calls.js";
import messageHandlers from "./messages.js";
import roomHandlers from "./rooms.js";

export default function registerSocketHandlers(io, users, rooms, sendLatestRoomsList, updateUsersList) {
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Register handlers by feature
    callHandlers(io, socket, users);
    messageHandlers(io, socket, users, rooms);
    roomHandlers(io, socket, users, rooms, sendLatestRoomsList);

    // General user handling
    socket.on("register", ({ uid, displayName }) => {
      const photoURL = generateAvatarURL(uid);
      users.set(uid, { 
        socketId: socket.id, 
        uid, 
        photoURL, 
        displayName, 
        status: "online",
        timestamp: new Date().toISOString(),
      });
      updateUsersList();
      sendLatestRoomsList();
    });

    // --- Disconnect ---
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
      const user = Array.from(users.values()).find(u => u.socketId === socket.id);
      if (user) {
        users.delete(user.uid);
        user.status = "offline";
        user.timestamp = new Date().toISOString();
        users.set(user.uid, user);
        updateUsersList();
        // const room = rooms.values().find((r) => r.host === socket.id);
        // if (room) {
        //   rooms.delete(room.id);
        //   socket.leave(room.id);
        //   socket.emit("room-diconnected", { message: "room disconnected by the owner!" });
        //   sendLatestRoomsList();
        // }
      }
    });
  });
}
