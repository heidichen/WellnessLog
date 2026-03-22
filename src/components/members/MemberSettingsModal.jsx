import { useState, useEffect } from 'react'
import { X, Copy, Trash2, Plus, Check } from 'lucide-react'
import { MEMBER_COLORS } from '../../utils/constants'

export default function MemberSettingsModal({ member, onClose, onUpdate, onDelete }) {
  const [accessList, setAccessList] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(null)
  const [generating, setGenerating] = useState(null)

  useEffect(() => { loadAccess() }, [member.id])

  async function loadAccess() {
    setLoading(true)
    try {
      const res = await fetch(`/api/members/${member.id}/access`, { credentials: 'include' })
      if (res.ok) setAccessList(await res.json())
    } finally { setLoading(false) }
  }

  async function generateCode(accessLevel) {
    setGenerating(accessLevel)
    try {
      const res = await fetch(`/api/members/${member.id}/share`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessLevel }),
      })
      if (res.ok) await loadAccess()
    } finally { setGenerating(null) }
  }

  async function revokeAccess(accessId) {
    const res = await fetch(`/api/members/${member.id}/access/${accessId}`, {
      method: 'DELETE', credentials: 'include',
    })
    if (res.ok) await loadAccess()
  }

  function copyCode(code) {
    navigator.clipboard?.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  const color = MEMBER_COLORS.find(c => c.id === member.color)?.hex || '#8a8078'
  const pendingCodes = accessList.filter(a => !a.userId && a.shareCode)
  const activeUsers = accessList.filter(a => a.userId && a.role)
  const editorCode = pendingCodes.find(a => a.shareCodeAccess === 'editor')
  const viewerCode = pendingCodes.find(a => a.shareCodeAccess === 'viewer')

  const labelCls = 'text-[11px] font-semibold text-[#8a8078] uppercase tracking-[0.5px]'
  const codeCls = 'font-mono text-[16px] font-bold tracking-[0.15em] text-[#2c2825]'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(26,23,20,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-[480px] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <h2 className="text-[18px] font-medium text-[#2c2825]">{member.name} — Settings</h2>
          </div>
          <button onClick={onClose} className="p-1 text-[#b0a898] hover:text-[#2c2825]"><X size={18} /></button>
        </div>

        <div className="px-6 pb-6 space-y-6">
          {/* Share codes */}
          <div>
            <p className={`${labelCls} mb-3`}>Share Access</p>
            <div className="space-y-3">
              {[{ level: 'editor', label: 'Editor', existing: editorCode }, { level: 'viewer', label: 'Viewer', existing: viewerCode }].map(({ level, label, existing }) => (
                <div key={level} className="border border-[#f0ebe3] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] font-semibold text-[#2c2825]">{label} access</span>
                    {!existing && (
                      <button
                        onClick={() => generateCode(level)}
                        disabled={generating === level}
                        className="flex items-center gap-1 text-[12px] text-[#c8956c] hover:text-[#b8845c] font-medium"
                      >
                        <Plus size={12} /> Generate code
                      </button>
                    )}
                  </div>
                  {existing ? (
                    <div className="flex items-center justify-between">
                      <span className={codeCls}>{existing.shareCode}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => copyCode(existing.shareCode)} className="p-1.5 rounded-lg hover:bg-[#faf8f5] text-[#8a8078]">
                          {copied === existing.shareCode ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                        </button>
                        <button onClick={() => revokeAccess(existing.id)} className="p-1.5 rounded-lg hover:bg-[#faf8f5] text-[#c07b5a]">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[12px] text-[#b0a898]">No active code. Generate one to share with others.</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Active users */}
          {activeUsers.length > 0 && (
            <div>
              <p className={`${labelCls} mb-3`}>People with access</p>
              <div className="space-y-2">
                {activeUsers.map(a => (
                  <div key={a.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#faf8f5]">
                    <div>
                      <span className="text-[13px] text-[#2c2825]">{a.userEmail || 'Guest'}</span>
                      <span className="ml-2 text-[11px] text-[#b0a898] capitalize">{a.role}</span>
                    </div>
                    {a.role !== 'admin' && (
                      <button onClick={() => revokeAccess(a.id)} className="p-1 text-[#c07b5a] hover:text-[#a06b4a]">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Danger zone */}
          <div className="pt-2 border-t border-[#f0ebe3]">
            <button
              onClick={() => { if (confirm(`Delete ${member.name}? This cannot be undone.`)) { onDelete(member.id); onClose() } }}
              className="w-full py-2 rounded-lg border border-[#e8c8c0] text-[13px] text-[#c07b5a] hover:bg-[#faeee8] transition-colors"
            >
              Delete {member.name}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
