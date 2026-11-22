/*
  Background music: "Jingle Bells" (traditional, public domain), played with the Web Audio API,
  so there is no audio file. It plays only when ALL of these are true:
    - the color theme is Christmas,
    - sound is on (SiteSound, assets/sound.js),
    - music is on (Settings → Music, localStorage "kgz.music", on by default),
    - the page is visible, and the player has tapped or pressed a key once (browsers block sound before that).
  The song position is kept in sessionStorage, so it carries on when moving to another page.
  Load on every page after theme.js and sound.js (at the end of <body>).
*/
window.SiteMusic = (function () {
  const KEY = "kgz.music";
  const POS_KEY = "kgz.musicPos";
  const BPM = 126;
  const SPB = 60 / BPM;            // seconds per beat
  const LOOKAHEAD = 0.3;           // schedule notes this far ahead (s)
  const VOLUME = 0.55;             // master volume (the notes themselves are quiet)

  // ---------- The song (MIDI note numbers, length in beats; null = rest) ----------
  const VERSE = [
    [62, 1], [71, 1], [69, 1], [67, 1], [62, 3], [62, .5], [62, .5],
    [62, 1], [71, 1], [69, 1], [67, 1], [64, 4],
    [64, 1], [72, 1], [71, 1], [69, 1], [66, 4],
    [74, 1], [74, 1], [72, 1], [69, 1], [71, 4],
    [62, 1], [71, 1], [69, 1], [67, 1], [62, 4],
    [62, 1], [71, 1], [69, 1], [67, 1], [64, 3], [64, 1],
    [64, 1], [72, 1], [71, 1], [69, 1], [74, 1], [74, 1], [74, 1], [74, 1],
    [76, 1], [74, 1], [72, 1], [69, 1], [67, 3], [null, 1]
  ];
  const CHORUS_A = [
    [71, 1], [71, 1], [71, 2], [71, 1], [71, 1], [71, 2],
    [71, 1], [74, 1], [67, 1.5], [69, .5], [71, 4],
    [72, 1], [72, 1], [72, 1.5], [72, .5], [72, 1], [71, 1], [71, 1], [71, .5], [71, .5]
  ];
  const CHORUS = CHORUS_A.concat(
    [[71, 1], [69, 1], [69, 1], [71, 1], [69, 2], [74, 2]],
    CHORUS_A,
    [[74, 1], [74, 1], [72, 1], [69, 1], [67, 4]]
  );
  const MELODY = VERSE.concat(CHORUS, [[null, 4]]);
  // Bass root for each bar (4 beats): G = 43, C = 48, D = 50
  const BASS = [43, 43, 43, 48, 48, 50, 50, 43, 43, 43, 43, 48, 48, 50, 50, 43,
                43, 43, 43, 43, 48, 43, 50, 50, 43, 43, 43, 43, 48, 43, 50, 43, 43];

  // Flatten everything into one timeline of events
  const EVENTS = [];
  let beat = 0;
  MELODY.forEach(([note, len]) => {
    if (note !== null) EVENTS.push({ beat: beat, kind: "melody", note: note, len: len });
    beat += len;
  });
  const LOOP_BEATS = beat;
  BASS.forEach((root, bar) => {
    EVENTS.push({ beat: bar * 4, kind: "bass", note: root, len: 1.5 });
    EVENTS.push({ beat: bar * 4 + 2, kind: "bass", note: root + 7, len: 1.5 });
  });
  for (let b = 0; b < LOOP_BEATS - 4; b++) EVENTS.push({ beat: b, kind: "bell", accent: b % 2 === 0 });
  EVENTS.sort((a, b) => a.beat - b.beat);

  const freq = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // ---------- Settings ----------
  function enabled() {
    try { return localStorage.getItem(KEY) !== "0"; } catch (e) { return true; }
  }
  function setEnabled(on) {
    try { localStorage.setItem(KEY, on ? "1" : "0"); } catch (e) { /* storage blocked */ }
    update();
  }
  function isChristmas() {
    return window.SiteTheme ? SiteTheme.get() === "christmas" : false;
  }
  function shouldPlay() {
    const muted = window.SiteSound ? SiteSound.isMuted() : false;
    return isChristmas() && !muted && enabled() && document.visibilityState !== "hidden";
  }

  // ---------- Playback ----------
  let ctx = null, master = null, noise = null;
  let timer = null, idx = 0, loopStart = 0, playing = false, unlocked = false;

  function setup() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      // short burst of white noise for the sleigh bells
      noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.25), ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return true;
    } catch (e) { ctx = null; return false; }
  }

  function tone(type, f, t, len, vol) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + len + 0.05);
  }

  function play(ev, t) {
    if (ev.kind === "melody") {
      const len = Math.max(0.3, ev.len * SPB * 0.95);
      tone("triangle", freq(ev.note), t, len, 0.16);
      tone("sine", freq(ev.note) * 2, t, len * 0.6, 0.05);     // a little bell shimmer
    } else if (ev.kind === "bass") {
      tone("triangle", freq(ev.note), t, ev.len * SPB, 0.12);
    } else {
      const src = ctx.createBufferSource();
      src.buffer = noise;
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 7000;
      const g = ctx.createGain();
      const v = ev.accent ? 0.05 : 0.03;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      src.connect(hp).connect(g).connect(master);
      src.start(t);
      src.stop(t + 0.2);
    }
  }

  function tick() {
    const now = ctx.currentTime;
    for (;;) {
      const ev = EVENTS[idx];
      const t = loopStart + ev.beat * SPB;
      if (t > now + LOOKAHEAD) break;
      if (t >= now - 0.05) play(ev, t);
      idx++;
      if (idx >= EVENTS.length) { idx = 0; loopStart += LOOP_BEATS * SPB; }
    }
  }

  function position() {
    if (!ctx || !playing) return 0;
    const b = (ctx.currentTime - loopStart) / SPB;
    return ((b % LOOP_BEATS) + LOOP_BEATS) % LOOP_BEATS;
  }
  function savePosition() {
    if (!playing) return;
    try { sessionStorage.setItem(POS_KEY, String(position())); } catch (e) { /* ignore */ }
  }
  function savedPosition() {
    try {
      const p = Number(sessionStorage.getItem(POS_KEY));
      return Number.isFinite(p) && p >= 0 && p < LOOP_BEATS ? p : 0;
    } catch (e) { return 0; }
  }

  function start() {
    if (playing || !setup()) return;
    if (ctx.state === "suspended") ctx.resume();
    const from = savedPosition();
    loopStart = ctx.currentTime + 0.15 - from * SPB;
    idx = EVENTS.findIndex((e) => e.beat >= from);
    if (idx < 0) { idx = 0; loopStart += LOOP_BEATS * SPB; }
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(0.0001, ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(VOLUME, ctx.currentTime + 1);   // gentle fade-in
    playing = true;
    timer = setInterval(tick, 100);
    tick();
  }

  function stop() {
    if (!playing) return;
    savePosition();
    playing = false;
    clearInterval(timer);
    timer = null;
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(0, t + 0.3);
    setTimeout(() => { if (!playing && ctx) ctx.suspend(); }, 400);
  }

  function update() {
    if (shouldPlay() && unlocked) start();
    else stop();
  }

  // Browsers only allow sound after the player has tapped or pressed a key on the page.
  function unlock() {
    if (unlocked) return;
    unlocked = true;
    ["pointerdown", "keydown", "touchend"].forEach((ev) => document.removeEventListener(ev, unlock, true));
    update();
  }
  ["pointerdown", "keydown", "touchend"].forEach((ev) => document.addEventListener(ev, unlock, true));

  document.addEventListener("visibilitychange", update);
  window.addEventListener("pagehide", savePosition);
  if (window.SiteSound) SiteSound.onChange(update);
  window.addEventListener("storage", (e) => { if (e.key === KEY) update(); });

  return {
    enabled: enabled,
    setEnabled: setEnabled,
    isChristmas: isChristmas,
    isPlaying: () => playing,
    update: update
  };
})();
