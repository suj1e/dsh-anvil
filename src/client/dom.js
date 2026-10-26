// 输入框 DOM 辅助：DSH 没有公开编辑器元素，从插件组件所在节点向上查找。

/** 从 node 向上找到包含编辑器的输入卡片 */
export function findComposer(node) {
  for (let n = node; n; n = n.parentElement) {
    const editor = n.querySelector?.('[contenteditable="true"]')
    if (editor) return { card: n, editor }
  }
  return null
}

export const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

/**
 * 在目标元素上方叠一层 fixed 定位的特效，每帧跟随目标位置（输入框会随内容伸缩）。
 * @param {Element} target - 要覆盖的元素
 * @param {string} className - 特效样式
 * @param {number} [ms] - 自动移除的时间；不传则需手动调用返回的函数移除
 * @param {{ pad: number, frame: Element }} [text] - 传了就只盖住文字区域（内容盒）并向外留 pad 像素，
 *   左右以 frame（输入卡片）为准对称：编辑器在卡片里左右位置和内边距都不对称，直接盖会一边宽一边窄
 * @returns {() => void} 移除函数
 */
export function overlay(target, className, ms, text) {
  if (reducedMotion()) return () => {}
  const el = document.createElement('div')
  el.className = className
  el.setAttribute('aria-hidden', 'true')
  const style = getComputedStyle(target)
  const radius = text === undefined ? style.borderRadius : '8px'
  let frame = 0
  const place = () => {
    const r = target.getBoundingClientRect()
    let { left, top, width, height } = r
    if (text !== undefined) {
      const px = name => parseFloat(style[name]) || 0
      const f = text.frame.getBoundingClientRect()
      const inset = r.left + px('paddingLeft') - text.pad - f.left
      left = f.left + inset
      width = f.width - inset * 2
      top += px('paddingTop') - text.pad / 2
      height -= px('paddingTop') + px('paddingBottom') - text.pad
    }
    Object.assign(el.style, {
      left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px`, borderRadius: radius,
    })
    frame = requestAnimationFrame(place)
  }
  place()
  document.body.appendChild(el)
  let timer
  const remove = () => {
    cancelAnimationFrame(frame)
    clearTimeout(timer)
    el.remove()
  }
  if (ms !== undefined) timer = setTimeout(remove, ms)
  return remove
}
