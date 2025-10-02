export default function messageHandlers(io, socket, users, rooms) {
  const activeTransfers = new Map();

  // 🟢 Handle sending message to a room
  socket.on("send-message", ({ roomId, message }) => {
    const cls = rooms.get(roomId);
    if (!cls) return socket.emit("error", { message: "room not found" });

    const now = new Date().toISOString();
    const msg = {
      id: Date.now(),
      sender: users.get(socket.id) || { uid: socket.id, displayName: "Unknown" },
      message,
      timestamp: now,
    };

    cls.messages.push(msg);
    cls.lastMessage = msg;
    cls.lastModified = now;
    rooms.set(roomId, cls);

    io.to(roomId).emit("new-message", { roomId, message: msg });
  });

  // ---------------------- FILE START ----------------------
  socket.on("file-start", ({ roomId, fileId, fileName, fileSize, fileType }) => {
    const now = new Date().toISOString();
    const sender = users.get(socket.id) || { uid: socket.id, displayName: "Unknown" };
    const extension = fileName.split(".").pop().toLowerCase();

    const transfer = {
      fileId,
      fileName,
      fileSize,
      fileType,
      extension,
      sender,
      startedAt: now,
      chunks: [],
      roomId,
    };

    activeTransfers.set(fileId, transfer);

    // Construct a "file message" and save to room if room
    if (roomId) {
      const cls = rooms.get(roomId);
      if (cls) {
        const msg = {
          id: fileId,
          type: "file",
          sender,
          fileName,
          fileSize,
          fileType,
          extension,
          timestamp: now,
          status: "uploading",
          downloadUrl: null, 
        };
        cls.messages.push(msg);
        cls.lastMessage = msg;
        cls.lastModified = now;
        rooms.set(roomId, cls);
      }
    }

    // Broadcast start event
    if (roomId) io.to(roomId).emit("file-start", transfer);
  });

  // ---------------------- FILE CHUNKS ----------------------
  socket.on("file-chunk", ({ fileId, chunk }) => {
    const transfer = activeTransfers.get(fileId);
    if (!transfer) return;

    transfer.chunks.push(chunk);

    // Calculate progress percentage
    const progress = Math.min(100, Math.floor((transfer.chunks.length * 64 * 1024) / transfer.fileSize * 100));

    // Broadcast progress only (serializable)
    if (transfer.roomId) {
      io.to(transfer.roomId).emit("file-progress", { fileId, progress, status: "uploading" });
    }
  });

  // ---------------------- FILE COMPLETE ----------------------
  socket.on("file-complete", ({ fileId, downloadUrl }) => {
    const transfer = activeTransfers.get(fileId);
    if (!transfer) return;

    if (transfer.roomId) {
      const cls = rooms.get(transfer.roomId);
      if (cls) {
        const msgIndex = cls.messages.findIndex(m => m.id === fileId);
        if (msgIndex >= 0) {
          cls.messages[msgIndex].status = "completed";
          cls.messages[msgIndex].downloadUrl = downloadUrl || null;
        }
        cls.lastModified = new Date().toISOString();
        rooms.set(transfer.roomId, cls);
      }

      io.to(transfer.roomId).emit("file-progress", { fileId, progress: 100, status: "completed" });
    }

    activeTransfers.delete(fileId);
  });

  // ---------------------- FILE PAUSE / RESUME / CANCEL ----------------------
  ["pause", "resume", "cancel"].forEach(action => {
    socket.on(`file-${action}`, ({ fileId }) => {
      const transfer = activeTransfers.get(fileId);
      if (!transfer) return;

      if (action === "cancel" && transfer.roomId) {
        const cls = rooms.get(transfer.roomId);
        if (cls) {
          const msgIndex = cls.messages.findIndex(m => m.id === fileId);
          if (msgIndex >= 0) cls.messages[msgIndex].status = "canceled";
          cls.lastModified = new Date().toISOString();
          rooms.set(transfer.roomId, cls);
        }
        activeTransfers.delete(fileId);
      }

      // Notify clients about status change
      if (transfer.roomId) {
        io.to(transfer.roomId).emit("file-progress", { fileId, status: action });
      }
    });
  });
}
