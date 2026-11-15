import { createContext,useContext } from 'react'

export interface WechatUser {
  openid: string
  nickname: string
  avatar: string
}

export interface AuthContextValue {
  user: WechatUser | null
  login: (user: WechatUser) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export const STORAGE_KEY = 'ganshale_wechat_user'

export function readStored(): WechatUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as WechatUser) : null
  } catch {
    return null
  }
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
