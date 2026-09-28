import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { isSafe } from '../game/engine/board'
import { moveWaypoints } from '../game/engine/engine'
import type { Color, GameState, PlayerToken } from '../game/types'
import {
  BASE_ORIGIN,
  BASE_SLOTS,
  CELL,
  FINISH_SPOT,
  HOME_LANE,
  PATH,
  SIZE,
  positionCenter,
} from '../game/utils/coords'

const C: Record<Color, string> = { red: '#ff4d4f', green: '#00c853', yellow: '#ffc400', blue: '#2b7fff' }
const CD: Record<Color, string> = { red: '#d62828', green: '#0a9e4e', yellow: '#e6a700', blue: '#1a5fd0' }
const CL: Record<Color, string> = { red: '#ffe0e0', green: '#dcf7e8', yellow: '#fff6cf', blue: '#dbe9ff' }

const TEXT: Record<Color, string> = { red: '#ffffff', green: '#ffffff', yellow: '#6b4e00', blue: '#ffffff' }

const START_OF: Partial<Record<number, Color>> = {
  0: 'red',
  13: 'green',
  26: 'yellow',
  39: 'blue',
}

const STACK_OFFSETS: Array<Array<[number, number]>> = [
  [[0, 0]],
  [
    [-10, 0],
    [10, 0],
  ],
  [
    [-10, -10],
    [10, -10],
    [0, 10],
  ],
  [
    [-10, -10],
    [10, -10],
    [-10, 10],
    [10, 10],
  ],
  [
    [-12, -12],
    [12, -12],
    [-12, 12],
    [12, 12],
    [0, 0],
  ],
]

/** Chevron polygon pointing in the direction a home-lane cell moves toward center. */
function LaneChevron({ c, r }: { c: number; r: number }) {
  const x = (c + 0.5) * CELL
  const y = (r + 0.5) * CELL
  let pts: string
  const dx = c > 7 ? 1 : c < 7 ? -1 : 0
  const dy = r > 7 ? 1 : r < 7 ? -1 : 0
  if (dx !== 0) pts = `${x - dx * 8},${y - 8} ${x - dx * 8},${y + 8} ${x + dx * 9},${y}`
  else pts = `${x - 8},${y - dy * 8} ${x + 8},${y - dy * 8} ${x},${y + dy * 9}`
  return <polygon points={pts} fill="#ffffff" opacity={0.95} />
}

function Star({ cx, cy, r = 7 }: { cx: number; cy: number; r?: number }) {
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI / 5) * i - Math.PI / 2
    const rad = i % 2 === 0 ? r : r * 0.42
    pts.push(`${cx + Math.cos(ang) * rad},${cy + Math.sin(ang) * rad}`)
  }
  return <polygon points={pts.join(' ')} fill="#b45309" />
}

interface Pt {
  x: number
  y: number
}

interface TokenView {
  token: PlayerToken
  color: Color
  cx: number
  cy: number
  waypoints: Array<{ cx: number; cy: number }>
}

interface LudoBoardProps {
  game: GameState
  movableTokenIds?: string[]
  onTokenClick?: (tokenId: string) => void
}

