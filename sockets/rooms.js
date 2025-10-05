import { v4 as uuidv4 } from "uuid";
import { generateRoomAvatarURL } from "../utils/utils.js";

export default function roomHandlers(io, socket, usersList, roomsList, roomsUsers, roomsMessages) {
  // --- create room ---
  socket.on("create-room", ({ name, description, uid }) => {
    if(!name || !description || !uid) return socket.emit("error", { message: "All the fields are required!" });

    const host = usersList.get(uid);
    if(!host) return socket.emit("error", { message: "User not found!" });

    const id = uuidv4();
    const now = new Date().toISOString();
    const photoURL = generateRoomAvatarURL(name);
    const map = {
      id,
      photoURL,
      name: name || `Room ${id}`,
      description: description || "This is room description!",
      host: uid,
      createdDate: now,
      lastMessage: null,
      lastModified: now,
      messages: [],
    };

    const users = {
      [uid]: {
        joined: now,
        lastActive: now,
      }
    }

    roomsList.set(id, map);
    roomsUsers.set(id, users);
    roomsMessages.set(id, {});
    socket.join(id);
    io.emit("room-created", { room: map, users });
  });

  // --- Join room ---
  socket.on("join-room", ({ roomId, uid }) => {
    if(!roomId || !uid) return socket.emit("error", { message: "All the fields are required!" });
    
    const cls = roomsList.get(roomId);
    if (!cls) return socket.emit("error", { message: "Room not found!" });

    const user = usersList.get(uid);
    if(!user) return socket.emit("error", { message: "User not found!" });

    const users = roomsUsers.get(roomId) ?? {};
    const now = new Date().toISOString();
    if (!users[uid]) {
      users[uid] = {
        joined: now,
        lastActive: now,
      }
      cls.lastModified = now;
    }

    roomsList.set(roomId, cls);
    roomsUsers.set(roomId, users);
    const messages = roomsMessages.get(roomId) ?? {};
    socket.join(roomId);
    io.to(roomId).emit("room-joined", { uid, users, messages, roomId, room: cls});
  });

  // --- Leave room ---
  socket.on("leave-room", ({ roomId, uid }) => {
    if(!roomId || !uid) return socket.emit("error", { message: "All the fields are required!" });

    const cls = roomsList.get(roomId);
    if (!cls) return socket.emit("error", { message: "Room not found!" });
    
    const user = usersList.get(uid);
    if(!user) return socket.emit("error", { message: "User not found!" });

    const users = roomsUsers.get(roomId) ?? {};

    if (!users[uid]) return socket.emit("error", { message: "You are not in this room!" });

    delete users[uid];
    cls.lastModified = new Date().toISOString();

    roomsList.set(roomId, cls);
    roomsUsers.set(roomId, users);
    io.to(roomId).emit("room-left", { uid, users, roomId, room: cls });
    socket.leave(roomId);
  });

  // --- Leave room ---
  socket.on("close-room", ({ roomId, uid }) => {
    if(!roomId || !uid) return socket.emit("error", { message: "All the fields are required!" });

    const room = roomsList.get(roomId);
    if(!room) return socket.emit("error", { message: "Room not found!" });

    const user = usersList.get(uid);
    if(!user) return socket.emit("error", { message: "User not found!" });

    if(room.host !== uid) return socket.emit("error", { message: "Only host can close the room!" });

    io.to(roomId).emit("room-closed", roomId);
    socket.leave(roomId);
    roomsList.delete(roomId);
    roomsUsers.delete(roomId);
    roomsMessages.delete(roomId);
  });
}
