import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { ENTRY_TYPES } from '../../utils/constants'
import { format, parseISO } from 'date-fns'
import DayEntries from '../entries/DayEntries'

export default function LogView() {
  const { entries, filterMemberId } = useApp()
  const [filterType, setFilterType] = useState('all')

  const filtered = entries
    .filter(e => !filterMemberId || e.memberId === filterMemberId)
    .filter(e => filterType === 'all' || e.type === filterType)
    .sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')))

  const grouped = {}
  filtered.forEach(e => {
    if (!grouped[e.date]) grouped[e.date] = []
    grouped[e.date].push(e)
  })
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  const chipBase = 'px-3.5 py-1.5 rounded-full border text-[12px] font-medium cursor-pointer transition-all'
  const chipInactive = 'border-border bg-surface text-muted hover:border-muted'

  return (
    <div>
      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-5">
        <button
          onClick={() => setFilterType('all')}
          className={`${chipBase} ${filterType === 'all' ? 'border-accent bg-accent-light text-accent' : chipInactive}`}
        >
          All types
        </button>
        {Object.entries(ENTRY_TYPES).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setFilterType(key)}
            className={`${chipBase}`}
            style={filterType === key
              ? { backgroundColor: cfg.lightBg, borderColor: cfg.color, color: cfg.color }
              : { borderColor: '#e8e2d9', backgroundColor: 'white', color: '#8a8078' }}
          >
            {cfg.label}
          </button>
        ))}
      </div>

      {dates.length === 0 && (
        <div className="text-center py-16 text-muted">
          <div className="text-4xl mb-3">📋</div>
          <p className="font-display text-lg text-muted">No entries yet</p>
          <p className="text-[13px] mt-1 text-muted">Press "Add entry" to get started</p>
        </div>
      )}

      <div className="space-y-6">
        {dates.map(date => (
          <div key={date}>
            <div className="font-mono text-[11px] font-semibold text-muted uppercase tracking-[0.8px] mb-2 pb-1.5 border-b border-border">
              {format(parseISO(date), 'EEEE, MMMM d')}
            </div>
            <DayEntries entries={grouped[date]} />
          </div>
        ))}
      </div>
    </div>
  )
}
