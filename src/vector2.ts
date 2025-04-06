export class Vector2 {
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  //getLength()
  getLength() {
    return Math.sqrt(this.x ** 2 + this.y ** 2);
  }
  // static get length
  static getLength(x: number, y: number) {
    return Math.sqrt(x ** 2 + y ** 2);
  }
}
