import { useState, useRef } from 'react'
import { useT } from '../../i18n/LanguageContext.jsx'
import { useApp } from '../../context/AppContext'
import { ENTRY_TYPES, SEVERITY_LEVELS, SLEEP_QUALITY_LEVELS, MEMBER_COLORS } from '../../utils/constants'
import { analyzeFood, fileToBase64 } from '../../utils/claude'
import { format } from 'date-fns'
import AutocompleteInput from './AutocompleteInput'
import { X, Camera, Loader2, AlertCircle } from 'lucide-react'

export default function EntryModal({ onClose, initialEntry = null, defaultDate = null }) {
  const { members, activeMemberId, addEntry, updateEntry, getAutocomplete } = useApp()
  const { t } = useT()
  const isEdit = !!initialEntry

  const [form, setForm] = useState({
    memberId: initialEntry?.memberId || activeMemberId || members[0]?.id || '',
    type: initialEntry?.type || 'food',
    date: initialEntry?.date || defaultDate || format(new Date(), 'yyyy-MM-dd'),
    time: initialEntry?.time ?? '',
    title: initialEntry?.title || '',
    notes: initialEntry?.notes || '',
    severity: initialEntry?.severity || 'mild',
    sleepQuality: initialEntry?.sleepQuality || 'good',
    sleepDuration: initialEntry?.sleepDuration || '',
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
    const isSleep = form.type === 'sleep'
    const isNote = form.type === 'note'
    if (!isSleep && !isNote && !form.title.trim()) return
    setSaving(true)
    try {
      const data = isSleep
        ? { ...form, title: form.sleepDuration ? `${form.sleepDuration}h sleep` : 'Sleep' }
        : isNote
        ? { ...form, title: form.title.trim() || 'Note' }
        : form
      if (isEdit) await updateEntry(initialEntry.id, data)
      else await addEntry(data)
      onClose()
    } catch {
      setSaving(false)
    }
  }

  const labelCls = 'block font-mono text-[11px] font-semibold text-muted uppercase tracking-[0.5px] mb-1.5'
  const inputCls = 'w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-bg text-ink placeholder:text-muted outline-none transition-colors focus:border-accent'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(26,23,20,0.4)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-surface rounded-2xl shadow-lg w-full max-w-[480px] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-7 pt-7 pb-5">
          <h2 className="font-display text-[20px] font-medium text-ink">
            {isEdit ? t('entry.editEntry') : t('entry.newEntry')}
          </h2>
          <button onClick={onClose} className="p-1 text-muted hover:text-ink transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-7 pb-7 space-y-4">
          {/* Member */}
          {members.length > 1 && (
            <div>
              <label className={labelCls}>{t('entry.memberLabel')}</label>
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
            <label className={labelCls}>{t('entry.typeLabel')}</label>
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
                    {t(`types.${key}`)}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Date & Time */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className={labelCls}>{t('entry.dateLabel')}</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={inputCls} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-mono text-[11px] font-semibold text-muted uppercase tracking-[0.5px]">{t('entry.timeLabel')}</label>
                <button type="button" onClick={() => { setShowTime(v => !v); set('time', '') }} className="text-[11px] text-muted hover:text-ink transition-colors">
                  {showTime ? t('entry.timeRemove') : t('entry.timeAdd')}
                </button>
              </div>
              {showTime
                ? <input type="time" value={form.time} onChange={e => set('time', e.target.value)} className={inputCls} />
                : <div className="w-full border border-dashed border-border rounded-lg px-3 py-2.5 text-[12px] text-muted text-center bg-surface2">{t('entry.timeOptional')}</div>
              }
            </div>
          </div>

          {/* Title (not for sleep or note) */}
          {form.type !== 'sleep' && form.type !== 'note' && (
            <div>
              <label className={labelCls}>
                {form.type === 'food' ? t('entry.titleFood')
                  : form.type === 'symptom' ? t('entry.titleSymptom')
                  : form.type === 'medication' ? t('entry.titleMedication')
                  : t('entry.titleActivity')}
              </label>
              <AutocompleteInput
                value={form.title}
                onChange={v => set('title', v)}
                onSelect={handleTitleSelect}
                suggestions={suggestions}
                placeholder={t('entry.titlePlaceholder')}
              />
            </div>
          )}

          {/* Photo (food only) */}
          {form.type === 'food' && (
            <div>
              <label className={labelCls}>{t('entry.photoLabel')}</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={photoLoading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-[13px] text-muted hover:border-accent hover:text-accent transition-all disabled:opacity-50"
                >
                  {photoLoading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                  {photoLoading ? t('entry.analyzing') : t('entry.addPhoto')}
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

          {/* Sleep quality + duration */}
          {form.type === 'sleep' && (
            <>
              <div>
                <label className={labelCls}>{t('entry.sleepQualityLabel')}</label>
                <div className="flex gap-2">
                  {SLEEP_QUALITY_LEVELS.map(q => {
                    const active = form.sleepQuality === q
                    const colors = {
                      poor:  { bg: '#faeee8', border: '#c07b5a', color: '#c07b5a' },
                      fair:  { bg: '#f7f3e3', border: '#b5a046', color: '#b5a046' },
                      good:  { bg: '#edf5ed', border: '#6b9e6b', color: '#6b9e6b' },
                      great: { bg: '#eaeff8', border: '#7b8fb5', color: '#7b8fb5' },
                    }
                    return (
                      <button
                        key={q}
                        type="button"
                        onClick={() => set('sleepQuality', q)}
                        className="flex-1 py-2 rounded-lg border-[1.5px] text-[12px] font-semibold capitalize transition-all text-center"
                        style={active
                          ? { backgroundColor: colors[q].bg, borderColor: colors[q].border, color: colors[q].color }
                          : { borderColor: '#e8e2d9', color: '#8a8078', backgroundColor: 'white' }}
                      >
                        {t(`sleepQuality.${q}`)}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className={labelCls}>{t('entry.durationLabel')}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    value={form.sleepDuration}
                    onChange={e => set('sleepDuration', e.target.value)}
                    placeholder={t('entry.durationPlaceholder')}
                    className={`${inputCls} w-32`}
                  />
                  <span className="text-[13px] text-muted">{t('entry.hours')}</span>
                </div>
              </div>
            </>
          )}

          {/* Severity (symptom only) */}
          {form.type === 'symptom' && (
            <div>
              <label className={labelCls}>{t('entry.severityLabel')}</label>
              <div className="flex gap-2">
                {SEVERITY_LEVELS.map(s => {
                  const active = form.severity === s
                  const colors = {
                    mild:     { bg: '#edf5ed', border: '#6b9e6b', color: '#6b9e6b' },
                    moderate: { bg: '#f7f3e3', border: '#b5a046', color: '#b5a046' },
                    severe:   { bg: '#faeee8', border: '#c07b5a', color: '#c07b5a' },
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
                      {t(`severity.${s}`)}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className={labelCls}>{form.type === 'note' ? t('entry.noteLabel') : t('entry.notesLabel')}</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={form.type === 'note' ? 5 : 2}
              placeholder={form.type === 'note' ? t('entry.notePlaceholder') : t('entry.notesPlaceholder')}
              className={`${inputCls} resize-none`}
            />
          </div>

          <div className="flex gap-2.5 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg border border-border bg-transparent text-muted text-[14px] font-medium hover:bg-surface2 transition-colors">
              {t('entry.cancel')}
            </button>
            <button
              type="submit"
              disabled={(form.type !== 'sleep' && form.type !== 'note' && !form.title.trim()) || saving}
              className="px-6 py-2.5 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-[14px] font-semibold transition-all"
            >
              {isEdit ? t('entry.saveChanges') : t('entry.saveEntry')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
