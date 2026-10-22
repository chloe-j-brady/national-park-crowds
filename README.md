# Escaping the Crowds: U.S. National Park Visitation, 2022–2025

An interactive dashboard that helps trip planners find when and where to visit U.S. national parks without the crowds. Built for CIS 4930 Introduction to Data Visualization (FSU, Fall 2026), Assignment 2.

**Live site:** https://chloe-j-brady.github.io/national-park-crowds/

The backend runs on Render's free tier, which sleeps after about 15 minutes without visitors.
**The first load can take up to a minute** while it wakes up; after that the dashboard is fast.
If you see "Couldn't load data", wait a minute and reload the page.

## Data

Monthly recreation visits for all 63 U.S. national parks, January 2022 – December 2025, from the
[NPS Visitor Use Statistics portal](https://irma.nps.gov/Stats/) (Query Builder for Public Use Statistics, Park Type = National Parks).
The raw CSV is included at `backend/data/raw/nps_visits_raw.csv`.

## Requirements

- Python 3.11+ (required by pandas 3)
- A modern web browser

## How to run

**One-time setup** (from the project folder): create a virtual environment and install the backend packages.

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

Then open **two terminals** from the project folder.

**Terminal 1 — backend (port 8000):**

```bash
source .venv/bin/activate
cd backend
uvicorn main:app --reload --port 8000
```

The API docs are at http://localhost:8000/docs.

**Terminal 2 — frontend (port 5173):**

```bash
cd docs
python3 -m http.server 5173
```

Then open http://localhost:5173 in your browser.

No API keys or environment variables are needed.

## How the deployed version works

- **Frontend:** GitHub Pages serves the `docs/` folder (Pages can only serve the repo root or `/docs`).
- **Backend:** https://national-park-crowds.onrender.com (the data is at `/api/visits`).
- The page picks its API address automatically (`docs/js/api.js`): `http://localhost:8000` when
  opened on localhost, the Render address everywhere else. So the same code works locally and online.
- The backend's CORS list (`ALLOWED_ORIGINS` in `backend/main.py`) allows `http://localhost:5173`
  and `https://chloe-j-brady.github.io`.

## Project structure

```
backend/    FastAPI server that loads and serves the data
docs/       HTML + D3 dashboard (served by GitHub Pages)
notebooks/  Exploratory analysis
```
