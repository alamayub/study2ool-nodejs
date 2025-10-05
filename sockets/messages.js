export default function messageHandlers(io, socket, usersList, roomsList, roomsMessages) {

  // 🟢 Handle sending message to a room
  socket.on("send-message", ({ roomId, message, uid }) => {
    if(!roomId || !message || !uid) return socket.emit("error", { message: "All the fields are required!" });

    const cls = roomsList.get(roomId);
    if (!cls) return socket.emit("error", { message: "room not found" });

    const user = usersList.get(uid);
    if(!user) return socket.emit("error", { message: "User not found!" });

    const messages = roomsMessages.get(roomId) ?? new Map();

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
  });
}

