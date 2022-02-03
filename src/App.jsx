import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
import "./index.css";
import { renderRgbaString, COLORS } from "./utils";
import classnames from "classnames";
import run from "./cell";
import { RefreshCw } from "react-feather";

// constants
// 256 x 256 = 65,536 cells running at ~75fps
// 320 x 320 = 102,400 cells running at ~55fps.
// 512 x 512 = 262,144 cells running at ~20fps.
// 1024 x 1024 = 1,048,576 cells running at ~3fps.

// NOTE: using decrementing loops because comparing to 0 in loop is faster than a stored value
// more perf improvements?
// use a service worker for computation
// use some cached or global values instead of constantly accessing length

const GRID_SIZE = 320;

// rendering
const CANVAS_WIDTH = GRID_SIZE * 2;
const CANVAS_HEIGHT = GRID_SIZE * 2;
const CELL_HEIGHT = CANVAS_HEIGHT / GRID_SIZE;
const CELL_WIDTH = CANVAS_WIDTH / GRID_SIZE;

function getAllNeighborCoords(x, y) {
  return [
    { pos: "TOP", coord: [x, y - 1] },
    { pos: "TOP_RIGHT", coord: [x + 1, y - 1] },
    { pos: "RIGHT", coord: [x + 1, y] },
    { pos: "BOTTOM_RIGHT", coord: [x + 1, y + 1] },
    { pos: "BOTTOM", coord: [x, y + 1] },
    { pos: "BOTTOM_LEFT", coord: [x - 1, y + 1] },
    { pos: "LEFT", coord: [x - 1, y] },
    { pos: "TOP_LEFT", coord: [x - 1, y - 1] }
  ];
}

function wrapValue(v) {
  if (v >= GRID_SIZE) {
    return 0;
  }

  if (v <= -1) {
    return GRID_SIZE - 1;
  }

  return v;
}

function getValidNeighborCoords(x, y, wrap) {
  if (wrap) {
    return getAllNeighborCoords(x, y).map(n => {
      return {
        ...n,
        coord: n.coord.map(wrapValue)
      };
    });
  }

  return getAllNeighborCoords(x, y).filter(n =>
    n.coord.every(v => v > -1 && v < GRID_SIZE)
  );
}

// Cell model is the thing that gets...
function CellModel(x, y) {
  return {
    x,
    y,
    neighborCoords: getValidNeighborCoords(x, y, true),
    getNeighbors: grid => getNeighborData(x, y, grid),
    data: {
      color: COLORS.white
    }
  };
}

function createGrid(size, itemModel) {
  // Initialize empty grid
  var grid = new Array(size);
  for (var i = size - 1; i >= 0; --i) {
    grid[i] = new Array(size);
  }

  for (var y = grid.length - 1; y >= 0; --y) {
    for (var x = grid[y].length - 1; x >= 0; --x) {
      grid[y][x] = new itemModel(x, y);
    }
  }

  return grid;
}

function getNeighborData(x, y, grid) {
  var neighborData = [];
  for (var i = grid[y][x].neighborCoords.length - 1; i >= 0; --i) {
    neighborData.push([
      // top / left / right / bottom
      grid[y][x].neighborCoords[i].pos,
      grid[
        // y coord
        grid[y][x].neighborCoords[i].coord[1]
      ][
        // x coord
        grid[y][x].neighborCoords[i].coord[0]
      ]
    ]);
  }
  return neighborData;
}

function runCells(readGrid, writeGrid, stepCount) {
  var time = new Date().getTime();
  for (var y = readGrid.length - 1; y >= 0; --y) {
    for (var x = readGrid[y].length - 1; x >= 0; --x) {
      writeGrid[y][x].data =
        run(readGrid[y][x], readGrid, time, stepCount) || {};
    }
  }
}

// TODO: new rendering strategy
// 1: run the cells and calculate the colors,
// then pass the grid to a shader to run that will render all on the GPU
// it will take in the grid and calculate the colors

// TODO: this is still costly(actually not a lot, ~0.4ms each frame), better fill the ImageData (or the Uint8ClampedArray) when we're updating grid instead of converting finished grid to ImageData here
function gridToImageData(grid) {
  var h = grid.length;
  var w = grid[0].length;
  var pixels = new Uint8ClampedArray(w * h * 4);
  for (var y = h - 1; y >= 0; --y) {
    for (var x = w - 1; x >= 0; --x) {
      var i = (y * w + x) * 4;
      var cell = grid[y][x].data;
      pixels[i + 0] = cell.color.r;
      pixels[i + 1] = cell.color.g;
      pixels[i + 2] = cell.color.b;
      pixels[i + 3] = cell.color.a;
    }
  }
  return new ImageData(pixels, w);
}

