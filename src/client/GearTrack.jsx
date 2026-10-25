// 挡位条：只画刻度不写字，挡位名只在挡把上。拖动时挡把跟手、轨道被炉火填满并溅出火星，
// 越过刻度「咔哒」并迸一簇火星（挡位越高越猛），松手回弹落位。
import { h, React } from './react.js'
import { createSparks } from './sparks.js'
import { reducedMotion } from './dom.js'

// 首尾刻度离轨道两端留出半个挡把宽，挡把在首尾挡也完整落在轨道内
const INSET = 24

/** 挡位 i 的位置（0~1） */
const fracOf = (i, n) => (n <= 1 ? 0.5 : i / (n - 1))
const nearest = (f, n) => (n <= 1 ? 0 : Math.round(f * (n - 1)))
/** 0~1 → CSS left，扣掉两端留白 */
const leftOf = f => `calc(${INSET}px + (100% - ${INSET * 2}px) * ${f})`

/**
 * @param props.gears - [{ key, label }]
 * @param props.index - 当前挡位；-1 表示「自动」（不显示挡把）
 * @param props.onCommit - 落定新挡位 (index)
 * @param props.onPreview - 拖动中 (fraction 0~1)，松手时 null；用于联动表盘
 */
export function GearTrack({ gears, index, onCommit, onPreview, disabled }) {
  const n = gears.length
  const track = React.useRef(null)
  const canvas = React.useRef(null)
  const sparks = React.useRef(null)
  const [dragX, setDragX] = React.useState(null)
  const [clickKey, setClickKey] = React.useState(0)
  const shown = React.useRef(index)
  const lastX = React.useRef(null)

  const resting = index >= 0 ? fracOf(index, n) : null
  const x = dragX ?? resting
  const current = dragX === null ? index : nearest(dragX, n)

  React.useEffect(() => {
    if (reducedMotion() || canvas.current === null) return undefined
    sparks.current = createSparks(canvas.current)
    return () => sparks.current?.dispose()
  }, [])

  // 挡位变化（拖动越挡、点击、滚轮、方向键）：咔哒 + 一簇火星
  React.useEffect(() => {
    if (current === shown.current) return
    shown.current = current
    if (current < 0) return
    setClickKey(k => k + 1)
    requestAnimationFrame(() => burst(8 + current * 4, 1.1 + current * 0.15))
  }, [current])

  function point(f) {
    const t = track.current?.getBoundingClientRect()
    const c = canvas.current?.getBoundingClientRect()
    if (!t || !c) return null
    return [t.left - c.left + INSET + (t.width - INSET * 2) * f, t.top - c.top + t.height / 2]
  }

  function burst(count, power) {
    const p = point(dragX ?? fracOf(Math.max(0, current), n))
    if (p && sparks.current) sparks.current.emit(p[0], p[1], count, power, Math.PI * 0.9)
  }

  function xOf(event) {
    const r = track.current.getBoundingClientRect()
    return Math.max(0, Math.min(1, (event.clientX - r.left - INSET) / (r.width - INSET * 2)))
  }

  const onPointerDown = (event) => {
    if (disabled || n === 0) return
    event.preventDefault()
    track.current.setPointerCapture(event.pointerId)
    const value = xOf(event)
    lastX.current = value
    setDragX(value)
    onPreview?.(value)
  }

  const onPointerMove = (event) => {
    if (dragX === null) return
    const value = xOf(event)
    const speed = Math.abs(value - (lastX.current ?? value))
    lastX.current = value
    setDragX(value)
    onPreview?.(value)
    if (speed > 0.003 && sparks.current) {
      const p = point(value)
      const s = speed * 100
      if (p) sparks.current.emit(p[0], p[1], Math.min(5, 1 + Math.floor(s * 0.5)), 0.5 + Math.min(s, 8) * 0.08, Math.PI * 0.6)
    }
  }

  const onPointerUp = (event) => {
    if (dragX === null) return
    const target = nearest(xOf(event), n)
    setDragX(null)
    lastX.current = null
    onPreview?.(null)
    if (target !== index) onCommit(target)
  }

  return (
    <div className="anv-track-wrap">
      <div
        ref={track}
        className={dragX === null ? 'anv-track' : 'anv-track anv-dragging'}
        role="slider"
        aria-label="推理等级"
        aria-valuemin={0}
        aria-valuemax={n - 1}
        aria-valuenow={Math.max(0, current)}
        aria-valuetext={current >= 0 ? gears[current]?.label : '自动'}
        aria-disabled={disabled || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="anv-rail" />
        <div className="anv-rail-fill" style={{ width: x === null ? 0 : leftOf(x) }} />
        {gears.map((gear, i) => (
          <span
            key={gear.key}
            className={current >= 0 && i <= current ? 'anv-tick anv-tick-on' : 'anv-tick'}
            style={{ left: leftOf(fracOf(i, n)) }}
            title={gear.label}
          />
        ))}
        {x === null ? null : (
          <span key={clickKey} className="anv-knob" style={{ left: leftOf(x) }}>{gears[current]?.label}</span>
        )}
      </div>
      <canvas ref={canvas} className="anv-track-fx" aria-hidden="true" />
    </div>
  )
}
