import { useEffect, useRef, useState } from 'react'

interface ComplianceRingProps {
  score: number
  size?: number
  label?: string
}

export default function ComplianceRing({ score, size = 130, label = 'Compliance Score' }: ComplianceRingProps) {
  const [animatedScore, setAnimatedScore] = useState(0)
  const r = (size - 20) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference - (animatedScore / 100) * circumference

  useEffect(() => {
    const start = Date.now()
    const duration = 1200
    const frame = () => {
      const t = Math.min((Date.now() - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setAnimatedScore(eased * score)
      if (t < 1) requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }, [score])

  return (
    <div className="flex flex-col items-center gap-2">
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#F0F0EA"
            strokeWidth={12}
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#3B82F6"
            strokeWidth={12}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.05s ease', filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))' }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{
            fontSize: size > 100 ? 28 : 20,
            fontWeight: 800,
            color: '#0A0A0A',
            fontFamily: 'Inter',
            letterSpacing: '-1px',
            lineHeight: 1,
          }}>
            {Math.round(animatedScore)}%
          </span>
          {size > 100 && (
            <span style={{ fontSize: 10, color: '#888880', fontFamily: 'Inter', marginTop: 2 }}>Score</span>
          )}
        </div>
      </div>
      {label && (
        <span style={{ fontSize: 12, color: '#888880', fontFamily: 'Inter', textAlign: 'center' }}>{label}</span>
      )}
    </div>
  )
}
