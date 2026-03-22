import { useState } from 'react'
import { useT } from '../../i18n/LanguageContext.jsx'
import { useApp } from '../../context/AppContext'
import { ENTRY_TYPES, MEMBER_COLORS } from '../../utils/constants'
import { format, parseISO } from 'date-fns'
import EntryModal from './EntryModal'
import { Pencil, Trash2 } from 'lucide-react'

export default function EntryCard({ entry, hideMember = false }) {
  const { members, deleteEntry } = useApp()
  const { t } = useT()
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const member = members.find(m => m.id === entry.memberId)
  const typeConfig = ENTRY_TYPES[entry.type] || ENTRY_TYPES.food
  const memberColor = MEMBER_COLORS.find(c => c.id === member?.color)?.hex || '#8a8078'

  async function handleDelete() {
    if (confirmDelete) {
      await deleteEntry(entry.id)
    } else {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 3000)
    }
  }

  return (
    <>
      <div className="bg-surface border border-border rounded-card p-3.5 flex items-start gap-3.5 transition-all hover:shadow-card group" style={{ cursor: 'default' }}>
        {/* Type badge */}
        <span
          className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 mt-0.5"
          style={{ background: typeConfig.lightBg, color: typeConfig.color }}
        >
          {t(`types.${entry.type}`, entry.type)}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-semibold text-ink leading-snug">{entry.title}</span>
            {entry.type === 'symptom' && entry.severity && (
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                entry.severity === 'mild' ? 'bg-activity-light text-activity'
                : entry.severity === 'moderate' ? 'bg-activity-light text-activity'
                : 'bg-symptom-light text-symptom'
              }`}>
                {t(`severity.${entry.severity}`, entry.severity)}
              </span>
            )}
            {entry.type === 'sleep' && entry.sleepQuality && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{
                backgroundColor: { poor: '#faeee8', fair: '#f7f3e3', good: '#edf5ed', great: '#eaeff8' }[entry.sleepQuality] || '#eaeff8',
                color: { poor: '#c07b5a', fair: '#b5a046', good: '#6b9e6b', great: '#7b8fb5' }[entry.sleepQuality] || '#7b8fb5',
              }}>
                {t(`sleepQuality.${entry.sleepQuality}`, entry.sleepQuality)}
              </span>
            )}
          </div>
          {entry.notes && <p className="text-[12px] text-muted mt-0.5 leading-relaxed">{entry.notes}</p>}
          {!hideMember && member && (
            <p className="text-[11px] font-medium mt-0.5" style={{ color: memberColor }}>{member.name}</p>
          )}
          {entry.photoDataUrl && (
            <img src={entry.photoDataUrl} alt="food" className="mt-2 w-16 h-16 object-cover rounded-lg border border-border" />
          )}
        </div>

        {/* Time + actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="font-mono text-[11px] text-muted">
            {entry.time || format(parseISO(entry.date), 'MMM d')}
          </span>
          <div className="flex gap-0.5 opacity-30 group-hover:opacity-100 transition-opacity">
            <button onClick={() => setEditing(true)} className="p-2 text-muted hover:text-ink active:text-ink transition-colors rounded-lg hover:bg-surface2 active:bg-surface2">
              <Pencil size={14} />
            </button>
            <button
              onClick={handleDelete}
              className={`p-2 transition-colors rounded-lg hover:bg-surface2 active:bg-surface2 ${confirmDelete ? 'text-symptom' : 'text-muted hover:text-symptom active:text-symptom'}`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {editing && <EntryModal onClose={() => setEditing(false)} initialEntry={entry} />}
    </>
  )
}
