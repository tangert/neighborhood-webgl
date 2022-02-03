import {
  rgba,
  lerp,
  lerpRgb,
  mapTo,
  renderRgbaString,
  COLORS,
  drawCircle,
  drawRect,
  Vec2,
  add,
  sub,
  dist,
  getRandomInt
} from "./utils";

function gameOfLife(cell, grid, time, stepCount) {
  // Initial state.
  if (stepCount === 0) {
    const isAlive = Math.random() < 0.5;

    return {
      isAlive,
      color: isAlive ? COLORS.white : COLORS.black
    };
  }

  const liveNeighbors = cell
    .getNeighbors(grid)
    .filter(([, n]) => n.data.isAlive).length;

  // assume its alive by default
  let isAlive = false;

  if (
    (cell.data.isAlive && (liveNeighbors === 2 || liveNeighbors === 3)) ||
    (!cell.data.isAlive && liveNeighbors === 3)
  ) {
    isAlive = true;
  }

  return {
    isAlive,
    color: isAlive ? COLORS.white : COLORS.black
  };
}

/*********************************************/
const THRESHOLD = 1;
const MAX_STATES = 16;
function cyclicCellularAutomata(cell, grid, time, stepCount) {
  // 4. Fill the cells with random state values between 0 and (maximum states-1).
  if (stepCount === 0) {
    const state = getRandomInt(0, MAX_STATES - 1);
    return {
      state,
      color: lerpRgb(COLORS.purple, COLORS.orange, state / MAX_STATES)
    };
  }

  // 5. At each step of the simulation every cell follows these rules;
  // a) Count how many neighbouring cells (Moore or Von Neumann neighborhoods) surrond the cell with a value of the current cell’s state + 1
  const validNeighbors = cell
    .getNeighbors(grid)
    .filter(([, n]) => n.data.state === cell.data.state + 1).length;

  // b) If the count is greater or equal to the threshold value then the cell state is incremented by 1
  const next = cell.data.state + 1 === MAX_STATES - 1 ? 0 : cell.data.state + 1;
  const newState = validNeighbors >= THRESHOLD ? next : cell.data.state;

  // const percentToCenter = dist(cell.x, cell.y, grid.length/2, grid.length/2)/(grid.length/2);
  // const fadeOutColor = lerpRgb(COLORS.green, COLORS.purple, percentToCenter)

  return {
    state: newState,
    color: lerpRgb(COLORS.blue, COLORS.black, newState / MAX_STATES)
  };
}

/*********************************************/
function vaporWave(cell, grid, time, stepCount) {
  const t = time / 1500;
  const amplitude = grid.length;

  // 3.02
  const period = Math.PI * 2.02;

  const y = Math.sin((cell.x + t) * period) * amplitude;
  const waveStart = grid.length * 0.2;
  const waveEnd = grid.length * (0.5 + Math.sin(t) / 4);

  const waveTop = mapTo(y, -1 * amplitude, amplitude, waveStart, waveEnd);

  if (cell.y === Math.ceil(waveTop) || cell.y === Math.ceil(waveTop) - 1) {
    return {
      color:
        Math.random() * 0.5 > cell.y / grid.length ? COLORS.white : COLORS.blue
    };
  }

  if (cell.y > Math.ceil(waveTop)) {
    return {
      color: lerpRgb(COLORS.purple, COLORS.red, cell.y / grid.length)
    };
  }

  return {
    color: lerpRgb(COLORS.blue, COLORS.black, cell.y / grid.length - 0.25)
  };
}

function run(cell, grid, time, stepCount) {
  return gameOfLife(cell, grid, time, stepCount);
  // return vaporWave(cell, grid, time, stepCount);
  // return cyclicCellularAutomata(cell, grid, time, stepCount);
}

export default run;
