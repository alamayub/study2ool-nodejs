import { v4 as uuidv4 } from "uuid";

export default function quizHandlers(io, socket, users, quizzesList, quizzesQuestions, quizzesUsers, quizzesAnswers) {
  // --- create quiz ---
  socket.on("create-quiz", ({ name, description, startDate, endDate, questions }) => {
    if(!name || !description || !startDate || !endDate || !questions) {
      return socket.emit("error", { message: "All the fields are required!" });
    }
    const id = uuidv4();
    const now = new Date().toISOString();
    const host = Array.from(users.values()).find(u => u.socketId === socket.id);
    if(!host) return socket.emit("error", { message: "User not found!" });

    const map = {
      id,
      name,
      description,
      host: host.uid,
      createdDate: now,
      lastModified: now,
      startDate,
      endDate,
    };

    quizzesList.set(id, map);
    quizzesQuestions.set(id, questions);
    quizzesUsers.set(id, {});
    quizzesAnswers.set(id, {});
    socket.join(id);
    io.emit("quiz-created", { 
      quiz: map, 
      users: [],
      answers: [],
      questions: questions,
      message: `Quiz ${map.name} created sucessfully!` 
    });
  });
  // --- Start Quiz ---
  socket.on("join-quiz", ({ quizId, uid }) => {
    if (!quizId || !uid) return socket.emit("error", { message: "All the fields are required!" });

    const now = new Date().toISOString();
    const quiz = quizzesList.get(quizId);
    if (!quiz) return socket.emit("error", { message: "Quiz not found!" });

    const users = quizzesUsers.get(quizId) ?? {};

    if (!users[uid]) {
      users[uid] = { start: now, attempt: 1, lastContinued: now, end: null };
    } else {
      users[uid] = { ...users[uid], attempt: (users[uid].attempt || 1) + 1, lastContinued: now };
    }

    quizzesUsers.set(quizId, users);
    socket.join(quizId);

    io.emit("quiz-joined", { quizId, users });
  });
  // --- submit answer for a question ---
  socket.on("submit-answer", ({ uid, quizId, questionId, response }) => {
    if (!quizId || !questionId || !uid || !response) {
      return socket.emit("error", { message: "All fields are required!" });
    }

    // Ensure quiz object exists
    if (!quizzesAnswers[quizId]) {
      quizzesAnswers[quizId] = {};
    }

    // Ensure question object exists
    if (!quizzesAnswers[quizId][questionId]) {
      quizzesAnswers[quizId][questionId] = {};
    }

    // Save/overwrite response
    quizzesAnswers[quizId][questionId][uid] = response;

    io.to(quizId).emit("answer-submitted", { quizId, questionId, uid, response });
  });
  // --- submit quiz
  socket.on("end-quiz", ({ quizId, uid }) => {
    if (!quizId || !uid) return socket.emit("error", { message: "All the fields are required!" });
    
    const now = new Date().toISOString();
    const quiz = quizzesList.get(quizId);
    if (!quiz) return socket.emit("error", { message: "Quiz not found!" });

    const users = quizzesUsers.get(quizId) ?? {};
    
    users[uid] = { ...users[uid], end: now };

    quizzesUsers.set(quizId, users);
    io.emit("quiz-ended", { quizId, users });
    socket.leave(quizId);
  });
}