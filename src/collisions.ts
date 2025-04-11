import { drawArc, drawLine, redrawAll } from "./main";
import { Path, PathTree } from "./tree";
// import { Vector2 } from "./vector2";

export interface Point {
  x: number;
  y: number;
}

type Inflate = { width: number; height: number };

export type Line = { p1: Point; p2: Point };

export type Rectangle = Line;

function isPointInRange(point: Point, range: Rectangle): boolean {
  return (
    point.x >= range.p1.x &&
    point.x <= range.p2.x &&
    point.y >= range.p1.y &&
    point.y <= range.p2.y
  );
}

export class Boundary {
  mapPosition: Point;
  width: number;
  height: number;
  static width = 16;
  static height = 16;
  constructor(x: number, y: number, width: number, height: number) {
    this.mapPosition = { x, y };
    this.width = width;
    this.height = height;
  }

  toPoints(
    inflate: { width: number; height: number } = { width: 0, height: 0 }
  ): [Point, Point, Point, Point] {
    return [
      {
        x: this.mapPosition.x - inflate.width / 2,
        y: this.mapPosition.y - inflate.height / 2,
      },
      {
        x: this.mapPosition.x - inflate.width / 2,
        y: this.mapPosition.y + this.height + inflate.height / 2,
      },
      {
        x: this.mapPosition.x + this.width + inflate.width / 2,
        y: this.mapPosition.y - inflate.height / 2,
      },
      {
        x: this.mapPosition.x + this.width + inflate.width / 2,
        y: this.mapPosition.y + this.height + inflate.height / 2,
      },
    ];
  }

  static isSameBoundary(b1: Boundary, b2: Boundary): boolean {
    return (
      b1.mapPosition.x === b2.mapPosition.x &&
      b1.mapPosition.y === b2.mapPosition.y &&
      b1.width === b2.width &&
      b1.height === b2.height
    );
  }

  inflate(x: number, y: number): Rectangle {
    return {
      p1: {
        x: this.mapPosition.x - x / 2,
        y: this.mapPosition.y - y / 2,
      },
      p2: {
        x: this.mapPosition.x + this.width + x / 2,
        y: this.mapPosition.y + this.height + y / 2,
      },
    };
  }

  static isPointOnTheRib(p: Point, rec: Rectangle): boolean {
    if (
      (p.x === rec.p1.x || p.x === rec.p2.x) &&
      rec.p1.y < p.y &&
      p.y < rec.p2.y
    )
      return true;
    if (
      (p.y === rec.p1.y || p.y === rec.p2.y) &&
      rec.p1.x < p.x &&
      p.x < rec.p2.x
    )
      return true;
    return false;
  }

  static vectorsToEachVertice(startingPoint: Point, rec: Rectangle): Line[] {
    // console.log("Ding", startingPoint);

    // if (
    //   (startingPoint.x === rec.p1.x || startingPoint.x === rec.p2.x) &&
    //   rec.p1.y < startingPoint.y &&
    //   startingPoint.y < rec.p2.y
    // ) {
    //   console.log("Ding dong", [
    //     { p1: startingPoint, p2: { x: startingPoint.x, y: rec.p1.y } },
    //     { p1: startingPoint, p2: { x: startingPoint.x, y: rec.p2.y } },
    //   ]);
    //   return [
    //     { p1: startingPoint, p2: { x: startingPoint.x, y: rec.p1.y } },
    //     { p1: startingPoint, p2: { x: startingPoint.x, y: rec.p2.y } },
    //   ];
    // }
    // if (
    //   (startingPoint.y === rec.p1.y || startingPoint.y === rec.p2.y) &&
    //   rec.p1.x < startingPoint.x &&
    //   startingPoint.x < rec.p2.x
    // ) {
    //   console.log("Ding dong", [
    //     { p1: startingPoint, p2: { x: rec.p1.x, y: startingPoint.y } },
    //     { p1: startingPoint, p2: { x: rec.p2.x, y: startingPoint.y } },
    //   ]);
    //   return [
    //     { p1: startingPoint, p2: { x: rec.p1.x, y: startingPoint.y } },
    //     { p1: startingPoint, p2: { x: rec.p2.x, y: startingPoint.y } },
    //   ];
    // }

    return [
      { p1: startingPoint, p2: rec.p1 },
      { p1: startingPoint, p2: rec.p2 },
      { p1: startingPoint, p2: { x: rec.p1.x, y: rec.p2.y } },
      { p1: startingPoint, p2: { x: rec.p2.x, y: rec.p1.y } },
    ];
  }

