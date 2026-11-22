(function () {
  "use strict";

  /* ======================================================
     Settings
     ====================================================== */
  const MAX_PLAYERS = 4;
  const STREAK_BONUS_5 = 1;   // bonus for 5 right in a row
  const STREAK_BONUS_10 = 2;  // extra bonus for 10 right in a row
  const AVATARS = ["🦁", "🐼", "🦊", "🐸", "🐵", "🦄", "🐯", "🐧", "🐨", "🐙", "🦖", "🐰"];
  const COLORS = [
    { c: "var(--p1)", soft: "var(--p1-soft)" },
    { c: "var(--p2)", soft: "var(--p2-soft)" },
    { c: "var(--p3)", soft: "var(--p3-soft)" },
    { c: "var(--p4)", soft: "var(--p4-soft)" }
  ];
  // Theme tile colors: "yellow", "coral" or "teal" follow the site's color theme
  const ROLES = ["yellow", "coral", "teal"];
  function tileColors(color) {
    if (ROLES.includes(color)) return `--tcolor:var(--${color});--tsoft:var(--${color}-tint);--ton:var(--on-${color})`;
    return `--tcolor:${color};--tsoft:var(--surface-2);--ton:#1A252C`;
  }
  const LETTERS = ["A", "B", "C", "D", "E", "F"];

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

  /* ======================================================
     Load themes from /themes (JSON)
     themes/themes.json lists the themes. Each theme file is an array of:
       { "Question": "...", "Image": "https://... or empty", "Answer": "...", "Choices": ["...", "..."] }
     True/False questions have two Choices: ["True", "False"].
     ====================================================== */
  let THEMES = [];

  function normalise(raw, theme) {
    if (!raw || typeof raw !== "object") return null;
    const q = typeof raw.Question === "string" ? raw.Question.trim() : "";
    const answer = typeof raw.Answer === "string" ? raw.Answer.trim() : "";
    const choices = Array.isArray(raw.Choices)
      ? [...new Set(raw.Choices.filter((c) => typeof c === "string" && c.trim()).map((c) => c.trim()))]
      : [];
    if (!q || !answer || choices.length < 2 || !choices.includes(answer)) {
      console.warn(`Skipped a question in "${theme.name}" (it needs a Question, an Answer and Choices that include the Answer):`, raw);
      return null;
    }
    const isTF = choices.length === 2 && choices.slice().sort().join() === "False,True";
    const img = typeof raw.Image === "string" ? raw.Image.trim() : "";
    return { q, answer, choices, img, isTF, theme };
  }

  async function loadThemes() {
    const res = await fetch("themes/themes.json", { cache: "no-cache" });
    if (!res.ok) throw new Error("themes.json " + res.status);
    const list = await res.json();
    const loaded = await Promise.all(list.map(async (t) => {
      try {
        const r = await fetch("themes/" + t.file, { cache: "no-cache" });
        if (!r.ok) throw new Error(r.status);
        const raw = await r.json();
        const theme = { id: t.id, name: t.name, emoji: t.emoji || "❓", color: t.color || "teal", imageStyle: t.imageStyle || "" };
        theme.questions = (Array.isArray(raw) ? raw : []).map((x) => normalise(x, theme)).filter(Boolean);
        return theme;
      } catch (e) {
        console.warn("Could not load theme file " + t.file, e);
        return null;
      }
    }));
    return loaded.filter((t) => t && t.questions.length);
  }

  /* ======================================================
     State
     ====================================================== */
  const state = {
    count: 1,
    length: 10,
    selected: new Set(),
    setup: [0, 1, 2, 3].map((i) => ({ name: "", avatar: (i * 3) % AVATARS.length })),
    players: [],
    deck: [],
    turn: 0,          // index into the overall turn order
    current: null,    // current question
    answered: false
  };

  const saved = window.PlayerName && PlayerName.get();
  if (saved) state.setup[0].name = saved;

  /* ======================================================
     Setup screen
     ====================================================== */
  function renderPickers() {
    document.querySelectorAll("#countPicker .count").forEach((b) => b.setAttribute("aria-checked", String(Number(b.dataset.count) === state.count)));
    document.querySelectorAll("#lengthPicker .count").forEach((b) => b.setAttribute("aria-checked", String(Number(b.dataset.len) === state.length)));
  }

  function renderPlayerInputs() {
    let html = "";
    for (let i = 0; i < state.count; i++) {
      const p = state.setup[i];
      html += `
        <div class="player-input" style="--pcolor:${COLORS[i].c};--pcolor-soft:${COLORS[i].soft}">
          <button type="button" class="avatar-btn" data-i="${i}" aria-label="Change picture for player ${i + 1}">${AVATARS[p.avatar]}</button>
          <input type="text" maxlength="30" data-i="${i}" placeholder="Player ${i + 1}" value="${esc(p.name)}" aria-label="Name for player ${i + 1}" autocomplete="off" />
        </div>`;
    }
    $("playerInputs").innerHTML = html;
  }

  function renderThemes() {
    $("themeGrid").innerHTML = THEMES.map((t) => `
      <button type="button" class="theme" data-id="${esc(t.id)}" aria-pressed="${state.selected.has(t.id)}"
        style="${tileColors(t.color)}">
        <span class="emoji" aria-hidden="true">${esc(t.emoji)}</span>
        <span>${esc(t.name)}</span>
        <span class="n">${t.questions.length} questions</span>
      </button>`).join("");
  }

  $("countPicker").addEventListener("click", (e) => {
    const b = e.target.closest(".count"); if (!b) return;
    state.count = Math.min(MAX_PLAYERS, Math.max(1, Number(b.dataset.count)));
    renderPickers(); renderPlayerInputs();
  });
  $("lengthPicker").addEventListener("click", (e) => {
    const b = e.target.closest(".count"); if (!b) return;
    state.length = Number(b.dataset.len);
    renderPickers();
  });
  $("playerInputs").addEventListener("click", (e) => {
    const btn = e.target.closest(".avatar-btn"); if (!btn) return;
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
  $("themeGrid").addEventListener("click", (e) => {
    const b = e.target.closest(".theme"); if (!b) return;
    const id = b.dataset.id;
    if (state.selected.has(id)) state.selected.delete(id); else state.selected.add(id);
    b.setAttribute("aria-pressed", String(state.selected.has(id)));
    $("setupError").classList.add("hidden");
  });
  $("mixAll").addEventListener("click", () => {
    THEMES.forEach((t) => state.selected.add(t.id));
    renderThemes();
    $("setupError").classList.add("hidden");
  });
  $("clearThemes").addEventListener("click", () => { state.selected.clear(); renderThemes(); });
  $("startBtn").addEventListener("click", startGame);

  /* ======================================================
     Game
     ====================================================== */
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function buildDeck() {
    const pool = THEMES.filter((t) => state.selected.has(t.id)).flatMap((t) => t.questions);
    return shuffle(pool);
  }

  function startGame() {
    if (!state.selected.size) {
      $("setupError").textContent = "👆 Pick at least one theme first!";
      $("setupError").classList.remove("hidden");
      $("themeGrid").scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    state.players = state.setup.slice(0, state.count).map((p, i) => ({
      name: (p.name || "").trim() || `Player ${i + 1}`,
      avatar: AVATARS[p.avatar],
      color: COLORS[i],
      score: 0, correct: 0, bonus: 0, streak: 0, best: 0, asked: 0
    }));
    if (window.PlayerName && state.players[0] && (state.setup[0].name || "").trim()) {
      PlayerName.set(state.players[0].name);
    }
    state.deck = buildDeck();
    state.turn = 0;
    showScreen("game");
    $("endBtn").classList.remove("hidden");
    nextQuestion();
  }

  function totalTurns() { return state.length * state.players.length; }
  function currentPlayer() { return state.players[state.turn % state.players.length]; }

  function drawQuestion() {
    if (!state.deck.length) state.deck = buildDeck();
    return state.deck.pop();
  }

  function nextQuestion() {
    stopSpeaking();
    const q = drawQuestion();
    state.current = q;
    state.answered = false;
    const p = currentPlayer();

    renderScoreboard();
    $("themeTag").textContent = `${q.theme.emoji} ${q.theme.name}`;
    $("qCount").textContent = `Question ${p.asked + 1} of ${state.length}`;
    $("turnMsg").innerHTML = state.players.length > 1
      ? `${esc(p.avatar)} <b>${esc(p.name)}</b>, it's your turn!`
      : `${esc(p.avatar)} Go, <b>${esc(p.name)}</b>!`;
    $("questionText").textContent = q.q;

    // picture: the <img> placeholder is shown only when the question has an Image link
    const wrap = $("qImageWrap"), img = $("qImage");
    $("imgError").classList.add("hidden");
    wrap.className = "qimage" + (q.theme.imageStyle ? " " + q.theme.imageStyle : "");
    if (q.img) {
      img.hidden = false;
      img.alt = "Picture for this question";
      img.src = q.img;
      wrap.classList.remove("hidden");
    } else {
      img.hidden = true;
      img.removeAttribute("src");
      img.alt = "";
      wrap.classList.add("hidden");
    }

    // answers
    const choices = q.isTF ? ["True", "False"] : shuffle(q.choices);
    const box = $("answers");
    box.className = "answers" + (q.isTF ? " tf" : "");
    box.innerHTML = choices.map((c, i) => `
      <button type="button" class="answer" data-choice="${esc(c)}">
        <span class="key">${LETTERS[i]}</span><span>${q.isTF ? (c === "True" ? "👍 True" : "👎 False") : esc(c)}</span>
      </button>`).join("");

    $("feedback").classList.add("hidden");
    $("nextBtn").classList.add("hidden");
    preloadNext();
    $("qcard").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function preloadNext() {
    const upcoming = state.deck[state.deck.length - 1];
    if (upcoming && upcoming.img) { const im = new Image(); im.src = upcoming.img; }
  }

  $("qImage").addEventListener("error", () => {
    if (!state.current || !state.current.img) return;
    $("qImage").hidden = true;
    $("imgError").classList.remove("hidden");
  });

  $("skipBtn").addEventListener("click", () => {
    if (state.answered) return;
    nextQuestion(); // same player, a different question; nothing is scored
  });

  $("answers").addEventListener("click", (e) => {
    const btn = e.target.closest(".answer");
    if (!btn || state.answered) return;
    answer(btn.dataset.choice, btn);
  });

  function answer(choice, btn) {
    state.answered = true;
    stopSpeaking();
    const q = state.current;
    const p = currentPlayer();
    const right = choice === q.answer;
    p.asked++;

    document.querySelectorAll(".answer").forEach((b) => {
      b.disabled = true;
      if (b.dataset.choice === q.answer) { b.classList.add("correct"); b.querySelector(".key").textContent = "✓"; }
      else if (b !== btn) b.classList.add("dim");
    });

    let html, bonus = 0;
    if (right) {
      p.score += 1; p.correct += 1; p.streak += 1;
      p.best = Math.max(p.best, p.streak);
      // Streak bonuses repeat every 10: 5 → +1, 10 → +2, 15 → +1, 20 → +2 ...
      if (p.streak % 10 === 5) bonus = STREAK_BONUS_5;
      else if (p.streak % 10 === 0) bonus = STREAK_BONUS_10;
      p.score += bonus; p.bonus += bonus;
      html = `✅ Correct! <b>+1 point</b>`;
      if (bonus) {
        html += `<span class="bonus">🔥 ${p.streak} in a row! +${bonus} bonus point${bonus > 1 ? "s" : ""}!</span>`;
        if (p.streak % 10 === 0) burst(["🔥", "⭐", "🎉"], 30);
      }
      $("feedback").className = "feedback good";
    } else {
      btn.classList.add("wrong");
      btn.querySelector(".key").textContent = "✗";
      const lost = p.streak;
      p.streak = 0;
      html = `❌ Oops! The answer is <b>${esc(q.answer)}</b>.`;
      if (lost >= 2) html += `<br><small>Your ${lost}-answer streak ended.</small>`;
      $("feedback").className = "feedback bad";
    }
    $("feedback").innerHTML = html;
    renderScoreboard(true);

    state.turn++;
    const next = $("nextBtn");
    if (state.turn >= totalTurns()) {
      next.textContent = "See who won! 🏆";
    } else {
      const np = currentPlayer();
      next.textContent = state.players.length > 1 ? `Next: ${np.name} ➜` : "Next question ➜";
    }
    next.classList.remove("hidden");
    next.focus({ preventScroll: true });
  }

  $("nextBtn").addEventListener("click", () => {
    if (state.turn >= totalTurns()) endGame(); else nextQuestion();
  });

  function renderScoreboard(bump) {
    const activeIdx = state.answered ? -1 : state.turn % state.players.length;
    const justPlayed = state.answered ? (state.turn - 1) % state.players.length : -1;
    $("scoreboard").innerHTML = state.players.map((p, i) => `
      <div class="score-chip ${i === activeIdx ? "active" : ""} ${bump && i === justPlayed ? "bump" : ""}"
        style="--pcolor:${p.color.c};--pcolor-soft:${p.color.soft}">
        <span class="av">${esc(p.avatar)}</span>
        <span class="nm">${esc(p.name)}</span>
        <span class="pts">${p.score}</span>
        ${p.streak >= 2 ? `<span class="streak">🔥${p.streak}</span>` : ""}
      </div>`).join("");
  }

  /* ---------- Read aloud ---------- */
  $("speakBtn").addEventListener("click", () => {
    const q = state.current; if (!q || !("speechSynthesis" in window)) return;
    if (window.SiteSound && SiteSound.isMuted()) return;
    const opts = Array.from(document.querySelectorAll(".answer")).map((b) => b.dataset.choice);
    const text = q.isTF ? `${q.q} True or false?` : `${q.q} Is it ${opts.slice(0, -1).join(", ")}, or ${opts[opts.length - 1]}?`;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  });
  function stopSpeaking() { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); }

  /* ======================================================
     End of game
     ====================================================== */
  $("endBtn").addEventListener("click", () => {
    if (confirm("End the quiz now and see the scores?")) endGame();
  });

  function endGame() {
    stopSpeaking();
    $("endBtn").classList.add("hidden");
    showScreen("end");

    const ranked = state.players.slice().sort((a, b) => b.score - a.score || b.correct - a.correct);
    const top = ranked[0].score;
    const winners = ranked.filter((p) => p.score === top);

    if (state.players.length === 1) {
      const p = ranked[0];
      $("trophy").textContent = p.correct >= p.asked * 0.8 ? "🏆" : p.correct >= p.asked / 2 ? "🌟" : "💪";
      $("winnerText").textContent = `Great job, ${p.name}!`;
      $("winnerSub").textContent = `You got ${p.correct} out of ${p.asked} right and scored ${p.score} points.`;
    } else if (winners.length === 1) {
      $("trophy").textContent = "🏆";
      $("winnerText").textContent = `${winners[0].avatar} ${winners[0].name} wins!`;
      $("winnerSub").textContent = `With ${top} point${top === 1 ? "" : "s"}. Well played, everyone!`;
    } else {
      $("trophy").textContent = "🤝";
      $("winnerText").textContent = "It's a tie!";
      $("winnerSub").textContent = `${winners.map((w) => w.name).join(" and ")} both scored ${top} point${top === 1 ? "" : "s"}.`;
    }

    const medals = ["🥇", "🥈", "🥉", "🎖️"];
    let rank = 0;
    $("leaderboard").innerHTML = ranked.map((p, i) => {
      if (i > 0 && p.score < ranked[i - 1].score) rank = i;
      return `
      <li class="${p.score === top ? "win" : ""}" style="--pcolor-soft:${p.color.soft}">
        <span class="medal">${medals[rank] || ""}</span>
        <span class="av">${esc(p.avatar)}</span>
        <span class="who"><b>${esc(p.name)}</b>
          <small>${p.correct}/${p.asked} right · ${p.bonus} bonus · best streak ${p.best}</small></span>
        <span class="total">${p.score} pts</span>
      </li>`;
    }).join("");

    burst(["🎉", "⭐", "🏆", "🎊", "✨"], 50);
  }

  function burst(emojis, n) {
    const box = $("confetti");
    for (let i = 0; i < n; i++) {
      const s = document.createElement("span");
      s.textContent = emojis[i % emojis.length];
      s.style.left = Math.random() * 100 + "vw";
      s.style.animationDuration = 2 + Math.random() * 2.5 + "s";
      s.style.animationDelay = Math.random() * 0.8 + "s";
      box.appendChild(s);
      setTimeout(() => s.remove(), 5500);
    }
  }

  $("againBtn").addEventListener("click", startGame);
  $("changeBtn").addEventListener("click", () => { showScreen("setup"); renderPlayerInputs(); });

  function showScreen(name) {
    ["setup", "game", "end"].forEach((s) => $(s).classList.toggle("hidden", s !== name));
    window.scrollTo({ top: 0 });
  }

  /* ---------- init ---------- */
  renderPickers();
  renderPlayerInputs();
  $("startBtn").disabled = true;
  loadThemes().then((themes) => {
    THEMES = themes;
    if (!THEMES.length) throw new Error("no themes");
    renderThemes();
    $("startBtn").disabled = false;
  }).catch((e) => {
    console.error(e);
    $("themeGrid").innerHTML = `<p class="setup-error">😕 The quiz questions couldn't load.<br>
      Open the game from its website (GitHub Pages) or a local web server. Opening the file directly from your computer won't load the questions.</p>`;
  });
})();
