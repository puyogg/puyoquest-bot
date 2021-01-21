enum PUYOTYPE {
  NONE,
  GARBAGE,
  RED,
  GREEN,
  BLUE,
  YELLOW,
  PURPLE,
  HARD,
  STONE,
  BLOCK,
}

type PuyoNameMapper = { [P in PUYOTYPE]: string };

const PUYONAME: PuyoNameMapper = [
  'spacer',
  'garbage',
  'red',
  'green',
  'blue',
  'yellow',
  'purple',
  'hard',
  'stone',
  'block',
];

const CHAIN_POWER = {
  TSU: [0, 8, 16, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 480, 512, 544, 576, 608, 640, 672],
};

const COLOR_BONUS = {
  CLASSIC: [0, 3, 6, 12, 14],
  FEVER: [0, 2, 4, 8, 16],
};

const GROUP_BONUS = {
  CLASSIC: [0, 2, 3, 4, 5, 6, 7, 10],
  FEVER: [0, 1, 2, 3, 4, 5, 6, 8],
};

interface SolverSettings {
  rows: number;
  cols: number;
  hrows: number;
  chainPower: number[];
  colorBonus: number[];
  groupBonus: number[];
  puyoToPop: number;
  targetPoint: number;
}

const DEFAULT_SETTINGS: SolverSettings = {
  rows: 13,
  cols: 6,
  hrows: 1,
  chainPower: CHAIN_POWER['TSU'],
  colorBonus: COLOR_BONUS['CLASSIC'],
  groupBonus: GROUP_BONUS['CLASSIC'],
  puyoToPop: 4,
  targetPoint: 70,
};

export { PUYOTYPE, PUYONAME, SolverSettings, DEFAULT_SETTINGS };
