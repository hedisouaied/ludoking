import { useEffect, useRef } from 'react'

interface GameLogProps {
  entries: string[]
}

export function GameLog({ entries }: GameLogProps) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [entries.length])

  return (
    <div className="h-36 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
      {entries.length === 0 && <p className="text-slate-400">Game log…</p>}
      {entries.slice(-40).map((line, i) => (
        <p key={entries.length - 40 + i} className="py-0.5 text-slate-600">
          {line}
        </p>
      ))}
      <div ref={endRef} />
    </div>
  )
}