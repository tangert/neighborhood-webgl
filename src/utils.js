export function log(s) {
  console.log(s);
}

// formats and used as a global function
export function rgba(r, g, b, a) {
  return {
    r,
    g,
    b,
    a: Math.floor(a * 255) || 255,
  };
}

// globally available colors
export const COLORS = {
  black: rgba(0, 0, 0),
  white: rgba(255, 255, 255),
  blue: rgba(0, 122, 255),
  green: rgba(52, 199, 89),
  indigo: rgba(88, 86, 214),
  orange: rgba(255, 149, 0),
  pink: rgba(255, 45, 85),
  purple: rgba(175, 82, 222),
  red: rgba(255, 59, 48),
  teal: rgba(90, 200, 250),
  yellow: rgba(255, 204, 0),
  random: function () {
    return rgba(Math.random() * 255, Math.random() * 255, Math.random() * 255);
  },
};

export function lerp(v0, v1, t) {
  return (1 - t) * v0 + t * v1;
}

// takes in two colors as rgba objects, and returns a color that's lerped between them.
export function lerpRgb(c1, c2, t) {
  return {
    r: lerp(c1.r, c2.r, t),
    g: lerp(c1.g, c2.g, t),
    b: lerp(c1.b, c2.b, t),
    a: lerp(c1.a, c2.a, t),
  };
}

export function renderRgbaString(color) {
  const { r, g, b, a } = color;
  return `rgba(${r},${g},${b},${a})`;
}

export function mapTo(val, in_min, in_max, out_min, out_max) {
  return ((val - in_min) * (out_max - out_min)) / (in_max - in_min) + out_min;
}

export function dist(xA, yA, xB, yB) {
	const xDiff = xA - xB;
	const yDiff = yA - yB;
	return Math.sqrt(xDiff * xDiff + yDiff * yDiff);
}

// can probably generalize these better.
export function add(v1,v2) {
	return {
		x: v1.x + v2.x,
		y: v1.y + v2.y
	}
}

export function sub(v1,v2) {
	return {
		x: v1.x - v2.x,
		y: v1.y - v2.y
	}
}

export function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function Vec2(x, y) {
	return { x, y }
}

export function Vec3(x, y, z) {
	return { x, y, z }
}

// Returns if a cell is inside a given circle
export function drawCircle(cell, origin, r) {
	return dist(cell.x, cell.y, origin.x, origin.y) < r;
}

// Returns if a cell is inside a given rectangle
export function drawRect(cell, origin, w, h) {
	return (
		cell.x > origin.x &&
		cell.x < origin.x + w &&
		cell.y > origin.y &&
		cell.y < origin.y + h
	);
}