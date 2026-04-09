import { writable, derived, get } from 'svelte/store';
import { createSudoku, createGame } from './index.js';

const SUDOKU_SIZE = 9;
const BOX_SIZE = 3;

/**
 * Compute invalid cells (cells with conflicts)
 * @param {number[][]} grid
 * @returns {string[]} Array of "x,y" strings
 */
function computeInvalidCells(grid) {
  const invalidCells = [];

  const addInvalid = (x, y) => {
    const xy = x + ',' + y;
    if (!invalidCells.includes(xy)) invalidCells.push(xy);
  };

  for (let y = 0; y < SUDOKU_SIZE; y++) {
    for (let x = 0; x < SUDOKU_SIZE; x++) {
      const value = grid[y][x];

      if (value) {
        // Check row
        for (let i = 0; i < SUDOKU_SIZE; i++) {
          if (i !== x && grid[y][i] === value) {
            addInvalid(x, y);
          }
        }

        // Check column
        for (let i = 0; i < SUDOKU_SIZE; i++) {
          if (i !== y && grid[i][x] === value) {
            addInvalid(x, i);
          }
        }

        // Check box
        const startY = Math.floor(y / BOX_SIZE) * BOX_SIZE;
        const endY = startY + BOX_SIZE;
        const startX = Math.floor(x / BOX_SIZE) * BOX_SIZE;
        const endX = startX + BOX_SIZE;
        for (let row = startY; row < endY; row++) {
          for (let col = startX; col < endX; col++) {
            if (row !== y && col !== x && grid[row][col] === value) {
              addInvalid(col, row);
            }
          }
        }
      }
    }
  }

  return invalidCells;
}

/**
 * Check if the game is won
 * @param {number[][]} grid
 * @param {string[]} invalidCells
 * @returns {boolean}
 */
function computeGameWon(grid, invalidCells) {
  if (invalidCells.length > 0) return false;

  for (let y = 0; y < SUDOKU_SIZE; y++) {
    for (let x = 0; x < SUDOKU_SIZE; x++) {
      if (grid[y][x] === 0) return false;
    }
  }

  return true;
}

/**
 * Create a game store adapter that wraps domain objects and exposes reactive state
 */
function createGameStore() {
  let game = null;

  // Internal reactive state
  const state = writable({
    grid: createEmptyGrid(),
    invalidCells: [],
    gameWon: false,
    canUndo: false,
    canRedo: false
  });

  // Update derived state from current game
  function updateState() {
    if (!game) return;

    const grid = game.getSudoku().getGrid();
    const invalidCells = computeInvalidCells(grid);
    const gameWon = computeGameWon(grid, invalidCells);

    state.set({
      grid,
      invalidCells,
      gameWon,
      canUndo: game.canUndo(),
      canRedo: game.canRedo()
    });
  }

  /**
   * Start a new game with the given puzzle
   * @param {number[][]} puzzle
   */
  function newGame(puzzle) {
    const sudoku = createSudoku(puzzle);
    game = createGame({ sudoku });
    updateState();
  }

  /**
   * Make a guess
   * @param {{ row: number, col: number, value: number }} move
   */
  function guess(move) {
    if (!game) return;
    game.guess(move);
    updateState();
  }

  /**
   * Undo the last move
   */
  function undo() {
    if (!game) return;
    game.undo();
    updateState();
  }

  /**
   * Redo the last undone move
   */
  function redo() {
    if (!game) return;
    game.redo();
    updateState();
  }

  return {
    subscribe: state.subscribe,

    newGame,
    guess,
    undo,
    redo,

    /**
     * Get the current game instance
     * @returns {ReturnType<typeof createGame> | null}
     */
    getGame() {
      return game;
    }
  };
}

function createEmptyGrid() {
  return Array.from({ length: SUDOKU_SIZE }, () =>
    Array(SUDOKU_SIZE).fill(0)
  );
}

// Export singleton instance
export const gameStore = createGameStore();
