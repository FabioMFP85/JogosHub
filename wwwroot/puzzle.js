window.initPawPatrolPuzzle = function initPawPatrolPuzzle() {
  const board = document.getElementById("puzzle-board");
  const tray = document.getElementById("puzzle-tray");
  const movesEl = document.getElementById("puzzle-moves");
  const sizeEl = document.getElementById("puzzle-size");
  const restartBtn = document.getElementById("puzzle-restart");
  const referenceOpenBtn = document.getElementById("puzzle-reference-open");
  const imageModal = document.getElementById("puzzle-image-modal");
  const imageCloseBtn = document.getElementById("puzzle-image-close");

  if (!board || !tray || !movesEl || !sizeEl || !restartBtn || !referenceOpenBtn || !imageModal || !imageCloseBtn) {
    return;
  }

  const imagePath = "images/pawpatrol/patrulla-canina.jpg";
  let size = 2;
  let moves = 0;
  let placedCount = 0;
  let totalPieces = size * size;
  let draggingPieceId = "";
  let completed = false;

  function updateMoves() {
    movesEl.textContent = String(moves);
  }

  function closeImageModal() {
    imageModal.classList.remove("open");
    imageModal.setAttribute("aria-hidden", "true");
  }

  function openImageModal() {
    imageModal.classList.add("open");
    imageModal.setAttribute("aria-hidden", "false");
  }

  function showCompletedBoard() {
    board.innerHTML = "";
    board.classList.add("completed");
    tray.classList.add("hidden");

    const finalButton = document.createElement("button");
    finalButton.type = "button";
    finalButton.className = "puzzle-final-image";
    finalButton.setAttribute("aria-label", "Abrir imagem final maior");

    const image = document.createElement("img");
    image.src = imagePath;
    image.alt = "Imagem final completa";

    finalButton.appendChild(image);
    finalButton.addEventListener("click", openImageModal);
    board.appendChild(finalButton);
  }

  function buildPiece(pieceId) {
    const piece = document.createElement("button");
    piece.type = "button";
    piece.className = "puzzle-piece";
    piece.draggable = true;
    piece.dataset.pieceId = String(pieceId);
    piece.setAttribute("aria-label", `Peca ${pieceId + 1}`);

    const row = Math.floor(pieceId / size);
    const col = pieceId % size;
    piece.style.backgroundImage = `url('${imagePath}')`;
    piece.style.backgroundSize = `${size * 100}% ${size * 100}%`;
    piece.style.backgroundPosition = `${(col / (size - 1)) * 100}% ${(row / (size - 1)) * 100}%`;

    piece.addEventListener("dragstart", (event) => {
      draggingPieceId = String(pieceId);
      piece.classList.add("dragging");
      event.dataTransfer?.setData("text/plain", draggingPieceId);
      event.dataTransfer?.setDragImage(piece, piece.clientWidth / 2, piece.clientHeight / 2);
    });

    piece.addEventListener("dragend", () => {
      piece.classList.remove("dragging");
    });

    return piece;
  }

  function buildSlot(slotId) {
    const slot = document.createElement("div");
    slot.className = "puzzle-slot";
    slot.dataset.slotId = String(slotId);
    slot.setAttribute("aria-label", `Posicao ${slotId + 1}`);

    slot.addEventListener("dragover", (event) => {
      event.preventDefault();
      slot.classList.add("active");
    });

    slot.addEventListener("dragleave", () => {
      slot.classList.remove("active");
    });

    slot.addEventListener("drop", (event) => {
      event.preventDefault();
      slot.classList.remove("active");
      const pieceId = event.dataTransfer?.getData("text/plain") || draggingPieceId;
      if (!pieceId) {
        return;
      }

      handleDrop(slot, pieceId);
    });

    return slot;
  }

  function handleDrop(slot, pieceId) {
    if (completed) {
      return;
    }

    const slotId = Number(slot.dataset.slotId);
    const droppedPieceId = Number(pieceId);

    if (Number.isNaN(slotId) || Number.isNaN(droppedPieceId)) {
      return;
    }

    const piece = tray.querySelector(`.puzzle-piece[data-piece-id="${droppedPieceId}"]`);
    if (!piece) {
      return;
    }

    moves += 1;
    updateMoves();

    if (slotId !== droppedPieceId) {
      slot.classList.add("wrong");
      setTimeout(() => slot.classList.remove("wrong"), 250);
      return;
    }

    slot.classList.add("filled");
    piece.classList.add("locked");
    piece.draggable = false;
    slot.appendChild(piece);
    placedCount += 1;

    if (placedCount === totalPieces) {
      completed = true;
      showCompletedBoard();
      setTimeout(() => {
        window.showWinnerModal("Puzzle completo!", `Terminaste o puzzle em ${moves} movimentos.`);
      }, 160);
    }
  }

  function shuffle(list) {
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  function reset() {
    size = Number(sizeEl.value) === 3 ? 3 : 2;
    totalPieces = size * size;
    moves = 0;
    placedCount = 0;
    draggingPieceId = "";
    completed = false;
    updateMoves();
    closeImageModal();

    board.innerHTML = "";
    tray.innerHTML = "";
    board.classList.remove("completed");
    tray.classList.remove("hidden");
    board.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    tray.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

    for (let i = 0; i < totalPieces; i += 1) {
      board.appendChild(buildSlot(i));
    }

    const pieceIds = shuffle(Array.from({ length: totalPieces }, (_, i) => i));
    pieceIds.forEach((pieceId) => tray.appendChild(buildPiece(pieceId)));
  }

  sizeEl.onchange = reset;
  restartBtn.onclick = reset;
  referenceOpenBtn.onclick = openImageModal;
  imageCloseBtn.onclick = closeImageModal;
  imageModal.addEventListener("click", (event) => {
    if (event.target === imageModal) {
      closeImageModal();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeImageModal();
    }
  });
  reset();
};
