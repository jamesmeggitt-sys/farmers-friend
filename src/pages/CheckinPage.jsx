import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../lib/ToastContext'
import CameraCapture from '../components/CameraCapture'

const CONDITIONS = [
  'Good — no issues',
  'Minor wear / dirty',
  'Needs maintenance',
  'Damaged — report raised',
]

export default function CheckinPage() {
  const { farm, member } = useAuth()
  const { addToast } = useToast()
  const [outItems, setOutItems] = useState([])
  const [members, setMembers] = useState([])
  const [selectedRecord, setSelectedRecord] = useState('')
  const [selectedMemberId, setSelectedMemberId] = useState(member?.id || '')
  const [condition, setCondition] = useState(CONDITIONS[0])
  const [notes, setNotes] = useState('')
  const [photo, setPhoto] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!farm) return
    loadData()
    // Real-time subscription — when someone else checks something out, this list updates
    const channel = supabase
      .channel('out-items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shed_records', filter: `farm_id=eq.${farm.id}` }, loadData)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [farm])

  async function loadData() {
    setLoading(true)
    const [{ data: records }, { data: memberData }] = await Promise.all([
      supabase.from('shed_records').select('*').eq('farm_id', farm.id).eq('status', 'out').order('checkout_at', { ascending: false }),
      supabase.from('farm_members').select('*').eq('farm_id', farm.id),
    ])
    setOutItems(records || [])
    setMembers(memberData || [])
    if (!selectedMemberId && memberData?.length) setSelectedMemberId(memberData[0].id)
    setLoading(false)
  }

  async function submit(e) {
    e.preventDefault()
    if (!selectedRecord) { addToast('Select the item being returned', 'error'); return }
    if (!selectedMemberId) { addToast('Select who is returning it', 'error'); return }

    const record = outItems.find(r => r.id === selectedRecord)
    const selectedMember = members.find(m => m.id === selectedMemberId)

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('shed_records')
        .update({
          status: 'returned',
          return_at: new Date().toISOString(),
          return_by: selectedMemberId,
          return_by_name: selectedMember?.display_name || 'Unknown',
          condition_on_return: condition,
          return_notes: notes || null,
          photo_in_url: photo?.url || null,
        })
        .eq('id', selectedRecord)

      if (error) throw error

      addToast(`🔒 ${record?.item_name} returned by ${selectedMember?.display_name}`)
      setSelectedRecord('')
      setNotes('')
      setCondition(CONDITIONS[0])
      setPhoto(null)
      loadData()
    } catch (err) {
      addToast('Failed to save: ' + err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedItem = outItems.find(r => r.id === selectedRecord)

  return (
    <div>
      <div className="card">
        <div className="card-title">🔒 Return Item to Shed</div>

        {loading ? (
          <div style={{ padding: 32, textAlign: 'center' }}><span className="spinner" /></div>
        ) : outItems.length === 0 ? (
          <div className="empty-state">
            <span className="icon">✅</span>
            All clear — nothing is currently out of the shed!
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="form-grid">

              <div className="form-group full">
                <label>Item Being Returned ({outItems.length} out)</label>
                <select value={selectedRecord} onChange={e => setSelectedRecord(e.target.value)} required>
                  <option value="">-- Select item --</option>
                  {outItems.map(r => {
                    const isOverdue = r.expected_return_at && new Date(r.expected_return_at) < new Date()
                    return (
                      <option key={r.id} value={r.id}>
                        {isOverdue ? '⚠ ' : ''}{r.item_name} — taken by {r.checkout_by_name} ({new Date(r.checkout_at).toLocaleDateString('en-AU')})
                      </option>
                    )
                  })}
                </select>
              </div>

              {selectedItem && (
                <div className="full" style={{
                  background: 'var(--dirt2)', borderRadius: 'var(--radius)', padding: '10px 14px',
                  fontSize: '0.85rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6
                }}>
                  <div><span style={{ opacity: 0.5 }}>Taken by:</span> {selectedItem.checkout_by_name}</div>
                  <div><span style={{ opacity: 0.5 }}>Destination:</span> {selectedItem.destination || '—'}</div>
                  <div><span style={{ opacity: 0.5 }}>Checked out:</span> {new Date(selectedItem.checkout_at).toLocaleString('en-AU')}</div>
                  {selectedItem.expected_return_at && (
                    <div style={{ color: new Date(selectedItem.expected_return_at) < new Date() ? '#f08060' : 'inherit' }}>
                      <span style={{ opacity: 0.5 }}>Due back:</span> {new Date(selectedItem.expected_return_at).toLocaleString('en-AU')}
                    </div>
                  )}
                </div>
              )}

              <div className="form-group">
                <label>Returned By</label>
                <select value={selectedMemberId} onChange={e => setSelectedMemberId(e.target.value)} required>
                  <option value="">-- Select employee --</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.display_name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Condition on Return</label>
                <select value={condition} onChange={e => setCondition(e.target.value)}>
                  {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="form-group full">
                <label>Return Notes</label>
                <textarea placeholder="How was it used? Any issues to report?" value={notes} onChange={e => setNotes(e.target.value)} />
              </div>

              <CameraCapture
                label="📷 Photo — Item Being Returned"
                onCapture={setPhoto}
                captured={photo}
                onRetake={() => setPhoto(null)}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button type="submit" className="btn btn-green btn-lg" disabled={submitting || !selectedRecord}>
                {submitting ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Saving...</> : '🔒 Log Return'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
