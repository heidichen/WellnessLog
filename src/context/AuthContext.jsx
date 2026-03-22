import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined) // undefined = loading, null = not logged in
  const [guestBannerDismissed, setGuestBannerDismissed] = useState(
    () => localStorage.getItem('guest_banner_dismissed') === '1'
  )

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(u => setUser(u))
      .catch(() => setUser(null))
  }, [])

  async function loginAsGuest() {
    const res = await fetch('/api/auth/guest', { method: 'POST', credentials: 'include' })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to create guest session')
    setUser(data)
    return data
  }

  async function login(email, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Login failed')
    setUser(data)
    return data
  }

  async function register(email, password) {
    const res = await fetch('/api/auth/register', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Registration failed')
    setUser(data)
    return data
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    setUser(null)
  }

  function dismissGuestBanner() {
    localStorage.setItem('guest_banner_dismissed', '1')
    setGuestBannerDismissed(true)
  }

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, loginAsGuest, logout, guestBannerDismissed, dismissGuestBanner }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
