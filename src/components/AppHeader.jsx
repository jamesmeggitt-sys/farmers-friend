import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'

export default function AppHeader({ activeTab, onTabChange }) {
  const { farm, member, signOut } = useAuth()
  const [time, setTime] = useState(new Date())
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const tabs = [
    { id: 'checkout', label: '🔓 Check Out' },
    { id: 'checkin',  label: '🔒 Check In' },
    { id: 'log',      label: '📋 Shed Log' },
    { id: 'dashboard',label: '📊 Dashboard' },
  ]

  return (
    <header style={{
      background: 'var(--plank)',
      borderBottom: '3px solid var(--rust)',
      boxShadow: '0 3px 20px var(--shadow)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 20px',
        background: 'rgba(0,0,0,0.2)',
      }}>
        <span style={{ fontSize: '1.8rem' }}>🏚️</span>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '1.4rem', lineHeight: 1, textShadow: '2px 2px 0 var(--rust-dark)' }}>
            WHO'S BEEN IN MY SHED?!
          </h1>
          <div style={{ fontSize: '0.75rem', opacity: 0.6, fontFamily: 'Barlow Condensed', letterSpacing: 2, textTransform: 'uppercase', marginTop: 2 }}>
            {farm?.name || 'Loading...'}
          </div>
        </div>

        {/* Clock */}
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 1 }}>
          <div style={{ fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: '1.2rem', color: 'var(--hay)', letterSpacing: 2 }}>
            {time.toLocaleTimeString('en-AU')}
          </div>
          <div style={{ fontSize: '0.7rem', opacity: 0.55, letterSpacing: 1 }}>
            {time.toLocaleDateString('en-AU', { weekday: 'short', day: '2-digit', month: 'short' })}
          </div>
        </div>

        {/* User menu */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setMenuOpen(o => !o)}
            style={{ gap: 6 }}
          >
            <div className="emp-avatar" style={{ width: 22, height: 22, fontSize: '0.7rem' }}>
              {(member?.display_name || 'U').charAt(0)}
            </div>
            <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {member?.display_name || 'User'}
            </span>
          </button>
          {menuOpen && (
            <div style={{
              position: 'absolute', right: 0, top: '110%',
              background: 'var(--plank2)', border: '1.5px solid var(--iron-light)',
              borderRadius: 'var(--radius)', minWidth: 160, overflow: 'hidden',
              boxShadow: '0 8px 24px var(--shadow-lg)', zIndex: 200,
            }}>
              <div style={{ padding: '10px 14px', fontSize: '0.8rem', opacity: 0.6, borderBottom: '1px solid var(--iron-light)' }}>
                {member?.role?.toUpperCase()}
              </div>
              <button
                onClick={() => { signOut(); setMenuOpen(false) }}
                style={{ width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', color: 'var(--cream)', cursor: 'pointer', fontFamily: 'Barlow', fontSize: '0.9rem' }}
                onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={e => e.target.style.background = 'none'}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 2, padding: '0 16px', background: 'rgba(0,0,0,0.15)' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            style={{
              fontFamily: 'Barlow Condensed',
              fontWeight: 700,
              fontSize: '0.88rem',
              letterSpacing: 2,
              textTransform: 'uppercase',
              padding: '10px 18px',
              background: 'none',
              border: 'none',
              borderBottom: `3px solid ${activeTab === t.id ? 'var(--hay)' : 'transparent'}`,
              color: activeTab === t.id ? 'var(--hay)' : 'var(--cream)',
              opacity: activeTab === t.id ? 1 : 0.5,
              cursor: 'pointer',
              transition: 'all 0.15s',
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
    </header>
  )
}
