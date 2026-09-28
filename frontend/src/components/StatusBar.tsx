import type { GameState } from '../game/types'

const CD: Record<string, string> = { red: '#e04343', green: '#06a34a', yellow: '#f0a500', blue: '#1a5fd0' }
const NAME: Record<string, string> = { red: 'Red', green: 'Green', yellow: 'Yellow', blue: 'Blue' }

interface StatusBarProps {
  game: GameState
  myPlayerId?: string | null
  thinkingPlayerId?: string | null
  rolling?: boolean
}

export function StatusBar({ game, myPlayerId, thinkingPlayerId, rolling }: StatusBarProps) {
  const current = game.players.find((p) => p.id === game.currentPlayerId)
  const color = current?.color ?? 'blue'
  const me = myPlayerId != null && current?.id === myPlayerId
  const isMyTurn = me && game.status === 'playing'

  let status: string
  if (game.status === 'finished') {
    status = game.winnerId !== null ? `${NAME[current?.color ?? 'blue']} wins! 🏆` : 'Game over.'
  } else if (rolling) {
    status = 'Rolling…'
  } else if (thinkingPlayerId !== null) {
    status = `${NAME[color]} is thinking…`
  } else if (current?.isRobot) {
    status = `🤖 ${NAME[color]} is playing…`
  } else if (isMyTurn && game.turnPhase === 'roll') {
    status = 'Roll the dice!'
  } else if (isMyTurn && game.turnPhase === 'move') {
    status = `You rolled ${game.dice} — pick a token!`
  } else {
    status = `Waiting for ${NAME[color]}…`
  }

  return (
    <div
      className="pop-in flex items-center gap-3 rounded-2xl px-4 py-2.5 text-white shadow-[0_10px_24px_rgba(3,43,74,0.35)]"
      style={{
        background: `linear-gradient(120deg, ${CD[color]} 0%, ${CD[color]}cc 60%, #123f5e 100%)`,
      }}
    >
      <span
        className="h-9 w-9 shrink-0 rounded-full border-2 border-white/80 shadow-inner"
        style={{
          background:
            current && !current.isRobot
              ? `radial-gradient(circle at 34% 28%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 28%), ${CD[color]}`
              : 'radial-gradient(circle at 34% 28%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 28%), #64748b',
        }}
      >
        {current?.isRobot && (
          <span className="grid h-full w-full place-items-center text-sm font-black text-white/80">🤖</span>
        )}
      </span>
      <div className="min-w-0 leading-tight">
        <div className="truncate text-sm font-extrabold">
          {current ? NAME[color] : '…'}
          {me && <span className="ml-1.5 rounded-full bg-white/25 px-1.5 py-0.5 text-[10px] font-black">YOU</span>}
        </div>
        <div className="truncate text-xs font-semibold text-white/85">{status}</div>
      </div>
      {game.status === 'playing' && (
        <span className="ml-auto h-2.5 w-2.5 shrink-0 animate-ping rounded-full bg-white/90" />
      )}
    </div>
  )
}

export default StatusBar