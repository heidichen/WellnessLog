import { useAuth } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import Layout from './components/layout/Layout'
import AuthView from './components/views/AuthView'
import CalendarView from './components/views/CalendarView'
import LogView from './components/views/LogView'
import TrendsView from './components/views/TrendsView'
import MembersView from './components/views/MembersView'
import ProfileView from './components/views/ProfileView'
import { useState } from 'react'
import { useT } from './i18n/LanguageContext'

function AppInner() {
  const [view, setView] = useState('calendar')
  const { t } = useT()

  const views = {
    calendar: <CalendarView />,
    log: <LogView />,
    trends: <TrendsView />,
    members: <MembersView />,
    profile: <ProfileView />,
  }

  return (
    <Layout view={view} setView={setView}>
      {views[view] || views.calendar}
    </Layout>
  )
}

export default function App() {
  const { user } = useAuth()
  const { t } = useT()

  if (user === undefined) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center">
        <p className="text-[#8a8078] text-sm">{t('app.loading')}</p>
      </div>
    )
  }

  if (!user) return <AuthView />

  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  )
}
