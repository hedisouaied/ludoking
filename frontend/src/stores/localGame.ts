import { create } from 'zustand'
import { chooseAiMove } from '../game/engine/ai'
import { applyMove, getValidMoves, nextPlayerIndex } from '../game/engine/engine'
import type { Difficulty, GameState, LocalGameConfig, Player, PlayerToken } from '../game/types'
import { COLORS } from '../game/types'
import { sfx } from '../game/utils/sound'

const ROBOT_NAMES = ['Robot Alice', 'Robot Bob', 'Robot Charlie']

const timers: number[] = []
function clearTimers(): void {
  for (const t of timers) clearTimeout(t)
  timers.length = 0
}
function later(fn: () => void, ms: number): void {
  timers.push(window.setTimeout(fn, ms))
}

function thinkDelay(d: Difficulty): number {
  return d === 'easy' ? 550 : d === 'medium' ? 750 : 1000
}
function actDelay(d: Difficulty): number {
  return d === 'easy' ? 700 : d === 'medium' ? 1000 : 1400
}

function describeDestination(to: number): string {
  if (to === 105) return 'all the way home!'
  if (to >= 100) return 'into the home lane'
  if (to === -1) return 'into the base'
  return `to tile ${to + 1}`
}

interface LocalGameStore {
  game: GameState | null
  thinkingPlayerId: string | null
  start: (config: LocalGameConfig) => void
  roll: (forced?: number) => void
  moveToken: (tokenId: string) => void
  reset: () => void
}

