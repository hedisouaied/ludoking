import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Dice } from '../components/Dice'
import { GameLog } from '../components/GameLog'
import { LudoBoard } from '../components/LudoBoard'
import { PlayerList } from '../components/PlayerList'
import { StatusBar } from '../components/StatusBar'
import { WinnerModal } from '../components/WinnerModal'
import type { ApiGame } from '../game/online/snapshot'
import { toGameState } from '../game/online/snapshot'
import type { GameState } from '../game/types'
import { api } from '../services/api'
import { initEcho } from '../services/echo'
import { useAuth } from '../stores/auth'
import { isMuted, setMuted, sfx } from '../game/utils/sound'

export function OnlineGamePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = useAuth((s) => s.user)
  const booted = useAuth((s) => s.booted)
  const init = useAuth((s) => s.init)

  const [game, setGame] = useState<GameState | null>(null)
  const [roomCode, setRoomCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [rolling, setRolling] = useState(false)
  const [flicker, setFlicker] = useState<number | null>(null)
  const [muted, setMutedState] = useState(isMuted())
  const pollRef = useRef<number | null>(null)
  const timerRef = useRef<number | null>(null)

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get<{ game: ApiGame; moves: unknown[] }>(`/games/${id}`)
      setGame(toGameState(data.game))
      setRoomCode(data.game.room_code)
      setError(null)
    } catch (err) {
      setError('Could not load the game.')
      console.error(err)
    }
  }, [id])

  useEffect(() => {
    void init()
  }, [init])

  useEffect(() => {
    void refresh()
    let channel: { listen: (e: string, cb: () => void) => void; leave: () => void } | null = null
    try {
      const echo = initEcho()
      const ch = echo.join(`game.${id}`)
      channel = ch as unknown as { listen: (e: string, cb: () => void) => void; leave: () => void }
      const reload = () => void refresh()
      ch.listen('.dice.rolled', reload)
      ch.listen('.token.moved', reload)
      ch.listen('.token.captured', reload)
      ch.listen('.turn.changed', reload)
      ch.listen('.game.finished', reload)
    } catch (err) {
      console.error('Realtime unavailable, polling instead.', err)
    }
    pollRef.current = window.setInterval(() => {
      void api.post(`/games/${id}/connected`).catch(() => undefined)
      void refresh()
    }, 2500)

    const onUnload = () => {
      void api.post(`/games/${id}/disconnected`).catch(() => undefined)
    }
    window.addEventListener('beforeunload', onUnload)

    return () => {
      if (pollRef.current !== null) window.clearInterval(pollRef.current)
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
      window.removeEventListener('beforeunload', onUnload)
      onUnload()
      try {
        channel?.leave()
      } catch {
        /* noop */
      }
    }
  }, [id, refresh])

  if (booted && !user) return <Navigate to={`/auth/login?next=${encodeURIComponent(`/game/${id}`)}`} replace />

  const myPlayerId = game?.players.find((p) => p.id === String(game.viewerPlayerId))?.id ?? null

  const current = game?.players.find((p) => p.id === game?.currentPlayerId)
  const isMyTurn = game?.currentPlayerId === myPlayerId && game?.status === 'playing'
  const canRoll = Boolean(isMyTurn && game?.turnPhase === 'roll' && !busy && !rolling)
  const movableTokenIds = isMyTurn ? (game?.validMoves ?? []).map((m) => m.tokenId) : []

  const doRoll = useCallback(async () => {
    try {
      sfx.dice()
      const { data } = await api.post<{ game: ApiGame }>(`/games/${id}/roll`)
      setGame(toGameState(data.game))
    } catch (err) {
      console.error(err)
    } finally {
      setBusy(false)
    }
  }, [id])

  const onRollClick = () => {
    if (!canRoll) return
    setBusy(true)
    sfx.dice()
    setRolling(true)
    setFlicker(4)
    let i = 0
    timerRef.current = window.setInterval(() => {
      i++
      setFlicker(1 + Math.floor(Math.random() * 6))
      if (i >= 6) {
        if (timerRef.current !== null) window.clearInterval(timerRef.current)
        setFlicker(null)
        setRolling(false)
        void doRoll()
      }
    }, 92)
  }

  const move = async (tokenId: string) => {
    if (!game) return
    const mv = game.validMoves.find((m) => m.tokenId === tokenId)
    if (!mv) return
    if (game.dice === null) return
    setBusy(true)
    try {
      const { data } = await api.post<{ game: ApiGame }>(`/games/${id}/move`, {
        token_id: Number(tokenId),
        dice: Number(game.dice),
      })
      setGame(toGameState(data.game))
    } catch (err) {
      console.error(err)
    } finally {
      setBusy(false)
    }
  }

  const winner = game?.winnerId ? game.players.find((p) => p.id === game.winnerId) : null

  if (error && !game) {
    return (
      <div className="game-bg">
        <div className="relative z-10 flex min-h-full flex-col items-center justify-center px-6 text-center">
          <p className="text-lg font-bold text-white/90">{error}</p>
          <Link to="/lobby" className="btn-gold mt-4 px-5 py-2.5 text-sm">
            Back to rooms
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="game-bg">
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/lobby"
              className="rounded-full border border-white/40 bg-white/15 px-3.5 py-1.5 text-sm font-bold text-white shadow-sm transition hover:bg-white/25"
            >
              ← Rooms
            </Link>
            <span className="ludo-logo text-2xl leading-none drop-shadow-lg">Ludo</span>
            <span className="hidden items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white/90 sm:flex">
              <span className="h-2 w-2 animate-pulse rounded-full bg-lime-300" />
              Room {roomCode ?? '…'}
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

        {!game ? (
          <p className="mt-20 text-center text-lg font-bold text-white/80">Loading game…</p>
        ) : (
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
            <div className="scene-card mx-auto w-full max-w-[640px] p-3 sm:p-4 lg:mx-0">
              <StatusBar game={game} myPlayerId={myPlayerId} rolling={rolling} />
              <div className="mt-3">
                <LudoBoard game={game} movableTokenIds={movableTokenIds} onTokenClick={movableTokenIds.length ? move : undefined} />
              </div>
              {isMyTurn && game.turnPhase === 'move' && (
                <p className="mt-2 animate-pulse text-center text-sm font-bold text-white/90">Tap a glowing token to move it</p>
              )}
              {game.status === 'playing' && !isMyTurn && (
                <p className="mt-2 text-center text-sm font-semibold text-white/70">Waiting for {current?.name}…</p>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <div className="glass-card p-4">
                <h3 className="mb-2.5 px-1 text-[11px] font-black uppercase tracking-widest text-slate-500">Players</h3>
                <PlayerList game={game} myPlayerId={myPlayerId} />
              </div>

              <div className="glass-card flex flex-col items-center gap-3 p-5">
                {game.status === 'finished' ? (
                  <p className="text-center text-2xl font-black text-slate-700">🏆 {winner?.name} wins!</p>
                ) : isMyTurn ? (
                  <>
                    <Dice
                      value={rolling ? flicker : game.dice}
                      rolling={rolling}
                      size={96}
                      disabled={!canRoll && !rolling}
                      onClick={onRollClick}
                    />
                    {canRoll ? (
                      <button type="button" className="btn-gold w-full py-3.5 text-xl tracking-wide" onClick={onRollClick} disabled={rolling}>
                        🎲 ROLL
                      </button>
                    ) : game.turnPhase === 'move' ? (
                      <p className="text-sm font-bold text-sky-900/75">Rolled a {game.dice} — pick a token on the board.</p>
                    ) : (
                      <p className="text-sm font-bold text-sky-900/75">Waiting…</p>
                    )}
                  </>
                ) : (
                  <>
                    <Dice value={game.dice} size={96} disabled />
                    <p className="text-sm font-bold text-sky-900/75">
                      {current?.isRobot ? `🤖 ${current.name} is playing…` : `Waiting for ${current?.name}…`}
                    </p>
                  </>
                )}
              </div>

              <div className="glass-card p-4">
                <h3 className="mb-2.5 px-1 text-[11px] font-black uppercase tracking-widest text-slate-500">Game log</h3>
                <GameLog entries={game.log} />
              </div>
            </div>
          </div>
        )}
      </div>

      {game?.status === 'finished' && winner && (
        <WinnerModal
          winnerName={winner.name}
          subtitle={game.winnerId === myPlayerId ? 'You won! 🎉' : 'Better luck next time.'}
          onPlayAgain={() => navigate('/lobby', { replace: true })}
          onHome={() => navigate('/lobby', { replace: true })}
        />
      )}
    </div>
  )
}