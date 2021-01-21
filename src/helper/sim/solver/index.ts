import { DEFAULT_SETTINGS, PUYOTYPE } from './constants';
import { PuyoField, BoolField, NumField } from './field';
import { isColored, isBlock, isGarbage, get2d } from './helper';

interface FieldState {
  puyoField: PuyoField; // Current positions of Puyos
  dropDists: NumField; // How far each Puyo needs to drop
  garbageAdjacency: NumField; // How much to reduce a Garbage Puyo's value
  isPopping: BoolField; // Puyos that would be playing their popping animation
  hasDrops: boolean;
  hasPops: boolean;
  chainLength: number;
  score: number;
  PC: number; // Puyo Cleared
  GB: number; // Group Bonus
  CB: number; // Color Bonus
  CP: number; // Chain Power
  garbage: number;
  poppingGroups: Pos[][];
}

interface Pos {
  row: number;
  col: number;
}

class ChainSolver {
  private rows: number;
  private cols: number;
  private hrows: number;
  private puyoToPop: number;
  private groupBonus: number[];
  private colorBonus: number[];
  private chainPower: number[];
  private targetPoint: number;
  private boolField: BoolField;

  public inputField: PuyoField;
  public states: FieldState[];

  constructor(inputArray: PUYOTYPE[], settings = DEFAULT_SETTINGS) {
    this.rows = settings.rows;
    this.cols = settings.cols;
    this.hrows = settings.hrows;
    this.puyoToPop = settings.puyoToPop;
    this.groupBonus = settings.groupBonus;
    this.colorBonus = settings.colorBonus;
    this.chainPower = settings.chainPower;
    this.targetPoint = settings.targetPoint;
    this.inputField = new PuyoField(this.rows, this.cols, inputArray);
    this.boolField = new BoolField(this.rows, this.cols);

    // Placeholder initial state. Not evaluated yet.
    this.states = [
      {
        puyoField: this.inputField,
        dropDists: new NumField(this.rows, this.cols),
        garbageAdjacency: new NumField(this.rows, this.cols),
        isPopping: new BoolField(this.rows, this.cols),
        hasDrops: false,
        hasPops: false,
        chainLength: 0,
        score: 0,
        PC: 0,
        GB: 0,
        CB: 0,
        CP: 0,
        garbage: 0,
        poppingGroups: [],
      },
    ];
  }

  private checkDrops(): void {
    const state = this.states[this.states.length - 1];
    const puyoField = state.puyoField;
    const dropDists = state.dropDists;

    // Update state.dropDists (NumField) and
    // state.hasDrops (boolean)
    for (let c = 0; c < this.cols; c++) {
      let toDrop = 0;
      for (let r = this.rows - 1; r >= 0; r--) {
        const puyo = puyoField.get(r, c);
        // if (isColored(puyo) || isGarbage(puyo)) {
        //   dropDists.set(r, c, toDrop);
        //   if (toDrop > 0) state.hasDrops = true;
        // } else if (isBlock(puyo)) {
        //   dropDists.set(r, c, 0);
        //   toDrop = 0;
        // } else {
        //   toDrop += 1;
        // }

        if (isBlock(puyo)) {
          dropDists.set(r, c, 0);
          toDrop = 0;
        } else if (puyo === PUYOTYPE.NONE) {
          toDrop += 1;
        } else {
          dropDists.set(r, c, toDrop);
          if (toDrop > 0) state.hasDrops = true;
        }
      }
    }
  }

  private applyDrops(): void {
    const state = this.states[this.states.length - 1];
    const puyoField = state.puyoField;
    const dropDists = state.dropDists;

    const droppedField = new PuyoField(this.rows, this.cols, puyoField.data);

    // Apply the drops to the dropped field
    for (let c = 0; c < this.cols; c++) {
      for (let r = this.rows - 1; r >= 0; r--) {
        const puyo = droppedField.get(r, c);
        const dist = dropDists.get(r, c);
        droppedField.set(r + dist, c, puyo);
        if (dist > 0) droppedField.set(r, c, PUYOTYPE.NONE); // Swap
      }
    }

    // Create a new state based on the old one
    const newState: FieldState = {
      puyoField: droppedField,
      dropDists: new NumField(this.rows, this.cols),
      garbageAdjacency: new NumField(this.rows, this.cols),
      isPopping: new BoolField(this.rows, this.cols),
      hasDrops: false,
      hasPops: false,
      chainLength: state.chainLength,
      score: state.score,
      PC: 0,
      GB: 0,
      CB: 0,
      CP: 0,
      garbage: state.garbage,
      poppingGroups: [],
    };

    // Add state to list
    this.states.push(newState);
  }

