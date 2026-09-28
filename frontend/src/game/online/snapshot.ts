import type { Color, Difficulty, GameState, Player, TokenStatus, ValidMove } from '../types'

export interface AuthUser {
  id: number
  name: string
  username: string | null
  email: string
  avatar: string | null
}

export interface ApiToken {
  id: number
  token_number: number
  position: number
  status: string
}

export interface ApiPlayer {
  id: number
  user_id: number | null
  name: string
  username: string | null
  avatar: string | null
  is_robot: boolean
  robot_difficulty: string | null
  color: string
  seat: number
  connected: boolean
  tokens: ApiToken[]
}

export interface ApiValidMove {
  token_id: number
  from: number
  to: number
  captures: number[]
  finished: boolean
  entered_board: boolean
}

export interface ApiGame {
  id: number
  room_id: number | null
  room_code: string | null
  status: string
  current_turn: number
  current_player_id: number | null
  turn_phase: string
  turn_started_at: string | null
  dice_value: number | null
  winner_id: number | null
  created_at: string | null
  viewer_player_id: number | null
  valid_moves: ApiValidMove[]
  players: ApiPlayer[]
}

export interface ApiRoomSlot {
  seat: number
  filled: boolean
  player: {
    id: number
    user_id: number | null
    name: string
    is_robot: boolean
    robot_difficulty: string | null
    color: string
    seat: number
    connected: boolean
  } | null
}

export interface ApiRoom {
  id: number
  code: string
  host_id: number
  status: string
  max_players: number
  robot_count: number
  robot_difficulty: string | null
  started_at: string | null
  game_id: number | null
  slots: ApiRoomSlot[]
}

const STATUS_MAP: Record<string, TokenStatus> = {
  base: 'base',
  active: 'active',
  home: 'home',
  finished: 'finished',
}

/** Convert the server snapshot into the client-side GameState used by the UI. */
export function toGameState(api: ApiGame): GameState {
  const players: Player[] = api.players.map((p) => ({
    id: String(p.id),
    name: p.name,
    username: p.username,
    avatar: p.avatar,
    color: (p.color as Color) ?? 'red',
    seat: p.seat,
    isRobot: p.is_robot,
    difficulty: (p.robot_difficulty as Difficulty) || null,
    connected: p.connected,
    tokens: p.tokens.map((t) => ({
      id: String(t.id),
      number: t.token_number,
      color: (p.color as Color) ?? 'red',
      position: t.position,
      status: STATUS_MAP[t.status] ?? 'base',
    })),
  }))

  const validMoves: ValidMove[] = api.valid_moves.map((m) => ({
    tokenId: String(m.token_id),
    from: m.from,
    to: m.to,
    captures: m.captures.map(String),
    finished: m.finished,
    enteredBoard: m.entered_board,
  }))

  return {
    status: api.status,
    turnPhase: api.status === 'finished' ? 'finished' : api.turn_phase === 'move' ? 'move' : 'roll',
    dice: api.dice_value,
    currentPlayerId: api.current_player_id != null ? String(api.current_player_id) : null,
    currentTurn: api.current_turn,
    winnerId: api.winner_id != null ? String(api.winner_id) : null,
    winnerName: api.winner_id != null ? players.find((p) => p.id === String(api.winner_id))?.name ?? null : null,
    viewerPlayerId: api.viewer_player_id,
    players,
    validMoves,
    log: [],
  }
}