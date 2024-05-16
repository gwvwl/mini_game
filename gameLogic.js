const { v4: uuidv4 } = require("uuid");

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

module.exports = { sessions, createSession, resetGame, checkWinner };
