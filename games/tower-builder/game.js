/*
  Tower Builder — times tables practice with four modes:
    📘 Practice         one table, no timer, blocks never fall off
    🧱 Tower challenge  mixed tables; every 3rd wrong answer knocks the top block off
    ⏱️ Beat the clock   mixed tables; build as tall as you can in 60 seconds
    🗺️ Mastery map      12×12 grid of every question: grey → yellow → green
  Right answer = a new block drops onto the tower.
  Wrong answer = the tower wobbles and the right answer is shown.
  Game logic is described in README.md.
*/
(function () {
  "use strict";

  const STORE_KEY = "kgz.towerBuilder";
  const MAX_TROUBLE = 8;          // how "tricky" a fact can get
  const RETRY_AFTER = 3;          // a missed fact comes back after this many questions
  const COLORS = 6;               // block color classes c0…c5
  const OOPS_LIMIT = 3;           // wrong answers (at any time) that knock off the top block (challenge only)
  const START_TABLES = [6, 7, 8, 9];   // always pre-selected when the game opens
  const CLOCK_SECONDS = 60;
  const MASTERED = 3;             // right this many times in a row = green on the mastery map
  const HEADROOM = 3;             // blocks of sky kept above the tower (room for the next block to drop)

  // Block styles, unlocked by the highscore (best tower in Tower challenge or Beat the clock).
  // need = the highscore that unlocks it (owner's list: stone at 20, brick at 40, then "more than" 50/70/90/100).
  const STYLES = [
    { id: "wood",   name: "Wood",   emoji: "🪵", need: 0,   rule: "Ready to use" },
    { id: "stone",  name: "Stone",  emoji: "🪨", need: 20,  rule: "Best tower 20" },
    { id: "brick",  name: "Brick",  emoji: "🧱", need: 40,  rule: "Best tower 40" },
    { id: "ice",    name: "Ice",    emoji: "🧊", need: 51,  rule: "Best over 50" },
    { id: "silver", name: "Silver", emoji: "🥈", need: 71,  rule: "Best over 70" },
    { id: "gold",   name: "Gold",   emoji: "🥇", need: 91,  rule: "Best over 90" },
    { id: "lego",   name: "Lego",   emoji: "🟥", need: 101, rule: "Best over 100" }
  ];
  // Worlds: the sky changes with height (in blocks). Reaching one the first time unlocks it.
  const ZONES = [
    { id: "ground", name: "Ground", emoji: "🌱", at: 0,  to: 10,       reach: "" },
    { id: "sky",    name: "Sky",    emoji: "☁️", at: 10, to: 25,       reach: "☁️ You're up in the sky!" },
    { id: "planes", name: "Planes", emoji: "✈️", at: 25, to: 40,       reach: "✈️ You're flying with the planes!" },
    { id: "space",  name: "Space",  emoji: "🚀", at: 40, to: Infinity, reach: "🚀 You reached SPACE!" }
  ];

  // Per-mode rules
  const KINDS = {
    practice: {
      name: "Practice", emoji: "📘", start: "📘 Start practice",
      hint: "Pick one times table and learn it calmly. No timer, and blocks never fall off.",
      rightDelay: 900, wrongDelay: 2400
    },
    challenge: {
      name: "Tower challenge", emoji: "🧱", start: "🧱 Start a new tower!",
      hint: "Questions mixed from your tables. Every 3 wrong answers knock the top block off!",
      rightDelay: 900, wrongDelay: 2200
    },
    clock: {
      name: "Beat the clock", emoji: "⏱️", start: "⏱️ Start the clock!",
      hint: "How tall can you build in 60 seconds? Answer fast — wrong answers just cost time.",
      rightDelay: 350, wrongDelay: 1300
    }
  };

  const $ = (id) => document.getElementById(id);

  // ---------------- Saved data ----------------
  function defaults() {
    return {
      best: 0,                    // tallest tower in Tower challenge
      clockBest: 0,               // tallest tower in Beat the clock
      kind: "challenge",          // last game mode played
      tables: START_TABLES.slice(),
      practiceTable: START_TABLES[0],
      mode: "choice",             // answer style: "choice" or "pad"
      blockStyle: "wood",         // chosen block style (must be unlocked)
      zoneMax: 0,                 // highest world reached (index in ZONES)
      facts: {},                  // "7x8": { right, wrong, trouble, streak }
      totals: { right: 0, wrong: 0, games: 0 },
      current: null               // unfinished Tower challenge: { blocks: [...], tables, mode, oops }
    };
  }
  const validTable = (n) => Number.isInteger(n) && n >= 1 && n <= 12;
  function load() {
    const d = defaults();
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
      if (raw && typeof raw === "object") {
        if (Number.isFinite(raw.best)) d.best = Math.max(0, Math.floor(raw.best));
        if (Number.isFinite(raw.clockBest)) d.clockBest = Math.max(0, Math.floor(raw.clockBest));
        if (KINDS[raw.kind]) d.kind = raw.kind;
        if (raw.muted === true) d.oldMuted = true;   // from the old in-game mute button
        if (Array.isArray(raw.tables)) {
          const t = raw.tables.map(Number).filter(validTable);
          if (t.length) d.tables = Array.from(new Set(t)).sort((a, b) => a - b);
        }
        if (validTable(Number(raw.practiceTable))) d.practiceTable = Number(raw.practiceTable);
        if (raw.mode === "pad" || raw.mode === "choice") d.mode = raw.mode;
        if (STYLES.some((x) => x.id === raw.blockStyle)) d.blockStyle = raw.blockStyle;
        const z = Number(raw.zoneMax);
        if (Number.isInteger(z) && z >= 0 && z < ZONES.length) d.zoneMax = z;
        if (raw.facts && typeof raw.facts === "object") d.facts = raw.facts;
        if (raw.totals && typeof raw.totals === "object") Object.assign(d.totals, raw.totals);
        if (raw.current && Array.isArray(raw.current.blocks)) {
          d.current = raw.current;
          const o = Number(raw.current.oops);
          d.current.oops = Number.isInteger(o) && o > 0 && o < OOPS_LIMIT ? o : 0;
        }
      }
    } catch (e) { /* storage blocked or bad JSON: start fresh */ }
    return d;
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) { /* storage blocked */ }
  }
  const data = load();

  // ---------------- Unlocks ----------------
  const highscore = () => Math.max(data.best, data.clockBest);
  const styleById = (id) => STYLES.find((x) => x.id === id) || STYLES[0];
  const styleUnlocked = (st, hs) => (hs === undefined ? highscore() : hs) >= st.need;
  function currentStyle() {
    const st = styleById(data.blockStyle);
    return styleUnlocked(st) ? st.id : "wood";
  }
  function zoneIndex(height) {
    let i = 0;
    ZONES.forEach((z, n) => { if (height >= z.at) i = n; });
    return i;
  }

  // ---------------- Sound (Web Audio) ----------------
  // One site-wide on/off switch on the landing page (assets/sound.js).
  let audio = null;
  function ctx() {
    if (window.SiteSound && SiteSound.isMuted()) return null;
    try {
      if (!audio) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        audio = new AC();
      }
      if (audio.state === "suspended") audio.resume();
      return audio;
    } catch (e) { return null; }
  }
  function tone(freq, dur, opts) {
    const ac = ctx();
    if (!ac) return;
    const o = opts || {};
    const t0 = ac.currentTime + (o.delay || 0);
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(freq, t0);
    if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, t0 + dur);
    const vol = o.vol || 0.2;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }
  const sfx = {
    tap() { tone(880, 0.05, { vol: 0.06 }); },
    right() { tone(660, 0.12, { vol: 0.18 }); tone(990, 0.18, { vol: 0.18, delay: 0.1 }); },
    land() { tone(170, 0.16, { type: "triangle", vol: 0.35, slideTo: 70 }); },
    wrong() { tone(240, 0.32, { type: "square", vol: 0.07, slideTo: 150 }); },
    fall() { tone(500, 0.7, { type: "sawtooth", vol: 0.07, slideTo: 90 }); },
    best() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, { vol: 0.15, delay: i * 0.11 })); },
    tick() { tone(1200, 0.05, { type: "square", vol: 0.05 }); },
    timeUp() { [784, 659, 523].forEach((f, i) => tone(f, 0.25, { type: "triangle", vol: 0.2, delay: i * 0.15 })); }
  };

  // ---------------- Facts and question picking ----------------
  const key = (t, n) => t + "x" + n;
  function factInfo(k) {
    if (!data.facts[k] || typeof data.facts[k] !== "object") data.facts[k] = { right: 0, wrong: 0, trouble: 0, streak: 0 };
    return data.facts[k];
  }
  function trouble(k) {
    const f = data.facts[k];
    return f && Number.isFinite(f.trouble) ? f.trouble : 0;
  }
  // Right answers in a row for a fact. Older saves have no streak: count them as learning if they had no trouble.
  function streak(k) {
    const f = data.facts[k];
    if (!f) return 0;
    if (Number.isFinite(f.streak)) return f.streak;
    return (f.trouble || 0) === 0 ? Math.min(f.right || 0, MASTERED - 1) : 0;
  }
  // Mastery level for the map: 0 = grey (not yet), 1 = yellow (learning), 2 = green (mastered)
  function level(k) {
    const s = streak(k);
    return s >= MASTERED ? 2 : s >= 1 ? 1 : 0;
  }

  let game = null;   // state of the game being played

  function buildPool(tables) {
    const pool = [];
    tables.forEach((t) => { for (let n = 1; n <= 12; n++) pool.push({ t: t, n: n, k: key(t, n) }); });
    return pool;
  }

  // Weighted random pick: tricky facts (higher "trouble") are picked more often.
  // A fact missed in this game comes back after RETRY_AFTER questions.
  function pickFact() {
    const due = game.retry.findIndex((r) => r.due <= game.asked);
    if (due >= 0) {
      const r = game.retry.splice(due, 1)[0];
      if (r.k !== game.lastKey || game.pool.length === 1) return game.pool.find((p) => p.k === r.k);
    }
    const options = game.pool.length > 1 ? game.pool.filter((p) => p.k !== game.lastKey) : game.pool;
    const weights = options.map((p) => 1 + trouble(p.k) * 1.5);
    let roll = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < options.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return options[i];
    }
    return options[options.length - 1];
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Wrong answers that look like real mistakes (neighbouring facts, off by one, etc.)
  function makeChoices(a, b) {
    const c = a * b;
    const near = [(a + 1) * b, (a - 1) * b, a * (b + 1), a * (b - 1), c + 1, c - 1, c + 2, c - 2, c + 10, c - 10, a + b];
    const set = new Set();
    shuffle(near).forEach((x) => { if (x > 0 && x !== c && set.size < 3) set.add(x); });
    while (set.size < 3) {
      const x = Math.max(1, c + Math.floor(Math.random() * 21) - 10);
      if (x !== c) set.add(x);
    }
    return shuffle([c].concat(Array.from(set)));
  }

  // ---------------- Screens ----------------
  function show(id) {
    ["menu", "map", "game", "end"].forEach((s) => $(s).classList.toggle("hidden", s !== id));
    $("finishBtn").classList.toggle("hidden", id !== "game");
    window.scrollTo(0, 0);
  }

  // ---------------- Menu ----------------
  let pickKind = data.kind;
  let pickTables = new Set(START_TABLES);   // the menu always opens with 6–9 picked
  let pickOne = START_TABLES[0];            // Practice uses one table (6 when the page opens)
  let pickMode = data.mode;

  function renderMenu() {
    const name = window.PlayerName ? PlayerName.get() : "";
    $("hello").textContent = name ? "Hi " + name + ", let's build!" : "Let's build a tower!";

    const k = KINDS[pickKind];
    document.querySelectorAll(".kind[data-kind]").forEach((b) => b.setAttribute("aria-checked", b.dataset.kind === pickKind ? "true" : "false"));
    $("kindHint").textContent = k.hint;
    $("startBtn").textContent = k.start;

    const single = pickKind === "practice";
    $("tablesTitle").textContent = single ? "Which times table?" : "Which times tables?";
    $("tableActions").classList.toggle("hidden", single);
    $("tables").setAttribute("role", single ? "radiogroup" : "group");

    const box = $("tables");
    box.innerHTML = "";
    for (let t = 1; t <= 12; t++) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "table-btn";
      b.textContent = "×" + t;
      b.setAttribute("aria-label", t + " times table");
      const on = single ? pickOne === t : pickTables.has(t);
      b.setAttribute(single ? "aria-checked" : "aria-pressed", on ? "true" : "false");
      if (single) b.setAttribute("role", "radio");
      b.addEventListener("click", () => {
        sfx.tap();
        if (single) pickOne = t;
        else if (pickTables.has(t)) pickTables.delete(t);
        else pickTables.add(t);
        $("pickWarn").classList.add("hidden");
        renderMenu();
        const again = $("tables").children[t - 1];
        if (again) again.focus();
      });
      box.appendChild(b);
    }
    document.querySelectorAll(".mode").forEach((m) => m.setAttribute("aria-checked", m.dataset.mode === pickMode ? "true" : "false"));

    renderStyles();
    renderWorlds();

    const stats = $("menuStats");
    stats.innerHTML = "";
    const answered = data.totals.right + data.totals.wrong;
    let mastered = 0;
    for (let r = 1; r <= 12; r++) for (let c = 1; c <= 12; c++) if (level(key(r, c)) === 2) mastered++;
    [
      [data.best, "🧱 Best tower"],
      [data.clockBest, "⏱️ Best in 60 s"],
      [answered ? Math.round((data.totals.right / answered) * 100) + "%" : "–", "🎯 Accuracy"],
      [mastered + " / 144", "🗺️ Mastered"]
    ].forEach(([v, label]) => stats.appendChild(statEl(v, label)));

    const tricky = Object.keys(data.facts)
      .filter((x) => trouble(x) > 0)
      .sort((x, y) => trouble(y) - trouble(x))
      .slice(0, 8);
    $("trickyBox").classList.toggle("hidden", tricky.length === 0);
    fillChips($("trickyList"), tricky);

    // "Keep building" continues an unfinished Tower challenge
    const cur = data.current;
    const cont = $("continueBtn");
    if (pickKind === "challenge" && cur && cur.blocks.length) {
      cont.textContent = "▶️ Keep building (" + cur.blocks.length + ")";
      cont.classList.remove("hidden");
    } else {
      cont.classList.add("hidden");
    }
  }

  function previewBlock(styleId) {
    const wrap = document.createElement("span");
    wrap.className = "preview";
    wrap.dataset.style = styleId;
    wrap.setAttribute("aria-hidden", "true");
    const b = document.createElement("span");
    b.className = "block c0";
    b.textContent = "56";
    wrap.appendChild(b);
    return wrap;
  }

  function renderStyles() {
    const grid = $("styleGrid");
    grid.innerHTML = "";
    const chosen = currentStyle();
    STYLES.forEach((st) => {
      const open = styleUnlocked(st);
      const b = document.createElement("button");
      b.type = "button";
      b.className = "style-tile" + (open ? "" : " locked");
      b.setAttribute("aria-pressed", String(st.id === chosen));
      if (!open) b.setAttribute("aria-disabled", "true");
      b.setAttribute("aria-label", st.name + (open ? "" : ", locked: " + st.rule));
      const name = document.createElement("span");
      name.textContent = (open ? "" : "🔒 ") + st.name;
      const rule = document.createElement("small");
      rule.textContent = open ? (st.id === chosen ? "✓ Chosen" : "Tap to use") : st.rule;
      b.append(previewBlock(st.id), name, rule);
      b.addEventListener("click", () => {
        sfx.tap();
        if (!open) {
          $("styleMsg").textContent = "🔒 " + st.name + " unlocks when your best tower (Tower challenge or Beat the clock) is " +
            (st.rule.indexOf("over") >= 0 ? "more than " + (st.need - 1) : st.need) + " blocks. Your best is " + highscore() + ".";
          return;
        }
        data.blockStyle = st.id;
        save();
        $("styleMsg").textContent = st.emoji + " " + st.name + " blocks chosen!";
        renderStyles();
        const again = Array.from($("styleGrid").children)[STYLES.indexOf(st)];
        if (again) again.focus();
      });
      grid.appendChild(b);
    });
  }

  function renderWorlds() {
    const box = $("worlds");
    box.innerHTML = "";
    ZONES.forEach((z, i) => {
      const c = document.createElement("span");
      const open = i <= data.zoneMax;
      c.className = "world-chip" + (open ? "" : " locked");
      c.textContent = open ? z.emoji + " " + z.name + " ✓" : "🔒 " + z.name + " (" + z.at + " blocks)";
      box.appendChild(c);
    });
  }

  function statEl(value, label) {
    const d = document.createElement("div");
    d.className = "stat";
    const b = document.createElement("b");
    b.textContent = value;
    const s = document.createElement("span");
    s.textContent = label;
    d.append(b, s);
    return d;
  }
  function fillChips(el, keys) {
    el.innerHTML = "";
    keys.forEach((k) => {
      const [t, n] = k.split("x").map(Number);
      const c = document.createElement("span");
      c.className = "chip";
      c.textContent = t + " × " + n + " = " + t * n;
      el.appendChild(c);
    });
  }

  // ---------------- Mastery map ----------------
  const LEVEL_NAMES = ["Not yet", "Learning", "Mastered"];

  function renderMap() {
    const grid = $("mapGrid");
    grid.innerHTML = "";
    const counts = [0, 0, 0];

    const corner = document.createElement("div");
    corner.className = "map-head corner";
    corner.textContent = "×";
    corner.setAttribute("aria-hidden", "true");
    grid.appendChild(corner);
    for (let c = 1; c <= 12; c++) {
      const h = document.createElement("div");
      h.className = "map-head";
      h.textContent = c;
      h.setAttribute("aria-hidden", "true");
      grid.appendChild(h);
    }
    for (let r = 1; r <= 12; r++) {
      const rh = document.createElement("button");
      rh.type = "button";
      rh.className = "map-head row";
      rh.textContent = r;
      rh.setAttribute("aria-label", "Practise the " + r + " times table");
      rh.addEventListener("click", () => {
        sfx.tap();
        pickKind = "practice";
        pickOne = r;
        startGame(false);
      });
      grid.appendChild(rh);
      for (let c = 1; c <= 12; c++) {
        const k = key(r, c);
        const lv = level(k);
        counts[lv]++;
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "map-cell l" + lv;
        cell.textContent = r * c;
        cell.setAttribute("aria-label", r + " times " + c + " equals " + r * c + ": " + LEVEL_NAMES[lv]);
        cell.addEventListener("click", () => showCell(r, c, cell));
        grid.appendChild(cell);
      }
    }

    const box = $("mapCounts");
    box.innerHTML = "";
    [["l2", "🟩", counts[2], "Mastered"], ["l1", "🟨", counts[1], "Learning"], ["l0", "⬜", counts[0], "Not yet"]].forEach(([cls, , n, label]) => {
      const d = document.createElement("div");
      d.className = "map-count";
      const sw = document.createElement("span");
      sw.className = "swatch map-cell " + cls;
      sw.setAttribute("aria-hidden", "true");
      const t = document.createElement("span");
      t.textContent = n + " " + label;
      d.append(sw, t);
      box.appendChild(d);
    });
    $("mapDetail").textContent = "Tap a square to see how it's going. Tap a row number to practise that table.";
  }

  function showCell(r, c, cell) {
    sfx.tap();
    document.querySelectorAll(".map-cell.picked").forEach((x) => x.classList.remove("picked"));
    cell.classList.add("picked");
    const f = data.facts[key(r, c)];
    const lv = level(key(r, c));
    let text = r + " × " + c + " = " + r * c + " — " + LEVEL_NAMES[lv] + ". ";
    if (!f || (!f.right && !f.wrong)) text += "Not asked yet.";
    else {
      text += "Right " + (f.right || 0) + (f.right === 1 ? " time" : " times") + ", wrong " + (f.wrong || 0) + ". ";
      const s = streak(key(r, c));
      text += lv === 2 ? "⭐ " + s + " in a row!" : (MASTERED - s) + " more right in a row to turn green.";
    }
    $("mapDetail").textContent = text;
  }

  function openMap() {
    stopTimer();
    renderMap();
    show("map");
  }

  // ---------------- Game ----------------
  function startGame(resume) {
    const kind = resume ? "challenge" : pickKind;
    let tables;
    if (resume) tables = data.current.tables;
    else if (kind === "practice") tables = [pickOne];
    else tables = Array.from(pickTables).sort((a, b) => a - b);
    const mode = resume ? data.current.mode : pickMode;
    if (!tables || !tables.length) { $("pickWarn").classList.remove("hidden"); return; }

    stopTimer();
    data.kind = kind;
    data.mode = mode;
    if (kind === "practice") data.practiceTable = tables[0];
    else data.tables = tables;

    game = {
      kind: kind,
      rules: KINDS[kind],
      tables: tables,
      mode: mode,
      pool: buildPool(tables),
      blocks: resume ? data.current.blocks.slice() : [],
      oops: resume ? data.current.oops || 0 : 0,
      asked: 0,
      right: 0,
      wrong: 0,
      peak: 0,
      startBest: bestFor(kind),
      newBest: false,
      missed: new Set(),
      retry: [],
      lastKey: null,
      q: null,
      locked: false,
      over: false,
      entry: "",
      endAt: 0,
      timer: null,
      lastTick: CLOCK_SECONDS
    };
    game.peak = game.blocks.length;
    if (kind === "challenge") {
      data.current = { blocks: game.blocks, tables: tables, mode: mode, oops: game.oops };
    }
    save();

    // Which HUD boxes each mode shows
    const hud = { bestItem: kind !== "practice", rightItem: kind === "practice", oopsItem: kind === "challenge",
      timeItem: kind === "clock", tableItem: kind === "practice" };
    Object.keys(hud).forEach((id) => $(id).classList.toggle("hidden", !hud[id]));
    $("tableVal").textContent = "×" + tables[0];
    $("timeItem").classList.remove("hurry");
    $("timeVal").textContent = CLOCK_SECONDS;

    $("stack").dataset.style = currentStyle();
    game.zoneShown = zoneIndex(game.blocks.length);   // world messages only for worlds reached in this game
    game.unlocks = [];

    $("choices").classList.toggle("hidden", mode !== "choice");
    $("pad").classList.toggle("hidden", mode !== "pad");
    $("towerEmpty").textContent = kind === "clock" ? "Ready? The clock starts now!" : "Answer a question to place your first block!";
    show("game");
    buildWorld();
    drawTower();
    updateHud();
    nextQuestion();
    if (kind === "clock") startTimer();
  }

  function bestFor(kind) {
    return kind === "challenge" ? data.best : kind === "clock" ? data.clockBest : 0;
  }
  function setBestFor(kind, v) {
    if (kind === "challenge") data.best = v;
    else if (kind === "clock") data.clockBest = v;
  }

  // ---------------- Beat the clock timer ----------------
  function startTimer() {
    game.endAt = Date.now() + CLOCK_SECONDS * 1000;
    game.timer = setInterval(updateTimer, 200);
  }
  function stopTimer() {
    if (game && game.timer) { clearInterval(game.timer); game.timer = null; }
  }
  function updateTimer() {
    if (!game || game.kind !== "clock") return;
    const left = Math.max(0, Math.ceil((game.endAt - Date.now()) / 1000));
    $("timeVal").textContent = left;
    $("timeItem").classList.toggle("hurry", left <= 10);
    if (left < game.lastTick && left <= 5 && left > 0) sfx.tick();
    game.lastTick = left;
    if (left === 0) timeUp();
  }
  function timeUp() {
    stopTimer();
    game.over = true;
    game.locked = true;
    if (game.mode === "choice") document.querySelectorAll(".choice").forEach((c) => { c.disabled = true; });
    else setPadDisabled(true);
    setFeedback("⏰ Time's up!", "right");
    sfx.timeUp();
    setTimeout(finish, 1400);
  }

  function nextQuestion() {
    if (!game || game.over) return;
    const f = pickFact();
    game.lastKey = f.k;
    game.asked++;
    const flip = Math.random() < 0.5 && f.t !== f.n;
    game.q = { t: f.t, n: f.n, k: f.k, a: flip ? f.n : f.t, b: flip ? f.t : f.n, answer: f.t * f.n };
    game.entry = "";
    game.locked = false;

    $("qText").textContent = game.q.a + " × " + game.q.b;
    const slot = $("slot");
    slot.textContent = "?";
    slot.className = "slot";
    setFeedback("", "");

    if (game.mode === "choice") {
      const box = $("choices");
      box.innerHTML = "";
      makeChoices(game.q.a, game.q.b).forEach((v) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "choice";
        b.textContent = v;
        b.dataset.value = v;
        b.addEventListener("click", () => answer(v, b));
        box.appendChild(b);
      });
    } else {
      setPadDisabled(false);
    }
  }

  function setFeedback(text, kind) {
    const fb = $("feedback");
    fb.textContent = text || " ";
    fb.className = "feedback" + (kind ? " " + kind : "");
  }

  function answer(value, btn) {
    if (!game || game.locked || game.over) return;
    game.locked = true;
    const q = game.q;
    const ok = Number(value) === q.answer;
    const info = factInfo(q.k);
    if (!Number.isFinite(info.streak)) info.streak = streak(q.k);
    const slot = $("slot");
    slot.textContent = q.answer;

    if (game.mode === "choice") {
      document.querySelectorAll(".choice").forEach((c) => {
        c.disabled = true;
        if (Number(c.dataset.value) === q.answer) c.classList.add("right");
      });
      if (!ok && btn) btn.classList.add("wrong");
    } else {
      setPadDisabled(true);
    }

    if (ok) {
      info.right++;
      info.streak++;
      info.trouble = Math.max(0, (info.trouble || 0) - 1);
      data.totals.right++;
      game.right++;
      slot.classList.add("right");
      setFeedback(info.streak === MASTERED ? "🟩 Mastered " + q.t + " × " + q.n + "!" : cheer(), "right");
      sfx.right();
      addBlock(q);
      setTimeout(nextQuestion, game.rules.rightDelay);
    } else {
      info.wrong++;
      info.streak = 0;
      info.trouble = Math.min(MAX_TROUBLE, (info.trouble || 0) + 3);
      data.totals.wrong++;
      game.wrong++;
      game.missed.add(q.k);
      game.retry.push({ k: q.k, due: game.asked + RETRY_AFTER });
      slot.classList.add("wrong");
      setFeedback((game.mode === "pad" ? "✗ You typed " + value + ". " : "✗ Not quite! ") + "The answer is " + q.answer + ".", "wrong");
      sfx.wrong();
      wobble();
      // Tower challenge only: the 3rd oops dot lights up, then the top block falls (see removeTop).
      if (game.kind === "challenge") {
        game.oops++;
        if (game.oops >= OOPS_LIMIT) setTimeout(removeTop, 650);
      }
      setTimeout(nextQuestion, game.rules.wrongDelay);
    }
    if (game.kind === "challenge" && data.current) data.current.oops = game.oops;
    updateHud();
    save();
  }

  const CHEERS = ["✓ Great!", "✓ Correct!", "✓ Awesome!", "✓ Nice one!", "✓ Super!", "✓ You got it!"];
  function cheer() {
    const h = game.blocks.length + 1;
    if (h % 10 === 0) return "🎉 " + h + " blocks tall!";
    return CHEERS[Math.floor(Math.random() * CHEERS.length)];
  }

  // ---------------- Tower drawing ----------------
  function blockHeight() {
    return parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--block-h")) || 36;
  }

  function makeBlockEl(b, i) {
    const el = document.createElement("div");
    el.className = "block c" + b.color;
    el.style.bottom = i * blockHeight() + "px";
    el.style.setProperty("--shift", b.shift + "px");
    const strong = document.createElement("span");
    strong.textContent = b.answer;
    const small = document.createElement("small");
    small.textContent = b.a + "×" + b.b;
    el.append(strong, small);
    return el;
  }

  function drawTower() {
    const stack = $("stack");
    stack.querySelectorAll(".block").forEach((b) => b.remove());
    game.blocks.forEach((b, i) => stack.appendChild(makeBlockEl(b, i)));
    layoutWorld(true);
  }

  // ---------------- The world (scrollable, sky changes with height) ----------------
  function groundHeight() {
    return parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--ground-h")) || 22;
  }
  const yOf = (level) => groundHeight() + level * blockHeight();   // px from the bottom of the world

  // ---------------- Scenery ----------------
  // Fixed spots, so the scenery looks the same every game. level = height in blocks.
  // Movers glide left → right → left (see .mover in style.css); dur = seconds for one full trip there and back.
  // face: which way the picture points ("r" right, "l" left) so it can turn round at each end.
  const SCENERY = {
    ground: [
      // a row of houses on the hill in the background (small and faded), then the front row
      { emoji: "🏠", cls: "house-back", left: 0 },  { emoji: "🏘️", cls: "house-back", left: 7 },
      { emoji: "🏡", cls: "house-back", left: 14 }, { emoji: "🏠", cls: "house-back", left: 21 },
      { emoji: "🏘️", cls: "house-back", left: 36 }, { emoji: "🏠", cls: "house-back", left: 55 },
      { emoji: "🏘️", cls: "house-back", left: 72 }, { emoji: "🏠", cls: "house-back", left: 79 },
      { emoji: "🏡", cls: "house-back", left: 86 }, { emoji: "🏘️", cls: "house-back", left: 93 },
      { emoji: "🌳", cls: "front", left: 1 },  { emoji: "🌷", cls: "front small", left: 11 },
      { emoji: "🌸", cls: "front small", left: 17 },
      { emoji: "🌼", cls: "front small", left: 76 }, { emoji: "🏡", cls: "front", right: 30 },
      { emoji: "🌲", cls: "front", right: 2 }
    ],
    sky: [
      { css: "cloud", level: 11,   dur: 140, delay: 0.1 },
      { css: "cloud big", level: 15,   dur: 180, delay: 0.6 },
      { css: "cloud", level: 19.5, dur: 160, delay: 0.35 },
      { css: "cloud big", level: 23,   dur: 200, delay: 0.8 },
      { css: "bird",  level: 13,   dur: 60, delay: 0.3 },
      { css: "bird",  level: 13.6, dur: 60, delay: 0.32 },
      { css: "bird",  level: 18,   dur: 75, delay: 0.7 },
      { css: "bird",  level: 21.5, dur: 68, delay: 0.1 },
      { css: "balloon", level: 12.5, dur: 220, delay: 0.55 },
      { css: "balloon b2", level: 20.5, dur: 260, delay: 0.2 },
      { emoji: "🪁", cls: "kite", left: 8,  level: 16 },
      { emoji: "🪁", cls: "kite", left: 84, level: 22.5 }
    ],
    planes: [
      { emoji: "✈️", cls: "plane", face: "r", level: 26.5, dur: 70, delay: 0.2 },
      { emoji: "🚁", cls: "heli",  face: "l", level: 30,   dur: 95, delay: 0.65 },
      { emoji: "✈️", cls: "plane", face: "r", level: 33.5, dur: 80, delay: 0.85 },
      { emoji: "🚁", cls: "heli",  face: "l", level: 36.5, dur: 90, delay: 0.3 },
      { css: "cloud thin", level: 28.5, dur: 210, delay: 0.4 },
      { css: "cloud thin", level: 38,   dur: 240, delay: 0.9 }
    ],
    space: [
      // kept near the edges so the tower doesn't hide them
      { css: "moon", right: 8, level: 45 },
      { css: "planet mars", left: 3, level: 50 },
      { css: "planet ringed", right: 22, level: 59 },
      { css: "planet jupiter", left: 2, level: 70 },
      { css: "planet neptune", right: 10, level: 82 },
      { css: "planet violet", left: 4, level: 95 },
      { emoji: "🚀", cls: "rocket", left: 3, level: 56 },
      { emoji: "👽", cls: "alien", right: 8, level: 66 },
      { emoji: "🚀", cls: "rocket", right: 8, level: 104 }
    ]
  };
  const STAR_COUNT = 240;         // CSS stars spread through space (from block 40 up to block 130)

  // Small repeatable random numbers, so the stars are in the same places every game.
  function seeded(seed) {
    let x = seed;
    return () => { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; };
  }

  function makeScenery(item, zone) {
    const art = document.createElement("span");
    if (item.css) art.className = "art " + item.css;
    else { art.className = "art emoji " + (item.cls || ""); art.textContent = item.emoji; }
    art.setAttribute("aria-hidden", "true");
    const bottom = zone === "ground" ? groundHeight() - 4 : yOf(item.level);

    if (item.dur) {                                  // a mover: glides across and turns round
      const mover = document.createElement("span");
      mover.className = "deco mover";
      mover.style.bottom = bottom + "px";
      mover.style.setProperty("--dur", item.dur + "s");
      mover.style.setProperty("--delay", -(item.delay * item.dur) + "s");
      const face = document.createElement("span");
      face.className = "face " + (item.face || "n");
      face.appendChild(art);
      mover.appendChild(face);
      return mover;
    }
    art.classList.add("deco");
    if (item.right !== undefined) art.style.right = item.right + "px";
    else art.style.left = item.left + "%";
    art.style.bottom = bottom + "px";
    return art;
  }

  function buildWorld() {
    const world = $("world");
    world.querySelectorAll(".zone, .grass, .deco, .zone-sign, .zone-line").forEach((e) => e.remove());
    const stack = $("stack");
    ZONES.forEach((z) => {
      const d = document.createElement("div");
      d.className = "zone zone-" + z.id;
      if (z.id === "ground") d.style.height = yOf(z.to) + "px";
      else {
        d.style.bottom = yOf(z.at) + "px";
        if (z.to !== Infinity) d.style.height = (z.to - z.at) * blockHeight() + "px";
      }
      world.insertBefore(d, stack);
      if (z.at > 0) {
        const sign = document.createElement("div");
        sign.className = "zone-sign";
        sign.style.bottom = yOf(z.at) + 4 + "px";
        sign.textContent = z.emoji + " " + (z.id === "space" ? "SPACE!" : z.name) + " · " + z.at;
        world.insertBefore(sign, stack);
        const line = document.createElement("div");
        line.className = "zone-line";
        line.style.bottom = yOf(z.at) + "px";
        world.insertBefore(line, stack);
      }
      (SCENERY[z.id] || []).forEach((item) => world.insertBefore(makeScenery(item, z.id), stack));
    });

    // Stars: little CSS dots that glow and dim, each at its own speed
    const rnd = seeded(42);
    for (let i = 0; i < STAR_COUNT; i++) {
      const star = document.createElement("span");
      star.className = "deco star";
      const size = 2 + Math.round(rnd() * 3);
      star.style.width = star.style.height = size + "px";
      star.style.left = (1 + rnd() * 97) + "%";
      star.style.bottom = yOf(40.4 + rnd() * 90) + "px";
      star.style.animationDuration = (1.8 + rnd() * 3.2).toFixed(2) + "s";
      star.style.animationDelay = (-rnd() * 5).toFixed(2) + "s";
      world.insertBefore(star, stack);
    }

    const hills = document.createElement("div");
    hills.className = "deco hills";
    world.insertBefore(hills, world.querySelector(".house-back"));
    const grass = document.createElement("div");
    grass.className = "grass";
    world.insertBefore(grass, stack);
  }

  // Size the world to the tower (plus a little sky), and optionally scroll so the top of the tower is in view.
  function layoutWorld(follow) {
    const bh = blockHeight();
    const sc = $("towerScroll");
    const view = sc.clientHeight;
    const n = game.blocks.length;
    const worldH = Math.max(view, Math.ceil(yOf(n + HEADROOM)));
    $("world").style.height = worldH + "px";
    $("towerEmpty").classList.toggle("hidden", n > 0);

    const best = Math.max(bestFor(game.kind), game.peak);
    const line = $("bestLine");
    line.classList.toggle("hidden", game.kind === "practice" || best === 0);
    line.style.bottom = best * bh + "px";

    if (follow) scrollToTop(follow === "smooth");
    updateScrollUi();
  }

  function scrollToTop(smooth) {
    const sc = $("towerScroll");
    const worldH = $("world").offsetHeight;
    const topFromTop = worldH - yOf(game ? game.blocks.length : 0);
    const target = Math.max(0, Math.min(sc.scrollHeight - sc.clientHeight, topFromTop - sc.clientHeight * 0.4));
    sc.scrollTo({ top: target, behavior: smooth ? "smooth" : "auto" });
  }
  function scrollToGround() {
    const sc = $("towerScroll");
    sc.scrollTo({ top: sc.scrollHeight, behavior: "smooth" });
  }

  // Badge shows the world at the middle of the view; arrow buttons appear when there is somewhere to scroll.
  function updateScrollUi() {
    const sc = $("towerScroll");
    const worldH = $("world").offsetHeight;
    const midLevel = (worldH - sc.scrollTop - sc.clientHeight / 2 - groundHeight()) / blockHeight();
    const z = ZONES[zoneIndex(Math.max(0, midLevel))];
    const badge = z.emoji + " " + z.name;
    if ($("zoneBadge").textContent !== badge) $("zoneBadge").textContent = badge;
    const canScroll = sc.scrollHeight > sc.clientHeight + 4;
    $("toTopBtn").classList.toggle("hidden", !canScroll || sc.scrollTop < 8);
    $("toGroundBtn").classList.toggle("hidden", !canScroll || sc.scrollTop > sc.scrollHeight - sc.clientHeight - 8);
  }
  $("towerScroll").addEventListener("scroll", () => { if (game) updateScrollUi(); }, { passive: true });
  $("toTopBtn").addEventListener("click", () => { sfx.tap(); scrollToTop(true); });
  $("toGroundBtn").addEventListener("click", () => { sfx.tap(); scrollToGround(); });

  function addBlock(q) {
    const prev = game.blocks[game.blocks.length - 1];
    let color = Math.floor(Math.random() * COLORS);
    if (prev && color === prev.color) color = (color + 1) % COLORS;
    const b = { a: q.a, b: q.b, answer: q.answer, color: color, shift: Math.round(Math.random() * 16 - 8) };
    game.blocks.push(b);
    const el = makeBlockEl(b, game.blocks.length - 1);
    el.classList.add("drop");
    $("stack").appendChild(el);
    el.addEventListener("animationend", () => el.classList.remove("drop"), { once: true });
    setTimeout(sfx.land, 330);

    if (game.blocks.length > game.peak) game.peak = game.blocks.length;
    if (game.kind !== "practice" && game.peak > bestFor(game.kind)) {
      const hsBefore = highscore();
      setBestFor(game.kind, game.peak);
      if (!game.newBest && game.startBest > 0) { setTimeout(sfx.best, 450); setFeedback("🏆 New best tower!", "right"); }
      game.newBest = true;
      // New block styles unlocked by the new highscore
      STYLES.forEach((st) => {
        if (st.need > hsBefore && st.need <= highscore()) {
          game.unlocks.push(st.emoji + " " + st.name + " blocks");
          setTimeout(() => { sfx.best(); setFeedback("🔓 New block style: " + st.name + "! " + st.emoji, "right"); }, 500);
        }
      });
    }
    // Reaching a new world
    const zi = zoneIndex(game.blocks.length);
    if (zi > game.zoneShown) {
      const z = ZONES[zi];
      game.zoneShown = zi;
      if (zi > data.zoneMax) {
        data.zoneMax = zi;
        game.unlocks.push(z.emoji + " " + z.name + " world");
        setTimeout(() => { sfx.best(); setFeedback("🔓 New world: " + z.name + "! " + z.emoji, "right"); }, 500);
      } else {
        setFeedback(z.reach, "right");
      }
    }
    layoutWorld("smooth");
    updateHud();
    save();
  }

  // Tower challenge only
  function removeTop() {
    if (!game || game.over) return;
    game.oops = 0;
    if (data.current) data.current.oops = 0;
    updateHud();
    save();
    if (!game.blocks.length) { setFeedback("Keep trying — you can do it! 💪", "wrong"); return; }
    game.blocks.pop();
    const els = $("stack").querySelectorAll(".block");
    const top = els[els.length - 1];
    if (top) {
      top.classList.remove("drop");
      top.classList.add("fall");
      setTimeout(() => top.remove(), 800);
    }
    sfx.fall();
    setFeedback("Oh no! 3 oopses — the top block fell off!", "wrong");   // the oops dots start again
    setTimeout(() => layoutWorld("smooth"), 300);
    updateHud();
    save();
  }

  function wobble() {
    const s = $("stack");
    s.classList.remove("wobble");
    void s.offsetWidth;            // restart the animation
    s.classList.add("wobble");
  }

  function updateHud() {
    $("heightVal").textContent = game.blocks.length;
    $("bestVal").textContent = Math.max(bestFor(game.kind), game.peak);
    $("rightVal").textContent = game.right;
    $("oopsDots").querySelectorAll("i").forEach((d, i) => d.classList.toggle("on", i < game.oops));
  }

  // ---------------- Number pad ----------------
  function setPadDisabled(off) {
    $("pad").querySelectorAll("button").forEach((b) => { b.disabled = off; });
  }
  function padKey(k) {
    if (!game || game.locked || game.mode !== "pad") return;
    if (k === "back") {
      game.entry = game.entry.slice(0, -1);
    } else if (k === "enter") {
      if (game.entry) { answer(Number(game.entry)); }
      return;
    } else if (/^\d$/.test(k)) {
      if (game.entry.length >= 3) return;
      game.entry = (game.entry === "0" ? "" : game.entry) + k;
    }
    sfx.tap();
    $("slot").textContent = game.entry || "?";
  }
  $("pad").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (b) padKey(b.dataset.key);
  });

  document.addEventListener("keydown", (e) => {
    if ($("game").classList.contains("hidden") || !game || e.ctrlKey || e.metaKey || e.altKey) return;
    if (game.mode === "pad") {
      if (/^\d$/.test(e.key)) padKey(e.key);
      else if (e.key === "Backspace") { e.preventDefault(); padKey("back"); }
      else if (e.key === "Enter") { e.preventDefault(); padKey("enter"); }
    } else if (/^[1-4]$/.test(e.key)) {
      const c = document.querySelectorAll(".choice")[Number(e.key) - 1];
      if (c && !c.disabled) c.click();
    }
  });

  // ---------------- End ----------------
  function finish() {
    if (!game) return;
    stopTimer();
    game.over = true;
    data.totals.games++;
    if (game.kind === "challenge") data.current = null;
    save();

    const h = game.blocks.length;
    const answered = game.right + game.wrong;
    const stats = $("endStats");
    stats.innerHTML = "";
    if (game.kind === "practice") {
      $("endEmoji").textContent = "📘";
      $("endTitle").textContent = "Great practice with the " + game.tables[0] + "s!";
      stats.appendChild(statEl(game.right + " / " + answered, "✓ Right answers"));
      stats.appendChild(statEl(h, "🧱 Blocks built"));
      let mastered = 0;
      for (let n = 1; n <= 12; n++) if (level(key(game.tables[0], n)) === 2) mastered++;
      stats.appendChild(statEl(mastered + " / 12", "🟩 Mastered in the " + game.tables[0] + "s"));
    } else if (game.kind === "clock") {
      $("endEmoji").textContent = game.newBest ? "🏆" : "⏱️";
      $("endTitle").textContent = game.newBest ? "New record in 60 seconds!" : "Time's up!";
      stats.appendChild(statEl(h, "🧱 Blocks in 60 s"));
      stats.appendChild(statEl(game.right + " / " + answered, "✓ Right answers"));
      stats.appendChild(statEl(data.clockBest, "🏆 Best in 60 s"));
    } else {
      $("endEmoji").textContent = game.newBest ? "🏆" : h >= 10 ? "🏰" : "🏗️";
      $("endTitle").textContent = game.newBest ? "New best tower!" : "Great building!";
      stats.appendChild(statEl(h, "🧱 Tower height"));
      stats.appendChild(statEl(game.peak, "📏 Tallest today"));
      stats.appendChild(statEl(game.right + " / " + answered, "✓ Right answers"));
      stats.appendChild(statEl(data.best, "🏆 Best ever"));
    }

    $("endUnlockBox").classList.toggle("hidden", game.unlocks.length === 0);
    const ul = $("endUnlocks");
    ul.innerHTML = "";
    game.unlocks.forEach((t) => {
      const c = document.createElement("span");
      c.className = "chip good";
      c.textContent = t;
      ul.appendChild(c);
    });

    const missed = Array.from(game.missed);
    $("endTrickyBox").classList.toggle("hidden", missed.length === 0);
    fillChips($("endTricky"), missed);
    game = null;
    show("end");
  }

  // ---------------- Buttons ----------------
  // Sound on/off is one setting for all games, switched on the landing page (assets/sound.js).

  document.querySelectorAll(".kind[data-kind]").forEach((b) => b.addEventListener("click", () => {
    sfx.tap();
    pickKind = b.dataset.kind;
    $("pickWarn").classList.add("hidden");
    renderMenu();
  }));
  $("openMapBtn").addEventListener("click", () => { sfx.tap(); openMap(); });
  $("endMapBtn").addEventListener("click", () => { sfx.tap(); openMap(); });
  $("mapBackBtn").addEventListener("click", () => { sfx.tap(); renderMenu(); show("menu"); });

  document.querySelectorAll(".mode").forEach((m) => m.addEventListener("click", () => {
    sfx.tap();
    pickMode = m.dataset.mode;
    document.querySelectorAll(".mode").forEach((x) => x.setAttribute("aria-checked", x === m ? "true" : "false"));
  }));
  $("allBtn").addEventListener("click", () => { for (let t = 1; t <= 12; t++) pickTables.add(t); renderMenu(); });
  $("noneBtn").addEventListener("click", () => { pickTables.clear(); renderMenu(); });
  $("startBtn").addEventListener("click", () => {
    sfx.tap();
    if (pickKind === "challenge") data.current = null;
    startGame(false);
  });
  $("continueBtn").addEventListener("click", () => { sfx.tap(); startGame(true); });
  $("finishBtn").addEventListener("click", finish);
  $("againBtn").addEventListener("click", () => {
    pickKind = data.kind;
    if (data.kind === "practice") pickOne = data.practiceTable;
    else pickTables = new Set(data.tables);
    pickMode = data.mode;
    startGame(false);
  });
  $("menuBtn").addEventListener("click", () => {
    pickKind = data.kind;
    if (data.kind === "practice") pickOne = data.practiceTable;
    else pickTables = new Set(data.tables);
    pickMode = data.mode;
    renderMenu();
    show("menu");
  });
  $("resetBtn").addEventListener("click", () => {
    if (!window.confirm("Reset your best towers, mastery map, unlocked block styles and worlds, and all your progress?")) return;
    Object.assign(data, defaults(), { mode: pickMode, kind: pickKind });
    save();
    renderMenu();
  });
  window.addEventListener("resize", () => { if (game) { buildWorld(); layoutWorld(true); } });

  // Move a mute chosen with the old in-game button over to the site-wide setting.
  if (data.oldMuted) {
    if (window.SiteSound) SiteSound.setMuted(true);
    delete data.oldMuted;
    save();
  }
  renderMenu();
})();
