import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import type { ApiRoom } from '../game/online/snapshot'
import type { Difficulty } from '../game/types'
import { api } from '../services/api'
import { initEcho } from '../services/echo'
import { useAuth } from '../stores/auth'
import { sfx } from '../game/utils/sound'

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

export function LobbyPage() {
  const { code } = useParams()
  return code ? <RoomView key={code} code={code} /> : <CreateJoin />
}

function CreateJoin() {
  const navigate = useNavigate()
  const user = useAuth((s) => s.user)
  const booted = useAuth((s) => s.booted)
  const init = useAuth((s) => s.init)

  const [maxPlayers, setMaxPlayers] = useState(4)
  const [robots, setRobots] = useState(0)
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [joinCode, setJoinCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void init()
  }, [init])

  if (booted && !user) return <Navigate to="/auth/login?next=/lobby" replace />

  const create = async () => {
    setBusy(true)
    setError(null)
    try {
      const { data } = await api.post<{ room: ApiRoom }>('/rooms', {
        max_players: maxPlayers,
        robot_count: robots,
        robot_difficulty: robots > 0 ? difficulty : null,
      })
      sfx.click()
      navigate(`/lobby/${data.room.code}`)
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Could not create the room.'
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  const join = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { data } = await api.post<{ room: ApiRoom }>('/rooms/join', { code: joinCode.trim().toUpperCase() })
      sfx.click()
      navigate(`/lobby/${data.room.code}`)
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response
      setError(msg?.data?.message ?? Object.values(msg?.data?.errors ?? {}).flat()[0] ?? 'Could not join the room.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-6 py-10">
      <div className="flex items-center justify-between">
        <Link to="/" className="text-sm font-semibold text-stone-400 transition hover:text-amber-300">
          ← Menu
        </Link>
        <span className="ludo-logo text-xl">Online rooms</span>
        <span className="w-14" />
      </div>

      <div className="card-ludo mt-8 w-full p-7">
        <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-stone-400">Create a room</h2>
            <label className="mb-1 block text-xs font-semibold text-stone-400">Players</label>
            <div className="mb-4 grid grid-cols-3 gap-2">
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={robots >= n}
                  onClick={() => setMaxPlayers(n)}
                  className={`rounded-xl border px-3 py-2.5 font-extrabold transition disabled:opacity-30 ${
                    maxPlayers === n ? 'border-amber-300 bg-amber-300/15 text-amber-200' : 'border-white/10 bg-white/5 text-stone-300 hover:bg-white/10'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <label className="mb-1 block text-xs font-semibold text-stone-400">Computer players</label>
            <div className="mb-4 grid grid-cols-5 gap-2">
              {[0, 1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={n >= maxPlayers}
                  onClick={() => setRobots(n)}
                  className={`rounded-xl border px-2 py-2 text-sm font-bold transition disabled:opacity-30 ${
                    robots === n ? 'border-violet-300 bg-violet-300/15 text-violet-200' : 'border-white/10 bg-white/5 text-stone-300 hover:bg-white/10'
                  }`}
                >
                  {n === 0 ? 'none' : n}
                </button>
              ))}
            </div>
            {robots > 0 && (
              <>
                <label className="mb-1 block text-xs font-semibold text-stone-400">Robot difficulty</label>
                <div className="mb-4 grid grid-cols-3 gap-2">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDifficulty(d)}
                      className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${
                        difficulty === d ? 'border-amber-300 bg-amber-300/15 text-amber-200' : 'border-white/10 bg-white/5 text-stone-300 hover:bg-white/10'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </>
            )}
            {error && <p className="mb-3 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</p>}
            <button type="button" disabled={busy} onClick={create} className="btn-primary-ludo w-full px-4 py-3">
              Create room
            </button>
          </div>

          <div className="flex flex-col">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-stone-400">Join a room</h2>
            <form onSubmit={join} className="flex flex-1 flex-col">
              <label className="mb-1 block text-xs font-semibold text-stone-400">Room code</label>
              <input
                className="field-ludo mb-4 font-mono text-lg uppercase tracking-[0.35em]"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
                required
              />
              <button type="submit" disabled={busy || joinCode.length !== 6} className="btn-primary-ludo px-4 py-3">
                Join room
              </button>
            </form>
            <p className="mt-6 text-xs leading-relaxed text-stone-500">
              Rooms are private — share the 6-letter code with friends to play together.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function RoomView({ code }: { code: string }) {
  const navigate = useNavigate()
  const user = useAuth((s) => s.user)
  const booted = useAuth((s) => s.booted)
  const init = useAuth((s) => s.init)

  const [room, setRoom] = useState<ApiRoom | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const pollRef = useRef<number | null>(null)

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get<{ room: ApiRoom }>(`/rooms/${code}`)
      setRoom(data.room)
      setLoading(false)
      return data.room
    } catch {
      setError('Room not found.')
      setLoading(false)
      return null
    }
  }, [code])

  useEffect(() => {
    void init()
  }, [init])

  useEffect(() => {
    void refresh()
    const echo = initEcho()
    const channel = echo.join(`room.${code}`)
    const reload = () => void refresh()
    channel.listen('.player.joined', reload)
    channel.listen('.player.left', reload)
    channel.listen('.player.reconnected', reload)
    pollRef.current = window.setInterval(() => void refresh(), 2500)
    return () => {
      try {
        echo.leave(`presence-room.${code}`)
      } catch {
        /* noop */
      }
      if (pollRef.current !== null) window.clearInterval(pollRef.current)
    }
  }, [code, refresh])

  useEffect(() => {
    if (room && room.game_id && room.status !== 'waiting') navigate(`/game/${room.game_id}`, { replace: true })
  }, [room, navigate])

  if (booted && !user) return <Navigate to="/auth/login?next=/lobby" replace />

  const isHost = user && room && room.host_id === user.id
  const humans = (room?.slots ?? []).filter((s) => s.filled && !s.player?.is_robot).length
  const canStart = room && room.slots.filter((s) => s.filled).length >= 2 && isHost && room.status === 'waiting'

  const startGame = async () => {
    if (!room) return
    setError(null)
    try {
      const { data } = await api.post<{ game: { id: number; room_code: string | null } }>(`/rooms/${room.id}/start`)
      sfx.dice()
      navigate(`/game/${data.game.id}`, { replace: true })
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Could not start.'
      setError(msg)
    }
  }

  const leave = async () => {
    if (!room) return navigate('/lobby')
    try {
      await api.post(`/rooms/${room.id}/leave`)
    } catch {
      /* ignore */
    }
    navigate('/lobby')
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-xl flex-col px-6 py-10">
      <div className="flex items-center justify-between">
        <Link to="/lobby" className="text-sm font-semibold text-stone-400 transition hover:text-amber-300">
          ← Rooms
        </Link>
        <span className="ludo-logo text-xl">Lobby</span>
        <button type="button" onClick={leave} className="text-sm font-semibold text-stone-400 transition hover:text-red-300">
          Leave
        </button>
      </div>

      {loading && <p className="mt-8 text-center text-stone-500">Loading room…</p>}
      {error && <p className="mt-8 text-center text-red-300">{error}</p>}

      {room && (
        <div className="card-ludo mt-8 w-full p-7">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">Room code</p>
              <p className="font-mono text-4xl font-extrabold tracking-[0.3em] text-amber-300">{room.code}</p>
            </div>
            <span className="chip bg-emerald-500/15 text-emerald-300">{humans}/{room.max_players - room.robot_count} humans</span>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            {room.slots.map((slot) => {
              const occupied = Boolean(slot.player)
              const robot = slot.player?.is_robot
              const you = slot.player?.id === user?.id
              return (
                <div
                  key={slot.seat}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
                    occupied ? 'border-white/10 bg-white/5' : 'border-dashed border-white/15 bg-white/[0.02]'
                  }`}
                >
                  <span
                    className="h-4 w-4 shrink-0 rounded-full border-2 border-white/60"
                    style={{ background: occupied ? slot.player!.color : 'transparent' }}
                  />
                  <div className="flex-1 text-sm">
                    {occupied ? (
                      <span className="font-semibold text-stone-100">
                        {robot ? slot.player!.name : slot.player!.name}
                        {you && <span className="ml-2 chip bg-amber-400/90 text-amber-950">you</span>}
                      </span>
                    ) : (
                      <span className="text-stone-500">Waiting for player…</span>
                    )}
                  </div>
                  {robot && (
                    <span className="chip bg-violet-500/20 text-violet-200">{slot.player!.robot_difficulty}</span>
                  )}
                </div>
              )
            })}
          </div>

          {error && <p className="mt-4 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</p>}

          <button
            type="button"
            disabled={!canStart}
            onClick={startGame}
            className="btn-primary-ludo mt-6 w-full px-4 py-4 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isHost ? (canStart ? 'Start game' : 'Waiting for players…') : 'Waiting for the host to start…'}
          </button>

          <p className="mt-3 text-center text-xs text-stone-500">Share the code with friends to invite them.</p>
        </div>
      )}
    </div>
  )
}