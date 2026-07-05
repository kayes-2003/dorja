import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../App.jsx'
import { supabase } from '../supabaseClient'


export default function Navbar() {
  const { session, profile } = useAuth()
  const navigate = useNavigate()

  async function logout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <div className="navbar">
      <Link to="/" className="brand">
        <span className="brand-dots">
          <span className="dot dot-parcel" />
          <span className="dot dot-route" />
        </span>
        DeliverConnect
      </Link>
      <div className="nav-links">
        {session ? (
          <>
            {profile?.role === 'admin' && <Link to="/admin">Admin panel</Link>}

            {profile?.role === 'customer' && (
          <>
            <Link to="/send" onClick={close}>Send something</Link>
            <Link to="/my-sends" onClick={close}>My sends</Link>
            <Link to="/become-courier" onClick={close}>Become a courier</Link>
          </>
           )}

          {profile?.role === 'delivery_person' && <Link to="/courier" onClick={close}>Courier dashboard</Link>}

            {profile?.role && <span className="role-badge" style={{ whiteSpace: 'nowrap' }}>{profile.role.replace('_', ' ')}</span>}
            <button onClick={logout}>Log out</button>
          </>
        ) : (
          <>
            <Link to="/login">Log in</Link>
            <Link to="/signup">Sign up</Link>
          </>
        )}
      </div>
    </div>
  )
}