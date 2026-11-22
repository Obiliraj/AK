'use strict';
{
/* =========================================================
   Sunny Scoops – a shopkeeper money game (Australian dollars)
   Game logic is described in README.md.
   All amounts are stored in CENTS (whole numbers) to avoid
   floating-point rounding problems.
   ========================================================= */

// ---------- Settings you can change ----------
const START_FLOAT = 2000;        // $20 in the register at the start of each day
const PROFIT_RATE = 0.10;        // shopkeeper keeps 10% of each sale
const SORRY_FINE = 100;          // $1 fine for giving too little change
const CUSTOMERS_PER_DAY = 8;

// Optional: use your own photos of Australian money.
// Put image files in an "images" folder next to index.html and list them here, e.g.
//   2000: 'images/20-dollars.png',  50: 'images/50-cents.png'
// Any value left out is drawn automatically.
const CURRENCY_IMAGES = {
  // 5000: 'images/50-dollars.png',
  // 2000: 'images/20-dollars.png',
  // 1000: 'images/10-dollars.png',
  // 500:  'images/5-dollars.png',
  // 200:  'images/2-dollars.png',
  // 100:  'images/1-dollar.png',
  // 50:   'images/50-cents.png',
  // 20:   'images/20-cents.png',
  // 10:   'images/10-cents.png',
  // 5:    'images/5-cents.png',
};

// ---------- Menu ----------
const FLAVOURS = [
  { id: 'choc',   name: 'Chocolate',       color: '#6b3e26' },
  { id: 'van',    name: 'Vanilla',         color: '#f6e7b4' },
  { id: 'straw',  name: 'Strawberry',      color: '#f49ac1' },
  { id: 'mint',   name: 'Mint choc chip',  color: '#9fe2bf' },
  { id: 'mango',  name: 'Mango',           color: '#ffb347' },
  { id: 'cookie', name: 'Cookies & cream', color: '#d9d4cc' },
  { id: 'bubble', name: 'Bubblegum',       color: '#7ec8e3' },
];
const SCOOPS = {
  single: { label: 'single scoop', price: 350 },
  double: { label: 'double scoop', price: 550 },
};
const ITEMS = [
  { id: 'donut',      group: 'Bakery', name: 'Donut',               price: 250, art: 'donut' },
  { id: 'bread',      group: 'Bakery', name: 'Banana bread',        price: 380, art: 'bread' },
  { id: 'ginger',     group: 'Bakery', name: 'Gingerbread man',     price: 225, art: 'ginger' },
  { id: 'cookie',     group: 'Bakery', name: 'Choc chip cookie',    price: 145, art: 'cookie' },
  { id: 'muffin',     group: 'Bakery', name: 'Blueberry muffin',    price: 320, art: 'muffin' },
  { id: 'lamington',  group: 'Bakery', name: 'Lamington',           price: 280, art: 'lamington' },
  { id: 'water',      group: 'Drinks', name: 'Water bottle',        price: 195, art: 'water' },
  { id: 'apple',      group: 'Drinks', name: 'Apple juice',         price: 300, art: 'juice', color: '#d8e35a' },
  { id: 'orange',     group: 'Drinks', name: 'Orange juice',        price: 320, art: 'juice', color: '#ffa630' },
  { id: 'mangoj',     group: 'Drinks', name: 'Mango juice',         price: 340, art: 'juice', color: '#ffc93c' },
  { id: 'watermelon', group: 'Drinks', name: 'Watermelon juice',    price: 360, art: 'juice', color: '#ff6f7d' },
  { id: 'shake',      group: 'Drinks', name: 'Strawberry milkshake',price: 450, art: 'shake' },
];

const LEVELS = {
  easy:   { lines: [1, 2], doubleQty: 0 },
  medium: { lines: [2, 3], doubleQty: 0.3 },
  hard:   { lines: [3, 4], doubleQty: 0.45 },
};

const NAMES = ['Mia','Jack','Aria','Noah','Isla','Leo','Zara','Oliver','Priya','Kai','Ruby','Arjun','Lily','Mateo','Chloe','Ethan','Aisha','Lucas','Mei','Harper','Sam','Ava','Hamish','Yuki'];
const SKINS = ['#f9d7b9','#eec19b','#d9a074','#b97a4e','#8d5a3b','#6b4128'];
const HAIRS = ['#2b1b12','#5a3720','#a0612b','#e2b04a','#1a1a1a','#c2452d'];
const SHIRTS = ['#e8457a','#13707d','#ffc93c','#7b5cd6','#2e9e5b','#ff8a3d','#3a86ff'];
const GREETINGS = ['Hi! Can I please have:', "G'day! I'd like:", 'Hello! Can I get:', 'Hi there! I want:', 'Yum! Can I please get:'];

// ---------- Money ----------
const TILL = [2000, 1000, 500, 200, 100, 50, 20, 10, 5];
const ALL_DENOMS = [5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5];
const NOTE_STYLE = {
  500:  { light: '#f6cde4', base: '#c47bb8', dark: '#5e2a5b' },
  1000: { light: '#b4dcf7', base: '#2f7fd1', dark: '#123f6e' },
  2000: { light: '#f9bf9e', base: '#d9533b', dark: '#6f1f11' },
  5000: { light: '#fcebb0', base: '#e2b21f', dark: '#6a4d00' },
};
// Real coin diameters in millimetres, so sizes compare like real coins
const COIN_STYLE = {
  200: { mm: 20.5, metal: 'gold' },
  100: { mm: 25.0, metal: 'gold' },
  50:  { mm: 31.5, metal: 'silver', twelve: true },
  20:  { mm: 28.5, metal: 'silver' },
  10:  { mm: 23.6, metal: 'silver' },
  5:   { mm: 19.4, metal: 'silver' },
};
const SIZES = { till: { note: 118, mm: 2.4 }, paid: { note: 124, mm: 2.4 }, tray: { note: 92, mm: 1.8 } };

// ---------- Helpers ----------
const $ = (id) => document.getElementById(id);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const sum = (a) => a.reduce((s, x) => s + x, 0);
const fmt = (c) => (c < 0 ? '−' : '') + '$' + (Math.abs(c) / 100).toFixed(2);
const signed = (c) => (c >= 0 ? '+' : '−') + '$' + (Math.abs(c) / 100).toFixed(2);
const denomLabel = (c) => (c >= 100 ? '$' + c / 100 : c + 'c');
const nextMultiple = (x, m) => Math.floor(x / m) * m + m;

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * (1 + amt))));
  return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(f).map((v) => v.toString(16).padStart(2, '0')).join('');
}

