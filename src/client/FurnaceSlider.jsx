// 熔炉滑块：粗胶囊轨道里是一条随挡位升温的熔流（热浪纹 + 往前飘的火星），白色拖把带热光。
// 拖动时拖把跟手、身后拖出火花尾迹；每越过一挡迸一簇火星，挡位越高越猛；停在最高挡时偶尔自己爆一下。
import { h, React } from './react.js'
import { createSparks } from './sparks.js'
import { reducedMotion } from './dom.js'

const PILL = 28 // 胶囊高度
const GAP = 3 // 拖把四周到胶囊边的间隙，上下左右一致
const KNOB = PILL - GAP * 2 // 拖把直径 22
const HEAT = ['#fcd34d', '#fbbf24', '#f59e42', '#f97316', '#ef4444', '#f472b6']
const EMBER = ['#fff6dd', '#fde68a', '#fbbf24', '#fb923c']

export const heatColor = f => HEAT[Math.min(HEAT.length - 1, Math.round(Math.max(0, f) * (HEAT.length - 1)))]
const fracOf = (i, n) => (n <= 1 ? 1 : i / (n - 1))
const nearest = (f, n) => (n <= 1 ? 0 : Math.round(f * (n - 1)))
/** 0~1 → 拖把左边缘 / 熔流宽度 */
const thumbLeft = f => `calc(${f} * (100% - ${PILL}px) + ${GAP}px)`
const fillWidth = f => `calc(${f} * (100% - ${PILL}px) + ${PILL}px)`

/**
 * 胶囊内的熔流粒子与热浪纹。edge() 返回熔流右缘的 x（px），heat() 返回 0~1。
 */
