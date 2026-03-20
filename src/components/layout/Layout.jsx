import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { MEMBER_COLORS } from '../../utils/constants'
import { exportData, importData } from '../../utils/api'
import EntryModal from '../entries/EntryModal'
import { Calendar, List, TrendingUp, Users, Plus, Download, Upload } from 'lucide-react'

const NAV = [
  { id: 'log', label: 'Log', Icon: List },
  { id: 'calendar', label: 'Calendar', Icon: Calendar },
  { id: 'trends', label: 'Trends', Icon: TrendingUp },
  { id: 'members', label: 'Family', Icon: Users },
]

export default function Layout({ view, setView, children }) {
  const { members, activeMemberId, setActiveMemberId, filterMemberId, setFilterMemberId, reloadData } = useApp()

  function handleAvatarClick(id) {
    setFilterMemberId(filterMemberId === id ? null : id)
    setActiveMemberId(id)
  }
  const [showEntryModal, setShowEntryModal] = useState(false)
  const [importError, setImportError] = useState('')

  function getMemberColor(member) {
    return MEMBER_COLORS.find(c => c.id === member.color)?.hex || '#8a8078'
  }

  async function handleImport(e) {
    const file = e.target.files[0]
    if (!file) return
    try {
      await importData(file)
      await reloadData()
      setImportError('')
    } catch {
      setImportError('Invalid backup file')
    }
    e.target.value = ''
  }

  return (
    <div className="min-h-screen bg-bg font-body text-ink">
      {/* Header */}
      <header className="bg-surface border-b border-border sticky top-0 z-40" style={{ height: '60px' }}>
        <div className="max-w-5xl mx-auto px-6 h-full flex items-center gap-6">
          <div className="font-display text-xl font-medium tracking-tight">
            Wellness<span className="text-accent">Log</span>
          </div>

          {/* Nav */}
          <nav className="flex gap-1 ml-2">
            {NAV.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                  view === id
                    ? 'bg-accent-light text-accent'
                    : 'text-muted hover:bg-surface2'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {/* Member switcher */}
            {members.length > 0 && (
              <div className="flex items-center gap-1.5">
                {members.map(m => (
                  <button
                    key={m.id}
                    onClick={() => handleAvatarClick(m.id)}
                    title={filterMemberId === m.id ? `${m.name} (click to show all)` : m.name}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold transition-all ${
                      filterMemberId === m.id ? 'ring-2 ring-offset-1 ring-accent scale-110' : filterMemberId ? 'opacity-30 hover:opacity-70' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: getMemberColor(m) }}
                  >
                    {m.name.charAt(0).toUpperCase()}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-0.5">
              <button onClick={exportData} title="Export" className="p-1.5 text-muted hover:text-ink transition-colors">
                <Download size={15} />
              </button>
              <label title="Import" className="p-1.5 text-muted hover:text-ink transition-colors cursor-pointer">
                <Upload size={15} />
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>
            </div>

            <button
              onClick={() => setShowEntryModal(true)}
              className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-full text-[13px] font-semibold transition-all hover:-translate-y-px"
            >
              <Plus size={14} />
              Add entry
            </button>
          </div>
        </div>
        {importError && <p className="text-xs text-center text-symptom pb-1">{importError}</p>}
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6">
        {children}
      </main>

      {showEntryModal && <EntryModal onClose={() => setShowEntryModal(false)} />}
    </div>
  )
}
