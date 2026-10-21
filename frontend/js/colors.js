// One color per NPS region, loosely matching its landscape. Every view uses these.
// Listed roughly west to east, which is also the legend order.
const REGION_COLORS = {
  "Alaska": "#611ec1",        // northern lights
  "Pacific West": "#09659f",  // Pacific Ocean
  "Intermountain": "#7c3d18", // red rock canyons
  "Midwest": "#9c8e12",       // prairie grass
  "Southeast": "#167e1c",     // forests and swamps
  "Northeast": "#b1236d",     // autumn foliage
};

// Build an HTML legend (a colored square + name per region) inside the given element
function drawRegionLegend(selector) {
  const legend = d3.select(selector);

  for (const region in REGION_COLORS) {
    const item = legend.append("span").attr("class", "legend-item");
    item.append("span")
      .attr("class", "legend-swatch")
      .style("background", REGION_COLORS[region]);
    item.append("span").text(region);
  }
}
