# Kids Game Zone — notes for AI agents and developers

A static HTML/CSS/JS games portal for kids, hosted on **GitHub Pages** from the `main` branch root.
It is played on iPads, phones and laptops, so every change must stay responsive (test at phone width, ~390px).
No build step, no frameworks, no npm dependencies in the site itself.

The owner prefers to be called **Harini**. Content must be appropriate for kids around **10 years old**.

## Layout

```
index.html                 Landing page: game list (⭐ favourites first), player-name dialog, sound on/off, color-theme picker
games.js                   List of games shown on the landing page (PORTAL_GAMES)
assets/portal.css          Shared styles + ALL color themes (one CSS block per theme)
assets/theme.js            Theme list + applies saved theme; loaded in <head> of every page
assets/player.js           PlayerName.get()/set(): saved player name (localStorage "kgz.playerName")
assets/sound.js            SiteSound.isMuted()/setMuted(): one sound on/off for all games (localStorage "kgz.muted")
assets/names.js            Word lists for the silly-name builder ("Curious Cucumber")
games/would-you-rather/    2–4 player card game; 100 cards in cards.js (window.WYR_CARDS)
games/quiz/                "Quiz Champs": 1–4 player quiz
  quiz.js / quiz.css       Game logic and styles
  themes/themes.json       List of quiz themes: id, name, emoji, color, file, imageStyle
  themes/*.json            Questions, one file per theme (150+ each)
games/tower-builder/      Times tables tower game: index.html, style.css, game.js (saves to "kgz.towerBuilder")
tools/validate-questions.mjs   Checks all quiz JSON (run before committing question changes)
```

## Game logic lives with each game

Each game folder has a `README.md` describing its full game logic: rules, flow, scoring, state and data format.
**Read it before changing a game, and update it in the same commit whenever the game's behaviour changes.**
- `games/would-you-rather/README.md`
- `games/quiz/README.md`
- `games/tower-builder/README.md`

New games must get their own `README.md` in the same style.

## Conventions

- **Colors:** never hard-code colors in game CSS. Use the role variables from `assets/portal.css`:
  `--yellow` (highlight, main buttons, card borders), `--coral` (option A, wrong answer, player 1),
  `--teal` (option B, right answer, player 2), and `--on-yellow/--on-coral/--on-teal` for text on top of them.
  Surfaces: `--bg`, `--surface`, `--surface-2`, `--line`, `--ink`, `--ink-soft`, plus `--*-tint`.
  Player colors are `--p1`…`--p4` (and `--p1-soft`…). In `games.js` and `themes.json`, `color` is a role name.
- **Themes:** Midnight Pop (default, no `data-theme`), Berry Twilight (`berry`), Neon Lagoon (`lagoon`),
  Ocean Sunset (`sunset`), Silver Steel (`steel`, the only light theme), Christmas (`christmas`, CSS snowfall
  via `body::before/::after`). To add a theme: add a `:root[data-theme="x"]` block in `portal.css` and an entry in `assets/theme.js`.
  Every new page must include `<script src="…/assets/theme.js"></script>` right after the theme-color meta tag.