// ---------- Drawn pictures ----------
function sprite(body) { return `<svg class="sprite" viewBox="0 0 64 64" aria-hidden="true">${body}</svg>`; }

function coneArt(color, scoops) {
  const s = shade(color, -0.25);
  const cone = '<path d="M19 33 L32 62 L45 33Z" fill="#e3a659" stroke="#b5762c" stroke-width="2" stroke-linejoin="round"/><path d="M23 39 L41 39 M26 46 L38 46 M29 53 L35 53 M25 35 L36 58 M39 35 L28 58" stroke="#b5762c" stroke-width="1.4"/>';
  const scoop = (cy, r) => `<circle cx="32" cy="${cy}" r="${r}" fill="${color}" stroke="${s}" stroke-width="2"/><ellipse cx="${32 - r / 2.6}" cy="${cy - r / 2.4}" rx="${r / 3.6}" ry="${r / 5}" fill="#fff" opacity=".55"/>`;
  return sprite(cone + (scoops === 2 ? scoop(27, 12) + scoop(13, 11) : scoop(23, 14)));
}

const ART = {
  donut: () => sprite('<path fill-rule="evenodd" d="M32 9a24 24 0 1 0 .01 0Z M32 25a8 8 0 1 0 .01 0Z" fill="#e2a65c" stroke="#b5762c" stroke-width="2" transform="translate(0 2)"/><path fill-rule="evenodd" d="M32 13a20 18 0 1 0 .01 0Z M32 26a10 9 0 1 0 .01 0Z" fill="#f78fb3" transform="translate(0 2)"/>' +
    [[22,20,'#fff'],[40,18,'#ffc93c'],[46,32,'#7ec8e3'],[18,34,'#fff'],[28,46,'#7ec8e3'],[42,44,'#ffc93c']].map(([x,y,c])=>`<rect x="${x}" y="${y}" width="5" height="2" rx="1" fill="${c}" transform="rotate(${x*7} ${x} ${y})"/>`).join('')),
  bread: () => sprite('<rect x="7" y="22" width="50" height="34" rx="9" fill="#a8652f" stroke="#76421b" stroke-width="2"/><path d="M9 30 Q32 10 55 30" fill="#c27a3a" stroke="#76421b" stroke-width="2"/><path d="M22 26 V54 M34 24 V54 M46 26 V54" stroke="#76421b" stroke-width="1.5" opacity=".5"/><ellipse cx="32" cy="22" rx="12" ry="4" fill="#f7e48b" stroke="#c9a73a" stroke-width="1.5"/>'),
  ginger: () => sprite('<g fill="#c27a3a" stroke="#8a4f1f" stroke-width="2" stroke-linejoin="round"><path d="M32 4a9 9 0 1 1-.01 0Z M24 21h16l14 8-3 6-11-4v9l9 15-6 4-9-12-9 12-6-4 9-15v-9l-11 4-3-6Z"/></g><g fill="#fff"><circle cx="28.5" cy="12" r="1.6"/><circle cx="35.5" cy="12" r="1.6"/><circle cx="32" cy="29" r="2"/><circle cx="32" cy="36" r="2"/></g><path d="M28 16 Q32 19 36 16" stroke="#fff" stroke-width="1.6" fill="none"/>'),
  cookie: () => sprite('<circle cx="32" cy="33" r="23" fill="#d9a05b" stroke="#a26a2c" stroke-width="2"/>' + [[24,24],[38,22],[44,36],[30,40],[20,36],[36,48]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="3.2" fill="#4a2b1b"/>`).join('')),
  muffin: () => sprite('<path d="M15 34 H49 L44 59 H20Z" fill="#7ec8e3" stroke="#3f8ea8" stroke-width="2" stroke-linejoin="round"/><path d="M24 36 L26 58 M32 36 V58 M40 36 L38 58" stroke="#3f8ea8" stroke-width="1.5"/><path d="M11 36 Q12 12 32 11 Q52 12 53 36Z" fill="#d79a55" stroke="#9a6128" stroke-width="2"/>' + [[22,26],[34,19],[42,28],[30,30],[19,33],[45,34]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="3" fill="#4b4fa8"/>`).join('')),
  lamington: () => sprite('<path d="M10 24 L22 14 H54 L42 24Z" fill="#8a5636" stroke="#4e2c17" stroke-width="2" stroke-linejoin="round"/><path d="M42 24 L54 14 V44 L42 54Z" fill="#5b3420" stroke="#4e2c17" stroke-width="2" stroke-linejoin="round"/><rect x="10" y="24" width="32" height="30" fill="#6b3e26" stroke="#4e2c17" stroke-width="2"/>' + [[15,29],[22,35],[30,30],[36,40],[17,45],[27,48],[35,50],[25,19],[38,18],[47,22],[48,34]].map(([x,y])=>`<rect x="${x}" y="${y}" width="3" height="1.6" rx=".8" fill="#fff" opacity=".9"/>`).join('')),
  water: () => sprite('<rect x="26" y="4" width="12" height="7" rx="2" fill="#13707d"/><path d="M24 11 H40 V16 Q46 20 46 27 V56 Q46 60 42 60 H22 Q18 60 18 56 V27 Q18 20 24 16Z" fill="#cdeffa" stroke="#4fa6bf" stroke-width="2"/><rect x="18" y="32" width="28" height="12" fill="#13707d"/><path d="M24 22 V28 M24 48 V54" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>'),
  juice: (c) => sprite(`<path d="M38 2 L32 26" stroke="#e8457a" stroke-width="3" stroke-linecap="round"/><path d="M16 16 H48 L44 60 H20Z" fill="#eef8fb" stroke="#8fb8c4" stroke-width="2" stroke-linejoin="round"/><path d="M18.5 26 H45.5 L44 58 H20Z" fill="${c}"/><circle cx="48" cy="17" r="7" fill="${shade(c, -0.15)}" stroke="#fff" stroke-width="2"/><path d="M23 30 V50" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".6"/>`),
  shake: () => sprite('<path d="M40 0 L33 20" stroke="#13707d" stroke-width="3" stroke-linecap="round"/><path d="M17 20 H47 L43 61 H21Z" fill="#f49ac1" stroke="#c75d8a" stroke-width="2" stroke-linejoin="round"/><path d="M14 22 Q14 12 22 13 Q24 6 32 8 Q40 6 42 13 Q50 12 50 22Z" fill="#fff" stroke="#e3d5cf" stroke-width="2"/><circle cx="33" cy="7" r="5" fill="#d7263d"/><path d="M33 3 Q36 -2 40 -1" stroke="#2e9e5b" stroke-width="1.6" fill="none"/>'),
};

