import { PUYOTYPE } from './constants';

class Field<T> {
  public rows: number;
  public cols: number;
  public data: T[];

  constructor(rows: number, cols: number, copyArray?: T[]) {
    this.rows = rows;
    this.cols = cols;

    if (copyArray) {
      this.data = copyArray.slice(0);
    } else {
      this.data = new Array(rows * cols);
    }
  }

  public get(row: number, col: number): T {
    return this.data[row * this.cols + col];
  }

  public set(row: number, col: number, val: T): void {
    this.data[row * this.cols + col] = val;
  }

  public copyFrom(other: Field<T>): void {
    for (let i = 0; i < this.data.length; i++) {
      this.data[i] = other.data[i];
    }
  }
}

class PuyoField extends Field<PUYOTYPE> {
  constructor(rows: number, cols: number, copyArray?: PUYOTYPE[]) {
    super(rows, cols, copyArray);
    if (!copyArray) this.reset();
  }

  public reset(): void {
    this.data.fill(PUYOTYPE.NONE);
  }
}

class BoolField extends Field<boolean> {
  constructor(rows: number, cols: number, copyArray?: boolean[]) {
    super(rows, cols, copyArray);
    if (!copyArray) this.reset();
  }

  public reset(): void {
    this.data.fill(false);
  }

  public anyTrue(): boolean {
    return this.data.some((v) => v);
  }

  public anyFalse(): boolean {
    return this.data.some((v) => !v);
  }

  public allTrue(): boolean {
    return this.data.every((v) => v);
  }

  public allFalse(): boolean {
    return this.data.every((v) => !v);
  }
}

class NumField extends Field<number> {
  constructor(rows: number, cols: number, copyArray?: number[]) {
    super(rows, cols, copyArray);
    if (!copyArray) this.reset();
  }

  public reset(): void {
    this.data.fill(0);
  }

  public increment(row: number, col: number): number {
    this.data[row * this.cols + col] += 1;
    return this.data[row * this.cols + col];
  }

  public addAt(row: number, col: number, val: number): number {
    this.data[row * this.cols + col] += val;
    return this.data[row * this.cols + col];
  }

  public isAllZero(): boolean {
    return this.data.every((v) => v === 0);
  }
}

export { Field, PuyoField, BoolField, NumField };
