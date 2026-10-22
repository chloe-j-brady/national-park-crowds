# CLAUDE.md — NPS Crowds Dashboard (CIS 4930 Assignment 2)

## How to work with me

I'm Chloe, a CS senior at FSU. This is an individual assignment: AI help is allowed (and disclosed in my report), but the design decisions must be mine and I must understand and be able to explain all the code. Work as my **pair programmer**: I direct, you help.

1. **Explain the plan first, then wait for my go-ahead** before writing or changing code.
2. **Write code only when I ask,** one small step at a time, so I can test and understand each piece before moving on.
3. **Keep code simple and explainable.** Plain, readable approaches over clever ones; no new libraries unless I ask.
4. **After writing code, point out the trickiest parts** so I could explain them to my professor. Quiz me when I ask.
5. **When I'm stuck, give hints and point me to the docs first.** If I want to try a fix myself, review my attempt instead of rewriting it.
6. **Design decisions are mine.** Lay out the options and trade-offs; I choose.
7. **Never commit or push.** I review the changes and do all git work myself.
8. Update "Notes for the write-up" only when I ask.

## Assignment

Web dashboard with **≥3 views** and **≥2 cross-view linking pairs**, data served by **my own backend**. Submit: project ZIP + README, 4–6 min narrated video, links file, 600–1200 word PDF write-up.
## Project

- **Data:** NPS Visitor Use Statistics (https://irma.nps.gov/Stats/), Query Builder, Park Type = National Parks. Monthly recreation visits, 63 parks, Jan 2022 – Dec 2025 (3,024 rows). Raw file: `backend/data/raw/nps_visits_raw.csv`.
- **Columns used:** `ParkName`, `UnitCode`, `Region`, `State`, `Year`, `Month`, `RecreationVisits`.
- **Question:** "Half of all national park visits go to just 10 parks, mostly in July. When and where can you escape the crowds?"
- **Audience:** trip planners.

**Cleaning:** read with `encoding="utf-8-sig"` (byte-order mark); remove commas from `RecreationVisits` and convert to int; `.str.strip()` on `Region` (trailing spaces). Keep all 84 zero-visit months; they are real closures, shown as "closed".

## What's built (as of Oct 21)

| View | Answers | Interaction |
|---|---|---|
| Region bars (visits per park per year) | Which regions have the busiest parks? | Click to filter, hover outline, tooltip |
| Monthly line (average Jan–Dec year) | When are parks busy? | Month brush, hover guide line, tooltip |
| Park ranking (63 horizontal bars) | Which parks are quiet then? | Hover band, tooltip |

- **Pair 1 (filter):** click a region → monthly line and ranking show only that region.
- **Pair 2 (re-aggregate):** brush months → region bars and ranking recompute for those months.
- **Shared state** `{ region, monthRange }` in `state.js`; `render()` redraws every view. A view is never filtered by its own selection.
- "Showing: …" label, Clear button, labels change to "in the selected months" when brushed.
- **Extra credit:** Play/Pause steps the brush Jan → Dec (`play.js`, `PLAY_STEP_MS`).
- Two-column layout fits one 14" laptop screen; stacks below 1100 px.

## Stack

- **Backend:** FastAPI + pandas, port 8000, `.venv/` at the project root, pinned `backend/requirements.txt`. Loads and cleans the CSV once at startup. One endpoint: `GET /api/visits`. CORS allows `localhost:5173` / `127.0.0.1:5173` (`ALLOWED_ORIGINS` in `main.py`).
- **Frontend:** plain HTML + D3 v7 (CDN), served from inside `frontend/` with `python3 -m http.server 5173`. API base URL in `frontend/js/api.js`. All filtering and aggregation happens in the browser.
- **Repo:** `chloe-j-brady/national-park-crowds`. Fresh-clone test passed Oct 21.
- **If deploying:** GitHub Pages serves only root or `/docs` (`git mv frontend docs`); backend on Render; add the Pages address to `ALLOWED_ORIGINS` and point `api.js` at Render.

## Notes for the write-up

Key decisions (full draft of the report exists separately):
- 2022–2025 only: trip-planner audience; 2020–21 distorted by COVID.
- Exploration: top 10 parks = 52% of visits; July busiest every year; 20 parks don't peak in summer (9 desert parks peak in March; Great Smoky peaks in October).
- Visits per park, not region totals (Intermountain is first by total only because it has 19 parks).
- Linear, not log, scale on the ranking; value labels show small parks.
- Average year, not 48 months: years nearly identical; easier to brush.
- Axes rescale on filter; 300 ms transitions.
- Color = region everywhere, landscape-inspired; never the only cue.
- Fade = not selected; outline = hovered.
- Plain D3 over React: simpler to explain, no DOM conflicts with the brush.
- Bugs fixed: byte-order mark and trailing spaces; brush dropping months (7.9999 rounding); brush ↔ state infinite loop; cached CSS.
- Limitation: "quiet" in summer often means "very hot"; counts say nothing about weather.
- AI use must be disclosed in the report.