function itemArt(line) {
  if (line.kind === 'ice') return coneArt(line.flavour.color, line.scoop === 'double' ? 2 : 1);
  const it = line.item;
  return ART[it.art](it.color);
}

function kidSVG(look, mood = 'happy', cls = '') {
  const { skin, hair, shirt, style } = look;
  const hairD = 'M25 58 C22 20 98 20 95 58 C88 40 74 34 60 36 C46 34 32 40 25 58Z';
  let hairArt = '';
  if (style === 0) hairArt = `<path d="${hairD}" fill="${hair}"/>`;
  if (style === 1) hairArt = `<circle cx="22" cy="62" r="11" fill="${hair}"/><circle cx="98" cy="62" r="11" fill="${hair}"/><path d="${hairD}" fill="${hair}"/>`;
  if (style === 2) hairArt = [200, 225, 250, 275, 300, 325, 345, 185].map((a) => {
    const r = (a * Math.PI) / 180; return `<circle cx="${60 + 33 * Math.cos(r)}" cy="${56 + 33 * Math.sin(r)}" r="13" fill="${hair}"/>`; }).join('');
  if (style === 3) hairArt = `<path d="${hairD}" fill="${hair}"/><path d="M27 46 C30 14 90 14 93 46Z" fill="${shirt}"/><rect x="58" y="40" width="44" height="8" rx="4" fill="${shade(shirt, -0.25)}"/>`;
  const mouth = {
    happy: '<path d="M48 74 Q60 86 72 74" stroke="#5a2a1a" stroke-width="3.5" fill="#fff" stroke-linecap="round"/>',
    sad: '<path d="M49 81 Q60 71 71 81" stroke="#5a2a1a" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
    wow: '<ellipse cx="60" cy="77" rx="6" ry="8" fill="#5a2a1a"/>',
    wait: '<path d="M51 76 Q60 81 69 76" stroke="#5a2a1a" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
  }[mood];
  const brows = mood === 'sad' ? '<path d="M40 48 L52 52 M80 48 L68 52" stroke="#3b2416" stroke-width="3" stroke-linecap="round"/>' : '';
  return `<svg class="${cls}" viewBox="0 0 120 136" aria-hidden="true">
    <path d="M20 136 C20 104 40 94 60 94 C80 94 100 104 100 136Z" fill="${shirt}"/>
    <rect x="52" y="82" width="16" height="16" rx="6" fill="${shade(skin, -0.08)}"/>
    ${style === 2 ? hairArt : ''}
    <circle cx="60" cy="58" r="33" fill="${skin}"/>
    <circle cx="27" cy="62" r="6" fill="${skin}"/><circle cx="93" cy="62" r="6" fill="${skin}"/>
    ${style !== 2 ? hairArt : ''}
    <circle cx="48" cy="60" r="4.2" fill="#2b1b12"/><circle cx="72" cy="60" r="4.2" fill="#2b1b12"/>
    <circle cx="49.4" cy="58.6" r="1.3" fill="#fff"/><circle cx="73.4" cy="58.6" r="1.3" fill="#fff"/>
    <ellipse cx="40" cy="71" rx="6" ry="3.5" fill="#ff7a8a" opacity=".45"/><ellipse cx="80" cy="71" rx="6" ry="3.5" fill="#ff7a8a" opacity=".45"/>
    ${brows}${mouth}
  </svg>`;
}

