const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

let sessions = {};

const generateSessionId = () => {
  return uuidv4();
};

const createSession = () => {
  const sessionId = generateSessionId();
  sessions[sessionId] = {
    players: [],
    currentPlayer: null,
    board: [
      ["", "", ""],
      ["", "", ""],
      ["", "", ""],
    ],
  };

  return sessionId;
};
// Маршрут для главной страницы
app.get("/", (req, res) => {
  const sessionId = createSession(); // Создаем новую сессию
  res.redirect(`/join-session?sessionId=${sessionId}`); // Перенаправляем на страницу присоединения с идентификатором сессии
});
app.get("/not_found", (req, res) => {
  res.sendFile(path.join(__dirname, "public/not_found.html"));
});

// Маршрут для присоединения к существующей сессии
app.get("/join-session", (req, res) => {
  const sessionId = req.query.sessionId;
  if (!sessions[sessionId]) {
    // Если сессия не найдена, редиректим на страницу /not_found
    return res.redirect("/not_found");
  }
  res.sendFile(path.join(__dirname, "index.html"));
});

const resetGame = (sessionId, player) => {
  const session = sessions[sessionId];
  session.currentPlayer = player;
  session.board = [
    ["", "", ""],
    ["", "", ""],
    ["", "", ""],
  ];
};

const checkWinner = (board) => {
  // Check rows
  for (let i = 0; i < 3; i++) {
    if (
      board[i][0] !== "" &&
      board[i][0] === board[i][1] &&
      board[i][1] === board[i][2]
    ) {
      return board[i][0];
    }
  }
  // Check columns
  for (let i = 0; i < 3; i++) {
    if (
      board[0][i] !== "" &&
      board[0][i] === board[1][i] &&
      board[1][i] === board[2][i]
    ) {
      return board[0][i];
    }
  }
  // Check diagonals
  if (
    board[0][0] !== "" &&
    board[0][0] === board[1][1] &&
    board[1][1] === board[2][2]
  ) {
    return board[0][0];
  }
  if (
    board[0][2] !== "" &&
    board[0][2] === board[1][1] &&
    board[1][1] === board[2][0]
  ) {
    return board[0][2];
  }
  // Check for draw
  if (!board.flat().includes("")) {
    return "draw";
  }
  return null;
};

io.on("connection", (socket) => {
  console.log("New player connected");

  socket.on("joinSession", (sessionId) => {
    const session = sessions[sessionId];
    if (!session) {
      console.error("Session not found");
      return;
    }

    const players = session.players;
    if (players.length < 2) {
      players.push(socket.id);
      if (players.length === 2) {
        resetGame(sessionId, players[0]);
        const player1 = players[0];
        const player2 = players[1];
        session.currentPlayer = player1;
        io.to(player1).emit("gameStart", { role: "X" });
        io.to(player2).emit("gameStart", { role: "O" });
      }
    } else {
      console.error("Session is full");
    }
  });

  socket.on("move", (data) => {
    const sessionId = Object.keys(sessions).find(
      (key) => sessions[key].players.indexOf(socket.id) !== -1
    );

    if (!sessionId) {
      console.error("Session not found");
      return;
    }

    const session = sessions[sessionId];

    const currentPlayer = session.currentPlayer;
    if (socket.id !== currentPlayer) {
      return;
    }

    const { row, col } = data;
    const board = session.board;
    if (board[row][col] === "") {
      board[row][col] = socket.id === session.players[0] ? "X" : "O";
      const winner = checkWinner(board);
      if (winner) {
        const player = socket.id === session.players[0] ? "X" : "O";
        io.emit("gameOver", { winner, role: player, board });
      } else {
        session.currentPlayer =
          currentPlayer === session.players[0]
            ? session.players[1]
            : session.players[0];
        io.emit("updateBoard", {
          board,
          currentPlayer: session.currentPlayer,
          sessionId,
        });
      }
    }
  });

  socket.on("reset", () => {
    const sessionId = Object.keys(sessions).find(
      (key) => sessions[key].players.indexOf(socket.id) !== -1
    );

    if (!sessionId) {
      console.error("Session not found");
      return;
    }

    //  change first
    sessions[sessionId].players = [
      sessions[sessionId].players[1],
      sessions[sessionId].players[0],
    ];

    const session = sessions[sessionId];
    resetGame(sessionId, session.players[0]);
    const player1 = session.players[0];
    const player2 = session.players[1];
    session.currentPlayer = player1;
    io.to(player1).emit("gameStart", { role: "X" });
    io.to(player2).emit("gameStart", { role: "O" });
    io.emit("gameReset");
  });

  socket.on("disconnect", () => {
    console.log("Player disconnected");
    const sessionId = Object.keys(sessions).find(
      (key) => sessions[key].players.indexOf(socket.id) !== -1
    );

    if (sessionId) {
      delete sessions[sessionId];
    }
  });
});
