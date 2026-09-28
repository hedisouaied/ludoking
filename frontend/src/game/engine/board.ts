import type { Color } from '../types'

/**
 * Pure Ludo board model and rules. This mirrors the Laravel Board class
 * (backend/app/Services/Ludo/Board.php) so local and online games behave
 * identically. Never touch the DOM from here.
 *
 * A token travels 57 squares from its color's start tile to reach home:
 *   rel 0..51  -> ring tiles (position 0..51)
 *   rel 52..56 -> home column cells (encoded 100..104)
 *   rel 57     -> finished (encoded 105)
 * Bases are encoded -1.
 */

export const RING_CELLS = 52
export const FINISHED = 105
export const HOME_BASE = 100

export const START_TILES: Record<Color, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
}

/** Each color's start tile plus the tile 8 steps after it. */
export const SAFE_TILES = [0, 8, 13, 21, 26, 34, 39, 47]

export function startTile(color: Color): number {
  return START_TILES[color]
}

export function isSafe(tile: number): boolean {
  return SAFE_TILES.includes(tile)
}

/**
 * Relative progress (0..57) of a position for a color.
 * -1 (base) => -1, ring tiles => (p - start) mod 52,
 * 100..104 => 52..56, 105 => 57.
 */
export function relativeProgress(position: number, color: Color): number {
  if (position === -1) return -1
  if (position === FINISHED) return 57
  if (position >= HOME_BASE) return 52 + (position - HOME_BASE)
  const start = startTile(color)
  return (((position - start) % RING_CELLS) + RING_CELLS) % RING_CELLS
}

/** Can a token in the base leave with this dice? Classic rule: needs a 6. */
export function canEnterBoard(dice: number): boolean {
  return dice === 6
}

/**
 * Destination for a token at `position` rolling `dice` for `color`.
 * Returns the absolute destination (or FINISHED), or null when invalid
 * (overshoot / cannot leave base / already home).
 */
export function destination(position: number, dice: number, color: Color): number | null {
  if (dice < 1 || dice > 6) return null

  if (position === -1) return canEnterBoard(dice) ? startTile(color) : null

  if (position === FINISHED) return null

  const rel = relativeProgress(position, color)
  if (rel < 0) return null

  const newRel = rel + dice
  if (newRel > 57) return null

  if (newRel >= 52) return newRel === 57 ? FINISHED : HOME_BASE + (newRel - 52)

  return (startTile(color) + newRel) % RING_CELLS
}