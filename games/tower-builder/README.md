# 🧱 Tower Builder — game logic

A single-player **times tables** game. Every right answer drops a colourful block onto a tower; wrong answers make it wobble, and every third wrong answer knocks the top block off.

## Files

| File | What it does |
|---|---|
| `index.html` | The three screens (menu, game, end) |
| `style.css` | Styles and animations. Uses only the shared theme colors from `../../assets/portal.css` |
| `game.js` | All game logic, sound effects and saving (below) |

The page also loads `../../assets/theme.js`, `../../assets/sound.js` (site-wide sound on/off), `../../assets/player.js` (the menu greets the saved player name) and `../../assets/skyline.js`.

## Flow

### 1. Menu
- **Times tables:** tap any of ×1 … ×12 (several allowed). "All" / "Clear" shortcuts. At least one is needed to start.
  When the game page opens, **×6, ×7, ×8 and ×9 are always pre-selected** (owner's choice). "Change tables" on the end screen keeps the tables just played.
- **Answer style:** *Pick an answer* (4 multiple-choice buttons) or *Type it in* (on-screen number pad).
- **Keep building (N):** shown when an unfinished tower is saved; continues it with its tables and answer style.
- **Start a new tower:** starts from 0 blocks with the chosen settings.
- Shows best tower, total right answers, accuracy and up to 8 "tricky facts".
- **Reset my progress** (with a confirm) clears best, stats and tricky facts.

### 2. Game
- A question `a × b = ?`. The table's factor is randomly shown first or second (e.g. `7 × 3` or `3 × 7`).
- **Right answer:** ✓ message and a rising "ding"; a new block drops onto the tower with a squash-and-bounce animation and a thud when it lands. The block shows the answer and the fact. Next question after 0.9 s. (A right answer does **not** clear the oops dots.)
- **Wrong answer:** the tower wobbles, a low buzz plays, the slot shows the right answer in the wrong-color, the correct choice gets ✓ and the tapped one ✗ (in pad mode the message says what was typed). One oops dot lights up. Next question after 2.2 s.
- **Three wrong answers at any time** (they do not need to be in a row): the third dot lights up, then the top block tumbles off the tower (if there is one) and the oops counter goes back to 0.
- Every 10th block gets a "🎉 N blocks tall!" message. Beating the saved best plays a fanfare once per game (not on the very first game).
- A dashed **🏆 Best** line marks the best height. When the tower gets taller than the box, the whole stack slides down so the top stays visible.
- HUD: tower height, best, and three oops dots (wrong answers since the last lost block).
- Keyboard: digits / Backspace / Enter in pad mode; keys 1–4 pick a choice in multiple-choice mode.
- **🏁 Finish** ends the game.

### 3. End screen
Tower height, tallest this game, right answers out of answered, best ever, and the facts missed this game ("Practise these next time"). **Build again** (same settings) or **Change tables** (back to menu).

## Picking questions (wrong answers come back more often)
- The pool is every fact `t × n` for each chosen table `t` and `n = 1…12`, keyed `"t" + "x" + "n"` (e.g. `"7x8"`).
- Each fact has a saved **trouble** score (0–8): wrong = +3, right = −1.
- Questions are picked at random with weight `1 + trouble × 1.5`, so tricky facts appear more often across games.
- A fact missed in this game is also queued to come back **3 questions later**.
- The same fact is never asked twice in a row (unless only one fact is in the pool).

## Multiple-choice answers
The right answer plus 3 believable wrong ones from: neighbouring facts (`(a±1)×b`, `a×(b±1)`), off by 1, 2 or 10, and `a + b`. Only positive, unique numbers; random fill if needed. Shuffled.

## Number pad
Up to 3 digits, ⌫ deletes, ✓ checks (does nothing when empty). A leading 0 is replaced.

## Sound
Web Audio API oscillators, no sound files: tap, right, land, wrong, fall, best. The audio context is created on the first tap (browsers need a user gesture). There is no mute button in the game: sound is switched on/off for **all games** with the 🔊 Sound button on the landing page (`SiteSound.isMuted()`, localStorage `kgz.muted`). A mute saved by the old in-game button is moved over to that setting once.

## Saved data
localStorage key **`kgz.towerBuilder`** (always in try/catch, game works without it):

```js
{
  best: 12,                     // best tower height ever
  tables: [6, 7, 8, 9],         // tables of the last game (the menu still opens with 6–9)
  mode: "choice",               // "choice" or "pad"
  facts: { "7x8": { right: 3, wrong: 2, trouble: 3 } },
  totals: { right: 40, wrong: 7, games: 5 },
  current: { blocks: [{ a, b, answer, color, shift }], tables, mode, oops }   // unfinished tower, or null
}
```

Saved after every answer, so closing the page keeps the tower. Finishing a game clears `current`.
