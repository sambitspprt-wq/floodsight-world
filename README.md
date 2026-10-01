# FloodSight · World

A software-only urban flood-forecasting dashboard for **any city in the world**, powered by
**live weather from Open-Meteo**. Clone of the "FloodSight" demo concept, rebuilt and
extended to cover the entire globe (all countries + any searchable town).

> Academic prototype · no hardware required · **zero npm dependencies** (pure Node.js)

---

## What's inside

```
floodsight/
├── server.js      # Tiny Node server: serves the page + proxies Open-Meteo (weather & geocoding)
├── index.html     # The whole dashboard (HTML + CSS + JS in one file, no build step)
├── package.json   # Just for the `npm start` script — no dependencies
└── README.md      # You are here
```

The entire UI and the flood-risk model live inside `index.html`. You can even open it
directly in a browser by double-clicking it — it falls back to calling Open-Meteo from
the browser and works standalone.

## Why the server?

The browser needs a way to reach Open-Meteo. `server.js` proxies two API routes so the
page never needs CORS workarounds and also works in sandboxed/embedded previews:

| Route | What it does |
|---|---|
| `GET /api/weather?lat=..&lon=..` | Live weather + hourly/daily rainfall (10-min cache) |
| `GET /api/geocode?q=CityName` | Searches any city/town worldwide via Open-Meteo geocoding |
| `GET /api/health` | Health check |
| `GET /` | Serves the dashboard |

## Run it

```bash
cd floodsight
npm start          # or: node server.js
```

Then open **http://localhost:8080**

## Open in Cursor

1. Download / unzip the project folder.
2. In Cursor: **File → Open Folder…** → select the `floodsight` folder.
3. Open a terminal in Cursor (Ctrl+`) and run:

   ```bash
   npm start
   ```

4. Open http://localhost:8080 in your browser.

> Optional: install the **Live Server** extension and "Go Live" on `index.html` — it
> works too (the page self-hosts and calls Open-Meteo directly).

---

## 🚀 Deploy (host it online)

The app is a plain Node.js server with **zero dependencies**, so it deploys to any
Node host in minutes. `server.js` already binds to `0.0.0.0` and reads the `PORT`
environment variable that every host sets automatically.

### Option A — Render (recommended, free)

1. Push this folder to a GitHub repo:
   ```bash
   git init
   git add .
   git commit -m "FloodSight World"
   git branch -M main
   git remote add origin https://github.com/<you>/floodsight-world.git
   git push -u origin main
   ```
2. Go to **render.com → New → Blueprint** (or **New → Web Service**) and connect the repo.
   - The included `render.yaml` does everything for Blueprint.
   - Manual: Runtime **Node** · Build command *(empty)* · Start command `node server.js`.
3. Pick the **Free** plan → Create. Your live URL will be
   `https://floodsight-world.onrender.com`.

> Free Render services **sleep after ~15 min of inactivity** — the first visit after a
> pause takes ~30–50 s to wake up. It's normal, not broken.

### Option B — Railway

1. Push to GitHub (same as above).
2. **railway.app → New Project → Deploy from GitHub repo** → select the repo.
3. Railway auto-detects Node. Set the start command to `node server.js` if asked.
4. Railway gives you a free `*.up.railway.app` URL.

### Option C — any other Node host (Fly.io, Koyeb, Cyclic, a VPS)

The only requirement: run `node server.js` with a `PORT` env var. There is no build
step and no database — the whole app is four files.

---

## The risk model (editable, in `index.html`)

Search for the `MODEL` object near the top of the `<script>` block:

```js
const MODEL = {
  weights: { intensity:35, accumulation24:30, forecast48:20, storm:5, baseline:10 },
  intensityMax: 20,    // mm/h  -> full marks
  accumMax: 100,       // mm/24h -> full marks
  forecastMax: 150,    // mm/48h -> full marks
  heavyRate: 7.6,      // IMD "heavy rain" threshold (mm/h)
  heavy24: 64.5,       // IMD "heavy" (mm/day)
  veryHeavy24: 115.6,  // IMD "very heavy" (mm/day)
  highAccum48: 115,    // mm/48h alert threshold
};
```

Overall risk = rainfall intensity + 24-h accumulation + 48-h forecast + storm severity
+ per-city flood proneness, all clamped to 0–100%.

## City coverage

- **355+ curated cities** — every country's capital plus major world cities (grouped
  **India** and **World** in the search dropdown) — instant, offline.
- **Any other city / town / state anywhere on Earth** — type a name and hit *Search*
  (live Open-Meteo geocoding, global).

## Disclaimer

Risk scores are heuristic estimates from live weather + static city profiles — **not** an
official flood warning. Always follow your national meteorological service and local
disaster-authority advisories.

## Data

- Weather & geocoding: [Open-Meteo](https://open-meteo.com)
- Rainfall thresholds: standard heavy-rainfall categories (IMD-inspired)
