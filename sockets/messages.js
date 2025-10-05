export default function messageHandlers(io, socket, usersList, roomsList, roomsMessages) {

  // 🟢 Handle sending message to a room
  socket.on("send-message", ({ roomId, message, uid }) => {
    try {
      if(!roomId || !message || !uid) throw new Error("All the fields are required!");

      const cls = roomsList.get(roomId);
      if (!cls) throw new Error("room not found");

      const user = usersList.get(uid);
      if(!user) throw new Error("User not found!");

      const messages = roomsMessages.get(roomId) ?? {};

      const now = new Date();
      const msg = {
        id: now,
        type: "text",
        sender: uid,
        message,
        timestamp: now.toISOString(),
      };

      messages[now] = msg;
      cls.lastMessage = msg;
      cls.lastModified = now;
      roomsList.set(roomId, cls);

      io.to(roomId).emit("new-message", { room: cls, message: msg });
    } catch (error) {
      const message = error.message ?? "Something went wrong while sending message!";
      console.error(`Error sending message: ${message}`);
      socket.emit("error", { message });
    }
  });
}