function useMolten(canvas, edge, heat, active) {
  React.useEffect(() => {
    if (!active || reducedMotion() || canvas.current === null) return undefined
    const el = canvas.current
    const ctx = el.getContext('2d')
    const parts = []
    let frame = 0
    let tick = 0
    const size = () => {
      const ratio = window.devicePixelRatio || 1
      const r = el.getBoundingClientRect()
      el.width = Math.round(r.width * ratio)
      el.height = Math.round(r.height * ratio)
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    }
    size()
    const observer = new ResizeObserver(size)
    observer.observe(el)
    const draw = () => {
      tick++
      const { width, height } = el.getBoundingClientRect()
      const x1 = edge()
      const f = heat()
      ctx.clearRect(0, 0, width, height)
      ctx.save()
      ctx.beginPath()
      ctx.roundRect(0, 0, Math.max(0, x1), height, height / 2)
      ctx.clip()
      // 热浪纹：两三道沿熔流流动的细波纹，越热越亮越快
      for (let w = 0; w < 3; w++) {
        const base = height * (0.32 + w * 0.18)
        ctx.strokeStyle = `rgba(255, 243, 214, ${0.08 + f * 0.14})`
        ctx.lineWidth = 1
        ctx.beginPath()
        for (let x = 0; x <= x1; x += 4) {
          const y = base + Math.sin((x + tick * (1.2 + f * 2.4)) / (10 + w * 3) + w) * (1.6 + f)
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
      // 火星：在熔流里生成，往前飘、闪烁，越热越多越快
      if (x1 > 20 && Math.random() < 0.3 + f * 1.3) {
        const count = f > 0.7 && Math.random() < 0.5 ? 2 : 1
        for (let i = 0; i < count; i++) {
          const hot = Math.random()
          parts.push({
            x: Math.random() * Math.max(10, x1 - 14),
            y: height * (0.2 + Math.random() * 0.6),
            vx: (0.25 + Math.random() * 0.6) * (0.7 + f * 2.6),
            vy: (Math.random() - 0.6) * 0.25,
            life: 1,
            decay: 0.006 + Math.random() * 0.01,
            r: 0.6 + Math.random() * 1.4,
            color: EMBER[hot > 0.82 ? 0 : hot > 0.5 ? 1 : hot > 0.22 ? 2 : 3],
            phase: Math.random() * 6,
          })
        }
      }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]
        p.x += p.vx
        p.y += p.vy
        p.life -= p.decay
        if (p.life <= 0 || p.x > x1 - 2) { parts.splice(i, 1); continue }
        ctx.globalAlpha = p.life * (0.65 + 0.35 * Math.sin(tick / 3 + p.phase))
        ctx.fillStyle = p.color
        ctx.shadowColor = p.color
        ctx.shadowBlur = 4
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
      ctx.globalAlpha = 1
      ctx.shadowBlur = 0
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(frame); observer.disconnect() }
  }, [active])
}

/**
 * @param props.gears - [{ key, label }]
 * @param props.index - 当前挡位；auto 时忽略
 * @param props.auto - 「自动」：熔流熄灭，拖把变暗
 * @param props.onCommit - 落定新挡位 (index)
 * @param props.onPreview - 拖动中 (fraction 0~1)，松手时 null；用于联动表盘和等级名
 */
export function FurnaceSlider({ gears, index, auto, onCommit, onPreview, disabled }) {
  const n = gears.length
  const pill = React.useRef(null)
  const molten = React.useRef(null)
  const fx = React.useRef(null)
  const sparks = React.useRef(null)
  const [drag, setDrag] = React.useState(null) // 拖动中的 0~1
  const lastX = React.useRef(null)
  const shown = React.useRef(index)

  const f = auto ? 0 : drag ?? fracOf(index, n)
  const current = drag === null ? index : nearest(drag, n)
  const fRef = React.useRef(f)
  fRef.current = f
  // 熔流的绘制循环只在挂载时启动一次，读最新的 auto 要走 ref，不能直接用闭包里的值
  const autoRef = React.useRef(auto)
  autoRef.current = auto

  const thumbX = (value) => {
    const r = pill.current?.getBoundingClientRect()
    return r ? PILL / 2 + value * (r.width - PILL) : 0
  }

  useMolten(molten, () => (autoRef.current ? 0 : thumbX(fRef.current) + KNOB / 2), () => fRef.current, true)

  React.useEffect(() => {
    if (reducedMotion() || fx.current === null) return undefined
    sparks.current = createSparks(fx.current)
    return () => sparks.current?.dispose()
  }, [])

  const burstAt = (value, count, power) => {
    const p = pill.current?.getBoundingClientRect()
    const c = fx.current?.getBoundingClientRect()
    if (!p || !c || !sparks.current) return
    sparks.current.emit(p.left - c.left + thumbX(value), p.top - c.top + PILL / 2, count, power, Math.PI * 1.1)
  }

  // 挡位变化（拖动越挡、点击、滚轮、方向键）：一簇火星，挡位越高越猛
  React.useEffect(() => {
    if (auto || current === shown.current) { shown.current = current; return }
    shown.current = current
    requestAnimationFrame(() => burstAt(drag ?? fracOf(current, n), 10 + current * 3, 1.1 + current * 0.12))
  }, [current, auto])

  // 停在最高挡时偶尔自己爆一下
  React.useEffect(() => {
    if (auto || n < 2 || index !== n - 1 || drag !== null) return undefined
    const timer = setInterval(() => burstAt(1, 6, 0.9), 1800)
    return () => clearInterval(timer)
  }, [auto, index, n, drag])

  const xOf = (event) => {
    const r = pill.current.getBoundingClientRect()
    return Math.max(0, Math.min(1, (event.clientX - r.left - PILL / 2) / (r.width - PILL)))
  }

  const onPointerDown = (event) => {
    if (disabled || n === 0) return
    event.preventDefault()
    pill.current.setPointerCapture(event.pointerId)
    const value = xOf(event)
    lastX.current = value
    setDrag(value)
    onPreview?.(value)
  }

  const onPointerMove = (event) => {
    if (drag === null) return
    const value = xOf(event)
    const speed = Math.abs(value - (lastX.current ?? value)) * 100
    lastX.current = value
    setDrag(value)
    onPreview?.(value)
    // 拖把身后的火花尾迹
    if (speed > 0.3 && sparks.current) {
      const p = pill.current.getBoundingClientRect()
      const c = fx.current.getBoundingClientRect()
      sparks.current.emit(p.left - c.left + thumbX(value), p.top - c.top + PILL / 2, Math.min(5, 1 + Math.floor(speed * 0.5)), 0.5 + Math.min(speed, 8) * 0.08, Math.PI * 0.6)
    }
  }

  const onPointerUp = (event) => {
    if (drag === null) return
    const target = nearest(xOf(event), n)
    setDrag(null)
    lastX.current = null
    onPreview?.(null)
    if (target !== index || auto) onCommit(target)
  }

  // 拖把的光只用贴身的 2px 炉火圈 + 轻投影，留在四周 3px 间隙之内：
  // 外溢的大光晕会被胶囊上下边缘削平，让圆看起来像圆角方块、上下间隙也显得不一致
  const glow = auto
    ? '0 1px 3px rgba(0, 0, 0, .35)'
    : `0 0 0 2px rgba(251, 146, 60, ${(0.35 + f * 0.5).toFixed(2)}), 0 1px 4px rgba(0, 0, 0, .35)`
  const hot = f > 0.82

  return (
    <div className="anv-furnace">
      <div
        ref={pill}
        className={drag === null ? 'anv-pill' : 'anv-pill anv-dragging'}
        role="slider"
        aria-label="推理等级"
        aria-valuemin={0}
        aria-valuemax={Math.max(0, n - 1)}
        aria-valuenow={Math.max(0, current)}
        aria-valuetext={auto ? '自动' : gears[current]?.label}
        aria-disabled={disabled || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className={hot ? 'anv-molten anv-molten-hot' : 'anv-molten'} style={{ width: auto ? 0 : fillWidth(f) }} />
        <canvas ref={molten} className="anv-molten-fx" aria-hidden="true" />
        <span className="anv-thumb" style={{ top: GAP, width: KNOB, height: KNOB, left: thumbLeft(f), boxShadow: glow, opacity: auto ? 0.35 : 1 }} />
      </div>
      <canvas ref={fx} className="anv-furnace-fx" aria-hidden="true" />
      <div className="anv-furnace-ticks">
        {gears.map((gear, i) => (
          <button
            key={gear.key}
            type="button"
            className={!auto && i === current ? 'anv-ftick anv-on' : 'anv-ftick'}
            title={gear.label}
            disabled={disabled}
            onClick={() => { if (i !== index || auto) onCommit(i) }}
          >
            {n > 5 && i % 2 === 1 && i !== current ? '·' : gear.label}
          </button>
        ))}
      </div>
    </div>
  )
}
