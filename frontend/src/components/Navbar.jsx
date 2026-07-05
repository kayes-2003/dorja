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
        <span className="dot" />
        DeliverConnect
      </Link>
      <div className="nav-links">
        {session ? (
          <>
            <Link to="/send">Send something</Link>
            <Link to="/my-sends">My sends</Link>
            {profile?.role === 'delivery_person'
              ? <Link to="/courier">Courier dashboard</Link>
              : <Link to="/become-courier">Become a courier</Link>}
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