  static rectToLines(rect: Rectangle): [Line, Line, Line, Line] {
    return [
      { p1: rect.p1, p2: { x: rect.p1.x, y: rect.p2.y } },
      { p1: rect.p1, p2: { x: rect.p2.x, y: rect.p1.y } },
      { p1: rect.p2, p2: { x: rect.p1.x, y: rect.p2.y } },
      { p1: rect.p2, p2: { x: rect.p2.x, y: rect.p1.y } },
    ];
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.height) {
      ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
      ctx.fillRect(
        this.mapPosition.x,
        this.mapPosition.y,
        this.width,
        this.height
      );
    } else if (!this.height && this.width) {
      ctx.beginPath();
      ctx.arc(
        this.mapPosition.x + this.width / 2,
        this.mapPosition.y + this.width / 2,
        this.width / 2,
        0,
        2 * Math.PI
      );
      ctx.stroke();
    }
  }
}

// -----------------------------------------------------------------------------
// Класс для создания и управления коллизиями карты
export type CollisionType = { b: Boundary; line: Line; p: Point; len: number };

export class Collisions {
  boundaries: Boundary[] = [];
  items: any[] = [];
  action0: Boundary[] = [];
  width = 120;
  height = 68;

  constructor(b: Boundary[]) {
    this.boundaries = b;
  }

  static getLineIntersection(line1: Line, line2: Line): Point | null {
    const { p1: A, p2: B } = line1;
    const { p1: C, p2: D } = line2;

    const det = (B.x - A.x) * (D.y - C.y) - (B.y - A.y) * (D.x - C.x);

    if (det === 0) {
      return null; // Lines are parallel or coincident
    }

    const t = ((C.x - A.x) * (D.y - C.y) - (C.y - A.y) * (D.x - C.x)) / det;
    const u = ((C.x - A.x) * (B.y - A.y) - (C.y - A.y) * (B.x - A.x)) / det;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return {
        x: A.x + t * (B.x - A.x),
        y: A.y + t * (B.y - A.y),
      };
    }