export function LudoBoard({ game, movableTokenIds = [], onTokenClick }: LudoBoardProps) {
  const prevRef = useRef<Map<string, number>>(new Map())

  const views: TokenView[] = game.players.flatMap((p) =>
    p.tokens.map((token) => {
      const prevPos = prevRef.current.get(token.id)
      const target = positionCenter(token.position, token.color, token.number)
      const fromCenter = prevPos !== undefined ? positionCenter(prevPos, token.color, token.number) : target
      const pathPositions =
        prevPos !== undefined && prevPos !== token.position ? moveWaypoints(token.color, prevPos, token.position) : []

      const waypoints =
        pathPositions.length > 1
          ? pathPositions.slice(0, -1).map((pos) => positionCenter(pos, token.color, token.number))
          : []

      const last = pathPositions.length > 0 ? pathPositions[pathPositions.length - 1] : null
      const finalCenter: Pt =
        last !== null && last !== token.position ? positionCenter(last, token.color, token.number) : target

      return {
        token,
        color: token.color,
        cx: fromCenter.x,
        cy: fromCenter.y,
        waypoints: [...waypoints, finalCenter].map((p) => ({ cx: p.x, cy: p.y })),
      }
    }),
  )

  useEffect(() => {
    const map = new Map<string, number>()
    for (const p of game.players) {
      for (const t of p.tokens) map.set(t.id, t.position)
    }
    prevRef.current = map
  }, [game])

  const groups = new Map<string, TokenView[]>()
  for (const v of views) {
    const key = `${Math.round(v.waypoints[v.waypoints.length - 1].cx)},${Math.round(v.waypoints[v.waypoints.length - 1].cy)}`
    const list = groups.get(key) ?? []
    list.push(v)
    groups.set(key, list)
  }
  const offsetOf = new Map<string, [number, number]>()
  for (const list of groups.values()) {
    const slots = STACK_OFFSETS[Math.min(list.length, 5) - 1]
    list
      .slice()
      .sort((a, b) => a.color.localeCompare(b.color))
      .forEach((v, i) => {
        offsetOf.set(v.token.id, slots[Math.min(i, slots.length - 1)])
      })
  }

  const movable = new Set(movableTokenIds)
  const clickable = movable.size > 0 && onTokenClick !== undefined
  const total = (v: TokenView) => Math.max(1, v.waypoints.length)
  const duration = (v: TokenView) => total(v) * 0.24

  return (
    <div className="select-none">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="block h-auto w-full">
        {/* wooden mat + gold trim */}
        <rect x={0} y={0} width={SIZE} height={SIZE} rx={26} fill="#2c1e15" />
        <rect x={5} y={5} width={SIZE - 10} height={SIZE - 10} rx={22} fill="#fff7e8" />
        <rect x={12} y={12} width={SIZE - 24} height={SIZE - 24} rx={18} fill="none" stroke="#e6b94e" strokeWidth={2.5} />

        <g>
          {/* base quadrants */}
          {(Object.keys(BASE_ORIGIN) as Color[]).map((color) => {
            const [x, y] = BASE_ORIGIN[color]
            const ccx = (x + 3) * CELL
            const ccy = (y + 3) * CELL
            return (
              <g key={color}>
                <rect
                  x={x * CELL + 1}
                  y={y * CELL + 1}
                  width={6 * CELL - 2}
                  height={6 * CELL - 2}
                  rx={9}
                  fill={C[color]}
                  stroke={CD[color]}
                  strokeWidth={2}
                />
                <circle cx={ccx} cy={ccy} r={102} fill="rgba(255,255,255,0.96)" />
                <circle cx={ccx} cy={ccy} r={102} fill="none" stroke={CD[color]} strokeWidth={2} opacity={0.4} />
                {BASE_SLOTS[color].map(([cs, rs], i) => (
                  <g key={i}>
                    <circle cx={(cs + 0.5) * CELL} cy={(rs + 0.5) * CELL} r={15} fill="#ffffff" stroke={CD[color]} strokeWidth={2.5} />
                    <circle cx={(cs + 0.5) * CELL} cy={(rs + 0.5) * CELL} r={15} fill="none" stroke="#00000022" strokeWidth={6} opacity={0.25} />
                  </g>
                ))}
              </g>
            )
          })}

          {/* ring cells */}
          {PATH.map(([c, r], tile) => {
            const safe = isSafe(tile)
            const starter = START_OF[tile]
            return (
              <g key={tile}>
                <rect
                  x={c * CELL + 1.5}
                  y={r * CELL + 1.5}
                  width={CELL - 3}
                  height={CELL - 3}
                  rx={7}
                  fill={safe ? '#fff2b3' : starter ? C[starter] : '#ffffff'}
                  stroke={starter ? CD[starter] : safe ? '#f0b429' : '#e2d9c4'}
                  strokeWidth={1.6}
                />
                {safe && (
                  <>
                    <circle cx={(c + 0.5) * CELL} cy={(r + 0.5) * CELL} r={14} fill="#ffefad" stroke="#e0a800" strokeWidth={1.5} />
                    <Star cx={(c + 0.5) * CELL} cy={(r + 0.5) * CELL} />
                  </>
                )}
                {starter && (
                  <>
                    <circle cx={(c + 0.5) * CELL} cy={(r + 0.5) * CELL} r={15} fill="rgba(255,255,255,0.88)" />
                    <circle cx={(c + 0.5) * CELL} cy={(r + 0.5) * CELL} r={11} fill="none" stroke={C[starter]} strokeWidth={2.5} />
                    <circle cx={(c + 0.5) * CELL} cy={(r + 0.5) * CELL} r={4} fill={CD[starter]} />
                  </>
                )}
              </g>
            )
          })}

          {/* home lanes + finish */}
          {(Object.keys(C) as Color[]).map((color) => (
            <g key={color}>
              {HOME_LANE[color].map(([c, r], i) => (
                <g key={i}>
                  <rect
                    x={c * CELL + 1.5}
                    y={r * CELL + 1.5}
                    width={CELL - 3}
                    height={CELL - 3}
                    rx={8}
                    fill={C[color]}
                    stroke={CD[color]}
                    strokeWidth={1.6}
                  />
                  <LaneChevron c={c} r={r} />
                </g>
              ))}
              <rect
                x={FINISH_SPOT[color][0] * CELL + 1.5}
                y={FINISH_SPOT[color][1] * CELL + 1.5}
                width={CELL - 3}
                height={CELL - 3}
                rx={8}
                fill={CD[color]}
                stroke={CD[color]}
                strokeWidth={1.6}
              />
            </g>
          ))}

          {/* center */}
          <rect x={6 * CELL + 1.5} y={6 * CELL + 1.5} width={3 * CELL - 3} height={3 * CELL - 3} rx={10} fill="#ffffff" />
          <polygon points="260,300 300,262 300,338" fill={CL.red} stroke={CD.red} strokeWidth={1.5} />
          <polygon points="340,300 300,262 300,338" fill={CL.yellow} stroke={CD.yellow} strokeWidth={1.5} />
          <polygon points="300,260 262,300 338,300" fill={CL.green} stroke={CD.green} strokeWidth={1.5} />
          <polygon points="300,340 262,300 338,300" fill={CL.blue} stroke={CD.blue} strokeWidth={1.5} />
          <circle cx={300} cy={300} r={26} fill="#fff7e8" stroke="#e0b34a" strokeWidth={2.5} />
          <circle cx={300} cy={300} r={8} fill="#f5b301" />
          {(Object.keys(C) as Color[]).map((color) => (
            <circle
              key={color}
              cx={(FINISH_SPOT[color][0] + 0.5) * CELL}
              cy={(FINISH_SPOT[color][1] + 0.5) * CELL}
              r={7}
              fill={C[color]}
              stroke="#ffffff"
              strokeWidth={2}
            />
          ))}

          {/* tokens */}
          {views.map((v) => {
            const [dx, dy] = offsetOf.get(v.token.id) ?? [0, 0]
            const times = v.waypoints.map((_, i) => (i + 1) / total(v))
            const isMovable = movable.has(v.token.id)
            const keyframes = (prop: 'cx' | 'cy') => [v[prop], ...v.waypoints.map((w) => w[prop])]
            return (
              <g
                key={v.token.id}
                transform={`translate(${dx} ${dy})`}
                onClick={isMovable && clickable ? () => onTokenClick?.(v.token.id) : undefined}
                style={isMovable && clickable ? { cursor: 'pointer' } : undefined}
                filter="drop-shadow(0 3px 2px rgba(0,0,0,0.35))"
              >
                <motion.circle
                  r={14}
                  fill={C[v.color]}
                  stroke="#7d2326"
                  strokeWidth={1.8}
                  initial={{ cx: v.cx, cy: v.cy, opacity: 0 }}
                  animate={{ cx: keyframes('cx'), cy: keyframes('cy'), opacity: 1 }}
                  transition={{ duration: duration(v), times: [0, ...times], ease: 'easeInOut' }}
                />
                <motion.circle
                  r={14}
                  fill={`url(#ludoGloss-${v.color})`}
                  stroke={CD[v.color]}
                  strokeWidth={1.4}
                  initial={{ cx: v.cx, cy: v.cy, opacity: 0 }}
                  animate={{ cx: keyframes('cx'), cy: keyframes('cy'), opacity: 1 }}
                  transition={{ duration: duration(v), times: [0, ...times], ease: 'easeInOut' }}
                />
                <motion.text
                  fontSize={11}
                  fontWeight={800}
                  fontFamily="Nunito, sans-serif"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={TEXT[v.color]}
                  initial={{ cx: v.cx, cy: v.cy, opacity: 0 }}
                  animate={{ cx: keyframes('cx'), cy: keyframes('cy'), opacity: 1 }}
                  transition={{ duration: duration(v), times: [0, ...times], ease: 'easeInOut' }}
                >
                  {v.token.number + 1}
                </motion.text>
                {isMovable && (
                  <motion.circle
                    r={19}
                    fill="rgba(34,211,238,0.18)"
                    stroke="#22d3ee"
                    strokeWidth={3}
                    initial={{ cx: v.waypoints[v.waypoints.length - 1].cx, cy: v.waypoints[v.waypoints.length - 1].cy, scale: 1 }}
                    animate={{
                      cx: v.waypoints[v.waypoints.length - 1].cx,
                      cy: v.waypoints[v.waypoints.length - 1].cy,
                      scale: [1, 1.22, 1],
                    }}
                    transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
              </g>
            )
          })}

          <defs>
            {(Object.keys(C) as Color[]).map((color) => (
              <radialGradient key={color} id={`ludoGloss-${color}`} cx="32%" cy="26%" r="80%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity={0.95} />
                <stop offset="38%" stopColor={C[color]} />
                <stop offset="100%" stopColor={CD[color]} />
              </radialGradient>
            ))}
          </defs>
        </g>
      </svg>
    </div>
  )
}