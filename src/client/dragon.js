// 像素小火龙的点阵：每行一个字符串，一个字符一个像素，'.' 是透明。
// 各种状态只替换几行（眼睛、嘴、尾巴火），其余共用一张底图。

export const PALETTE = {
  o: '#3b1d10', // 描边
  b: '#f59e42', // 身子
  d: '#d9772f', // 身上的斑点
  c: '#fde7c4', // 肚皮、角
  l: '#fcd34d', // 翅膀
  e: '#1b1b1e', // 眼睛
  w: '#ffffff', // 眼睛高光
  p: '#f472b6', // 腮红
  f: '#fb923c', // 火
  y: '#fde68a', // 火芯
  r: '#ef4444', // 背刺
}

export const COLS = 21
export const ROWS = 14

const BASE = [
  '....o...o............',
  '...oco.oco...........',
  '...obboobbo..........',
  '..obbbbbbbbo..o.o....',
  '.obbbbbbbbbbooforo...',
  'obbweebbweeboollo....',
  'obbeeebbeeebollllo.y.',
  'obbbbbbbbbbbolllo.yfy',
  '.obpbboobbpbooooo.ofo',
  '..obbbbbbbbbbbbbbo.o.',
  '..obcccccbdbdbbbbo...',
  '..obcccccbbbbbbbo....',
  '...obbobbbbbobbo.....',
  '....oo.ooooo.oo......',
]

const EYES = {
  open: { 5: 'obbweebbweeboollo....', 6: 'obbeeebbeeebollllo.y.' },
  left: { 5: 'obweebbweebboollo....', 6: 'obeeebbeeebbollllo.y.' },
  shut: { 5: 'obbbbbbbbbbboollo....', 6: 'obbooobbooobollllo.y.' },
  happy: { 5: 'obbbebbbbebboollo....', 6: 'obbebebbebebollllo.y.' },
}
// 尾巴火两帧交替：只改第 17 列以后的尾尖
const TAIL = [
  { 6: '.y..', 7: '.yfy', 8: '.ofo' },
  { 6: '....', 7: '.yy.', 8: '.fyf' },
]
const MOUTH_OPEN = { 8: '.obpbbeebbpbooooo.ofo' }

/**
 * @param {object} o
 * @param {'idle'|'typing'|'thinking'|'done'|'sleep'|'held'} o.mood
 * @param {number} o.tick - 动画帧计数
 * @param {number} o.heat - 0~1，喷火长度
 * @returns {{ x: number, y: number, c: string }[]} 像素列表（x 可为负：嘴前的火）
 */
export function dragonPixels({ mood, tick, heat }) {
  const blink = mood !== 'sleep' && mood !== 'done' && mood !== 'held' && tick % 14 === 0
  const eyes = mood === 'sleep' || blink ? EYES.shut
    : mood === 'done' || mood === 'held' ? EYES.happy
      : mood === 'typing' ? EYES.left
        : EYES.open
  const rows = BASE.slice()
  for (const patch of [eyes, mood === 'thinking' ? MOUTH_OPEN : {}]) {
    for (const [i, row] of Object.entries(patch)) rows[i] = row
  }
  if (mood !== 'sleep') {
    for (const [i, tip] of Object.entries(TAIL[tick % 2])) rows[i] = rows[i].slice(0, 17) + tip
  }
  const out = []
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (PALETTE[ch]) out.push({ x, y, c: PALETTE[ch] }) }))
  if (mood === 'thinking') out.push(...fire(tick, heat))
  return out
}

/** 朝左喷出的火：从脸颊左侧出来，三行，中间最长；长度随热度，逐帧抖动 */
function fire(tick, heat) {
  const len = 4 + Math.round(Math.max(0, Math.min(1, heat)) * 6) + (tick % 2)
  const out = []
  const line = (y, n, from) => {
    for (let i = 0; i < n; i++) {
      const x = from - i
      const c = i < 2 ? PALETTE.y : i < n - 2 ? PALETTE.l : PALETTE.f
      out.push({ x, y, c })
    }
  }
  line(8, len, 0)
  line(7, len - 2 - (tick % 2), -1)
  line(9, len - 2 + (tick % 2), 1)
  // 飞散的火星
  if (tick % 3 !== 0) out.push({ x: -len - 1, y: 6 + (tick % 3) * 2, c: PALETTE.f })
  return out
}
