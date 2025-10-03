export default function messageHandlers(io, socket, users, rooms) {

  // 🟢 Handle sending message to a room
  socket.on("send-message", ({ roomId, message }) => {
    const cls = rooms.get(roomId);
    if (!cls) return socket.emit("error", { message: "room not found" });

    const user = Array.from(users.values()).find(u => u.socketId === socket.id);
    if(!user) return socket.emit("error", { message: "User not found!" });

    const now = new Date().toISOString();
    const msg = {
      id: Date.now(),
      type: "text",
      sender: user.uid,
      message,
      timestamp: now,
    };

    cls.messages.push(msg);
    cls.lastMessage = msg;
    cls.lastModified = now;
    rooms.set(roomId, cls);

    io.to(roomId).emit("new-message", { roomId, message: msg });
  });
}

