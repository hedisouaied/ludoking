import confetti from 'canvas-confetti'
import { useEffect } from 'react'

interface WinnerModalProps {
  winnerName: string
  subtitle?: string
  onPlayAgain?: () => void
  onHome?: () => void
}

export function WinnerModal({ winnerName, subtitle, onPlayAgain, onHome }: WinnerModalProps) {
  useEffect(() => {
    const colors = ['#ff4d4f', '#00c853', '#ffc400', '#2b7fff', '#ff7a00']
    const end = Date.now() + 1400
    const frame = () => {
      confetti({ particleCount: 6, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors })
      confetti({ particleCount: 6, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors })
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    const burst = setTimeout(() => {
      confetti({ particleCount: 160, spread: 110, origin: { y: 0.6 }, colors })
    }, 200)
    frame()
    return () => {
      clearTimeout(burst)
      confetti.reset()
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#061c30]/70 p-6 backdrop-blur-sm">
      <div className="pop-in w-full max-w-sm overflow-hidden rounded-[28px] border-4 border-amber-400 bg-white text-center shadow-[0_25px_70px_rgba(0,0,0,0.5)]">
        <div
          className="px-8 pb-6 pt-8"
          style={{ background: 'linear-gradient(160deg, #fff7e0, #ffe9b3)' }}
        >
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-b from-amber-300 to-amber-500 text-6xl shadow-[0_8px_0_#b45309,0_16px_30px_rgba(180,83,9,0.45)]">
            🏆
          </div>
          <h2 className="text-3xl font-black text-amber-700 drop-shadow-sm">{winnerName} wins!</h2>
          {subtitle && <p className="mt-1 text-sm font-semibold text-amber-900/60">{subtitle}</p>}
        </div>
        <div className="flex flex-col gap-2.5 px-8 py-6">
          {onPlayAgain && (
            <button type="button" className="btn-gold px-4 py-3.5 text-lg" onClick={onPlayAgain}>
              Play again
            </button>
          )}
          {onHome && (
            <button
              type="button"
              className="rounded-full border-2 border-slate-200 bg-white px-4 py-3 font-extrabold text-slate-600 transition hover:bg-slate-50"
              onClick={onHome}
            >
              Back to menu
            </button>
          )}
        </div>
      </div>
    </div>
  )
}