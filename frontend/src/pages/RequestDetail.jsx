import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../supabaseClient'
import { useAuth } from '../App.jsx'

const NEXT_STATUS = {
  accepted: 'picked_up',
  picked_up: 'delivered',
}
const NEXT_LABEL = {
  accepted: 'Mark picked up',
  picked_up: 'Mark delivered',
}

export default function RequestDetail() {
  const { id } = useParams()
  const { session } = useAuth()
  const [req, setReq] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [rated, setRated] = useState(false)

  async function load() {
    try {
      setReq(await api(`/requests/${id}`))
    } catch (e) {
      setError(e.message)
    }
  }
  useEffect(() => { load() }, [id])

  const isCourier = req && session && req.delivery_person_id === session.user.id
  const isSender = req && session && req.sender_id === session.user.id

  async function advance() {
    setBusy(true)
    try {
      await api(`/requests/${id}/status`, { method: 'PATCH', body: { status: NEXT_STATUS[req.status] } })
      await load()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  async function cancel() {
    setBusy(true)
    try {
      await api(`/requests/${id}/status`, { method: 'PATCH', body: { status: 'cancelled' } })
      await load()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  async function submitRating() {
    setBusy(true)
    try {
      await api('/requests/rate', { method: 'POST', body: { request_id: id, rating, comment } })
      setRated(true)
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  if (error) return <div className="error-box">{error}</div>
  if (!req) return <p>Loading…</p>

  return (
    <div className="card" style={{ maxWidth: 520, margin: '0 auto' }}>
      <span className={`status-pill status-${req.status}`}>{req.status.replace('_', ' ')}</span>
      <h2 style={{ marginTop: 12 }}>Send to {req.receiver_name}</h2>

      {req.is_surprise && (
        <div className="card" style={{ background: '#fdf3fa', borderColor: '#f0d6ea' }}>
          <span className="surprise-tag">🎁 Surprise send</span>
          {isCourier
            ? <p style={{ fontSize: '0.88rem', marginTop: 6 }}>Keep it a surprise — don't reveal the sender at drop-off.</p>
            : <p style={{ fontSize: '0.88rem', marginTop: 6 }}>{req.surprise_note}</p>}
        </div>
      )}

      <p><strong>Item:</strong> {req.item_description || '—'}</p>
      <p><strong>Receiver phone:</strong> {req.receiver_phone}</p>
      <p><strong>Receiver address:</strong> {req.receiver_address}</p>
      <p><strong>Pickup:</strong> {req.pickup_type === 'from_shop' ? 'Local shop' : (req.pickup_address || 'Sender address')}</p>
      {req.price > 0 && <p><strong>Offer:</strong> ৳{req.price}</p>}

      {isSender && req.status === 'pending' && (
        <button className="btn btn-danger" disabled={busy} onClick={cancel}>Cancel this send</button>
      )}

      {isCourier && NEXT_STATUS[req.status] && (
        <button className="btn btn-primary" disabled={busy} onClick={advance}>{NEXT_LABEL[req.status]}</button>
      )}

      {req.status === 'delivered' && !rated && (isSender || isCourier) && (
        <div style={{ marginTop: 18, borderTop: '1px dashed var(--border)', paddingTop: 16 }}>
          <label>Rate this delivery</label>
          <select value={rating} onChange={e => setRating(Number(e.target.value))}>
            {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>)}
          </select>
          <label>Comment (optional)</label>
          <textarea value={comment} onChange={e => setComment(e.target.value)} />
          <button className="btn btn-primary" disabled={busy} onClick={submitRating}>Submit rating</button>
        </div>
      )}
      {rated && <p style={{ color: 'var(--route)', marginTop: 12 }}>Thanks for rating!</p>}
    </div>
  )
}
