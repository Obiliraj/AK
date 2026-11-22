# 🏆 Quiz Champs — game logic

A turn-based multiple-choice and true/false quiz for **1–4 players** on one device, with streak bonuses and a winner announcement.

## Files

| File | What it does |
|---|---|
| `index.html` | The three screens (setup, game, end), rules and the question card |
| `quiz.js` | All game logic (below) |
| `quiz.css` | Styles. Uses the shared theme colors from `../../assets/portal.css` |
| `themes/themes.json` | The list of quiz themes |
| `themes/*.json` | The questions, one file per theme (150+ each) |

The page also loads `../../assets/theme.js` (color theme), `../../assets/player.js` (saved player name) and `../../assets/portal.css`.
Validate question files with `node tools/validate-questions.mjs` from the repo root.

## Question format (required by the owner, keep it exactly)

Each theme file is a JSON array. **Every question has the same four fields**, with or without a picture:

```json
{
  "Question": "Which planet is called the Red Planet?",
  "Image": "",
  "Answer": "Mars",
  "Choices": ["Mars", "Venus", "Jupiter", "Mercury"]
}
```

- `Image`: an `https://` picture link, or `""` for none.
- `Answer`: must exactly match one of `Choices`.
- `Choices`: 4 options for multiple choice. True/False questions have exactly `["True", "False"]`.

Questions are checked when they load (`normalise()` in `quiz.js`). A question with a missing field, fewer than 2 choices, or an Answer not in its Choices is **skipped**, with a warning in the browser console. Repeated choices are removed.

### themes.json

```json
{ "id": "flags", "name": "Guess the Flag", "emoji": "🚩", "color": "coral", "file": "flags.json", "imageStyle": "flag" }
```

- `color`: `"yellow"`, `"coral"` or `"teal"` (follows the site color theme). A hex color also works.
- `imageStyle` (optional): `"flag"` (wide, rounded picture on a dark tile) or `"logo"` (square picture on a white tile).
- A theme with no valid questions is hidden.

### Current themes

Countries (171), Guess the Flag (193), Guess the Logo (201), Roblox (150), Minecraft (154), Science (155), Space & Beyond (155), Planets (154), Myths: True or False? (152), Human Body (152), Animal Superpowers (153), for **1,790** questions in total.

Flag pictures are from `flag-icons@7.6.0` and logos from `simple-icons@16.36.0`, both via jsDelivr. See the root `CLAUDE.md` for the rules about picture questions (lookalike flags, no wordmark logos, pinned versions).

## Loading

- `themes/themes.json` and every theme file are loaded with `fetch` when the page opens. The Start button stays disabled until they have loaded.
- If loading fails (for example when the page is opened from `file://`), the theme area shows a message explaining that the quiz must be opened from its website or a local web server.
- A theme file that fails to load is skipped, and the others still work.

## Rules (as specified by the owner)

- Maximum **4 players**. Each player gets a turn: a question is shown and the player taps one of the options.
- **1 point** for each correct answer.
- **5 correct in a row: +1 bonus point. 10 correct in a row: +2 extra points.**
- The **winner is announced** at the end.

## Flow

### 1. Setup screen
1. **Players:** 1, 2, 3 or 4 (default 1). Names and avatars work as in Would You Rather. Player 1 is pre-filled from the saved name, and Player 1's name is saved again when the game starts.
2. **Themes:** tap tiles to select one or more (each tile shows its question count). **🎲 Random mix of all** selects every theme, and **Clear** deselects them all. Starting with no theme shows "Pick at least one theme first!".
3. **Questions for each player:** 5, 10 (default), 15 or 20.

### 2. Building the question deck
- All questions from the selected themes are put in one pool and shuffled (Fisher–Yates). That is how a "random mix" works.
- Questions are drawn from the end of the deck, so **no question repeats within a game**. If the deck ever runs out (only possible with very long games on one small theme), it is rebuilt and reshuffled.

