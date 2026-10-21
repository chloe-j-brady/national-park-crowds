// Layout numbers for this chart (named MONTH_... because all script files share one namespace)
const MONTH_LAYOUT = {
  width: 720,
  height: 320,
  margin: { top: 20, right: 24, bottom: 56, left: 72 },
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                     "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const LINE_COLOR = "#3d3d3a"; // neutral dark gray for now

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

  // One path for the whole line; drawn before the dots so the dots sit on top
  plot.append("path")
    .attr("class", "month-line")
    .attr("stroke", LINE_COLOR);

  plot.append("text")
    .attr("class", "axis-title")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 44)
    .attr("text-anchor", "middle")
    .text("Month");

  plot.append("text")
    .attr("class", "axis-title")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -54)
    .attr("text-anchor", "middle")
    .text("Avg. visits per month");

  plot.append("text")
    .attr("class", "empty-message")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight / 2)
    .attr("text-anchor", "middle");
}

// Runs every time the data changes: recompute, rescale, and move the line and dots
function updateMonthlyLine(rows) {
  const months = summarizeByMonth(rows);
  const { width, height, margin } = MONTH_LAYOUT;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const plot = d3.select("#month-chart .plot");

  // x: a continuous scale from month 1 to 12. Unlike a band scale it has .invert(),
  // which the brush will need to turn pixels back into months.
  const x = d3.scaleLinear()
    .domain([1, 12])
    .range([0, innerWidth]);

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

  const duration = 300;

  // .datum (not .data): the whole array becomes ONE path
  plot.select(".month-line")
    .datum(months)
    .transition()
    .duration(duration)
    .attr("d", line);

  // One dot per month; the key function keeps each dot attached to its month
  plot.selectAll(".month-dot")
    .data(months, d => d.month)
    .join(enter => enter.append("circle")
      .attr("class", "month-dot")
      .attr("r", 4)
      .attr("fill", LINE_COLOR)
      .attr("cx", d => x(d.month))
      .attr("cy", d => y(d.avgVisits)))
    .transition()
    .duration(duration)
    .attr("cx", d => x(d.month))
    .attr("cy", d => y(d.avgVisits));

  plot.select(".x-axis")
    .call(d3.axisBottom(x)
      .tickValues([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) // exactly one tick per month
      .tickFormat(month => MONTH_NAMES[month - 1]));      // month 1 -> MONTH_NAMES[0] = "Jan"

  plot.select(".y-axis")
    .transition()
    .duration(duration)
    .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format("~s")));

  // Empty state: 12 zeros would look like real data, so hide the line, dots and value axis
  const isEmpty = rows.length === 0;
  plot.select(".empty-message").text(isEmpty ? "No visits match this selection." : "");
  plot.select(".month-line").style("display", isEmpty ? "none" : null);
  plot.selectAll(".month-dot").style("display", isEmpty ? "none" : null);
  plot.select(".y-axis").style("display", isEmpty ? "none" : null);
}
