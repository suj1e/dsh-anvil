// 小火龙：像素画的橙色幼龙（点阵见 dragon.js），趴在输入卡片右上沿、朝左，按会话状态切换动作。
//   打字 → 眼睛往左瞟；模型思考 → 张嘴朝左喷火（推理挡位越高火越长）；回答完成 → ^^ 眼蹦两下；
//   闲置太久 → 睡着；点它 → 蹦一下；按住左右拖 → 被拎起来（^^ 眼），松手落回卡片上沿，位置记在 localStorage。
//   拖到靠左、朝左喷火会伸出卡片时，自动转身朝右。
// 挂在 conversation.input.overlay 上取会话状态，本体 portal 到输入框所在的 composerSeat（卡片外层的 sticky 容器），fixed 定位跟随卡片。
// 不放 body：body 上的 fixed 元素会盖住卡片里弹出的 / 指令和 @ 文件列表；放进同一个层叠上下文、垫在卡片下面（z-index 0 < 卡片 1）就不会。
import { h, React, ReactDOM } from './react.js'
import { findComposer, reducedMotion } from './dom.js'
import { heatStore } from './shared.js'
import { COLS, ROWS, dragonPixels } from './dragon.js'

const DONE_MS = 1700
const TYPING_MS = 2500
const SLEEP_MS = 90000
const PX = 4 // 一个像素画成 4×4
const FIRE_COLS = 12 // 左边给喷火留的列数
const TOP_ROWS = 5 // 头顶给 z 和星星留的行数
const WIDTH = (FIRE_COLS + COLS) * PX
const HEIGHT = (TOP_ROWS + ROWS) * PX
const RIGHT_INSET = 52 // 龙身右边缘距卡片右边缘
const SINK = 2 // 脚压进卡片上沿一点，像趴在上面
const EDGE = 16 // 龙身离卡片左右边缘至少留的距离
const DRAG_START = 4 // 按下后移动超过这么多像素才算拖动，否则算点击
const DROP_MS = 300
const POS_KEY = 'dsh-anvil:pet-x' // 龙身在可移动范围里的位置，0（最左）~ 1（最右）

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

function readRatio() {
  try {
    const v = Number(localStorage.getItem(POS_KEY))
    return localStorage.getItem(POS_KEY) !== null && Number.isFinite(v) ? clamp(v, 0, 1) : null
  } catch { return null }
}

function writeRatio(v) {
  try { localStorage.setItem(POS_KEY, String(v)) } catch { /* 隐私模式等：不记位置 */ }
}

function useHeat() {
  return React.useSyncExternalStore(heatStore.subscribe, heatStore.get)
}

