# 🧱 Tower Builder — game logic

A single-player **times tables** game with four modes: Practice, Tower challenge, Beat the clock and a Mastery map. Every right answer drops a colourful block onto a tower; wrong answers make it wobble.

## Files

| File | What it does |
|---|---|
| `index.html` | The three screens (menu, game, end) |
| `style.css` | Styles and animations. Uses only the shared theme colors from `../../assets/portal.css` |
| `game.js` | All game logic, sound effects and saving (below) |

The page also loads `../../assets/theme.js`, `../../assets/sound.js` (site-wide sound on/off), `../../assets/player.js` (the menu greets the saved player name) and `../../assets/skyline.js`.

## Game modes

| Mode | Tables | Timer | Blocks fall off? | Best saved as |
|---|---|---|---|---|
| 📘 **Practice** | exactly **one** table | none | **never** | – (no record) |
| 🧱 **Tower challenge** | one or more, mixed | none | every **3rd wrong answer** (at any time) | `best` |
| ⏱️ **Beat the clock** | one or more, mixed | **60 seconds** | never (wrong answers just cost time) | `clockBest` |
| 🗺️ **Mastery map** | – | – | – | (a progress view, not a game) |

Timing after an answer: Practice 0.9 s right / 2.4 s wrong; Tower challenge 0.9 s / 2.2 s; Beat the clock 0.35 s / 1.3 s.

## Flow

### 1. Menu
- **Pick a game mode:** four cards. Practice, Tower challenge and Beat the clock are a choice (radio); the
  last mode played is selected when the page opens. **Mastery map** opens the map straight away.
  A hint under the cards explains the chosen mode, and the Start button text changes with it.
