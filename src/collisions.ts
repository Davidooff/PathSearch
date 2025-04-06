import { drawArc, drawLine } from "./main";
import { Path, PathTree } from "./tree";
import { Vector2 } from "./vector2";

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

  static vectorsToEachVertice(
    startingPoint: Point,
    rec: Rectangle
  ): [Line, Line, Line, Line] {
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
            len: Vector2.getLength(
              collIntPoint.x - pathVector.p1.x,
              collIntPoint.y - pathVector.p1.x
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

  static isComplit(pathVector: Line, obj: Boundary, inflate: Inflate): boolean {
    return !(
      Collisions.findCollisionsOnVector([obj], pathVector, inflate)?.length ===
      2
    );
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
    console.log("Starting points: ", startingPoints, startingPoints.length);

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
    processedObjs: Boundary[]
  ): { path: Path[]; processedObj?: Boundary[] } {
    console.log(pathVector.p1);

    const pathVectorCollisions = Collisions.findCollisionsOnVector(
      b,
      pathVector,
      inflate
    )?.filter(Collisions.isCollInMiddle);

    if (!pathVectorCollisions || pathVectorCollisions.length === 0)
      return { path: [{ p: pathVector.p2, complit: true, next: null }] };

    pathVectorCollisions.sort((a, b) => a.len - b.len);
    drawArc(pathVectorCollisions[0].p, "green", 20);

    if (
      Collisions.isBounderyInsideArray(pathVectorCollisions[0].b, processedObjs)
    ) {
      drawArc(pathVectorCollisions[0].p, "red", 50);

      return { path: [] };
    }
    let collidedObjs: Boundary[] = [pathVectorCollisions[0].b]; // Проверить на процесид обжектов
    let resPath: Path[] = [];
    const allProcessedCollisions: Boundary[] = [];
    while (collidedObjs.length > 0) {
      const coll = collidedObjs.shift()!;
      // console.log("Now: ", coll);

      if (processedObjs.some((p) => Boundary.isSameBoundary(p, coll))) continue;
      if (!Boundary.isSameBoundary(coll, pathVectorCollisions[0].b))
        allProcessedCollisions.push(coll);

      const lineToEachVerti = Boundary.vectorsToEachVertice(
        pathVector.p1,
        coll.inflate(inflate.width, inflate.height)
      ).filter((line) => {
        const collOnTheLine = Collisions.findCollisionsOnVector(
          b,
          line,
          inflate
        )?.filter((elColl) => this.isCollInMiddle(elColl));

        if (collOnTheLine?.length === 0) {
          return true;
        } else if (collOnTheLine) {
          const collidedOnTheWay = collOnTheLine
            .filter((el) => !Boundary.isSameBoundary(el.b, coll))
            .sort((a, b) => a.len - b.len)
            .map((el) => el.b)[0];

          if (
            collidedOnTheWay &&
            !Collisions.isBounderyInsideArray(collidedOnTheWay, [
              ...allProcessedCollisions,
              ...processedObjs,
              ...collidedObjs,
            ])
          )
            collidedObjs.push(collidedOnTheWay);
          return false;
        } else {
          throw new Error("UnExpected");
        }
      });

      lineToEachVerti.forEach((line) => drawLine(line.p1, line.p2, "red"));

      const pathByRibs = Collisions.goByRibs(
        lineToEachVerti.map((line) => line.p2),
        pathVector.p2,
        coll,
        b,
        inflate
      );

      pathByRibs.path.forEach((el) => {
        drawLine(el.p, pathVector.p1, "green", 2);
      });

      const filterOfB = [
        ...allProcessedCollisions,
        ...processedObjs,
        ...collidedObjs,
        coll,
      ];

      // console.log("Filter of ", filterOfB);
      // console.log("New ", pathByRibs.collidedObjs);

      collidedObjs = collidedObjs.concat(
        pathByRibs.collidedObjs.filter(
          (el) =>
            !filterOfB.some((filteOf) => Boundary.isSameBoundary(filteOf, el))
        )
      );

      // console.log("result ", collidedObjs);

      resPath = resPath.concat(pathByRibs.path);
    }

    return { path: resPath, processedObj: allProcessedCollisions };
  }
}
