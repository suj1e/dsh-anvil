// 组件间共享的小状态：模型选择器写入当前推理「热度」（0~1），小火龙读它决定喷火大小。
const listeners = new Set()
let heat = 0.5

export const heatStore = {
  get: () => heat,
  set(value) {
    if (value === heat) return
    heat = value
    for (const fn of listeners) fn()
  },
  subscribe(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
}