export function Pet({ sessionId, useInput, useSession }) {
  const draft = useInput(state => state.draft)
  const running = useSession(snapshot => snapshot.running)
  const heat = useHeat()
  const anchor = React.useRef(null)
  const [pos, setPos] = React.useState(null)
  const [host, setHost] = React.useState(null) // portal 目标
  const [done, setDone] = React.useState(false)
  const [poke, setPoke] = React.useState(0)
  const [typing, setTyping] = React.useState(false)
  const [asleep, setAsleep] = React.useState(false)
  const wasRunning = React.useRef(running)
  const ratio = React.useRef(readRatio()) // null：还没拖过，用默认位置
  const drag = React.useRef(null) // 拖动中：{ x: 指针 x, grab: 指针到龙身左缘的距离 }
  const track = React.useRef(null) // 最近一次定位时龙身左缘的可移动范围 { min, max, bodyLeft }
  const unlisten = React.useRef(null)
  const [held, setHeld] = React.useState(false)
  const [drop, setDrop] = React.useState(0)

  // 回答完成：running true → false
  React.useEffect(() => {
    if (wasRunning.current && !running) {
      setDone(true)
      const timer = setTimeout(() => setDone(false), DONE_MS)
      wasRunning.current = running
      return () => clearTimeout(timer)
    }
    wasRunning.current = running
    return undefined
  }, [running])

  // 打字：草稿最近有变化
  React.useEffect(() => {
    if (draft === '') { setTyping(false); return undefined }
    setTyping(true)
    const timer = setTimeout(() => setTyping(false), TYPING_MS)
    return () => clearTimeout(timer)
  }, [draft])

  // 闲置太久睡着；有任何动静就醒
  React.useEffect(() => {
    setAsleep(false)
    if (running) return undefined
    const timer = setTimeout(() => setAsleep(true), SLEEP_MS)
    return () => clearTimeout(timer)
  }, [draft, running, poke, sessionId])

  // 跟随输入卡片右上沿；顺带给卡片和上方的「工作区 / 模式」行打上换皮用的 class
  React.useEffect(() => {
    let frame = 0
    let card = null
    const tagged = new Set()
    const tag = (el, cls) => { if (el && !el.classList.contains(cls)) { el.classList.add(cls); tagged.add([el, cls]) } }
    const place = () => {
      if (!card || !card.isConnected) card = findComposer(anchor.current?.parentElement)?.card ?? null
      if (card) {
        tag(card, 'anv-card')
        const row = [...(card.closest('[class*="composerStack"]')?.children ?? [])].find(el => /_heroWorkspaceRow\b/.test(el.className))
        tag(row, 'anv-tabstrip')
        const seat = card.closest('[class*="composerSeat"]') ?? document.body
        setHost(prev => (prev === seat ? prev : seat))
        const r = card.getBoundingClientRect()
        const body = COLS * PX
        const min = r.left + EDGE
        const max = Math.max(min, r.right - EDGE - body)
        const bodyLeft = clamp(
          drag.current !== null ? drag.current.x - drag.current.grab
            : ratio.current !== null ? min + ratio.current * (max - min)
              : r.right - RIGHT_INSET - body,
          min, max,
        )
        track.current = { min, max, bodyLeft }
        const next = {
          left: Math.round(bodyLeft - FIRE_COLS * PX),
          top: Math.round(r.top - HEIGHT + SINK),
          // 朝左喷火会伸出卡片左缘时转身朝右
          flip: bodyLeft - r.left < FIRE_COLS * PX,
        }
        setPos(prev => (prev && prev.left === next.left && prev.top === next.top && prev.flip === next.flip ? prev : next))
      }
      frame = requestAnimationFrame(place)
    }
    place()
    return () => {
      cancelAnimationFrame(frame)
      for (const [el, cls] of tagged) el.classList.remove(cls)
    }
  }, [sessionId])

  // 拖动：按下后移动超过 DRAG_START 才算拖，否则松手算点击。用 window 监听，拖出龙身范围也不断
  React.useEffect(() => () => unlisten.current?.(), [])
  const onPointerDown = (event) => {
    if (event.button !== 0 || track.current === null) return
    event.preventDefault()
    const x0 = event.clientX
    const grab = x0 - track.current.bodyLeft
    let moved = false
    const move = (e) => {
      if (!moved && Math.abs(e.clientX - x0) < DRAG_START) return
      moved = true
      drag.current = { x: e.clientX, grab }
      setHeld(true)
    }
    const up = () => {
      unlisten.current?.()
      if (!moved) { setPoke(Date.now()); return }
      const { min, max, bodyLeft } = track.current
      ratio.current = max > min ? (bodyLeft - min) / (max - min) : 1
      writeRatio(ratio.current)
      drag.current = null
      setHeld(false)
      setDrop(Date.now())
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    unlisten.current = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      unlisten.current = null
    }
  }

  React.useEffect(() => {
    if (drop === 0) return undefined
    const timer = setTimeout(() => setDrop(0), DROP_MS)
    return () => clearTimeout(timer)
  }, [drop])

  const mood = held ? 'held'
    : poke > 0 && Date.now() - poke < DONE_MS ? 'done'
    : done ? 'done'
      : running ? 'thinking'
        : typing ? 'typing'
          : asleep ? 'sleep'
            : 'idle'

  React.useEffect(() => {
    if (poke === 0) return undefined
    const timer = setTimeout(() => setPoke(0), DONE_MS)
    return () => clearTimeout(timer)
  }, [poke])

  // 逐帧动画：眨眼、尾巴火、喷火都靠换帧
  const [tick, setTick] = React.useState(1)
  React.useEffect(() => {
    if (reducedMotion()) return undefined
    const timer = setInterval(() => setTick(t => t + 1), mood === 'thinking' ? 140 : 280)
    return () => clearInterval(timer)
  }, [mood])

  const pixels = dragonPixels({ mood, tick: reducedMotion() ? 1 : tick, heat })
  const label = { idle: '小火龙', typing: '小火龙在看你打字', thinking: '小火龙在喷火', done: '小火龙很开心', sleep: '小火龙睡着了', held: '小火龙被拎起来了' }[mood]

  const body = pos === null || host === null ? null : (
    <div className="anv-pet" style={{ left: pos.left, top: pos.top, width: WIDTH, height: HEIGHT }} data-mood={mood}>
      <svg
        className={`anv-pet-svg${mood === 'done' ? ' anv-pet-hop' : ''}${drop !== 0 ? ' anv-pet-drop' : ''}`}
        width={WIDTH}
        height={HEIGHT}
        viewBox={`${-FIRE_COLS} ${-TOP_ROWS} ${FIRE_COLS + COLS} ${TOP_ROWS + ROWS}`}
        shapeRendering="crispEdges"
        role="img"
        aria-label={label}
        onPointerDown={onPointerDown}
      >
        {/* 转身朝右：以龙身为轴水平镜像，喷火随之到右边 */}
        <g transform={pos.flip ? `translate(${COLS} 0) scale(-1 1)` : undefined}>
          <g className="anv-pet-bob">
            {pixels.map(({ x, y, c }) => <rect key={`${x},${y}`} x={x} y={y} width="1" height="1" fill={c} />)}
          </g>
        </g>
        {mood === 'sleep' ? (
          <g fill="#9a9aa3" fontSize="5" fontFamily="monospace">
            <text className="anv-pet-z" x="-1" y="-1">z</text>
            <text className="anv-pet-z" x="-4" y="-3" fontSize="3.5" style={{ animationDelay: '1.1s' }}>z</text>
          </g>
        ) : mood === 'done' ? (
          <g>
            <path className="anv-pet-twinkle" d="M-2 -3h1v1h1v1h-1v1h-1v-1h-1v-1h1z" fill="#fde68a" />
            <path className="anv-pet-twinkle" d="M12 -4h1v1h1v1h-1v1h-1v-1h-1v-1h1z" fill="#f9a8d4" style={{ animationDelay: '.3s' }} />
          </g>
        ) : null}
      </svg>
    </div>
  )

  return (
    <span ref={anchor} style={{ display: 'contents' }}>
      {body === null ? null : ReactDOM.createPortal(body, host)}
    </span>
  )
}
