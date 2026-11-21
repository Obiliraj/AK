# Kids Game Zone 🎈

A small collection of browser games for kids. It works on iPad, phones and laptops. Everything is plain HTML, CSS and JavaScript, so there's no build step.

## Games

| Game | Players | Folder |
|------|---------|--------|
| 🤔 Would You Rather? | 2–4 | `games/would-you-rather/` |

## Change the Would You Rather cards

Open **`games/would-you-rather/cards.js`** and edit the list. Each card looks like this:

```js
{ a: "have a giraffe's long neck", b: "have an elephant's trunk" },
```

The game adds "Would you rather…" in front of every card. You can add or remove as many cards as you like.

## Add a new game

1. Create a folder in `games/your-game/` with an `index.html`.
2. Add an entry to `games.js`. The landing page lists everything in that file.

## Host on GitHub Pages

1. Push this folder to a GitHub repository.
2. In the repository, go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, pick `main` and `/ (root)`, then save.
4. After a minute your site will be at `https://<your-username>.github.io/<repo-name>/`.

You can also play locally by double-clicking `index.html`. It works without a server.
