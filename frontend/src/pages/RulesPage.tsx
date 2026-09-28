import { Link } from 'react-router-dom'

const RULES = [
  ['Objective', 'Be the first to move all four of your tokens from base to the colored home square in the center.'],
  ['Setup', 'Two to four players take a color (red, green, yellow, blue). Four tokens start in each player’s base.'],
  ['Motion', 'The dice roll decides how many squares a token moves, always clockwise around the 52-square ring.'],
  ['Leaving base', 'You must roll a 6 to release a token from base onto its colored start square.'],
  ['Extra turn', 'Rolling a 6 grants an extra roll after the move — as many times as you keep rolling 6s.'],
  ['Capture', 'Landing on an opponent’s token (except on safe/star tiles) sends it back to base. Safe tiles are starred.'],
  ['Home stretch', 'Once a token has circled the board it turns into the colored column toward the center. An exact roll is required to finish each token. Tokens on the home column can never be captured.'],
  ['Winning', 'The first player to get all four tokens home wins the game.'],
]

export function RulesPage() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col px-6 py-10">
      <div className="flex items-center justify-between">
        <Link to="/" className="text-sm font-semibold text-stone-400 transition hover:text-amber-300">
          ← Menu
        </Link>
        <span className="ludo-logo text-xl">How to play</span>
        <span className="w-14" />
      </div>
      <div className="card-ludo mt-8 w-full p-7">
        <ol className="flex flex-col gap-5">
          {RULES.map(([title, body], i) => (
            <li key={title} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-sm font-extrabold text-amber-300">
                {i + 1}
              </span>
              <div>
                <h3 className="font-bold text-stone-100">{title}</h3>
                <p className="mt-0.5 text-sm leading-relaxed text-stone-400">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}