import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../stores/auth'
import { sfx } from '../game/utils/sound'

export function AuthPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { mode: modeParam } = useParams()
  const mode = modeParam === 'register' ? 'register' : 'login'
  const next = params.get('next') ?? '/lobby'

  const user = useAuth((s) => s.user)
  const login = useAuth((s) => s.login)
  const register = useAuth((s) => s.register)

  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (user) navigate(next, { replace: true })
  }, [user, next, navigate])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (mode === 'register' && password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'login') await login(email.trim(), password)
      else
        await register({
          name: name.trim(),
          username: username.trim(),
          email: email.trim(),
          password,
          password_confirmation: confirm,
        })
      sfx.win()
      navigate(next, { replace: true })
    } catch (err) {
      const detail = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response
      const msg =
        detail?.data?.message ??
        Object.values(detail?.data?.errors ?? {}).flat()[0] ??
        'Something went wrong. Try again.'
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col items-center justify-center px-6 py-10">
      <Link to="/" className="ludo-logo text-2xl">
        LODO
      </Link>
      <div className="card-ludo mt-6 w-full p-7">
        <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-black/25 p-1">
          <Link
            to="/auth/login"
            className={`rounded-lg px-3 py-2 text-center text-sm font-bold transition ${
              mode === 'login' ? 'bg-amber-400 text-amber-950' : 'text-stone-300 hover:bg-white/5'
            }`}
          >
            Login
          </Link>
          <Link
            to="/auth/register"
            className={`rounded-lg px-3 py-2 text-center text-sm font-bold transition ${
              mode === 'register' ? 'bg-amber-400 text-amber-950' : 'text-stone-300 hover:bg-white/5'
            }`}
          >
            Register
          </Link>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          {mode === 'register' && (
            <>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-stone-400">Name</span>
                <input className="field-ludo" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your name" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-stone-400">Username</span>
                <input className="field-ludo" value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="gamer_tag" />
              </label>
            </>
          )}
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-stone-400">Email</span>
            <input
              className="field-ludo"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-stone-400">Password</span>
            <input
              className="field-ludo"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={8}
            />
          </label>
          {mode === 'register' && (
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-stone-400">Confirm password</span>
              <input
                className="field-ludo"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                placeholder="••••••••"
                minLength={8}
              />
            </label>
          )}

          {error && <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</p>}

          <button type="submit" disabled={busy} className="btn-primary-ludo px-4 py-3">
            {busy ? 'Please wait…' : mode === 'login' ? 'Login' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  )
}