// One color per NPS region, loosely matching its landscape. Every view will use these.
// (Moves to its own colors.js once a second view needs it.)
const REGION_COLORS = {
  "Intermountain": "#7c3d18", // red rock canyons
  "Pacific West": "#09659f",  // Pacific Ocean
  "Alaska": "#611ec1",        // northern lights
  "Southeast": "#167e1c",     // forests and swamps
  "Northeast": "#b1236d",     // autumn foliage
  "Midwest": "#9c8e12",       // prairie grass
};

// Turn the monthly rows into one summary object per region, busiest parks first
function summarizeByRegion(rows) {
  const totals = {};       // region -> total visits over all months
  const parks = {};        // region -> Set of park codes (a Set ignores repeats)
  const years = new Set(); // every year in the data

  for (const row of rows) {
    // First time we see this region: start its total and its park set
    if (totals[row.Region] === undefined) {
      totals[row.Region] = 0;
      parks[row.Region] = new Set();
    }
    totals[row.Region] += row.RecreationVisits;
    parks[row.Region].add(row.UnitCode);
    years.add(row.Year);
  }

  const regions = [];
  for (const region in totals) {
    const parkCount = parks[region].size;
    regions.push({
      region: region,
      parkCount: parkCount,
      // Divide by parks AND years, so regions with many parks don't win just by having more
      avgPerParkYear: totals[region] / parkCount / years.size,
    });
  }

  // Biggest first, so the chart reads as a ranking
  regions.sort((a, b) => b.avgPerParkYear - a.avgPerParkYear);
  return regions;
}

function drawRegionBars(rows) {
  const regions = summarizeByRegion(rows);

  // Margin convention: the inner width/height is the plot area; margins hold the axes
  const margin = { top: 44, right: 16, bottom: 56, left: 72 };
  const width = 720 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  // viewBox makes the SVG scale down to fit narrow screens
  const svg = d3.select("#region-chart")
    .append("svg")
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`);

  // Everything inside g is shifted so (0, 0) is the top-left of the plot area
  const g = svg.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // x: one evenly spaced slot per region; padding leaves gaps between bars
  const x = d3.scaleBand()
    .domain(regions.map(d => d.region))
    .range([0, width])
    .padding(0.3);

  // y: visits -> pixels. Range is [height, 0] because SVG y grows downward
  const y = d3.scaleLinear()
    .domain([0, d3.max(regions, d => d.avgPerParkYear)])
    .range([height, 0])
    .nice();

  // Readable numbers: 2449160 -> "2.4M", 216762 -> "220k"
  const formatVisits = d3.format(".2s");

  // Bars: one rect per region (the key function d => d.region matches bars to regions)
  g.selectAll(".bar")
    .data(regions, d => d.region)
    .join("rect")
    .attr("class", "bar")
    .attr("x", d => x(d.region))
    .attr("y", d => y(d.avgPerParkYear))
    .attr("width", x.bandwidth())
    .attr("height", d => height - y(d.avgPerParkYear))
    .attr("fill", d => REGION_COLORS[d.region]);

  // Label above each bar, line 1: the value
  g.selectAll(".bar-value")
    .data(regions, d => d.region)
    .join("text")
    .attr("class", "bar-value")
    .attr("x", d => x(d.region) + x.bandwidth() / 2)
    .attr("y", d => y(d.avgPerParkYear) - 22)
    .attr("text-anchor", "middle")
    .text(d => formatVisits(d.avgPerParkYear));

  // Label above each bar, line 2: how many parks the region has
  g.selectAll(".bar-parks")
    .data(regions, d => d.region)
    .join("text")
    .attr("class", "bar-parks")
    .attr("x", d => x(d.region) + x.bandwidth() / 2)
    .attr("y", d => y(d.avgPerParkYear) - 7)
    .attr("text-anchor", "middle")
    .text(d => d.parkCount === 1 ? "1 park" : d.parkCount + " parks");

  // Axes
  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x));

  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format("~s")));

  // Axis titles
  g.append("text")
    .attr("class", "axis-title")
    .attr("x", width / 2)
    .attr("y", height + 44)
    .attr("text-anchor", "middle")
    .text("NPS region");

  g.append("text")
    .attr("class", "axis-title")
    .attr("transform", "rotate(-90)") // rotated, so x now moves up/down and y left/right
    .attr("x", -height / 2)
    .attr("y", -54)
    .attr("text-anchor", "middle")
    .text("Avg. visits per park per year");
}
