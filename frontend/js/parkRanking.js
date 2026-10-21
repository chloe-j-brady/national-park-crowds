// Layout numbers for this chart (named PARK_... because all script files share one namespace).
// Bars have a fixed thickness; the chart's height follows how many parks are shown.
const PARK_LAYOUT = {
  width: 480,
  rowHeight: 11.5, // 63 parks x 11.5px = about 725px of bars
  margin: { top: 44, right: 40, bottom: 8, left: 170 },
};

// Every park is a National Park, so drop the repeated suffix to save space:
// "Gates of the Arctic NP & PRES" -> "Gates of the Arctic", "Zion NP" -> "Zion"
function shortParkName(name) {
  return name.replace(" NP & PRES", "").replace(" NP", "");
}

// Turn the monthly rows into one summary object per park, busiest first
function summarizeByPark(rows) {
  const totals = {};       // park name -> total visits over all months
  const regions = {};      // park name -> its NPS region (for the bar color)
  const years = new Set(); // every year in the data

  for (const row of rows) {
    if (totals[row.ParkName] === undefined) {
      totals[row.ParkName] = 0;
      regions[row.ParkName] = row.Region;
    }
    totals[row.ParkName] += row.RecreationVisits;
    years.add(row.Year);
  }

  const parks = [];
  for (const park in totals) {
    parks.push({
      park: park,
      region: regions[park],
      avgPerYear: totals[park] / years.size,
    });
  }

  parks.sort((a, b) => b.avgPerYear - a.avgPerYear);
  return parks;
}

// Runs once: create the SVG and the empty groups that updateParkRanking() fills in
function setupParkRanking() {
  const { width, margin } = PARK_LAYOUT;
  const innerWidth = width - margin.left - margin.right;

  const svg = d3.select("#park-chart").append("svg");

  const plot = svg.append("g")
    .attr("class", "plot")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // The x axis goes at the TOP, so it's readable without scrolling down a tall chart
  plot.append("g").attr("class", "axis x-axis");
  plot.append("g").attr("class", "axis y-axis park-names");

  plot.append("text")
    .attr("class", "axis-title")
    .attr("x", innerWidth / 2)
    .attr("y", -30)
    .attr("text-anchor", "middle")
    .text("Avg. visits per year");

  plot.append("text")
    .attr("class", "empty-message")
    .attr("x", innerWidth / 2)
    .attr("y", 30)
    .attr("text-anchor", "middle");
}

// Runs every time the data changes: recompute, resize, rescale, and move the bars
function updateParkRanking(rows) {
  const parks = summarizeByPark(rows);
  const { width, rowHeight, margin } = PARK_LAYOUT;
  const innerWidth = width - margin.left - margin.right;

  // Height follows the number of parks (at least 60px, so the empty message has room)
  const innerHeight = Math.max(parks.length * rowHeight, 60);
  const height = innerHeight + margin.top + margin.bottom;

  d3.select("#park-chart svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`);

  const plot = d3.select("#park-chart .plot");

  // y: one row per park, in ranked order (busiest at the top)
  const y = d3.scaleBand()
    .domain(parks.map(d => d.park))
    .range([0, parks.length * rowHeight])
    .padding(0.15);

  // x: visits -> pixels. The domain follows the parks shown, so filtering to a quiet
  // region rescales the axis instead of leaving every bar as a sliver.
  const x = d3.scaleLinear()
    .domain([0, d3.max(parks, d => d.avgPerYear) || 1])
    .range([0, innerWidth])
    .nice();

  const formatVisits = d3.format(".2s");
  const duration = 300;

  // Bars. The key function (d => d.park) keeps each bar attached to its park,
  // so a park that stays in the selection slides to its new row instead of being redrawn.
  // New bars start at zero width in their row, then grow. Color is set on enter only.
  plot.selectAll(".bar")
    .data(parks, d => d.park)
    .join(enter => enter.append("rect")
      .attr("class", "bar")
      .attr("x", 0)
      .attr("y", d => y(d.park))
      .attr("width", 0)
      .attr("fill", d => REGION_COLORS[d.region]))
    .transition()
    .duration(duration)
    .attr("y", d => y(d.park))
    .attr("height", y.bandwidth())
    .attr("width", d => x(d.avgPerYear));

  // Value label just past the end of each bar
  plot.selectAll(".bar-label")
    .data(parks, d => d.park)
    .join(enter => enter.append("text")
      .attr("class", "bar-label")
      .attr("x", 4)
      .attr("y", d => y(d.park) + y.bandwidth() / 2))
    .text(d => formatVisits(d.avgPerYear))
    .transition()
    .duration(duration)
    .attr("x", d => x(d.avgPerYear) + 4)
    .attr("y", d => y(d.park) + y.bandwidth() / 2);

  plot.select(".x-axis")
    .transition()
    .duration(duration)
    .call(d3.axisTop(x).ticks(4).tickFormat(d3.format("~s")));

  // Park names on the left; tickSize(0) hides the little tick lines next to each name
  plot.select(".y-axis")
    .transition()
    .duration(duration)
    .call(d3.axisLeft(y).tickSize(0).tickPadding(6).tickFormat(shortParkName));

  // Empty state: show a message and hide the value axis (its [0, 1] placeholder ticks mean nothing)
  const isEmpty = parks.length === 0;
  plot.select(".empty-message").text(isEmpty ? "No parks match this selection." : "");
  plot.select(".x-axis").style("display", isEmpty ? "none" : null);
}
