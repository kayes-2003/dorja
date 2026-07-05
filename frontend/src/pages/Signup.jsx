import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Signup() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role: 'customer' } },
    })
    setLoading(false)
    if (error) { setError(error.message); return }

    // best-effort: store phone once session exists (trigger already created the profile row)
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await supabase.from('profiles').update({ phone }).eq('id', session.user.id)
    }
    navigate('/')
  }

  return (
    <div className="card" style={{ maxWidth: 420, margin: '0 auto' }}>
      <h2>Create your account</h2>
      <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem' }}>
        Sign up once — you can send parcels as a customer, and later opt in as a courier
        if you already deliver for a platform in your area.
      </p>
      {error && <div className="error-box">{error}</div>}
      <form onSubmit={handleSubmit}>
        <label>Full name</label>
        <input value={fullName} onChange={e => setFullName(e.target.value)} required />
        <label>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        <label>Phone</label>
        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="01XXXXXXXXX" />
        <label>Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
        <button className="btn btn-primary btn-block" disabled={loading}>
          {loading ? 'Creating account…' : 'Sign up'}
        </button>
      </form>
      <p style={{ marginTop: 14, fontSize: '0.88rem' }}>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  )
}
