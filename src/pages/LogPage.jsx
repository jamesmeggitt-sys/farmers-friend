import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../lib/ToastContext'

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-AU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function RecordModal({ record, onClose, onReturn }) {
  if (!record) return null
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, zIndex: 1000,
      }}
    >
      <div className="card" style={{ maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 14, right: 16, background: 'none', border: 'none', color: 'var(--cream)', fontSize: '1.3rem', cursor: 'pointer', opacity: 0.6 }}
        >✕</button>

        <div className="card-title">📦 {record.item_name}</div>

        <div style={{ display: 'grid', gridTemplateColumns: record.photo_out_url && record.photo_in_url ? '1fr 1fr' : '1fr', gap: 10, marginBottom: 16 }}>
          {record.photo_out_url && (
            <div>
              <div style={{ fontSize: '0.72rem', opacity: 0.5, marginBottom: 4, fontFamily: 'Barlow Condensed', letterSpacing: 1, textTransform: 'uppercase' }}>Photo Out</div>
              <img src={record.photo_out_url} alt="Checkout" style={{ width: '100%', borderRadius: 'var(--radius)', border: '1px solid var(--iron-light)' }} />
            </div>
          )}
          {record.photo_in_url && (
            <div>
              <div style={{ fontSize: '0.72rem', opacity: 0.5, marginBottom: 4, fontFamily: 'Barlow Condensed', letterSpacing: 1, textTransform: 'uppercase' }}>Photo In</div>
              <img src={record.photo_in_url} alt="Return" style={{ width: '100%', borderRadius: 'var(--radius)', border: '1px solid var(--iron-light)' }} />
            </div>
          )}
        </div>

        {[
          ['Item', record.item_name],
          ['Category', record.category || '—'],
          ['Quantity', record.quantity || 1],
          ['Destination', record.destination || '—'],
          ['Checked Out By', record.checkout_by_name],
          ['Checked Out At', fmt(record.checkout_at)],
          ['Expected Return', fmt(record.expected_return_at)],
          ['Checkout Notes', record.checkout_notes || '—'],
          ['Status', record.status === 'out' ? '🔓 Out' : '🔒 Returned'],
          ['Returned By', record.return_by_name || '—'],
          ['Returned At', fmt(record.return_at)],
          ['Condition', record.condition_on_return || '—'],
          ['Return Notes', record.return_notes || '—'],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.88rem', gap: 12 }}>
            <span style={{ opacity: 0.5, fontFamily: 'Barlow Condensed', letterSpacing: 1, textTransform: 'uppercase', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{k}</span>
            <span style={{ textAlign: 'right' }}>{v}</span>
          </div>
        ))}

        {record.status === 'out' && (
          <button className="btn btn-green btn-full" style={{ marginTop: 16 }} onClick={() => onReturn(record)}>
            ↩ Quick Return This Item
          </button>
        )}
      </div>
    </div>
  )
}

