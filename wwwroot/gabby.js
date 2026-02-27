window.initGabbyMemoryGame = function initGabbyMemoryGame() {
  const board = document.getElementById("board");
  const movesEl = document.getElementById("moves");
  const pairsEl = document.getElementById("pairs");
  const pairsTotalEl = document.getElementById("pairs-total");
  const characterCountEl = document.getElementById("character-count");
  const restartBtn = document.getElementById("restart");

  if (!board || !movesEl || !pairsEl || !pairsTotalEl || !characterCountEl || !restartBtn) {
    return;
  }

  board.classList.add("gabby-board");

  const characters = [
    { id: "gabby", name: "Gabby", image: "images/gabby/gabby.png" },
    { id: "babybox", name: "Baby Box", image: "images/gabby/babybox.png" },
    { id: "pandy", name: "Pandy Patas", image: "images/gabby/pandy.png" },
    { id: "djcatnip", name: "DJ Catnip", image: "images/gabby/djcatnip.png" },
    { id: "cakey", name: "Cakey Cat", image: "images/gabby/cakey.png" },
    { id: "marty-party-cat", name: "Marty The Party Cat", image: "images/gabby/marty-the-party-cat.png" },
    { id: "carlita", name: "Carlita", image: "images/gabby/carlita.png" },
    { id: "kittyfairy", name: "Kitty Fairy", image: "images/gabby/kittyfairy.png" },
    { id: "mercat", name: "MerCat", image: "images/gabby/mercat.png" },
    { id: "pillowcat", name: "Pillow Cat", image: "images/gabby/pillowcat.png" },
    { id: "catrat", name: "CatRat", image: "images/gabby/catrat.png" }
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
    img.className = "card-image gabby-image";
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
