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

Each quiz theme is one file in **`games/quiz/themes/`**, with 150 or more questions each:

| Theme | File |
|---|---|
| 🌍 Countries | `countries.js` |
| 🚩 Guess the Flag | `flags.js` |
| 🏷️ Guess the Logo | `logos.js` |
| 🟥 Roblox | `roblox.js` |
| ⛏️ Minecraft | `minecraft.js` |
| 🔬 Science | `science.js` |
| 🚀 Space & Beyond | `space.js` |
| 🪐 Planets | `planets.js` |
| 🤔 Myths: True or False? | `myths.js` |
| 🫀 Human Body | `human-body.js` |
| 🦸 Animal Superpowers | `animal-superpowers.js` |

A question is one line. **The first choice is always the right answer** (the game shuffles them):

```js
["Which planet is called the Red Planet?", "Mars", "Venus", "Jupiter", "Mercury"],
```

True or false questions have just two choices, with the right one first:

```js
["Octopuses have three hearts.", "True", "False"],
```

Picture questions use an image link:

```js
{ q: "Which country does this flag belong to?", img: "https://...", answer: "Japan", wrong: ["China", "Peru", "Kenya"] },
```

Flag pictures come from [flag-icons](https://github.com/lipis/flag-icons) and logos from [Simple Icons](https://simpleicons.org). Both are free collections served by the jsDelivr CDN, so picture questions need an internet connection.

**To add a new theme,** copy one of the theme files, change its `id`, `name`, `emoji` and questions, and add a `<script>` line for it near the bottom of `games/quiz/index.html`.

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

You can also play locally by double-clicking `index.html`. It works without a server.
