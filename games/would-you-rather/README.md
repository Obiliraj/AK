# 🤔 Would You Rather? — game logic

A pass-the-deck party game for **2–4 players** on one device. There is no scoring and no right or wrong answer: players pick a choice and explain why.

## Files

| File | What it does |
|---|---|
| `index.html` | The three screens (setup, game, end) and the rules |
| `game.js` | All game logic (below) |
| `game.css` | Styles. Uses the shared theme colors from `../../assets/portal.css` |
| `cards.js` | The deck: `window.WYR_CARDS`, 100 cards. **Edit this to change the cards.** |

The page also loads `../../assets/theme.js` (color theme), `../../assets/player.js` (saved player name) and `../../assets/portal.css`.

## Card format

```js
{ a: "have a giraffe's long neck", b: "have an elephant's trunk" },
```

The game shows "Would you rather…" in front of both options, so options start in lower case (the first letter is capitalised on screen). Cards with a missing or empty `a`/`b` are skipped. Kid-appropriate content only.

## Rules (as specified by the owner)

1. **Shuffle and place:** shuffle the dilemma cards and put the deck face down in the center.
2. **Ask the question:** draw a card and read both choices out loud.
3. **Choose and share:** each player picks Option A or Option B and explains why. There are no right or wrong answers.
4. **Pass the turn:** pass the deck to the next player and repeat.

## Flow

### 1. Setup screen
- Choose the number of players: **2, 3 or 4** (minimum 2, maximum 4; default 2).
- Each player gets a name box and an animal avatar. Tapping the avatar cycles through 12 emoji, skipping any avatar another player already has.
- Player 1's name is pre-filled from the saved name (`PlayerName.get()`) if there is one. Empty names become "Player 1", "Player 2" and so on. Names are up to 30 characters.
- Player colors are `--p1`…`--p4` from the active color theme.

### 2. Start: shuffle and place
- **Shuffle & Start!** copies all valid cards and shuffles them (Fisher–Yates). Each card appears once per game.
- A short shuffle animation plays (about 1 second), then the face-down deck appears in the center with "*Name*, tap the deck to draw a card!" and "*N* cards left".
- The **reader** (whose turn it is) starts at Player 1 and is highlighted in the player strip with a 🃏.

### 3. A turn
1. The reader taps the deck. The top card is drawn (`deck.pop()`), dealt in, and flips over to show **A** (coral) "or" **B** (teal).
2. The message changes to "*Name*, read the card out loud!". **🔊 Read it to me** uses the browser's speech synthesis to read: "Would you rather *A*? Or, *B*?". It is hidden while sound is switched off in ⚙️ Settings (`assets/sound.js`).
3. An "Everyone pick A or B!" panel lists every player with **A** and **B** buttons. A player can change their pick until the turn ends. Each pick puts that player's avatar under the chosen option on the card.
4. When **every** player has picked, "Now take turns telling everyone **why** you picked it!" appears and the pass button is enabled.
5. **Pass the deck to *next player* ➜** saves the card and everyone's picks to the history, moves the reader to the next player (wrapping round after the last player), and puts a fresh face-down deck in the center.

### 4. End of the game
The game ends when:
- the **deck runs out**: the last pass button reads "See results 🎉"; or
- someone taps **🏁 End**. If everyone had already picked on the current card, that card still counts.

The results screen shows:
- "You played *N* cards together!"
- **🤝 Think-alike buddies:** the pair of players who picked the same option the most times. Ties go to the first pair found. Not shown if no pair ever matched.
- **🌈 Everyone agreed** on *N* cards (cards where all players picked the same option), if any.
- For each player, how many times they picked A and how many times they picked B.

**🔁 Play again** goes back to setup with the same players. **🏠 All games** returns to the portal.

## State (in `game.js`)

```
count     number of players chosen (2–4)
setup     name + avatar for each of the 4 possible players
players   [{ name, avatar, color }] for this game
deck      shuffled cards still face down
reader    index of the player whose turn it is
card      the card currently face up (null between turns)
picks     { playerIndex: "A" | "B" } for the current card
history   [{ card, picks }] for every finished card
```

## Things to keep when changing this game

- Must work on phone, iPad and laptop. On narrow screens the A/B options stack vertically.
- No scoring, by design.
- Uses theme role colors only (A = `--coral`, B = `--teal`, "or" and highlights = `--yellow`). No hard-coded colors.
- `cards.js` is a plain script, not JSON, so this game also works when opened straight from disk (`file://`).
