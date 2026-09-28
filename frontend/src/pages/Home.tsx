import { Link } from 'react-router-dom'
import { Dice } from '../components/Dice'
import { useAuth } from '../stores/auth'

export function Home() {
  const user = useAuth((s) => s.user)

  return (
    <div className="flex min-h-full flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <Link to="/" className="ludo-logo text-2xl">
          LODO
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to="/rules"
            className="rounded-xl border border-white/12 bg-white/5 px-4 py-2 text-sm font-semibold text-stone-200 transition hover:bg-white/10"
          >
            Rules
          </Link>
          {user ? (
            <span className="chip bg-amber-400/15 text-amber-200">{user.name}</span>
          ) : (
            <Link to="/auth/login" className="btn-primary-ludo px-4 py-2 text-sm">
              Sign in
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-10 text-center">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-4 py-1 text-xs font-semibold tracking-wide text-amber-200">
          Roll · Capture · Race home
        </div>
        <div className="mt-4 flex items-center gap-4">
          <div className="hidden rotate-[-8deg] opacity-90 sm:block">
            <Dice value={6} size={64} />
          </div>
          <h1 className="ludo-logo text-5xl font-extrabold sm:text-7xl">LODO</h1>
          <div className="hidden rotate-[8deg] opacity-90 sm:block">
            <Dice value={1} size={64} />
          </div>
        </div>
        <p className="mt-4 max-w-xl text-base text-stone-400 sm:text-lg">
          The classic race to the center. Play locally with friends on one screen, battle our AI
          robots, or challenge others online in private rooms.
        </p>

        <div className="mt-10 grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              href: '/local?mode=hotseat',
              icon: '👥',
              title: 'Local multiplayer',
              blurb: '2–4 players, hot-seat on a single screen.',
            },
            {
              href: '/local?mode=robots',
              icon: '🤖',
              title: 'Play vs robots',
              blurb: 'Face easy, medium or hard AI — or team up with them.',
            },
            {
              href: user ? '/lobby' : '/auth/login?next=/lobby',
              icon: '🌍',
              title: 'Online rooms',
              blurb: 'Create or join a private room and play live.',
            },
          ].map((c) => (
            <Link
              key={c.title}
              to={c.href}
              className="card-ludo group p-6 text-left transition hover:-translate-y-1 hover:border-amber-300/40"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-2xl">
                {c.icon}
              </div>
              <h3 className="text-lg font-bold text-stone-100">{c.title}</h3>
              <p className="mt-1 text-sm text-stone-400">{c.blurb}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-amber-300">
                Play →
              </span>
            </Link>
          ))}
        </div>
      </main>

      <footer className="flex items-center justify-center gap-2 px-6 py-5 text-xs text-stone-600">
        <span>Laravel</span> · <span>Reverb</span> · <span>React</span>
      </footer>
    </div>
  )
}