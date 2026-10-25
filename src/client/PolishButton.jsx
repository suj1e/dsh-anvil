// 输入框工具栏里的闪光按钮：点一下结合对话上下文润色草稿，润色后可撤销。
// 动画：润色中按钮像被锤子敲打、文字上循环扫过炉火光；完成时火星四溅、新文字上扫过一道亮光。
import { h, React } from './react.js'
import { polish } from './api.js'
import { findComposer, overlay, reducedMotion } from './dom.js'

const BUBBLE_MS = 3500
const SPARK_COLORS = ['var(--psm-ember-1)', 'var(--psm-ember-2)', 'var(--psm-ember-3)']

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="psm-ember" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fcd34d" />
          <stop offset=".5" stopColor="#fb923c" />
          <stop offset="1" stopColor="#f472b6" />
        </linearGradient>
      </defs>
      <path
        className="psm-main"
        d="M10 3.5C10.8 9 12.6 10.9 18 12C12.6 13.1 10.8 15 10 20.5C9.2 15 7.4 13.1 2 12C7.4 10.9 9.2 9 10 3.5Z"
        fill="url(#psm-ember)"
      />
      <path
        className="psm-mini"
        d="M18.5 1.5C18.8 3.6 19.4 4.2 21.5 4.5C19.4 4.8 18.8 5.4 18.5 7.5C18.2 5.4 17.6 4.8 15.5 4.5C17.6 4.2 18.2 3.6 18.5 1.5Z"
        fill="#fde68a"
      />
    </svg>
  )
}

function UndoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#fb923c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 010 11H11" />
    </svg>
  )
}

/** 一次性火星：12 颗粒子沿放射方向飞出 */
function Sparks() {
  const sparks = []
  for (let i = 0; i < 12; i++) {
    const style = {
      '--a': `${i * 30 + (i % 2) * 12}deg`,
      '--r': `${-(14 + (i % 3) * 5)}px`,
      '--c': SPARK_COLORS[i % 3],
      animationDelay: `${(i % 4) * 25}ms`,
    }
    sparks.push(<i key={i} className="psm-spark" style={style} />)
  }
  return <span className="psm-sparks" aria-hidden="true">{sparks}</span>
}

export function PolishButton({ sessionId, inputActions, useInput, useSession }) {
  // DSH 的会话 Hook 需要 selector，只取用到的字段
  const draft = useInput(state => state.draft)
  const phase = useInput(state => state.phase)
  const running = useSession(snapshot => snapshot.running)
  const [state, setState] = React.useState('idle') // idle | working | done
  const [bubble, setBubble] = React.useState(null)
  const [burst, setBurst] = React.useState(0)
  const [shake, setShake] = React.useState(0)
  const root = React.useRef(null)
  const original = React.useRef(null)
  const polished = React.useRef(null)
  const abort = React.useRef(null)

  const editable = phase === 'plain'

  // 只在出错时显示文字，成功与撤销都只用动画表达
  const flash = React.useCallback((kind, text) => {
    setBubble({ kind, text, at: Date.now() })
  }, [])

  React.useEffect(() => {
    if (bubble === null) return undefined
    const timer = setTimeout(() => setBubble(null), BUBBLE_MS)
    return () => clearTimeout(timer)
  }, [bubble])

  React.useEffect(() => {
    if (burst === 0) return undefined
    const timer = setTimeout(() => setBurst(0), 800)
    return () => clearTimeout(timer)
  }, [burst])

  // 撤销一直可用，直到用户改了草稿或把它发出去
  React.useEffect(() => {
    if (state === 'done' && draft.trim() !== polished.current.trim()) setState('idle')
  }, [state, draft])

  // 润色中：草稿文字上循环扫过炉火光
  React.useEffect(() => {
    if (state !== 'working') return undefined
    const found = findComposer(root.current)
    return found ? overlay(found.editor, 'psm-fx psm-forging') : undefined
  }, [state])

  // 切换会话或卸载时取消进行中的请求
  React.useEffect(() => () => abort.current?.abort(), [sessionId])

  /** 替换草稿后，在新文字上扫过一道亮光 */
  const sweep = () => {
    requestAnimationFrame(() => {
      const found = findComposer(root.current)
      if (found) overlay(found.editor, 'psm-fx psm-sweep', 950)
    })
  }

  const run = async () => {
    if (state === 'working') { abort.current?.abort(); return }
    if (state === 'done') {
      inputActions.setDraft(original.current)
      setState('idle')
      sweep()
      return
    }
    const text = draft.trim()
    if (text === '') { setShake(Date.now()); return }
    const controller = new AbortController()
    abort.current = controller
    setState('working')
    try {
      const result = await polish(sessionId, text, controller.signal)
      if (controller.signal.aborted) return
      original.current = draft
      polished.current = result
      inputActions.setDraft(result)
      setState('done')
      if (!reducedMotion()) setBurst(Date.now())
      sweep()
    } catch (error) {
      setState('idle')
      if (!controller.signal.aborted) flash('error', error.message)
    }
  }

  const disabled = !editable || running && state !== 'working'
  const label = state === 'working' ? '润色中…点击取消' : state === 'done' ? '撤销润色' : '润色（结合上下文）'

  return (
    <span ref={root} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        className="psm-polish"
        data-state={state}
        data-shake={shake === 0 ? undefined : shake % 2}
        onAnimationEnd={(event) => { if (event.animationName === 'psm-shake') setShake(0) }}
        aria-label={label}
        title={label}
        disabled={disabled}
        onClick={run}
      >
        {/* key 变化时重新挂载，触发图标弹出动画 */}
        <span key={state === 'done' ? 'undo' : 'sparkle'} className="psm-icon">
          {state === 'done' ? <UndoIcon /> : <SparkleIcon />}
        </span>
        {burst === 0 ? null : <Sparks key={burst} />}
      </button>
      {bubble === null ? null : <span key={bubble.at} className="psm-bubble" data-kind={bubble.kind}>{bubble.text}</span>}
    </span>
  )
}
