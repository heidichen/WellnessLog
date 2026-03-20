import { useState, useRef, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { ENTRY_TYPES } from '../../utils/constants'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isToday, parseISO, addMonths, subMonths, startOfWeek, endOfWeek
} from 'date-fns'
import DayEntries from '../entries/DayEntries'
import { X, Plus } from 'lucide-react'
import EntryModal from '../entries/EntryModal'

export default function CalendarView() {
  const { entries, filterMemberId } = useApp()
  const [month, setMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [filterType, setFilterType] = useState('all')
  const [addingForDate, setAddingForDate] = useState(null)

  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 })
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start, end })

  function getEntriesForDay(date) {
    const dateStr = format(date, 'yyyy-MM-dd')
    return entries.filter(e =>
      e.date === dateStr &&
      (!filterMemberId || e.memberId === filterMemberId) &&
      (filterType === 'all' || e.type === filterType)
    )
  }

  const selectedEntries = selectedDate ? getEntriesForDay(selectedDate) : []

  const chipBase = 'px-3 py-1 rounded-full border text-[11px] font-medium cursor-pointer transition-all'
  const chipInactive = 'border-border bg-surface text-muted hover:border-muted'

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setMonth(m => subMonths(m, 1))}
          className="w-8 h-8 rounded-full border border-border bg-surface flex items-center justify-center text-ink hover:border-accent hover:text-accent transition-all text-sm"
        >
          ←
        </button>
        <h2 className="font-display text-[22px] font-medium text-ink">
          {format(month, 'MMMM yyyy')}
        </h2>
        <button
          onClick={() => setMonth(m => addMonths(m, 1))}
          className="w-8 h-8 rounded-full border border-border bg-surface flex items-center justify-center text-ink hover:border-accent hover:text-accent transition-all text-sm"
        >
          →
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-4">
        <button onClick={() => setFilterType('all')} className={`${chipBase} ${filterType === 'all' ? 'border-accent bg-accent-light text-accent' : chipInactive}`}>
          All types
        </button>
        {Object.entries(ENTRY_TYPES).map(([key, cfg]) => (
          <button key={key} onClick={() => setFilterType(key)} className={chipBase}
            style={filterType === key
              ? { backgroundColor: cfg.lightBg, borderColor: cfg.color, color: cfg.color }
              : { borderColor: '#e8e2d9', backgroundColor: 'white', color: '#8a8078' }}>
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-center font-mono text-[11px] font-semibold text-muted uppercase tracking-[0.5px] py-2">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map(day => {
          const dayEntries = getEntriesForDay(day)
          const inMonth = isSameMonth(day, month)
          const today = isToday(day)
          const selected = selectedDate && format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')

          if (!inMonth) {
            return <div key={day.toISOString()} className="min-h-[90px]" />
          }

          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDate(selected ? null : day)}
              className={`min-h-[90px] rounded-card border p-2 text-left transition-all hover:shadow-card ${
                selected ? 'border-accent shadow-card' :
                today ? 'border-accent' :
                'border-border bg-surface hover:border-muted'
              } bg-surface`}
            >
              <div className={`text-[12px] font-semibold mb-1 ${today ? 'text-accent' : 'text-muted'}`}>
                {format(day, 'd')}
              </div>
              {dayEntries.length > 0 && (
                <>
                  <div className="flex flex-wrap gap-1 mb-1">
                    {[...new Set(dayEntries.map(e => e.type))].slice(0, 4).map(type => (
                      <div key={type} className="w-2 h-2 rounded-full" style={{ backgroundColor: ENTRY_TYPES[type]?.color }} />
                    ))}
                  </div>
                  <div className="text-[10px] text-muted leading-snug line-clamp-2">
                    {dayEntries.slice(0, 2).map(e => e.title).join(', ')}
                    {dayEntries.length > 2 && ` +${dayEntries.length - 2}`}
                  </div>
                </>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-4 flex-wrap">
        {Object.entries(ENTRY_TYPES).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5 text-[12px] text-muted font-medium">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
            {cfg.label}
          </div>
        ))}
      </div>

      {/* Day detail — bottom sheet */}
      <div
        className={`fixed inset-0 z-40 flex items-end justify-center transition-opacity duration-200 ${selectedDate ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{ background: 'rgba(26,23,20,0.3)' }}
        onClick={e => { if (e.target === e.currentTarget) setSelectedDate(null) }}
      >
        <div
          className={`bg-surface rounded-t-2xl w-full max-w-2xl max-h-[70vh] overflow-y-auto shadow-lg transition-transform duration-300 ${selectedDate ? 'translate-y-0' : 'translate-y-full'}`}
          style={{ padding: '24px' }}
        >
          {selectedDate && (
            <>
              <div className="flex items-start justify-between mb-1">
                <div>
                  <h3 className="font-display text-[18px] font-medium text-ink">
                    {format(selectedDate, 'EEEE, MMMM d')}
                  </h3>
                  <p className="text-[12px] text-muted mt-0.5">
                    {selectedEntries.length} {selectedEntries.length === 1 ? 'entry' : 'entries'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAddingForDate(format(selectedDate, 'yyyy-MM-dd'))}
                    className="flex items-center gap-1 bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
                  >
                    <Plus size={13} /> Add entry
                  </button>
                  <button onClick={() => setSelectedDate(null)} className="p-1 text-muted hover:text-ink transition-colors">
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {selectedEntries.length === 0
                  ? <p className="text-[13px] text-muted text-center py-8">No entries for this day</p>
                  : <DayEntries entries={[...selectedEntries].sort((a, b) => (a.time || '').localeCompare(b.time || ''))} />
                }
              </div>
            </>
          )}
        </div>
      </div>
      {addingForDate && (
        <EntryModal
          defaultDate={addingForDate}
          onClose={() => setAddingForDate(null)}
        />
      )}
    </div>
  )
}
