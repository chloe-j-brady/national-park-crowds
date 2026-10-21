// The one shared selection. Views READ it to draw themselves; only the functions
// in this file CHANGE it, and every change ends by calling render().
const state = {
  region: null,     // e.g. "Southeast", or null for all regions
  monthRange: null, // [firstMonth, lastMonth] e.g. [6, 8] for Jun-Aug, or null for all months
};

let allRows = []; // every row from the API, fetched once at startup

function setRegion(region) {
  state.region = region;
  render();
}

function setMonthRange(monthRange) {
  state.monthRange = monthRange;
  render();
}

function clearSelection() {
  state.region = null;
  state.monthRange = null;
  render();
}

// Keep only the rows that match the given region and month range (null = don't filter on it)
function filterRows(region, monthRange) {
  return allRows.filter(row => {
    if (region !== null && row.Region !== region) {
      return false;
    }
    if (monthRange !== null && (row.Month < monthRange[0] || row.Month > monthRange[1])) {
      return false;
    }
    return true;
  });
}

// [6, 8] -> "Jun–Aug", [7, 7] -> "Jul"
function formatMonthRange(monthRange) {
  const first = MONTH_NAMES[monthRange[0] - 1];
  const last = MONTH_NAMES[monthRange[1] - 1];
  return first === last ? first : first + "–" + last;
}

// Redraw everything from the current state.
// A view is never filtered by its own selection: the region bars ignore state.region,
// and the monthly line ignores state.monthRange.
function render() {
  updateRegionBars(filterRows(null, state.monthRange));
  updateMonthlyLine(filterRows(state.region, null));
  updateParkRanking(filterRows(state.region, state.monthRange));

  // Header bar: say what's selected, and enable Clear only when there's something to clear
  const regionText = state.region === null ? "all regions" : state.region;
  const monthText = state.monthRange === null ? "all months" : formatMonthRange(state.monthRange);
  d3.select("#selection-label").text("Showing: " + regionText + " · " + monthText);

  const nothingSelected = state.region === null && state.monthRange === null;
  d3.select("#clear-button").property("disabled", nothingSelected);
}