    return null; // Intersection is outside the segments
  }

  findInRenge(range: Rectangle) {
    return this.boundaries.filter((b) => {
      const points = b.toPoints();
      return (
        isPointInRange(points[0], range) ||
        isPointInRange(points[1], range) ||
        isPointInRange(points[2], range) ||
        isPointInRange(points[3], range)
      );
    });
  }

  static findCollisionsOnVector(
    b: Boundary[],
    pathVector: Line,
    inflate: { width: number; height: number }
  ): CollisionType[] | null {
    let collisions: CollisionType[] = [];
    for (const collision of b) {
      const collisionLines = Boundary.rectToLines(
        collision.inflate(inflate.width, inflate.height)
      );

      collisionLines.forEach((line) => {
        const collIntPoint = Collisions.getLineIntersection(line, pathVector);
        if (collIntPoint) {
          collisions.push({
            b: collision,
            line: pathVector,
            p: collIntPoint,
            len: Math.sqrt(
              (collIntPoint.x - pathVector.p1.x) ** 2 +
                (collIntPoint.y - pathVector.p1.y) ** 2
            ),
          });
        }
      });
    }
    return collisions ? collisions : null;
  }

  static findNearestCollisionOnVector(
    b: Boundary[],
    pathVector: Line,
    inflate: { width: number; height: number }
  ): CollisionType | null {
    // searching for closed collisions
    let closedCollision: CollisionType | null = null;
    for (const collision of b) {
      const collisionLines = Boundary.rectToLines(
        collision.inflate(inflate.width, inflate.height)
      );

      collisionLines.forEach((line) => {
        const collIntPoint = Collisions.getLineIntersection(line, pathVector);
        if (collIntPoint) {
          const coll = {
            b: collision,
            line: pathVector,
            p: collIntPoint,
            len: Math.sqrt(
              (collIntPoint.x - pathVector.p1.x) ** 2 +
                (collIntPoint.y - pathVector.p1.x) ** 2
            ),
          };

          if (!closedCollision || coll.len < closedCollision.len) {
            closedCollision = coll;
          }
        }
      });
    }
    return closedCollision ? closedCollision : null;
  }

  static isCollInMiddle(collision: {
    b: Boundary;
    line: Line;
    p: Point;
    len: number;
  }): boolean {
    return !(
      PathTree.isEqual(collision.line.p1, collision.p) ||
      PathTree.isEqual(collision.line.p2, collision.p)
    );
  }

  static isCollInStart(collision: {
    b: Boundary;
    line: Line;
    p: Point;
    len: number;
  }): boolean {
    return PathTree.isEqual(collision.line.p1, collision.p);
  }

  /* This method return true if vector from vertice of obj pointing inside then it return true  */
  static isComplit(vec: Line, obj: Boundary, inflate: Inflate): boolean {
    const rect: Rectangle = obj.inflate(inflate.width, inflate.height);
    const p1 = vec.p1;
    const p2 = vec.p2;

    // Check if p1 is the top-left vertex and p2 points inwards
    if (p1.x === rect.p1.x && p1.y === rect.p1.y) {
      return p2.x > rect.p1.x && p2.y > rect.p1.y;
    }
    // Check if p1 is the bottom-left vertex and p2 points inwards
    if (p1.x === rect.p1.x && p1.y === rect.p2.y) {
      return p2.x > rect.p1.x && p2.y < rect.p2.y;
    }
    // Check if p1 is the top-right vertex and p2 points inwards
    if (p1.x === rect.p2.x && p1.y === rect.p1.y) {
      return p2.x < rect.p2.x && p2.y > rect.p1.y;
    }
    // Check if p1 is the bottom-right vertex and p2 points inwards
    if (p1.x === rect.p2.x && p1.y === rect.p2.y) {
      return p2.x < rect.p2.x && p2.y < rect.p2.y;
    }

    // If p1 is not a vertex, the vector doesn't originate from a vertex,
    // so it doesn't meet the condition described in the comment.
    return false;
  }

  static getNextVertices(
    startingPoint: Point,
    processedVerti: Point[],
    b: Boundary,
    inflate: Inflate
  ) {
    return b
      .toPoints(inflate)
      .filter(
        (p) =>
          (p.x === startingPoint.x || p.y === startingPoint.y) &&
          !processedVerti.some((el) => PathTree.isEqual(p, el))
      );
  }

  static isBounderyInsideArray(search: Boundary, b: Boundary[]): boolean {
    return b.some((el) => Boundary.isSameBoundary(el, search));
  }

  static goByRibs(
    startingPoints: Point[],
    destination: Point,
    collidedWith: Boundary,
    b: Boundary[],
    inflate: Inflate
  ): { path: Path[]; collidedObjs: Boundary[] } {
    let path: Path[] = [];
    let collidedObjs: Boundary[] = [];

    for (const startingP of startingPoints) {
      let localPath = new PathTree(
        startingP,
        Collisions.isComplit(
          { p1: startingP, p2: destination },
          collidedWith,
          inflate
        )
      );
      let vertiToWorkWith: Point[] = [startingP];
      let processedVerti: Point[] = [...startingPoints];
      while (vertiToWorkWith.length) {
        vertiToWorkWith = vertiToWorkWith
          .flatMap((v) => {
            const nextVerti = Collisions.getNextVertices(
              v,
              processedVerti,
              collidedWith,
              inflate
            ).filter((verti) => {
              const line = { p1: v, p2: verti };

              let coll = Collisions.findCollisionsOnVector(b, line, inflate);
              if (coll && !coll.some(Collisions.isCollInMiddle)) {
                return true;
              } else if (coll) {
                collidedObjs = collidedObjs.concat(
                  coll
                    .filter((c) => !Boundary.isSameBoundary(c.b, collidedWith))
                    .map((c) => c.b)
                );
                return false;
              } else {
                throw new Error("Collisions is null");
              }
            });

            if (nextVerti.length === 0) return;
            const currentVertiPath = localPath.findFirstBy({ p: v });
            nextVerti.forEach((p) => {
              drawLine(v, p, "blue", 2);

              processedVerti.push(p);
              currentVertiPath!.next?.push({
                p,
                complit: Collisions.isComplit(
                  { p1: p, p2: destination },
                  collidedWith,
                  inflate
                ),
                next: [],
              });
            });
            return nextVerti;
          })
          .filter((v) => v !== undefined);
      }
      path.push(localPath.tree);
    }
    return { path, collidedObjs };
  }

  static processCollisions(
    b: Boundary[],
    pathVector: Line,
    inflate: { width: number; height: number },
    fullPathTree: PathTree,
    pathToContinue: number[]
  ): Path[] {
    // console.log(
    //   pathToContinue,
    //   fullPathTree.findInsidePath(pathToContinue.slice(0, -1), {
    //     p: pathVector.p1,
    //   })
    // );

    if (
      fullPathTree.findInsidePath(pathToContinue.slice(0, -1), {
        p: pathVector.p1,
      })
    )
      return [];

    const pathVectorCollisions = Collisions.findCollisionsOnVector(
      b,
      pathVector,
      inflate
    );

    const pathVecCollsOnMiddle = pathVectorCollisions?.filter((el) =>
      Collisions.isCollInMiddle(el)
    );

    const pathVecCollsOnStart = pathVectorCollisions?.filter((el) =>
      Collisions.isCollInStart(el)
    );

    if (pathVecCollsOnStart && pathVecCollsOnStart.length > 2) {
      // console.log(pathVecCollsOnStart);
      return [];
    }

    if (!pathVecCollsOnMiddle || pathVecCollsOnMiddle.length === 0)
      return [{ p: pathVector.p2, complit: true, next: null }];

    pathVecCollsOnMiddle.sort((a, b) => a.len - b.len);
    drawArc(pathVecCollsOnMiddle[0].p, "green", 20);

    let collidedObjs: Boundary[] = [pathVecCollsOnMiddle[0].b]; // Проверить на процесид обжектов
    let resPath: Path[] = [];
    const allProcessedCollisions: Boundary[] = [];
    while (collidedObjs.length > 0) {
      // console.log(pathVector.p1);
      const coll = collidedObjs.shift()!;

      const lineToEachVerti = Boundary.vectorsToEachVertice(
        pathVector.p1,
        coll.inflate(inflate.width, inflate.height)
      ).filter((line) => {
        if (
          pathVecCollsOnStart &&
          pathVecCollsOnStart.length > 0 &&
          Collisions.isComplit(line, pathVecCollsOnStart[0].b, inflate)
        ) {
          return false;
        }

        // If this point was already processed inside this path. We are returning false to not go in recursion
        if (fullPathTree.findInsidePath(pathToContinue, { p: line.p2 }))
          return false;

        const collOnTheLine = Collisions.findCollisionsOnVector(
          b,
          line,
          inflate
        );

        if (!collOnTheLine)
          throw Error("It's should collide with a vertice at least");

        const collOnTheMiddle = collOnTheLine.filter(this.isCollInMiddle);

        if (collOnTheMiddle?.length === 0) {
          return true;
        } else if (collOnTheMiddle && collOnTheMiddle.length > 0) {
          const collidedOnTheWay = collOnTheMiddle.sort(
            (a, b) => a.len - b.len
          )[0].b;

          // console.log("Collision happend");

          if (
            !Collisions.isBounderyInsideArray(collidedOnTheWay, [
              ...allProcessedCollisions,
              ...collidedObjs,
              coll,
            ])
          ) {
            // console.log("Adding: ", collidedOnTheWay);

            collidedObjs.push(collidedOnTheWay);
          }
          return false;
        } else {
          throw new Error("UnExpected");
        }
      });

      lineToEachVerti.forEach((line) => {
        drawLine(line.p1, line.p2, "yellow");
      });

      if (!lineToEachVerti.length) {
        allProcessedCollisions.push(coll);
        continue;
      }

      const pathByRibs = Collisions.goByRibs(
        lineToEachVerti.map((line) => line.p2),
        pathVector.p2,
        coll,
        b,
        inflate
      );

      const filterOfB = [...allProcessedCollisions, ...collidedObjs, coll];

      collidedObjs = collidedObjs.concat(
        pathByRibs.collidedObjs.filter(
          (el) => !Collisions.isBounderyInsideArray(el, filterOfB)
        )
      );

      resPath = resPath.concat(pathByRibs.path);
      allProcessedCollisions.push(coll);
    }

    return resPath;
  }

  static findAllWays(
    pathVector: Line,
    b: Boundary[],
    inflate: Inflate
  ): PathTree {
    let tree = new PathTree(pathVector.p1);
    // defining it hire for garbage collector will not realocate memory that much time
    let pathToContinue: number[] | null = tree.findPathBy({
      complit: false,
    }) as number[];
    let elToCountinue: Path;
    do {
      elToCountinue = tree.openPath(pathToContinue) as Path;

      if (elToCountinue?.next === null) {
        elToCountinue.complit = true;
        continue;
      }
      drawLine(elToCountinue.p, pathVector.p2, "purple");

      let processColRes = Collisions.processCollisions(
        b,
        { p1: elToCountinue.p, p2: pathVector.p2 },
        inflate,
        tree,
        pathToContinue
      );

      if (elToCountinue && elToCountinue.next) {
        elToCountinue.next = elToCountinue.next.concat(processColRes);
      }

      elToCountinue.complit = true;

      pathToContinue = tree.findPathBy({ complit: false });
    } while (pathToContinue);
    return tree;
  }

  /**
   * Optimizes the paths in the given PathTree by finding the shortest valid paths.
   *
   * @param tree - The PathTree containing all possible paths.
   * @param pathVector - The initial line vector representing the start and end points.
   * @param b - An array of Boundary objects to check for collisions.
   * @param inflate - The dimensions used to inflate boundaries for collision detection.
   * @returns An array of objects, where each object represents a path:
   *          - `p`: An array of Points representing the path.
   *          - `len`: The total length of the path.
   */
  static optimizeWays(
    tree: PathTree,
    pathVector: Line,
    b: Boundary[],
    inflate: Inflate
  ): {
    p: Point[];
    len: number;
  }[] {
    const finalPath: {
      p: Point[];
      len: number;
    }[] = [];
    const lengthsSet = new Set<number>();

    while (true) {
      const pathToFinis = tree.findPathBy({ next: null });
      if (!pathToFinis) break;

      const localPath = { p: [pathVector.p1], len: 0 };
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
            b,
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
      if (lengthsSet.has(localPath.len)) continue;
      lengthsSet.add(localPath.len);
      finalPath.push(localPath);
    }

    finalPath.sort((a, b) => a.len - b.len);

    return finalPath;
  }
}
