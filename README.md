# AdventureSpark

Roll two dice to pick a small adventure. One die picks the category, the other adds a twist.

- `/` has two lists, switched in the page: **Without kids** and **With kids** (`/#kids`).
- `/sheffield/` is the Sheffield and Peak District list.

## Files

| File | What it does |
| --- | --- |
| `index.html`, `sheffield/index.html` | The two pages. They differ only in the `AS_CONFIG` line near the bottom. |
| `app.js` | Dice, filters, passport and screen grab. |
| `style.css` | All styling, including the Meadow colour scheme. |
| `data.js` | Every adventure, one per line. The comment at the top explains each field. |

To add an adventure, copy a line in `data.js` under `adults`, `kids` or `sheffield` and change it. Titles must be unique, because the passport tracks them by title.

No build step. Deploy as static files (Cloudflare Pages: no build command, output directory `/`).
