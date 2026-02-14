const audio = document.getElementById("sound");
let isAudioPlaying = false;

function tryPlayAudio() {
  if (!isAudioPlaying && audio) {
    audio.currentTime = 0;
    audio.play().then(() => {
      isAudioPlaying = true;
      console.log("Music started");
    }).catch((err) => {
      console.warn("Music play failed:", err);
    });
  }
}

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const stars = [];
const explosions = [];
const shootingStars = [];

// ===== CAMERA ZOOM (fullscreen mobile) + SAFE AREA =====
let camScale = 1;
let camOffX = 0;
let camOffY = 0;

function isFullscreenNow() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
}

function getSafeInsets() {
  const s = getComputedStyle(document.documentElement);
  const px = (v) => parseFloat(String(v).replace("px", "")) || 0;
  return {
    top: px(s.getPropertyValue("--sat")),
    right: px(s.getPropertyValue("--sar")),
    bottom: px(s.getPropertyValue("--sab")),
    left: px(s.getPropertyValue("--sal")),
  };
}

function screenToWorld(pageX, pageY) {
  return {
    x: (pageX - camOffX) / camScale,
    y: (pageY - camOffY) / camScale,
  };
}

function updateCamera() {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const fs = isFullscreenNow();
  const inset = getSafeInsets();
  const pad = 28; // tăng = zoom xa hơn

  if (isMobile && fs) {
    const safeW = window.innerWidth - inset.left - inset.right - pad * 2;
    const safeH = window.innerHeight - inset.top - inset.bottom - pad * 2;

    camScale = Math.min(1, safeW / window.innerWidth, safeH / window.innerHeight);
    camOffX = inset.left + pad;
    camOffY = inset.top + pad;
  } else {
    camScale = 1;
    camOffX = 0;
    camOffY = 0;
  }
}

// Helper to split text into lines of N words
function splitLines(text, wordsPerLine) {
  const words = text.split(" ");
  const lines = [];
  for (let i = 0; i < words.length; i += wordsPerLine) {
    lines.push(words.slice(i, i + wordsPerLine).join(" "));
  }
  return lines;
}

const fullText1 = splitLines("chúc mừng ngày valentine 14/2 nhen (món quà nho nhỏ)", 3);
const fullText2 = splitLines("một ngày tràn ngập ấm áp và iuuu thươngg", 3);
const fullText3 = splitLines("cảm ơn Hưng vì tất cả. Iuuuuuu Hưng nhiều", 3);
const allTexts = [fullText1, fullText2, fullText3];

const fontSize = 100;
const fontFamily = "Arial";
const lineHeight = 120;
const bearX = 70;

let dots = [];
let targetDotsQueue = [];
let currentCharIndex = 0;
let animationDone = false;
let currentTextIndex = 0;
let isScrolling = false;

// Cache heart
let bgGradient;
const heartCache = document.createElement('canvas');
const heartCtx = heartCache.getContext('2d');
heartCache.width = 20;
heartCache.height = 20;

function initHeartCache() {
  heartCtx.clearRect(0, 0, heartCache.width, heartCache.height);
  heartCtx.font = "16px Arial";
  heartCtx.textAlign = "center";
  heartCtx.textBaseline = "middle";
  heartCtx.fillText("❤️", heartCache.width / 2, heartCache.height / 2);
}
initHeartCache();

// Mouse interaction
const mouse = { x: null, y: null, radius: 100 };

window.addEventListener('mousemove', (event) => {
  const pageX = event.clientX + window.scrollX;
  const pageY = event.clientY + window.scrollY;
  const w = screenToWorld(pageX, pageY);
  mouse.x = w.x;
  mouse.y = w.y;
});

window.addEventListener('touchmove', (event) => {
  if (event.touches.length > 0) {
    const t = event.touches[0];
    const pageX = t.clientX + window.scrollX;
    const pageY = t.clientY + window.scrollY;
    const w = screenToWorld(pageX, pageY);
    mouse.x = w.x;
    mouse.y = w.y;
  }
}, { passive: true });

window.addEventListener('mouseout', () => {
  mouse.x = null;
  mouse.y = null;
});

window.addEventListener('touchend', () => {
  mouse.x = null;
  mouse.y = null;
});

function checkOrientation() {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isPortrait = window.innerHeight > window.innerWidth;

  const notice = document.getElementById("rotateNotice");
  if (isMobile && isPortrait) {
    notice.style.display = "block";
    canvas.style.display = "none";
    document.getElementById("bear").style.display = "none";
  } else {
    notice.style.display = "none";
    canvas.style.display = "block";
    document.getElementById("bear").style.display = "block";
  }
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight * allTexts.length;

  bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bgGradient.addColorStop(0, "#0a001f");
  bgGradient.addColorStop(1, "#1a0033");

  stars.length = 0;
  for (let i = 0; i < 300 * allTexts.length; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 1.5 + 0.5,
      alpha: Math.random(),
      delta: (Math.random() * 0.02) + 0.005
    });
  }

  checkOrientation();
  updateCamera(); // <<< IMPORTANT

  targetDotsQueue = [];
  currentCharIndex = 0;
  dots = [];
  animationDone = false;
  currentTextIndex = 0;
  window.scrollTo(0, 0);
  generateAllTargetDots();
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function createExplosion(x, y) {
  const count = 20;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 6 + 2;
    explosions.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 60,
      opacity: 1
    });
  }
}

