(function () {
  "use strict";

  const MAX_PLAYERS = 4;
  const MIN_PLAYERS = 2;
  const AVATARS = ["🦁", "🐼", "🦊", "🐸", "🐵", "🦄", "🐯", "🐧", "🐨", "🐙", "🦖", "🐰"];
  const COLORS = [
    { c: "var(--p1)", soft: "var(--p1-soft)" },
    { c: "var(--p2)", soft: "var(--p2-soft)" },
    { c: "var(--p3)", soft: "var(--p3-soft)" },
    { c: "var(--p4)", soft: "var(--p4-soft)" }
  ];

  // Load cards from cards.js, ignoring any blank/broken entries.
  const ALL_CARDS = (Array.isArray(window.WYR_CARDS) ? window.WYR_CARDS : [])
    .filter((c) => c && typeof c.a === "string" && typeof c.b === "string" && c.a.trim() && c.b.trim())
    .map((c) => ({ a: c.a.trim(), b: c.b.trim() }));

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

  const state = {
    count: 2,
    setup: [0, 1, 2, 3].map((i) => ({ name: "", avatar: i * 3 % AVATARS.length })),
    players: [],
    deck: [],
    reader: 0,
    card: null,
    picks: {},
    history: [] // [{card, picks}]
  };

  // Use the name saved on the landing page for Player 1
  if (window.PlayerName && PlayerName.get()) state.setup[0].name = PlayerName.get();

  /* ---------------- Setup screen ---------------- */
  function renderCountPicker() {
    document.querySelectorAll(".count").forEach((btn) => {
      btn.setAttribute("aria-checked", String(Number(btn.dataset.count) === state.count));
    });
  }

  function renderPlayerInputs() {
    const wrap = $("playerInputs");
    // save any typed names before re-rendering
    wrap.querySelectorAll("input").forEach((inp) => { state.setup[Number(inp.dataset.i)].name = inp.value; });
    let html = "";
    for (let i = 0; i < state.count; i++) {
      const p = state.setup[i];
      html += `
        <div class="player-input" style="--pcolor:${COLORS[i].c};--pcolor-soft:${COLORS[i].soft}">
          <button type="button" class="avatar-btn" data-i="${i}" aria-label="Change picture for player ${i + 1}">${AVATARS[p.avatar]}</button>
          <input type="text" maxlength="30" data-i="${i}" placeholder="Player ${i + 1}" value="${esc(p.name)}" aria-label="Name for player ${i + 1}" autocomplete="off" />
        </div>`;
    }
    wrap.innerHTML = html;
  }

  document.querySelectorAll(".count").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.count = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, Number(btn.dataset.count)));
      renderCountPicker();
      renderPlayerInputs();
    });
  });

  $("playerInputs").addEventListener("click", (e) => {
    const btn = e.target.closest(".avatar-btn");
    if (!btn) return;
    const i = Number(btn.dataset.i);
    const used = new Set(state.setup.slice(0, state.count).map((p, j) => (j === i ? -1 : p.avatar)));
    let next = state.setup[i].avatar;
    do { next = (next + 1) % AVATARS.length; } while (used.has(next));
    state.setup[i].avatar = next;
    btn.textContent = AVATARS[next];
  });

  $("playerInputs").addEventListener("input", (e) => {
    if (e.target.matches("input")) state.setup[Number(e.target.dataset.i)].name = e.target.value;
  });

  $("startBtn").addEventListener("click", startGame);

  /* ---------------- Game ---------------- */
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function startGame() {
    if (!ALL_CARDS.length) {
      alert("No cards found! Please check cards.js.");
      return;
    }
    state.players = state.setup.slice(0, state.count).map((p, i) => ({
      name: (p.name || "").trim() || `Player ${i + 1}`,
      avatar: AVATARS[p.avatar],
      color: COLORS[i]
    }));
    state.deck = shuffle(ALL_CARDS);
    state.reader = 0;
    state.history = [];
    showScreen("game");
    $("endBtn").classList.remove("hidden");

    // Step 1: shuffle and place the deck face down
    resetTable();
    const deck = $("deck");
    deck.classList.add("shuffling");
    deck.disabled = true;
    $("turnMsg").textContent = "Shuffling the cards… 🔀";
    setTimeout(() => {
      deck.classList.remove("shuffling");
      readyForDraw();
    }, 1000);
  }

  function resetTable() {
    $("cardArea").classList.add("hidden");
    $("cardArea").classList.remove("deal");
    $("flip").classList.remove("flipped");
    $("choose").classList.add("hidden");
    $("explain").classList.add("hidden");
    $("deck").parentElement.classList.remove("hidden");
    state.card = null;
    state.picks = {};
    stopSpeaking();
  }

  function readyForDraw() {
    const deck = $("deck");
    const reader = state.players[state.reader];
    deck.disabled = false;
    deck.classList.add("ready");
    deck.classList.toggle("empty", state.deck.length === 0);
    $("deckCount").textContent = `${state.deck.length} card${state.deck.length === 1 ? "" : "s"} left`;
    $("turnMsg").innerHTML = `${esc(reader.avatar)} <b>${esc(reader.name)}</b>, tap the deck to draw a card!`;
    renderStrip();
  }

  function renderStrip() {
    $("playersStrip").innerHTML = state.players.map((p, i) => `
      <div class="chip ${i === state.reader ? "active" : ""}" style="--pcolor:${p.color.c};--pcolor-soft:${p.color.soft}">
        <span class="av">${esc(p.avatar)}</span><span>${esc(p.name)}</span>
      </div>`).join("");
  }

  // Step 2: draw a card and read it out loud
  $("deck").addEventListener("click", () => {
    if (state.card || !state.deck.length) return;
    state.card = state.deck.pop();
    const deck = $("deck");
    deck.classList.remove("ready");
    deck.parentElement.classList.add("hidden");

    $("optA").textContent = state.card.a;
    $("optB").textContent = state.card.b;
    $("votersA").innerHTML = "";
    $("votersB").innerHTML = "";

    const area = $("cardArea");
    area.classList.remove("hidden");
    void area.offsetWidth; // restart animation
    area.classList.add("deal");
    setTimeout(() => $("flip").classList.add("flipped"), 350);

    const reader = state.players[state.reader];
    $("turnMsg").innerHTML = `📣 <b>${esc(reader.name)}</b>, read the card out loud!`;
    renderChooser();
    setTimeout(() => $("choose").classList.remove("hidden"), 700);
  });

  $("speakBtn").addEventListener("click", () => {
    if (!state.card) return;
    speak(`Would you rather ${state.card.a}? Or, ${state.card.b}?`);
  });

  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9;
    u.pitch = 1.1;
    window.speechSynthesis.speak(u);
  }
  function stopSpeaking() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  // Step 3: everyone chooses A or B and explains why
  function renderChooser() {
    $("chooseList").innerHTML = state.players.map((p, i) => `
      <div class="chooser" style="--pcolor:${p.color.c};--pcolor-soft:${p.color.soft}">
        <div class="who"><span class="av">${esc(p.avatar)}</span><span>${esc(p.name)}</span></div>
        <button type="button" class="pick a" data-i="${i}" data-pick="A" aria-pressed="false" aria-label="${esc(p.name)} picks A">A</button>
        <button type="button" class="pick b" data-i="${i}" data-pick="B" aria-pressed="false" aria-label="${esc(p.name)} picks B">B</button>
      </div>`).join("");
    updatePicks();
  }

  $("chooseList").addEventListener("click", (e) => {
    const btn = e.target.closest(".pick");
    if (!btn) return;
    state.picks[btn.dataset.i] = btn.dataset.pick;
    updatePicks();
  });

  function updatePicks() {
    document.querySelectorAll(".pick").forEach((btn) => {
      const on = state.picks[btn.dataset.i] === btn.dataset.pick;
      btn.classList.toggle("on", on);
      btn.setAttribute("aria-pressed", String(on));
    });
    const voters = { A: [], B: [] };
    state.players.forEach((p, i) => { if (state.picks[i]) voters[state.picks[i]].push(p.avatar); });
    $("votersA").innerHTML = voters.A.map((a) => `<span>${esc(a)}</span>`).join("");
    $("votersB").innerHTML = voters.B.map((a) => `<span>${esc(a)}</span>`).join("");

    const allPicked = state.players.every((_, i) => state.picks[i]);
    $("explain").classList.toggle("hidden", !allPicked);
    const nextBtn = $("nextBtn");
    nextBtn.disabled = !allPicked;
    if (state.deck.length === 0) {
      nextBtn.textContent = "See results 🎉";
    } else {
      const next = state.players[(state.reader + 1) % state.players.length];
      nextBtn.textContent = `Pass the deck to ${next.name} ➜`;
    }
  }

  // Step 4: pass the deck to the next player
  $("nextBtn").addEventListener("click", () => {
    if (!state.card) return;
    state.history.push({ card: state.card, picks: { ...state.picks } });
    if (state.deck.length === 0) return endGame();
    state.reader = (state.reader + 1) % state.players.length;
    resetTable();
    readyForDraw();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  /* ---------------- End ---------------- */
  $("endBtn").addEventListener("click", () => {
    if (state.card && state.players.every((_, i) => state.picks[i])) {
      state.history.push({ card: state.card, picks: { ...state.picks } });
    }
    endGame();
  });

  function endGame() {
    stopSpeaking();
    $("endBtn").classList.add("hidden");
    showScreen("end");
    const rounds = state.history.length;
    $("endSummary").textContent = rounds
      ? `You played ${rounds} card${rounds === 1 ? "" : "s"} together!`
      : "Come back and draw some cards soon!";

    let html = "";
    if (rounds) {
      // Best buddies: pair that agreed the most
      let best = null;
      for (let i = 0; i < state.players.length; i++) {
        for (let j = i + 1; j < state.players.length; j++) {
          const same = state.history.filter((h) => h.picks[i] === h.picks[j]).length;
          if (!best || same > best.same) best = { i, j, same };
        }
      }
      if (best && best.same > 0) {
        const a = state.players[best.i], b = state.players[best.j];
        html += `<div class="stat"><span class="big-emoji">🤝</span><span><b>Think-alike buddies:</b> ${esc(a.avatar)} ${esc(a.name)} &amp; ${esc(b.avatar)} ${esc(b.name)} picked the same thing ${best.same} time${best.same === 1 ? "" : "s"}!</span></div>`;
      }
      const together = state.history.filter((h) => new Set(Object.values(h.picks)).size === 1).length;
      if (together) {
        html += `<div class="stat"><span class="big-emoji">🌈</span><span>Everyone agreed on <b>${together}</b> card${together === 1 ? "" : "s"}!</span></div>`;
      }
      state.players.forEach((p, i) => {
        const aCount = state.history.filter((h) => h.picks[i] === "A").length;
        const bCount = state.history.filter((h) => h.picks[i] === "B").length;
        html += `<div class="stat" style="background:${p.color.soft}"><span class="big-emoji">${esc(p.avatar)}</span><span><b>${esc(p.name)}</b> picked A ${aCount}× and B ${bCount}×</span></div>`;
      });
    }
    $("endStats").innerHTML = html;
  }

  $("againBtn").addEventListener("click", () => {
    showScreen("setup");
    renderPlayerInputs();
  });

  function showScreen(name) {
    ["setup", "game", "end"].forEach((s) => $(s).classList.toggle("hidden", s !== name));
    window.scrollTo({ top: 0 });
  }

  // init
  renderCountPicker();
  renderPlayerInputs();
})();
