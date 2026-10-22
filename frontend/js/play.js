// Extra credit: Play animates the month brush from Jan to Dec, one month at a time.
// It only calls setMonthRange(), the same function the brush uses, so render() updates
// every view. It never touches a view directly.

const PLAY_STEP_MS = 1000; // how long each month stays selected, in ms (lower = faster)

// The setInterval id while playing, or null when stopped. Not part of `state`: state is the
// selection the views draw; "is it playing?" only matters to the button and the timer.
let playTimer = null;

function togglePlaying() {
  if (playTimer === null) {
    startPlaying();
  } else {
    stopPlaying();
  }
}

function startPlaying() {
  // Resume after a pause: if a single month before December is selected, continue from the
  // next month. Otherwise (no selection, a multi-month brush, or a finished run) start at Jan.
  let firstMonth = 1;
  const range = state.monthRange;
  if (range !== null && range[0] === range[1] && range[0] < 12) {
    firstMonth = range[0] + 1;
  }

  // Show the first month right away, so there's no blank second after pressing Play
  setMonthRange([firstMonth, firstMonth]);
  if (firstMonth === 12) {
    return; // resumed from November: December is already the last step
  }

  playTimer = setInterval(stepPlaying, PLAY_STEP_MS);
  updatePlayButton();
}

// Called by the timer every PLAY_STEP_MS: move to the next month, stop after December
function stepPlaying() {
  const nextMonth = state.monthRange[0] + 1;
  setMonthRange([nextMonth, nextMonth]);

  if (nextMonth === 12) {
    stopPlaying(); // December stays selected
  }
}

// Stop the timer but keep the current selection. Safe to call when nothing is playing.
function stopPlaying() {
  if (playTimer !== null) {
    clearInterval(playTimer);
    playTimer = null;
  }
  updatePlayButton();
}

function updatePlayButton() {
  const playing = playTimer !== null;
  d3.select("#play-button")
    .text(playing ? "❚❚ Pause" : "▶ Play")
    .attr("aria-pressed", playing); // tells screen readers whether it's playing
}
