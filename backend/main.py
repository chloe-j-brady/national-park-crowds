from pathlib import Path

import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Build the path from this file's folder, so it works no matter where uvicorn is started
DATA_PATH = Path(__file__).parent / "data" / "raw" / "nps_visits_raw.csv"

# Pages allowed to read our responses (CORS): the local frontend (python3 -m http.server 5173)
# and the GitHub Pages site. An origin is only scheme + host: no path, no trailing slash.
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://chloe-j-brady.github.io",
]


def load_visits():
    """Read the raw CSV and clean it (same steps as Cell 2 in notebooks/explore.ipynb)."""
    # utf-8-sig strips the invisible byte-order mark at the start of the file
    raw = pd.read_csv(DATA_PATH, encoding="utf-8-sig")

    # Keep only the 7 columns we use (the file has 35)
    columns = ["ParkName", "UnitCode", "Region", "State", "Year", "Month", "RecreationVisits"]
    df = raw[columns]

    # Visits are text like "10,411": remove the commas, then convert to whole numbers
    df["RecreationVisits"] = df["RecreationVisits"].str.replace(",", "").astype(int)

    # Region values have trailing spaces ("Intermountain "), which would break filters
    df["Region"] = df["Region"].str.strip()

    # A real date (first day of each month) so time series sort and plot in order
    df["Date"] = pd.to_datetime(df["Year"].astype(str) + "-" + df["Month"].astype(str) + "-01")

    return df


# Runs once, when uvicorn first imports this file -- not on every request
visits = load_visits()

app = FastAPI(title="NPS Crowds API")

# Allow the frontend (a different port = a different origin) to read our responses
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/api/visits")
def get_visits():
    """All cleaned monthly rows: one per park per month, Jan 2022 - Dec 2025."""
    return visits.to_dict(orient="records")