function noteSVG(c) {
  const n = NOTE_STYLE[c], v = c / 100, id = 'n' + c;
  return `<svg viewBox="0 0 140 70" role="img" aria-label="${v} dollar note">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${n.light}"/><stop offset=".55" stop-color="${n.base}"/><stop offset="1" stop-color="${shade(n.base, -0.15)}"/></linearGradient></defs>
    <rect x="1" y="1" width="138" height="68" rx="6" fill="url(#${id})" stroke="${n.dark}" stroke-width="1.5"/>
    <path d="M40 58 C60 40 80 64 100 46 S128 40 136 30" stroke="${n.light}" stroke-width="5" fill="none" opacity=".5"/>
    <rect x="8" y="8" width="24" height="54" rx="5" fill="#eaf8ff" fill-opacity=".85" stroke="${n.dark}" stroke-opacity=".35"/>
    <path d="M20 22 l3 6 6 1-4.5 4 1 6.5-5.5-3-5.5 3 1-6.5-4.5-4 6-1Z" fill="none" stroke="${n.dark}" stroke-opacity=".5" stroke-width="1.2"/>
    <text x="20" y="54" text-anchor="middle" font-family="Fredoka,sans-serif" font-size="10" font-weight="700" fill="${n.dark}" fill-opacity=".6">${v}</text>
    <circle cx="86" cy="36" r="19" fill="${n.dark}" fill-opacity=".14"/>
    ${[0, 60, 120, 180, 240, 300].map((a) => `<circle cx="${86 + 11 * Math.cos(a * Math.PI / 180)}" cy="${36 + 11 * Math.sin(a * Math.PI / 180)}" r="4" fill="${n.light}" fill-opacity=".8"/>`).join('')}
    <circle cx="86" cy="36" r="4.5" fill="${n.light}"/>
    <text x="40" y="16" font-family="Nunito,sans-serif" font-size="7.5" font-weight="800" letter-spacing="1.4" fill="${n.dark}">AUSTRALIA</text>
    <text x="132" y="25" text-anchor="end" font-family="Fredoka,sans-serif" font-size="21" font-weight="700" fill="${n.dark}">$${v}</text>
    <text x="132" y="62" text-anchor="end" font-family="Fredoka,sans-serif" font-size="12" font-weight="700" fill="#fff">${v}</text>
  </svg>`;
}

function coinSVG(c) {
  const s = COIN_STYLE[c];
  const g = s.metal === 'gold' ? ['#fff4bf', '#e9be4f', '#a7741d'] : ['#ffffff', '#d2d9de', '#8e989f'];
  const id = 'c' + s.metal;
  const label = denomLabel(c);
  let shape;
  if (s.twelve) {
    const pts = Array.from({ length: 12 }, (_, i) => { const a = (i * 30 + 15) * Math.PI / 180; return `${50 + 48 * Math.cos(a)},${50 + 48 * Math.sin(a)}`; }).join(' ');
    shape = `<polygon points="${pts}" fill="url(#${id})" stroke="${g[2]}" stroke-width="2.5" stroke-linejoin="round"/>`;
  } else {
    shape = `<circle cx="50" cy="50" r="48" fill="url(#${id})" stroke="${g[2]}" stroke-width="2.5"/>`;
  }
  return `<svg viewBox="0 0 100 100" role="img" aria-label="${label} coin">
    <defs><radialGradient id="${id}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="${g[0]}"/><stop offset=".55" stop-color="${g[1]}"/><stop offset="1" stop-color="${g[2]}"/></radialGradient></defs>
    ${shape}
    <circle cx="50" cy="50" r="38" fill="none" stroke="${g[2]}" stroke-opacity=".55" stroke-width="2" stroke-dasharray="2 3"/>
    <text x="50" y="${label.length > 2 ? 60 : 62}" text-anchor="middle" font-family="Fredoka,sans-serif" font-weight="700" font-size="${label.length > 2 ? 30 : 34}" fill="${shade(g[2], -0.35)}">${label}</text>
  </svg>`;
}

