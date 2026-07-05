import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../supabaseClient'

const statusLabel = {
  pending: 'Looking for a courier',
  accepted: 'Courier assigned',
  picked_up: 'On the way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export default function MyRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api('/requests/mine').then(setRequests).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <h2>My sends</h2>
      {error && <div className="error-box">{error}</div>}
      {loading && <p>Loading…</p>}
      {!loading && requests.length === 0 && (
        <div className="card empty-state">
          <p>You haven't sent anything yet.</p>
          <Link to="/send" className="btn btn-primary">Send something</Link>
        </div>
      )}
      {requests.length > 0 && (
        <div className="card">
          {requests.map(r => (
            <div className="request-item" key={r.id}>
              <div>
                <strong>{r.receiver_name}</strong>
                {r.is_surprise && <span className="surprise-tag" style={{ marginLeft: 8 }}>🎁 Surprise</span>}
                <div className="meta">{r.item_description || 'No description'}</div>
                <div className="meta">{new Date(r.created_at).toLocaleString()}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className={`status-pill status-${r.status}`}>{statusLabel[r.status]}</span>
                <div style={{ marginTop: 8 }}>
                  <Link to={`/requests/${r.id}`} style={{ fontSize: '0.85rem' }}>View →</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
