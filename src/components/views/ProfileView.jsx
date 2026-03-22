import { useAuth } from '../../context/AuthContext'
import { useState } from 'react'
import { LogOut, User } from 'lucide-react'

export default function ProfileView() {
  const { user, logout, register } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  async function handleUpgrade(e) {
    e.preventDefault()
    setError(''); setSuccess('')
    setLoading(true)
    try {
      await register(email, password)
      setSuccess('Account created! You are now signed in.')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full border border-[#e8e2d9] rounded-lg px-3 py-2.5 text-sm bg-[#faf8f5] text-[#2c2825] placeholder:text-[#b0a898] outline-none focus:border-[#c8956c] transition-colors'
  const labelCls = 'block text-[11px] font-semibold text-[#8a8078] uppercase tracking-[0.5px] mb-1.5'

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h2 className="text-[20px] font-display font-medium text-[#2c2825] mb-6">Account</h2>

      <div className="bg-white rounded-2xl border border-[#f0ebe3] overflow-hidden">
        <div className="px-6 py-5 flex items-center gap-4 border-b border-[#f0ebe3]">
          <div className="w-12 h-12 rounded-full bg-[#f0ebe3] flex items-center justify-center">
            <User size={20} className="text-[#8a8078]" />
          </div>
          <div>
            <p className="text-[15px] font-medium text-[#2c2825]">{user?.email || 'Guest'}</p>
            <p className="text-[12px] text-[#b0a898]">{user?.isGuest ? 'Guest account' : 'Registered account'}</p>
          </div>
        </div>

        {user?.isGuest && (
          <div className="px-6 py-5 border-b border-[#f0ebe3]">
            <p className="text-[13px] font-semibold text-[#2c2825] mb-1">Create a free account</p>
            <p className="text-[12px] text-[#8a8078] mb-4">Sync across devices and share health profiles with family.</p>
            <form onSubmit={handleUpgrade} className="space-y-3">
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className={inputCls} required />
              </div>
              <div>
                <label className={labelCls}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className={inputCls} required />
              </div>
              {error && <p className="text-[12px] text-[#c07b5a]">{error}</p>}
              {success && <p className="text-[12px] text-green-600">{success}</p>}
              <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg bg-[#c8956c] text-white text-[13px] font-semibold hover:bg-[#b8845c] disabled:opacity-50 transition-colors">
                {loading ? '…' : 'Create Account'}
              </button>
            </form>
          </div>
        )}

        <div className="px-6 py-4">
          <button
            onClick={logout}
            className="flex items-center gap-2 text-[13px] text-[#c07b5a] hover:text-[#a06b4a] transition-colors"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
