# 🍦 Sunny Scoops — game logic

A single-player **money and mental arithmetic** game in Australian dollars. The player runs an ice cream shop: kids line up, order treats, and the player adds up the total, takes their money and gives the right change from the till.

## Files

| File | What it does |
|---|---|
| `index.html` | Top bar, HUD, shop scene, menu board, the three counter steps, start card and end-of-day card |
| `style.css` | Styles and animations. Uses only the shared theme colors from `../../assets/portal.css` |
| `game.js` | Menu, orders, payments, change, profit, sounds, drawn pictures and saving (below) |

The page also loads `../../assets/theme.js`, `../../assets/sound.js` (site-wide sound on/off), `../../assets/player.js` (the start card greets the saved player name), `music.js`, `settings.js` and `skyline.js`.

**Colors:** the page uses the theme role colors. The pictures drawn in `game.js` (notes, coins, ice cream flavours, food, drinks and the kids) have fixed colors, because money and food have real colors. This is an agreed exception, like Tower Builder's block materials.

## Money is stored in cents

All amounts are whole numbers of cents (`350` = $3.50) to avoid floating-point mistakes. `fmt()` turns cents into `$3.50`.

## The menu (prices in `game.js`)

| Group | Item | Price |
|---|---|---|
| Ice cream | Single scoop, any flavour | $3.50 |
| Ice cream | Double scoop, any flavour | $5.50 |
| Bakery | Donut | $2.50 |
| Bakery | Banana bread | $3.80 |
| Bakery | Gingerbread man | $2.25 |
| Bakery | Choc chip cookie | $1.45 |
| Bakery | Blueberry muffin | $3.20 |
| Bakery | Lamington | $2.80 |
| Drinks | Water bottle | $1.95 |
| Drinks | Apple juice | $3.00 |
| Drinks | Orange juice | $3.20 |
| Drinks | Mango juice | $3.40 |
| Drinks | Watermelon juice | $3.60 |
| Drinks | Strawberry milkshake | $4.50 |

Flavours: Chocolate, Vanilla, Strawberry, Mint choc chip, Mango, Cookies & cream, Bubblegum. Every price is a multiple of 5c (the smallest Australian coin).

## Levels

| Level | Lines in an order | Chance a line is "2 ×" |
|---|---|---|
| 🍦 Easy | 1–2 | never |
| 🍨 Medium | 2–3 | 30% |
| 🏆 Hard | 3–4 | 45% |

The first line is an ice cream 85% of the time; later lines 35%. The same item (or same flavour + scoop size) never appears twice in one order. The biggest possible order (Hard) is $44, so a $50 note always covers it. The chosen level is remembered.

## A day

- **8 customers** per day. The register starts every day with **$20**.
- HUD: Day · Customer (n / 8) · 💰 Register · ⭐ Today's profit (numbers bump when they change).
- The queue of waiting kids is shown above the current customer.
- **🏁 Close shop** (top bar) ends the day early. If a customer has already paid but not got their change, their money is handed back first. A day with no customers served is not saved.

## A customer (three steps)

### 1. Add up the total
- The customer's speech bubble lists the order with a picture, a quantity badge and the name (e.g. "2 Mango ice cream, single scoop").
- The player types the total (accepts `8.7`, `8.70`, `$8.70`) and taps **Tell the customer** (or presses Enter).
- Wrong: the message says whether it is **too high or too low**; the 2nd wrong try suggests the hint.
- **🔍 Show each price** lists `qty × item (price) = subtotal` for each line, but not the total.
- After **3 wrong tries** the game shows the total and how it adds up, and moves on.
- A customer counts as a "total slip" once if any try was wrong.

### 2. The customer pays
The customer almost never pays the exact amount. `makePayment()` picks at random from amounts **bigger** than the total:
- the next whole $1, $5, $10 and $20 (e.g. $8.70 → $9, $10 or $20);
- a $50 note if the total is over $20, or 15% of the time on Medium/Hard;
- "friendly" amounts that make round change: next $5 + the leftover cents below 50c (e.g. $8.70 → $10.20, change $1.50) and next $10 + the leftover cents below $1 (e.g. $8.65 → $10.65, change $2.00).

The payment is shown as the fewest notes and coins (`breakdown()`) and is **added to the register** at once.

### 3. Give the change
- The till has $20, $10, $5, $2, $1, 50c, 20c, 10c and 5c. The player always has every denomination.
- Tapping money puts it on the counter; tapping money on the counter puts it back; **Clear counter** empties it. The counter shows the running sum.
- **Give change** (needs at least one piece) settles the sale:

| Outcome | Register | Profit |
|---|---|---|
| Every sale | + payment − change given | **+10% of the total** (rounded to the cent) |
| ✅ Exact change | – | – |
| 😠 Too little | − shortage − **$1 sorry fine** | − $1 |
| 😲 Too much | (the extra already left the register) | − the extra |

The result card shows `Change = paid − total`, what the customer said, and a small ledger (10% profit, fine or loss, and the net for this customer). The customer's face changes (happy / cross / surprised).

## End of day

- Stars: **3** with no slips (totals or change), **2** with 1–2 slips, **1** otherwise (0 if nobody was served).
- Summary: customers served, total sales, totals right first time, perfect change, most profit possible (10% of all sales), today's profit, cash in register, best day ever and all-time profit.
- **Start next day** (day + 1) or **Change level** (back to the start card).

## Pictures

All pictures are SVG drawn in `game.js` (no image files):
- **Notes** in their real colours ($5 lilac-pink, $10 blue, $20 red-orange, $50 yellow) with a clear window. $50 is only used by customers.
- **Coins** at their real relative sizes (diameters in mm: 5c 19.4, 10c 23.6, 20c 28.5, 50c 31.5 and twelve-sided, $1 25, $2 20.5); $1 and $2 are gold.
- Treats and drinks, ice cream cones in the flavour's colour (one or two scoops), and kids with random skin, hair, hair style and shirt.

**Real photos instead:** add image files to an `images/` folder in this game and list them in `CURRENCY_IMAGES` at the top of `game.js` (e.g. `2000: 'images/20-dollars.png'`). Anything not listed is drawn. The Reserve Bank of Australia has rules for reproducing banknotes, so check them first.

## Sound

Web Audio tones (no files): tap, coin clink, happy arpeggio (right), low buzz (wrong), "hmm" (wrong total). Nothing plays when `SiteSound.isMuted()`.

## Saved data

localStorage key **`kgz.sunnyScoops`** (in try/catch):

```json
{ "level": "easy", "bestDay": 748, "lifetime": 2210, "days": 3 }
```

Amounts are in cents. The start card shows days played, best day and all-time profit.