export default function LogPage() {
  const { farm } = useAuth()
  const { addToast } = useToast()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [modal, setModal] = useState(null)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 25

  useEffect(() => {
    if (!farm) return
    loadRecords()
    const channel = supabase
      .channel('log-records')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shed_records', filter: `farm_id=eq.${farm.id}` }, loadRecords)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [farm, filter])

  async function loadRecords() {
    setLoading(true)
    let q = supabase.from('shed_records').select('*', { count: 'exact' })
      .eq('farm_id', farm.id)
      .order('checkout_at', { ascending: false })
    if (filter === 'out') q = q.eq('status', 'out')
    if (filter === 'returned') q = q.eq('status', 'returned')
    const { data, error } = await q
    if (!error) setRecords(data || [])
    setLoading(false)
  }

  async function quickReturn(record) {
    const { error } = await supabase.from('shed_records').update({
      status: 'returned',
      return_at: new Date().toISOString(),
      return_by_name: record.checkout_by_name,
      condition_on_return: 'Good — no issues',
    }).eq('id', record.id)
    if (error) { addToast('Failed: ' + error.message, 'error'); return }
    addToast(`🔒 ${record.item_name} marked as returned`)
    setModal(null)
    loadRecords()
  }

  const now = new Date()
  const filtered = records.filter(r => {
    if (!search) return true
    const s = search.toLowerCase()
    return (r.item_name + r.checkout_by_name + (r.category || '') + (r.destination || '')).toLowerCase().includes(s)
  })

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function exportCSV() {
    const headers = ['Item','Category','Qty','Checked Out By','Checked Out At','Expected Return','Status','Returned By','Returned At','Condition','Destination','Notes','Return Notes']
    const rows = filtered.map(r => [
      r.item_name, r.category||'', r.quantity||1, r.checkout_by_name,
      fmt(r.checkout_at), fmt(r.expected_return_at), r.status,
      r.return_by_name||'', fmt(r.return_at), r.condition_on_return||'',
      r.destination||'', (r.checkout_notes||'').replace(/,/g,' '), (r.return_notes||'').replace(/,/g,' ')
    ].map(v => `"${v}"`).join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = `shed-log-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    addToast('📊 CSV exported')
  }

  return (
    <div>
      <div className="card">
        {/* Controls */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="🔍  Search item, employee, destination..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
            style={{ flex: '1 1 200px', maxWidth: 320 }}
          />
          <select value={filter} onChange={e => { setFilter(e.target.value); setPage(0) }} style={{ maxWidth: 180 }}>
            <option value="all">All Records</option>
            <option value="out">Currently Out</option>
            <option value="returned">Returned</option>
          </select>
          <button className="btn btn-iron btn-sm" onClick={exportCSV}>⬇ CSV</button>
          <button className="btn btn-iron btn-sm" onClick={loadRecords}>↻ Refresh</button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><span className="spinner" /></div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Photo</th>
                    <th>Item</th>
                    <th>Employee</th>
                    <th>Checked Out</th>
                    <th>Due Back</th>
                    <th>Status</th>
                    <th>Returned At</th>
                    <th>Condition</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {paged.length === 0 ? (
                    <tr><td colSpan={9}><div className="empty-state"><span className="icon">🏚️</span>No records found</div></td></tr>
                  ) : paged.map(r => {
                    const overdue = r.status === 'out' && r.expected_return_at && new Date(r.expected_return_at) < now
                    return (
                      <tr key={r.id}>
                        <td>
                          {r.photo_out_url
                            ? <img src={r.photo_out_url} className="thumb" alt="" onClick={() => setModal(r)} />
                            : <div className="thumb-placeholder">📷</div>
                          }
                        </td>
                        <td>
                          <strong>{r.item_name}</strong>
                          {r.category && <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>{r.category}</div>}
                        </td>
                        <td>
                          <div className="emp-chip">
                            <div className="emp-avatar">{(r.checkout_by_name || '?').charAt(0)}</div>
                            {r.checkout_by_name}
                          </div>
                        </td>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem' }}>{fmt(r.checkout_at)}</td>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem', color: overdue ? '#f08060' : 'inherit' }}>
                          {fmt(r.expected_return_at)}
                        </td>
                        <td>
                          {r.status === 'out'
                            ? overdue ? <span className="badge badge-overdue">⚠ Overdue</span> : <span className="badge badge-out">Out</span>
                            : <span className="badge badge-in">Returned</span>
                          }
                        </td>
                        <td style={{ fontSize: '0.82rem' }}>{fmt(r.return_at)}</td>
                        <td style={{ fontSize: '0.82rem', maxWidth: 140 }}>{r.condition_on_return || '—'}</td>
                        <td>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setModal(r)}
                          >View</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filtered.length > PAGE_SIZE && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16, alignItems: 'center', fontSize: '0.85rem', opacity: 0.7 }}>
                <button className="btn btn-iron btn-sm" onClick={() => setPage(p => Math.max(0, p-1))} disabled={page === 0}>←</button>
                Page {page + 1} of {Math.ceil(filtered.length / PAGE_SIZE)}
                <button className="btn btn-iron btn-sm" onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= filtered.length}>→</button>
              </div>
            )}
          </>
        )}
      </div>

      <RecordModal record={modal} onClose={() => setModal(null)} onReturn={quickReturn} />
    </div>
  )
}
