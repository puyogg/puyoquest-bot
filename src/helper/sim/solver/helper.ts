import { PUYOTYPE } from './constants';

function isColored(puyo: PUYOTYPE): boolean {
  return puyo >= PUYOTYPE.RED && puyo <= PUYOTYPE.PURPLE;
}

function isGarbage(puyo: PUYOTYPE): boolean {
  return puyo === PUYOTYPE.GARBAGE || puyo === PUYOTYPE.HARD;
}

function isBlock(puyo: PUYOTYPE): boolean {
  return puyo === PUYOTYPE.BLOCK;
}

function isNone(puyo: PUYOTYPE): boolean {
  return puyo === PUYOTYPE.NONE;
}

function get2d<T>(rows: number, cols: number, array: T[]): T[][] {
  const result: T[][] = [];
  for (let r = 0; r < rows; r++) {
    result[r] = [];
    for (let c = 0; c < cols; c++) {
      result[r][c] = array[r * cols + c];
    }
  }

  return result;
}

export { isColored, isGarbage, isBlock, isNone, get2d };
