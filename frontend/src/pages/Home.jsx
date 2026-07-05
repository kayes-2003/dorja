import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../App.jsx'
import { api } from '../supabaseClient'
import Confetti from '../components/Confetti.jsx'

const STEPS = [
  { title: 'Post a send', desc: 'Tell us what you\'re sending, where it needs to go, and whether it\'s a surprise.' },
  { title: 'A local courier accepts', desc: 'A verified delivery person already working your area picks up the job on their route.' },
  { title: 'Track it to the door', desc: 'Get notified at pickup and drop-off, then rate the delivery when it\'s done.' },
]

const statusLabel = {
  pending: 'Looking for a courier',
  accepted: 'Courier assigned',
  picked_up: 'On the way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

function MarketingHome({ session }) {
  return (
    <div>
      <div className="hero">
        <svg className="route-line" width="220" height="140" viewBox="0 0 220 140" fill="none">
          <path d="M10 120 Q 80 20 210 60" stroke="#1f8a8c" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" />
        </svg>
        <span className="hero-eyebrow">Hyperlocal delivery network</span>
        <h1>Your street already has a delivery person on it.</h1>
        <p>
          The same dedicated riders carrying Daraz, CarryBee, Paperfly and Steadfast
          parcels through your neighbourhood every day can now carry <em>your</em> local
          sends too — a surprise gift to a friend down the road, a pickup from the
          nearby supershop, or a box you just want delivered within the area.
        </p>
        <div className="platform-row">
          {['Daraz', 'CarryBee', 'Paperfly', 'Steadfast', '+69 more platforms'].map(p => (
            <span className="platform-chip" key={p}>{p}</span>
          ))}
        </div>
        <div className="hero-actions">
          <Link to={session ? '/send' : '/signup'} className="btn btn-primary">Send something nearby</Link>
          <Link to={session ? '/become-courier' : '/signup'} className="btn btn-outline">I'm already a courier</Link>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-item"><strong>4</strong><span>Platforms already integrated</span></div>
        <div className="stat-item"><strong>Same-day</strong><span>Local delivery window</span></div>
        <div className="stat-item"><strong>100%</strong><span>Verified couriers only</span></div>
      </div>

      <h2 className="section-title">How it works</h2>
      <div className="steps-grid">
        {STEPS.map((s, i) => (
          <div className="step-card" key={s.title}>
            <span className="step-number">{String(i + 1).padStart(2, '0')}</span>
            <h3>{s.title}</h3>
            <p>{s.desc}</p>
          </div>
        ))}
      </div>

      <h2 className="section-title">Built for real neighbourhood moments</h2>
      <div className="grid-2">
        <div className="card feature-card">
          <span className="feature-icon">🎁</span>
          <h3>Surprise a friend</h3>
          <p>Drop off a birthday box or card with a courier who's already passing near your friend's place.</p>
        </div>
        <div className="card feature-card">
          <span className="feature-icon">🛒</span>
          <h3>Supershop pickups</h3>
          <p>Ask a courier to grab something from a local supershop on their route and bring it to your door.</p>
        </div>
      </div>

      <div className="cta-banner">
        <div>
          <h2>Ready to send something nearby?</h2>
          <p>It takes less than a minute to post your first local send.</p>
        </div>
        <Link to={session ? '/send' : '/signup'} className="btn btn-primary">
          {session ? 'Send something' : 'Get started'}
        </Link>
      </div>
    </div>
  )
}

function CustomerHome({ profile }) {
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('/requests/mine').then(r => setRecent(r.slice(0, 3))).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="hero">
        <span className="hero-eyebrow">Customer</span>
        <h1>Welcome back, {profile.full_name?.split(' ')[0] || 'there'}.</h1>
        <p>Send a surprise, grab something from a nearby shop, or check on a delivery already on its way.</p>
        <div className="hero-actions">
          <Link to="/send" className="btn btn-primary">Send something nearby</Link>
          <Link to="/my-sends" className="btn btn-outline">View all my sends</Link>
        </div>
      </div>

      <h2 className="section-title">Recent sends</h2>
      <div className="card">
        {loading && <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>}
        {!loading && recent.length === 0 && (
          <div className="empty-state">
            <p>You haven't sent anything yet.</p>
            <Link to="/send" className="btn btn-primary">Send something</Link>
          </div>
        )}
        {recent.map(r => (
          <div className="request-item" key={r.id}>
            <div>
              <strong>{r.receiver_name}</strong>
              {r.is_surprise && <span className="surprise-tag" style={{ marginLeft: 8 }}>🎁</span>}
              <div className="meta">{r.item_description || 'No description'}</div>
            </div>
            <span className={`status-pill status-${r.status}`}>{statusLabel[r.status]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CourierHome({ profile }) {
  const [availableCount, setAvailableCount] = useState(null)
  const [assignedCount, setAssignedCount] = useState(null)

  useEffect(() => {
    api('/requests/available').then(r => setAvailableCount(r.length)).catch(() => setAvailableCount(0))
    api('/requests/assigned').then(r => setAssignedCount(r.filter(x => x.status !== 'delivered' && x.status !== 'cancelled').length)).catch(() => setAssignedCount(0))
  }, [])

  return (
    <div>
      <div className="hero">
        <span className="hero-eyebrow">Courier</span>
        <h1>Welcome back, {profile.full_name?.split(' ')[0] || 'there'}.</h1>
        <p>Pick up local sends alongside your regular route — no detours needed.</p>
        <div className="hero-actions">
          <Link to="/courier" className="btn btn-primary">Open courier dashboard</Link>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-item">
          <strong>{availableCount === null ? '—' : availableCount}</strong>
          <span>Jobs available in your area</span>
        </div>
        <div className="stat-item">
          <strong>{assignedCount === null ? '—' : assignedCount}</strong>
          <span>Active deliveries assigned to you</span>
        </div>
      </div>
    </div>
  )
}

function AdminHome() {
  const [requestCount, setRequestCount] = useState(null)
  const [userCount, setUserCount] = useState(null)
  const [pendingCount, setPendingCount] = useState(null)

  useEffect(() => {
    api('/admin/requests').then(r => {
      setRequestCount(r.length)
      setPendingCount(r.filter(x => x.status === 'pending').length)
    }).catch(() => {})
    api('/admin/users').then(u => setUserCount(u.length)).catch(() => {})
  }, [])

  return (
    <div>
      <div className="hero">
        <span className="hero-eyebrow">Admin</span>
        <h1>System overview</h1>
        <p>Monitor every send in the network and manage user roles and courier verification.</p>
        <div className="hero-actions">
          <Link to="/admin" className="btn btn-primary">Open admin panel</Link>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-item"><strong>{requestCount ?? '—'}</strong><span>Total sends</span></div>
        <div className="stat-item"><strong>{pendingCount ?? '—'}</strong><span>Awaiting a courier</span></div>
        <div className="stat-item"><strong>{userCount ?? '—'}</strong><span>Registered users</span></div>
      </div>
    </div>
  )
}

export default function Home() {
  const { session, profile } = useAuth()
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('justLoggedIn')) {
      sessionStorage.removeItem('justLoggedIn')
      setShowConfetti(true)
    }
  }, [])

  return (
    <div>
      {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}

      {!session && <MarketingHome session={session} />}
      {session && profile?.role === 'customer' && <CustomerHome profile={profile} />}
      {session && profile?.role === 'delivery_person' && <CourierHome profile={profile} />}
      {session && profile?.role === 'admin' && <AdminHome />}
      {session && !profile && <p>Loading your dashboard…</p>}
    </div>
  )
}