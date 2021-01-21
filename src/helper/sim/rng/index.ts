import { RNG } from './rng';

interface PuyoPools {
  color3: number[];
  color4: number[];
  color5: number[];
}

export class TsuRNG {
  public static getPools(seed?: number, codes = [2, 3, 4, 5, 6]): PuyoPools {
    const rand = new RNG(seed);

    // Initialize pools
    const pool3: number[] = new Array(256);
    const pool4: number[] = new Array(256);
    const pool5: number[] = new Array(256);
    for (let i = 0; i < 256; i++) {
      pool3[i] = codes[i % 3];
      pool4[i] = codes[i % 4];
      pool5[i] = codes[i % 5];
    }

    // Shuffle
    for (const pool of [pool3, pool4, pool5]) {
      for (let i = 255; i >= 0; i--) {
        const ind = rand.next(); // Number between [0, 255]
        const tmp = pool[ind];
        pool[ind] = pool[i];
        pool[i] = tmp;
      }
    }

    // Overwrite initial pairs in higher color pools
    for (let i = 0; i < 4; i++) {
      pool4[i] = pool3[i];
      pool5[i] = pool3[i];
    }
    for (let i = 4; i < 8; i++) {
      pool5[i] = pool4[i];
    }

    return {
      color3: pool3,
      color4: pool4,
      color5: pool5,
    };
  }
}
