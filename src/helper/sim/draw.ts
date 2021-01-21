import { loadImage, Image, createCanvas, Canvas } from 'canvas';
import * as path from 'path';
import { PUYONAME, PUYOTYPE } from './solver/constants';
import { get2d } from './solver/helper';

interface PuyoSprites {
  [index: string]: Canvas[];
  red: Canvas[];
  green: Canvas[];
  blue: Canvas[];
  yellow: Canvas[];
  purple: Canvas[];
  garbage: Canvas[];
}

// Load assets
let fieldBorder: Image;
loadImage(path.resolve(__dirname, '../../images/sim/field_template.png'))
  .then((image) => (fieldBorder = image))
  .catch(() => console.error(`There was a problem loading the field border.`));
let fieldBG: Image;
loadImage(path.resolve(__dirname, '../../images/sim/field_son.png'))
  .then((image) => (fieldBG = image))
  .catch(() => console.error(`There was a proble loading the field background.`));
let puyoSkin: Image;
let puyoSprites: PuyoSprites;
loadImage(path.resolve(__dirname, '../../images/sim/puyo_gummy.png'))
  .then((image) => {
    puyoSkin = image;
    const sprites: PuyoSprites = {
      red: [],
      green: [],
      blue: [],
      yellow: [],
      purple: [],
      garbage: [],
    };

    const colors = ['red', 'green', 'blue', 'yellow', 'purple'];
    for (let i = 0; i < 5; i++) {
      const y = 72 * i;
      const color = colors[i];
      for (let x = 0; x < 72 * 16; x += 72) {
        const canvas = createCanvas(64, 60);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(puyoSkin, x, y, 64, 60, 0, 0, 64, 60);
        sprites[color].push(canvas);
      }
    }

    // Garbage Puyo
    {
      const canvas = createCanvas(64, 60);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(puyoSkin, 18 * 72, 72, 64, 60, 0, 0, 64, 60);
      sprites['garbage'].push(canvas);
    }

    puyoSprites = sprites;
  })
  .catch(() => console.error(`There was a proble loading the field background.`));

interface FieldOptions {
  character?: string;
  puyoSkin?: string;
  fieldString?: string;
}

function drawPuyos(options?: FieldOptions): Canvas {
  const canvas = createCanvas(384, 780);
  const ctx = canvas.getContext('2d');
  if (!options || !options.fieldString) {
    return canvas;
  }

  // Convert field string to 2d array
  const fieldNums = Array.from(options.fieldString).map((str) => parseInt(str, 10));
  const matrix = get2d<number>(13, 6, fieldNums);
  // const matrix: number[][] = [];
  for (let y = 0; y < 13; y++) {
    for (let x = 0; x < 6; x++) {
      const puyo: PUYOTYPE = matrix[y][x];
      const name = PUYONAME[puyo];
      if (puyo === PUYOTYPE.NONE) {
        continue;
      } else if (puyo === PUYOTYPE.GARBAGE) {
        ctx.drawImage(puyoSprites[name][0], 0, 0, 64, 60, x * 64, y * 60, 64, 60);
      } else if (puyo >= PUYOTYPE.RED && puyo <= PUYOTYPE.PURPLE) {
        // Check down, up, right, and left for connections
        let spriteInd = 0;
        if (y < 12 && puyo === matrix[y + 1][x]) spriteInd += 1;
        if (y > 1 && puyo === matrix[y - 1][x]) spriteInd += 2;
        if (x < 5 && puyo === matrix[y][x + 1]) spriteInd += 4;
        if (x > 0 && puyo === matrix[y][x - 1]) spriteInd += 8;

        ctx.drawImage(puyoSprites[name][spriteInd], 0, 0, 64, 60, x * 64, y * 60, 64, 60);
      }
    }
  }

  return canvas;
}

function drawField(options?: FieldOptions): Canvas {
  const canvas = createCanvas(548, 868);
  const ctx = canvas.getContext('2d');
  const puyoCanvas = drawPuyos(options);
  ctx.drawImage(fieldBG, 0, 0, 400, 724, 74, 89, 400, 724);
  ctx.drawImage(fieldBorder, 0, 0);
  ctx.drawImage(puyoCanvas, 0, 0, 384, 780, 82, 31, 384, 780);
  return canvas;
}

export function drawGame(options?: FieldOptions): Canvas {
  const fieldCanvas = drawField(options);
  const canvas = createCanvas(900, 870);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(fieldCanvas, 0, 0);
  return canvas;
}
