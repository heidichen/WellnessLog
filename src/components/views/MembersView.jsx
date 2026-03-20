import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { MEMBER_COLORS } from '../../utils/constants'
import { differenceInYears, differenceInMonths, parseISO } from 'date-fns'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'

const labelCls = 'block font-mono text-[11px] font-semibold text-muted uppercase tracking-[0.5px] mb-1.5'
const inputCls = 'w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-bg text-ink placeholder:text-muted outline-none transition-colors focus:border-accent'

function MemberForm({ initial = {}, onSave, onCancel }) {
  const [name, setName] = useState(initial.name || '')
  const [color, setColor] = useState(initial.color || MEMBER_COLORS[0].id)
  const [dob, setDob] = useState(initial.dob || '')

  return (
    <div className="bg-surface2 rounded-card border border-border p-4 space-y-3">
      <div>
        <label className={labelCls}>Name</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Mom, Baby Leo…" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Color</label>
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
        <label className={labelCls}>Date of birth (optional)</label>
        <input type="date" value={dob} onChange={e => setDob(e.target.value)} className={inputCls} />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => name.trim() && onSave({ name: name.trim(), color, dob })}
          disabled={!name.trim()}
          className="flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white rounded-lg text-[13px] font-semibold transition-all"
        >
          <Check size={13} /> Save
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-2 border border-border bg-surface text-muted rounded-lg text-[13px] font-medium hover:bg-surface2 transition-all"
        >
          <X size={13} /> Cancel
        </button>
      </div>
    </div>
  )
}

function getAge(dob) {
  if (!dob) return null
  const birth = parseISO(dob)
  const years = differenceInYears(new Date(), birth)
  if (years < 2) {
    const months = differenceInMonths(new Date(), birth)
    return `${months} month${months !== 1 ? 's' : ''} old`
  }
  return `${years} year${years !== 1 ? 's' : ''} old`
}

export default function MembersView() {
  const { members, entries, addMember, updateMember, deleteMember } = useApp()
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState(null)

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-[22px] font-medium text-ink">Family Members</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-full text-[13px] font-semibold transition-all"
        >
          <Plus size={13} /> Add member
        </button>
      </div>

      {showAdd && (
        <div className="mb-4">
          <MemberForm onSave={async data => { await addMember(data); setShowAdd(false) }} onCancel={() => setShowAdd(false)} />
        </div>
      )}

      {members.length === 0 && !showAdd && (
        <div className="text-center py-16 text-muted">
          <div className="text-4xl mb-3">👨‍👩‍👧‍👦</div>
          <p className="font-display text-lg">No family members yet</p>
          <p className="text-[13px] mt-1">Add your first family member to get started</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {members.map(m => {
          const color = MEMBER_COLORS.find(c => c.id === m.color)?.hex || '#8a8078'
          const memberEntries = entries.filter(e => e.memberId === m.id)
          const age = getAge(m.dob)

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
            <div key={m.id} className="bg-surface border border-border rounded-card p-5 transition-all hover:shadow-card group">
              <div className="flex items-start gap-4">
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
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditingId(m.id)} className="p-1.5 text-muted hover:text-ink transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={async () => {
                          if (window.confirm(`Delete ${m.name} and all their entries?`)) await deleteMember(m.id)
                        }}
                        className="p-1.5 text-muted hover:text-symptom transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="bg-surface2 rounded-lg p-2.5 text-center">
                      <p className="font-mono text-[18px] font-medium text-ink">{memberEntries.length}</p>
                      <p className="text-[11px] text-muted mt-0.5">Total entries</p>
                    </div>
                    <div className="bg-surface2 rounded-lg p-2.5 text-center">
                      <p className="font-mono text-[18px] font-medium text-ink">{memberEntries.filter(e => e.type === 'symptom').length}</p>
                      <p className="text-[11px] text-muted mt-0.5">Symptoms</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
