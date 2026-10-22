// Layout numbers for this chart (named MONTH_... because all script files share one namespace)
const MONTH_LAYOUT = {
  width: 800,
  height: 250,
  margin: { top: 12, right: 20, bottom: 44, left: 64 },
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                     "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const LINE_COLOR = "#3d3d3a"; // neutral dark gray when no region is selected

// Pair 2: the month brush. "start" fires when a drag begins, "end" when the user lets go.
const monthBrush = d3.brushX()
  .on("start", onBrushStart)
  .on("end", onBrushEnd);

// A drag by the user stops the Play animation. This has to happen when the drag STARTS:
// otherwise the timer would keep moving the brush out from under the mouse.
// (Moves made by our own code have no sourceEvent, so the animation doesn't stop itself.)
function onBrushStart(event) {
  if (event.sourceEvent) {
    stopPlaying();
  }
}

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

// Pointer moved over the plot: highlight the nearest month and show its tooltip
function onMonthHover(event) {
  // A button is held down = the user is dragging a brush: no tooltip while brushing
  if (event.buttons !== 0) {
    onMonthLeave();
    return;
  }

  const plot = d3.select("#month-chart .plot");
  const months = plot.select(".month-line").datum(); // the 12 months currently drawn
  const yearTotal = d3.sum(months, d => d.avgVisits);
  if (yearTotal === 0) {
    return; // empty state: nothing to describe
  }

  // Pointer position in the plot's own coordinates (d3.pointer handles the margins and
  // any shrinking of the SVG), then the same inverse scale the brush uses -> nearest month
  const x = monthXScale();
  const [pointerX] = d3.pointer(event, plot.node());
  const month = Math.max(1, Math.min(12, Math.round(x.invert(pointerX))));
  const d = months[month - 1];

  plot.select(".hover-line")
    .attr("x1", x(month))
    .attr("x2", x(month))
    .style("display", null);
  plot.selectAll(".month-dot").attr("r", m => m.month === month ? 6 : 4);

  const who = state.region === null ? "all parks" : state.region + " parks";
  showTooltip(event, MONTH_NAMES[month - 1], [
    formatExact(d.avgVisits) + " avg. visits (" + who + ")",
    d3.format(".0%")(d.avgVisits / yearTotal) + " of the year's visits",
  ]);
}

function onMonthLeave() {
  const plot = d3.select("#month-chart .plot");
  plot.select(".hover-line").style("display", "none");
  plot.selectAll(".month-dot").attr("r", 4);
  hideTooltip();
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
    .call(monthBrush)
    // The brush layer covers the whole plot and gets all mouse events, so the tooltip
    // listens here too and works out the nearest month from the pointer's x position
    .on("pointermove", onMonthHover)
    .on("pointerleave", onMonthLeave);

  // Dashed vertical guide line at the hovered month (hidden until hover)
  plot.append("line")
    .attr("class", "hover-line")
    .attr("y1", 0)
    .attr("y2", innerHeight)
    .style("display", "none");

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
  // It slides over the same 300ms as the bars, so Play and snapping read as one motion.
  if (state.monthRange === null) {
    plot.select(".brush").call(monthBrush.move, null); // nothing to slide to: remove at once
  } else {
    const [range0, range1] = x.range();
    const left = Math.max(range0, x(state.monthRange[0] - 0.5));
    const right = Math.min(range1, x(state.monthRange[1] + 0.5));
    plot.select(".brush")
      .transition()
      .duration(duration)
      .call(monthBrush.move, [left, right]);
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
