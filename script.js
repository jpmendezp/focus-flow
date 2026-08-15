(() => {
  const STORAGE_KEY = "focusflow_state_v1";
  const CIRCUMFERENCE = 2 * Math.PI * 100;

  const els = {
    modePill: document.getElementById("modePill"),
    ringProgress: document.getElementById("ringProgress"),
    time: document.getElementById("timeDisplay"),
    sessionLabel: document.getElementById("sessionLabel"),
    startBtn: document.getElementById("startBtn"),
    resetBtn: document.getElementById("resetBtn"),
    skipBtn: document.getElementById("skipBtn"),
    focusMinutes: document.getElementById("focusMinutes"),
    breakMinutes: document.getElementById("breakMinutes"),
    autoStart: document.getElementById("autoStart"),
    statToday: document.getElementById("statToday"),
    statTotal: document.getElementById("statTotal"),
    statStreak: document.getElementById("statStreak"),
    garden: document.getElementById("garden"),
    gardenEmpty: document.getElementById("gardenEmpty"),
    clearGardenBtn: document.getElementById("clearGardenBtn"),
  };

  const FLOWER_HUES = [350, 20, 45, 90, 200, 260, 320, 5];
  const FLOWER_TYPES = ["daisy", "tulip", "round"];

  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    const defaults = {
      focusMinutes: 25,
      breakMinutes: 5,
      autoStart: true,
      garden: [],
      totalSessions: 0,
      dailyCounts: {},
      streak: 0,
      lastStreakDate: null,
    };
    if (!raw) return defaults;
    try {
      return { ...defaults, ...JSON.parse(raw) };
    } catch {
      return defaults;
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  let state = loadState();

  let mode = "focus"; // 'focus' | 'break'
  let remaining = state.focusMinutes * 60;
  let total = remaining;
  let running = false;
  let tickId = null;

  function flowerSVG(type, hue) {
    const petal = `hsl(${hue}, 70%, 65%)`;
    const petalDark = `hsl(${hue}, 70%, 52%)`;
    const center = `hsl(${(hue + 40) % 360}, 80%, 60%)`;
    const stem = "#5a8a52";

    if (type === "daisy") {
      let petals = "";
      for (let i = 0; i < 8; i++) {
        const angle = (360 / 8) * i;
        petals += `<ellipse cx="22" cy="12" rx="4" ry="9" fill="${petal}" transform="rotate(${angle} 22 20)"/>`;
      }
      return `<svg viewBox="0 0 44 60" xmlns="http://www.w3.org/2000/svg">
        <line x1="22" y1="24" x2="22" y2="58" stroke="${stem}" stroke-width="3" stroke-linecap="round"/>
        <path d="M22 40 Q14 42 12 50" stroke="${stem}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        ${petals}
        <circle cx="22" cy="20" r="6" fill="${center}"/>
      </svg>`;
    }

    if (type === "tulip") {
      return `<svg viewBox="0 0 44 60" xmlns="http://www.w3.org/2000/svg">
        <line x1="22" y1="26" x2="22" y2="58" stroke="${stem}" stroke-width="3" stroke-linecap="round"/>
        <path d="M22 40 Q30 42 32 50" stroke="${stem}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <path d="M22 6 C14 6 12 16 14 26 C17 22 27 22 30 26 C32 16 30 6 22 6Z" fill="${petal}"/>
        <path d="M22 8 C18 10 17 18 18 24 C20 21 24 21 26 24 C27 18 26 10 22 8Z" fill="${petalDark}"/>
      </svg>`;
    }

    // round / peony
    let petals = "";
    for (let i = 0; i < 6; i++) {
      const angle = (360 / 6) * i;
      petals += `<circle cx="22" cy="13" r="7" fill="${petal}" transform="rotate(${angle} 22 20)"/>`;
    }
    return `<svg viewBox="0 0 44 60" xmlns="http://www.w3.org/2000/svg">
      <line x1="22" y1="24" x2="22" y2="58" stroke="${stem}" stroke-width="3" stroke-linecap="round"/>
      <path d="M22 38 Q14 40 12 48" stroke="${stem}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      ${petals}
      <circle cx="22" cy="20" r="6" fill="${center}"/>
    </svg>`;
  }

  function renderGarden() {
    els.garden.querySelectorAll(".flower").forEach((f) => f.remove());
    els.gardenEmpty.style.display = state.garden.length ? "none" : "flex";
    state.garden.forEach((f) => {
      const div = document.createElement("div");
      div.className = "flower";
      div.innerHTML = flowerSVG(f.type, f.hue);
      els.garden.appendChild(div);
    });
  }

  function plantFlower() {
    const type = FLOWER_TYPES[Math.floor(Math.random() * FLOWER_TYPES.length)];
    const hue = FLOWER_HUES[Math.floor(Math.random() * FLOWER_HUES.length)];
    state.garden.push({ type, hue });
    els.gardenEmpty.style.display = "none";
    const div = document.createElement("div");
    div.className = "flower";
    div.innerHTML = flowerSVG(type, hue);
    els.garden.appendChild(div);
    els.garden.scrollTop = els.garden.scrollHeight;
  }

  function recordCompletedSession() {
    const key = todayKey();
    state.dailyCounts[key] = (state.dailyCounts[key] || 0) + 1;
    state.totalSessions += 1;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

    if (state.lastStreakDate === key) {
      // already counted today
    } else if (state.lastStreakDate === yKey) {
      state.streak += 1;
      state.lastStreakDate = key;
    } else {
      state.streak = 1;
      state.lastStreakDate = key;
    }

    plantFlower();
    saveState();
    updateStats();
  }

  function updateStats() {
    els.statToday.textContent = state.dailyCounts[todayKey()] || 0;
    els.statTotal.textContent = state.garden.length;
    els.statStreak.textContent = state.streak;
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function updateRing() {
    const fraction = total > 0 ? remaining / total : 0;
    const offset = CIRCUMFERENCE * (1 - fraction);
    els.ringProgress.style.strokeDashoffset = offset;
  }

  function updateDisplay() {
    els.time.textContent = formatTime(remaining);
    updateRing();
    els.sessionLabel.textContent = mode === "focus" ? `Sesión ${state.totalSessions + 1}` : "Descanso";
    els.modePill.textContent = mode === "focus" ? "Enfoque" : "Descanso";
    els.modePill.classList.toggle("break", mode === "break");
    els.ringProgress.classList.toggle("break", mode === "break");
    els.startBtn.textContent = running ? "Pausar" : "Iniciar";
    document.title = `${formatTime(remaining)} · ${mode === "focus" ? "Enfoque" : "Descanso"} — Focus Flow`;
  }

  function setMode(newMode, autoRun) {
    mode = newMode;
    total = (mode === "focus" ? state.focusMinutes : state.breakMinutes) * 60;
    remaining = total;
    running = false;
    clearInterval(tickId);
    updateDisplay();
    if (autoRun) toggleTimer(true);
  }

  function tick() {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(tickId);
      running = false;
      const finishedMode = mode;
      if (finishedMode === "focus") {
        recordCompletedSession();
        setMode("break", state.autoStart);
      } else {
        setMode("focus", state.autoStart);
      }
      chime();
      return;
    }
    updateDisplay();
  }

  function toggleTimer(forceStart) {
    if (forceStart === false || (forceStart !== true && running)) {
      running = false;
      clearInterval(tickId);
      updateDisplay();
      return;
    }
    running = true;
    tickId = setInterval(tick, 1000);
    updateDisplay();
  }

  function chime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = 660;
      g.gain.setValueAtTime(0.15, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      o.start();
      o.stop(ctx.currentTime + 0.8);
    } catch {
      // audio not available, ignore
    }
  }

  els.startBtn.addEventListener("click", () => toggleTimer());
  els.resetBtn.addEventListener("click", () => setMode(mode, false));
  els.skipBtn.addEventListener("click", () => setMode(mode === "focus" ? "break" : "focus", false));

  els.focusMinutes.addEventListener("change", () => {
    let v = Math.max(1, Math.min(120, Number(els.focusMinutes.value) || 25));
    els.focusMinutes.value = v;
    state.focusMinutes = v;
    saveState();
    if (mode === "focus" && !running) setMode("focus", false);
  });

  els.breakMinutes.addEventListener("change", () => {
    let v = Math.max(1, Math.min(60, Number(els.breakMinutes.value) || 5));
    els.breakMinutes.value = v;
    state.breakMinutes = v;
    saveState();
    if (mode === "break" && !running) setMode("break", false);
  });

  els.autoStart.addEventListener("change", () => {
    state.autoStart = els.autoStart.checked;
    saveState();
  });

  els.clearGardenBtn.addEventListener("click", () => {
    if (!state.garden.length) return;
    if (confirm("¿Seguro que quieres limpiar tu jardín? Esto no borra tu racha ni el conteo total.")) {
      state.garden = [];
      saveState();
      renderGarden();
      updateStats();
    }
  });

  function init() {
    els.focusMinutes.value = state.focusMinutes;
    els.breakMinutes.value = state.breakMinutes;
    els.autoStart.checked = state.autoStart;
    total = state.focusMinutes * 60;
    remaining = total;
    renderGarden();
    updateStats();
    updateDisplay();
  }

  init();
})();
