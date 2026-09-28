import type { Player, PlayerToken, ValidMove } from '../types'
import { destination, FINISHED, isSafe, RING_CELLS } from './board'

/** Opponent tokens currently sitting on a ring tile (non-safe) that a move would capture. */
export function tokensAtTile(players: Player[], moverPlayerId: string, tile: number): PlayerToken[] {
  if (tile < 0 || tile >= RING_CELLS || isSafe(tile)) return []
  return players
    .filter((p) => p.id !== moverPlayerId)
    .flatMap((p) => p.tokens)
    .filter((t) => t.position === tile)
}

/** All legal moves for the given player with the rolled dice value. */
export function getValidMoves(players: Player[], player: Player, dice: number): ValidMove[] {
  const moves: ValidMove[] = []
  for (const token of player.tokens) {
    if (token.status === 'finished') continue
    const to = destination(token.position, dice, player.color)
    if (to === null) continue
    moves.push({
      tokenId: token.id,
      from: token.position,
      to,
      captures: tokensAtTile(players, player.id, to).map((t) => t.id),
      finished: to === FINISHED,
      enteredBoard: token.position === -1,
    })
  }
  return moves
}

/** Index of the next seat (clockwise) that still has unfinished tokens. */
export function nextPlayerIndex(players: Player[], currentIndex: number): number {
  for (let i = 1; i <= players.length; i++) {
    const candidate = players[(currentIndex + i) % players.length]
    if (candidate.tokens.some((t) => t.status !== 'finished')) return (currentIndex + i) % players.length
  }
  return currentIndex
}

export interface MoveResult {
  players: Player[]
  captured: PlayerToken[]
  finishedToken: boolean
}

/**
 * Apply a validated move. Pure: returns a new players array, never mutates.
 */
export function applyMove(players: Player[], player: Player, tokenId: string, to: number): MoveResult {
  const token = player.tokens.find((t) => t.id === tokenId)
  if (!token) throw new Error('Token not found')

  const landedOn = tokensAtTile(players, player.id, to)
  const capturedTokens = new Set(landedOn.map((t) => t.id))

  const nextPlayers = players.map((p) => {
    if (p.id === player.id) {
      const tokens = p.tokens.map((t) => {
        if (t.id !== tokenId) return t
        const status = to === FINISHED ? 'finished' as const : to >= 100 ? 'home' as const : 'active' as const
        return { ...t, position: to, status }
      })
      return { ...p, tokens }
    }
    if (capturedTokens.size === 0) return p
    const tokens = p.tokens.map((t) =>
      capturedTokens.has(t.id) ? { ...t, position: -1, status: 'base' as const } : t,
    )
    return { ...p, tokens }
  })

  return { players: nextPlayers, captured: landedOn, finishedToken: token.status !== 'finished' && to === FINISHED }
}

/**
 * Sequence of absolute positions a token passes through when moving from
 * `from` to `to` (for stepping animation on the board).
 */
export function moveWaypoints(color: Player['color'], from: number, to: number): number[] {
  if (from === -1) return [to]
  if (to === -1) return [to] // captured straight back to base
  const steps: number[] = []
  let cur = from
  let guard = 0
  while (cur !== to && guard++ < 60) {
    const next = destination(cur, 1, color)
    if (next === null) break
    cur = next
    steps.push(cur)
  }
  return steps
}