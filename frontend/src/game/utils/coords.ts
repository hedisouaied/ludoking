import type { Color } from '../types'
import { START_TILES } from '../engine/board'

/**
 * Board geometry for the 15x15 grid (columns/rows 0..14, cell 40px).
 *
 * The 52-cell ring is the canonical Ludo path (verified against the classic
 * layout): each color enters at its START tile and travels clockwise. The
 * home lane of a color branches off the ring cell immediately BEFORE its
 * start tile, so START_TILES stays the single source of truth.
 */

export const CELL = 40
export const SIZE = 15 * CELL // 600

/** Ring cells as [col, row]. PATH[tile] -> cell. */
export const PATH: Array<[number, number]> = [
  [0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],
  [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0],
  [7, 0], [8, 0], [8, 1], [8, 2], [8, 3], [8, 4],
  [8, 5], [9, 6], [10, 6], [11, 6], [12, 6], [13, 6],
  [14, 6], [14, 7], [14, 8], [13, 8], [12, 8], [11, 8],
  [10, 8], [9, 8], [8, 9], [8, 10], [8, 11], [8, 12],
  [8, 13], [8, 14], [7, 14], [6, 14], [6, 13], [6, 12],
  [6, 11], [6, 10], [6, 9], [5, 8], [4, 8], [3, 8],
  [2, 8], [1, 8], [0, 8], [0, 7],
]

/**
 * Home column: the 5 lane cells (rel 52..56 -> position 100..104) plus the
 * finishing spot (rel 57 -> position 105) where a finished token rests.
 * [col, row] each.
 */
export const HOME_LANE: Record<Color, Array<[number, number]>> = {
  red: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  green: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  yellow: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
  blue: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
}

export const FINISH_SPOT: Record<Color, [number, number]> = {
  red: [6, 7],
  green: [7, 6],
  yellow: [8, 7],
  blue: [7, 8],
}

/** Four resting slots inside each base, [col, row]. */
export const BASE_SLOTS: Record<Color, Array<[number, number]>> = {
  red: [[2, 2], [2, 4], [4, 2], [4, 4]],
  green: [[10, 2], [10, 4], [12, 2], [12, 4]],
  yellow: [[10, 10], [10, 12], [12, 10], [12, 12]],
  blue: [[2, 10], [2, 12], [4, 10], [4, 12]],
}

/** Origin [col, row] of each 6x6 base quadrant. */
export const BASE_ORIGIN: Record<Color, [number, number]> = {
  red: [0, 0],
  green: [9, 0],
  yellow: [9, 9],
  blue: [0, 9],
}

export function startCell(color: Color): [number, number] {
  return PATH[START_TILES[color]]
}

export function cellCenter([col, row]: [number, number]): { x: number; y: number } {
  return { x: (col + 0.5) * CELL, y: (row + 0.5) * CELL }
}

/**
 * Pixel center for a token of the given color at the given encoded position.
 */
export function positionCenter(position: number, color: Color, tokenNumber: number): { x: number; y: number } {
  if (position === -1) {
    return cellCenter(BASE_SLOTS[color][Math.min(tokenNumber, 3)])
  }
  if (position >= 0 && position < 52) {
    return cellCenter(PATH[position])
  }
  if (position >= 100 && position <= 104) {
    return cellCenter(HOME_LANE[color][position - 100])
  }
  return cellCenter(FINISH_SPOT[color])
}

/** Orientation for path arrows: the angle (radians) to the next ring cell. */
export function nextCellVec(tile: number): [number, number] {
  const [c, r] = PATH[tile]
  const [nc, nr] = PATH[(tile + 1) % 52]
  return [nc - c, nr - r]
}