function moneyHTML(c, size, tag = 'span', attrs = '') {
  const sz = SIZES[size];
  const isNote = c >= 500;
  const w = isNote ? sz.note : Math.round(COIN_STYLE[c].mm * sz.mm);
  const inner = CURRENCY_IMAGES[c] ? `<img src="${CURRENCY_IMAGES[c]}" alt="${denomLabel(c)}">` : (isNote ? noteSVG(c) : coinSVG(c));
  return `<${tag} class="money ${isNote ? 'note' : 'coin'}" style="--w:${w}px" ${attrs}>${inner}</${tag}>`;
}

// Break an amount into the fewest notes and coins
function breakdown(amount) {
  const out = [];
  for (const d of ALL_DENOMS) while (amount >= d) { out.push(d); amount -= d; }
  return out;
}

// ---------- Sound (made in the browser, no files needed) ----------
// One site-wide on/off switch in the ⚙️ Settings menu (assets/sound.js).
let audio = null;
function tone(freq, dur = 0.12, type = 'sine', vol = 0.12, delay = 0) {
  if (window.SiteSound && SiteSound.isMuted()) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const t = audio.currentTime + delay;
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(audio.destination); o.start(t); o.stop(t + dur + 0.02);
  } catch (e) { /* sound is optional */ }
}
const SFX = {
  tap: () => tone(880, 0.05, 'square', 0.04),
  coin: () => { tone(1250, 0.08, 'triangle', 0.12); tone(1650, 0.14, 'triangle', 0.1, 0.07); },
  good: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.12, i * 0.09)),
  bad: () => { tone(240, 0.22, 'sawtooth', 0.07); tone(180, 0.3, 'sawtooth', 0.07, 0.16); },
  hmm: () => tone(330, 0.18, 'sine', 0.1),
};

// ---------- Saved progress (stays in this browser only) ----------
const KEY = 'kgz.sunnyScoops';
function loadSave() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
function writeSave() { try { localStorage.setItem(KEY, JSON.stringify(SAVE)); } catch (e) { /* ignore */ } }
const SAVE = Object.assign({ level: 'easy', bestDay: null, lifetime: 0, days: 0 }, loadSave());

// ---------- Game state ----------
const S = {
  level: LEVELS[SAVE.level] ? SAVE.level : 'easy', day: 1,
  register: START_FLOAT, profit: 0, sales: 0, maxProfit: 0,
  served: 0, perfect: 0, totalSlips: 0, changeSlips: 0,
  queue: [], cur: null, step: 'total', tries: 0, tray: [], workingOpen: false,
};

function makeCustomer() {
  return {
    name: pick(NAMES),
    look: { skin: pick(SKINS), hair: pick(HAIRS), shirt: pick(SHIRTS), style: randInt(0, 3) },
  };
}

function makeOrder(level) {
  const cfg = LEVELS[level];
  const n = randInt(cfg.lines[0], cfg.lines[1]);
  const lines = [], keys = new Set();
  let guard = 0;
  while (lines.length < n && guard++ < 100) {
    const wantIce = lines.length === 0 ? Math.random() < 0.85 : Math.random() < 0.35;
    let line;
    if (wantIce) {
      const f = pick(FLAVOURS), scoop = Math.random() < 0.5 ? 'single' : 'double';
      line = { kind: 'ice', flavour: f, scoop, key: `ice-${f.id}-${scoop}`, unit: SCOOPS[scoop].price };
    } else {
      const it = pick(ITEMS);
      line = { kind: 'item', item: it, key: it.id, unit: it.price };
    }
    if (keys.has(line.key)) continue;
    keys.add(line.key);
    line.qty = Math.random() < cfg.doubleQty ? 2 : 1;
    lines.push(line);
  }
  return lines;
}

function lineLabel(l) {
  if (l.kind === 'ice') return `${l.flavour.name} ice cream, ${SCOOPS[l.scoop].label}`;
  return l.item.name;
}

// Customers almost never pay the exact amount: pick a realistic bigger amount
function makePayment(total, level) {
  const c = new Set([100, 500, 1000, 2000].map((m) => nextMultiple(total, m)));
  if (total > 2000 || (level !== 'easy' && Math.random() < 0.15)) c.add(nextMultiple(total, 5000));
  const r50 = total % 50, r100 = total % 100;
  if (r50) c.add(nextMultiple(total, 500) + r50);    // e.g. $8.70 → pays $10.20, change $1.50
  if (r100) c.add(nextMultiple(total, 1000) + r100); // e.g. $8.65 → pays $10.65, change $2.00
  const options = [...c].filter((v) => v > total && v - total < 5000);
  return pick(options);
}

