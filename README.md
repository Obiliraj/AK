# Kids Game Zone 🎈

A small collection of browser games for kids. It works on iPad, phones and laptops. Everything is plain HTML, CSS and JavaScript, so there's no build step.

## Games

| Game | Players | Folder |
|------|---------|--------|
| 🤔 Would You Rather? | 2–4 | `games/would-you-rather/` |
| 🏆 Quiz Champs | 1–4 | `games/quiz/` |

## Change the Would You Rather cards

Open **`games/would-you-rather/cards.js`** and edit the list. Each card looks like this:

```js
{ a: "have a giraffe's long neck", b: "have an elephant's trunk" },
```

The game adds "Would you rather…" in front of every card. You can add or remove as many cards as you like.

## Change the Quiz Champs questions

Each quiz theme is a JSON file in **`games/quiz/themes/`**, with 150 or more questions each. `themes.json` lists the themes (name, emoji, color and file).

| Theme | File |
|---|---|
| 🌍 Countries | `countries.json` |
| 🚩 Guess the Flag | `flags.json` |
| 🏷️ Guess the Logo | `logos.json` |
| 🟥 Roblox | `roblox.json` |
| ⛏️ Minecraft | `minecraft.json` |
| 🔬 Science | `science.json` |
| 🚀 Space & Beyond | `space.json` |
| 🪐 Planets | `planets.json` |
| 🤔 Myths: True or False? | `myths.json` |
| 🫀 Human Body | `human-body.json` |
| 🦸 Animal Superpowers | `animal-superpowers.json` |

Every question has the same four fields, with or without a picture:

```json
{
  "Question": "Which country does this flag belong to?",
  "Image": "https://cdn.jsdelivr.net/npm/flag-icons@7.6.0/flags/4x3/jp.svg",
  "Answer": "Japan",
  "Choices": ["Japan", "China", "Peru", "Kenya"]
}
```

- **Image** is a picture link, or `""` for no picture. The picture only shows when there is a link.
- **Answer** must exactly match one of the **Choices**. The game shuffles the choices.
- **True or false** questions have just two choices: `"Choices": ["True", "False"]`.

Questions with a missing field, or an Answer that isn't in the Choices, are skipped (the browser console says which one).

Flag pictures come from [flag-icons](https://github.com/lipis/flag-icons) and logos from [Simple Icons](https://simpleicons.org). Both are free collections served by the jsDelivr CDN, so picture questions need an internet connection.

**To add a new theme,** create a new JSON file in `games/quiz/themes/` and add an entry for it to `themes.json`.

> The quiz loads its questions from these JSON files, so it must be opened from a web address (GitHub Pages, or a local server such as `python3 -m http.server`). Double-clicking `index.html` on your computer won't load the questions.

**Scoring:** 1 point for each right answer. 5 right in a row gives +1 bonus point, and 10 in a row gives +2 more. After 10, a new streak starts, so 15 in a row gives +1 again and 20 gives +2. A wrong answer resets the streak.

## Player name

The first time someone opens the landing page, it asks for their name. They can type one, or build a silly name like "Curious Cucumber" from two word lists. The name is saved in that browser and used again next time. The **✏️ Change name** button lets them change it, and the game fills it in as Player 1.

To change the silly name words, edit **`assets/names.js`**.

## Add a new game

1. Create a folder in `games/your-game/` with an `index.html`.
2. Add an entry to `games.js`. The landing page lists everything in that file.

## Host on GitHub Pages

1. Push this folder to a GitHub repository.
2. In the repository, go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, pick `main` and `/ (root)`, then save.
4. After a minute your site will be at `https://<your-username>.github.io/<repo-name>/`.

To play on your own computer, run `python3 -m http.server` in this folder and open http://localhost:8000. (Would You Rather also works by double-clicking its file, but Quiz Champs needs a server to load its JSON questions.)
