// Layout numbers for this chart (named MONTH_... because all script files share one namespace)
const MONTH_LAYOUT = {
  width: 800,
  height: 250,
  margin: { top: 12, right: 20, bottom: 44, left: 64 },
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                     "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const LINE_COLOR = "#3d3d3a"; // neutral dark gray when no region is selected

// Pair 2: the month brush. Its "end" event fires when the user lets go of the mouse.
const monthBrush = d3.brushX().on("end", onBrushEnd);

// x: a continuous scale from month 1 to 12. Unlike a band scale it has .invert(),
// which the brush needs to turn pixels back into months. The domain never changes.
function monthXScale() {
  const { width, margin } = MONTH_LAYOUT;
  return d3.scaleLinear()
    .domain([1, 12])
    .range([0, width - margin.left - margin.right]);
}

// Turn the monthly rows into 12 objects (Jan-Dec): average visits in that month per year
function summarizeByMonth(rows) {
  const totals = {};       // month number (1-12) -> total visits over all parks and years
  const years = new Set(); // every year in the data

  // Start every month at 0, so the result always has all 12 months in order
  for (let month = 1; month <= 12; month++) {
    totals[month] = 0;
  }

  for (const row of rows) {
    totals[row.Month] += row.RecreationVisits;
    years.add(row.Year);
  }

  const months = [];
  for (let month = 1; month <= 12; month++) {
    months.push({
      month: month,
      // With no rows there are no years; avoid dividing by zero
      avgVisits: years.size > 0 ? totals[month] / years.size : 0,
    });
  }
  return months;
}

// Called when the user finishes a brush: turn the brushed pixels into whole months
function onBrushEnd(event) {
  // Our own code also moves the brush (in updateMonthlyLine). Those moves have no
  // sourceEvent (no mouse involved); ignore them, or the brush would trigger itself forever.
  if (!event.sourceEvent) {
    return;
  }

  // A click without dragging removes the brush: no month filter
  if (event.selection === null) {
    setMonthRange(null);
    return;
  }

  // A month is selected if its dot is inside the brush. Pixel-to-month math isn't exact
  // (an edge right on the Aug dot can come out as 7.9999), so allow a tiny tolerance.
  const x = monthXScale();
  const [left, right] = event.selection;
  const tolerance = 0.01; // 1/100 of a month, under 1px
  let firstMonth = Math.ceil(x.invert(left) - tolerance);
  let lastMonth = Math.floor(x.invert(right) + tolerance);

  // A narrow brush between two dots contains no dot: use the month nearest its center
  if (firstMonth > lastMonth) {
    firstMonth = Math.round(x.invert((left + right) / 2));
    lastMonth = firstMonth;
  }

  setMonthRange([firstMonth, lastMonth]);
}

// Runs once: create the SVG and the empty groups that updateMonthlyLine() fills in
function setupMonthlyLine() {
  const { width, height, margin } = MONTH_LAYOUT;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = d3.select("#month-chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`);

  const plot = svg.append("g")
    .attr("class", "plot")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  plot.append("g")
    .attr("class", "axis x-axis")
    .attr("transform", `translate(0, ${innerHeight})`);

  plot.append("g")
    .attr("class", "axis y-axis");

  // The brush goes BELOW the line and dots, so its gray band doesn't cover them.
  // The line and dots ignore the mouse (pointer-events: none in styles.css), so a drag
  // that starts on top of them still reaches the brush.
  // extent = the area you can brush in: the whole plot.
  monthBrush.extent([[0, 0], [innerWidth, innerHeight]]);
  plot.append("g")
    .attr("class", "brush")
    .call(monthBrush);

  // One path for the whole line, then a group for the dots so they sit on top of it
  plot.append("path").attr("class", "month-line");
  plot.append("g").attr("class", "dots");

  plot.append("text")
    .attr("class", "axis-title")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 36)
    .attr("text-anchor", "middle")
    .text("Month");

  plot.append("text")
    .attr("class", "axis-title")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -48)
    .attr("text-anchor", "middle")
    .text("Avg. visits per month");

  plot.append("text")
    .attr("class", "empty-message")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight / 2)
    .attr("text-anchor", "middle");
}

// Runs every time the data changes: recompute, rescale, move the line and dots, place the brush
function updateMonthlyLine(rows) {
  const months = summarizeByMonth(rows);
  const { height, margin } = MONTH_LAYOUT;
  const innerHeight = height - margin.top - margin.bottom;

  const plot = d3.select("#month-chart .plot");
  const x = monthXScale();

  // y starts at 0 so heights compare honestly (July really is ~4.6x January),
  // and rescales to the data shown
  const y = d3.scaleLinear()
    .domain([0, d3.max(months, d => d.avgVisits) || 1])
    .range([innerHeight, 0])
    .nice();

  // d3.line() turns the 12 {month, avgVisits} objects into one SVG path string
  const line = d3.line()
    .x(d => x(d.month))
    .y(d => y(d.avgVisits));

  // With a region selected, the line takes that region's color
  const color = state.region === null ? LINE_COLOR : REGION_COLORS[state.region];
  const duration = 300;

  // .datum (not .data): the whole array becomes ONE path
  plot.select(".month-line")
    .datum(months)
    .transition()
    .duration(duration)
    .attr("d", line)
    .attr("stroke", color);

  // One dot per month; the key function keeps each dot attached to its month
  plot.select(".dots").selectAll(".month-dot")
    .data(months, d => d.month)
    .join(enter => enter.append("circle")
      .attr("class", "month-dot")
      .attr("r", 4)
      .attr("cx", d => x(d.month))
      .attr("cy", d => y(d.avgVisits)))
    .transition()
    .duration(duration)
    .attr("cx", d => x(d.month))
    .attr("cy", d => y(d.avgVisits))
    .attr("fill", color);

  plot.select(".x-axis")
    .call(d3.axisBottom(x)
      .tickValues([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) // exactly one tick per month
      .tickFormat(month => MONTH_NAMES[month - 1]));      // month 1 -> MONTH_NAMES[0] = "Jan"

  plot.select(".y-axis")
    .transition()
    .duration(duration)
    .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format("~s")));

  // Draw the brush where the state says it should be. This also snaps a fresh brush to
  // whole months (edges halfway between dots), and removes it after Clear.
  if (state.monthRange === null) {
    plot.select(".brush").call(monthBrush.move, null);
  } else {
    const [range0, range1] = x.range();
    const left = Math.max(range0, x(state.monthRange[0] - 0.5));
    const right = Math.min(range1, x(state.monthRange[1] + 0.5));
    plot.select(".brush").call(monthBrush.move, [left, right]);
  }

  const regionText = state.region === null ? "all parks combined" : state.region + " parks only";
  d3.select("#month-caption").text("Average recreation visits in each calendar month, " + regionText + ", 2022–2025. Drag across months to select them.");

  // Empty state: 12 zeros would look like real data, so hide the line, dots and value axis
  const isEmpty = rows.length === 0;
  plot.select(".empty-message").text(isEmpty ? "No visits match this selection." : "");
  plot.select(".month-line").style("display", isEmpty ? "none" : null);
  plot.select(".dots").style("display", isEmpty ? "none" : null);
  plot.select(".y-axis").style("display", isEmpty ? "none" : null);
}