### 3. Turn order
- Total turns = questions per player × number of players.
- Players take turns in order (P1, P2, P3, P4, P1, …): `currentPlayer = players[turn % players.length]`.

### 4. A question
- The card shows the theme tag (emoji and name), "Question *n* of *N*" for the current player, whose turn it is, and the question text.
- **Picture placeholder:** the card always contains `<img id="qImage">` inside `#qImageWrap`. If the question has an `Image` link, the placeholder is shown with that picture. If `Image` is empty, the placeholder and its wrapper are hidden.
- The next question's picture is preloaded.
- If a picture fails to load, "This picture didn't load" appears with **⏭️ Skip this question**. Skipping draws a different question for the **same** player, nothing is scored, and the turn is not used up.
- **Answers:** multiple-choice answers are shuffled and labelled A–D. True/False always shows **👍 True** then **👎 False**.
- **🔊 Read it to me** reads the question and its options aloud with speech synthesis. It is hidden while sound is switched off on the landing page (`assets/sound.js`).

### 5. Answering and scoring
When the player taps an answer, all buttons lock. The correct answer turns teal with ✓. If the pick was wrong, it turns coral with ✗ and shakes. The other answers are dimmed.

**Correct answer:**
```
score += 1; correct += 1; streak += 1; best = max(best, streak)
if streak % 10 == 5  → bonus = 1   (5, 15, 25 … in a row)
if streak % 10 == 0  → bonus = 2   (10, 20, 30 … in a row)
score += bonus
```
So a perfect run of 10 scores 10 + 1 + 2 = **13**, and 20 in a row scores 20 + 1 + 2 + 1 + 2 = **26**.
Feedback: "✅ Correct! +1 point", plus "🔥 *n* in a row! +*x* bonus point(s)!". A 10-in-a-row bonus also triggers a burst of emoji.

**Wrong answer:**
```
streak = 0
```
Feedback: "❌ Oops! The answer is *X*." If the player had a streak of 2 or more, it adds "Your *n*-answer streak ended."

Streaks belong to each player and carry across their turns (other players' turns in between don't break them).

The scoreboard shows each player's points and, from 2 in a row, a 🔥 streak count. The current player's chip is highlighted.

### 6. Next
The **Next** button says "Next: *Name* ➜" (or "Next question ➜" for one player). After the last turn it says "See who won! 🏆".

### 7. End of the game
The game ends after the last turn, or when someone taps **🏁 End** and confirms.

- Players are ranked by **score**, then by **number correct** if scores are equal.
- **One player:** "Great job, *Name*!" and "You got *x* out of *y* right and scored *z* points". The trophy is 🏆 for 80% or more, 🌟 for 50% or more, otherwise 💪.
- **One winner:** "🏆 *Name* wins!" with their points.
- **Tie on points:** "It's a tie!" listing the tied players.
- **Leaderboard:** medal (🥇🥈🥉🎖️; tied scores share a medal), avatar, name, "right/asked · bonus · best streak", and total points. Winners are outlined.
- Emoji confetti falls.
- **🔁 Play again** starts a new game with the same players, themes and length. **🎨 Change themes** returns to setup.

## Player state (in `quiz.js`)

```
name, avatar, color
score     total points (correct answers + bonuses)
correct   number of correct answers
bonus     bonus points earned
streak    current correct-in-a-row
best      longest streak this game
asked     questions answered so far
```

## Things to keep when changing this game

- The JSON question shape above is a requirement from the owner. Don't change it.
- Each theme must keep **at least 150 questions**, suitable for 10-year-olds.
- Must work on phone, iPad and laptop. Answers go to 1 column on phones, except True/False, which stays 2 columns.
- Use theme role colors only (right = `--teal`, wrong = `--coral`, highlights = `--yellow`), and keep the ✓/✗ marks, because some themes have no red or green.
- A quick check after changes: play a solo 10-question game answering everything right and expect **13 points**.
