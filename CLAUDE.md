# CLAUDE.md — NPS Crowds Dashboard (CIS 4930 Assignment 2)

## Who I am and how to work with me

I'm Chloe, a CS senior at FSU taking Intro to Data Visualization. My professor allows AI help **but requires me to be able to explain every line of code I submit.** Follow these rules on every task:

1. **Explain before you code.** Tell me the plan and *why* before writing anything. Wait for my go-ahead on anything bigger than a small fix.
2. **Keep code simple and explainable.** Prefer the plain, readable approach over the clever one. No dense one-liners, no unexplained abstractions.
3. **No new libraries or frameworks unless I ask.** The stack is below. If you think something else would help, suggest it and let me decide.
4. **Small steps.** One feature at a time, so I can test and understand it before moving on.
5. **After writing code, point out the 1–2 trickiest parts** and explain them so I could say them out loud to my professor.
6. **When debugging, explain what was wrong and why** — don't silently rewrite my code.
7. I care about visual polish — when layout, color or typography come up, suggest what would genuinely look good and why.
8. **Commit after each working step** with a short, clear message (I'll review before pushing). Never commit secrets, virtual environments or `node_modules`. Do not add Co-Authored-By, Claude-Session, or any other AI attribution lines to commit messages.

## The assignment (summary)

Build a web-based interactive dashboard: **at least 3 views**, **at least 2 distinct cross-view brushing/linking pairs**, served by **my own backend** (data must come from the API, never hard-coded in JS). Deliverables: project ZIP with README, narrated demo video (4–6 min), links file, PDF write-up (600–1200 words).
**Deadline: Sunday, Nov 8, 2026, 11:55pm.**

Grading: Views 7 pts · Coordination 8 pts · Full-stack 4 pts · Write-up 3 pts · Video 3 pts · up to +3 extra credit.

## Project

**Dataset:** NPS Visitor Use Statistics (https://irma.nps.gov/Stats/) — monthly recreation visits.
Downloaded via Reports → National Reports → Query Builder for Public Use Statistics, Park Type = National Parks, years 2022–2025.
**Raw file:** `backend/data/raw/nps_visits_raw.csv`

**Scope:** all 63 units designated "National Park", **Jan 2022 – Dec 2025**.
**Why 2022–2025:** the audience is planning trips now; 2020–2021 are distorted by COVID closures, and older patterns no longer describe current crowds. No pre-COVID data — a deliberate design decision (goes in the write-up).

**Question (locked in Oct 20, after exploratory analysis in `notebooks/explore.ipynb`):**
> "Half of all national park visits go to just 10 parks, mostly in July. When and where can you escape the crowds?"

**Audience:** trip planners / the general public.

### What the raw file actually looks like (checked Oct 20)
- **3,024 rows** = 63 parks × 48 months. Every park has all 48 months; no duplicate park-months.
- **Already long format** (one row per park per month, with `Year` and `Month` columns) — **no reshaping needed.**
- 35 columns; we only use 7: `ParkName`, `UnitCode`, `Region`, `State`, `Year`, `Month`, `RecreationVisits`.
- 6 regions: Intermountain, Pacific West, Midwest, Alaska, Southeast, Northeast.
- Visits range 0 to ~1.7M per month.

### Attributes
- Categorical: park (`ParkName`, `UnitCode`), NPS region, state
- Quantitative: recreation visits (derived: share of total, visits per acre if the park-info table is added)
- Temporal: year, month
- Spatial (stretch only): latitude/longitude from a second park-info table

**Second table (stretch only — needed for the map / visits per acre):** one row per park — `UnitCode`, latitude, longitude, acreage. Join on `UnitCode` (not name — names like "Gates of the Arctic NP & PRES" are messy). Check all 63 parks match.

## Data cleaning (known issues)

- **Read with `encoding="utf-8-sig"`** — the file starts with an invisible byte-order mark that otherwise corrupts the first column name.
- **`RecreationVisits` is text with commas** ("10,411") → remove commas, convert to int.
- **`Region` has trailing spaces** ("Intermountain ") → `.str.strip()`. If skipped, region filters silently match nothing.
- **84 zero-visit months — keep them all, they are real:**
  - Seasonal closures (winter): Gates of the Arctic, Lake Clark, Katmai, Isle Royale (Nov–Mar), North Cascades (Dec 2022).
  - One-off closures: Death Valley Sep 2023; Carlsbad Caverns, Petrified Forest, American Samoa Oct 2025 (government shutdown); American Samoa Apr–May 2022.
  - Show them as "closed" in tooltips where useful; mention one-off closures as a limitation in the write-up.
- No negative values, no missing values, no duplicates.

## Views (core = required, stretch = only after core works end to end)

| View | Answers | In-view interaction | Status |
|---|---|---|---|
| Region bar chart | Where do the visits go? | Tooltip, hover highlight | core |
| Park ranking (horizontal bars, busiest → quietest) | Which parks are busy vs quiet? | Tooltip, hover highlight | core |
| Monthly visits line (average Jan–Dec year, 2022–2025) | When are parks busy or quiet? | Tooltip, month brush (d3.brushX) | core |
| Seasonality heatmap (park × month, share of yearly visits) | When is the quiet time to go? | Tooltip | stretch — likely 4th view |
| Map of parks | Where are they? | Tooltip, click to select | stretch / extra credit |

## Coordination pairs

- **Pair 1 — filter:** click a region in the region bar chart → park ranking and monthly line show only that region.
- **Pair 2 — re-aggregate:** brush the months you'd travel (e.g. Jun–Aug) on the monthly line → region bars and park ranking recompute totals for that window ("which parks are quietest during my trip?").

Rules:
- **One shared selection state object**, e.g. `{ region: null, monthRange: null }`. Every view re-renders from it. Views never update each other directly.
- Selection must be **visible** (highlighted bar, brush, a "Showing: Southwest, Jun–Aug" label) and **reversible** (a Clear button; clicking empty space resets).
- The whole dataset is small (~3k rows), so the client can fetch it once and do all brushing/filtering locally. The server still owns the data and provides aggregated endpoints.
- Every view needs an **empty state** message when nothing matches.
- Use **key functions** in D3 data joins and ~300ms transitions between states.
- Decide per view whether axes rescale or stay fixed, and note the reason (it goes in the write-up).

## Design conventions

- **One shared color scale: color = NPS region** (6 regions), identical in every view.
- Every view has a title, labelled axes with units, a legend where color/size means something, and a one-line caption.
- Tooltips follow the pointer and flip near the window edge.
- Format big numbers readably (e.g. 4.7M).

## Stack and structure

- **Backend:** Python, FastAPI + pandas, run with uvicorn on port **8000**. Load and clean the CSV **once at startup**. CORS enabled.
  - Packages live in a virtual environment at the project root (`.venv/`, git-ignored). Exact versions are pinned in `backend/requirements.txt`.
  - CORS allows only `http://localhost:5173` and `http://127.0.0.1:5173` (the `ALLOWED_ORIGINS` list in `backend/main.py`).
- **Frontend:** plain HTML + D3 v7 (loaded from a CDN), served with `python3 -m http.server 5173` from inside `frontend/`. (Never open via file://.)
- API base URL lives in **one constant** in the frontend (`frontend/js/api.js`).

```
CIS4930-A2/
├── CLAUDE.md
├── README.md          # exact install/run commands and ports
├── .gitignore
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── data/
│       └── raw/nps_visits_raw.csv
├── frontend/
│   ├── index.html
│   ├── css/styles.css
│   └── js/            # state.js, api.js, one file per view
└── notebooks/
    └── explore.ipynb  # exploratory analysis
```

Planned endpoints (adjust as we go):
- `GET /api/visits?region=` — cleaned monthly visits (optionally filtered by region)
- `GET /api/summary/regions?month_min=&month_max=` — server-side totals by region
- `GET /api/summary/parks?region=&month_min=&month_max=` — server-side totals by park

## GitHub and deployment

- GitHub repo: `chloe-j-brady/national-park-crowds` (https://github.com/chloe-j-brady/national-park-crowds). Local folder is still named `CIS4930-A2` — that's fine. Commit early and often.
- `.gitignore` excludes virtual environments, `__pycache__`, `.ipynb_checkpoints`, `node_modules`, `.env`, `.DS_Store`.
- **GitHub Pages** can only serve from the repo root or a `/docs` folder. If we deploy, rename `frontend/` → `docs/` (`git mv frontend docs`) and update the README. The backend would go on Render (free tier). Decide by Nov 3; localhost-only is fully acceptable for grading.
- **If we deploy: add the deployed frontend's address (e.g. `https://chloe-j-brady.github.io`) to `ALLOWED_ORIGINS` in `backend/main.py`.** Otherwise the browser blocks every API response and the dashboard loads empty. Also point the API base URL in `frontend/js/api.js` at the Render backend.
- The dataset is small, so it is committed to the repo.

## Milestones

- [x] Oct 20 — data downloaded and sanity-checked
- [x] Oct 22 — exploratory checks done, question locked in (finished Oct 20)
- [ ] Oct 23 — paper sketch (photograph it for the write-up)
- [ ] Oct 25 — backend running with one endpoint; one view fetching from it
- [ ] Nov 1 — all three core views built
- [ ] Nov 3 — both coordination pairs working, selection visible + clearable
- [ ] Nov 3+ — stretch views only if core is done
- [ ] Nov 6 — deploy (or confirm README works from a fresh clone)
- [ ] Nov 7 — record video, write report
- [ ] Nov 8 — submit all four items

## Notes for the write-up (fill in as we go)

Record design decisions and their reasons here as they happen, plus anything that went wrong. AI use must be disclosed in the report.

- Oct 20: Scoped to 2022–2025 for a trip-planner audience (see Project).
- Oct 20: Kept all 84 zero-visit months — they are real seasonal or temporary closures, not missing data.
- Oct 20: Chose plain HTML + D3 over React to keep the code simple to explain and avoid React/D3 DOM conflicts with brushing.
- Oct 20 (exploration findings, `notebooks/explore.ipynb`):
  - **Top 10 parks get 52.1% of all visits** (an even split would be 15.9%). Great Smoky Mountains alone gets 13.5%.
  - **July is the busiest month and January the quietest in every year, 2022–2025.** Jun–Aug = 41% of the year; the monthly pattern is nearly identical year to year.
  - **→ Monthly line uses an average Jan–Dec year**, not the 48-month timeline: the years are consistent enough that averaging hides little, and a 12-month axis is easier to brush ("I'd travel Jun–Aug").
  - **20 of 63 parks do not peak in Jun–Aug.** 9 peak in March (desert/southern parks: Big Bend, Joshua Tree, Death Valley, Saguaro, White Sands, etc.); Big Bend gets only 11% of its year in summer. Alaska parks and Isle Royale are the opposite (64–88% in summer).
  - **Great Smoky Mountains (and Shenandoah) peak in October** (likely fall color), not summer.
  - **→ Heatmap is the likely 4th view:** per-park share of yearly visits shows these different seasons, which national totals hide.
  - **Caveat — heat:** a park that's quiet in summer is often quiet because it's dangerously hot (desert parks). "Quiet" ≠ "pleasant"; say so in captions and the write-up. Visit counts say nothing about weather or access.
- Oct 20 (region bar chart):
  - **Shows average visits per park per year, not the region total.** Totals mostly reflect how many parks a region has: Intermountain is first by total only because it has 19 parks. Per park, the ranking changes: Northeast 2.4M (3 parks), Southeast 2.2M (7), Intermountain 1.8M (19), Midwest 1.4M (9), Pacific West 1.2M (17), Alaska 220k (8). The park count is shown in each bar's label so readers can see why.
  - **Per year, not the 4-year total:** "visits per year" matches how a trip planner thinks and is easier to read. The number of years is counted from the data, not hard-coded.
  - **Region colors loosely match each landscape:** Intermountain brown (red rock), Pacific West blue (ocean), Alaska violet (northern lights), Southeast green (forests and swamps), Northeast magenta (autumn foliage), Midwest olive gold (prairie). The colors make the regions memorable without a legend lookup.
  - **Colors were checked, not eyeballed:** all six are dark enough to read on white (≥3:1 contrast) and were checked with a colorblind-vision simulator. No 6 landscape hues keep every pair far apart for colorblind viewers; this set was the best of ~150k candidates, so **color is never the only cue** — every view also names regions in text (axis labels, legend, tooltips).
