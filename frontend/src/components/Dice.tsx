import { motion } from 'framer-motion'

interface DiceProps {
  value: number | null
  size?: number
  disabled?: boolean
  onClick?: () => void
  label?: string
  rolling?: boolean
}

const PIP_POSITIONS: Record<number, Array<[number, number]>> = {
  1: [[50, 50]],
  2: [[24, 24], [76, 76]],
  3: [[24, 24], [50, 50], [76, 76]],
  4: [[24, 24], [76, 24], [24, 76], [76, 76]],
  5: [[24, 24], [76, 24], [50, 50], [24, 76], [76, 76]],
  6: [[24, 24], [76, 24], [24, 50], [76, 50], [24, 76], [76, 76]],
}

function Pips({ value }: { value: number }) {
  const pips = PIP_POSITIONS[value] ?? []
  return (
    <div className="absolute inset-[12%] rounded-xl bg-[radial-gradient(circle_at_50%_30%,#ffffff,transparent)]">
      {pips.map(([x, y], i) => (
        <span
          key={i}
          className="absolute h-[24%] w-[24%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_38%_32%,#666,#161616)] shadow-[inset_0_-2px_3px_rgba(255,255,255,0.3)]"
          style={{ left: `${x}%`, top: `${y}%` }}
        />
      ))}
    </div>
  )
}

export function Dice({ value, size = 84, disabled, onClick, label, rolling }: DiceProps) {
  const shown = value ?? 6

  return (
    <div className="flex flex-col items-center gap-2">
      {label && (
        <div className="rounded-full px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-widest text-sky-900/80">
          {label}
        </div>
      )}
      <motion.button
        type="button"
        disabled={disabled}
        onClick={onClick}
        whileHover={disabled ? undefined : { scale: 1.05, rotate: 3 }}
        whileTap={disabled ? undefined : { scale: 0.92 }}
        animate={
          rolling
            ? { rotate: [0, 180, 360], scale: [1, 1.08, 1] }
            : value !== null
              ? { rotate: [0, 8, -8, 8, 0], scale: [1, 1.12, 1] }
              : { rotate: 0 }
        }
        transition={
          rolling
            ? { rotate: { duration: 0.5, repeat: Infinity, ease: 'linear' }, scale: { duration: 0.5, repeat: Infinity, ease: 'easeInOut' } }
            : { duration: 0.55, ease: 'easeInOut' }
        }
        className="relative rounded-[22%] border-[3px] border-[#e0b34a] bg-gradient-to-br from-white via-[#fff7ea] to-[#ffe9c0] shadow-[0_7px_0_#b8860b,0_16px_34px_rgba(2,32,59,0.45)] disabled:cursor-not-allowed disabled:opacity-50"
        style={{ width: size, height: size }}
        aria-label={value ? `Dice shows ${value}` : 'Dice not rolled yet'}
      >
        <span className="pointer-events-none absolute inset-[3%] rounded-[18%] bg-[radial-gradient(circle_at_32%_20%,rgba(255,255,255,0.9),transparent_60%)]" />
        {value === null && !rolling && (
          <div className="flex h-full w-full items-center justify-center text-3xl font-extrabold text-[#f2b705] drop-shadow">
            ?
          </div>
        )}
        {value !== null && <Pips value={shown} />}
        {rolling && <Pips value={value ?? 4} />}
      </motion.button>
    </div>
  )
}