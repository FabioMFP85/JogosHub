window.initSuperMarioGame = (function setupSuperMarioGame() {
  const state = {
    rafId: 0,
    running: false,
    worldWidth: 3600,
    cameraX: 0,
    score: 0,
    coinCount: 0,
    lives: 3,
    finishX: 3520,
    keys: { left: false, right: false, jump: false },
    particles: [],
    touchCleanup: [],
    player: null,
    platforms: [],
    enemies: [],
    coins: [],
    movingPlatforms: [],
    clouds: [],
    hills: [],
    bushes: [],
    lastTs: 0
  };

  const PHYSICS = {
    gravity: 1700,
    maxFall: 950,
    accelGround: 1900,
    accelAir: 1050,
    frictionGround: 2600,
    maxRunSpeed: 330,
    jumpSpeed: 620,
    jumpCut: 0.45,
    coyoteTime: 0.09,
    jumpBufferTime: 0.12
  };

  let ctx;
  let canvas;
  let scoreEl;
  let coinsEl;
  let livesEl;
  let statusEl;
  let startBtn;
  let resetBtn;
  let leftBtn;
  let rightBtn;
  let jumpBtn;

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function setStatus(text) {
    if (statusEl) {
      statusEl.textContent = text;
    }
  }

  function updateHud() {
    scoreEl.textContent = String(state.score);
    coinsEl.textContent = String(state.coinCount);
    livesEl.textContent = String(state.lives);
  }

  function createParticle(x, y, color) {
    state.particles.push({
      x,
      y,
      vx: (Math.random() * 2 - 1) * 130,
      vy: -100 - Math.random() * 200,
      life: 0.55 + Math.random() * 0.25,
      t: 0,
      size: 4 + Math.random() * 3,
      color
    });
  }

  function spawnBurst(x, y, color, count) {
    for (let i = 0; i < count; i += 1) {
      createParticle(x, y, color);
    }
  }

  function resetWorld() {
    state.player = {
      x: 80,
      y: 280,
      w: 34,
      h: 46,
      vx: 0,
      vy: 0,
      facing: 1,
      onGround: false,
      coyote: 0,
      jumpBuffer: 0,
      invincible: 0
    };

    state.platforms = [
      { x: 0, y: 388, w: 520, h: 42 },
      { x: 610, y: 388, w: 560, h: 42 },
      { x: 1310, y: 388, w: 760, h: 42 },
      { x: 2180, y: 388, w: 620, h: 42 },
      { x: 2890, y: 388, w: 710, h: 42 },
      { x: 250, y: 312, w: 120, h: 22 },
      { x: 460, y: 270, w: 110, h: 22 },
      { x: 820, y: 300, w: 130, h: 22 },
      { x: 1020, y: 248, w: 120, h: 22 },
      { x: 1420, y: 298, w: 140, h: 22 },
      { x: 1740, y: 252, w: 120, h: 22 },
      { x: 2320, y: 304, w: 130, h: 22 },
      { x: 2580, y: 260, w: 140, h: 22 },
      { x: 3020, y: 300, w: 130, h: 22 },
      { x: 3300, y: 258, w: 120, h: 22 }
    ];

    state.movingPlatforms = [
      { x: 1960, y: 280, w: 130, h: 20, startX: 1960, range: 150, speed: 90, dir: 1 }
    ];

    state.coins = [
      { x: 290, y: 272, r: 10, collected: false, bob: 0 },
      { x: 500, y: 230, r: 10, collected: false, bob: 1 },
      { x: 860, y: 260, r: 10, collected: false, bob: 2 },
      { x: 1060, y: 206, r: 10, collected: false, bob: 3 },
      { x: 1460, y: 258, r: 10, collected: false, bob: 4 },
      { x: 1780, y: 212, r: 10, collected: false, bob: 5 },
      { x: 2010, y: 238, r: 10, collected: false, bob: 6 },
      { x: 2360, y: 264, r: 10, collected: false, bob: 7 },
      { x: 2620, y: 220, r: 10, collected: false, bob: 8 },
      { x: 3060, y: 260, r: 10, collected: false, bob: 9 },
      { x: 3340, y: 218, r: 10, collected: false, bob: 10 }
    ];

    state.enemies = [
      { x: 760, y: 360, w: 30, h: 28, vx: 64, minX: 660, maxX: 960, alive: true },
      { x: 1540, y: 360, w: 30, h: 28, vx: 70, minX: 1390, maxX: 1720, alive: true },
      { x: 2480, y: 360, w: 30, h: 28, vx: -72, minX: 2240, maxX: 2720, alive: true },
      { x: 3160, y: 360, w: 30, h: 28, vx: 78, minX: 2980, maxX: 3380, alive: true }
    ];

    state.clouds = Array.from({ length: 14 }, (_, i) => ({
      x: i * 300 + 80,
      y: 50 + (i % 3) * 36,
      s: 0.85 + (i % 4) * 0.12
    }));

    state.hills = Array.from({ length: 16 }, (_, i) => ({
      x: i * 240,
      h: 80 + (i % 5) * 18,
      tone: i % 2
    }));

    state.bushes = Array.from({ length: 22 }, (_, i) => ({
      x: i * 170 + 40,
      y: 352,
      w: 65 + (i % 4) * 10
    }));

    state.cameraX = 0;
    state.score = 0;
    state.coinCount = 0;
    state.lives = 3;
    state.particles = [];
    state.lastTs = 0;
    updateHud();
  }

  function rectHit(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function allSolids() {
    return state.platforms.concat(state.movingPlatforms);
  }

  function hurtPlayer() {
    const p = state.player;
    if (p.invincible > 0 || !state.running) {
      return;
    }

    state.lives -= 1;
    updateHud();

    if (state.lives <= 0) {
      state.running = false;
      setStatus("Game over");
      spawnBurst(p.x + p.w / 2, p.y + p.h / 2, "#ff5f5f", 16);
      return;
    }

    p.x = Math.max(60, p.x - 110);
    p.y = 220;
    p.vx = 0;
    p.vy = -260;
    p.invincible = 1.2;
    setStatus("Perdeste uma vida");
    spawnBurst(p.x + p.w / 2, p.y + p.h / 2, "#ffd166", 12);
  }

  function updateMovingPlatforms(dt) {
    state.movingPlatforms.forEach((platform) => {
      platform.x += platform.speed * platform.dir * dt;
      if (platform.x > platform.startX + platform.range) {
        platform.x = platform.startX + platform.range;
        platform.dir = -1;
      } else if (platform.x < platform.startX - platform.range) {
        platform.x = platform.startX - platform.range;
        platform.dir = 1;
      }
    });
  }

  function applyHorizontalMovement(dt) {
    const p = state.player;
    const accel = p.onGround ? PHYSICS.accelGround : PHYSICS.accelAir;
    const direction = (state.keys.right ? 1 : 0) - (state.keys.left ? 1 : 0);

    if (direction !== 0) {
      p.vx += direction * accel * dt;
      p.facing = direction;
    } else if (p.onGround) {
      const sign = Math.sign(p.vx);
      const decel = PHYSICS.frictionGround * dt;
      if (Math.abs(p.vx) <= decel) {
        p.vx = 0;
      } else {
        p.vx -= sign * decel;
      }
    }

    p.vx = clamp(p.vx, -PHYSICS.maxRunSpeed, PHYSICS.maxRunSpeed);
    p.x += p.vx * dt;

    allSolids().forEach((platform) => {
      if (!rectHit(p, platform)) {
        return;
      }
      if (p.vx > 0) {
        p.x = platform.x - p.w;
      } else if (p.vx < 0) {
        p.x = platform.x + platform.w;
      }
      p.vx = 0;
    });

    if (p.x < 0) {
      p.x = 0;
      p.vx = 0;
    }
    if (p.x + p.w > state.worldWidth) {
      p.x = state.worldWidth - p.w;
      p.vx = 0;
    }
  }

  function handleJumpLogic(dt) {
    const p = state.player;
    p.coyote = p.onGround ? PHYSICS.coyoteTime : Math.max(0, p.coyote - dt);
    p.jumpBuffer = state.keys.jump ? PHYSICS.jumpBufferTime : Math.max(0, p.jumpBuffer - dt);

    if (p.jumpBuffer > 0 && p.coyote > 0) {
      p.vy = -PHYSICS.jumpSpeed;
      p.onGround = false;
      p.coyote = 0;
      p.jumpBuffer = 0;
      spawnBurst(p.x + p.w / 2, p.y + p.h, "#a0d7ff", 6);
    }

    if (!state.keys.jump && p.vy < 0) {
      p.vy *= PHYSICS.jumpCut;
    }
  }

  function applyVerticalMovement(dt) {
    const p = state.player;
    p.vy = clamp(p.vy + PHYSICS.gravity * dt, -PHYSICS.jumpSpeed, PHYSICS.maxFall);
    const prevY = p.y;
    p.y += p.vy * dt;
    p.onGround = false;

    allSolids().forEach((platform) => {
      if (!rectHit(p, platform)) {
        return;
      }

      const prevBottom = prevY + p.h;
      const currentBottom = p.y + p.h;

      if (prevBottom <= platform.y + 6 && currentBottom >= platform.y) {
        p.y = platform.y - p.h;
        p.vy = 0;
        p.onGround = true;
      } else if (prevY >= platform.y + platform.h - 2 && p.vy < 0) {
        p.y = platform.y + platform.h;
        p.vy = 20;
      }
    });

    if (p.y > canvas.height + 120) {
      hurtPlayer();
      p.x = 80;
      p.y = 220;
      p.vx = 0;
      p.vy = 0;
    }
  }

  function updatePlayer(dt) {
    const p = state.player;
    if (p.invincible > 0) {
      p.invincible = Math.max(0, p.invincible - dt);
    }

    handleJumpLogic(dt);
    applyHorizontalMovement(dt);
    applyVerticalMovement(dt);
  }

  function updateCoins(dt) {
    const p = state.player;
    state.coins.forEach((coin) => {
      if (coin.collected) {
        return;
      }
      coin.bob += dt * 5;
      const cy = coin.y + Math.sin(coin.bob) * 4;
      const dx = p.x + p.w / 2 - coin.x;
      const dy = p.y + p.h / 2 - cy;
      if (dx * dx + dy * dy < 26 * 26) {
        coin.collected = true;
        state.coinCount += 1;
        state.score += 120;
        updateHud();
        spawnBurst(coin.x, cy, "#ffd84d", 10);
      }
    });
  }

  function updateEnemies(dt) {
    const p = state.player;
    state.enemies.forEach((enemy) => {
      if (!enemy.alive) {
        return;
      }

      enemy.x += enemy.vx * dt;
      if (enemy.x < enemy.minX) {
        enemy.x = enemy.minX;
        enemy.vx = Math.abs(enemy.vx);
      } else if (enemy.x + enemy.w > enemy.maxX) {
        enemy.x = enemy.maxX - enemy.w;
        enemy.vx = -Math.abs(enemy.vx);
      }

      if (!rectHit(p, enemy)) {
        return;
      }

      const playerBottom = p.y + p.h;
      if (p.vy > 150 && playerBottom - enemy.y < 16) {
        enemy.alive = false;
        p.vy = -PHYSICS.jumpSpeed * 0.55;
        state.score += 250;
        updateHud();
        spawnBurst(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "#8b4b21", 12);
      } else {
        hurtPlayer();
      }
    });
  }

  function updateParticles(dt) {
    state.particles = state.particles.filter((particle) => {
      particle.t += dt;
      if (particle.t >= particle.life) {
        return false;
      }
      particle.vy += 620 * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      return true;
    });
  }

  function updateCamera(dt) {
    const target = clamp(state.player.x - canvas.width * 0.35, 0, state.worldWidth - canvas.width);
    const lerp = 1 - Math.exp(-dt * 8);
    state.cameraX += (target - state.cameraX) * lerp;
  }

  function checkWin() {
    if (state.player.x + state.player.w >= state.finishX) {
      state.running = false;
      state.score += 800;
      updateHud();
      setStatus("Vitoria!");
      spawnBurst(state.player.x + 20, state.player.y, "#8aff9b", 18);
    }
  }

  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, "#74c7ff");
    sky.addColorStop(0.65, "#bce9ff");
    sky.addColorStop(1, "#f3fbff");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const sunX = canvas.width - 110;
    const sunY = 80;
    const sun = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 52);
    sun.addColorStop(0, "#fff8b8");
    sun.addColorStop(1, "rgba(255, 248, 184, 0)");
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 54, 0, Math.PI * 2);
    ctx.fill();

    state.hills.forEach((hill) => {
      const x = hill.x - state.cameraX * 0.22;
      const y = 388 - hill.h;
      ctx.fillStyle = hill.tone === 0 ? "#82c67f" : "#6fb96c";
      ctx.beginPath();
      ctx.moveTo(x - 80, 388);
      ctx.quadraticCurveTo(x + 80, y - 30, x + 240, 388);
      ctx.closePath();
      ctx.fill();
    });

    state.clouds.forEach((cloud) => {
      const x = cloud.x - state.cameraX * 0.12;
      ctx.fillStyle = "#ffffffd6";
      ctx.beginPath();
      ctx.ellipse(x, cloud.y, 32 * cloud.s, 17 * cloud.s, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 28 * cloud.s, cloud.y + 4, 25 * cloud.s, 14 * cloud.s, 0, 0, Math.PI * 2);
      ctx.ellipse(x - 24 * cloud.s, cloud.y + 5, 21 * cloud.s, 12 * cloud.s, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawGroundDecor() {
    state.bushes.forEach((bush) => {
      const x = bush.x - state.cameraX * 0.92;
      ctx.fillStyle = "#3f9a4f";
      ctx.beginPath();
      ctx.ellipse(x, bush.y, bush.w * 0.36, 18, 0, 0, Math.PI * 2);
      ctx.ellipse(x + bush.w * 0.25, bush.y + 2, bush.w * 0.32, 16, 0, 0, Math.PI * 2);
      ctx.ellipse(x - bush.w * 0.25, bush.y + 3, bush.w * 0.3, 15, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawPlatform(platform, isMoving) {
    const x = platform.x - state.cameraX;
    const y = platform.y;
    const base = isMoving ? "#8d6b42" : y >= 380 ? "#96592a" : "#b16f37";
    const top = isMoving ? "#77bd58" : "#6db44f";
    ctx.fillStyle = base;
    ctx.fillRect(x, y, platform.w, platform.h);

    ctx.fillStyle = top;
    ctx.fillRect(x, y - 6, platform.w, 8);

    ctx.fillStyle = "#00000014";
    for (let px = 0; px < platform.w; px += 24) {
      ctx.fillRect(x + px + 2, y + 8, 14, 3);
    }
  }

  function drawPlatforms() {
    state.platforms.forEach((platform) => drawPlatform(platform, false));
    state.movingPlatforms.forEach((platform) => drawPlatform(platform, true));
  }

  function drawCoins() {
    state.coins.forEach((coin) => {
      if (coin.collected) {
        return;
      }
      const x = coin.x - state.cameraX;
      const y = coin.y + Math.sin(coin.bob) * 4;
      ctx.fillStyle = "#ffd84d";
      ctx.beginPath();
      ctx.arc(x, y, coin.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#be8f00";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#fff5ba";
      ctx.fillRect(x - 2, y - 5, 4, 10);
    });
  }

  function drawEnemies() {
    state.enemies.forEach((enemy) => {
      if (!enemy.alive) {
        return;
      }
      const x = enemy.x - state.cameraX;
      const y = enemy.y;
      ctx.fillStyle = "#7f4a22";
      ctx.beginPath();
      ctx.roundRect(x, y, enemy.w, enemy.h, 9);
      ctx.fill();

      ctx.fillStyle = "#f7e6d8";
      ctx.fillRect(x + 4, y + enemy.h - 9, enemy.w - 8, 7);

      ctx.fillStyle = "#fff";
      ctx.fillRect(x + 6, y + 8, 6, 6);
      ctx.fillRect(x + enemy.w - 12, y + 8, 6, 6);
      ctx.fillStyle = "#111";
      ctx.fillRect(x + 8, y + 10, 2, 2);
      ctx.fillRect(x + enemy.w - 10, y + 10, 2, 2);
    });
  }

  function drawGoal() {
    const poleX = state.finishX - 20 - state.cameraX;
    ctx.fillStyle = "#dedede";
    ctx.fillRect(poleX, 120, 6, 268);

    const wave = Math.sin(performance.now() * 0.008) * 5;
    ctx.fillStyle = "#ff3b3b";
    ctx.beginPath();
    ctx.moveTo(poleX + 6, 132);
    ctx.quadraticCurveTo(poleX + 36 + wave, 146, poleX + 6, 162);
    ctx.closePath();
    ctx.fill();
  }

  function drawPlayer() {
    const p = state.player;
    if (p.invincible > 0 && Math.floor(p.invincible * 25) % 2 === 0) {
      return;
    }

    const x = p.x - state.cameraX;
    const y = p.y;
    const runSwing = Math.sin(performance.now() * 0.02 + p.x * 0.03) * Math.min(1, Math.abs(p.vx) / PHYSICS.maxRunSpeed);

    ctx.fillStyle = "#e62f2f";
    ctx.beginPath();
    ctx.roundRect(x + 4, y, p.w - 8, 13, 4);
    ctx.fill();

    ctx.fillStyle = "#f4c39d";
    ctx.fillRect(x + 8, y + 8, p.w - 16, 9);

    ctx.fillStyle = "#2452c7";
    ctx.fillRect(x + 5, y + 14, p.w - 10, p.h - 14);
    ctx.fillStyle = "#ffe9d6";
    ctx.fillRect(x + 11, y + 20, p.w - 22, 12);

    ctx.fillStyle = "#2b1a10";
    ctx.fillRect(x + 5 + runSwing * 3, y + p.h - 8, 10, 8);
    ctx.fillRect(x + p.w - 15 - runSwing * 3, y + p.h - 8, 10, 8);
  }

  function drawParticles() {
    state.particles.forEach((particle) => {
      const alpha = 1 - particle.t / particle.life;
      ctx.fillStyle = `${particle.color}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`;
      ctx.fillRect(particle.x - state.cameraX, particle.y, particle.size, particle.size);
    });
  }

  function drawPauseOverlay() {
    if (state.running) {
      return;
    }
    ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 30px 'Trebuchet MS', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Super Mario JS", canvas.width / 2, canvas.height / 2 - 18);
    ctx.font = "600 18px 'Trebuchet MS', sans-serif";
    ctx.fillText("Carrega em Comecar para jogar", canvas.width / 2, canvas.height / 2 + 16);
  }

  function update(dt) {
    if (!state.running) {
      return;
    }

    updateMovingPlatforms(dt);
    updatePlayer(dt);
    updateCoins(dt);
    updateEnemies(dt);
    updateParticles(dt);
    updateCamera(dt);
    checkWin();
  }

  function draw() {
    drawBackground();
    drawGroundDecor();
    drawPlatforms();
    drawCoins();
    drawEnemies();
    drawGoal();
    drawPlayer();
    drawParticles();
    drawPauseOverlay();
  }

  function step(ts) {
    if (!state.lastTs) {
      state.lastTs = ts;
    }
    const dt = Math.min(0.033, (ts - state.lastTs) / 1000);
    state.lastTs = ts;

    update(dt);
    draw();
    state.rafId = window.requestAnimationFrame(step);
  }

  function onKeyDown(e) {
    if (e.code === "ArrowLeft" || e.code === "KeyA") {
      state.keys.left = true;
      e.preventDefault();
    }
    if (e.code === "ArrowRight" || e.code === "KeyD") {
      state.keys.right = true;
      e.preventDefault();
    }
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
      state.keys.jump = true;
      e.preventDefault();
    }
  }

  function onKeyUp(e) {
    if (e.code === "ArrowLeft" || e.code === "KeyA") {
      state.keys.left = false;
    }
    if (e.code === "ArrowRight" || e.code === "KeyD") {
      state.keys.right = false;
    }
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
      state.keys.jump = false;
    }
  }

  function bindHoldButton(btn, keyName) {
    const down = (e) => {
      e.preventDefault();
      state.keys[keyName] = true;
    };
    const up = (e) => {
      e.preventDefault();
      state.keys[keyName] = false;
    };

    btn.addEventListener("pointerdown", down);
    btn.addEventListener("pointerup", up);
    btn.addEventListener("pointercancel", up);
    btn.addEventListener("pointerleave", up);
    btn.addEventListener("touchend", up, { passive: false });

    state.touchCleanup.push(() => {
      btn.removeEventListener("pointerdown", down);
      btn.removeEventListener("pointerup", up);
      btn.removeEventListener("pointercancel", up);
      btn.removeEventListener("pointerleave", up);
      btn.removeEventListener("touchend", up);
    });
  }

  function resizeCanvas() {
    const cssWidth = canvas.clientWidth || 960;
    const ratio = 16 / 9;
    const targetWidth = Math.max(320, Math.min(1100, cssWidth));
    canvas.width = targetWidth;
    canvas.height = Math.round(targetWidth / ratio);
  }

  window.stopSuperMarioGame = function stopSuperMarioGame() {
    state.running = false;
    state.keys.left = false;
    state.keys.right = false;
    state.keys.jump = false;
    if (state.rafId) {
      window.cancelAnimationFrame(state.rafId);
      state.rafId = 0;
    }
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("resize", resizeCanvas);
    state.touchCleanup.forEach((fn) => fn());
    state.touchCleanup = [];
  };

  return function initSuperMarioGame() {
    window.stopSuperMarioGame();

    canvas = document.getElementById("mario-canvas");
    scoreEl = document.getElementById("mario-score");
    coinsEl = document.getElementById("mario-coins");
    livesEl = document.getElementById("mario-lives");
    statusEl = document.getElementById("mario-status");
    startBtn = document.getElementById("mario-start");
    resetBtn = document.getElementById("mario-reset");
    leftBtn = document.getElementById("mario-left");
    rightBtn = document.getElementById("mario-right");
    jumpBtn = document.getElementById("mario-jump");

    if (!canvas || !scoreEl || !coinsEl || !livesEl || !statusEl || !startBtn || !resetBtn || !leftBtn || !rightBtn || !jumpBtn) {
      return;
    }

    ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    if (!ctx.roundRect) {
      ctx.roundRect = function roundRect(x, y, w, h, r) {
        this.beginPath();
        this.moveTo(x + r, y);
        this.arcTo(x + w, y, x + w, y + h, r);
        this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y, r);
        this.arcTo(x, y, x + w, y, r);
        this.closePath();
      };
    }

    resizeCanvas();
    resetWorld();
    setStatus("Pronto");
    state.running = false;

    startBtn.onclick = () => {
      if (state.lives <= 0) {
        resetWorld();
      }
      state.running = true;
      setStatus("A jogar");
    };

    resetBtn.onclick = () => {
      resetWorld();
      state.running = true;
      setStatus("A jogar");
    };

    bindHoldButton(leftBtn, "left");
    bindHoldButton(rightBtn, "right");
    bindHoldButton(jumpBtn, "jump");

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    window.addEventListener("resize", resizeCanvas);

    state.rafId = window.requestAnimationFrame(step);
  };
})();