- **Skyline background:** `assets/skyline.js` (loaded at the end of `<body>` on every page) builds a city skyline from
  HTML elements (far silhouettes + near buildings with apartment windows), fixed at the bottom behind content
  (`z-index: -2`; Christmas snow is `-1`, so it falls in front). Colors come from `--sky-far`, `--sky-near`,
  `--win-off`, `--win-on`, `--win-glow` per theme. Christmas shows the city at night with a moon, snowy rooftops and
  twinkling roof lights. **Window lights (owner's requirement):** one at a time, at a random interval of 5–10 s,
  one lit on-screen apartment switches off and a different one switches on 0.7 s later. Never switch many at once.
  New pages must include `<script src="…/assets/skyline.js"></script>` before `</body>`.
- **Sound:** one site-wide on/off switch, the 🔊 Sound button on the landing page (no mute buttons inside games).
  Every page loads `<script src="…/assets/sound.js"></script>` right after `theme.js`. Before playing any sound or
  reading aloud, check `SiteSound.isMuted()`. While muted `<html>` has class `muted` and `.speak` buttons are hidden.
- **Favourites:** each game card on the landing page has a ☆/★ button (top right). Favourite games (saved by `url`
  in `kgz.favourites`) are listed first, then the rest, each group in `games.js` order.
- **Design:** dark-first, playful, rounded font "Fredoka" from Google Fonts, big tap targets (≥44px),
  emoji as icons. Keep pages working without the font.
- **Storage:** localStorage only for per-device conveniences (`kgz.playerName`, `kgz.theme`, `kgz.muted`, `kgz.favourites`, `kgz.towerBuilder`), always in try/catch.
- **Escaping:** any user text (names) inserted as HTML must go through the `esc()` helper or `textContent`.
- **New game:** create `games/<name>/index.html`, reuse `assets/portal.css`, `theme.js` and `player.js`
  (pre-fill Player 1 from `PlayerName.get()`), plus `sound.js` (after `theme.js`), then add an entry to `games.js`.

## Quiz Champs rules (as specified by the owner)

- Max 4 players; players take turns; questions per player: 5/10/15/20.
- Choose one theme, several, or "Random mix of all". No question repeats within a game.
- 1 point per correct answer. Streak bonus: **5 in a row = +1**, **10 in a row = +2**, then it repeats
  (15 → +1, 20 → +2). A wrong answer resets the streak. Winner announced at the end; ties handled.
- Answers show ✓/✗ marks (needed because some themes have no red/green).

## Quiz question format (required by the owner, keep it exactly)

Every theme file is a JSON array. Image and non-image questions use the **same shape**:

```json
{
  "Question": "Which country does this flag belong to?",
  "Image": "https://cdn.jsdelivr.net/npm/flag-icons@7.6.0/flags/4x3/jp.svg",
  "Answer": "Japan",
  "Choices": ["Japan", "China", "Peru", "Kenya"]
}
```

- `Image` is `""` when there is no picture. The question card has an `<img id="qImage">` placeholder that is
  shown only when `Image` has a link.
- True/False questions have exactly `"Choices": ["True", "False"]` (shown in that order; others are shuffled).
- Each theme needs **at least 150 questions**. Run `node tools/validate-questions.mjs` after any change.
- Because questions are loaded with `fetch`, the quiz does not work from `file://`; it shows a message instead.
  Test locally with `python3 -m http.server` from the repo root.

Themes: Countries, Guess the Flag, Guess the Logo, Roblox, Minecraft, Science, Space & Beyond, Planets,
Myths: True or False?, Human Body, Animal Superpowers (1,790 questions).

### Picture sources
- Flags: `flag-icons@7.6.0` via jsDelivr, `…/flags/4x3/<iso2>.svg`. All 193 UN members.
  Lookalike flags (e.g. Chad/Romania, Indonesia/Monaco) must never be offered as each other's wrong answers.
- Logos: `simple-icons@16.36.0` via jsDelivr, `…/icons/<slug>.svg` (black, shown on a white tile).
  Logos that spell out the brand name (Samsung, KFC, IKEA, Coca-Cola…) were removed because they give the answer away.
  Many famous brands (LEGO, Nintendo, Disney, Pepsi, Amazon, Minecraft) are not in Simple Icons.
  Pin exact versions in URLs, and verify a slug exists before adding it (e.g. `npm pack simple-icons@16.36.0`).

### Content guidance
- Stick to well-established facts; skip anything disputed. Roblox content dates quickly (game updates),
  so re-check Roblox questions occasionally.
- Avoid politically contested items (e.g. contested capitals) and anything not suitable for ~10-year-olds.

## Testing

Before pushing, check in a real browser at phone (iPhone 13), iPad and laptop sizes, with no horizontal scroll
and no console errors. Playwright with Chromium works well:
- Serve the repo with `python3 -m http.server`.
- jsDelivr may be blocked in sandboxes; route `cdn.jsdelivr.net` requests to locally installed
  `flag-icons` / `simple-icons` npm packages to test images.
- A good quiz check: play a solo 10-question game answering everything correctly, and expect 13 points (10 + 1 + 2).
- Also check: the name dialog (Enter key must not re-open it), and the theme picker applying across pages.

## Git

- Work on `main` (GitHub Pages serves it). Commit with clear messages, then push.
- `.nojekyll` must stay so GitHub Pages serves files as-is.

## History (what has been built, in order)

1. Landing page + Would You Rather (100 editable cards).
2. Dark theme with yellow/coral/teal/navy palette.
3. Player name on the landing page (type it or build a silly name), saved and pre-filled in games.
4. Quiz Champs with 11 themes (first as JS files).
5. Quiz questions converted to the JSON format above.
6. Site-wide color theme picker with six themes.
7. Per-folder game READMEs, this file, and the question validator.
8. City skyline background; Christmas night city with wandering window lights and snow.
9. Tower Builder: times tables game (blocks drop on right answers, tricky facts repeat, Web Audio sounds).
10. Site-wide sound switch on the landing page, favourite stars on game cards; Tower Builder opens with tables 6–9
    and drops a block on every 3rd wrong answer (not only 3 in a row).

Ideas not yet done: light/dark toggle per theme, more games, a timer option for the quiz.
