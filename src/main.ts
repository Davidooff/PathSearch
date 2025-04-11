import { Boundary, Collisions, Point } from "./collisions";

document.querySelector<HTMLDivElement>(
  "#app"
)!.innerHTML = `<canvas id="main" width="2000" height="1800"></canvas><button id="ClrBtn">Clr</button>`;

const lineColorByPlace = ["green", "blue", "yellow", "orange", "orange", "red"];

export function drawLine(
  from: Point,
  to: Point,
  c: string = "red",
  width: number = 1
) {
  let prev = ctx.lineWidth;
  ctx.lineWidth = width;
  ctx.strokeStyle = c;
  ctx.beginPath(); // Start a new path
  ctx.moveTo(from.x, from.y); // Move the pen to (30, 50)
  ctx.lineTo(to.x, to.y); // Draw a line to (150, 100)
  ctx.stroke(); // Render the path
  ctx.lineWidth = prev;
}

export function drawArc(p: Point, c: string = "red", r: number = 10) {
  ctx.strokeStyle = c;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, 2 * Math.PI);
  ctx.stroke();
}

const collisions = new Collisions([
  new Boundary(500, 500, 400, 200),
  new Boundary(210, 450, 200, 100),
  new Boundary(120, 300, 200, 10),
]);

const to: Point = { x: 100, y: 100 };
const from: Point = { x: 900, y: 1000 };
const inflate = { width: 100, height: 100 };

const canvas = document.getElementById("main") as HTMLCanvasElement;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

// State for drawing rectangles
let isDrawing = false;
let startX = 0;
let startY = 0;
let currentX = 0;
let currentY = 0;

export function redrawAll() {
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw start/end points and existing boundaries (adapted from original drawStart)
  ctx.strokeStyle = "yellow";
  ctx.beginPath();
  ctx.arc(from.x, from.y, 100, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.strokeStyle = "green";
  ctx.beginPath();
  ctx.arc(to.x, to.y, 100, 0, 2 * Math.PI);
  ctx.stroke();
  collisions.boundaries.forEach((el) => {
    ctx.strokeStyle = "blue";
    ctx.strokeRect(el.mapPosition.x, el.mapPosition.y, el.width, el.height);
    ctx.strokeStyle = "red";
    ctx.strokeRect(
      el.mapPosition.x - inflate.width / 2,
      el.mapPosition.y - inflate.height / 2,
      el.width + inflate.width,
      el.height + inflate.height
    );
  });

  // Draw the temporary rectangle if drawing
  if (isDrawing) {
    ctx.strokeStyle = "grey"; // Temporary rectangle color
    ctx.lineWidth = 1;
    const rectWidth = currentX - startX;
    const rectHeight = currentY - startY;
    ctx.strokeRect(startX, startY, rectWidth, rectHeight);
    // Restore default line width if changed - assuming drawLine handles this correctly elsewhere if needed
  }
}

// Function to recalculate and draw the path
function recalculateAndDrawPath() {
  // Path calculation and drawing logic (adapted from original main IIFE)
  const pathVector = { p1: from, p2: to };
  // Ensure collisions object and its boundaries are accessible
  if (!collisions || !collisions.boundaries) {
    console.error("Collisions or boundaries not initialized!");
    return;
  }
  const tree = Collisions.findAllWays(
    pathVector,
    collisions.boundaries,
    inflate
  );
  const optimizedPath = Collisions.optimizeWays(
    tree,
    pathVector,
    collisions.boundaries,
    inflate
  );

  // Draw the new optimized path
  for (let i = optimizedPath.length - 1; i >= 0; i--) {
    const path = optimizedPath[i];
    for (let j = 0; j < path.p.length - 1; j++) {
      // Ensure drawLine is accessible
      drawLine(
        path.p[j],
        path.p[j + 1],
        lineColorByPlace[i] ? lineColorByPlace[i] : "white",
        1
      );
    }
  }
}

// Event Listeners
canvas.addEventListener("mousedown", (e) => {
  isDrawing = true;
  startX = e.offsetX;
  startY = e.offsetY;
  currentX = e.offsetX; // Initialize currentX/Y on mousedown
  currentY = e.offsetY;
});

canvas.addEventListener("mousemove", (e) => {
  if (!isDrawing) return;
  currentX = e.offsetX;
  currentY = e.offsetY;
  redrawAll(); // Redraw everything including the temporary rectangle
});

canvas.addEventListener("mouseup", (e) => {
  if (!isDrawing) return;
  isDrawing = false;

  const finalX = e.offsetX;
  const finalY = e.offsetY;

  const rectX = Math.min(startX, finalX);
  const rectY = Math.min(startY, finalY);
  const rectWidth = Math.abs(startX - finalX);
  const rectHeight = Math.abs(startY - finalY);

  if (rectWidth > 0 && rectHeight > 0) {
    // Ensure Boundary class is accessible (imported at top)
    const newBoundary = new Boundary(rectX, rectY, rectWidth, rectHeight);
    collisions.boundaries.push(newBoundary);
  }

  // Redraw and recalculate path
  redrawAll(); // Redraw with the new boundary added
  recalculateAndDrawPath(); // Recalculate and draw path based on new boundaries
});

// Initial Draw
redrawAll();
recalculateAndDrawPath();

document.querySelector<HTMLButtonElement>("#ClrBtn")!.onclick = () => {
  collisions.boundaries = []; // Clear boundaries first
  redrawAll(); // Redraw the cleared state (start/end points, no boundaries)
  recalculateAndDrawPath(); // Recalculate and draw path for the cleared state
};
