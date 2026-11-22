/*
  Tower Builder — times tables practice.
  Right answer = a new block drops onto the tower.
  Wrong answer = the tower wobbles and the right answer is shown.
  Every third wrong answer (not just in a row) = the top block falls off,
  and the wrong-answer count starts again.
  Game logic is described in README.md.
*/
(function () {
  "use strict";

  const STORE_KEY = "kgz.towerBuilder";
  const MAX_TROUBLE = 8;          // how "tricky" a fact can get
  const RETRY_AFTER = 3;          // a missed fact comes back after this many questions
  const RIGHT_DELAY = 900;        // ms before the next question
  const WRONG_DELAY = 2200;
  const COLORS = 6;               // block color classes c0…c5
  const OOPS_LIMIT = 3;           // wrong answers (at any time) that knock off the top block
  const START_TABLES = [6, 7, 8, 9];   // always pre-selected when the game opens

  const $ = (id) => document.getElementById(id);

  // ---------------- Saved data ----------------
  function defaults() {
    return {
      best: 0,
      tables: START_TABLES.slice(),
      mode: "choice",
      facts: {},                  // "7x8": { right, wrong, trouble }
      totals: { right: 0, wrong: 0, games: 0 },
      current: null               // unfinished tower: { blocks: [...], tables, mode }
    };
  }
  function load() {
    const d = defaults();
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
      if (raw && typeof raw === "object") {
        if (Number.isFinite(raw.best)) d.best = Math.max(0, Math.floor(raw.best));
        if (raw.muted === true) d.oldMuted = true;   // from the old in-game mute button
        if (Array.isArray(raw.tables)) {
          const t = raw.tables.map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 12);
          if (t.length) d.tables = Array.from(new Set(t)).sort((a, b) => a - b);
        }
        if (raw.mode === "pad" || raw.mode === "choice") d.mode = raw.mode;
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

  // ---------------- Sound (Web Audio) ----------------
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
    best() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, { vol: 0.15, delay: i * 0.11 })); }
  };

  // ---------------- Facts and question picking ----------------
  const key = (t, n) => t + "x" + n;
  function factInfo(k) {
    if (!data.facts[k] || typeof data.facts[k] !== "object") data.facts[k] = { right: 0, wrong: 0, trouble: 0 };
    return data.facts[k];
  }
  function trouble(k) {
    const f = data.facts[k];
    return f && Number.isFinite(f.trouble) ? f.trouble : 0;
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
    ["menu", "game", "end"].forEach((s) => $(s).classList.toggle("hidden", s !== id));
    $("finishBtn").classList.toggle("hidden", id !== "game");
    window.scrollTo(0, 0);
  }

  // ---------------- Menu ----------------
  let pickTables = new Set(START_TABLES);   // the menu always opens with 6–9 picked
  let pickMode = data.mode;

  function renderMenu() {
    const name = window.PlayerName ? PlayerName.get() : "";
    $("hello").textContent = name ? "Hi " + name + ", let's build!" : "Let's build a tower!";

    const box = $("tables");
    box.innerHTML = "";
    for (let t = 1; t <= 12; t++) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "table-btn";
      b.textContent = "×" + t;
      b.setAttribute("aria-label", t + " times table");
      b.setAttribute("aria-pressed", pickTables.has(t) ? "true" : "false");
      b.addEventListener("click", () => {
        sfx.tap();
        if (pickTables.has(t)) pickTables.delete(t); else pickTables.add(t);
        b.setAttribute("aria-pressed", pickTables.has(t) ? "true" : "false");
        $("pickWarn").classList.add("hidden");
      });
      box.appendChild(b);
    }
    document.querySelectorAll(".mode").forEach((m) => m.setAttribute("aria-checked", m.dataset.mode === pickMode ? "true" : "false"));

    const stats = $("menuStats");
    stats.innerHTML = "";
    const answered = data.totals.right + data.totals.wrong;
    [
      [data.best, "🏆 Best tower"],
      [data.totals.right, "✓ Right answers"],
      [answered ? Math.round((data.totals.right / answered) * 100) + "%" : "–", "🎯 Accuracy"]
    ].forEach(([v, label]) => stats.appendChild(statEl(v, label)));

    const tricky = Object.keys(data.facts)
      .filter((k) => trouble(k) > 0)
      .sort((x, y) => trouble(y) - trouble(x))
      .slice(0, 8);
    $("trickyBox").classList.toggle("hidden", tricky.length === 0);
    fillChips($("trickyList"), tricky);

    const cur = data.current;
    const cont = $("continueBtn");
    if (cur && cur.blocks.length) {
      cont.textContent = "▶️ Keep building (" + cur.blocks.length + ")";
      cont.classList.remove("hidden");
    } else {
      cont.classList.add("hidden");
    }
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

  // ---------------- Game ----------------
  function startGame(resume) {
    const tables = resume ? data.current.tables : Array.from(pickTables).sort((a, b) => a - b);
    const mode = resume ? data.current.mode : pickMode;
    if (!tables || !tables.length) { $("pickWarn").classList.remove("hidden"); return; }

    data.tables = tables;
    data.mode = mode;
    game = {
      tables: tables,
      mode: mode,
      pool: buildPool(tables),
      blocks: resume ? data.current.blocks.slice() : [],
      oops: resume ? data.current.oops || 0 : 0,
      asked: 0,
      right: 0,
      wrong: 0,
      peak: 0,
      startBest: data.best,
      newBest: false,
      missed: new Set(),
      retry: [],
      lastKey: null,
      q: null,
      locked: false,
      entry: ""
    };
    game.peak = game.blocks.length;
    data.current = { blocks: game.blocks, tables: tables, mode: mode, oops: game.oops };
    save();

    $("choices").classList.toggle("hidden", mode !== "choice");
    $("pad").classList.toggle("hidden", mode !== "pad");
    show("game");
    drawTower();
    updateHud();
    nextQuestion();
  }

  function nextQuestion() {
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
    if (!game || game.locked) return;
    game.locked = true;
    const q = game.q;
    const ok = Number(value) === q.answer;
    const info = factInfo(q.k);
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
      info.trouble = Math.max(0, (info.trouble || 0) - 1);
      data.totals.right++;
      game.right++;
      slot.classList.add("right");
      setFeedback(cheer(), "right");
      sfx.right();
      addBlock(q);
      setTimeout(nextQuestion, RIGHT_DELAY);
    } else {
      info.wrong++;
      info.trouble = Math.min(MAX_TROUBLE, (info.trouble || 0) + 3);
      data.totals.wrong++;
      game.wrong++;
      game.oops++;
      game.missed.add(q.k);
      game.retry.push({ k: q.k, due: game.asked + RETRY_AFTER });
      slot.classList.add("wrong");
      setFeedback((game.mode === "pad" ? "✗ You typed " + value + ". " : "✗ Not quite! ") + "The answer is " + q.answer + ".", "wrong");
      sfx.wrong();
      wobble();
      // The 3rd dot lights up, then the top block falls and the dots start again (in removeTop).
      if (game.oops >= OOPS_LIMIT) setTimeout(removeTop, 650);
      setTimeout(nextQuestion, WRONG_DELAY);
    }
    if (data.current) data.current.oops = game.oops;
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
    fitTower();
  }

  // Keep the top of the tower in view by sliding the whole stack down.
  function fitTower() {
    const bh = blockHeight();
    const room = $("towerBox").clientHeight - 14 - bh * 2.5;   // leave space above for the next block
    const height = game.blocks.length * bh;
    const overflow = Math.max(0, height - room);
    $("stack").style.bottom = 14 - overflow + "px";
    $("towerEmpty").classList.toggle("hidden", game.blocks.length > 0);

    const best = Math.max(data.best, game.peak);
    const line = $("bestLine");
    line.classList.toggle("hidden", best === 0);
    line.style.bottom = best * bh + "px";
  }

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
    if (game.peak > data.best) {
      data.best = game.peak;
      if (!game.newBest && game.startBest > 0) { setTimeout(sfx.best, 450); setFeedback("🏆 New best tower!", "right"); }
      game.newBest = true;
    }
    fitTower();
    updateHud();
    save();
  }

  function removeTop() {
    if (!game) return;
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
    setTimeout(fitTower, 300);
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
    $("bestVal").textContent = Math.max(data.best, game.peak);
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
    data.totals.games++;
    data.current = null;
    save();

    const h = game.blocks.length;
    $("endEmoji").textContent = game.newBest ? "🏆" : h >= 10 ? "🏰" : "🏗️";
    $("endTitle").textContent = game.newBest ? "New best tower!" : "Great building!";
    const stats = $("endStats");
    stats.innerHTML = "";
    stats.appendChild(statEl(h, "🧱 Tower height"));
    stats.appendChild(statEl(game.peak, "📏 Tallest today"));
    stats.appendChild(statEl(game.right + " / " + (game.right + game.wrong), "✓ Right answers"));
    stats.appendChild(statEl(data.best, "🏆 Best ever"));

    const missed = Array.from(game.missed);
    $("endTrickyBox").classList.toggle("hidden", missed.length === 0);
    fillChips($("endTricky"), missed);
    game = null;
    show("end");
  }

  // ---------------- Buttons ----------------
  // Sound on/off is one setting for all games, switched on the landing page (assets/sound.js).

  document.querySelectorAll(".mode").forEach((m) => m.addEventListener("click", () => {
    sfx.tap();
    pickMode = m.dataset.mode;
    document.querySelectorAll(".mode").forEach((x) => x.setAttribute("aria-checked", x === m ? "true" : "false"));
  }));
  $("allBtn").addEventListener("click", () => { for (let t = 1; t <= 12; t++) pickTables.add(t); renderMenu(); });
  $("noneBtn").addEventListener("click", () => { pickTables.clear(); renderMenu(); });
  $("startBtn").addEventListener("click", () => { sfx.tap(); data.current = null; startGame(false); });
  $("continueBtn").addEventListener("click", () => { sfx.tap(); startGame(true); });
  $("finishBtn").addEventListener("click", finish);
  $("againBtn").addEventListener("click", () => { pickTables = new Set(data.tables); pickMode = data.mode; startGame(false); });
  $("menuBtn").addEventListener("click", () => { pickTables = new Set(data.tables); pickMode = data.mode; renderMenu(); show("menu"); });
  $("resetBtn").addEventListener("click", () => {
    if (!window.confirm("Reset your best tower and all your progress?")) return;
    Object.assign(data, defaults(), { mode: pickMode });
    save();
    renderMenu();
  });
  window.addEventListener("resize", () => { if (game) fitTower(); });

  // Move a mute chosen with the old in-game button over to the site-wide setting.
  if (data.oldMuted) {
    if (window.SiteSound) SiteSound.setMuted(true);
    delete data.oldMuted;
    save();
  }
  renderMenu();
})();
