import axios, { type InternalAxiosRequestConfig } from 'axios'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'
const TOKEN_KEY = 'ludo-token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const API_URL_PUBLIC = API_URL