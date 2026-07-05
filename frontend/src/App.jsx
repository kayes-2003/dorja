import React, { createContext, useContext, useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Navbar from './components/Navbar.jsx'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import CreateRequest from './pages/CreateRequest.jsx'
import MyRequests from './pages/MyRequests.jsx'
import DeliveryDashboard from './pages/DeliveryDashboard.jsx'
import RequestDetail from './pages/RequestDetail.jsx'
import BecomeCourier from './pages/BecomeCourier.jsx'

export const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

function Protected({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <p>Loading…</p>
  if (!session) return <Navigate to="/login" replace />
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
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/send" element={<Protected><CreateRequest /></Protected>} />
          <Route path="/my-sends" element={<Protected><MyRequests /></Protected>} />
          <Route path="/courier" element={<Protected><DeliveryDashboard /></Protected>} />
          <Route path="/become-courier" element={<Protected><BecomeCourier /></Protected>} />
          <Route path="/requests/:id" element={<Protected><RequestDetail /></Protected>} />
        </Routes>
      </div>
    </AuthContext.Provider>
  )
}
