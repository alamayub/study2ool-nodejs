const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid"); // for unique room IDs

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

app.use(express.static("public")); // serve index.html from /public

// --- Data Stores ---
let users = {};       // { socketId: userData }
let rooms = {};       // { roomId: { name, description, createdBy, date } }
let roomUsers = {};   // { roomId: [uid1, uid2,...] }
let messages = {}; // { roomId: [ { sentBy, message, datetime } ] }
let quizzes = {}; // { quizId: { name, description, createdBy, createdDate, startDate, endDate, questions: [{ question, options, correctAnswer }] } }
let answers = {}; // { quizId: { userId: { answers: [...], correctCount, incorrectCount, answeredCount, startedAt, endedAt, lastUpdated } } }



// --- Socket.io ---
io.on("connection", (socket) => {

  console.log("User connected:", socket.id);

  // Broadcast updated rooms list with metadata + user count
  function broadcastUpdatedRoomList() {
    const roomsList = Object.entries(rooms).map(([id, data]) => ({
      roomId: id,
      ...data,
      userCount: roomUsers[id]?.length || 0,
    }));
    io.emit("roomsList", roomsList);
  }

  // Broadcast updated quiz list 
  function broadcastUpdatedQuizList() {
    const quizList = Object.entries(quizzes).map(([quizId, data]) => ({
      quizId,
      ...data
    }));
    io.emit("quizzesList",quizList );
  }

  // Register user after login
  socket.on("registerUser", (userData) => {
    const map = {
      ...userData,
      date: new Date().toISOString(),
    }
    users[socket.id] = map;
    io.emit("usersList", Object.values(users));
    broadcastUpdatedRoomList();
  });

  // Create room with name/description, generate unique roomId
  socket.on("createRoom", ({ name, description }) => {
    const user = users[socket.id];
    if (!user) return;

    const roomId = uuidv4(); 
    rooms[roomId] = {
      name,
      description,
      createdBy: user.uid,
      date: new Date().toISOString(),
    };
    roomUsers[roomId] = [];

    socket.join(roomId);

    broadcastUpdatedRoomList();
  });

  // Join room
  socket.on("joinRoom", (roomId) => {
    const user = users[socket.id];
    if (!user || !rooms[roomId]) return;

    socket.join(roomId);

    if (!roomUsers[roomId]) {
      roomUsers[roomId] = [];
    }

    if (!roomUsers[roomId].includes(user.uid)) {
      roomUsers[roomId].push(user.uid);
    }

    socket.emit("messages", { roomId, messages: messages[roomId] });

    // Notify the creator/teacher
    const creatorSocketId = Object.keys(users).find(
      id => users[id].uid === rooms[roomId].createdBy
    );
    if (creatorSocketId) {
      io.to(creatorSocketId).emit("userJoined", {
        userId: user.uid,
        roomId,
      });
    }

    broadcastUpdatedRoomList();
    broadcastUpdatedQuizList();
  });

  // Send chat message
  socket.on("sendMessage", ({ roomId, message }) => {
    const user = users[socket.id];
    if (!user || !rooms[roomId]) return;

    const chat = {
      sentBy: user.uid,
      senderName: user.displayName,
      message,
      datetime: new Date().toISOString(),
    };
    if (!messages[roomId]) messages[roomId] = [];
    messages[roomId].push(chat);

    io.to(roomId).emit("newMessage", { roomId, message: chat });
  });

  // WebRTC signaling events
  socket.on("offer", (offer, targetId) => {
    io.to(targetId).emit("offer", { offer, teacherId: socket.id });
  });
  socket.on("answer", (answer, targetId) => {
    io.to(targetId).emit("answer", { answer, studentId: socket.id });
  });
  socket.on("candidate", (candidate, targetId) => {
    io.to(targetId).emit("candidate", { candidate, from: socket.id });
  });

  // Create a new quiz
  socket.on("createQuiz", ({ name, description, startDate, endDate, questions }) => {
    const user = users[socket.id];
    if (!user) return;

    const quizId = uuidv4();

    quizzes[quizId] = {
      name,
      description,
      createdBy: user.uid,
      createdDate: new Date().toISOString(),
      startDate,
      endDate,
      questions
    };

    // Optionally, notify all clients or a specific room
    io.emit("quizCreated", { quizId, quiz: quizzes[quizId] });
    broadcastUpdatedQuizList();
  });

  // Send all quizzes to the requesting client
  socket.on("getQuizzes", () => {
    broadcastUpdatedQuizList();
  });

  // Send specific quiz details
  socket.on("getQuiz", (quizId) => {
    const quiz = quizzes[quizId];
    if (quiz) {
      socket.emit("quizDetails", { quizId, quiz });
    }
  });

  // start test
  socket.on("startTest", ({ quizId }) => {
    const user = users[socket.id];
    if (!user || !quizzes[quizId]) return;

    if (!answers[quizId]) {
      answers[quizId] = {};
    }
    if (!answers[quizId][user.uid]) {
      answers[quizId][user.uid] = {
        answers: Array(quizzes[quizId].questions.length).fill(null),
        correctCount: 0,
        incorrectCount: 0,
        answeredCount: 0,
        startedAt: new Date().toISOString(),
        endedAt: null,
        lastUpdated: new Date().toISOString()
      };
    } else {
      if (!answers[quizId][user.uid].startedAt) {
        answers[quizId][user.uid].startedAt = new Date().toISOString();
      }
    }

    socket.emit("testStarted", { quizId, startedAt: answers[quizId][user.uid].startedAt });

    // Optionally broadcast participation status
    io.emit("userStartedTest", {
      quizId,
      userId: user.uid,
      startedAt: answers[quizId][user.uid].startedAt
    });
  });

  // submit answer for one question
  socket.on("submitAnswerForQuestion", ({ quizId, id, selectedAnswer }) => {
    const user = users[socket.id];
    if (!user || !quizzes[quizId]) return;

    const quiz = quizzes[quizId];

    // Find the index of the question by its ID
    const questionIndex = quiz.questions.findIndex(q => q.id === id);
    if (questionIndex === -1) {
      socket.emit("error", "Invalid question ID.");
      return;
    }

    if (!answers[quizId]) {
      answers[quizId] = {};
    }
    if (!answers[quizId][user.uid]) {
      socket.emit("error", "You must start the test first.");
      return;
    }

    const userAnswer = answers[quizId][user.uid];

    if (!userAnswer.startedAt) {
      socket.emit("error", "You must start the test before answering.");
      return;
    }

    if (userAnswer.endedAt) {
      socket.emit("error", "You cannot answer after ending the test.");
      return;
    }

    // If the userAnswer object doesn't exist, initialize it
    if (!answers[quizId][user.uid]) {
      answers[quizId][user.uid] = {
        answers: Array(quiz.questions.length).fill(null),
        correctCount: 0,
        incorrectCount: 0,
        answeredCount: 0,
        lastUpdated: new Date().toISOString()
      };
    }

    // Fetch again in case it was just initialized
    const updatedUserAnswer = answers[quizId][user.uid];

    // If the question was already answered, adjust counts
    const previousAnswer = updatedUserAnswer.answers[questionIndex];
    if (previousAnswer !== null) {
      if (previousAnswer === quiz.questions[questionIndex].correctAnswer) {
        updatedUserAnswer.correctCount--;
      } else {
        updatedUserAnswer.incorrectCount--;
      }
      updatedUserAnswer.answeredCount--;
    }

    // Save new answer
    updatedUserAnswer.answers[questionIndex] = selectedAnswer;
    updatedUserAnswer.answeredCount++;

    // Update correct/incorrect counts
    if (selectedAnswer === quiz.questions[questionIndex].correctAnswer) {
      updatedUserAnswer.correctCount++;
    } else {
      updatedUserAnswer.incorrectCount++;
    }

    updatedUserAnswer.lastUpdated = new Date().toISOString();

    // Send updated stats to this user
    socket.emit("answerStatsUpdated", {
      quizId,
      correctCount: updatedUserAnswer.correctCount,
      incorrectCount: updatedUserAnswer.incorrectCount,
      answeredCount: updatedUserAnswer.answeredCount,
      totalQuestions: quiz.questions.length
    });

    // Broadcast updated leaderboard to all clients
    const leaderboard = Object.entries(answers[quizId]).map(([uid, data]) => ({
      userId: uid,
      correctCount: data.correctCount,
      incorrectCount: data.incorrectCount,
      answeredCount: data.answeredCount,
      lastUpdated: data.lastUpdated
    })).sort((a, b) => b.correctCount - a.correctCount || a.lastUpdated.localeCompare(b.lastUpdated));

    io.emit("leaderboardUpdated", { quizId, leaderboard });
  });


  // end test
  socket.on("endTest", ({ quizId }) => {
    const user = users[socket.id];
    if (!user || !quizzes[quizId]) return;

    if (answers[quizId] && answers[quizId][user.uid]) {
      answers[quizId][user.uid].endedAt = new Date().toISOString();
      answers[quizId][user.uid].lastUpdated = new Date().toISOString();

      socket.emit("testEnded", { quizId, endedAt: answers[quizId][user.uid].endedAt });

      // Optionally broadcast the update to other clients
      io.emit("userEndedTest", {
        quizId,
        userId: user.uid,
        endedAt: answers[quizId][user.uid].endedAt
      });
    }
  });

  // Disconnect
  socket.on("disconnect", () => {
    const user = users[socket.id];
    if (user) {
      // Remove from all rooms
      Object.keys(roomUsers).forEach(roomId => {
        roomUsers[roomId] = roomUsers[roomId].filter(uid => uid !== user.uid);
      });

      delete users[socket.id];
      io.emit("usersList", Object.values(users));
    }

    // Remove rooms created by this user
    Object.keys(rooms).forEach(roomId => {
      if (rooms[roomId].createdBy === user?.uid) {
        delete rooms[roomId];
        delete roomUsers[roomId];
      }
    });

    broadcastUpdatedRoomList();
  });
});

// --- Start server ---
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