function Canvas(props) {
  const { draw, ...rest } = props;
  const canvasRef = useRef(null);

  useEffect(
    () => {
      const canvas = canvasRef.current;
      const gl = canvas.getContext("webgl");

      const verts = [-1, 1, 0, 1, 1, 1, 1, 1, 1, -1, 1, 0, -1, -1, 0, 0];
      const indices = [0, 1, 3, 1, 2, 3];
      const vbuf = gl.createBuffer();

      gl.bindBuffer(gl.ARRAY_BUFFER, vbuf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);

      const ibuf = gl.createBuffer();

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibuf);
      gl.bufferData(
        gl.ELEMENT_ARRAY_BUFFER,
        new Uint16Array(indices),
        gl.STATIC_DRAW
      );
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

      const vertCode = `
				attribute vec2 a_pos;
				attribute vec2 a_uv;
				varying vec2 v_pos;
				varying vec2 v_uv;
	
				void main(void) {
					v_pos = a_pos;
					v_uv = a_uv;
					gl_Position = vec4(v_pos, 0.0, 1.0);
				}
			`;

      const fragCode = `
			precision mediump float;
			varying vec2 v_uv;
			uniform sampler2D u_tex;
			
			void main(void) {
				gl_FragColor = texture2D(u_tex, v_uv);
			}
			`;

      const vertShader = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vertShader, vertCode);
      gl.compileShader(vertShader);

      const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fragShader, fragCode);
      gl.compileShader(fragShader);

      const msg = gl.getShaderInfoLog(fragShader);

      if (msg) console.error(msg);

      const prog = gl.createProgram();

      gl.attachShader(prog, vertShader);
      gl.attachShader(prog, fragShader);
      gl.linkProgram(prog);
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, vbuf);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibuf);
      const apos = gl.getAttribLocation(prog, "a_pos");
      gl.vertexAttribPointer(apos, 2, gl.FLOAT, false, 4 * 4, 0);
      gl.enableVertexAttribArray(apos);

      const auv = gl.getAttribLocation(prog, "a_uv");
      gl.vertexAttribPointer(auv, 2, gl.FLOAT, false, 4 * 4, 4 * 2);
      gl.enableVertexAttribArray(auv);

      gl.clearColor(0, 0, 0, 1);
      gl.viewport(0, 0, canvas.width, canvas.height);

      const tex = gl.createTexture();

      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new ImageData(GRID_SIZE, GRID_SIZE)
      );

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      let animationFrameId;

      const render = () => {
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
        draw(gl, tex);
        animationFrameId = window.requestAnimationFrame(render);
      };
      render();
      return () => {
        window.cancelAnimationFrame(animationFrameId);
      };
    },
    [draw]
  );

  return (
    <canvas
      id="canvas"
      style={{ height: "100%", width: "100%", maxWidth: "100vh" }}
      height={CANVAS_HEIGHT}
      width={CANVAS_WIDTH}
      ref={canvasRef}
      {...rest}
    />
  );
}

function App() {
  const readRef = useRef(null);
  const writeRef = useRef(null);
  const frameCount = useRef(0);
  const stepRef = useRef(0);
  const [isRunning, setIsRunning] = useState(true);

  function swapRefs() {
    const temp = readRef.current;
    readRef.current = writeRef.current;
    writeRef.current = temp;
  }

  function resetGrid() {
    initializeGrids();
    frameCount.current = 0;
    stepRef.current = 0;
  }

  function initializeGrids() {
    readRef.current = createGrid(GRID_SIZE, CellModel);
    writeRef.current = createGrid(GRID_SIZE, CellModel);
    window.grid = writeRef.current;
  }

  function draw(gl, tex) {
    if (!gl) {
      return;
    }

    // initialize both refs
    if (frameCount.current === 0) {
      console.log("Initializing grid");
      initializeGrids();
    }

    if (isRunning) {
			// const t0 = performance.now();
      runCells(readRef.current, writeRef.current, stepRef.current);
			// const t1 = performance.now();
			// console.log(`run cells: ${t1 - t0} milliseconds.`);

      // update the texture
      var img = gridToImageData(writeRef.current);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, img);

      // swap read / write
      swapRefs();
      stepRef.current += 1;
    } else {
      // not running... figure out how to implement steps
    }

    // increment the frame
    frameCount.current += 1;
  }

  return (
    <div
      className="App"
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100vh",
        alignItems: "center",
        justifyContent: "center",
        padding: "8px",
        gap: "8px",
        background: "black"
      }}
    >
      <button
        className={classnames("run-button", { isRunning })}
        onClick={() => {
          if (isRunning) {
            resetGrid();
          }
          setIsRunning(!isRunning);
        }}
      >
        {isRunning ? "Stop" : "Run"}
      </button>
      <div
        style={{
          width: "100%",
          height: "100%",
          maxWidth: "100vh",
          borderRadius: "8px",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.25)"
        }}
      >
        <Canvas draw={draw} />
      </div>
    </div>
  );
}

export default App;
