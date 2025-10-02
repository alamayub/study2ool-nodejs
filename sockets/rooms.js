import { v4 as uuidv4 } from "uuid";
import { generateRoomAvatarURL } from "../utils/utils.js";

export default function roomHandlers(io, socket, users, rooms, sendLatestRoomsList) {
  // --- create room ---
  socket.on("create-room", ({ name, description }) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const host = socket.id; 
    const photoURL = generateRoomAvatarURL(name);

    const map = {
      id,
      photoURL,
      name: name || `Room ${id}`,
      description: description || "This is room description!",
      host,
      createdDate: now,
      lastMessage: null,
      lastModified: now,
      messages: [],
      users: [host],
    };

    rooms.set(id, map);
    socket.join(id);
    sendLatestRoomsList();
  });

  // --- Join room ---
  socket.on("join-room", ({ roomId }) => {
    const cls = rooms.get(roomId);
    if (!cls) {
      socket.emit("error", { message: "room not found" });
      return;
    }

    if (!cls.users.includes(socket.id)) {
      cls.users.push(socket.id);
      cls.lastModified = new Date().toISOString();
    }

    rooms.set(roomId, cls);
    socket.join(roomId);
    const user = users.get(socket.id) || { uid: socket.id, displayName: "Unknown" };
    const message = `${user.displayName} has joined the room!`;
    const room = rooms.get(roomId);
    const map = {
      ...room,
      host: users.get(room.host) || { uid: room.host, displayName: "Unknown" },
      users: room.users.map(
        (uid) => users.get(uid) || { uid, displayName: "Unknown" }
      ),
    };
    io.to(roomId).emit("user-joined", { user: user, roomId, message, room: map });
    socket.emit("room-joined", { room: map });
    socket.emit('all-message', { roomId, messages: rooms.get(roomId).messages });
    sendLatestRoomsList();
  });

  // --- Leave room ---
  socket.on("leave-room", ({ roomId }) => {
    const cls = rooms.get(roomId);
    if (!cls) return;

    cls.users = cls.users.filter((u) => u !== socket.id);
    cls.lastModified = new Date().toISOString();

    rooms.set(roomId, cls);
    socket.leave(roomId);
    const user = users.get(socket.id) || { uid: socket.id, displayName: "Unknown" };
    const message = `${user.displayName} has joined the room!` ;
    o.to(roomId).emit("user-left", { user: user, roomId, message });
    sendLatestRoomsList();
  });

  // --- Leave room ---
  socket.on("close-room", ({ roomId }) => {
    const room = rooms.get(roomId);
    if(!room) return;
    if(room.host !== socket.id) {
      socket.emit("error", { message: "only host can close the room!" });
      return;
    }
    socket.leave(roomId);
    rooms.delete(roomId);
    socket.emit("room-closed", { roomId, message: "room closed by the owner!" });
    sendLatestRoomsList();
  });
}
