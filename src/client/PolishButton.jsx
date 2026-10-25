// 输入框工具栏里的星星按钮：点一下结合对话上下文润色草稿，润色后可撤销。
import { h, React } from './react.js'
import { polish } from './api.js'

const BUBBLE_MS = 3500

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="psm-star-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fde047" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <path
        className="psm-star"
        d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z"
        fill="url(#psm-star-fill)"
      />
      <path className="psm-twinkle" d="M19 2.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" fill="#fbbf24" />
      <path className="psm-twinkle psm-twinkle-2" d="M5 16.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z" fill="#fbbf24" />
    </svg>
  )
}

function UndoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 010 11H11" />
    </svg>
  )
}

export function PolishButton({ sessionId, inputActions, useInput, useSession }) {
  // DSH 的会话 Hook 需要 selector，只取用到的字段
  const draft = useInput(state => state.draft)
  const phase = useInput(state => state.phase)
  const running = useSession(snapshot => snapshot.running)
  const [state, setState] = React.useState('idle') // idle | working | done
  const [bubble, setBubble] = React.useState(null)
  const original = React.useRef(null)
  const polished = React.useRef(null)
  const abort = React.useRef(null)

  const editable = phase === 'plain'

  const flash = React.useCallback((kind, text) => {
    setBubble({ kind, text, at: Date.now() })
  }, [])

  React.useEffect(() => {
    if (bubble === null) return undefined
    const timer = setTimeout(() => setBubble(null), BUBBLE_MS)
    return () => clearTimeout(timer)
  }, [bubble])

  // 撤销一直可用，直到用户改了草稿或把它发出去
  React.useEffect(() => {
    if (state === 'done' && draft.trim() !== polished.current.trim()) setState('idle')
  }, [state, draft])

  // 切换会话或卸载时取消进行中的请求
  React.useEffect(() => () => abort.current?.abort(), [sessionId])

  const run = async () => {
    if (state === 'working') { abort.current?.abort(); return }
    if (state === 'done') {
      inputActions.setDraft(original.current)
      setState('idle')
      flash('info', '已恢复原文')
      return
    }
    const text = draft.trim()
    if (text === '') { flash('info', '先输入一些内容再润色'); return }
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
      flash('info', '已润色，再点一下可撤销')
    } catch (error) {
      if (controller.signal.aborted) { setState('idle'); return }
      setState('idle')
      flash('error', error.message)
    }
  }

  const disabled = !editable || running && state !== 'working'
  const label = state === 'working' ? '润色中…点击取消' : state === 'done' ? '撤销润色' : '润色（结合上下文）'

  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        className="psm-polish"
        data-state={state}
        aria-label={label}
        title={label}
        disabled={disabled}
        onClick={run}
      >
        {state === 'done' ? <UndoIcon /> : <StarIcon />}
      </button>
      {bubble === null ? null : <span className="psm-bubble" data-kind={bubble.kind}>{bubble.text}</span>}
    </span>
  )
}
