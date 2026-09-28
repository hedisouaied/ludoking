import Echo from 'laravel-echo'
import { getToken } from './api'

let echo: Echo<'reverb'> | null = null

/** Create (or return) the Laravel Echo instance wired to Reverb. */
export function getEcho(): Echo<'reverb'> | null {
  return echo
}

export function initEcho(): Echo<'reverb'> {
  if (echo) return echo
  const env = import.meta.env
  echo = new Echo<'reverb'>({
    broadcaster: 'reverb',
    key: env.VITE_REVERB_APP_KEY ?? 'ludo-reverb-key',
    wsHost: env.VITE_REVERB_HOST ?? '127.0.0.1',
    wsPort: Number(env.VITE_REVERB_PORT ?? 8080),
    wssPort: 443,
    forceTLS: false,
    encrypted: false,
    enabledTransports: ['ws', 'wss'],
    auth: {
      headers: { Authorization: `Bearer ${getToken()}` },
    },
  })
  return echo
}

export function destroyEcho(): void {
  if (echo) {
    try {
      echo.disconnect()
    } catch {
      /* noop */
    }
    echo = null
  }
}