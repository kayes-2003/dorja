import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function EyeIcon({ open }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.3 20.3 0 0 1 5.06-5.94M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 11 8 11 8a20.5 20.5 0 0 1-3.22 4.44M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <path d="M1 1l22 22" />
    </svg>
  )
}

// Adjust this pattern if your users aren't in Bangladesh (currently: 01[3-9]XXXXXXXX)
const PHONE_PATTERN = /^01[3-9]\d{8}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Auth() {
  const [mode, setMode] = useState('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const isSignup = mode === 'signup'

  function validate() {
    if (!EMAIL_PATTERN.test(email)) return 'Please enter a valid email address.'
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return 'Password must be at least 8 characters and include both letters and numbers.'
    }
    if (isSignup) {
      if (fullName.trim().length < 2) return 'Please enter your full name.'
      if (!PHONE_PATTERN.test(phone)) return 'Please enter a valid phone number (e.g. 017XXXXXXXX).'
      if (address.trim().length < 5) return 'Please enter your full address.'
    }
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')

    const validationError = validate()
    if (validationError) { setError(validationError); return }

    setLoading(true)

    if (isSignup) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, phone, address, role: 'customer' },
        },
      })
      setLoading(false)
      if (error) { setError(error.message); return }

      if (!data.session) {
        setInfo('Account created. Check your email to confirm, then log in.')
        setMode('login')
        return
      }
      sessionStorage.setItem('justLoggedIn', '1')
      navigate('/')
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setError(error.message); return }
    sessionStorage.setItem('justLoggedIn', '1')
    navigate('/')
  }

  

  return (
    <div className="auth-wrap">
      <div className="auth-panel">
        <div className="auth-brand-side">
          <div className="auth-brand-mark">
            <span className="dot" />
            DeliverConnect
          </div>
          <h2>Your street already has a courier on it.</h2>
          <p>
            Connect with delivery people already working your neighbourhood for
            Daraz, CarryBee, Paperfly, Steadfast and more — for surprise sends,
            supershop pickups, and local parcels.
          </p>
          <ul className="auth-points">
            <li>Send a surprise gift to a friend nearby</li>
            <li>Grab an item from a local supershop</li>
            <li>Move a parcel within your own area, same day</li>
          </ul>
        </div>

        <div className="auth-form-side">
          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${!isSignup ? 'auth-tab-active' : ''}`}
              onClick={() => { setMode('login'); setError(''); setInfo('') }}
            >
              Log in
            </button>
            <button
              type="button"
              className={`auth-tab ${isSignup ? 'auth-tab-active' : ''}`}
              onClick={() => { setMode('signup'); setError(''); setInfo('') }}
            >
              Sign up
            </button>
          </div>

          <h1 className="auth-title">{isSignup ? 'Create your account' : 'Welcome back'}</h1>
          <p className="auth-subtitle">
            {isSignup
              ? 'Send parcels as a customer, or opt in as a courier later.'
              : 'Log in to send, track, or manage deliveries.'}
          </p>

          {error && <div className="error-box">{error}</div>}
          {info && <div className="info-box">{info}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            {isSignup && (
              <>
                <div className="field-group">
                  <label>Full name</label>
                  <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Rafi Ahmed" required />
                </div>
                <div className="field-group">
                  <label>Phone number</label>
                  <input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    required
                  />
                </div>
                <div className="field-group">
                  <label>Address</label>
                  <textarea
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="House / road, area, city"
                    required
                    rows={2}
                  />
                </div>
              </>
            )}

            <div className="field-group">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>

            <div className="field-group">
              <label>Password</label>
              <div className="password-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters, letters + numbers"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(s => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            <button className="btn btn-primary btn-block auth-submit" disabled={loading}>
              {loading ? 'Please wait…' : isSignup ? 'Create account' : 'Log in'}
            </button>
          </form>

          <p className="auth-switch">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              className="auth-switch-link"
              onClick={() => { setMode(isSignup ? 'login' : 'signup'); setError(''); setInfo('') }}
            >
              {isSignup ? 'Log in' : 'Sign up'}
            </button>
          </p>
        </div>
      </div>
    </div>
    
  )
}

