import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../lib/ToastContext'
import CameraCapture from '../components/CameraCapture'

const CATEGORIES = ['Hand Tools','Power Tools','Machinery','Animal Products','Chemicals / Fuel','Fencing','Safety Equipment','Other']

const defaultForm = () => ({
  itemName: '', itemId: '', category: '',
  quantity: 1, destination: '', notes: '',
  expectedReturn: (() => { const d = new Date(); d.setHours(d.getHours() + 4); return d.toISOString().slice(0,16) })(),
})

export default function CheckoutPage() {
  const { farm, member } = useAuth()
  const { addToast } = useToast()
  const [form, setForm] = useState(defaultForm())
  const [photo, setPhoto] = useState(null)
  const [equipment, setEquipment] = useState([])
  const [members, setMembers] = useState([])
  const [selectedMemberId, setSelectedMemberId] = useState(member?.id || '')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!farm) return
    supabase.from('equipment').select('*').eq('farm_id', farm.id).eq('active', true).order('name')
      .then(({ data }) => setEquipment(data || []))
    supabase.from('farm_members').select('*').eq('farm_id', farm.id)
      .then(({ data }) => { setMembers(data || []); if (!selectedMemberId && data?.length) setSelectedMemberId(data[0].id) })
  }, [farm])

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  function onEquipmentSelect(e) {
    const eq = equipment.find(eq => eq.id === e.target.value)
    setForm(f => ({ ...f, itemId: eq?.id || '', itemName: eq?.name || '', category: eq?.category || '' }))
  }

  async function submit(e) {
    e.preventDefault()
    if (!form.itemName.trim()) { addToast('Item name is required', 'error'); return }
    if (!selectedMemberId) { addToast('Select who is checking this out', 'error'); return }

    const selectedMember = members.find(m => m.id === selectedMemberId)

    setSubmitting(true)
    try {
      const { error } = await supabase.from('shed_records').insert({
        farm_id: farm.id,
        item_name: form.itemName,
        item_id: form.itemId || null,
        category: form.category || null,
        quantity: parseInt(form.quantity) || 1,
        destination: form.destination || null,
        checkout_notes: form.notes || null,
        checkout_by: selectedMemberId,
        checkout_by_name: selectedMember?.display_name || 'Unknown',
        checkout_at: new Date().toISOString(),
        expected_return_at: form.expectedReturn ? new Date(form.expectedReturn).toISOString() : null,
        photo_out_url: photo?.url || null,
        status: 'out',
      })
      if (error) throw error

      addToast(`✅ ${form.itemName} checked out by ${selectedMember?.display_name}`)
      setForm(defaultForm())
      setPhoto(null)
    } catch (err) {
      addToast('Failed to save: ' + err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="card">
        <div className="card-title">🔓 Check Out Item</div>
        <form onSubmit={submit}>
          <div className="form-grid">

            <div className="form-group">
              <label>Who is taking it?</label>
              <select value={selectedMemberId} onChange={e => setSelectedMemberId(e.target.value)} required>
                <option value="">-- Select employee --</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.display_name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Equipment (from catalogue)</label>
              <select onChange={onEquipmentSelect} value={form.itemId}>
                <option value="">-- Select or type below --</option>
                {equipment.map(eq => (
                  <option key={eq.id} value={eq.id}>{eq.name} ({eq.category})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Item Name</label>
              <input
                type="text"
                placeholder="e.g. Wire Strainer #2"
                value={form.itemName}
                onChange={set('itemName')}
                required
                list="items-list"
              />
              <datalist id="items-list">
                {equipment.map(eq => <option key={eq.id} value={eq.name} />)}
              </datalist>
            </div>

            <div className="form-group">
              <label>Category</label>
              <select value={form.category} onChange={set('category')}>
                <option value="">-- Select --</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Quantity</label>
              <input type="number" min="1" value={form.quantity} onChange={set('quantity')} style={{ maxWidth: 100 }} />
            </div>

            <div className="form-group">
              <label>Expected Return</label>
              <input type="datetime-local" value={form.expectedReturn} onChange={set('expectedReturn')} />
            </div>

            <div className="form-group full">
              <label>Destination / Job</label>
              <input type="text" placeholder="e.g. North Paddock — fence repair" value={form.destination} onChange={set('destination')} />
            </div>

            <div className="form-group full">
              <label>Notes</label>
              <textarea placeholder="Condition when taken, extras, special instructions..." value={form.notes} onChange={set('notes')} />
            </div>

            <CameraCapture
              label="📷 Photo — Item Being Taken"
              onCapture={setPhoto}
              captured={photo}
              onRetake={() => setPhoto(null)}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button type="submit" className="btn btn-rust btn-lg" disabled={submitting}>
              {submitting ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Saving...</> : '🔓 Log Checkout'}
            </button>
            <button type="button" className="btn btn-iron" onClick={() => { setForm(defaultForm()); setPhoto(null) }}>
              Clear
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
