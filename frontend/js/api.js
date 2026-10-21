// The only place the frontend knows where the backend lives.
// If we deploy, change this one line to the deployed backend's address.
const API_BASE = "http://localhost:8000";

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
