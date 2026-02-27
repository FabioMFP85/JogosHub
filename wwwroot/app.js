window.showWinnerModal = (function setupWinnerModal() {
  let initialized = false;

  function closeModal() {
    const modal = document.getElementById("winner-modal");
    if (!modal) {
      return;
    }

    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  }

  function initEvents() {
    if (initialized) {
      return;
    }

    const modal = document.getElementById("winner-modal");
    if (!modal) {
      return;
    }

    const closeBtn = document.getElementById("winner-close");
    const playAgainBtn = document.getElementById("winner-play-again");

    if (closeBtn) {
      closeBtn.addEventListener("click", closeModal);
    }

    if (playAgainBtn) {
      playAgainBtn.addEventListener("click", closeModal);
    }

    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeModal();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeModal();
      }
    });

    initialized = true;
  }

  return function showWinnerModal(title, message) {
    const modal = document.getElementById("winner-modal");
    const titleEl = document.getElementById("winner-title");
    const messageEl = document.getElementById("winner-message");

    if (!modal || !titleEl || !messageEl) {
      return;
    }

    initEvents();
    titleEl.textContent = title;
    messageEl.textContent = message;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
  };
})();

window.initCarsMemoryGame = function initCarsMemoryGame() {
  const board = document.getElementById("board");
  const movesEl = document.getElementById("moves");
  const pairsEl = document.getElementById("pairs");
  const pairsTotalEl = document.getElementById("pairs-total");
  const characterCountEl = document.getElementById("character-count");
  const restartBtn = document.getElementById("restart");

  if (!board || !movesEl || !pairsEl || !pairsTotalEl || !characterCountEl || !restartBtn) {
    return;
  }

  const characters = [
    { id: "mcqueen", name: "Relampago McQueen", image: "images/cars/mcqueen.png" },
    { id: "mate", name: "Mate", image: "images/cars/Mate.png" },
    { id: "sally", name: "Sally", image: "images/cars/Sally.png" },
    { id: "doc-hudson", name: "Doc Hudson", image: "images/cars/doc-hudson.png" },
    { id: "luigi", name: "Luigi", image: "images/cars/Luigi.png" },
    { id: "guido", name: "Guido", image: "images/cars/Guido.png" },
    { id: "ramone", name: "Ramone", image: "images/cars/Ramone.png" },
    { id: "flo", name: "Flo", image: "images/cars/Flo.png" },
    { id: "chick-hicks", name: "Chick Hicks", image: "images/cars/Chick-Hicks.png" },
    { id: "strip-weathers", name: "Strip Weathers", image: "images/cars/Strip-Weathers.png" },
    { id: "mack", name: "Mack", image: "images/cars/Mack.png" },
    { id: "xerife", name: "Xerife", image: "images/cars/xerife.png" }
  ];

  let openCards = [];
  let lock = false;
  let moves = 0;
  let matchedPairs = 0;
  let lastDeckSignature = "";
  let activeCharacters = [];

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function buildShuffledDeck(sourceCharacters) {
    let deck = [];
    let signature = "";
    let attempts = 0;

    do {
      deck = shuffle([...sourceCharacters, ...sourceCharacters]);
      signature = deck.map((item) => item.id).join("|");
      attempts += 1;
    } while (signature === lastDeckSignature && attempts < 8);

    lastDeckSignature = signature;
    return deck;
  }

  function updateStats() {
    movesEl.textContent = String(moves);
    pairsEl.textContent = String(matchedPairs);
    pairsTotalEl.textContent = String(activeCharacters.length);
  }

  function createCard(character, index) {
    const btn = document.createElement("button");
    btn.className = "card";
    btn.type = "button";
    btn.dataset.characterId = character.id;
    btn.dataset.index = String(index);
    btn.setAttribute("aria-label", `Carta ${index + 1}: ${character.name}`);

    const img = document.createElement("img");
    img.className = "card-image";
    img.alt = character.name;
    img.src = character.image;
    img.loading = "lazy";

    const back = document.createElement("span");
    back.className = "card-back-label";
    back.textContent = "?";

    btn.appendChild(img);
    btn.appendChild(back);
    btn.addEventListener("click", () => flipCard(btn));

    return btn;
  }

  function checkWin() {
    if (matchedPairs === activeCharacters.length) {
      setTimeout(() => {
        window.showWinnerModal(
          "Vitoria!",
          `Parabens! Encontraste ${activeCharacters.length} pares em ${moves} tentativas.`
        );
      }, 150);
    }
  }

  function closeOpenCards() {
    openCards.forEach((card) => card.classList.remove("open"));
    openCards = [];
  }

  function markAsMatched() {
    openCards.forEach((card) => {
      card.classList.remove("open");
      card.classList.add("matched");
      card.disabled = true;
    });

    openCards = [];
    matchedPairs += 1;
    updateStats();
    checkWin();
  }

  function flipCard(card) {
    if (lock || card.classList.contains("open") || card.classList.contains("matched")) {
      return;
    }

    card.classList.add("open");
    openCards.push(card);

    if (openCards.length < 2) {
      return;
    }

    moves += 1;
    updateStats();

    const [first, second] = openCards;

    if (first.dataset.characterId === second.dataset.characterId) {
      markAsMatched();
      return;
    }

    lock = true;
    setTimeout(() => {
      closeOpenCards();
      lock = false;
    }, 900);
  }

  function getSelectedCharacterCount() {
    const parsed = Number(characterCountEl.value);
    if (Number.isNaN(parsed)) {
      return characters.length;
    }
    return Math.max(4, Math.min(parsed, characters.length));
  }

  function buildCharacterPicker() {
    characterCountEl.innerHTML = "";

    for (let count = 4; count <= characters.length; count += 1) {
      const option = document.createElement("option");
      option.value = String(count);
      option.textContent = `${count} personagens`;
      characterCountEl.appendChild(option);
    }

    characterCountEl.value = String(characters.length);
  }

  function initGame() {
    moves = 0;
    matchedPairs = 0;
    openCards = [];
    lock = false;
    activeCharacters = shuffle([...characters]).slice(0, getSelectedCharacterCount());
    updateStats();

    const deck = buildShuffledDeck(activeCharacters);
    const cards = deck.map((character, index) => createCard(character, index));

    board.innerHTML = "";
    cards.forEach((card) => board.appendChild(card));
  }

  buildCharacterPicker();
  characterCountEl.onchange = initGame;
  restartBtn.onclick = initGame;
  initGame();
};
