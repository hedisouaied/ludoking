import type { CSSProperties } from 'react'
import { COLOR_NAME } from '../game/types'
import type { GameState } from '../game/types'

const C: Record<string, string> = { red: '#ff4d4f', green: '#00c853', yellow: '#ffc400', blue: '#2b7fff' }
const CD: Record<string, string> = { red: '#d62828', green: '#0a9e4e', yellow: '#e6a700', blue: '#1a5fd0' }

interface PlayerListProps {
  game: GameState
  myPlayerId?: string | null
  thinkingPlayerId?: string | null
}

function Avatar({ color, seat, active }: { color: string; seat: number; active: boolean }) {
  return (
    <div
      className="relative h-11 w-11 shrink-0 rounded-full border-[3px] border-white shadow-md"
      style={{
        background: `radial-gradient(circle at 32% 26%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 30%), radial-gradient(circle at 32% 22%, ${C[color]} 0%, ${CD[color]} 90%)`,
        boxShadow: active ? '0 0 0 3px rgba(255,255,255,0.85), 0 8px 18px rgba(2,32,59,0.4)' : undefined,
      }}
    >
      <span
        className="absolute inset-0 grid place-items-center text-sm font-extrabold drop-shadow"
        style={{ color: color === 'yellow' ? '#5d3a02' : '#ffffff' }}
      >
        {seat}
      </span>
    </div>
  )
}

function HomeDots({ color, finished }: { color: string; finished: number }) {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full transition-colors"
          style={{ background: i < finished ? C[color] : '#e2e8f0', boxShadow: i < finished ? '0 1px 2px rgba(2,32,59,0.35)' : undefined }}
        />
      ))}
    </div>
  )
}

export function PlayerList({ game, myPlayerId, thinkingPlayerId }: PlayerListProps) {
  const winner = game.winnerId

  return (
    <ul className="grid grid-cols-1 gap-2.5">
      {game.players.map((p) => {
        const active = game.currentPlayerId === p.id && game.status === 'playing'
        const thinking = thinkingPlayerId === p.id
        const finished = p.tokens.filter((t) => t.status === 'finished').length
        return (
          <li
            key={p.id}
            className={`relative flex items-center gap-3 rounded-2xl border-2 bg-white px-3 py-2.5 shadow-sm transition-all ${
              active ? 'border-[color:var(--pc)] ring-4 ring-[color:var(--pc)]/25' : 'border-stone-100 shadow-sm'
            }`}
            style={{ '--pc': C[p.color], transform: active ? 'scale(1.015)' : undefined } as CSSProperties}
          >
            <Avatar color={p.color} seat={p.seat} active={active} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-extrabold text-slate-800">{p.name}</span>
                {myPlayerId === p.id && (
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">You</span>
                )}
                {p.isRobot && (
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-600">
                    Robot · {p.difficulty ?? 'medium'}
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {COLOR_NAME[p.color]}
                </span>
                <HomeDots color={p.color} finished={finished} />
                {thinking && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-amber-500">
                    <span className="inline-block h-1.5 w-1.5 animate-ping rounded-full bg-amber-400" />
                    thinking…
                  </span>
                )}
              </div>
            </div>
            {active && !winner && (
              <span className="chip bg-gradient-to-b from-amber-300 to-amber-400 text-amber-900 shadow-[0_2px_0_#b45309]">
                TURN
              </span>
            )}
            {winner === p.id && (
              <span className="chip bg-gradient-to-b from-green-400 to-green-500 text-white shadow-[0_2px_0_#15803d]">
                WINNER
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}