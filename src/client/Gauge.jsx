// 迷你转速表：一段弧 + 指针，fraction 为 0~1。
import { h } from './react.js'

function arcPath(fraction) {
  if (fraction <= 0.001) return ''
  const angle = Math.PI * (1 - Math.min(1, fraction))
  const x = 17 + 13 * Math.cos(angle)
  const y = 21 - 13 * Math.sin(angle)
  return `M 4 21 A 13 13 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)}`
}

export function Gauge({ fraction, size = 24, stroke = 3, active = true }) {
  const f = Math.max(0, Math.min(1, fraction))
  return (
    <svg className="anv-gauge" viewBox="0 0 34 24" width={size} height={(size * 24) / 34} aria-hidden="true">
      <path d="M 4 21 A 13 13 0 0 1 30 21" className="anv-gauge-track" strokeWidth={stroke} />
      {active ? <path d={arcPath(f)} className="anv-gauge-arc" strokeWidth={stroke} /> : null}
      <line
        className="anv-gauge-needle"
        x1="17" y1="21" x2="17" y2="9"
        strokeWidth={stroke * 0.7}
        style={{ transform: `rotate(${-90 + 180 * (active ? f : 0)}deg)` }}
      />
      <circle cx="17" cy="21" r={stroke * 0.75} className="anv-gauge-hub" />
    </svg>
  )
}
