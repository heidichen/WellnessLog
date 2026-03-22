import { useState } from 'react'
import { useT } from '../../i18n/LanguageContext.jsx'
import { useApp } from '../../context/AppContext'
import { MEMBER_COLORS } from '../../utils/constants'
import { differenceInYears, differenceInMonths, parseISO } from 'date-fns'
import { Plus, Pencil, Trash2, Check, X, Settings, Share2, Copy } from 'lucide-react'
import MemberSettingsModal from '../members/MemberSettingsModal'

const labelCls = 'block font-mono text-[11px] font-semibold text-muted uppercase tracking-[0.5px] mb-1.5'
const inputCls = 'w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-bg text-ink placeholder:text-muted outline-none transition-colors focus:border-accent'

function MemberForm({ initial = {}, onSave, onCancel }) {
  const { t } = useT()
  const [name, setName] = useState(initial.name || '')
  const [color, setColor] = useState(initial.color || MEMBER_COLORS[0].id)
  const [dob, setDob] = useState(initial.dob || '')

  return (
    <div className="bg-surface2 rounded-card border border-border p-4 space-y-3">
      <div>
        <label className={labelCls}>{t('members.nameLabel')}</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={t('members.namePlaceholder')} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>{t('members.colorLabel')}</label>
        <div className="flex gap-2 flex-wrap mt-1">
          {MEMBER_COLORS.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => setColor(c.id)}
              className={`w-8 h-8 rounded-full transition-all ${color === c.id ? 'ring-2 ring-offset-2 ring-accent scale-110' : 'opacity-70 hover:opacity-100'}`}
              style={{ backgroundColor: c.hex }}
              title={c.label}
            />
          ))}
        </div>
      </div>
      <div>
        <label className={labelCls}>{t('members.dobLabel')}</label>
        <input type="date" value={dob} onChange={e => setDob(e.target.value)} className={inputCls} />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => name.trim() && onSave({ name: name.trim(), color, dob })}
          disabled={!name.trim()}
          className="flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white rounded-lg text-[13px] font-semibold transition-all"
        >
          <Check size={13} /> {t('members.save')}
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-2 border border-border bg-surface text-muted rounded-lg text-[13px] font-medium hover:bg-surface2 transition-all"
        >
          <X size={13} /> {t('members.cancel')}
        </button>
      </div>
    </div>
  )
}

