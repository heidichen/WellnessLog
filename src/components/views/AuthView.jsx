import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

export default function AuthView() {
  const { login, register, loginAsGuest } = useAuth()
  const [tab, setTab] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [guestError, setGuestError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (tab === 'login') await login(email, password)
      else await register(email, password)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleGuest() {
    setGuestError('')
    setLoading(true)
    try {
      await loginAsGuest()
    } catch (err) {
      setGuestError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full border border-[#e8e2d9] rounded-lg px-3 py-2.5 text-sm bg-white text-[#2c2825] placeholder:text-[#b0a898] outline-none focus:border-[#c8956c] transition-colors'
  const labelCls = 'block text-[11px] font-semibold text-[#8a8078] uppercase tracking-[0.5px] mb-1.5'

  return (
    <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-[28px] font-display font-semibold text-[#2c2825] mb-1">WellnessLog</h1>
          <p className="text-[14px] text-[#8a8078]">Track health for your whole family</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-[#f0ebe3] p-7">
          {/* Tabs */}
          <div className="flex border-b border-[#f0ebe3] mb-6">
            {['login', 'register'].map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError('') }}
                className={`flex-1 pb-3 text-[13px] font-semibold capitalize transition-colors ${tab === t ? 'text-[#c8956c] border-b-2 border-[#c8956c]' : 'text-[#b0a898]'}`}
              >
                {t === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className={inputCls} required />
            </div>
            <div>
              <label className={labelCls}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className={inputCls} required />
              {tab === 'register' && <p className="text-[11px] text-[#b0a898] mt-1">Minimum 6 characters</p>}
            </div>
            {error && <p className="text-[13px] text-[#c07b5a] text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-[#c8956c] hover:bg-[#b8845c] text-white text-[14px] font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? '…' : tab === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-[#f0ebe3]">
            <button
              type="button"
              onClick={handleGuest}
              disabled={loading}
              className="w-full py-2.5 rounded-lg border border-[#e8e2d9] text-[13px] text-[#8a8078] hover:bg-[#faf8f5] transition-colors disabled:opacity-50"
            >
              {loading ? '…' : 'Continue as guest'}
            </button>
            {guestError && <p className="text-[12px] text-[#c07b5a] text-center mt-2">{guestError}</p>}
            <p className="text-[11px] text-[#b0a898] text-center mt-2">No account needed. Data stays on this device.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
