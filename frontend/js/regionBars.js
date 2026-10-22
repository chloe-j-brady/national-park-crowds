// Layout numbers for this chart. Named REGION_... because all our script files share
// one global namespace, so two files can't both declare "margin".
const REGION_LAYOUT = {
  width: 800,
  height: 250,
  margin: { top: 40, right: 16, bottom: 44, left: 64 },
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

// Tooltip for one region bar: exact visits per park, park count, and what a click will do
function showRegionTooltip(event, d) {
  const period = state.monthRange === null
    ? "per year"
    : "in " + formatMonthRange(state.monthRange) + " (avg. per year)";
  const hint = state.region === d.region
    ? "Click again to show all regions"
    : "Click to show only this region";

  showTooltip(event, d.region, [
    formatExact(d.avgPerParkYear) + " visits per park " + period,
    d.parkCount === 1 ? "1 park" : d.parkCount + " parks",
    hint,
  ]);
}

// Runs once: create the SVG and the empty groups that updateRegionBars() fills in
function setupRegionBars() {
  const { width, height, margin } = REGION_LAYOUT;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = d3.select("#region-chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`); // lets the SVG shrink on narrow screens

  // Everything inside .plot is shifted so (0, 0) is the top-left of the plot area
  const plot = svg.append("g")
    .attr("class", "plot")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // Invisible background behind the bars: clicking empty space clears the region selection
  plot.append("rect")
    .attr("class", "background")
    .attr("width", innerWidth)
    .attr("height", innerHeight)
    .attr("fill", "transparent")
    .on("click", () => setRegion(null));

  plot.append("g")
    .attr("class", "axis x-axis")
    .attr("transform", `translate(0, ${innerHeight})`);

  plot.append("g")
    .attr("class", "axis y-axis");

  // The x title never changes; the y title's text is set in updateRegionBars()
  plot.append("text")
    .attr("class", "axis-title")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 36)
    .attr("text-anchor", "middle")
    .text("NPS region");

  plot.append("text")
    .attr("class", "axis-title y-title")
    .attr("transform", "rotate(-90)") // rotated, so x now moves up/down and y left/right
    .attr("x", -innerHeight / 2)
    .attr("y", -48)
    .attr("text-anchor", "middle");

  // Shown only when no data matches
  plot.append("text")
    .attr("class", "empty-message")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight / 2)
    .attr("text-anchor", "middle");
}

// Runs every time the data changes: recompute, rescale, and move the bars
function updateRegionBars(rows) {
  const regions = summarizeByRegion(rows);
  const { width, height, margin } = REGION_LAYOUT;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const plot = d3.select("#region-chart .plot");

  // x: one evenly spaced slot per region; padding leaves gaps between bars
  const x = d3.scaleBand()
    .domain(regions.map(d => d.region))
    .range([0, innerWidth])
    .padding(0.3);

  // y: visits -> pixels. Range is [innerHeight, 0] because SVG y grows downward.
  // The domain follows the data shown, so the axis rescales when the data is filtered.
  const y = d3.scaleLinear()
    .domain([0, d3.max(regions, d => d.avgPerParkYear) || 1]) // || 1 avoids a [0, undefined] domain when empty
    .range([innerHeight, 0])
    .nice();

  // Readable numbers: 2449160 -> "2.4M", 216762 -> "220k"
  const formatVisits = d3.format(".2s");
  const duration = 300;

  // When a region is selected, every other region fades
  const opacity = d => (state.region === null || d.region === state.region) ? 1 : 0.25;

  // Bars. The key function (d => d.region) keeps each bar attached to its region.
  // New bars start flat on the baseline, then grow during the transition.
  // Color and event handlers are set on enter only: they never change.
  // (D3 hands each handler the bar's CURRENT data, so the tooltip numbers stay up to date.)
  plot.selectAll(".bar")
    .data(regions, d => d.region)
    .join(enter => enter.append("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.region))
      .attr("y", innerHeight)
      .attr("height", 0)
      .attr("fill", d => REGION_COLORS[d.region])
      // Pair 1: clicking a bar selects its region; clicking the selected bar again deselects it
      .on("click", (event, d) => {
        setRegion(state.region === d.region ? null : d.region);
        showRegionTooltip(event, d); // refresh the "Click to..." hint right away
      })
      .on("mouseenter mousemove", (event, d) => {
        d3.select(event.currentTarget).classed("hovered", true);
        showRegionTooltip(event, d);
      })
      .on("mouseleave", (event) => {
        d3.select(event.currentTarget).classed("hovered", false);
        hideTooltip();
      }))
    .transition()
    .duration(duration)
    .attr("x", d => x(d.region))
    .attr("y", d => y(d.avgPerParkYear))
    .attr("width", x.bandwidth())
    .attr("height", d => innerHeight - y(d.avgPerParkYear))
    .attr("opacity", opacity);

  // Label above each bar, line 1: the value
  plot.selectAll(".bar-value")
    .data(regions, d => d.region)
    .join(enter => enter.append("text")
      .attr("class", "bar-value")
      .attr("text-anchor", "middle")
      .attr("x", d => x(d.region) + x.bandwidth() / 2)
      .attr("y", innerHeight))
    .text(d => formatVisits(d.avgPerParkYear))
    .transition()
    .duration(duration)
    .attr("x", d => x(d.region) + x.bandwidth() / 2)
    .attr("y", d => y(d.avgPerParkYear) - 22)
    .attr("opacity", opacity);

  // Label above each bar, line 2: how many parks the region has
  plot.selectAll(".bar-parks")
    .data(regions, d => d.region)
    .join(enter => enter.append("text")
      .attr("class", "bar-parks")
      .attr("text-anchor", "middle")
      .attr("x", d => x(d.region) + x.bandwidth() / 2)
      .attr("y", innerHeight))
    .text(d => d.parkCount === 1 ? "1 park" : d.parkCount + " parks")
    .transition()
    .duration(duration)
    .attr("x", d => x(d.region) + x.bandwidth() / 2)
    .attr("y", d => y(d.avgPerParkYear) - 7)
    .attr("opacity", opacity);

  // Axes animate to their new scales along with the bars
  plot.select(".x-axis")
    .transition()
    .duration(duration)
    .call(d3.axisBottom(x));

  plot.select(".y-axis")
    .transition()
    .duration(duration)
    .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format("~s")));

  // With months brushed, the numbers only cover those months, so the labels must say so
  if (state.monthRange === null) {
    plot.select(".y-title").text("Visits per park per year");
    d3.select("#region-caption").text("Average recreation visits per park per year, by NPS region (2022–2025). Labels show how many parks each region has.");
  } else {
    const months = formatMonthRange(state.monthRange);
    plot.select(".y-title").text("Visits per park, selected months");
    d3.select("#region-caption").text("Average recreation visits per park in the selected months (" + months + " of each year, 2022–2025). Labels show how many parks each region has.");
  }

  // Empty state: show a message and hide the value axis (its [0, 1] placeholder ticks mean nothing)
  const isEmpty = regions.length === 0;
  plot.select(".empty-message").text(isEmpty ? "No visits match this selection." : "");
  plot.select(".y-axis").style("display", isEmpty ? "none" : null);
}
