// 预测下一句：每轮回答结束后请求一次预测，输入框为空时以灰字显示，按 Tab 采用。
import { h, React } from './react.js'
import { predict } from './api.js'

/** 从 overlay 锚点向上找到包含编辑器的输入卡片 */
function findEditor(anchor) {
  for (let node = anchor?.parentElement; node; node = node.parentElement) {
    const editor = node.querySelector('[contenteditable="true"]')
    if (editor) return { card: node, editor }
  }
  return null
}

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

export function Suggestion({ sessionId, inputActions, useInput, useSession }) {
  // DSH 的会话 Hook 需要 selector，只取用到的字段
  const draft = useInput(state => state.draft)
  const phase = useInput(state => state.phase)
  const running = useSession(snapshot => snapshot.running)
  const [text, setText] = React.useState('')
  const [box, setBox] = React.useState(null)
  const anchor = React.useRef(null)
  const wasRunning = React.useRef(running)

  // 切换会话时清空
  React.useEffect(() => { setText(''); wasRunning.current = running }, [sessionId])

  // 一轮回答结束（running: true -> false）时请求预测
  React.useEffect(() => {
    const finished = wasRunning.current && !running
    wasRunning.current = running
    if (running) { setText(''); return undefined }
    if (!finished) return undefined
    const controller = new AbortController()
    predict(sessionId, controller.signal)
      .then(result => { if (!controller.signal.aborted) setText(result) })
      .catch(() => {})
    return () => controller.abort()
  }, [running, sessionId])

  const visible = text !== '' && draft === '' && phase === 'plain' && !running

  // 把灰字放到编辑器文字的位置，并隐藏 DSH 自己的占位提示
  React.useLayoutEffect(() => {
    if (!visible) { setBox(null); return undefined }
    const found = findEditor(anchor.current)
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

  // Tab 采用预测：仅当焦点在本输入框内
  React.useEffect(() => {
    if (!visible) return undefined
    const onKeyDown = (event) => {
      if (event.key !== 'Tab' || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return
      const found = findEditor(anchor.current)
      if (!found || !found.card.contains(document.activeElement)) return
      event.preventDefault()
      event.stopImmediatePropagation()
      inputActions.setDraft(text)
      setText('')
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [visible, text, inputActions])

  return (
    <span ref={anchor} style={{ display: 'contents' }}>
      {visible && box !== null
        ? (
            <span
              className="psm-ghost"
              style={{ left: box.left, top: box.top, width: box.width, font: box.font, lineHeight: box.lineHeight }}
            >
              {text}
              <kbd>Tab</kbd>
            </span>
          )
        : null}
    </span>
  )
}
