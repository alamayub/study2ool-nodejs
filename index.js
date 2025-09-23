const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);

// server.js
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
});

// Map to store users: socketId -> { uid, displayName }
const users = new Map();

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

  // --- End Call ---
  socket.on("end-call", ({ to }) => {
    io.to(to).emit("call-ended");
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
