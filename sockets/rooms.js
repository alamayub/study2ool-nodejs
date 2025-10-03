import { v4 as uuidv4 } from "uuid";
import { generateRoomAvatarURL } from "../utils/utils.js";

export default function roomHandlers(io, socket, users, rooms) {
  // --- create room ---
  socket.on("create-room", ({ name, description }) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const host = Array.from(users.values()).find(u => u.socketId === socket.id);
    if(!host) return socket.emit("error", { message: "User not found!" });

    const photoURL = generateRoomAvatarURL(name);
    const map = {
      id,
      photoURL,
      name: name || `Room ${id}`,
      description: description || "This is room description!",
      host: host.uid,
      createdDate: now,
      lastMessage: null,
      lastModified: now,
      messages: [],
      users: [host.uid],
    };

    rooms.set(id, map);
    socket.join(id);
    io.emit("room-created", { room: map, message: `Room ${map.name} created sucessfully!` });
  });

  // --- Join room ---
  socket.on("join-room", ({ roomId }) => {
    const cls = rooms.get(roomId);
    if (!cls) return socket.emit("error", { message: "Room not found!" });

    const user = Array.from(users.values()).find(u => u.socketId === socket.id);
    if(!user) return socket.emit("error", { message: "User not found!" });

    if (!cls.users.includes(user.uid)) {
      cls.users.push(user.uid);
      cls.lastModified = new Date().toISOString();
    }

    rooms.set(roomId, cls);
    socket.join(roomId);
    io.to(roomId).emit("room-joined", { uid: user.uid, roomId});
  });

  // --- Leave room ---w
  socket.on("leave-room", ({ roomId }) => {
    const cls = rooms.get(roomId);
    if (!cls) return socket.emit("error", { message: "Room not found!" });
    
    const user = Array.from(users.values()).find(u => u.socketId === socket.id);
    if(!user) return socket.emit("error", { message: "User not found!" });

    if (!cls.users.includes(user.uid)) {
      return socket.emit("error", { message: "You are not in this room!" });
    }

    cls.users = cls.users.filter((u) => u !== user.uid);
    cls.lastModified = new Date().toISOString();

    rooms.set(roomId, cls);
    io.to(roomId).emit("room-left", { roomId, uid: user.uid });
    socket.leave(roomId);
  });

  // --- Leave room ---
  socket.on("close-room", ({ roomId }) => {
    const room = rooms.get(roomId);
    if(!room) return socket.emit("error", { message: "Room not found!" });

    const user = Array.from(users.values()).find(u => u.socketId === socket.id);
    if(!user) return socket.emit("error", { message: "User not found!" });

    if(room.host !== user.uid) {
      return socket.emit("error", { message: "Only host can close the room!" });
    }
    io.to(roomId).emit("room-closed", roomId);
    socket.leave(roomId);
    rooms.delete(roomId);
  });
}
