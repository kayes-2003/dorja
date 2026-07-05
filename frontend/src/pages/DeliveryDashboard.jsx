import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../supabaseClient'

export default function DeliveryDashboard() {
  const [available, setAvailable] = useState([])
  const [mine, setMine] = useState([])
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  async function load() {
    try {
      const [a, m] = await Promise.all([api('/requests/available'), api('/requests/assigned')])
      setAvailable(a)
      setMine(m)
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => { load() }, [])

  async function accept(id) {
    setBusyId(id)
    try {
      await api(`/requests/${id}/accept`, { method: 'POST' })
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <h2>Courier dashboard</h2>
      {error && <div className="error-box">{error}</div>}

      <h3 style={{ marginTop: 24 }}>Available local sends in your area</h3>
      <div className="card">
        {available.length === 0 && <div className="empty-state">No pending sends nearby right now — check back soon.</div>}
        {available.map(r => (
          <div className="request-item" key={r.id}>
            <div>
              <strong>To: {r.receiver_name}</strong>
              {r.is_surprise && <span className="surprise-tag" style={{ marginLeft: 8 }}>🎁 Surprise</span>}
              <div className="meta">{r.item_description || 'No description'}</div>
              <div className="meta">{r.pickup_type === 'from_shop' ? 'Pickup from shop' : `Pickup: ${r.pickup_address || 'sender address'}`}</div>
              {r.price > 0 && <div className="meta">Offer: ৳{r.price}</div>}
            </div>
            <button className="btn btn-primary" disabled={busyId === r.id} onClick={() => accept(r.id)}>
              {busyId === r.id ? 'Accepting…' : 'Accept'}
            </button>
          </div>
        ))}
      </div>

      <h3 style={{ marginTop: 24 }}>Your active deliveries</h3>
      <div className="card">
        {mine.length === 0 && <div className="empty-state">Nothing assigned to you yet.</div>}
        {mine.map(r => (
          <div className="request-item" key={r.id}>
            <div>
              <strong>To: {r.receiver_name}</strong>
              <div className="meta">{r.receiver_address}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className={`status-pill status-${r.status}`}>{r.status.replace('_', ' ')}</span>
              <div style={{ marginTop: 8 }}>
                <Link to={`/requests/${r.id}`} style={{ fontSize: '0.85rem' }}>Manage →</Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
