import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import type { Difficulty, LocalGameConfig } from '../game/types'
import { useLocalGame } from '../stores/localGame'
import { sfx } from '../game/utils/sound'

const DIFFICULTIES: Array<{ value: Difficulty; label: string }> = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
]

export function LocalSetup() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const start = useLocalGame((s) => s.start)

  const initialMode = params.get('mode') === 'robots' ? 'robots' : 'hotseat'
  const [mode, setMode] = useState<'hotseat' | 'robots'>(initialMode)
  const [count, setCount] = useState(3)
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [names, setNames] = useState<string[]>(['', '', '', ''])

  const humans = mode === 'hotseat' ? count : count
  const total = mode === 'hotseat' ? count : 4

  const begin = () => {
    sfx.click()
    const config: LocalGameConfig = {
      players: Array.from({ length: total }, (_, i) => {
        const isRobot = mode === 'robots' && i >= humans
        return {
          name: isRobot ? '' : names[i].trim() || `Player ${i + 1}`,
          isRobot,
          difficulty: isRobot ? difficulty : null,
        }
      }),
    }
    start(config)
    navigate('/play')
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col items-center px-6 py-10">
      <div className="flex w-full items-center justify-between">
        <Link to="/" className="text-sm font-semibold text-stone-400 transition hover:text-amber-300">
          ← Menu
        </Link>
        <span className="ludo-logo text-xl">New local game</span>
        <span className="w-14" />
      </div>

      <div className="card-ludo mt-8 w-full p-7">
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-black/25 p-1">
          {(['hotseat', 'robots'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-lg px-3 py-2.5 text-sm font-bold transition ${
                mode === m ? 'bg-amber-400 text-amber-950' : 'text-stone-300 hover:bg-white/5'
              }`}
            >
              {m === 'hotseat' ? 'Hot-seat' : 'vs Robots'}
            </button>
          ))}
        </div>

        {mode === 'hotseat' ? (
          <div className="mt-6">
            <label className="mb-2 block text-sm font-semibold text-stone-300">Number of players</label>
            <div className="grid grid-cols-3 gap-2">
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCount(n)}
                  className={`rounded-xl border px-3 py-3 text-lg font-extrabold transition ${
                    count === n ? 'border-amber-300 bg-amber-300/15 text-amber-200' : 'border-white/10 bg-white/5 text-stone-300 hover:bg-white/10'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-6">
            <label className="mb-2 block text-sm font-semibold text-stone-300">
              How many humans join in? (robots fill the rest)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCount(n)}
                  className={`rounded-xl border px-3 py-3 text-lg font-extrabold transition ${
                    count === n ? 'border-amber-300 bg-amber-300/15 text-amber-200' : 'border-white/10 bg-white/5 text-stone-300 hover:bg-white/10'
                  }`}
                >
                  {n} + {4 - n} robots
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === 'hotseat' && (
          <div className="mt-6">
            <label className="mb-2 block text-sm font-semibold text-stone-300">Names (optional)</label>
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: count }, (_, i) => (
                <input
                  key={i}
                  className="field-ludo"
                  placeholder={`Player ${i + 1}`}
                  value={names[i]}
                  onChange={(e) => {
                    const next = [...names]
                    next[i] = e.target.value
                    setNames(next)
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {(mode === 'robots' || (mode === 'hotseat' && false)) && (
          <div className="mt-6">
            <label className="mb-2 block text-sm font-semibold text-stone-300">Robot difficulty</label>
            <div className="grid grid-cols-3 gap-2">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDifficulty(d.value)}
                  className={`rounded-xl border px-3 py-3 font-bold transition ${
                    difficulty === d.value ? 'border-amber-300 bg-amber-300/15 text-amber-200' : 'border-white/10 bg-white/5 text-stone-300 hover:bg-white/10'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <button type="button" onClick={begin} className="btn-primary-ludo mt-7 w-full px-4 py-4 text-lg">
          Start game
        </button>
      </div>
    </div>
  )
}