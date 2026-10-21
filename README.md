# Escaping the Crowds: U.S. National Park Visitation, 2022–2025

An interactive dashboard that helps trip planners find when and where to visit U.S. national parks without the crowds. Built for CIS 4930 Introduction to Data Visualization (FSU, Fall 2026), Assignment 2.

**Live site:** _coming soon_ (or: runs on localhost, see below)

## Data

Monthly recreation visits for all 63 U.S. national parks, January 2022 – December 2025, from the
[NPS Visitor Use Statistics portal](https://irma.nps.gov/Stats/) (Query Builder for Public Use Statistics, Park Type = National Parks).
The raw CSV is included at `backend/data/raw/nps_visits_raw.csv`.

## Requirements

- Python 3.10+
- A modern web browser

## How to run

Open **two terminals** from the project folder.

**Terminal 1 — backend (port 8000):**

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The API docs are at http://localhost:8000/docs.

**Terminal 2 — frontend (port 5173):**

```bash
cd frontend
python3 -m http.server 5173
```

Then open http://localhost:5173 in your browser.

No API keys or environment variables are needed.

## Project structure

```
backend/    FastAPI server that loads and serves the data
frontend/   HTML + D3 dashboard
notebooks/  Exploratory analysis
```
