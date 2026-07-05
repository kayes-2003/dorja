import React, { createContext, useContext, useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Navbar from './components/Navbar.jsx'
import Home from './pages/Home.jsx'
import Auth from './pages/Auth.jsx'
import CreateRequest from './pages/CreateRequest.jsx'
import MyRequests from './pages/MyRequests.jsx'
import DeliveryDashboard from './pages/DeliveryDashboard.jsx'
import RequestDetail from './pages/RequestDetail.jsx'
import BecomeCourier from './pages/BecomeCourier.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'

export const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

function Protected({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <p>Loading…</p>
  if (!session) return <Navigate to="/login" replace />
  return children
}

function AdminOnly({ children }) {
  const { profile, loading } = useAuth()
  if (loading) return <p>Loading…</p>
  if (!profile || profile.role !== 'admin') return <Navigate to="/" replace />
  return children
}

function CourierOnly({ children }) {
  const { profile, loading } = useAuth()
  if (loading) return <p>Loading…</p>
  if (!profile || profile.role !== 'delivery_person') return <Navigate to="/" replace />
  return children
}

function CustomerOnly({ children }) {
  const { profile, loading } = useAuth()
  if (loading) return <p>Loading…</p>
  if (!profile || profile.role !== 'customer') return <Navigate to="/" replace />
  return children
}

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) { setProfile(null); return }
    supabase.from('profiles').select('*').eq('id', session.user.id).single()
      .then(({ data }) => setProfile(data))
  }, [session])

  return (
    <AuthContext.Provider value={{ session, profile, loading, refreshProfile: () => {
      if (session) supabase.from('profiles').select('*').eq('id', session.user.id).single().then(({ data }) => setProfile(data))
    } }}>
      <div className="app-shell">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/signup" element={<Auth />} />
          <Route path="/send" element={<Protected><CustomerOnly><CreateRequest /></CustomerOnly></Protected>} />
          <Route path="/my-sends" element={<Protected><CustomerOnly><MyRequests /></CustomerOnly></Protected>} />
          <Route path="/become-courier" element={<Protected><CustomerOnly><BecomeCourier /></CustomerOnly></Protected>} />
          <Route path="/courier" element={<Protected><CourierOnly><DeliveryDashboard /></CourierOnly></Protected>} />
          <Route path="/requests/:id" element={<Protected><RequestDetail /></Protected>} />
          <Route path="/admin" element={<Protected><AdminOnly><AdminDashboard /></AdminOnly></Protected>} />
        </Routes>
      </div>
    </AuthContext.Provider>
  )
}
