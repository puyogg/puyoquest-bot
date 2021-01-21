const INT_SIZE = 4;

/** Rotates bits left */
function _rotl(value: number, shift: number): number {
  if ((shift &= INT_SIZE * 8 - 1) == 0) {
    return value >>> 0;
  }
  return ((value << shift) | (value >> (INT_SIZE * 8 - shift))) >>> 0;
}

export class RNG {
  private _seed: number;
  private seed: number; // Avoid changing original seed number
  private i: number;
  private tmp: number;

  constructor(seed?: number) {
    this._seed = seed || 0x35879de2;
    this.seed = this._seed;
    this.i = 0;
    this.tmp = 0xf1;
  }

  public next(): number {
    if (this.i % 2 === 0) this.tmp = 0xf1;
    else this.tmp = 0xf0;

    this.tmp = (this.tmp + this.seed) >>> 0;
    this.tmp = (this.tmp + 0x00ff7fe8) >>> 0;
    this.tmp = _rotl(this.tmp, 5);
    this.tmp = (this.tmp + this.seed) >>> 0;
    this.tmp = (this.tmp + 1) >>> 0;

    this.i++;
    this.seed = this.tmp;
    return this.seed & 0xff;
  }
}