function drawStars() {
  for (let star of stars) {
    star.alpha += star.delta;
    if (star.alpha >= 1 || star.alpha <= 0) {
      star.delta = -star.delta;
    }

    ctx.save();
    ctx.globalAlpha = star.alpha;
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function createShootingStar() {
  const startX = Math.random() * canvas.width;
  const startY = Math.random() * canvas.height / 2;
  shootingStars.push({
    x: startX,
    y: startY,
    length: Math.random() * 300 + 100,
    speed: Math.random() * 10 + 6,
    angle: Math.PI / 4,
    opacity: 1
  });
}

function drawShootingStars() {
  for (let i = shootingStars.length - 1; i >= 0; i--) {
    const s = shootingStars[i];
    const endX = s.x - Math.cos(s.angle) * s.length;
    const endY = s.y - Math.sin(s.angle) * s.length;

    const gradient = ctx.createLinearGradient(s.x, s.y, endX, endY);
    gradient.addColorStop(0, `rgba(255, 255, 255, ${s.opacity})`);
    gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    s.x += Math.cos(s.angle) * s.speed;
    s.y += Math.sin(s.angle) * s.speed;
    s.opacity -= 0.01;

    if (s.opacity <= 0) {
      shootingStars.splice(i, 1);
    }
  }
}

function generateCharDots(char, x, y) {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tempCtx = tempCanvas.getContext('2d');

  tempCtx.font = `bold ${fontSize}px ${fontFamily}`;
  tempCtx.fillStyle = "red";
  tempCtx.textAlign = "left";
  tempCtx.fillText(char, x, y);

  const imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height).data;
  const charDots = [];

  for (let yy = 0; yy < canvas.height; yy += 4) {
    for (let xx = 0; xx < canvas.width; xx += 4) {
      const index = (yy * canvas.width + xx) * 4;
      if (imageData[index + 3] > 128) {
        charDots.push({ x: xx, y: yy });
      }
    }
  }

  return charDots;
}

function generateAllTargetDots() {
  const tempCtx = document.createElement('canvas').getContext('2d');
  tempCtx.font = `bold ${fontSize}px ${fontFamily}`;
  const lines = allTexts[currentTextIndex];

  const sectionTop = currentTextIndex * window.innerHeight;
  const startY = sectionTop + (window.innerHeight - lines.length * lineHeight) / 2;

  targetDotsQueue = [];

  lines.forEach((line, lineIndex) => {
    const lineWidth = tempCtx.measureText(line).width;
    let xCursor = (canvas.width - lineWidth) / 2;
    const y = startY + lineIndex * lineHeight;

    for (let char of line) {
      if (char === " ") {
        xCursor += tempCtx.measureText(" ").width;
        targetDotsQueue.push([]);
        continue;
      }

      const charDots = generateCharDots(char, xCursor, y);
      targetDotsQueue.push(charDots);
      xCursor += tempCtx.measureText(char).width;
    }
  });
}

function shootDot() {
  if (animationDone || isScrolling) return;

  while (
    currentCharIndex < targetDotsQueue.length &&
    targetDotsQueue[currentCharIndex].length === 0
  ) {
    currentCharIndex++;
  }

  const targetDots = targetDotsQueue[currentCharIndex];
  if (!targetDots || targetDots.length === 0) return;

  const dynamicBearY = window.scrollY + window.innerHeight - 80;

  const batch = 5;
  for (let i = 0; i < batch; i++) {
    const target = targetDots.shift();
    if (!target) return;

    const angle = Math.random() * Math.PI / 6 - Math.PI / 12;
    const speed = 3 + Math.random() * 2;

    dots.push({
      x: bearX + 40 + Math.random() * 20,
      y: dynamicBearY - 20 + Math.random() * 10,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      targetX: target.x,
      targetY: target.y
    });
  }

  if (targetDots.length === 0 && currentCharIndex < targetDotsQueue.length - 1) {
    currentCharIndex++;
  }
}

function animate() {
  // apply camera transform (zoom-out + safe padding)
  ctx.setTransform(camScale, 0, 0, camScale, camOffX, camOffY);

  ctx.fillStyle = bgGradient;
  ctx.fillRect(-camOffX / camScale, -camOffY / camScale, canvas.width / camScale, canvas.height / camScale);

  drawStars();
  drawShootingStars();

  dots.forEach(dot => {
    const dx = dot.targetX - dot.x;
    const dy = dot.targetY - dot.y;
    dot.vx += dx * 0.002;
    dot.vy += dy * 0.002;
    dot.vx *= 0.95;
    dot.vy *= 0.91;

    if (mouse.x != null) {
      const dxMouse = dot.x - mouse.x;
      const dyMouse = dot.y - mouse.y;
      const distance = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

      if (distance < mouse.radius) {
        const forceDirectionX = dxMouse / distance;
        const forceDirectionY = dyMouse / distance;
        const force = (mouse.radius - distance) / mouse.radius;

        dot.vx += forceDirectionX * force * 5;
        dot.vy += forceDirectionY * force * 5;
      }
    }

    dot.x += dot.vx;
    dot.y += dot.vy;

    ctx.drawImage(heartCache, dot.x - 10, dot.y - 10);
  });

  for (let i = explosions.length - 1; i >= 0; i--) {
    const p = explosions[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.96;
    p.vy *= 0.96;
    p.life--;
    p.opacity -= 0.015;

    ctx.globalAlpha = Math.max(p.opacity, 0);
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    if (p.life <= 0 || p.opacity <= 0) {
      explosions.splice(i, 1);
    }
  }

  if (
    !animationDone &&
    currentCharIndex >= targetDotsQueue.length &&
    dots.every(dot => Math.abs(dot.targetX - dot.x) < 2 && Math.abs(dot.targetY - dot.y) < 2)
  ) {
    animationDone = true;

    setTimeout(() => {
      currentTextIndex++;
      if (currentTextIndex < allTexts.length) {
        isScrolling = true;

        window.scrollTo({
          top: currentTextIndex * window.innerHeight,
          behavior: 'smooth'
        });

        setTimeout(() => {
          targetDotsQueue = [];
          currentCharIndex = 0;
          animationDone = false;
          generateAllTargetDots();
          isScrolling = false;
        }, 800);
      } else {
        document.body.style.overflow = "auto";
        document.documentElement.style.overflow = "auto";

        const bear = document.getElementById("bear");
        if (bear.src !== "https://i.pinimg.com/originals/cf/e2/66/cfe2664925719a18a078c8c1b7552b9d.gif") {
          bear.src = "https://i.pinimg.com/originals/7e/f6/9c/7ef69cd0a6b0b78526c8ce983b3296fc.gif";
        }
      }
    }, 1000);
  }

  requestAnimationFrame(animate);
}

// Explosion click/touch corrected for camera
canvas.addEventListener("click", (e) => {
  const pageX = e.clientX + window.scrollX;
  const pageY = e.clientY + window.scrollY;
  const w = screenToWorld(pageX, pageY);
  createExplosion(w.x, w.y);
});

canvas.addEventListener("touchstart", (e) => {
  const touch = e.touches[0];
  if (touch) {
    const pageX = touch.clientX + window.scrollX;
    const pageY = touch.clientY + window.scrollY;
    const w = screenToWorld(pageX, pageY);
    createExplosion(w.x, w.y);
  }
}, { passive: true });

// --- Game State & Initialization ---
let gameStarted = false;
let shootInterval;
let starInterval;

function startShow() {
  if (gameStarted) return;
  gameStarted = true;

  document.getElementById("canvas").style.display = "block";
  const bearBtn = document.getElementById("bear");
  bearBtn.style.display = "block";

  void bearBtn.offsetWidth;
  bearBtn.style.opacity = 1;

  resizeCanvas();

  shootInterval = setInterval(shootDot, 30);
  starInterval = setInterval(createShootingStar, 1500);
  animate();
}

// Gift Box Interaction
const giftBox = document.getElementById("giftBox");
const giftOverlay = document.getElementById("giftOverlay");

giftBox.addEventListener("click", () => {
  if (document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen();
  } else if (document.documentElement.webkitRequestFullscreen) {
    document.documentElement.webkitRequestFullscreen();
  } else if (document.documentElement.msRequestFullscreen) {
    document.documentElement.msRequestFullscreen();
  }

  const rect = giftBox.getBoundingClientRect();
  tryPlayAudio();

  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  for (let i = 0; i < 10; i++) {
    setTimeout(() => {
      const pageX = centerX + (Math.random() - 0.5) * 50;
      const pageY = centerY + (Math.random() - 0.5) * 50;
      const w = screenToWorld(pageX + window.scrollX, pageY + window.scrollY);
      createExplosion(w.x, w.y);
    }, i * 50);
  }

  giftBox.style.transition = "transform 1s ease, opacity 1s ease";
  giftBox.style.transform = "scale(1.5)";
  giftBox.style.opacity = "0";

  giftOverlay.style.transition = "opacity 1.5s ease-out";
  giftOverlay.style.opacity = "0";

  setTimeout(() => {
    giftOverlay.style.display = "none";
    startShow();
  }, 1000);
});

// keep camera updated
["fullscreenchange", "webkitfullscreenchange", "msfullscreenchange", "orientationchange"].forEach(ev => {
  window.addEventListener(ev, () => {
    updateCamera();
    resizeCanvas();
  });
});
