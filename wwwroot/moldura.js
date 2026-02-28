window.initPhotoFrame = (function setupPhotoFrame() {
  const state = {
    stream: null,
    facingMode: "user"
  };

  function stopCurrentStream(video) {
    if (state.stream) {
      state.stream.getTracks().forEach((track) => track.stop());
      state.stream = null;
    }

    if (video) {
      video.srcObject = null;
    }
  }

  async function startCamera(video, statusEl, desiredFacingMode) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      statusEl.textContent = "Navegador sem suporte para camera.";
      return;
    }

    statusEl.textContent = "A pedir permissao da camera...";
    stopCurrentStream(video);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: desiredFacingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      video.srcObject = stream;
      await video.play();
      state.stream = stream;
      state.facingMode = desiredFacingMode;
      statusEl.textContent = desiredFacingMode === "environment" ? "Camera traseira ligada." : "Camera ligada.";
    } catch (error) {
      statusEl.textContent = "Nao foi possivel abrir a camera.";
      console.error("Falha ao iniciar camera:", error);
    }
  }

  window.stopPhotoFrame = function stopPhotoFrame() {
    const video = document.getElementById("photo-frame-video");
    stopCurrentStream(video);
  };

  return async function initPhotoFrame() {
    const video = document.getElementById("photo-frame-video");
    const overlay = document.getElementById("photo-frame-overlay");
    const canvas = document.getElementById("photo-canvas");
    const statusEl = document.getElementById("photo-status");
    const frameOptions = document.querySelectorAll(".photo-frame-option");
    const startBtn = document.getElementById("photo-start");
    const switchBtn = document.getElementById("photo-switch");
    const captureBtn = document.getElementById("photo-capture");
    const captureMobileBtn = document.getElementById("photo-capture-mobile");
    const stopBtn = document.getElementById("photo-stop");
    const resultImage = document.getElementById("photo-result-image");
    const downloadLink = document.getElementById("photo-download");

    if (!video || !overlay || !canvas || !statusEl || !frameOptions.length || !startBtn || !switchBtn || !captureBtn || !captureMobileBtn || !stopBtn || !resultImage || !downloadLink) {
      return;
    }

    resultImage.removeAttribute("src");
    downloadLink.classList.add("disabled");
    
    // Garantir que inicia sem moldura visivel se nao houver src
    if (!overlay.getAttribute("src")) {
        overlay.style.display = "none";
    }

    startBtn.onclick = async () => {
      await startCamera(video, statusEl, state.facingMode);
    };

    frameOptions.forEach((option) => {
      option.onclick = () => {
        const selectedSrc = option.getAttribute("data-frame-src");
        const selectedName = option.getAttribute("data-frame-name") || "Moldura";
        
        frameOptions.forEach((item) => item.classList.remove("selected"));
        option.classList.add("selected");

        if (!selectedSrc) {
          overlay.style.display = "none";
          overlay.src = "";
          statusEl.textContent = "Sem moldura selecionada.";
          return;
        }

        overlay.style.display = "block";
        overlay.src = selectedSrc;
        statusEl.textContent = `Moldura ${selectedName} selecionada.`;
      };
    });

    switchBtn.onclick = async () => {
      const nextFacingMode = state.facingMode === "user" ? "environment" : "user";
      await startCamera(video, statusEl, nextFacingMode);
    };

    const countdownEl = document.getElementById("photo-countdown");

    const capturePhoto = () => {
      const width = video.videoWidth || 0;
      const height = video.videoHeight || 0;

      if (!state.stream || width < 2 || height < 2) {
        statusEl.textContent = "Liga a camera antes de tirar foto.";
        return;
      }

      // If there is an overlay source, wait for it to load
      if (overlay.src && (!overlay.complete || overlay.naturalWidth < 2)) {
        statusEl.textContent = "A moldura ainda esta a carregar.";
        return;
      }

      let count = 5;
      countdownEl.textContent = count;
      countdownEl.classList.add("active");
      
      const timer = setInterval(() => {
        count--;
        if (count > 0) {
          countdownEl.textContent = count;
        } else {
          clearInterval(timer);
          countdownEl.classList.remove("active");
          performCapture();
        }
      }, 1000);

      function performCapture() {
        // Se houver moldura, usamos o tamanho natural dela como base para evitar distorção
        const hasOverlay = overlay.src && overlay.src !== window.location.href && overlay.style.display !== "none";
        
        const targetWidth = hasOverlay ? overlay.naturalWidth : width;
        const targetHeight = hasOverlay ? overlay.naturalHeight : height;

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          statusEl.textContent = "Falha ao criar imagem.";
          return;
        }

        ctx.clearRect(0, 0, targetWidth, targetHeight);
        
        // Lógica de "Cover" para o vídeo: desenhar o vídeo preenchendo o canvas sem esticar
        const videoAspect = width / height;
        const targetAspect = targetWidth / targetHeight;
        
        let drawWidth, drawHeight, offsetX, offsetY;
        
        if (videoAspect > targetAspect) {
          // Vídeo é mais largo que o alvo (ex: horizontal num alvo vertical)
          drawHeight = targetHeight;
          drawWidth = targetHeight * videoAspect;
          offsetX = (targetWidth - drawWidth) / 2;
          offsetY = 0;
        } else {
          // Vídeo é mais alto que o alvo (ex: vertical num alvo horizontal - comum em mobile)
          drawWidth = targetWidth;
          drawHeight = targetWidth / videoAspect;
          offsetX = 0;
          offsetY = (targetHeight - drawHeight) / 2;
        }

        ctx.save();
        // Aplicar o espelho (Flip horizontal)
        ctx.translate(targetWidth, 0);
        ctx.scale(-1, 1);
        
        // Desenhar o vídeo com o corte centralizado
        ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
        ctx.restore();

        // Desenhar a moldura por cima, ocupando todo o canvas
        if (hasOverlay) {
            ctx.drawImage(overlay, 0, 0, targetWidth, targetHeight);
        }

        const dataUrl = canvas.toDataURL("image/png");
        resultImage.src = dataUrl;
        downloadLink.href = dataUrl;
        downloadLink.classList.remove("disabled");
        statusEl.textContent = "Foto capturada!";
      }
    };

    captureBtn.onclick = capturePhoto;
    captureMobileBtn.onclick = capturePhoto;

    stopBtn.onclick = () => {
      stopCurrentStream(video);
      statusEl.textContent = "Camera parada.";
    };

    await startCamera(video, statusEl, state.facingMode);
  };
})();
