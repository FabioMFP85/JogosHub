window.initGaloGame = function initGaloGame() {
  const board = document.getElementById("galo-board");
  const currentPlayerEl = document.getElementById("current-player");
  const statusEl = document.getElementById("galo-status");
  const restartBtn = document.getElementById("galo-restart");

  if (!board || !currentPlayerEl || !statusEl || !restartBtn) {
    return;
  }

  const winningLines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
  ];

  let gameState = Array(9).fill("");
  let currentPlayer = "X";
  let isGameOver = false;

  function updateInfo(message = "Jogo em curso") {
    currentPlayerEl.textContent = currentPlayer;
    statusEl.textContent = message;
  }

  function checkWinner() {
    for (const [a, b, c] of winningLines) {
      if (gameState[a] && gameState[a] === gameState[b] && gameState[b] === gameState[c]) {
        return gameState[a];
      }
    }
    return "";
  }

  function renderBoard() {
    board.innerHTML = "";

    gameState.forEach((value, index) => {
      const cell = document.createElement("button");
      cell.className = "galo-cell";
      cell.type = "button";
      cell.textContent = value;
      cell.disabled = Boolean(value) || isGameOver;
      cell.setAttribute("aria-label", `Posicao ${index + 1}`);
      cell.addEventListener("click", () => play(index));
      board.appendChild(cell);
    });
  }

  function play(index) {
    if (isGameOver || gameState[index]) {
      return;
    }

    gameState[index] = currentPlayer;

    const winner = checkWinner();
    if (winner) {
      isGameOver = true;
      updateInfo(`Vitoria do jogador ${winner}`);
      renderBoard();
      window.showWinnerModal("Temos vencedor!", `Vitoria do jogador ${winner}.`);
      return;
    }

    if (gameState.every((cell) => cell)) {
      isGameOver = true;
      updateInfo("Empate");
      renderBoard();
      window.showWinnerModal("Empate", "Ninguem venceu desta vez. Clica em novo jogo.");
      return;
    }

    currentPlayer = currentPlayer === "X" ? "O" : "X";
    updateInfo();
    renderBoard();
  }

  function resetGame() {
    gameState = Array(9).fill("");
    currentPlayer = "X";
    isGameOver = false;
    updateInfo();
    renderBoard();
  }

  restartBtn.onclick = resetGame;
  resetGame();
};