export default function MembersView() {
  const { members, entries, addMember, updateMember, deleteMember, reloadData } = useApp()
  const { t } = useT()
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [settingsMember, setSettingsMember] = useState(null)

  // Join with code
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [joining, setJoining] = useState(false)

  // Multi-select share
  const [shareMode, setShareMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [shareAccessLevel, setShareAccessLevel] = useState('editor')
  const [generatedCode, setGeneratedCode] = useState(null) // { code, accessLevel, members }
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  const adminMembers = members.filter(m => m.role === 'admin')

  async function handleJoin(e) {
    e.preventDefault()
    setJoinError('')
    setJoining(true)
    try {
      const res = await fetch('/api/share/join', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: joinCode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await reloadData()
      setJoinCode('')
    } catch (err) {
      setJoinError(err.message)
    } finally { setJoining(false) }
  }

  function toggleSelect(id) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function exitShareMode() {
    setShareMode(false)
    setSelectedIds([])
    setGeneratedCode(null)
    setCopied(false)
  }

  async function handleGenerateBundle() {
    if (selectedIds.length === 0) return
    setGenerating(true)
    try {
      const res = await fetch('/api/share/bundle', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberIds: selectedIds, accessLevel: shareAccessLevel }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setGeneratedCode(data)
    } catch (err) {
      alert(err.message)
    } finally { setGenerating(false) }
  }

  function copyCode() {
    if (!generatedCode) return
    navigator.clipboard?.writeText(generatedCode.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function getAge(dob) {
    if (!dob) return null
    const birth = parseISO(dob)
    const years = differenceInYears(new Date(), birth)
    if (years < 2) {
      const months = differenceInMonths(new Date(), birth)
      return t('members.monthsOld', { count: months })
    }
    return t('members.yearsOld', { count: years })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-[22px] font-medium text-ink">{t('members.title')}</h2>
        <div className="flex items-center gap-2">
          {!shareMode && adminMembers.length > 0 && (
            <button
              type="button"
              onClick={() => setShareMode(true)}
              className="flex items-center gap-1.5 border border-border text-muted px-3 py-2 rounded-full text-[13px] font-medium hover:bg-surface2 transition-all"
            >
              <Share2 size={13} /> Share
            </button>
          )}
          {shareMode ? (
            <button type="button" onClick={exitShareMode} className="flex items-center gap-1.5 border border-border text-muted px-3 py-2 rounded-full text-[13px] font-medium hover:bg-surface2 transition-all">
              <X size={13} /> Cancel
            </button>
          ) : (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-full text-[13px] font-semibold transition-all"
            >
              <Plus size={13} /> {t('members.addMember')}
            </button>
          )}
        </div>
      </div>

      {/* Share mode panel */}
      {shareMode && (
        <div className="mb-5 bg-surface border border-border rounded-card p-4 space-y-4">
          {!generatedCode ? (
            <>
              <p className="text-[13px] text-muted">Select profiles below to share, then choose an access level.</p>
              <div>
                <p className={labelCls}>Access level</p>
                <div className="flex gap-2">
                  {['editor', 'viewer'].map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setShareAccessLevel(level)}
                      className="px-4 py-2 rounded-lg border-[1.5px] text-[13px] font-medium capitalize transition-all"
                      style={shareAccessLevel === level
                        ? { backgroundColor: '#f0ebe3', borderColor: '#c8956c', color: '#c8956c' }
                        : { borderColor: '#e8e2d9', color: '#8a8078', backgroundColor: 'white' }}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={handleGenerateBundle}
                disabled={selectedIds.length === 0 || generating}
                className="w-full py-2.5 rounded-lg bg-accent text-white text-[13px] font-semibold hover:bg-accent-hover disabled:opacity-40 transition-all"
              >
                {generating ? '…' : `Generate code for ${selectedIds.length} profile${selectedIds.length !== 1 ? 's' : ''}`}
              </button>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-[13px] text-[#6b9e6b] font-medium">Code generated — share it with the recipient.</p>
              <div className="flex items-center justify-between bg-surface2 rounded-lg px-4 py-3">
                <span className="font-mono text-[22px] font-bold tracking-[0.2em] text-ink">{generatedCode.code}</span>
                <button type="button" onClick={copyCode} className="p-2 rounded-lg hover:bg-surface text-muted">
                  {copied ? <Check size={16} className="text-[#6b9e6b]" /> : <Copy size={16} />}
                </button>
              </div>
              <p className="text-[12px] text-muted">
                Grants <strong className="capitalize">{generatedCode.accessLevel}</strong> access to:{' '}
                {generatedCode.members.map(m => m.name).join(', ')}
              </p>
              <button type="button" onClick={exitShareMode} className="text-[12px] text-muted underline">Done</button>
            </div>
          )}
        </div>
      )}

      {/* Join with code */}
      {!shareMode && (
        <div className="mb-5">
          <form onSubmit={handleJoin} className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Enter share code…"
              className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-bg text-ink placeholder:text-muted outline-none focus:border-accent font-mono tracking-wider uppercase"
              maxLength={8}
            />
            <button
              type="submit"
              disabled={joining || joinCode.length < 6}
              className="px-4 py-2 rounded-lg bg-accent text-white text-[13px] font-semibold hover:bg-accent-hover disabled:opacity-40 transition-all flex-shrink-0"
            >
              {joining ? '…' : 'Join'}
            </button>
          </form>
          {joinError && <p className="text-[12px] text-symptom mt-1.5">{joinError}</p>}
        </div>
      )}

      {showAdd && (
        <div className="mb-4">
          <MemberForm onSave={async data => { await addMember(data); setShowAdd(false) }} onCancel={() => setShowAdd(false)} />
        </div>
      )}

      {members.length === 0 && !showAdd && (
        <div className="text-center py-16 text-muted">
          <div className="text-4xl mb-3">👨‍👩‍👧‍👦</div>
          <p className="font-display text-lg">{t('members.empty')}</p>
          <p className="text-[13px] mt-1">{t('members.emptyHint')}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {members.map(m => {
          const color = MEMBER_COLORS.find(c => c.id === m.color)?.hex || '#8a8078'
          const memberEntries = entries.filter(e => e.memberId === m.id)
          const age = getAge(m.dob)
          const isAdmin = m.role === 'admin'
          const isSelectable = shareMode && isAdmin
          const isSelected = selectedIds.includes(m.id)

          if (editingId === m.id) {
            return (
              <div key={m.id}>
                <MemberForm
                  initial={m}
                  onSave={async data => { await updateMember(m.id, data); setEditingId(null) }}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            )
          }

          return (
            <div
              key={m.id}
              onClick={isSelectable ? () => toggleSelect(m.id) : undefined}
              className={`bg-surface border rounded-card p-5 transition-all group ${isSelectable ? 'cursor-pointer' : ''} ${isSelected ? 'border-accent shadow-card' : 'border-border hover:shadow-card'} ${shareMode && !isAdmin ? 'opacity-40' : ''}`}
            >
              <div className="flex items-start gap-4">
                {isSelectable && (
                  <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 border-2 transition-all ${isSelected ? 'bg-accent border-accent' : 'border-border'}`}>
                    {isSelected && <Check size={12} className="text-white" />}
                  </div>
                )}
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white text-[16px] font-semibold flex-shrink-0"
                  style={{ backgroundColor: color }}
                >
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-display text-[16px] font-medium text-ink">{m.name}</p>
                      {age && <p className="text-[12px] text-muted">{age}</p>}
                    </div>
                    {!shareMode && (
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isAdmin && (
                          <button onClick={() => setSettingsMember(m)} className="p-1.5 text-muted hover:text-ink transition-colors" title="Member settings">
                            <Settings size={13} />
                          </button>
                        )}
                        {isAdmin && (
                          <button onClick={() => setEditingId(m.id)} className="p-1.5 text-muted hover:text-ink transition-colors">
                            <Pencil size={13} />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={async () => {
                              if (window.confirm(t('members.deleteConfirm', { name: m.name }))) await deleteMember(m.id)
                            }}
                            className="p-1.5 text-muted hover:text-symptom transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="bg-surface2 rounded-lg p-2.5 text-center">
                      <p className="font-mono text-[18px] font-medium text-ink">{memberEntries.length}</p>
                      <p className="text-[11px] text-muted mt-0.5">{t('members.totalEntries')}</p>
                    </div>
                    <div className="bg-surface2 rounded-lg p-2.5 text-center">
                      <p className="font-mono text-[18px] font-medium text-ink">{memberEntries.filter(e => e.type === 'symptom').length}</p>
                      <p className="text-[11px] text-muted mt-0.5">{t('members.symptoms')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {settingsMember && (
        <MemberSettingsModal
          member={settingsMember}
          onClose={() => setSettingsMember(null)}
          onUpdate={updateMember}
          onDelete={deleteMember}
        />
      )}
    </div>
  )
}
