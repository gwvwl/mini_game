document.addEventListener("DOMContentLoaded", () => {
  const socket = io.connect();

  // Функция для получения идентификатора сессии из URL
  const getSessionIdFromUrl = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("sessionId");
  };

  // Функция для присоединения к сессии
  const joinSession = () => {
    const sessionId = getSessionIdFromUrl();
    if (sessionId) {
      socket.emit("joinSession", sessionId);
    } else {
      console.error("Session ID not found in URL");
    }
  };

  // Вызываем функцию присоединения к сессии при загрузке страницы
  joinSession();

  // Обработчик события gameStart
  socket.on("gameStart", (data) => {
    const role = data.role;
    document.querySelector(".reset-btn").style.display = "none";
    document.querySelector(".status").textContent = `You are Player ${role}`;

    generateBoard(role === "X");
  });

  // Обработчик события updateBoard
  socket.on("updateBoard", (data) => {
    if (data.sessionId !== getSessionIdFromUrl()) return;
    updateBoard(data.board);
    const currentPlayer = data.currentPlayer;
    document.querySelector(".status").textContent = `Player ${
      currentPlayer === socket.id ? "Your" : "Opponent"
    } turn `;
    document.querySelectorAll(".cell").forEach((cell) => {
      cell.classList.remove("active");
      if (currentPlayer === socket.id && cell.textContent === "") {
        cell.classList.add("active");
      }
    });
  });

  // Обработчик нажатия кнопки reset
  document.querySelector(".reset-btn").addEventListener("click", () => {
    socket.emit("reset");
  });

  // Обработчик события gameOver
  socket.on("gameOver", (data) => {
    if (data.winner) {
      document.querySelector(".reset-btn").style.display = "block";
      updateBoard(data.board);
      document.querySelectorAll(".cell").forEach((cell) => {
        cell.classList.remove("active");
      });
    }

    if (data.winner === "draw") {
      document.querySelector(".status").textContent = "It's a draw!";
    } else {
      document.querySelector(
        ".status"
      ).textContent = `Player ${data.role} wins!`;
    }
  });

  // Генерация игровой доски
  const generateBoard = (isPlayerTurn) => {
    const board = document.querySelector(".board");
    board.innerHTML = "";
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const cell = document.createElement("div");
        cell.classList.add("cell");
        cell.dataset.row = i;
        cell.dataset.col = j;
        cell.textContent = "";
        if (isPlayerTurn) {
          cell.classList.add("active");
        }
        board.appendChild(cell);
        board.appendChild(document.createTextNode(" "));
      }
    }

    // Добавляем обработчик клика для каждой ячейки
    document.querySelectorAll(".cell").forEach((cell) => {
      cell.addEventListener("click", () => {
        if (cell.classList.contains("active")) {
          const row = parseInt(cell.dataset.row);
          const col = parseInt(cell.dataset.col);

          socket.emit("move", { row, col });
        }
      });
    });
  };

  // Обновление игровой доски
  const updateBoard = (boardState) => {
    const cells = document.querySelectorAll(".cell");
    cells.forEach((cell, index) => {
      const row = Math.floor(index / 3);
      const col = index % 3;
      cell.textContent = boardState[row][col];
    });
  };
});
