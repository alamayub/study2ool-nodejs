import { v4 as uuidv4 } from "uuid";
import { generateRoomAvatarURL } from "../utils/utils.js";
import { saveRoom } from "../db/queries/rooms.js";

export default function roomHandlers(io, socket, usersList, roomsList, roomsUsers, roomsMessages) {
  // --- create room ---
  socket.on("create-room", async ({ name, description, uid }) => {
    try {
      if(!name || !description || !uid) throw new Error("All the fields are required!");

      const host = usersList.get(uid);
      if(!host) throw new Error("User not found!");

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
      };

      const users = {
        [uid]: {
          joined: now,
          lastActive: now,
        }
      }
      await saveRoom(map);
      roomsList.set(id, map);
      roomsUsers.set(id, users);
      roomsMessages.set(id, {});
      socket.join(id);
      io.emit("room-created", { room: map, users });
    } catch (error) {
      const message = error.message ?? "Something went wrong while creating room!";
      console.error(`Error creating room: ${message}`);
      socket.emit("error", { message });
    }
  });

  // --- Join room ---
  socket.on("join-room", ({ roomId, uid }) => {
    try {
      if(!roomId || !uid) throw new Error("All the fields are required!");
    
      const cls = roomsList.get(roomId);
      if (!cls) throw new Error("Room not found!");

      const user = usersList.get(uid);
      if(!user) throw new Error("User not found!");

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
    } catch (error) {
      const message = error.message ?? "Something went wrong while closing the room!";
      console.error(`Error joining room: ${message}`);
      socket.emit("error", { message });
    }
  });

  // --- Leave room ---
  socket.on("leave-room", ({ roomId, uid }) => {
    try {
      if(!roomId || !uid) throw new Error("All the fields are required!");

      const cls = roomsList.get(roomId);
      if (!cls) throw new Error("Room not found!");
      
      const user = usersList.get(uid);
      if(!user) throw new Error("User not found!");

      const users = roomsUsers.get(roomId) ?? {};

      if (!users[uid]) throw new Error("You are not part of this room!");

      delete users[uid];
      cls.lastModified = new Date().toISOString();

      roomsList.set(roomId, cls);
      roomsUsers.set(roomId, users);
      io.to(roomId).emit("room-left", { uid, users, roomId, room: cls });
      socket.leave(roomId);
    } catch (error) {
      const message = error.message ?? "Something went wrong while closing the room!";
      console.error(`Error leaving room: ${message}`);
      socket.emit("error", { message });
    }
  });

  // --- Leave room ---
  socket.on("close-room", ({ roomId, uid }) => {
    try {
      if (!roomId || !uid) throw new Error("All the fields are required!");

      const room = roomsList.get(roomId);
      if (!room) throw new Error("Room not found!");

      const user = usersList.get(uid);
      if (!user) throw new Error("User not found!");

      if (room.host !== uid) throw new Error("Only host can close the room!");

      // ✅ Proceed to close the room
      io.to(roomId).emit("room-closed", roomId);
      socket.leave(roomId);
      roomsList.delete(roomId);
      roomsUsers.delete(roomId);
      roomsMessages.delete(roomId);

    } catch (error) {
      const message = error.message ?? "Something went wrong while closing the room!";
      console.error(`Error closing room: ${message}`);
      socket.emit("error", { message });
    }
  });
}
