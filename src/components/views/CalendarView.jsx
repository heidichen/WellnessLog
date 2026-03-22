import { useState } from 'react'
import { useT } from '../../i18n/LanguageContext.jsx'
import { useApp } from '../../context/AppContext'
import { ENTRY_TYPES } from '../../utils/constants'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isToday, addMonths, subMonths, startOfWeek, endOfWeek
} from 'date-fns'
import DayEntries from '../entries/DayEntries'
import { X, Plus } from 'lucide-react'
import EntryModal from '../entries/EntryModal'

export default function CalendarView() {
  const { entries, filterMemberId } = useApp()
  const { t } = useT()
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
      (filterType === 'all'
        ? !ENTRY_TYPES[e.type]?.calendarHidden
        : e.type === filterType)
    )
  }

  const selectedEntries = selectedDate ? getEntriesForDay(selectedDate) : []

  const chipBase = 'px-3 py-1 rounded-full border text-[11px] font-medium cursor-pointer transition-all'
  const chipInactive = 'border-border bg-surface text-muted hover:border-muted'

  const dayHeaders = t('calendar.days')

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setMonth(m => subMonths(m, 1))}
          className="w-8 h-8 rounded-full border border-border bg-surface flex items-center justify-center text-ink hover:border-accent hover:text-accent active:border-accent active:text-accent transition-all text-sm"
        >
          ←
        </button>
        <h2 className="font-display text-[22px] font-medium text-ink">
          {format(month, 'MMMM yyyy')}
        </h2>
        <button
          onClick={() => setMonth(m => addMonths(m, 1))}
          className="w-8 h-8 rounded-full border border-border bg-surface flex items-center justify-center text-ink hover:border-accent hover:text-accent active:border-accent active:text-accent transition-all text-sm"
        >
          →
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-4">
        <button onClick={() => setFilterType('all')} className={`${chipBase} ${filterType === 'all' ? 'border-accent bg-accent-light text-accent' : chipInactive}`}>
          {t('types.allTypes')}
        </button>
        {Object.entries(ENTRY_TYPES).map(([key, cfg]) => (
          <button key={key} onClick={() => setFilterType(key)} className={chipBase}
            style={filterType === key
              ? { backgroundColor: cfg.lightBg, borderColor: cfg.color, color: cfg.color }
              : { borderColor: '#e8e2d9', backgroundColor: 'white', color: '#8a8078' }}>
            {t(`types.${key}`)}
          </button>
        ))}
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {dayHeaders.map((d, i) => (
          <div key={i} className="text-center font-mono text-[11px] font-semibold text-muted uppercase tracking-[0.5px] py-2">{d}</div>
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
            return <div key={day.toISOString()} className="min-h-[64px] md:min-h-[90px]" />
          }

          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDate(selected ? null : day)}
              className={`min-h-[64px] md:min-h-[90px] rounded-card border p-1.5 md:p-2 text-left transition-all active:shadow-card hover:shadow-card ${
                selected ? 'border-accent shadow-card' :
                today ? 'border-accent' :
                'border-border bg-surface hover:border-muted active:border-muted'
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
                  <div className="hidden md:block text-[10px] text-muted leading-snug line-clamp-2">
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
            {t(`types.${key}`)}
          </div>
        ))}
      </div>

      {/* Day detail — centered modal */}
      {selectedDate && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-4"
          style={{ background: 'rgba(26,23,20,0.4)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setSelectedDate(null) }}
        >
          <div className="bg-surface rounded-2xl w-full max-w-lg shadow-lg flex flex-col" style={{ maxHeight: '80vh' }}>
            <div className="flex items-start justify-between px-6 pt-6 pb-4 flex-shrink-0">
              <div>
                <h3 className="font-display text-[18px] font-medium text-ink">
                  {format(selectedDate, 'EEEE, MMMM d')}
                </h3>
                <p className="text-[12px] text-muted mt-0.5">
                  {t('calendar.entries', { count: selectedEntries.length })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAddingForDate(format(selectedDate, 'yyyy-MM-dd'))}
                  className="flex items-center gap-1 bg-accent hover:bg-accent-hover active:bg-accent-hover text-white px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
                >
                  <Plus size={13} /> {t('calendar.addEntry')}
                </button>
                <button onClick={() => setSelectedDate(null)} className="p-2 text-muted hover:text-ink active:text-ink transition-colors rounded-full hover:bg-surface2">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto px-6 pb-6">
              {selectedEntries.length === 0
                ? <p className="text-[13px] text-muted text-center py-8">{t('calendar.noEntries')}</p>
                : <DayEntries entries={[...selectedEntries].sort((a, b) => (a.time || '').localeCompare(b.time || ''))} />
              }
            </div>
          </div>
        </div>
      )}
      {addingForDate && (
        <EntryModal
          defaultDate={addingForDate}
          onClose={() => setAddingForDate(null)}
        />
      )}
    </div>
  )
}
