import { useState } from 'react'
import { useT } from '../../i18n/LanguageContext.jsx'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import { MEMBER_COLORS } from '../../utils/constants'
import { exportData, importData } from '../../utils/api'
import EntryModal from '../entries/EntryModal'
import { Calendar, List, TrendingUp, Users, Plus, Download, Upload, WifiOff, User, X } from 'lucide-react'

const NAV_IDS = [
  { id: 'calendar', Icon: Calendar },
  { id: 'log',      Icon: List },
  { id: 'trends',   Icon: TrendingUp },
  { id: 'members',  Icon: Users },
  { id: 'profile',  Icon: User },
]

export default function Layout({ view, setView, children }) {
  const { members, activeMemberId, setActiveMemberId, filterMemberId, setFilterMemberId, reloadData, isOnline } = useApp()
  const { user, guestBannerDismissed, dismissGuestBanner } = useAuth()
  const { t, lang, toggleLang } = useT()
  const [showEntryModal, setShowEntryModal] = useState(false)
  const [importError, setImportError] = useState('')

  function handleAvatarClick(id) {
    setFilterMemberId(filterMemberId === id ? null : id)
    setActiveMemberId(id)
  }

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
      setImportError(t('header.importError'))
    }
    e.target.value = ''
  }


  return (
    <div className="min-h-screen bg-bg font-body text-ink">
      {/* Header */}
      <header className="bg-surface border-b border-border sticky top-0 z-40" style={{ minHeight: '60px' }}>
        <div className="max-w-5xl mx-auto px-4 md:px-6 h-full flex items-center gap-3 md:gap-6" style={{ minHeight: '60px' }}>

          {/* Logo */}
          <div className="font-display text-lg md:text-xl font-medium tracking-tight flex-shrink-0">
            Wellness<span className="text-accent">Log</span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex gap-1 ml-2">
            {NAV_IDS.map(({ id, Icon }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={`px-4 py-2 rounded-full text-[13px] font-medium transition-colors ${
                  view === id ? 'bg-accent-light text-accent' : 'text-muted hover:bg-surface2 active:bg-surface2'
                }`}
              >
                {t(`nav.${id}`)}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5 md:gap-3">
            {/* Member avatars */}
            {members.length > 0 && (
              <div className="flex items-center gap-1 md:gap-1.5">
                {members.map(m => (
                  <button
                    key={m.id}
                    onClick={() => handleAvatarClick(m.id)}
                    title={filterMemberId === m.id ? `${m.name}` : m.name}
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold transition-all active:scale-95 ${
                      filterMemberId === m.id ? 'ring-2 ring-offset-1 ring-accent scale-110' : filterMemberId ? 'opacity-30 active:opacity-70' : 'opacity-70 active:opacity-100'
                    }`}
                    style={{ backgroundColor: getMemberColor(m) }}
                  >
                    {m.name.charAt(0).toUpperCase()}
                  </button>
                ))}
              </div>
            )}

            {/* Language toggle */}
            <button
              onClick={toggleLang}
              className="w-10 h-10 flex items-center justify-center text-muted hover:text-ink active:text-ink transition-colors rounded-full hover:bg-surface2 active:bg-surface2 font-mono text-[12px] font-semibold"
            >
              {lang === 'en' ? '中' : 'EN'}
            </button>

            {/* Export / Import */}
            <div className="flex items-center">
              <button
                onClick={exportData}
                title="Export"
                className="w-10 h-10 flex items-center justify-center text-muted hover:text-ink active:text-ink transition-colors rounded-full hover:bg-surface2 active:bg-surface2"
              >
                <Download size={16} />
              </button>
              <label
                title="Import"
                className="w-10 h-10 flex items-center justify-center text-muted hover:text-ink active:text-ink transition-colors cursor-pointer rounded-full hover:bg-surface2 active:bg-surface2"
              >
                <Upload size={16} />
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>
            </div>

            {/* Add entry — desktop only */}
            <button
              onClick={() => setShowEntryModal(true)}
              className="hidden md:flex items-center gap-1.5 bg-accent hover:bg-accent-hover active:bg-accent-hover text-white px-4 py-2 rounded-full text-[13px] font-semibold transition-all hover:-translate-y-px active:scale-95"
            >
              <Plus size={14} />
              {t('header.addEntry')}
            </button>
          </div>
        </div>
        {importError && <p className="text-xs text-center text-symptom pb-1">{importError}</p>}
      </header>

      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-center gap-2 text-[13px] text-amber-700 font-medium">
          <WifiOff size={14} />
          {t('header.offlineBanner')}
        </div>
      )}

      {/* Guest banner */}
      {user?.isGuest && !guestBannerDismissed && (
        <div className="bg-[#fdf3ea] border-b border-[#f0d9c4] px-4 py-2.5 flex items-center justify-between gap-3">
          <p className="text-[12px] text-[#8a6040] flex-1">
            You're using WellnessLog as a guest.{' '}
            <button onClick={() => setView('profile')} className="underline font-medium">Create an account</button>
            {' '}to sync across devices and share with family.
          </p>
          <button onClick={dismissGuestBanner} className="text-[#b0a898] flex-shrink-0"><X size={14} /></button>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 md:px-6 py-4 md:py-6 pb-28 md:pb-6">
        {children}
      </main>

      {/* Bottom nav — mobile only */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-border">
        <div className="flex" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {NAV_IDS.map(({ id, Icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors active:bg-surface2 ${
                view === id ? 'text-accent' : 'text-muted'
              }`}
              style={{ minHeight: '56px' }}
            >
              <Icon size={20} />
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wide">{t(`nav.${id}`)}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* FAB — mobile only */}
      <button
        onClick={() => setShowEntryModal(true)}
        className="md:hidden fixed z-50 bg-accent active:bg-accent-hover text-white shadow-lg flex items-center justify-center transition-all active:scale-95"
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          bottom: `calc(64px + env(safe-area-inset-bottom))`,
          right: '20px',
        }}
      >
        <Plus size={24} />
      </button>

      {showEntryModal && <EntryModal onClose={() => setShowEntryModal(false)} />}
    </div>
  )
}