- **Times tables:** ×1 … ×12.
  - Practice: pick **one** (tapping another table switches to it). **×6** is selected when the page opens.
  - Tower challenge / Beat the clock: pick several; "All" / "Clear" shortcuts; at least one is needed.
    When the game page opens, **×6, ×7, ×8 and ×9 are always pre-selected** (owner's choice).
  - "Change mode" on the end screen keeps the mode and tables just played.
- **Answer style:** *Pick an answer* (4 multiple-choice buttons) or *Type it in* (on-screen number pad). Used by all modes.
- **Keep building (N):** shown in Tower challenge when an unfinished tower is saved; continues it with its tables, answer style and oops count.
- Shows best tower, best in 60 s, accuracy, mastered facts (out of 144) and up to 8 "tricky facts".
- **Reset my progress** (with a confirm) clears both bests, stats, tricky facts, the mastery map, unlocked block styles and worlds.

### 2. Game (all modes)
- A question `a × b = ?`. The table's factor is randomly shown first or second (e.g. `7 × 3` or `3 × 7`).
- **Right answer:** ✓ message and a rising "ding"; a new block drops onto the tower with a squash-and-bounce animation and a thud when it lands. The block shows the answer and the fact. When a fact reaches 3 right in a row the message is "🟩 Mastered a × b!".
- **Wrong answer:** the tower wobbles, a low buzz plays, the slot shows the right answer in the wrong-color, the correct choice gets ✓ and the tapped one ✗ (in pad mode the message says what was typed).
- Every 10th block gets a "🎉 N blocks tall!" message.
- When the tower gets taller than the box, the whole stack slides down so the top stays visible.
- Keyboard: digits / Backspace / Enter in pad mode; keys 1–4 pick a choice in multiple-choice mode.
- **🏁 Finish** ends the game at any time (also during Beat the clock).
- HUD (three boxes):
  - Practice: Tower · ✓ Right · Table ×N
  - Tower challenge: Tower · 🏆 Best · Oops (three dots)
  - Beat the clock: Tower · 🏆 Best · ⏱️ Time (seconds left; turns the wrong-color and pulses in the last 10 s)

#### Tower challenge only
- Each wrong answer lights one oops dot. Right answers do **not** clear them.
- **Three wrong answers at any time** (not only in a row): the third dot lights up, then the top block tumbles off (if there is one) and the dots go back to 0.
- A dashed **🏆 Best** line marks the best height; beating it plays a fanfare once per game (not on the very first game).
- The tower is saved after every answer, so it can be continued later.

#### Beat the clock only
- The 60 s countdown starts with the first question. It uses the real clock (`Date.now()`), so it keeps running if the page is in the background.
- A tick sound plays for each of the last 5 seconds. At 0: "⏰ Time's up!", input is locked, and the end screen opens 1.4 s later.
- Its own 🏆 Best line and record (`clockBest`), with the same fanfare. Nothing is saved to continue later.

#### Practice only
- One table, no timer, no oops dots, blocks never fall off, no best line or record. Nothing is saved to continue later.

### 3. End screen
- Practice: "Great practice with the Ns!", right answers out of answered, blocks built, facts of that table mastered (out of 12).
- Tower challenge: tower height, tallest this game, right answers, best ever ("New best tower!" when beaten).
- Beat the clock: "Time's up!" (or "New record in 60 seconds!"), blocks in 60 s, right answers, best in 60 s.
- All: the facts missed this game ("Practise these next time"). Buttons: **Play again** (same mode and settings), **Change mode** (menu), **🗺️ Mastery map**.

### 4. Mastery map
- A 12 × 12 grid: row = the table, column = the other number, each square shows the product. Row/column headers 1–12.
- Each square's colour shows that fact's **streak** (right answers in a row, in any mode):
  - **grey** = not yet (never right, or the last answer was wrong)
  - **yellow** (`--yellow`) = learning: right 1–2 times in a row
  - **green** (`--map-green`) = mastered: right **3 or more times in a row**
- A wrong answer sets the streak back to 0 (grey), so the map shows what still needs work.
- Counts at the top: Mastered / Learning / Not yet (they add up to 144). The same colours are used as the key.
- Tap a square: "7 × 8 = 56 — Learning. Right 5 times, wrong 1. 2 more right in a row to turn green."
- Tap a row number: starts **Practice** with that table (with the current answer style).
- The fact key is `table x number`, so `7 × 8` (row 7) and `8 × 7` (row 8) are separate squares. In a game, a question from
  the 7s table can be shown as `8 × 7`; it still counts for row 7.
- Green is the one fixed colour in this game: the site themes have no green role, so it is set in `style.css` (`--map-green`).
  In Silver Steel the "yellow" role is dark grey, which still reads differently from grey and green.

## Block styles (unlocked by highscore)

The **highscore** is the best tower in Tower challenge or Beat the clock (`max(best, clockBest)`). Practice has no record, so it does not unlock styles.

| Style | Unlocks at highscore | Look |
|---|---|---|
| 🪵 Wood | always (default) | brown planks with grain |
| 🪨 Stone | **20** | grey speckled stone |
| 🧱 Brick | **40** | red bricks with mortar lines |
| 🧊 Ice | **more than 50** (51) | see-through blue with a shine |
| 🥈 Silver | **more than 70** (71) | metal with a moving shine |
| 🥇 Gold | **more than 90** (91) | gold with a moving shine and glow |
| 🟥 Lego | **more than 100** (101) | the theme's colors with studs on top |

- Menu → **🎨 Block style**: tiles with a preview block. Unlocked ones can be chosen (saved as `blockStyle`); locked ones show 🔒 and the rule, and tapping one explains what is needed and the current best.
- When a new highscore passes a threshold during a game: fanfare + "🔓 New block style: Stone! 🪨". It is listed on the end screen under **🔓 Unlocked!** The new style is not switched on automatically.
- Each block keeps a color index c0–c5; materials use it as a small brightness change so neighbouring blocks look slightly different.
- Materials and the sky use fixed colors (a material should look the same in every site theme). The sky colors are mixed with the theme's `--bg`, so dark themes get a dimmer sky.

## Worlds: the sky changes with height

The tower stands in a tall picture. Heights are counted in blocks:

| World | Blocks | Scenery |
|---|---|---|
| 🌱 Ground | 0–9 | grass, tree, a house, flowers; a row of faded houses on green hills in the background |
| ☁️ Sky | 10–24 | drifting clouds, flying birds, hot-air balloons, kites swaying on their strings |
| ✈️ Planes | 25–39 | airplanes and helicopters (plus a few thin clouds), deeper blue sky |
| 🚀 Space | 40+ | dark sky, 240 twinkling stars, the moon, planets (no Earth), rockets and an alien |

How the scenery is made (`SCENERY` in `game.js`, styles under "Scenery" in `style.css`):
- **CSS drawings, not emoji:** clouds, birds (two flapping wings), hot-air balloons (striped envelope, ropes, basket),
  stars, the moon (with craters and a soft pulsing glow) and planets (red, banded, ringed, blue, violet).
- **Stars** are small CSS dots that glow and dim, each at its own speed; their places come from a fixed random seed, so they are the same every game.
- **Emoji:** houses, tree, flowers, kites 🪁, airplanes ✈️ (turned to point right), helicopters 🚁, rockets 🚀 and the alien 👽.
- **Movers** (clouds, birds, hot-air balloons, airplanes, helicopters) glide slowly from the left edge to the right edge and back,
  and turn round at each end (so planes and helicopters always face the way they fly). One trip there and back takes
  60–75 s for birds, 70–95 s for planes and helicopters, 140–240 s for clouds and 220–260 s for balloons. They pass behind the tower.
- Kites sway, rockets/alien/planets float gently, the moon glows. Things in space are kept near the edges so the tower doesn't hide them.
- With "reduce motion" switched on in the device settings, all of this stands still (`portal.css`).

- A dashed line and a sign ("☁️ Sky · 10") mark where each world starts.
- Reaching a world for the **first time ever** unlocks it (saved as `zoneMax`): fanfare + "🔓 New world: Space! 🚀", also listed on the end screen. Reaching it again in a later game shows "☁️ You're up in the sky!", "✈️ You're flying with the planes!" or "🚀 You reached SPACE!". This works in every mode, including Practice.
- Menu → **🌍 Worlds** shows which worlds are unlocked and how tall the tower must be for the others.

## Scrolling the tower

- The tower box is a scrolling window (touch-drag, mouse wheel or keyboard). The world is as tall as the tower plus 3 blocks of sky, so players can scroll from the ground to the top and back.
- After every new or lost block the view scrolls smoothly so the top of the tower is in view (about 40% from the top of the box).
- **⬆️** (top right) jumps to the top of the tower; **⬇️** (bottom right) scrolls down to the ground. Each shows only when there is somewhere to go.
- The badge in the top-left corner names the world at the middle of the view (🌱 Ground, ☁️ Sky, ✈️ Planes, 🚀 Space) and changes while scrolling, so the background always matches the height you are looking at.

## Picking questions (wrong answers come back more often)
- The pool is every fact `t × n` for each chosen table `t` and `n = 1…12`, keyed `"t" + "x" + "n"` (e.g. `"7x8"`).
- Practice uses only the 12 facts of its one table.
- Each fact has a saved **trouble** score (0–8): wrong = +3, right = −1.
- Questions are picked at random with weight `1 + trouble × 1.5`, so tricky facts appear more often across games.
- A fact missed in this game is also queued to come back **3 questions later**.
- The same fact is never asked twice in a row (unless only one fact is in the pool).

## Multiple-choice answers
The right answer plus 3 believable wrong ones from: neighbouring facts (`(a±1)×b`, `a×(b±1)`), off by 1, 2 or 10, and `a + b`. Only positive, unique numbers; random fill if needed. Shuffled.

## Number pad
Up to 3 digits, ⌫ deletes, ✓ checks (does nothing when empty). A leading 0 is replaced.

## Sound
Web Audio API oscillators, no sound files: tap, right, land, wrong, fall, best. The audio context is created on the first tap (browsers need a user gesture). There is no mute button in the game: sound is switched on/off for **all games** in ⚙️ Settings → Sound (top right of every page) (`SiteSound.isMuted()`, localStorage `kgz.muted`). A mute saved by the old in-game button is moved over to that setting once.

## Saved data
localStorage key **`kgz.towerBuilder`** (always in try/catch, game works without it):

```js
{
  best: 12,                     // tallest tower in Tower challenge
  clockBest: 9,                 // tallest tower in Beat the clock
  kind: "challenge",            // last mode played: "practice" | "challenge" | "clock"
  tables: [6, 7, 8, 9],         // tables of the last challenge / clock game (the menu still opens with 6–9)
  practiceTable: 4,             // table of the last Practice game (the menu still opens with 6)
  mode: "choice",               // "choice" or "pad"
  blockStyle: "wood",           // chosen block style (falls back to wood if it is not unlocked)
  zoneMax: 3,                   // highest world reached: 0 ground, 1 sky, 2 planes, 3 space
  facts: { "7x8": { right: 3, wrong: 2, trouble: 3, streak: 1 } },   // streak = right in a row (mastery map)
  totals: { right: 40, wrong: 7, games: 5 },
  current: { blocks: [{ a, b, answer, color, shift }], tables, mode, oops }   // unfinished tower, or null
}
```

Saved after every answer, so closing the page keeps a Tower challenge tower. Finishing a Tower challenge clears `current`.
Older saves without `streak` count as learning (up to 2) when the fact had no trouble, otherwise 0.