  private analyzePops(): void {
    const state = this.states[this.states.length - 1];
    const puyoField = state.puyoField;
    const isPopping = state.isPopping;
    const garbageAdjacency = state.garbageAdjacency;

    // Reset the boolField
    this.boolField.reset();

    const colors = new Set<PUYOTYPE>();
    const sizes: number[] = [];
    const posToPop: Pos[] = [];
    const poppingGroups: Pos[][] = [];

    // Search for connected components
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const group: Pos[] = [];
        const puyo = puyoField.get(r, c);

        // Ignore if it's not a colored Puyo
        if (!isColored(puyo)) {
          this.boolField.set(r, c, true);
          continue;
        }

        // Ignore if it's already been checked
        if (this.boolField.get(r, c)) continue;

        // Add the current puyo to the group
        group.push({ row: r, col: c });
        this.boolField.set(r, c, true); // Mark as checked

        for (let g = 0; g < group.length; g++) {
          const pos = group[g];
          const { row, col } = pos;

          // Check left
          if (col > 0 && puyo === puyoField.get(row, col - 1) && !this.boolField.get(row, col - 1)) {
            group.push({ row: row, col: col - 1 });
            this.boolField.set(row, col - 1, true);
          }
          // Check right
          if (col < this.cols - 1 && puyo === puyoField.get(row, col + 1) && !this.boolField.get(row, col + 1)) {
            group.push({ row: row, col: col + 1 });
            this.boolField.set(row, col + 1, true);
          }
          // Check up
          if (row > this.hrows && puyo === puyoField.get(row - 1, col) && !this.boolField.get(row - 1, col)) {
            group.push({ row: row - 1, col: col });
            this.boolField.set(row - 1, col, true);
          }
          // Check down
          if (row < this.rows - 1 && puyo === puyoField.get(row + 1, col) && !this.boolField.get(row + 1, col)) {
            group.push({ row: row + 1, col: col });
            this.boolField.set(row + 1, col, true);
          }
        }

        // Add group data if it means the pop requirement
        if (group.length >= this.puyoToPop) {
          posToPop.push(...group);
          poppingGroups.push(group);
          for (const g of group) {
            const { row, col } = g;
            isPopping.set(row, col, true);
          }
          colors.add(puyo);
          sizes.push(group.length);
        }
      }
    }

    // Look for Garbage Puyos around the Puyos that are going to pop
    for (let i = 0; i < posToPop.length; i++) {
      const { row, col } = posToPop[i];

      // Check left
      if (col > 0 && isGarbage(puyoField.get(row, col - 1))) {
        garbageAdjacency.set(row, col - 1, garbageAdjacency.get(row, col - 1) + 1);
      }

      // Check right
      if (col < this.cols - 1 && isGarbage(puyoField.get(row, col + 1))) {
        garbageAdjacency.set(row, col + 1, garbageAdjacency.get(row, col + 1) + 1);
      }

      // Check up. In SEGA games, you can clear Garbage in the hidden rows
      if (row > 0 && isGarbage(puyoField.get(row - 1, col))) {
        garbageAdjacency.set(row - 1, col, garbageAdjacency.get(row - 1, col) + 1);
      }

      // check down
      if (row < this.rows - 1 && isGarbage(puyoField.get(row + 1, col))) {
        garbageAdjacency.set(row + 1, col, garbageAdjacency.get(row + 1, col) + 1);
      }
    }

    // Update hasPops
    state.hasPops = posToPop.length > 0;

    if (state.hasPops) {
      state.poppingGroups = poppingGroups;
      state.chainLength++;
      state.PC = posToPop.length;
      state.GB = sizes.reduce((a, v) => this.groupBonus[Math.min(v - this.puyoToPop, this.groupBonus.length - 1)], 0);
      state.CB = this.colorBonus[colors.size - 1];
      state.CP = this.chainPower[Math.min(state.chainLength - 1, this.chainPower.length - 1)];
      state.score += 10 * state.PC * Math.min(Math.max(state.GB + state.CB + state.CP, 1), 999);
      state.garbage = Math.floor(state.score / this.targetPoint); // Not gonna bother with leftover NP
    }
  }

  private applyPops(): void {
    const state = this.states[this.states.length - 1];
    const puyoField = state.puyoField;
    const isPopping = state.isPopping;
    const garbageAdjacency = state.garbageAdjacency;

    const poppedField = new PuyoField(this.rows, this.cols, puyoField.data);
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const puyo = puyoField.get(r, c);

        if (isColored(puyo) && isPopping.get(r, c)) {
          poppedField.set(r, c, PUYOTYPE.NONE);
        } else if (isGarbage(puyo)) {
          const count = garbageAdjacency.get(r, c);
          if ((puyo === PUYOTYPE.GARBAGE && count >= 1) || (puyo === PUYOTYPE.HARD && count >= 2)) {
            poppedField.set(r, c, PUYOTYPE.NONE);
          } else if (puyo === PUYOTYPE.HARD && count === 1) {
            poppedField.set(r, c, PUYOTYPE.GARBAGE);
          }
        }
      }
    }

    // Create a new state based on the old one
    const newState: FieldState = {
      puyoField: poppedField,
      dropDists: new NumField(this.rows, this.cols),
      garbageAdjacency: new NumField(this.rows, this.cols),
      isPopping: new BoolField(this.rows, this.cols),
      hasDrops: false,
      hasPops: false,
      chainLength: state.chainLength,
      score: state.score,
      PC: 0,
      GB: 0,
      CB: 0,
      CP: 0,
      garbage: state.garbage,
      poppingGroups: [],
    };

    // Add state to list
    this.states.push(newState);
  }

  public simulate(): void {
    const state = this.states[this.states.length - 1];
    this.checkDrops();
    if (state.hasDrops) {
      this.applyDrops();
      return this.simulate();
    }

    this.analyzePops();
    if (state.hasPops) {
      this.applyPops();
      return this.simulate();
    }
  }

  public resetToEmpty(): void {
    this.states = [
      {
        puyoField: new PuyoField(this.rows, this.cols),
        dropDists: new NumField(this.rows, this.cols),
        garbageAdjacency: new NumField(this.rows, this.cols),
        isPopping: new BoolField(this.rows, this.cols),
        hasDrops: false,
        hasPops: false,
        chainLength: 0,
        score: 0,
        PC: 0,
        GB: 0,
        CB: 0,
        CP: 0,
        garbage: 0,
        poppingGroups: [],
      },
    ];
  }

  public resetToInput(): void {
    this.states = [
      {
        puyoField: this.inputField,
        dropDists: new NumField(this.rows, this.cols),
        garbageAdjacency: new NumField(this.rows, this.cols),
        isPopping: new BoolField(this.rows, this.cols),
        hasDrops: false,
        hasPops: false,
        chainLength: 0,
        score: 0,
        PC: 0,
        GB: 0,
        CB: 0,
        CP: 0,
        garbage: 0,
        poppingGroups: [],
      },
    ];
  }

  public resetToField(field: PuyoField): void {
    const newField = new PuyoField(field.rows, field.cols, field.data);
    this.states = [
      {
        puyoField: newField,
        dropDists: new NumField(this.rows, this.cols),
        garbageAdjacency: new NumField(this.rows, this.cols),
        isPopping: new BoolField(this.rows, this.cols),
        hasDrops: false,
        hasPops: false,
        chainLength: 0,
        score: 0,
        PC: 0,
        GB: 0,
        CB: 0,
        CP: 0,
        garbage: 0,
        poppingGroups: [],
      },
    ];
  }

  public logStates(): void {
    this.states.forEach((state) => {
      const puyoField2d = get2d<PUYOTYPE>(this.rows, this.cols, state.puyoField.data);
      console.log(puyoField2d);
    });
  }
}

export { ChainSolver, FieldState, Pos };
