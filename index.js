const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const {
  sessions,
  createSession,
  resetGame,
  checkWinner,
} = require("./gameLogic");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

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

const startGame = (sessionId, players) => {
  resetGame(sessionId, players[0]);
  const player1 = players[0];
  const player2 = players[1];
  sessions[sessionId].currentPlayer = player1;
  io.to(player1).emit("gameStart", { role: "X" });
  io.to(player2).emit("gameStart", { role: "O" });
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
        startGame(sessionId, players);
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

    startGame(sessionId, sessions[sessionId].players);

    io.emit("gameReset");
  });

  //   socket.on("disconnect", () => {
  //     console.log("Player disconnected");
  //     const sessionId = Object.keys(sessions).find(
  //       (key) => sessions[key].players.indexOf(socket.id) !== -1
  //     );

  //     if (sessionId) {
  //       delete sessions[sessionId];
  //     }
  //   });

  socket.on("disconnect", () => {
    console.log("Player disconnected");
    for (const sessionId in sessions) {
      const index = sessions[sessionId].players.indexOf(socket.id);
      if (index !== -1) {
        sessions[sessionId].players.splice(index, 1);
        // if (sessions[sessionId].players.length === 0) {
        //   delete sessions[sessionId];
        // }
        break;
      }
    }
  });
});
