/*
  City skyline background (HTML + CSS).
  Builds a row of far buildings and a row of near buildings with apartment
  windows at the bottom of the page, behind all content. Colors come from
  the active theme (see the "Skyline" variables in assets/portal.css).

  Window lights: every 5–10 seconds (random), ONE lit apartment switches off
  and ONE dark apartment switches on, so the lights slowly wander around the
  city instead of all changing at once. They are most visible in the
  Christmas theme, which shows the city at night.
*/
(function () {
  if (document.querySelector(".skyline")) return;

  // Small seeded random generator so the skyline looks the same on every page
  let seed = 20261225;
  const rand = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  const between = (a, b) => a + rand() * (b - a);

  const WIDTH = 2400;          // enough buildings for very wide screens (extra is hidden)
  const WINDOW_ROWS_MAX = 18;  // enough rows for the tallest building
  const LIT_SHARE = 0.18;      // about 18% of apartments start with their light on

  const sky = document.createElement("div");
  sky.className = "skyline";
  sky.setAttribute("aria-hidden", "true");

  const moon = document.createElement("div");
  moon.className = "skyline-moon";
  sky.appendChild(moon);

  // ---- far row: plain silhouettes ----
  const far = document.createElement("div");
  far.className = "skyline-row skyline-far";
  for (let x = 0; x < WIDTH; ) {
    const w = Math.round(between(50, 130));
    const b = document.createElement("div");
    b.className = "bld";
    b.style.width = w + "px";
    b.style.height = Math.round(between(45, 92)) + "%";
    if (rand() < 0.25) b.classList.add("spire");
    far.appendChild(b);
    x += w;
  }
  sky.appendChild(far);

  // ---- near row: buildings with apartment windows ----
  const near = document.createElement("div");
  near.className = "skyline-row skyline-near";
  const windows = [];
  for (let x = 0; x < WIDTH; ) {
    const w = Math.round(between(46, 120));
    const gap = Math.round(between(0, 14));
    const b = document.createElement("div");
    b.className = "bld";
    b.style.width = w + "px";
    b.style.marginRight = gap + "px";
    b.style.height = Math.round(between(28, 78)) + "%";
    const roll = rand();
    if (roll < 0.18) b.classList.add("antenna");
    else if (roll < 0.32) b.classList.add("stepped");
    if (rand() < 0.22) b.classList.add("festive"); // string lights on the roof (Christmas only)

    const grid = document.createElement("div");
    grid.className = "wins";
    const cols = Math.max(2, Math.floor((w - 12) / 13));
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    for (let i = 0; i < cols * WINDOW_ROWS_MAX; i++) {
      const win = document.createElement("span");
      win.className = "win";
      if (rand() < LIT_SHARE) win.classList.add("on");
      grid.appendChild(win);
      windows.push(win);
    }
    b.appendChild(grid);
    near.appendChild(b);
    x += w + gap;
  }
  sky.appendChild(near);

  document.body.prepend(sky);

  // ---- wandering lights: one change at a time, every 5–10 s ----
  // Only count windows that are actually on screen, so a change can be seen.
  function visible(win) {
    const r = win.getBoundingClientRect();
    return r.width > 0 && r.right > 0 && r.left < window.innerWidth && r.top < window.innerHeight && r.bottom > 0;
  }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

  function moveOneLight() {
    const onScreen = windows.filter(visible);
    const lit = onScreen.filter((w) => w.classList.contains("on"));
    const dark = onScreen.filter((w) => !w.classList.contains("on"));
    if (lit.length && dark.length) {
      const off = pick(lit);
      off.classList.remove("on");
      // a moment later, a different apartment switches on
      setTimeout(() => pick(dark).classList.add("on"), 700);
    }
    schedule();
  }
  function schedule() {
    const delay = 5000 + Math.random() * 5000; // random 5 to 10 seconds
    setTimeout(moveOneLight, delay);
  }
  schedule();
})();
