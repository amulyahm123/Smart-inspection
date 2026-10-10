import { createContext, useContext, useState } from 'react'
import { getUserById } from '../services/dataService'

const AuthContext = createContext(null)
const KEY = 'sih_demo_user'

export function AuthProvider({ children }) {
  // Remember the demo login across page refreshes
  const [user, setUser] = useState(() => {
    try {
      const id = localStorage.getItem(KEY)
      return id ? getUserById(id) || null : null
    } catch {
      return null
    }
  })

  const login = (userId) => {
    const u = getUserById(userId)
    if (!u) return null
    try { localStorage.setItem(KEY, u.id) } catch { /* storage unavailable */ }
    setUser(u)
    return u
  }

  const logout = () => {
    try { localStorage.removeItem(KEY) } catch { /* ignore */ }
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
