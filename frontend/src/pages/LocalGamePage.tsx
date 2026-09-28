import { useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Dice } from '../components/Dice'
import { GameLog } from '../components/GameLog'
import { LudoBoard } from '../components/LudoBoard'
import { PlayerList } from '../components/PlayerList'
import { StatusBar } from '../components/StatusBar'
import { WinnerModal } from '../components/WinnerModal'
import { useLocalGame } from '../stores/localGame'
import { isMuted, setMuted, sfx } from '../game/utils/sound'

export function LocalGamePage() {
  const navigate = useNavigate()
  const game = useLocalGame((s) => s.game)
  const thinkingPlayerId = useLocalGame((s) => s.thinkingPlayerId)
  const roll = useLocalGame((s) => s.roll)
  const moveToken = useLocalGame((s) => s.moveToken)
  const reset = useLocalGame((s) => s.reset)

  const [muted, setMutedState] = useState(isMuted())
  const [rolling, setRolling] = useState(false)
  const [flicker, setFlicker] = useState<number | null>(null)
  const rollTimerRef = useRef<number | null>(null)

  if (!game) return <Navigate to="/local" replace />

  const current = game.players.find((p) => p.id === game.currentPlayerId)
  const isRobotTurn = Boolean(current?.isRobot) || thinkingPlayerId !== null
  const canRoll = game.turnPhase === 'roll' && !isRobotTurn && game.status === 'playing' && !rolling
  const movableTokenIds = game.turnPhase === 'move' && !isRobotTurn ? game.validMoves.map((m) => m.tokenId) : []

  const onRoll = () => {
    if (!canRoll) return
    sfx.dice()
    setRolling(true)
    let i = 0
    setFlicker(4)
    rollTimerRef.current = window.setInterval(() => {
      i++
      setFlicker(1 + Math.floor(Math.random() * 6))
      if (i >= 6) {
        if (rollTimerRef.current !== null) window.clearInterval(rollTimerRef.current)
        setFlicker(null)
        setRolling(false)
        roll()
      }
    }, 92)
  }

  const onTokenClick = (tokenId: string) => {
    if (!movableTokenIds.includes(tokenId)) return
    moveToken(tokenId)
  }

  const winner = game.winnerId ? game.players.find((p) => p.id === game.winnerId) : null

  return (
    <div className="game-bg">
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="rounded-full border border-white/40 bg-white/15 px-3.5 py-1.5 text-sm font-bold text-white shadow-sm transition hover:bg-white/25"
            >
              ← Menu
            </Link>
            <span className="ludo-logo text-2xl leading-none drop-shadow-lg">Ludo</span>
            <span className="hidden rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white/90 sm:inline">
              Local game
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = !muted
              setMuted(next)
              setMutedState(next)
            }}
            className="h-10 w-10 rounded-full border border-white/40 bg-white/15 text-base text-white shadow-sm transition hover:bg-white/25"
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </header>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
          <div className="scene-card mx-auto w-full max-w-[640px] p-3 sm:p-4 lg:mx-0">
            <StatusBar game={game} thinkingPlayerId={thinkingPlayerId} rolling={rolling} />
            <div className="mt-3">
              <LudoBoard game={game} movableTokenIds={movableTokenIds} onTokenClick={onTokenClick} />
            </div>
            {game.turnPhase === 'move' && !isRobotTurn && (
              <p className="mt-2 animate-pulse text-center text-sm font-bold text-white/90">
                Tap a glowing token to move it
              </p>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div className="glass-card p-4">
              <h3 className="mb-2.5 px-1 text-[11px] font-black uppercase tracking-widest text-slate-500">Players</h3>
              <PlayerList game={game} thinkingPlayerId={thinkingPlayerId} />
            </div>

            <div className="glass-card flex flex-col items-center gap-3 p-5">
              {game.status === 'finished' ? (
                <p className="text-center text-2xl font-black text-slate-700">🏆 {winner?.name} wins!</p>
              ) : (
                <>
                  <Dice
                    value={rolling ? flicker : game.dice}
                    rolling={rolling}
                    size={96}
                    disabled={!canRoll && !rolling}
                    onClick={onRoll}
                  />
                  {canRoll ? (
                    <button
                      type="button"
                      className="btn-gold w-full py-3.5 text-xl tracking-wide"
                      onClick={onRoll}
                      disabled={rolling}
                    >
                      🎲 ROLL
                    </button>
                  ) : isRobotTurn || current?.isRobot ? (
                    <p className="text-sm font-bold text-sky-900/75">🤖 {current?.name} is playing…</p>
                  ) : game.turnPhase === 'move' ? (
                    <p className="text-sm font-bold text-sky-900/75">Rolled a {game.dice} — pick a token on the board.</p>
                  ) : (
                    <p className="text-sm font-bold text-sky-900/75">Waiting…</p>
                  )}
                </>
              )}
            </div>

            <div className="glass-card p-4">
              <h3 className="mb-2.5 px-1 text-[11px] font-black uppercase tracking-widest text-slate-500">Game log</h3>
              <GameLog entries={game.log} />
            </div>
          </div>
        </div>
      </div>

      {game.status === 'finished' && winner && (
        <WinnerModal
          winnerName={winner.name}
          subtitle="Well played!"
          onPlayAgain={() => {
            reset()
            navigate('/local', { replace: true })
          }}
          onHome={() => {
            reset()
            navigate('/')
          }}
        />
      )}
    </div>
  )
}