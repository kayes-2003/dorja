import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../App.jsx'

export default function Home() {
  const { session } = useAuth()

  return (
    <div>
      <div className="hero">
        <svg className="route-line" width="220" height="140" viewBox="0 0 220 140" fill="none">
          <path d="M10 120 Q 80 20 210 60" stroke="#1f7a6c" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" />
        </svg>
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
        <div style={{ marginTop: 22, display: 'flex', gap: 12 }}>
          <Link to={session ? '/send' : '/signup'} className="btn btn-primary">Send something nearby</Link>
          <Link to={session ? '/become-courier' : '/signup'} className="btn btn-outline">I'm already a courier</Link>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>🎁 Surprise a friend</h3>
          <p style={{ color: 'var(--ink-soft)', fontSize: '0.92rem' }}>
            Drop off a birthday box or card with a courier who's already passing near your
            friend's place — they never have to know it came from a "delivery app."
          </p>
        </div>
        <div className="card">
          <h3>🛒 Supershop pickups</h3>
          <p style={{ color: 'var(--ink-soft)', fontSize: '0.92rem' }}>
            Ask a courier to grab something from a local supershop on their route and
            bring it straight to your door.
          </p>
        </div>
      </div>
    </div>
  )
}
