export type Color = 'red' | 'green' | 'yellow' | 'blue'
export type TokenStatus = 'base' | 'active' | 'home' | 'finished'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type Phase = 'roll' | 'move' | 'finished'

export interface PlayerToken {
  id: string
  number: number
  color: Color
  position: number
  status: TokenStatus
}

export interface Player {
  id: string
  name: string
  username?: string | null
  avatar?: string | null
  color: Color
  seat: number
  isRobot: boolean
  difficulty: Difficulty | null
  connected: boolean
  tokens: PlayerToken[]
}

export interface ValidMove {
  tokenId: string
  from: number
  to: number
  captures: string[]
  finished: boolean
  enteredBoard: boolean
}

export interface GameState {
  status: string
  turnPhase: Phase
  dice: number | null
  currentPlayerId: string | null
  currentTurn: number
  winnerId: string | null
  winnerName?: string | null
  players: Player[]
  validMoves: ValidMove[]
  log: string[]
  viewerPlayerId?: number | null
}

export interface LocalPlayerConfig {
  name: string
  isRobot: boolean
  difficulty: Difficulty | null
}

export interface LocalGameConfig {
  players: LocalPlayerConfig[]
}

export const COLORS: Color[] = ['red', 'green', 'yellow', 'blue']

export const COLOR_NAME: Record<Color, string> = {
  red: 'Red',
  green: 'Green',
  yellow: 'Yellow',
  blue: 'Blue',
}