// One tooltip <div> shared by every view (only one can be visible at a time).
// It uses position: fixed, so it's placed relative to the window and the mouse's
// clientX / clientY can be used directly.

const TOOLTIP_OFFSET = 12; // gap between the pointer and the tooltip, in px

// Show the tooltip next to the pointer: a bold title, then one line of text per item in lines
function showTooltip(event, title, lines) {
  const tooltip = d3.select("#tooltip");

  // Rebuild the content. .text() treats park names as plain text, never as HTML.
  tooltip.selectAll("*").remove();
  tooltip.append("div").attr("class", "tooltip-title").text(title);
  for (const line of lines) {
    tooltip.append("div").text(line);
  }

  tooltip.style("display", "block");

  // Normally below-right of the pointer. If that would go past the window's right
  // (or bottom) edge, flip to the left of (or above) the pointer instead.
  const node = tooltip.node();
  let left = event.clientX + TOOLTIP_OFFSET;
  let top = event.clientY + TOOLTIP_OFFSET;

  if (left + node.offsetWidth > window.innerWidth) {
    left = event.clientX - TOOLTIP_OFFSET - node.offsetWidth;
  }
  if (top + node.offsetHeight > window.innerHeight) {
    top = event.clientY - TOOLTIP_OFFSET - node.offsetHeight;
  }

  tooltip.style("left", left + "px").style("top", top + "px");
}

function hideTooltip() {
  d3.select("#tooltip").style("display", "none");
}

// Exact numbers for tooltips: 2185468.4 -> "2,185,468"
const formatExact = d3.format(",.0f");