// ---------- Rendering ----------
function renderMenu() {
  const flav = FLAVOURS.map((f) => `<span class="flavour"><i style="background:${f.color}"></i>${f.name}</span>`).join('');
  const list = (group) => ITEMS.filter((i) => i.group === group)
    .map((i) => `<li>${ART[i.art](i.color)}<span>${i.name}</span><span class="price">${fmt(i.price)}</span></li>`).join('');
  $('menu').innerHTML = `
    <h4>Ice cream (any flavour)</h4>
    <div class="flavours">${flav}</div>
    <ul class="menu-list">
      <li>${coneArt('#f49ac1', 1)}<span>Single scoop</span><span class="price">${fmt(SCOOPS.single.price)}</span></li>
      <li>${coneArt('#6b3e26', 2)}<span>Double scoop</span><span class="price">${fmt(SCOOPS.double.price)}</span></li>
    </ul>
    <h4>Bakery</h4><ul class="menu-list">${list('Bakery')}</ul>
    <h4>Drinks</h4><ul class="menu-list">${list('Drinks')}</ul>`;
}

function setStat(id, text) {
  const el = $(id);
  if (el.textContent !== text) { el.textContent = text; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
}
function renderStats() {
  setStat('statDay', String(S.day));
  setStat('statCust', `${Math.min(S.served + (S.cur ? 1 : 0), CUSTOMERS_PER_DAY)} / ${CUSTOMERS_PER_DAY}`);
  setStat('statRegister', fmt(S.register));
  setStat('statProfit', fmt(S.profit));
}

function renderQueue() {
  $('queue').innerHTML = S.queue.length
    ? S.queue.map((q) => kidSVG(q.look, 'wait')).join('')
    : '<span class="queue-label">Nobody else. Last customer!</span>';
}

function renderCustomer(mood) {
  $('avatar').innerHTML = kidSVG(S.cur.look, mood);
  $('custName').textContent = S.cur.name;
}

function renderBubble() {
  const c = S.cur;
  $('bubble').innerHTML = `<p>${c.greeting}</p><ul class="order">${c.order.map((l) =>
    `<li>${itemArt(l)}<span class="qty">${l.qty}</span><span>${lineLabel(l)}</span></li>`).join('')}</ul>`;
}

function renderWorking(showTotal) {
  const c = S.cur;
  const rows = c.order.map((l) => `<div><span>${l.qty} × ${lineLabel(l)} (${fmt(l.unit)})</span><b>${fmt(l.unit * l.qty)}</b></div>`).join('');
  $('working').innerHTML = rows + `<div class="w-total"><span>Total</span><span>${showTotal ? fmt(c.total) : 'You add it up!'}</span></div>`;
  $('working').hidden = false;
}

function setStep(step) {
  S.step = step;
  const order = ['total', 'change', 'result'];
  const idx = order.indexOf(step);
  const set = (id, state) => { $(id).className = 'step ' + state; };
  set('stepTotal', idx === 0 ? 'active' : 'done');
  set('stepPaid', idx === 0 ? 'locked' : 'done');
  set('stepChange', idx === 0 ? 'locked' : idx === 1 ? 'active' : 'done');
}

function renderTill() {
  $('till').innerHTML = TILL.map((d) =>
    `<div class="slot">${moneyHTML(d, 'till', 'button', `type="button" data-d="${d}" aria-label="Add ${denomLabel(d)}"`)}<span>${denomLabel(d)}</span></div>`).join('');
}

function renderTray(animateLast) {
  const tray = $('tray');
  if (!S.tray.length) tray.innerHTML = '<span class="empty">Nothing on the counter yet.</span>';
  else tray.innerHTML = S.tray.map((d, i) => moneyHTML(d, 'tray', 'button',
    `type="button" data-i="${i}" aria-label="Take back ${denomLabel(d)}" ${animateLast && i === S.tray.length - 1 ? 'data-new' : ''}`)).join('');
  const n = tray.querySelector('[data-new]'); if (n) n.classList.add('drop-in');
  $('traySum').textContent = fmt(sum(S.tray));
}

// ---------- Game flow ----------
function startDay() {
  Object.assign(S, { register: START_FLOAT, profit: 0, sales: 0, maxProfit: 0, served: 0, perfect: 0, totalSlips: 0, changeSlips: 0, cur: null });
  S.queue = Array.from({ length: CUSTOMERS_PER_DAY }, makeCustomer);
  $('dayEnd').hidden = true;
  $('startScreen').hidden = true;
  $('closeShopBtn').classList.remove('hidden');
  nextCustomer();
}

function nextCustomer() {
  if (!S.queue.length) { endDay(); return; }
  const c = S.queue.shift();
  c.order = makeOrder(S.level);
  c.total = sum(c.order.map((l) => l.unit * l.qty));
  c.payment = makePayment(c.total, S.level);
  c.greeting = pick(GREETINGS);
  S.cur = c; S.tries = 0; S.tray = []; S.workingOpen = false;

  renderQueue(); renderCustomer('happy'); renderBubble(); renderStats();
  const av = $('avatar'); av.classList.remove('enter'); void av.offsetWidth; av.classList.add('enter');

  const input = $('totalInput');
  input.value = ''; input.disabled = false;
  $('checkTotalBtn').disabled = false; $('hintBtn').disabled = false;
  $('totalFeedback').textContent = ''; $('totalFeedback').className = 'feedback';
  $('working').hidden = true;
  $('paidMoney').innerHTML = ''; $('paidText').textContent = 'Waiting for you to say the total…';
  $('result').hidden = true;
  renderTray(false);
  setStep('total');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  setTimeout(() => input.focus({ preventScroll: true }), 300);
}

function checkTotal(e) {
  e.preventDefault();
  if (S.step !== 'total') return;
  const raw = $('totalInput').value.replace(/[$\s,]/g, '');
  const fb = $('totalFeedback');
  if (!/^(\d+(\.\d{0,2})?|\.\d{1,2})$/.test(raw)) {
    fb.textContent = 'Type a money amount, like 8.65';
    fb.className = 'feedback bad'; shake($('totalInput').parentElement); SFX.hmm(); return;
  }
  const cents = Math.round(parseFloat(raw) * 100);
  const total = S.cur.total;
  if (cents === total) {
    fb.textContent = `Yes! The total is ${fmt(total)}.`; fb.className = 'feedback good';
    SFX.good(); finishTotal();
    return;
  }
  S.tries++;
  if (S.tries === 1) S.totalSlips++;
  SFX.hmm(); shake($('totalInput').parentElement);
  renderCustomer('wait');
  const dir = cents > total ? 'too high' : 'too low';
  if (S.tries < 3) {
    fb.textContent = `Not quite. ${fmt(cents)} is ${dir}. ${S.tries === 1 ? 'Check each price and add again.' : 'Tip: tap "Show each price".'}`;
    fb.className = 'feedback bad';
  } else {
    fb.textContent = `Good try! The total is ${fmt(total)}. Look at how it adds up below.`;
    fb.className = 'feedback bad';
    $('totalInput').value = (total / 100).toFixed(2);
    renderWorking(true);
    finishTotal();
  }
}

function finishTotal() {
  $('totalInput').disabled = true; $('checkTotalBtn').disabled = true; $('hintBtn').disabled = true;
  if (S.workingOpen || S.tries >= 3) renderWorking(true);
  renderCustomer('happy');
  // customer pays
  const pay = breakdown(S.cur.payment);
  S.register += S.cur.payment;
  renderStats();
  $('paidMoney').innerHTML = pay.map((d) => moneyHTML(d, 'paid')).join('');
  $('paidMoney').querySelectorAll('.money').forEach((m, i) => { m.style.animationDelay = i * 0.08 + 's'; m.classList.add('drop-in'); });
  $('paidText').innerHTML = `${S.cur.name} gives you <b>${fmt(S.cur.payment)}</b>. The total is <b>${fmt(S.cur.total)}</b>. How much change?`;
  SFX.coin();
  setStep('change');
}

function giveChange() {
  if (S.step !== 'change') return;
  if (!S.tray.length) { shake($('tray').parentElement); SFX.hmm(); return; }
  const c = S.cur;
  const given = sum(S.tray);
  const correct = c.payment - c.total;
  const earn = Math.round(c.total * PROFIT_RATE);

  S.register -= given;
  S.sales += c.total; S.profit += earn; S.maxProfit += earn; S.served++;

  const ledger = [
    [`Sale of ${fmt(c.total)}`, ''],
    [`Your 10% profit (10% of ${fmt(c.total)})`, `<span class="plus">${signed(earn)}</span>`],
  ];
  let cls, title, msg, mood, net = earn;
  const sumLine = `Change = paid − total = ${fmt(c.payment)} − ${fmt(c.total)} = <b>${fmt(correct)}</b>`;

  if (given === correct) {
    S.perfect++;
    cls = 'good'; mood = 'happy'; title = 'Perfect change!';
    msg = `You gave ${fmt(given)}. ${c.name} says thank you!`;
    SFX.good();
  } else if (given < correct) {
    const short = correct - given;
    S.register -= short + SORRY_FINE;
    S.profit -= SORRY_FINE; net -= SORRY_FINE; S.changeSlips++;
    cls = 'bad'; mood = 'sad'; title = 'Not enough change!';
    msg = `${c.name} says: “You only gave me ${fmt(given)}, but I should get ${fmt(correct)}!” You hand over the missing <b>${fmt(short)}</b> plus a <b>${fmt(SORRY_FINE)}</b> sorry fine.`;
    ledger.push([`Sorry fine`, `<span class="minus">${signed(-SORRY_FINE)}</span>`]);
    SFX.bad();
  } else {
    const extra = given - correct;
    S.profit -= extra; net -= extra; S.changeSlips++;
    cls = 'warn'; mood = 'wow'; title = 'Too much change!';
    msg = `You gave ${fmt(given)}, but the change should be ${fmt(correct)}. ${c.name} skips off with an extra <b>${fmt(extra)}</b>, and that comes out of your profit.`;
    ledger.push([`Extra change lost`, `<span class="minus">${signed(-extra)}</span>`]);
    SFX.bad();
  }
  ledger.push([`<b>This customer</b>`, `<span class="${net >= 0 ? 'plus' : 'minus'}">${signed(net)}</span>`]);

  renderCustomer(mood);
  renderStats();
  const last = !S.queue.length;
  const r = $('result');
  r.className = 'result ' + cls;
  r.innerHTML = `<h3>${title}</h3><p>${sumLine}</p><p>${msg}</p>
    <div class="ledger">${ledger.map(([a, b]) => `<div><span>${a}</span>${b}</div>`).join('')}</div>
    <button class="btn primary" type="button" id="nextBtn">${last ? 'Close the shop' : 'Next customer'}</button>`;
  r.hidden = false;
  setStep('result');
  $('nextBtn').addEventListener('click', () => { SFX.tap(); nextCustomer(); });
  r.scrollIntoView({ behavior: 'smooth', block: 'center' });
  $('nextBtn').focus({ preventScroll: true });
}

function endDay() {
  // Closing early in the middle of a sale: hand the customer's money back
  if (S.cur && S.step === 'change') S.register -= S.cur.payment;
  S.cur = null; S.queue = [];
  $('closeShopBtn').classList.add('hidden');
  if (S.served) {   // a day with no customers is not counted
    SAVE.days++;
    SAVE.lifetime += S.profit;
    if (SAVE.bestDay === null || S.profit > SAVE.bestDay) SAVE.bestDay = S.profit;
    writeSave();
  }

  const mistakes = S.totalSlips + S.changeSlips;
  const stars = !S.served ? 0 : mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
  $('dayEndTitle').textContent = `Day ${S.day} done!`;
  $('stars').innerHTML = [1, 2, 3].map((i) => `<span class="${i <= stars ? '' : 'off'}">★</span>`).join('');
  const rows = [
    ['Customers served', S.served],
    ['Total sales', fmt(S.sales)],
    ['Totals right first time', `${S.served - S.totalSlips} / ${S.served}`],
    ['Perfect change', `${S.perfect} / ${S.served}`],
    ['Most profit you could make', fmt(S.maxProfit)],
    ["Today's profit", fmt(S.profit)],
    ['Cash in register (started with $20)', fmt(S.register)],
    ['Best day ever', SAVE.bestDay === null ? '–' : fmt(SAVE.bestDay)],
    ['All-time profit', fmt(SAVE.lifetime)],
  ];
  $('summary').innerHTML = rows.map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('');
  $('dayEnd').hidden = false;
  stars === 3 ? SFX.good() : SFX.coin();
  renderStats();
}

function shake(el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }

function renderStart() {
  const name = window.PlayerName ? PlayerName.get() : '';
  $('hello').textContent = name ? `Shopkeeper ${name}, open the shop!` : 'Run the ice cream shop!';
  document.querySelectorAll('.level').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.level === S.level)));
  $('bestLine').textContent = SAVE.days
    ? `Days played: ${SAVE.days} · Best day: ${fmt(SAVE.bestDay)} · All-time profit: ${fmt(SAVE.lifetime)}`
    : '';
  $('startArt').innerHTML = coneArt('#f49ac1', 2) + ART.donut() + ART.juice('#ffa630') + ART.ginger() + coneArt('#9fe2bf', 1);
}


