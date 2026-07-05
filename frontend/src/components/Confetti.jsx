import React, { useEffect, useState } from 'react'

const COLORS = ['#f5a623', '#1f7a6c', '#c2559c', '#4a90d9', '#e8534f']

function rand(min, max) {
  return Math.random() * (max - min) + min
}

export default function Confetti({ onDone }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false)
      if (onDone) onDone()
    }, 4200)
    return () => clearTimeout(t)
  }, [onDone])

  if (!visible) return null

  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: rand(0, 100),
    delay: rand(0, 0.6),
    duration: rand(2.2, 3.6),
    color: COLORS[i % COLORS.length],
    rotate: rand(0, 360),
    drift: rand(-40, 40),
  }))

  const balloons = Array.from({ length: 5 }, (_, i) => ({
    id: i,
    left: rand(8, 88),
    delay: rand(0, 0.8),
    duration: rand(3.2, 4.4),
    color: COLORS[(i + 2) % COLORS.length],
  }))

  return (
    <div className="confetti-layer" aria-hidden="true">
      {pieces.map(p => (
        <span
          key={`c-${p.id}`}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            '--drift': `${p.drift}px`,
            '--rotate': `${p.rotate}deg`,
          }}
        />
      ))}
      {balloons.map(b => (
        <span
          key={`b-${b.id}`}
          className="balloon"
          style={{ left: `${b.left}%`, animationDelay: `${b.delay}s`, animationDuration: `${b.duration}s` }}
        >
          <svg width="34" height="46" viewBox="0 0 34 46" fill="none">
            <ellipse cx="17" cy="17" rx="16" ry="17" fill={b.color} />
            <path d="M17 34 L17 46" stroke="#999" strokeWidth="1" strokeDasharray="2 2" />
            <path d="M14 34 Q17 38 20 34" stroke={b.color} strokeWidth="2" fill="none" />
          </svg>
        </span>
      ))}
    </div>
  )
}