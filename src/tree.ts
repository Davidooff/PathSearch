import { Point } from "./collisions";

export interface Path {
  complit: boolean;
  p: Point;
  next: Path[] | null;
}

export type searchOption = { [key: string]: any };

export class PathTree {
  tree: Path;

  constructor(startingPoint: Point, complit: boolean = false) {
    this.tree = { p: startingPoint, complit, next: [] };
  }
  /**
   * Helper function to compare two values. It handles value by checking their content
   * also if it's Object object it will check only params of b are equal to a, and drop a params which is not
   * inside b.
   */
  static isEqual(a: any, b: any): boolean {
    // Check for strict equality first.
    if (a === b) {
      return true;
    }

    // Check if both are objects (and not null).
    if (
      typeof a !== "object" ||
      a === null ||
      typeof b !== "object" ||
      b === null
    ) {
      return false;
    }

    // If both are arrays, compare their elements.
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!PathTree.isEqual(a[i], b[i])) {
          return false;
        }
      }
      return true;
    } else if (Array.isArray(a) || Array.isArray(b)) {
      // One is an array, but the other isn't.
      return false;
    }

    const keysB = Object.keys(b);

    // Check if every key in a exists in b and is deeply equal.
    for (const key of keysB) {
      if (!b.hasOwnProperty(key) || !PathTree.isEqual(a[key], b[key])) {
        return false;
      }
    }

    return true;
  }

  /**
   * Checks if the given object matches the search criteria.
   */
  private static matches(obj: any, criteria: searchOption): boolean {
    for (const key in criteria) {
      // If key doesn't exist on the object, or doesn't match, return false.
      if (!(key in obj) || !PathTree.isEqual(obj[key], criteria[key])) {
        return false;
      }
    }
    return true;
  }

  /**
   * Recursively searches the Path tree for the first object that matches the search criteria.
   * Returns a reference to the found object or null if no match is found.
   */
  public findFirstBy(search: Partial<Path>, current?: Path): Path | null {
    if (!current) {
      current = this.tree;
    }

    if (PathTree.matches(current, search)) {
      return current;
    }

    // If there's a next array, search through each child.
    if (current.next && Array.isArray(current.next)) {
      for (const child of current.next) {
        const found = this.findFirstBy(search, child);
        if (found) {
          return found;
        }
      }
    }

    return null;
  }

  /**
   * Recursively searches the tree and returns the path (as an array of indices) to the first matching node.
   *
   * The path is built such that the root node is always represented by 0.
   *
   * @param search The search criteria (e.g., { p: [1, 3] }).
   * @param current The current node being inspected.
   * @param currentPath The path taken to reach the current node.
   * @returns The path to the matching node as an array of numbers, or null if not found.
   */
  public findPathBy(
    search: Partial<Path>,
    current?: Path,
    currentPath: number[] = [0]
  ): number[] | null {
    if (!current) {
      current = this.tree;
    }

    if (PathTree.matches(current, search)) {
      return currentPath;
    }

    // If current.next exists and is an array, search each child.
    if (current.next && Array.isArray(current.next)) {
      for (let i = 0; i < current.next.length; i++) {
        const child = current.next[i];
        // Build the new path by appending the child index.
        const newPath = currentPath.concat(i);
        const found = this.findPathBy(search, child, newPath);
        if (found !== null) {
          return found;
        }
      }
    }

    return null;
  }

  /**
   * Given a path (an array of indices) and the root node, this function traverses the tree following the path.
   *
   * The first element of the path should be 0 (which stands for the root). For example, [0, 1]
   * means "start at the root and then go to the child at index 1 of the root's next array."
   *
   * @param path An array of indices, e.g. [0, 1].
   * @param root The root node of the tree.
   * @returns The node at the given path, or null if the path is invalid.
   */
  public openPath(path: number[]): Path | null {
    // Validate that the first index represents the root.
    if (path.length === 0 || path[0] !== 0) {
      return null;
    }

    let current: Path = this.tree;
    // Starting at index 1 since index 0 is the root.
    for (let i = 1; i < path.length; i++) {
      if (!current.next || !Array.isArray(current.next)) {
        return null;
      }
      const childIndex = path[i];
      if (childIndex < 0 || childIndex >= current.next.length) {
        return null;
      }
      current = current.next[childIndex];
    }
    return current;
  }

  /**
   * Searches for a node matching the search criteria within a specified path in the tree.
   * @param path An array of indices representing the path to search in.
   * @param search The search criteria to match against nodes.
   * @returns The first matching node found in the path, or null if no match is found.
   */
  findInsidePath(path: number[], search: Partial<Path>): Path | null {
    // Validate that the first index represents the root.
    if (path.length === 0 || path[0] !== 0) {
      return null;
    }

    let current: Path = this.tree;
    // Starting at index 1 since index 0 is the root.
    for (let i = 1; i < path.length; i++) {
      if (!current.next || !Array.isArray(current.next)) return null;

      const childIndex = path[i];
      if (childIndex < 0 || childIndex >= current.next.length) return null;
      current = current.next[childIndex];

      if (PathTree.isEqual(current, search)) return current;
    }
    return null;
  }

  // findProcessedInsidePath(path: number[]): Boundary[] | null {
  //   // Validate that the first index represents the root.
  //   if (path.length === 0 || path[0] !== 0) {
  //     return null;
  //   }
  //   let processed: Boundary[] = this.tree.processed ? this.tree.processed : [];
  //   let current: Path = this.tree;
  //   // Starting at index 1 since index 0 is the root.
  //   for (let i = 1; i < path.length; i++) {
  //     if (!current.next || !Array.isArray(current.next)) return null;

  //     const childIndex = path[i];
  //     if (childIndex < 0 || childIndex >= current.next.length) return null;
  //     current = current.next[childIndex];

  //     if (current.processed) processed = current.processed;
  //   }
  //   return processed;
  // }
}
