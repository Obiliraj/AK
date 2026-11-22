/*
  ⚙️ Settings menu, shown at the top right of every page.
  One place for: Sound on/off (SiteSound), Christmas music on/off (SiteMusic) and the color theme (SiteTheme).
  The button goes into the page's element with [data-settings-slot]; without one it floats at the top right.
  Load at the end of <body>, after theme.js, sound.js and music.js. Styles: "Settings menu" in assets/portal.css.
*/
(function () {
  if (!window.SiteTheme || !window.SiteSound) return;

  // ---------- The ⚙️ button ----------
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn ghost small settings-btn";
  btn.setAttribute("aria-haspopup", "dialog");
  btn.setAttribute("aria-label", "Settings");
  btn.innerHTML = '<span aria-hidden="true">⚙️</span> <span class="lbl">Settings</span>';
  const slot = document.querySelector("[data-settings-slot]");
  if (slot) slot.appendChild(btn);
  else { btn.classList.add("floating"); document.body.appendChild(btn); }

  // ---------- The dialog ----------
  const overlay = document.createElement("div");
  overlay.className = "set-overlay";
  overlay.hidden = true;
  overlay.innerHTML =
    '<div class="set-box" role="dialog" aria-modal="true" aria-labelledby="setTitle">' +
      '<button type="button" class="set-close" aria-label="Close settings">✕</button>' +
      '<h2 id="setTitle">⚙️ Settings</h2>' +
      '<div class="set-row">' +
        '<div class="set-text"><b>🔊 Sound</b><span>Game sounds and "Read it to me", in every game.</span></div>' +
        '<button type="button" class="set-switch" role="switch" data-set="sound"><span class="knob"></span></button>' +
      '</div>' +
      '<div class="set-row">' +
        '<div class="set-text"><b>🎵 Christmas music</b><span class="set-note" data-note="music"></span></div>' +
        '<button type="button" class="set-switch" role="switch" data-set="music"><span class="knob"></span></button>' +
      '</div>' +
      '<h3>🎨 Color theme</h3>' +
      '<div class="set-grid" role="group" aria-label="Color theme"></div>' +
      '<button type="button" class="btn yellow set-done">✅ Done</button>' +
    '</div>';
  document.body.appendChild(overlay);

  const $ = (sel) => overlay.querySelector(sel);
  const soundSw = $('[data-set="sound"]');
  const musicSw = $('[data-set="music"]');
  const grid = $(".set-grid");

  function setSwitch(sw, on, label) {
    sw.setAttribute("aria-checked", String(on));
    sw.setAttribute("aria-label", label + (on ? ": on" : ": off"));
    sw.dataset.state = on ? "on" : "off";
  }

  function render() {
    const muted = SiteSound.isMuted();
    setSwitch(soundSw, !muted, "Sound");

    const music = window.SiteMusic;
    const musicOn = music ? music.enabled() : false;
    setSwitch(musicSw, musicOn, "Christmas music");
    let note = "Jingle Bells plays in the background.";
    if (!music) note = "Not available on this page.";
    else if (!music.isChristmas()) note = "Plays with the 🎄 Christmas theme. Pick it below!";
    else if (muted) note = "Turn Sound on to hear it.";
    else if (musicOn) note = "🎶 Jingle Bells is playing.";
    $('[data-note="music"]').textContent = note;
    musicSw.disabled = !music;

    const current = SiteTheme.get();
    grid.innerHTML = "";
    SiteTheme.list.forEach((t) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "set-card";
      b.setAttribute("aria-pressed", String(t.id === current));
      const name = document.createElement("span");
      name.textContent = t.emoji + " " + t.name;
      const sw = document.createElement("span");
      sw.className = "swatch";
      sw.setAttribute("aria-hidden", "true");
      t.swatch.forEach((c) => { const x = document.createElement("span"); x.style.background = c; sw.appendChild(x); });
      b.append(name, sw);
      b.addEventListener("click", () => {
        SiteTheme.set(t.id);
        if (window.SiteMusic) SiteMusic.update();       // Christmas music starts or stops with the theme
        render();
        const again = grid.querySelector('[aria-pressed="true"]');
        if (again) again.focus();
      });
      grid.appendChild(b);
    });
  }

  soundSw.addEventListener("click", () => { SiteSound.toggle(); render(); });
  musicSw.addEventListener("click", () => {
    if (!window.SiteMusic) return;
    SiteMusic.setEnabled(!SiteMusic.enabled());
    render();
  });
  SiteSound.onChange(() => { if (!overlay.hidden) render(); });

  function open() {
    render();
    overlay.hidden = false;
    document.body.classList.add("set-open");
    $(".set-close").focus();
  }
  function close() {
    overlay.hidden = true;
    document.body.classList.remove("set-open");
    btn.focus();
  }
  btn.addEventListener("click", open);
  $(".set-close").addEventListener("click", close);
  $(".set-done").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  document.addEventListener("keydown", (e) => {
    if (overlay.hidden) return;
    if (e.key === "Escape") { e.stopPropagation(); close(); }
    if (e.key === "Tab") {                                   // keep keyboard focus inside the dialog
      const items = Array.from(overlay.querySelectorAll("button:not([disabled])"));
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, true);
})();
