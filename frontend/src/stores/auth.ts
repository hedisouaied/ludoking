import { create } from 'zustand'
import type { AuthUser } from '../game/online/snapshot'
import { api, getToken, setToken } from '../services/api'

interface AuthState {
  user: AuthUser | null
  booted: boolean
  init: () => Promise<void>
  login: (email: string, password: string) => Promise<AuthUser>
  register: (data: {
    name: string
    username: string
    email: string
    password: string
    password_confirmation?: string
  }) => Promise<AuthUser>
  logout: () => Promise<void>
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  booted: false,

  async init() {
    const token = getToken()
    if (!token) {
      set({ booted: true, user: null })
      return
    }
    if (useAuth.getState().user) {
      set({ booted: true })
      return
    }
    try {
      const { data } = await api.get<{ user: AuthUser }>('/auth/me')
      set({ user: data.user, booted: true })
    } catch {
      setToken(null)
      set({ user: null, booted: true })
    }
  },

  async login(email, password) {
    const { data } = await api.post<{ token: string; user: AuthUser }>('/auth/login', { email, password })
    setToken(data.token)
    set({ user: data.user, booted: true })
    return data.user
  },

  async register(payload) {
    const { data } = await api.post<{ token: string; user: AuthUser }>('/auth/register', payload)
    setToken(data.token)
    set({ user: data.user, booted: true })
    return data.user
  },

  async logout() {
    try {
      await api.post('/auth/logout')
    } catch {
      /* token may already be invalid */
    }
    setToken(null)
    set({ user: null })
  },
}))