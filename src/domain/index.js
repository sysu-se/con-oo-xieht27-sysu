const SUDOKU_SIZE = 9;
const BOX_SIZE = 3;

/**
 * Create a Sudoku domain object
 * @param {number[][]} puzzle - 9x9 grid
 */
export function createSudoku(puzzle) {
  // Defensively copy the input grid
  const grid = puzzle.map(row => [...row]);

  /**
   * Get a copy of the current grid
   * @returns {number[][]}
   */
  function getGrid() {
    return grid.map(row => [...row]);
  }

  /**
   * Make a guess at a specific position
   * @param {{ row: number, col: number, value: number }} move
   */
  function guess({ row, col, value }) {
    if (row < 0 || row >= SUDOKU_SIZE || col < 0 || col >= SUDOKU_SIZE) return;
    if (value < 0 || value > SUDOKU_SIZE) return;
    grid[row][col] = value;
  }

  /**
   * Create a deep clone of this sudoku
   * @returns {ReturnType<typeof createSudoku>}
   */
  function clone() {
    const clonedGrid = structuredClone(grid);
    return createSudoku(clonedGrid);
  }

  /**
   * Serialize to plain JSON
   * @returns {{ grid: number[][] }}
   */
  function toJSON() {
    return {
      grid: grid.map(row => [...row])
    };
  }

  /**
   * Get human-readable string representation
   * @returns {string}
   */
  function toString() {
    let out = '╔═══════╤═══════╤═══════╗\n';
    for (let row = 0; row < SUDOKU_SIZE; row++) {
      if (row !== 0 && row % BOX_SIZE === 0) {
        out += '╟───────┼───────┼───────╢\n';
      }
      for (let col = 0; col < SUDOKU_SIZE; col++) {
        if (col === 0) {
          out += '║ ';
        } else if (col % BOX_SIZE === 0) {
          out += '│ ';
        }
        out += (grid[row][col] === 0 ? '·' : grid[row][col]) + ' ';
        if (col === SUDOKU_SIZE - 1) {
          out += '║';
        }
      }
      out += '\n';
    }
    out += '╚═══════╧═══════╧═══════╝';
    return out;
  }

  return {
    getGrid,
    guess,
    clone,
    toJSON,
    toString
  };
}

/**
 * Restore a Sudoku from JSON
 * @param {{ grid: number[][] }} json
 * @returns {ReturnType<typeof createSudoku>}
 */
export function createSudokuFromJSON(json) {
  return createSudoku(json.grid);
}

/**
 * Create a Game domain object
 * @param {{ sudoku: ReturnType<typeof createSudoku> }} config
 */
export function createGame({ sudoku }) {
  let currentSudoku = sudoku;
  const past = [];   // Stack of previous sudoku states (grids)
  const future = []; // Stack of redo states (grids)

  /**
   * Get the current sudoku
   * @returns {ReturnType<typeof createSudoku>}
   */
  function getSudoku() {
    return currentSudoku;
  }

  /**
   * Make a guess and record history
   * @param {{ row: number, col: number, value: number }} move
   */
  function guess(move) {
    // Save current state to past
    past.push(currentSudoku.getGrid());
    // Clear future on new move
    future.length = 0;
    // Apply the move
    currentSudoku.guess(move);
  }

  /**
   * Undo the last move
   */
  function undo() {
    if (past.length === 0) return;
    // Save current to future
    future.push(currentSudoku.getGrid());
    // Restore from past
    const previousGrid = past.pop();
    currentSudoku = createSudoku(previousGrid);
  }

  /**
   * Redo the last undone move
   */
  function redo() {
    if (future.length === 0) return;
    // Save current to past
    past.push(currentSudoku.getGrid());
    // Restore from future
    const nextGrid = future.pop();
    currentSudoku = createSudoku(nextGrid);
  }

  /**
   * Check if undo is available
   * @returns {boolean}
   */
  function canUndo() {
    return past.length > 0;
  }

  /**
   * Check if redo is available
   * @returns {boolean}
   */
  function canRedo() {
    return future.length > 0;
  }

  /**
   * Serialize to plain JSON
   * @returns {{ sudoku: { grid: number[][] }, past: number[][][], future: number[][][] }}
   */
  function toJSON() {
    return {
      sudoku: currentSudoku.toJSON(),
      past: past.map(grid => grid.map(row => [...row])),
      future: future.map(grid => grid.map(row => [...row]))
    };
  }

  return {
    getSudoku,
    guess,
    undo,
    redo,
    canUndo,
    canRedo,
    toJSON
  };
}

/**
 * Restore a Game from JSON
 * @param {{ sudoku: { grid: number[][] }, past: number[][][], future: number[][][] }} json
 * @returns {ReturnType<typeof createGame>}
 */
export function createGameFromJSON(json) {
  const sudoku = createSudokuFromJSON(json.sudoku);
  // Restore just the current state; history is not preserved
  return createGame({ sudoku });
}
