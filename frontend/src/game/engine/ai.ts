import type { Player, ValidMove } from '../types'
import { isSafe, relativeProgress, RING_CELLS } from './board'

/**
 * Score a move from the moving player's perspective (higher is better).
 * Mirrors LudoAIService::evaluateMove in the Laravel backend.
 */
export function evaluateMove(players: Player[], player: Player, move: ValidMove): number {
  const { to, from, captures } = move
  let score = 0

  if (captures.length > 0) score += 60 * captures.length
  if (move.finished) score += 50
  if (move.enteredBoard) score += 25

  const rel = relativeProgress(to, player.color)
  score += Math.max(0, rel) * 4

  if (to >= 0 && to < RING_CELLS && isSafe(to)) score += 12

  // Risk: how many opponent tokens could capture this tile on their next roll.
  if (to >= 0 && to < RING_CELLS) {
    let threats = 0
    for (const opponent of players) {
      if (opponent.id === player.id) continue
      for (const ot of opponent.tokens) {
        const p = ot.position
        if (p < 0 || p >= RING_CELLS || ot.status === 'finished') continue
        const distance = (((to - p) % RING_CELLS) + RING_CELLS) % RING_CELLS
        if (distance >= 1 && distance <= 6 && !isSafe(to)) threats++
      }
    }
    score -= Math.max(0, threats) * 18
  }

  // Discourage splitting a stacked pair, leaving the trailing token exposed.
  const ownOnTile = player.tokens.filter((t) => t.position === to && t.id !== move.tokenId).length
  const ownOnFrom = player.tokens.filter((t) => t.position === from).length
  if (ownOnFrom >= 2 && ownOnTile === 0) score -= 6

  return score
}

/** Choose a move for the AI based on difficulty. Mirrors the backend service. */
export function chooseAiMove(players: Player[], player: Player, moves: ValidMove[]): ValidMove | null {
  if (moves.length === 0) return null

  const difficulty = player.difficulty ?? 'medium'

  if (difficulty === 'easy') return moves[Math.floor(Math.random() * moves.length)]

  const scored = moves.map((m) => ({ move: m, score: evaluateMove(players, player, m) }))

  if (difficulty === 'medium') {
    const weights = scored.map((s) => Math.max(1, s.score - moves.length * 2))
    const total = weights.reduce((a, b) => a + b, 0)
    let roll = Math.random() * Math.max(1, total)
    let acc = 0
    for (let i = 0; i < scored.length; i++) {
      acc += weights[i]
      if (roll <= acc) return scored[i].move
    }
    return moves[Math.floor(Math.random() * moves.length)]
  }

  scored.sort((a, b) => b.score - a.score)
  const best = scored[0].score
  const near = scored.filter((s) => s.score >= best - 2)
  return near[Math.floor(Math.random() * near.length)].move
}