import { useEffect, useState } from "react"

interface ComplianceRingProps {
  score: number
  size?: number
  label?: string
}

export default function ComplianceRing({
  score,
  size = 110,
  label = "Compliance Score",
}: ComplianceRingProps) {
  const [animatedScore, setAnimatedScore] = useState(0)
  const strokeWidth = 9
  const r = (size - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference - (animatedScore / 100) * circumference

  useEffect(() => {
    const start = Date.now()
    const duration = 1000
    let rafId: number
    const frame = () => {
      const t = Math.min((Date.now() - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setAnimatedScore(eased * score)
      if (t < 1) {
        rafId = requestAnimationFrame(frame)
      }
    }
    rafId = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafId)
  }, [score])

  return (
    <div className="flex flex-col items-center justify-center text-center w-full h-full">
      <div
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} className="-rotate-90">
          {/* Neutral track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#E2EAF2"
            strokeWidth={strokeWidth}
          />
          {/* Restrained teal progress ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#0D9488"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-75 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[22px] font-bold text-[#102A43] tabular-nums leading-none">
            {Math.round(animatedScore)}%
          </span>
        </div>
      </div>
      {label && (
        <span className="text-[13px] font-medium text-slate-600 mt-3 text-center">
          {label}
        </span>
      )}
    </div>
  )
}
