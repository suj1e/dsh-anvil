// 预测下一句：每轮回答结束后请求一次预测，输入框为空时以灰字显示，按 Tab 采用。
// 动画：等待时钢琴键琶音；结果逐字打出；采用时输入卡片边缘亮一下。
import { Fragment, h, React } from './react.js'
import { predict } from './api.js'
import { findComposer, overlay, reducedMotion } from './dom.js'

const TYPE_MS = 32

/** 编辑器为空时 DSH 显示的占位提示：与编辑器同层、文字非空、不是编辑器本身 */
function findPlaceholder(editor) {
  const parent = editor.parentElement
  if (!parent) return null
  for (const child of parent.children) {
    if (child !== editor && !child.contains(editor) && child.textContent.trim() !== '' && !child.classList.contains('psm-ghost')) {
      return child
    }
  }
  return null
}

// 白键 + 黑键交替，与 i 一起决定按下顺序
const KEYS = ['w', 'b', 'w', 'b', 'w', 'w', 'b', 'w']
const NOTES = [{ x: 6, d: '0s', n: '♪' }, { x: 26, d: '.7s', n: '♫' }, { x: 44, d: '1.4s', n: '♪' }]

function Piano() {
  return (
    <span className="psm-piano" aria-label="正在预测下一句">
      {KEYS.map((kind, i) => (
        <i key={i} className={kind === 'b' ? 'psm-key psm-black' : 'psm-key'} style={{ '--i': i }} />
      ))}
      {NOTES.map((note, i) => (
        <span key={`n${i}`} className="psm-note" style={{ '--x': note.x, '--d': note.d }}>{note.n}</span>
      ))}
    </span>
  )
}

export function Suggestion({ sessionId, inputActions, useInput, useSession }) {
  // DSH 的会话 Hook 需要 selector，只取用到的字段
  const draft = useInput(state => state.draft)
  const phase = useInput(state => state.phase)
  const running = useSession(snapshot => snapshot.running)
  const [text, setText] = React.useState('')
  const [pending, setPending] = React.useState(false)
  const [typed, setTyped] = React.useState(0)
  const [box, setBox] = React.useState(null)
  const anchor = React.useRef(null)
  const wasRunning = React.useRef(running)

  // 切换会话时清空
  React.useEffect(() => { setText(''); setPending(false); wasRunning.current = running }, [sessionId])

  // 一轮回答结束（running: true -> false）时请求预测
  React.useEffect(() => {
    const finished = wasRunning.current && !running
    wasRunning.current = running
    if (running) { setText(''); setPending(false); return undefined }
    if (!finished) return undefined
    const controller = new AbortController()
    setPending(true)
    predict(sessionId, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        setTyped(reducedMotion() ? result.length : 0)
        setText(result)
      })
      .catch(() => {})
      .finally(() => { if (!controller.signal.aborted) setPending(false) })
    return () => { controller.abort(); setPending(false) }
  }, [running, sessionId])

  // 逐字打出
  React.useEffect(() => {
    if (typed >= text.length) return undefined
    const timer = setTimeout(() => setTyped(n => n + 1), TYPE_MS)
    return () => clearTimeout(timer)
  }, [typed, text])

  const empty = draft === '' && phase === 'plain' && !running
  const showText = empty && text !== ''
  const showPiano = empty && pending
  const visible = showText || showPiano

  // 把灰字放到编辑器文字的位置，并隐藏 DSH 自己的占位提示
  React.useLayoutEffect(() => {
    if (!visible) { setBox(null); return undefined }
    const found = findComposer(anchor.current?.parentElement)
    if (!found) return undefined
    const { card, editor } = found
    const placeholder = findPlaceholder(editor)
    placeholder?.classList.add('psm-hide-placeholder')
    card.setAttribute('data-psm-ghost', '')
    const measure = () => {
      const origin = anchor.current?.offsetParent ?? card
      const base = origin.getBoundingClientRect()
      const rect = editor.getBoundingClientRect()
      const style = getComputedStyle(editor)
      setBox({
        left: rect.left - base.left + parseFloat(style.paddingLeft),
        top: rect.top - base.top + parseFloat(style.paddingTop),
        width: rect.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
        font: style.font,
        lineHeight: style.lineHeight,
      })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(editor)
    return () => {
      observer.disconnect()
      placeholder?.classList.remove('psm-hide-placeholder')
      card.removeAttribute('data-psm-ghost')
    }
  }, [visible])

  // Tab 采用预测（打字中按也直接采用全文）：仅当焦点在本输入框内
  React.useEffect(() => {
    if (!showText) return undefined
    const onKeyDown = (event) => {
      if (event.key !== 'Tab' || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return
      const found = findComposer(anchor.current?.parentElement)
      if (!found || !found.card.contains(document.activeElement)) return
      event.preventDefault()
      event.stopImmediatePropagation()
      inputActions.setDraft(text)
      setText('')
      overlay(found.card, 'psm-fx psm-flash', 650)
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [showText, text, inputActions])

  const done = typed >= text.length

  return (
    <span ref={anchor} style={{ display: 'contents' }}>
      {visible && box !== null
        ? (
            <span
              className="psm-ghost"
              style={{ left: box.left, top: box.top, width: box.width, font: box.font, lineHeight: box.lineHeight }}
            >
              {showText
                ? (
                    <>
                      <span className="psm-ghost-text">{text.slice(0, typed)}</span>
                      {done ? null : <span className="psm-caret" />}
                    </>
                  )
                : (
                    <>
                      <Piano />
                      <span className="psm-piano-label">正在想你下一句…</span>
                    </>
                  )}
            </span>
          )
        : null}
    </span>
  )
}