// ---------- Events ----------
$('totalForm').addEventListener('submit', checkTotal);
$('hintBtn').addEventListener('click', () => { S.workingOpen = true; renderWorking(false); SFX.tap(); });
$('till').addEventListener('click', (e) => {
  const b = e.target.closest('[data-d]'); if (!b || S.step !== 'change') return;
  S.tray.push(Number(b.dataset.d)); renderTray(true); SFX.coin();
});
$('tray').addEventListener('click', (e) => {
  const b = e.target.closest('[data-i]'); if (!b || S.step !== 'change') return;
  S.tray.splice(Number(b.dataset.i), 1); renderTray(false); SFX.tap();
});
$('clearBtn').addEventListener('click', () => { S.tray = []; renderTray(false); SFX.tap(); });
$('giveBtn').addEventListener('click', giveChange);
$('closeShopBtn').addEventListener('click', () => { SFX.tap(); endDay(); });
document.querySelectorAll('.level').forEach((b) => b.addEventListener('click', () => {
  S.level = b.dataset.level; SAVE.level = S.level; writeSave(); renderStart(); SFX.tap();
}));
$('startBtn').addEventListener('click', () => { SFX.tap(); startDay(); });
$('nextDayBtn').addEventListener('click', () => { S.day++; SFX.tap(); startDay(); });
$('levelBtn').addEventListener('click', () => { S.day++; $('dayEnd').hidden = true; renderStart(); $('startScreen').hidden = false; });

// ---------- Start ----------
renderMenu(); renderTill(); renderTray(false); renderStart(); renderStats();
setStep('total');
$('stepTotal').className = 'step locked';
}
