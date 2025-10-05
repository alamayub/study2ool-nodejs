export default function callHandlers(io, socket, usersList) {
  // --- Call Offer ---
  socket.on("init-call", ({ to, offer, from }) => {
    const user = usersList.get(from);
    io.to(to).emit("incoming-call", { from: { ...user, socketId: from }, offer });
  });

  // --- Call Answer ---
  socket.on("answer-call", ({ to, answer }) => {
    io.to(to).emit("call-answered", { answer });
  });

  // --- ICE Candidates ---
  socket.on("ice-candidate", ({ to, candidate }) => {
    if (candidate) io.to(to).emit("ice-candidate", { candidate });
  });

  // --- Reject Call ---
  socket.on("reject-call", ({ to }) => {
    io.to(to).emit("call-rejected");
  });

  // --- End Call ---
  socket.on("end-call", ({ to }) => {
    io.to(to).emit("call-ended");
  });
}
