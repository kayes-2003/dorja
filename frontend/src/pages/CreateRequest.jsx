import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, supabase } from '../supabaseClient'

export default function CreateRequest() {
  const [areas, setAreas] = useState([])
  const [shops, setShops] = useState([])
  const [form, setForm] = useState({
    area_id: '',
    pickup_type: 'from_sender',
    shop_id: '',
    pickup_address: '',
    receiver_name: '',
    receiver_phone: '',
    receiver_address: '',
    item_description: '',
    is_surprise: false,
    surprise_note: '',
    price: 0,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.from('areas').select('*').order('name').then(({ data }) => setAreas(data || []))
  }, [])

  useEffect(() => {
    if (!form.area_id) { setShops([]); return }
    supabase.from('shops').select('*').eq('area_id', form.area_id).then(({ data }) => setShops(data || []))
  }, [form.area_id])

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const payload = {
        ...form,
        price: Number(form.price) || 0,
        // never send an empty string for fields tied to the pickup type
        shop_id: form.pickup_type === 'from_shop' ? (form.shop_id || null) : null,
        pickup_address: form.pickup_type === 'from_sender' ? (form.pickup_address || null) : null,
        item_description: form.item_description || null,
        surprise_note: form.is_surprise ? (form.surprise_note || null) : null,
      }
      const created = await api('/requests', { method: 'POST', body: payload })
      navigate(`/requests/${created.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{ maxWidth: 560, margin: '0 auto' }}>
      <h2>Send something in your area</h2>
      <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem' }}>
        Match with a courier already working your neighbourhood for a fast, cheap local
        send — great for surprises, gifts, and things too small to justify a full platform delivery.
      </p>
      {error && <div className="error-box">{error}</div>}
      <form onSubmit={handleSubmit}>
        <label>Neighbourhood / area</label>
        <select value={form.area_id} onChange={e => update('area_id', e.target.value)} required>
          <option value="">Select an area</option>
          {areas.map(a => <option key={a.id} value={a.id}>{a.name}, {a.city}</option>)}
        </select>

        <label>Pickup type</label>
        <select value={form.pickup_type} onChange={e => update('pickup_type', e.target.value)}>
          <option value="from_sender">Pick up from me</option>
          <option value="from_shop">Pick up from a local shop / supershop</option>
        </select>

        {form.pickup_type === 'from_shop' ? (
          <>
            <label>Shop</label>
            <select value={form.shop_id} onChange={e => update('shop_id', e.target.value)}>
              <option value="">Select a shop</option>
              {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </>
        ) : (
          <>
            <label>Your pickup address</label>
            <input value={form.pickup_address} onChange={e => update('pickup_address', e.target.value)} placeholder="House / road, area" />
          </>
        )}

        <div className="grid-2">
          <div>
            <label>Receiver's name</label>
            <input value={form.receiver_name} onChange={e => update('receiver_name', e.target.value)} required />
          </div>
          <div>
            <label>Receiver's phone</label>
            <input value={form.receiver_phone} onChange={e => update('receiver_phone', e.target.value)} required />
          </div>
        </div>

        <label>Receiver's address</label>
        <input value={form.receiver_address} onChange={e => update('receiver_address', e.target.value)} required />

        <label>What are you sending?</label>
        <textarea value={form.item_description} onChange={e => update('item_description', e.target.value)} placeholder="e.g. a wrapped gift box, a birthday cake, documents…" />

        <div className="toggle-row">
          <input
            type="checkbox"
            id="is_surprise"
            checked={form.is_surprise}
            onChange={e => update('is_surprise', e.target.checked)}
            style={{ width: 'auto' }}
          />
          <label htmlFor="is_surprise" style={{ margin: 0 }}>This is a surprise 🎁</label>
        </div>

        {form.is_surprise && (
          <>
            <label>Surprise note (shown to the receiver, not the courier's business)</label>
            <textarea value={form.surprise_note} onChange={e => update('surprise_note', e.target.value)} placeholder="Happy birthday! From your favourite neighbour 🎉" />
          </>
        )}

        <label>Offer (BDT, optional — couriers see pending jobs in their area)</label>
        <input type="number" min="0" value={form.price} onChange={e => update('price', e.target.value)} />

        <button className="btn btn-primary btn-block" disabled={loading}>
          {loading ? 'Sending…' : 'Find a courier'}
        </button>
      </form>
    </div>
  )
}
