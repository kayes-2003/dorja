import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, supabase } from '../supabaseClient'
import { useAuth } from '../App.jsx'

const PLATFORM_OPTIONS = ['Daraz', 'CarryBee', 'Paperfly', 'Steadfast', 'RedX', 'eCourier', 'Pathao Courier', 'Other']

export default function BecomeCourier() {
  const [areas, setAreas] = useState([])
  const [areaId, setAreaId] = useState('')
  const [platforms, setPlatforms] = useState([])
  const [vehicleType, setVehicleType] = useState('bike')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()

  useEffect(() => {
    supabase.from('areas').select('*').order('name').then(({ data }) => setAreas(data || []))
  }, [])

  function togglePlatform(p) {
    setPlatforms(cur => cur.includes(p) ? cur.filter(x => x !== p) : [...cur, p])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api('/delivery-persons/register', {
        method: 'POST',
        body: { platforms, vehicle_type: vehicleType, area_id: areaId },
      })
      refreshProfile()
      navigate('/courier')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{ maxWidth: 480, margin: '0 auto' }}>
      <h2>Register as a local courier</h2>
      <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem' }}>
        Already delivering for a platform in your area? Opt in to also pick up local
        sends from neighbours — extra earnings on the route you already run.
      </p>
      {error && <div className="error-box">{error}</div>}
      <form onSubmit={handleSubmit}>
        <label>Your area</label>
        <select value={areaId} onChange={e => setAreaId(e.target.value)} required>
          <option value="">Select an area</option>
          {areas.map(a => <option key={a.id} value={a.id}>{a.name}, {a.city}</option>)}
        </select>

        <label>Which platform(s) do you already deliver for?</label>
        <div className="platform-row">
          {PLATFORM_OPTIONS.map(p => (
            <span
              key={p}
              onClick={() => togglePlatform(p)}
              className="platform-chip"
              style={{
                cursor: 'pointer',
                background: platforms.includes(p) ? 'var(--route)' : undefined,
                color: platforms.includes(p) ? 'white' : undefined,
                borderColor: platforms.includes(p) ? 'var(--route)' : undefined,
              }}
            >
              {p}
            </span>
          ))}
        </div>

        <label>Vehicle</label>
        <select value={vehicleType} onChange={e => setVehicleType(e.target.value)}>
          <option value="bike">Motorbike</option>
          <option value="cycle">Bicycle</option>
          <option value="on_foot">On foot</option>
          <option value="van">Van</option>
        </select>

        <button className="btn btn-primary btn-block" disabled={loading}>
          {loading ? 'Registering…' : 'Start receiving local jobs'}
        </button>
      </form>
    </div>
  )
}
