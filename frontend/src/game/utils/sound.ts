let ctx: AudioContext | null = null
let muted = localStorage.getItem('ludo-muted') === '1'

export function isMuted(): boolean {
  return muted
}

export function setMuted(m: boolean): void {
  muted = m
  localStorage.setItem('ludo-muted', m ? '1' : '0')
}

function ac(): AudioContext | null {
  const AC = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!ctx) ctx = new AC()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.12, when = 0): void {
  if (muted) return
  const c = ac()
  if (!c) return
  const t = c.currentTime + when
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.value = freq
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(g)
  g.connect(c.destination)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

export const sfx = {
  click(): void {
    tone(760, 0.06, 'square', 0.04)
  },
  dice(): void {
    for (let i = 0; i < 5; i++) tone(280 + Math.random() * 220, 0.05, 'triangle', 0.05, i * 0.07)
  },
  move(): void {
    const steps = [392, 494, 587]
    steps.forEach((f, i) => tone(f, 0.07, 'triangle', 0.07, i * 0.055))
  },
  enter(): void {
    tone(523, 0.09, 'triangle', 0.1)
    tone(659, 0.09, 'triangle', 0.08, 0.07)
  },
  capture(): void {
    tone(196, 0.14, 'sawtooth', 0.12)
    tone(98, 0.22, 'sawtooth', 0.1, 0.12)
  },
  win(): void {
    ;[523, 659, 784, 1047].forEach((f, i) => tone(f, 0.26, 'triangle', 0.12, i * 0.15))
  },
}