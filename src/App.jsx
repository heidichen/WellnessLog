import { useState } from 'react'
import { useT } from './i18n/LanguageContext.jsx'
import { AppProvider, useApp } from './context/AppContext'
import Layout from './components/layout/Layout'
import CalendarView from './components/views/CalendarView'
import LogView from './components/views/LogView'
import TrendsView from './components/views/TrendsView'
import MembersView from './components/views/MembersView'

function AppInner() {
  const { loading } = useApp()
  const { t } = useT()
  const [view, setView] = useState('calendar')

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <p className="font-display text-[28px] font-medium text-ink">Wellness<span className="text-accent">Log</span></p>
          <p className="text-[13px] text-muted mt-2 font-mono">{t('app.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <Layout view={view} setView={setView}>
      {view === 'calendar' && <CalendarView />}
      {view === 'log' && <LogView />}
      {view === 'trends' && <TrendsView />}
      {view === 'members' && <MembersView />}
    </Layout>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  )
}
