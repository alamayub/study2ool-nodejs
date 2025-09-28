const express = require("express");
const http = require("http");
const { v4: uuidv4 } = require("uuid");
const app = express();
const server = http.createServer(app);

// server.js
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  // transports: ["websocket", "polling"],
});

// Map to store users: socketId -> { uid, displayName }
const users = new Map();
const classes = new Map();

function sendLatestClassesList() {
  const enrichedClasses = Array.from(classes.values()).map((cls) => ({
    ...cls,
    host: users.get(cls.host) || { uid: cls.host, displayName: "Unknown" },
    users: cls.users.map(
      (uid) => users.get(uid) || { uid, displayName: "Unknown" }
    ),
  }));

  io.emit("classes-list", enrichedClasses);
}

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // --- Register User ---
  socket.on("register", ({ uid, displayName }) => {
    users.set(socket.id, { uid, displayName });
    console.log("Registered users:", [...users.values()]);
    // Broadcast updated users to all clients
    io.emit(
      "usersList",
      [...users.entries()].map(([socketId, user]) => ({ socketId, ...user }))
    );
  });

  // --- Call Offer ---
  socket.on("call-user", ({ to, offer, from }) => {
    console.log(`Call from ${from} to ${to}`);
    const user = users.get(from);
    console.log(user);
    io.to(to).emit("incoming-call", { from: { ...user, socketId: from }, offer });
  });

  // --- Call Answer ---
  socket.on("answer-call", ({ to, answer }) => {
    console.log(`Answer sent to ${to}`);
    io.to(to).emit("call-answered", { answer });
  });

  // --- ICE Candidates ---
  socket.on("ice-candidate", ({ to, candidate }) => {
    if (candidate) {
      io.to(to).emit("ice-candidate", { candidate });
    }
  });

  // --- Reject Call ---
  socket.on("reject-call", ({ to }) => {
    io.to(to).emit("call-rejected");
  });

  // --- End Call ---
  socket.on("end-call", ({ to }) => {
    io.to(to).emit("call-ended");
  });

  // --- create class ---
  socket.on("create-class", ({ name, description }) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const host = socket.id; 

    const map = {
      id,
      name: name || `Room ${id}`,
      description: description || "This is room description!",
      host,
      createdDate: now,
      lastMessage: null,
      lastModified: now,
      messages: [],
      users: [host], 
    };

    classes.set(id, map);
    socket.join(id);
    sendLatestClassesList();
  })

  // --- Join class ---
  socket.on("join-class", ({ classId }) => {
    const cls = classes.get(classId);
    if (!cls) {
      socket.emit("error", { message: "Class not found" });
      return;
    }

    if (!cls.users.includes(socket.id)) {
      cls.users.push(socket.id);
      cls.lastModified = new Date().toISOString();
    }

    classes.set(classId, cls);
    socket.join(classId);
    socket.emit('all-message', { classId, messages: classes.get(classId).messages });
    emitClassesList();
  });

  // --- Leave class ---
  socket.on("leave-class", ({ classId }) => {
    const cls = classes.get(classId);
    if (!cls) return;

    cls.users = cls.users.filter((u) => u !== socket.id);
    cls.lastModified = new Date().toISOString();

    classes.set(classId, cls);
    socket.leave(classId);
    emitClassesList();
  });

  // --- send message ---
  socket.on("send-message", ({ classId, message }) => {
    const cls = classes.get(classId);
    if (!cls) {
      socket.emit("error", { message: "Class not found" });
      return;
    }

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

    classes.set(classId, cls);

    // Broadcast to all sockets in the room
    io.to(classId).emit("new-message", { classId, message: msg });
  });

  // --- Disconnect ---
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    users.delete(socket.id);
    io.emit(
      "usersList",
      [...users.entries()].map(([socketId, user]) => ({ socketId, ...user }))
    );
  });
});

// --- Start server ---
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
