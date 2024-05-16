const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

let players = [];
let currentPlayer = null;
let board = [
  ["", "", ""],
  ["", "", ""],
  ["", "", ""],
];

const checkWinner = () => {
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

const resetGame = () => {
  currentPlayer = players[0];
  board = [
    ["", "", ""],
    ["", "", ""],
    ["", "", ""],
  ];
};

io.on("connection", (socket) => {
  console.log("New player connected");

  if (players.length < 2) {
    players.push(socket.id);
  }

  if (players.length === 2) {
    const randomIndex = Math.floor(Math.random() * 2);
    resetGame();
    const player1 = players[0];
    const player2 = players[1];
    currentPlayer = player1;
    currentPlayer = randomIndex === 0 ? player1 : player2;
    io.to(player1).emit("gameStart", { role: "X" });
    io.to(player2).emit("gameStart", { role: "O" });
  }

  socket.on("move", (data) => {
    if (socket.id !== currentPlayer) {
      return;
    }

    const { row, col } = data;
    if (board[row][col] === "") {
      board[row][col] = socket.id === players[0] ? "X" : "O";
      const winner = checkWinner();
      if (winner) {
        const player = socket.id === players[0] ? "X" : "O";
        io.emit("gameOver", { winner, role: player, board });
        // resetGame();
      } else {
        // После каждого хода меняем текущего игрока
        currentPlayer = currentPlayer === players[0] ? players[1] : players[0];
        io.emit("updateBoard", { board, currentPlayer });
      }
    }
  });

  socket.on("reset", () => {
    resetGame();
    //  меняем
    players = [players[1], players[0]];
    const player1 = players[0];
    const player2 = players[1];
    currentPlayer = player1; // Начинаем с первого игрока
    io.to(player1).emit("gameStart", { role: "X" });
    io.to(player2).emit("gameStart", { role: "O" });
    io.emit("gameReset");
  });

  socket.on("disconnect", () => {
    console.log("Player disconnected");
    players = players.filter((player) => player !== socket.id);
    // Если игрок отключается во время игры, завершаем игру
    io.emit("gameOver", { winner: false });
    resetGame();
  });
});
