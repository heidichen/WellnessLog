import { useState, useRef } from 'react'
import { useApp } from '../../context/AppContext'
import { ENTRY_TYPES, SEVERITY_LEVELS, MEMBER_COLORS } from '../../utils/constants'
import { analyzeFood, fileToBase64 } from '../../utils/claude'
import { format } from 'date-fns'
import AutocompleteInput from './AutocompleteInput'
import { X, Camera, Loader2, AlertCircle } from 'lucide-react'

export default function EntryModal({ onClose, initialEntry = null, defaultDate = null }) {
  const { members, activeMemberId, addEntry, updateEntry, getAutocomplete } = useApp()
  const isEdit = !!initialEntry

  const [form, setForm] = useState({
    memberId: initialEntry?.memberId || activeMemberId || members[0]?.id || '',
    type: initialEntry?.type || 'food',
    date: initialEntry?.date || defaultDate || format(new Date(), 'yyyy-MM-dd'),
    time: initialEntry?.time ?? '',
    title: initialEntry?.title || '',
    notes: initialEntry?.notes || '',
    severity: initialEntry?.severity || 'mild',
    photoDataUrl: initialEntry?.photoDataUrl || null,
  })
  const [showTime, setShowTime] = useState(!!(initialEntry?.time))
  const [photoLoading, setPhotoLoading] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)

  const titleParts = form.title.split(',')
  const activeToken = titleParts[titleParts.length - 1].trimStart()
  const suggestions = getAutocomplete(form.memberId, form.type, activeToken)

  function handleTitleSelect(suggestion) {
    const parts = form.title.split(',')
    parts[parts.length - 1] = (parts.length > 1 ? ' ' : '') + suggestion
    set('title', parts.join(',') + ', ')
  }

  function set(key, value) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handlePhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    setPhotoError('')
    set('photoDataUrl', URL.createObjectURL(file))
    setPhotoLoading(true)
    try {
      const { base64, mimeType } = await fileToBase64(file)
      set('title', await analyzeFood(base64, mimeType))
      set('photoDataUrl', `data:${mimeType};base64,${base64}`)
    } catch (err) {
      setPhotoError(err.message)
    } finally {
      setPhotoLoading(false)
    }
    e.target.value = ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try {
      if (isEdit) await updateEntry(initialEntry.id, form)
      else await addEntry(form)
      onClose()
    } catch {
      setSaving(false)
    }
  }

  const typeConfig = ENTRY_TYPES[form.type]

  const labelCls = 'block font-mono text-[11px] font-semibold text-muted uppercase tracking-[0.5px] mb-1.5'
  const inputCls = 'w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-bg text-ink placeholder:text-muted outline-none transition-colors focus:border-accent'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(26,23,20,0.4)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-surface rounded-2xl shadow-lg w-full max-w-[480px] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-7 pt-7 pb-5">
          <h2 className="font-display text-[20px] font-medium text-ink">
            {isEdit ? 'Edit entry' : 'New entry'}
          </h2>
          <button onClick={onClose} className="p-1 text-muted hover:text-ink transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-7 pb-7 space-y-4">
          {/* Member */}
          {members.length > 1 && (
            <div>
              <label className={labelCls}>Member</label>
              <div className="flex gap-2 flex-wrap">
                {members.map(m => {
                  const color = MEMBER_COLORS.find(c => c.id === m.color)?.hex || '#8a8078'
                  const active = form.memberId === m.id
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => set('memberId', m.id)}
                      className="px-3 py-1.5 rounded-full text-[13px] font-medium border-[1.5px] transition-all"
                      style={active
                        ? { backgroundColor: color, borderColor: color, color: 'white' }
                        : { borderColor: '#e8e2d9', color: '#8a8078', backgroundColor: 'white' }}
                    >
                      {m.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Type */}
          <div>
            <label className={labelCls}>Type</label>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(ENTRY_TYPES).map(([key, cfg]) => {
                const active = form.type === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { set('type', key); set('title', '') }}
                    className="px-4 py-2 rounded-full border-[1.5px] text-[13px] font-medium transition-all"
                    style={active
                      ? { backgroundColor: cfg.lightBg, borderColor: cfg.color, color: cfg.color }
                      : { borderColor: '#e8e2d9', color: '#8a8078', backgroundColor: 'white' }}
                  >
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Date & Time */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className={labelCls}>Date</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={inputCls} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-mono text-[11px] font-semibold text-muted uppercase tracking-[0.5px]">Time</label>
                <button type="button" onClick={() => { setShowTime(v => !v); set('time', '') }} className="text-[11px] text-muted hover:text-ink transition-colors">
                  {showTime ? 'remove' : '+ add'}
                </button>
              </div>
              {showTime
                ? <input type="time" value={form.time} onChange={e => set('time', e.target.value)} className={inputCls} />
                : <div className="w-full border border-dashed border-border rounded-lg px-3 py-2.5 text-[12px] text-muted text-center bg-surface2">optional</div>
              }
            </div>
          </div>

          {/* Title */}
          <div>
            <label className={labelCls}>
              {form.type === 'food' ? 'What was eaten' : form.type === 'symptom' ? 'Symptom' : form.type === 'medication' ? 'Medication / Supplement' : 'Activity'}
            </label>
            <AutocompleteInput
              value={form.title}
              onChange={v => set('title', v)}
              onSelect={handleTitleSelect}
              suggestions={suggestions}
              placeholder="Type or select from history…"
            />
          </div>

          {/* Photo (food only) */}
          {form.type === 'food' && (
            <div>
              <label className={labelCls}>Photo (optional)</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={photoLoading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-[13px] text-muted hover:border-accent hover:text-accent transition-all disabled:opacity-50"
                >
                  {photoLoading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                  {photoLoading ? 'Analyzing…' : 'Add photo'}
                </button>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
                {form.photoDataUrl && (
                  <img src={form.photoDataUrl} alt="food" className="w-12 h-12 object-cover rounded-lg border border-border" />
                )}
              </div>
              {photoError && (
                <div className="mt-1 flex items-center gap-1 text-[12px] text-symptom">
                  <AlertCircle size={12} />{photoError}
                </div>
              )}
            </div>
          )}

          {/* Severity (symptom only) */}
          {form.type === 'symptom' && (
            <div>
              <label className={labelCls}>Severity</label>
              <div className="flex gap-2">
                {SEVERITY_LEVELS.map(s => {
                  const active = form.severity === s
                  const colors = {
                    mild: { bg: '#edf5ed', border: '#6b9e6b', color: '#6b9e6b' },
                    moderate: { bg: '#f7f3e3', border: '#b5a046', color: '#b5a046' },
                    severe: { bg: '#faeee8', border: '#c07b5a', color: '#c07b5a' },
                  }
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => set('severity', s)}
                      className="flex-1 py-2 rounded-lg border-[1.5px] text-[12px] font-semibold capitalize transition-all text-center"
                      style={active
                        ? { backgroundColor: colors[s].bg, borderColor: colors[s].border, color: colors[s].color }
                        : { borderColor: '#e8e2d9', color: '#8a8078', backgroundColor: 'white' }}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className={labelCls}>Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              placeholder="Any additional details…"
              className={`${inputCls} resize-none`}
            />
          </div>

          <div className="flex gap-2.5 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg border border-border bg-transparent text-muted text-[14px] font-medium hover:bg-surface2 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!form.title.trim() || saving}
              className="px-6 py-2.5 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-[14px] font-semibold transition-all"
            >
              {isEdit ? 'Save changes' : 'Save entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
