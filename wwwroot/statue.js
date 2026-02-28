window.initStatueGame = function initStatueGame() {
  const startBtn = document.getElementById("statue-start");
  const stopBtn = document.getElementById("statue-stop");
  const queryEl = document.getElementById("statue-video-query");
  const applyBtn = document.getElementById("statue-apply-video");
  const addBtn = document.getElementById("statue-add-video");
  const micBtn = document.getElementById("statue-mic-toggle");
  const pttBtn = document.getElementById("statue-ptt");
  const micLabel = document.getElementById("statue-mic-label");
  const pttLabel = document.getElementById("statue-ptt-label");
  const resultsEl = document.getElementById("statue-search-results");
  const addModal = document.getElementById("statue-add-modal");
  const addSearchEl = document.getElementById("statue-add-search");
  const addSearchBtn = document.getElementById("statue-add-search-btn");
  const addSearchResultsEl = document.getElementById("statue-add-search-results");
  const addUrlEl = document.getElementById("statue-add-url");
  const addTitleEl = document.getElementById("statue-add-title");
  const addConfirmBtn = document.getElementById("statue-add-confirm");
  const addCancelBtn = document.getElementById("statue-add-cancel");
  const roundEl = document.getElementById("statue-round");
  const stateEl = document.getElementById("statue-state");
  const phaseEl = document.getElementById("statue-phase");
  const messageEl = document.getElementById("statue-message");
  const playerHost = document.getElementById("statue-player");

  if (
    !startBtn || !stopBtn || !queryEl || !applyBtn || !addBtn || !micBtn || !pttBtn || !micLabel || !pttLabel ||
    !resultsEl || !addModal || !addSearchEl || !addSearchBtn || !addSearchResultsEl ||
    !addUrlEl || !addTitleEl || !addConfirmBtn || !addCancelBtn ||
    !roundEl || !stateEl || !phaseEl || !messageEl || !playerHost
  ) {
    return;
  }

  const songs = [
    { id: "NcMFEtmVmSY", label: "Tucantar - Festa de Halloween" },
    { id: "jhxEsFSmBwo", label: "Tucantar - Carnaval, Carnaval" },
    { id: "RwuhBNO20U0", label: "Tucantar - Ser Feliz e o que importa" },
    { id: "dy7l6c7wWw8", label: "Tucantar - O Jogo da Estatua" }
  ];

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let pttRecognition = null;
  let micActive = false;
  let lastVoiceCommandAt = 0;
  let lastCommandKey = "";
  const isMobileDevice = window.matchMedia("(pointer: coarse)").matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  let player = null;
  let running = false;
  let round = 0;
  let apiReady = false;
  let selectedVideoId = "";
  let selectedVideoLabel = "";

  function setPhase(kind, text, message) {
    phaseEl.className = `statue-phase ${kind}`;
    phaseEl.textContent = text;
    messageEl.textContent = message;
    stateEl.textContent = text;
  }

  function extractYouTubeId(input) {
    const raw = (input || "").trim();
    if (!raw) {
      return "";
    }

    const idOnlyRegex = /^[a-zA-Z0-9_-]{11}$/;
    if (idOnlyRegex.test(raw)) {
      return raw;
    }

    const patterns = [
      /[?&]v=([a-zA-Z0-9_-]{11})/,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /embed\/([a-zA-Z0-9_-]{11})/,
      /shorts\/([a-zA-Z0-9_-]{11})/
    ];

    for (const pattern of patterns) {
      const match = raw.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return "";
  }

  function randomSong() {
    if (selectedVideoId) {
      return { id: selectedVideoId, label: selectedVideoLabel || "Video escolhido" };
    }
    return songs[Math.floor(Math.random() * songs.length)];
  }

  function findSongByText(text) {
    const q = (text || "").trim().toLowerCase();
    if (!q) {
      return null;
    }
    return songs.find((song) => song.label.toLowerCase() === q) || null;
  }

  function addSongToPlaylist(id, label) {
    const exists = songs.some((song) => song.id === id);
    if (exists) {
      setPhase("idle", "Ja existe", "Essa musica ja esta na playlist.");
      return;
    }

    songs.unshift({ id, label });
    renderSearchResults(queryEl.value);
    setPhase("idle", "Musica adicionada", `Adicionada: ${label}`);
  }

  function openAddModal() {
    addModal.classList.add("open");
    addModal.setAttribute("aria-hidden", "false");
    addUrlEl.value = queryEl.value.trim();
    addTitleEl.value = "";
    addSearchEl.value = "";
    addSearchResultsEl.innerHTML = "";
    addUrlEl.focus();
  }

  function closeAddModal() {
    addModal.classList.remove("open");
    addModal.setAttribute("aria-hidden", "true");
    addUrlEl.value = "";
    addTitleEl.value = "";
    addSearchEl.value = "";
    addSearchResultsEl.innerHTML = "";
    queryEl.value = "";
  }

  function pauseVideoOnly() {
    if (player && player.pauseVideo) {
      player.pauseVideo();
    }
  }

  function playVideoOnly() {
    if (player && player.playVideo) {
      player.playVideo();
    }
  }

  function pauseByVoice() {
    if (!player || !window.YT || !window.YT.PlayerState) {
      return;
    }

    const current = player.getPlayerState();
    if (current === window.YT.PlayerState.PLAYING) {
      pauseVideoOnly();
      setPhase("freeze", "Estatua!", "Pausado por comando de voz.");
    }
  }

  function continueByVoice() {
    if (!player || !window.YT || !window.YT.PlayerState) {
      return;
    }

    const current = player.getPlayerState();
    if (current !== window.YT.PlayerState.PLAYING) {
      playVideoOnly();
      setPhase("dance", "Danca!", "Retomado por comando de voz.");
    }
  }

  function normalizeSpeech(text) {
    return (text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function collapseSpeech(text) {
    return normalizeSpeech(text).replace(/\s+/g, "");
  }

  function isPauseCommand(normalized) {
    const compact = normalized.replace(/\s+/g, "");
    return (
      normalized.includes("estatua") ||
      normalized.includes("esta tua") ||
      normalized.includes("estatua agora") ||
      normalized.includes("pausa") ||
      normalized.includes("parar") ||
      normalized.includes("statue") ||
      normalized.includes("stop") ||
      compact.includes("estatu") ||
      compact.includes("estat")
    );
  }

  function isContinueCommand(normalized) {
    const compact = normalized.replace(/\s+/g, "");
    return (
      normalized.includes("continua") ||
      normalized.includes("continuar") ||
      normalized.includes("pode continuar") ||
      normalized.includes("retoma") ||
      normalized.includes("retomar") ||
      normalized.includes("continue") ||
      normalized.includes("play") ||
      compact.includes("contin")
    );
  }

  function processVoiceTranscript(transcript, mode = "continuous") {
    const normalized = normalizeSpeech(transcript);
    const compact = collapseSpeech(transcript);
    const cooldownMs = mode === "ptt" ? 350 : 550;

    if (isContinueCommand(normalized) && canRunVoiceCommand("continue", cooldownMs)) {
      continueByVoice();
      setPhase("dance", "Danca!", `Comando voz: "${normalized}"`);
      return true;
    }
    if ((isPauseCommand(normalized) || compact.includes("estatu")) && canRunVoiceCommand("pause", cooldownMs)) {
      pauseByVoice();
      setPhase("freeze", "Estatua!", `Comando voz: "${normalized}"`);
      return true;
    }
    return false;
  }

  function canRunVoiceCommand(key, cooldownMs = 320) {
    const now = Date.now();
    if (lastCommandKey !== key) {
      lastCommandKey = key;
      lastVoiceCommandAt = now;
      return true;
    }
    if (now - lastVoiceCommandAt < cooldownMs) {
      return false;
    }
    lastVoiceCommandAt = now;
    return true;
  }

  function stopGame() {
    running = false;
    lastCommandKey = "";
    pauseVideoOnly();
    setPhase("idle", "Parado", "Jogo parado. Clica em comecar para jogar novamente.");
  }

  function startGame() {
    if (!player) {
      setPhase("idle", "A carregar", "A preparar o player do YouTube...");
      return;
    }

    running = true;
    lastCommandKey = "";
    round += 1;
    roundEl.textContent = String(round);
    const song = randomSong();
    player.loadVideoById(song.id);
    setPhase("dance", "Danca!", `Ronda ${round}: ${song.label}`);
  }

  function createPlayer() {
    if (player || !window.YT || !window.YT.Player) {
      return;
    }

    player = new window.YT.Player("statue-player", {
      width: "100%",
      height: "100%",
      videoId: songs[0].id,
      playerVars: {
        controls: 1,
        rel: 0,
        modestbranding: 1
      },
      events: {
        onReady: () => {
          apiReady = true;
          setPhase("idle", "Pronto", "Player pronto. Clica em comecar.");
        }
      }
    });
  }

  function loadYouTubeApi() {
    if (window.YT && window.YT.Player) {
      createPlayer();
      return;
    }

    const existing = document.getElementById("yt-iframe-api");
    if (!existing) {
      const script = document.createElement("script");
      script.id = "yt-iframe-api";
      script.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(script);
    }

    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function onYouTubeIframeAPIReady() {
      if (typeof previous === "function") {
        previous();
      }
      createPlayer();
    };
  }

  function renderSearchResults(term) {
    const query = term.trim().toLowerCase();
    const filtered = !query
      ? songs
      : songs.filter((song) => song.label.toLowerCase().includes(query));

    resultsEl.innerHTML = "";

    if (filtered.length === 0) {
      const empty = document.createElement("p");
      empty.className = "statue-empty";
      empty.textContent = "Sem resultados na playlist do Tucantar.";
      resultsEl.appendChild(empty);
      return;
    }

    filtered.forEach((song) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "statue-result-item";
      btn.textContent = song.label;
      btn.addEventListener("click", () => {
        selectedVideoId = song.id;
        selectedVideoLabel = song.label;
        queryEl.value = song.label;
        setPhase("idle", "Video definido", `Selecionado: ${song.label}.`);
      });
      resultsEl.appendChild(btn);
    });
  }

  function renderModalSearchResults(items) {
    addSearchResultsEl.innerHTML = "";
    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "statue-empty";
      empty.textContent = "Sem resultados no YouTube.";
      addSearchResultsEl.appendChild(empty);
      return;
    }

    items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "statue-add-result";

      const img = document.createElement("img");
      img.src = item.thumbnail || "";
      img.alt = item.title;

      const text = document.createElement("p");
      text.textContent = item.title;

      const pick = document.createElement("button");
      pick.type = "button";
      pick.className = "ghost-button";
      pick.textContent = "Escolher";
      pick.addEventListener("click", () => {
        addUrlEl.value = `https://www.youtube.com/watch?v=${item.id}`;
        addTitleEl.value = item.title;
      });

      row.appendChild(img);
      row.appendChild(text);
      row.appendChild(pick);
      addSearchResultsEl.appendChild(row);
    });
  }

  function normalizeSearchItems(raw) {
    if (!raw) {
      return [];
    }

    if (Array.isArray(raw.items)) {
      return raw.items
        .map((entry) => ({
          id: entry?.id?.videoId || entry?.id || "",
          title: entry?.snippet?.title || entry?.title || "",
          thumbnail: entry?.snippet?.thumbnails?.medium?.url || entry?.snippet?.thumbnails?.default?.url || entry?.thumbnail?.thumbnails?.[0]?.url || entry?.thumbnail || ""
        }))
        .filter((entry) => entry.id && entry.title);
    }

    if (Array.isArray(raw)) {
      return raw
        .map((entry) => ({
          id: entry?.id || entry?.videoId || "",
          title: entry?.title || "",
          thumbnail: entry?.videoThumbnails?.[0]?.url || entry?.thumbnail || ""
        }))
        .filter((entry) => entry.id && entry.title);
    }

    return [];
  }

  function withCorsProxies(url) {
    const encoded = encodeURIComponent(url);
    return [
      url,
      `https://api.allorigins.win/raw?url=${encoded}`,
      `https://corsproxy.io/?${encoded}`,
      `https://cors.isomorphic-git.org/${url}`
    ];
  }

  async function searchYouTubeByHtml(term) {
    const encoded = encodeURIComponent(term);
    const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encoded}`;
    const candidates = withCorsProxies(youtubeSearchUrl);

    for (const url of candidates) {
      try {
        const response = await fetch(url, { method: "GET", mode: "cors", cache: "no-store" });
        if (!response.ok) {
          continue;
        }

        const html = await response.text();
        const ids = [];
        const seen = new Set();
        const regex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
        let match = regex.exec(html);
        while (match && ids.length < 10) {
          const id = match[1];
          if (!seen.has(id)) {
            seen.add(id);
            ids.push(id);
          }
          match = regex.exec(html);
        }

        if (ids.length) {
          return ids.map((id) => ({
            id,
            title: `YouTube video (${id})`,
            thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`
          }));
        }
      } catch {
        // Try next fallback source.
      }
    }

    return [];
  }

  async function searchYouTube(term) {
    const encoded = encodeURIComponent(term);
    const baseEndpoints = [
      `https://yt.lemnoslife.com/noKey/search?part=snippet&type=video&maxResults=8&q=${encoded}`,
      `https://piped.video/api/v1/search?q=${encoded}&filter=videos`,
      `https://pipedapi.adminforge.de/search?q=${encoded}&filter=videos`,
      `https://inv.nadeko.net/api/v1/search?q=${encoded}&type=video`,
      `https://invidious.fdn.fr/api/v1/search?q=${encoded}&type=video`
    ];
    const endpoints = baseEndpoints.flatMap((url) => withCorsProxies(url));

    for (const url of endpoints) {
      try {
        const response = await fetch(url, { method: "GET", mode: "cors", cache: "no-store" });
        if (!response.ok) {
          continue;
        }

        const data = await response.json();
        const normalized = normalizeSearchItems(data);
        if (normalized.length > 0) {
          return normalized;
        }
      } catch {
        // Try next fallback endpoint.
      }
    }

    return searchYouTubeByHtml(term);
  }

  function initMic() {
    if (!SpeechRecognition) {
      micBtn.disabled = true;
      micLabel.textContent = "Microfone indisponivel";
      pttBtn.disabled = true;
      pttLabel.textContent = "Voz indisponivel";
      return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = "pt-PT";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    recognition.onresult = (event) => {
      if (!micActive) {
        return;
      }
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const currentResult = event.results[i];
        const altCount = Math.min(event.results[i].length, 3);
        for (let a = 0; a < altCount; a += 1) {
          const candidate = event.results[i][a];
          const normalized = normalizeSpeech(candidate.transcript);
          // In interim mode, only trigger on explicit command words.
          if (!currentResult.isFinal && !(normalized.includes("estatua") || normalized.includes("continua") || normalized.includes("retoma"))) {
            continue;
          }
          if (processVoiceTranscript(candidate.transcript, "continuous")) {
            return;
          }
        }
      }
    };

    recognition.onerror = () => {
      if (micActive) {
        try {
          recognition.stop();
        } catch {
          // Ignore stop errors from browser speech engine state.
        }
      }
    };

    recognition.onend = () => {
      if (micActive) {
        setTimeout(() => {
          try {
            recognition.start();
          } catch {
            // Browser may throw while restarting too quickly.
          }
        }, 180);
      }
    };

    micBtn.onclick = () => {
      if (!recognition) {
        return;
      }

      if (isMobileDevice) {
        setPhase("idle", "Modo movel", "No telemovel use 'Premir para falar' para melhor fiabilidade.");
        return;
      }

      micActive = !micActive;
      micBtn.classList.toggle("active", micActive);
      micLabel.textContent = micActive ? "Microfone ligado" : "Ativar microfone";

      if (micActive) {
        try {
          if (player && player.setVolume) {
            player.setVolume(35);
          }
          lastCommandKey = "";
          recognition.start();
        } catch {
          // Ignore duplicate start attempts.
        }
        setPhase("idle", "Microfone ligado", "Diz 'estatua/pausa' para pausar e 'continua/retoma' para retomar.");
      } else {
        try {
          recognition.stop();
        } catch {
          // Ignore stop errors.
        }
        if (player && player.setVolume) {
          player.setVolume(100);
        }
      }
    };

    // Push-to-talk: mais fiavel em ambientes com ruido e em dispositivos moveis.
    pttRecognition = new SpeechRecognition();
    pttRecognition.lang = "pt-PT";
    pttRecognition.continuous = false;
    pttRecognition.interimResults = false;
    pttRecognition.maxAlternatives = 5;

    pttRecognition.onresult = (event) => {
      let handled = false;
      const altCount = Math.min(event.results[0].length, 5);
      for (let a = 0; a < altCount; a += 1) {
        handled = processVoiceTranscript(event.results[0][a].transcript, "ptt") || handled;
        if (handled) {
          break;
        }
      }
      if (!handled) {
        setPhase("idle", "Nao percebi", "Tenta dizer 'estatua' ou 'continua'.");
      }
    };

    pttBtn.onpointerdown = () => {
      try {
        pttBtn.classList.add("active");
        pttLabel.textContent = "A ouvir...";
        pttRecognition.start();
      } catch {
        // Ignore overlapping starts.
      }
    };

    pttBtn.onpointerup = () => {
      pttBtn.classList.remove("active");
      pttLabel.textContent = "Premir para falar";
      try {
        pttRecognition.stop();
      } catch {
        // Ignore stop errors.
      }
    };

    pttBtn.onpointercancel = () => {
      pttBtn.classList.remove("active");
      pttLabel.textContent = "Premir para falar";
      try {
        pttRecognition.stop();
      } catch {
        // Ignore stop errors.
      }
    };

    if (isMobileDevice) {
      micBtn.disabled = true;
      micLabel.textContent = "Use Premir para falar";
    }
  }

  startBtn.onclick = () => {
    if (!apiReady) {
      loadYouTubeApi();
    }
    startGame();
  };

  stopBtn.onclick = stopGame;

  applyBtn.onclick = () => {
    const input = queryEl.value.trim();
    const id = extractYouTubeId(input);
    if (!id) {
      const localSong = findSongByText(input);
      if (localSong) {
        selectedVideoId = localSong.id;
        selectedVideoLabel = localSong.label;
        setPhase("idle", "Video definido", `Selecionado: ${localSong.label}.`);
        return;
      }
      setPhase("idle", "Formato invalido", "Usa link/ID valido ou escolhe na lista.");
      return;
    }

    selectedVideoId = id;
    selectedVideoLabel = "Video personalizado";
    setPhase("idle", "Video definido", "Video personalizado aplicado.");
  };

  addBtn.onclick = openAddModal;

  addConfirmBtn.onclick = () => {
    const input = addUrlEl.value.trim();
    const id = extractYouTubeId(input);
    if (!id) {
      setPhase("idle", "Formato invalido", "Para adicionar, cola um link/ID do YouTube.");
      return;
    }

    const customTitle = addTitleEl.value.trim();
    const nextNumber = songs.length + 1;
    const label = customTitle || `Tucantar - Musica ${nextNumber}`;
    addSongToPlaylist(id, label);
    selectedVideoId = id;
    selectedVideoLabel = label;
    renderSearchResults(queryEl.value);
    closeAddModal();
  };

  addCancelBtn.onclick = closeAddModal;
  addModal.addEventListener("click", (event) => {
    if (event.target === addModal) {
      closeAddModal();
    }
  });

  queryEl.addEventListener("input", () => {
    renderSearchResults(queryEl.value);
  });

  addSearchBtn.onclick = async () => {
    const term = addSearchEl.value.trim();
    if (!term) {
      addSearchResultsEl.innerHTML = '<p class="statue-empty">Escreve algo para pesquisar.</p>';
      return;
    }

    addSearchResultsEl.innerHTML = '<p class="statue-empty">A pesquisar...</p>';
    const items = await searchYouTube(term);
    if (!items.length) {
      const local = songs.filter((song) => song.label.toLowerCase().includes(term.toLowerCase()));
      if (local.length) {
        renderModalSearchResults(local.map((song) => ({
          id: song.id,
          title: song.label,
          thumbnail: `https://i.ytimg.com/vi/${song.id}/mqdefault.jpg`
        })));
        return;
      }
      addSearchResultsEl.innerHTML = '<p class="statue-empty">Pesquisa indisponivel agora. Tenta novamente ou cola o link/ID.</p>';
      return;
    }
    renderModalSearchResults(items);
  };

  setPhase("idle", "Pronto", "Clica em comecar para iniciar o jogo.");
  renderSearchResults("");
  loadYouTubeApi();
  initMic();
};
