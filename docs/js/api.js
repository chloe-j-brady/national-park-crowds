// The only place the frontend knows where the backend lives.
// Opened on this computer (localhost / 127.0.0.1) -> the local backend.
// Opened anywhere else (the GitHub Pages site) -> the backend deployed on Render.
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const API_BASE = isLocal ? "http://localhost:8000" : "https://national-park-crowds.onrender.com";

// Fetch all cleaned monthly rows (one per park per month) from the backend
async function fetchVisits() {
  const response = await fetch(API_BASE + "/api/visits");

  // fetch() only throws if the server can't be reached; a 404 or 500 still "succeeds",
  // so check the status ourselves
  if (!response.ok) {
    throw new Error("API error: " + response.status);
  }

  return response.json();
}
