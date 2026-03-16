import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

function StatCard({ number, label, color, onClick }) {
  return (
    <div
      className="card"
      onClick={onClick}
      style={{
        borderTop: `3px solid ${color}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.15s',
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.transform = 'translateY(-2px)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
    >
      <div style={{ fontFamily: 'Black Han Sans', fontSize: '2.8rem', lineHeight: 1, color, marginBottom: 4 }}>
        {number}
      </div>
      <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.78rem', letterSpacing: 2, textTransform: 'uppercase', opacity: 0.6 }}>
        {label}
      </div>
    </div>
  )
}

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-AU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function DashboardPage() {
  const { farm, member } = useAuth()
  const [records, setRecords] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!farm) return
    loadData()
    const channel = supabase
      .channel('dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shed_records', filter: `farm_id=eq.${farm.id}` }, loadData)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [farm])

  async function loadData() {
    setLoading(true)
    const [{ data: recs }, { data: mems }] = await Promise.all([
      supabase.from('shed_records').select('*').eq('farm_id', farm.id).order('checkout_at', { ascending: false }).limit(200),
      supabase.from('farm_members').select('*').eq('farm_id', farm.id),
    ])
    setRecords(recs || [])
    setMembers(mems || [])
    setLoading(false)
  }

  const now = new Date()
  const todayStr = now.toDateString()
  const out = records.filter(r => r.status === 'out')
  const overdue = out.filter(r => r.expected_return_at && new Date(r.expected_return_at) < now)
  const returnedToday = records.filter(r => r.return_at && new Date(r.return_at).toDateString() === todayStr)
  const checkedOutToday = records.filter(r => r.checkout_at && new Date(r.checkout_at).toDateString() === todayStr)
  const recent = records.slice(0, 10)

  // Per-employee stats
  const empStats = members.map(m => ({
    ...m,
    out: records.filter(r => r.status === 'out' && r.checkout_by === m.id).length,
    total: records.filter(r => r.checkout_by === m.id).length,
  })).sort((a, b) => b.total - a.total)

  if (loading) return <div className="page-loader"><span className="spinner big-spinner" /></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        <StatCard number={records.length} label="Total Checkouts" color="var(--hay)" />
        <StatCard number={out.length} label="Currently Out" color="var(--rust)" />
        <StatCard number={overdue.length} label="Overdue" color={overdue.length > 0 ? 'var(--hay)' : 'var(--green-bright)'} />
        <StatCard number={returnedToday.length} label="Returned Today" color="var(--green-bright)" />
        <StatCard number={checkedOutToday.length} label="Checked Out Today" color="var(--rust)" />
        <StatCard number={members.length} label="Team Members" color="var(--hay)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Currently Out */}
        <div className="card">
          <div className="card-title">🔓 Currently Out of Shed</div>
          {out.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <span className="icon">✅</span>All clear!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {out.map(r => {
                const od = r.expected_return_at && new Date(r.expected_return_at) < now
                return (
                  <div key={r.id} style={{
                    background: 'var(--dirt2)', borderRadius: 'var(--radius)', padding: '10px 12px',
                    borderLeft: `3px solid ${od ? 'var(--hay)' : 'var(--rust)'}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <strong style={{ fontSize: '0.92rem' }}>{r.item_name}</strong>
                        {r.destination && <div style={{ fontSize: '0.77rem', opacity: 0.55, marginTop: 1 }}>{r.destination}</div>}
                      </div>
                      {od && <span className="badge badge-overdue">Overdue</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: '0.78rem', opacity: 0.6 }}>
                      <span>{r.checkout_by_name}</span>
                      <span>Out: {fmt(r.checkout_at)}</span>
                      {r.expected_return_at && <span style={{ color: od ? '#f08060' : 'inherit' }}>Due: {fmt(r.expected_return_at)}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Team activity */}
        <div className="card">
          <div className="card-title">👥 Team Activity</div>
          {empStats.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>No team members yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {empStats.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="emp-avatar" style={{ width: 32, height: 32, fontSize: '0.85rem' }}>
                    {m.display_name.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.9rem' }}>{m.display_name}</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.5, fontFamily: 'Barlow Condensed', letterSpacing: 1, textTransform: 'uppercase' }}>
                      {m.role}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.85rem' }}>{m.out} out</div>
                    <div style={{ fontSize: '0.73rem', opacity: 0.5 }}>{m.total} total</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Recent activity feed */}
      <div className="card">
        <div className="card-title">🕐 Recent Activity</div>
        {recent.length === 0 ? (
          <div className="empty-state"><span className="icon">🏚️</span>No activity yet</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {recent.map(r => (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
                fontSize: '0.88rem',
              }}>
                <div style={{ fontSize: '1.1rem' }}>{r.status === 'out' ? '🔓' : '🔒'}</div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600 }}>{r.item_name}</span>
                  <span style={{ opacity: 0.5 }}>
                    {r.status === 'out'
                      ? ` — checked out by ${r.checkout_by_name}`
                      : ` — returned by ${r.return_by_name || r.checkout_by_name}`
                    }
                  </span>
                  {r.destination && <span style={{ opacity: 0.4 }}> → {r.destination}</span>}
                </div>
                <div style={{ fontSize: '0.78rem', opacity: 0.45, whiteSpace: 'nowrap' }}>
                  {fmt(r.status === 'out' ? r.checkout_at : r.return_at)}
                </div>
                {r.status === 'out' && r.expected_return_at && new Date(r.expected_return_at) < now && (
                  <span className="badge badge-overdue">Overdue</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
