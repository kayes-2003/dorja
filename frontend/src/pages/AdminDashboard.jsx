import React, { useEffect, useState } from 'react'
import { api } from '../supabaseClient'

const STATUS_OPTIONS = ['pending', 'accepted', 'picked_up', 'delivered', 'cancelled']
const ROLE_OPTIONS = ['customer', 'delivery_person', 'admin']

const statusLabel = {
  pending: 'Looking for a courier',
  accepted: 'Courier assigned',
  picked_up: 'On the way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export default function AdminDashboard() {
  const [requests, setRequests] = useState([])
  const [users, setUsers] = useState([])
  const [couriers, setCouriers] = useState([])
  const [error, setError] = useState('')
  const [tab, setTab] = useState('requests')

  async function load() {
    try {
      const [r, u, c] = await Promise.all([
        api('/admin/requests'),
        api('/admin/users'),
        api('/admin/delivery-persons'),
      ])
      setRequests(r)
      setUsers(u)
      setCouriers(c)
      setError('')
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => { load() }, [])

  async function changeStatus(id, status) {
    try {
      await api(`/admin/requests/${id}/status`, { method: 'PATCH', body: { status } })
      await load()
    } catch (e) { setError(e.message) }
  }

  async function assignCourier(requestId, courierId) {
    try {
      await api(`/admin/requests/${requestId}/assign`, { method: 'PATCH', body: { delivery_person_id: courierId } })
      await load()
    } catch (e) { setError(e.message) }
  }

  async function changeRole(id, role) {
    try {
      await api(`/admin/users/${id}/role`, { method: 'PATCH', body: { role } })
      await load()
    } catch (e) { setError(e.message) }
  }

  async function toggleVerify(id, verified) {
    try {
      await api(`/admin/delivery-persons/${id}/verify`, { method: 'PATCH', body: { verified } })
      await load()
    } catch (e) { setError(e.message) }
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length

  return (
    <div>
      <h2>Admin panel</h2>
      {error && <div className="error-box">{error}</div>}

      <div className="stats-row">
        <div className="stat-item"><strong>{requests.length}</strong><span>Total sends</span></div>
        <div className="stat-item"><strong>{pendingCount}</strong><span>Awaiting a courier</span></div>
        <div className="stat-item"><strong>{users.length}</strong><span>Registered users</span></div>
        <div className="stat-item"><strong>{couriers.length}</strong><span>Registered couriers</span></div>
      </div>

      <div className="auth-tabs" style={{ maxWidth: 420 }}>
        <button className={`auth-tab ${tab === 'requests' ? 'auth-tab-active' : ''}`} onClick={() => setTab('requests')}>
          All sends
        </button>
        <button className={`auth-tab ${tab === 'users' ? 'auth-tab-active' : ''}`} onClick={() => setTab('users')}>
          Users
        </button>
        <button className={`auth-tab ${tab === 'couriers' ? 'auth-tab-active' : ''}`} onClick={() => setTab('couriers')}>
          Couriers
        </button>
      </div>

      {tab === 'requests' && (
        <div className="card" style={{ marginTop: 16 }}>
          {requests.length === 0 && <div className="empty-state">No sends yet.</div>}
          {requests.map(r => (
            <div className="request-item" key={r.id}>
              <div>
                <strong>{r.receiver_name}</strong>
                {r.is_surprise && <span className="surprise-tag" style={{ marginLeft: 8 }}>🎁</span>}
                <div className="meta">{r.item_description || 'No description'}</div>
                <div className="meta">From: {r.sender?.full_name || 'Unknown'} ({r.sender?.phone || '—'})</div>
                <div className="meta">
                  {r.courier
                    ? <>Handed to: <strong>{r.courier.full_name}</strong> ({r.courier.phone || '—'})</>
                    : 'Not yet picked up by a courier'}
                </div>
                <div className="meta">{new Date(r.created_at).toLocaleString()}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                <select value={r.status} onChange={e => changeStatus(r.id, e.target.value)} style={{ width: 170 }}>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
                </select>
                {!r.delivery_person_id && (
                  <select
                    defaultValue=""
                    onChange={e => { if (e.target.value) assignCourier(r.id, e.target.value) }}
                    style={{ width: 170 }}
                  >
                    <option value="">Assign courier…</option>
                    {couriers.map(c => (
                      <option key={c.id} value={c.id}>{c.profiles?.full_name || 'Unknown'}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'users' && (
        <div className="card" style={{ marginTop: 16 }}>
          {users.length === 0 && <div className="empty-state">No users yet.</div>}
          {users.map(u => (
            <div className="request-item" key={u.id}>
              <div>
                <strong>{u.full_name}</strong>
                <div className="meta">{u.phone || '—'}</div>
                <div className="meta">{u.address || '—'}</div>
              </div>
              <select value={u.role} onChange={e => changeRole(u.id, e.target.value)} style={{ width: 160 }}>
                {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}

      {tab === 'couriers' && (
        <div className="card" style={{ marginTop: 16 }}>
          {couriers.length === 0 && <div className="empty-state">No couriers registered yet.</div>}
          {couriers.map(c => (
            <div className="request-item" key={c.id}>
              <div>
                <strong>{c.profiles?.full_name || 'Unknown'}</strong>
                <div className="meta">{c.profiles?.phone || '—'}</div>
                <div className="meta">Platforms: {(c.platforms || []).join(', ') || '—'}</div>
                <div className="meta">
                  Rating: {c.rating_avg || 0} · Deliveries: {c.total_deliveries || 0} ·
                  {' '}{c.is_active ? 'Active' : 'Inactive'}
                </div>
              </div>
              <button
                className={c.is_verified ? 'btn btn-outline' : 'btn btn-primary'}
                onClick={() => toggleVerify(c.id, !c.is_verified)}
              >
                {c.is_verified ? 'Verified ✓' : 'Verify courier'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}