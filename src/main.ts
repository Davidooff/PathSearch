import { Boundary, Collisions, CollisionType, Point } from "./collisions";
import { Path, PathTree } from "./tree";
import { Vector2 } from "./vector2";

document.querySelector<HTMLDivElement>(
  "#app"
)!.innerHTML = `<canvas id="main" width="2000" height="1800"></canvas>`;

// console.log(document.getElementById("main"));
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
  new Boundary(200, 450, 200, 100),
  new Boundary(120, 300, 200, 10),
]);

// function decimalToHexString(number: number): string {
//   let res = number.toString(16).toUpperCase();

//   return res.length <= 8 ? "#" + "0".repeat(8 - res.length) + res : "#FFFFFFFF";
// }

const to: Point = { x: 100, y: 100 };
const from: Point = { x: 850, y: 1000 };
const inflate = { width: 100, height: 100 };

const canvas = document.getElementById("main") as HTMLCanvasElement;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

function drawStart() {
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
}

interface FinalPath {
  p: Point[];
  len: number;
}

(function main() {
  drawStart();
  let tree = new PathTree(from);
  let pathToContinue: number[] | null;
  pathToContinue = tree.findPathBy({ complit: false }) as number[];
  let processedObjects: Boundary[] = [];
  let elToCountinue: Path;
  let counter = 0;
  do {
    counter++;
    elToCountinue = tree.openPath(pathToContinue) as Path;
    console.log("Processedsd", elToCountinue.processed);

    console.log("el", elToCountinue);
    console.log(pathToContinue);
    processedObjects = tree.findProcessedInsidePath(
      pathToContinue
    ) as Boundary[];
    console.log("processedObjects", processedObjects);

    if (elToCountinue?.next === null) continue;
    drawLine(elToCountinue.p, to, "purple");

    let processColRes = Collisions.processCollisions(
      collisions.boundaries,
      { p1: elToCountinue.p, p2: to },
      inflate,
      processedObjects
    );

    if (elToCountinue && elToCountinue.next) {
      elToCountinue.next = elToCountinue.next.concat(processColRes.path);
    }
    elToCountinue.processed = processColRes.processedObj;
    elToCountinue.complit = true;

    pathToContinue = tree.findPathBy({ complit: false });
  } while (pathToContinue);

  // Path optimization
  const finalPath: FinalPath[] = [];

  while (true) {
    const pathToFinis = tree.findPathBy({ next: null });
    if (!pathToFinis) break;

    const localPath = { p: [from], len: 0 };
    for (let i = 1; i < pathToFinis!.length; i++) {
      const el = tree.openPath(pathToFinis!.slice(0, i) as number[]) as Path;
      let nextEl: Path = tree.openPath(
        pathToFinis!.slice(0, i + 1) as number[]
      ) as Path;

      for (let j = i + 1; j < pathToFinis.length; j++) {
        const possiblyNext = tree.openPath(
          pathToFinis.slice(0, j + 1) as number[]
        ) as Path;
        const coll = Collisions.findCollisionsOnVector(
          collisions.boundaries,
          { p1: el.p, p2: possiblyNext.p },
          inflate
        );
        if (!coll) {
          nextEl = possiblyNext;
          continue;
        }
        let collInStart: Boundary[] = [];
        let collInEnd: Boundary[] = [];
        let isCollInMiddle = false;
        coll.sort((a, b) => a.len - b.len);
        for (const collEl of coll) {
          if (Collisions.isCollInMiddle(collEl)) {
            isCollInMiddle = true;
            break;
          }
          if (Collisions.isCollInStart(collEl)) {
            collInStart.push(collEl.b);
          } else {
            collInEnd.push(collEl.b);
          }
        }
        if (isCollInMiddle) break;

        if (
          collInStart.some((el) =>
            Collisions.isBounderyInsideArray(el, collInEnd)
          )
        )
          break;
        nextEl = possiblyNext;
      }

      localPath.p.push(nextEl.p);
      localPath.len += Math.sqrt(
        (nextEl.p.x - el.p.x) ** 2 + (nextEl.p.y - el.p.y) ** 2
      );
    }
    tree.openPath(pathToFinis)!.next = [];
    if (finalPath.some((el) => el.len === localPath.len)) continue;
    finalPath.push(localPath);
  }

  finalPath.sort((a, b) => a.len - b.len);

  for (let i = finalPath.length - 1; i >= 0; i--) {
    const path = finalPath[i];
    for (let j = 0; j < path.p.length - 1; j++) {
      drawLine(
        path.p[j],
        path.p[j + 1],
        lineColorByPlace[i] ? lineColorByPlace[i] : "white",
        i - (finalPath.length - 6) * -1
      );
    }
  }
})();