export const useLocalGame = create<LocalGameStore>((set, get) => {
  function scheduleRobots(): void {
    const { game, thinkingPlayerId } = get()
    if (!game || game.status !== 'playing') return
    if (thinkingPlayerId !== null) return
    if (game.turnPhase !== 'roll') return
    const cur = game.players.find((p) => p.id === game.currentPlayerId)
    if (!cur || !cur.isRobot) return
    robotTurn(cur)
  }

  function robotTurn(robot: Player): void {
    const d = robot.difficulty ?? 'medium'
    set({ thinkingPlayerId: robot.id })

    later(() => {
      const s = get()
      if (!s.game || s.game.status !== 'playing') return
      if (s.game.currentPlayerId !== robot.id || s.game.turnPhase !== 'roll') return

      s.roll()

      const s2 = get()
      if (s2.game && s2.game.turnPhase === 'move' && s2.game.validMoves.length > 0) {
        later(() => {
          const s3 = get()
          if (!s3.game || s3.game.status !== 'playing') return
          if (s3.game.currentPlayerId !== robot.id || s3.game.turnPhase !== 'move') return
          const choice = chooseAiMove(s3.game.players, robot, s3.game.validMoves)
          if (choice) s3.moveToken(choice.tokenId)
          else set({ thinkingPlayerId: null })
          scheduleRobots()
        }, 500 + actDelay(d))
      } else {
        set({ thinkingPlayerId: null })
        scheduleRobots()
      }
    }, thinkDelay(d))
  }

  return {
    game: null,
    thinkingPlayerId: null,

    start(config) {
      clearTimers()
      let robotIdx = 0

      const players: Player[] = config.players.map((cfg, i) => {
        const robotNumber = robotIdx++
        return {
          id: `p${i}`,
          name: cfg.name || (cfg.isRobot ? ROBOT_NAMES[robotNumber] ?? `Robot ${robotNumber + 1}` : `Player ${i + 1}`),
          color: COLORS[i],
          seat: i,
          isRobot: cfg.isRobot,
          difficulty: cfg.difficulty,
          connected: true,
          tokens: [0, 1, 2, 3].map((n) => ({
            id: `p${i}t${n}`,
            number: n,
            color: COLORS[i],
            position: -1,
            status: 'base' as const,
          })),
        }
      })

      const names = players.map((p) => `${p.name} (${p.color})`).join(', ')
      const game: GameState = {
        status: 'playing',
        turnPhase: 'roll',
        dice: null,
        currentPlayerId: players[0].id,
        currentTurn: 0,
        winnerId: null,
        winnerName: null,
        players,
        validMoves: [],
        log: [`Game started: ${names}`, `${players[0].name} goes first`],
      }

      set({ game, thinkingPlayerId: null })
      scheduleRobots()
    },

    roll(forced) {
      const { game, thinkingPlayerId } = get()
      if (!game || game.status !== 'playing' || game.turnPhase !== 'roll') return

      const player = game.players.find((p) => p.id === game.currentPlayerId)
      if (!player) return
      if (!player.isRobot && thinkingPlayerId !== null) return

      const dice = forced ?? 1 + Math.floor(Math.random() * 6)
      sfx.dice()
      const moves = getValidMoves(game.players, player, dice)

      if (moves.length === 0) {
        const players = game.players
        const idx = players.findIndex((p) => p.id === player.id)
        const next = players[nextPlayerIndex(players, idx)]
        set({
          game: {
            ...game,
            dice,
            turnPhase: 'roll',
            currentTurn: game.currentTurn + 1,
            currentPlayerId: next.id,
            validMoves: [],
            log: [...game.log, `${player.name} rolled ${dice} — no moves`, `Turn passes to ${next.name}`],
          },
        })
        scheduleRobots()
        return
      }

      set({
        game: {
          ...game,
          dice,
          turnPhase: 'move',
          validMoves: moves,
          log: [...game.log, `${player.name} rolled ${dice}`],
        },
      })
    },

    moveToken(tokenId) {
      const { game } = get()
      if (!game || game.status !== 'playing' || game.turnPhase !== 'move') return

      const player = game.players.find((p) => p.id === game.currentPlayerId)
      if (!player) return

      const move = game.validMoves.find((m) => m.tokenId === tokenId)
      if (!move) return

      const result = applyMove(game.players, player, tokenId, move.to)
      const me = result.players.find((p) => p.id === player.id)

      const log = [
        ...game.log,
        `${player.name} ${move.enteredBoard ? 'enters the board' : move.finished ? 'brings a token home' : `moves ${describeDestination(move.to)}`}`,
      ]
      if (result.captured.length > 0) {
        log.push(`${player.name} captured a token of ${result.captured.length} opponent!`)
      }

      if (me && me.tokens.every((t: PlayerToken) => t.status === 'finished')) {
        sfx.win()
        clearTimers()
        set({
          game: {
            ...game,
            players: result.players,
            status: 'finished',
            turnPhase: 'finished',
            dice: null,
            winnerId: me.id,
            winnerName: me.name,
            validMoves: [],
            log: [...log, `${player.name} wins the game!`],
          },
          thinkingPlayerId: null,
        })
        return
      }

      if (result.captured.length > 0) sfx.capture()
      else if (move.finished || move.enteredBoard) sfx.enter()
      else sfx.move()

      const clearRobot = player.isRobot ? { thinkingPlayerId: null } : {}

      if (game.dice === 6) {
        set({
          ...clearRobot,
          game: {
            ...game,
            players: result.players,
            dice: null,
            turnPhase: 'roll',
            currentPlayerId: player.id,
            validMoves: [],
            log: [...log, `${player.name} rolled a 6 — extra turn!`],
          },
        })
        scheduleRobots()
        return
      }

      const players = result.players
      const idx = players.findIndex((p) => p.id === player.id)
      const next = players[nextPlayerIndex(players, idx)]

      set({
        ...clearRobot,
        game: {
          ...game,
          players,
          dice: null,
          turnPhase: 'roll',
          currentTurn: game.currentTurn + 1,
          currentPlayerId: next.id,
          validMoves: [],
          log: [...log, `Turn passes to ${next.name}`],
        },
      })
      scheduleRobots()
    },

    reset() {
      clearTimers()
      set({ game: null, thinkingPlayerId: null })
    },
  }
})