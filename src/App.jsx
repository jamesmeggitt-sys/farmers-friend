import { useState } from 'react'
import { useAuth } from './lib/AuthContext'
import AppHeader from './components/AppHeader'
import AuthPage from './pages/AuthPage'
import CheckoutPage from './pages/CheckoutPage'
import CheckinPage from './pages/CheckinPage'
import LogPage from './pages/LogPage'
import DashboardPage from './pages/DashboardPage'

export default function App() {
  const { user, farm, loading } = useAuth()
  const [tab, setTab] = useState('dashboard')

  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner big-spinner" />
        <div style={{ fontFamily: 'Barlow Condensed', letterSpacing: 2, opacity: 0.5, fontSize: '0.85rem', textTransform: 'uppercase' }}>
          Loading shed...
        </div>
      </div>
    )
  }

  if (!user || !farm) return <AuthPage />

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppHeader activeTab={tab} onTabChange={setTab} />
      <main style={{ flex: 1, maxWidth: 1100, margin: '0 auto', width: '100%', padding: '24px 20px' }}>
        {tab === 'checkout'  && <CheckoutPage />}
        {tab === 'checkin'   && <CheckinPage />}
        {tab === 'log'       && <LogPage />}
        {tab === 'dashboard' && <DashboardPage />}
      </main>
      <footer style={{ textAlign: 'center', padding: '16px', opacity: 0.25, fontSize: '0.75rem', fontFamily: 'Barlow Condensed', letterSpacing: 2, textTransform: 'uppercase' }}>
        Who's Been In My Shed?! · Farm Traceability · Phase 1
      </footer>
    </div>
  )
}
