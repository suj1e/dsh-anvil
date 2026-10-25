// 组件样式，挂载时注入一次，卸载时移除。
// 动画统一用「锻造」意象：炉火色渐变（琥珀 → 橙 → 玫红）。
const CSS = `
:root {
  --psm-ember-1: #fcd34d;
  --psm-ember-2: #fb923c;
  --psm-ember-3: #f472b6;
}

/* ---------- 润色按钮 ---------- */
.psm-polish {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: background-color .2s, transform .15s;
}
.psm-polish:hover:not(:disabled) { background: rgba(251, 146, 60, .14); }
.psm-polish:active:not(:disabled) { transform: scale(.9); }
.psm-polish[data-shake] { animation: psm-shake .4s ease-in-out; }
.psm-polish:disabled { cursor: default; opacity: .35; filter: grayscale(1); }
.psm-polish svg { width: 18px; height: 18px; overflow: visible; }
.psm-icon { display: inline-flex; animation: psm-pop .4s cubic-bezier(.34, 1.56, .64, 1); }

.psm-main { transform-origin: 10px 12px; transition: transform .35s cubic-bezier(.34, 1.56, .64, 1); }
.psm-mini { transform-origin: 18.5px 4.5px; }
.psm-polish:hover:not(:disabled) .psm-main { transform: rotate(-12deg) scale(1.08); }
.psm-polish:hover:not(:disabled) .psm-mini { animation: psm-twinkle 1.1s ease-in-out infinite; }

/* 润色中：像被锤子一下下敲打 */
.psm-polish[data-state="working"] { background: rgba(251, 146, 60, .14); }
.psm-polish[data-state="working"] .psm-main { animation: psm-hammer .6s cubic-bezier(.5, 0, .3, 1) infinite; }
.psm-polish[data-state="working"] .psm-mini { animation: psm-twinkle .6s ease-in-out infinite; }
.psm-polish[data-state="working"]::after {
  content: "";
  position: absolute;
  inset: -3px;
  border-radius: 10px;
  background: conic-gradient(from 0deg, transparent, var(--psm-ember-2), var(--psm-ember-3), transparent 60%);
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 1.5px), #000 calc(100% - 1px));
  mask: radial-gradient(farthest-side, transparent calc(100% - 1.5px), #000 calc(100% - 1px));
  animation: psm-spin 1s linear infinite;
  pointer-events: none;
}

/* 完成：火星四溅 */
.psm-sparks { position: absolute; inset: 0; pointer-events: none; }
.psm-spark {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 4px;
  height: 4px;
  margin: -2px 0 0 -2px;
  border-radius: 50%;
  background: var(--c);
  box-shadow: 0 0 6px var(--c);
  transform: rotate(var(--a)) translateY(0) scale(1);
  animation: psm-spark .7s cubic-bezier(.2, .8, .3, 1) forwards;
}

.psm-bubble {
  position: absolute;
  right: 0;
  bottom: calc(100% + 8px);
  z-index: 20;
  max-width: 260px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(30, 30, 30, .94);
  color: #fff;
  font-size: 12px;
  line-height: 1.4;
  white-space: nowrap;
  pointer-events: none;
  animation: psm-rise .2s ease-out;
}
.psm-bubble[data-kind="error"] { background: rgba(185, 28, 28, .95); white-space: normal; }

/* ---------- 输入框覆盖特效 ---------- */
.psm-fx { position: fixed; z-index: 50; pointer-events: none; }
/* 润色中：炉火光在文字上循环扫过 */
.psm-forging {
  background: linear-gradient(100deg, transparent 28%, rgba(251, 146, 60, .28) 44%, rgba(244, 114, 182, .26) 56%, transparent 72%);
  background-size: 300% 100%;
  animation: psm-sweep 1.3s linear infinite;
}
/* 润色完成：一道亮光扫过新文字 */
.psm-sweep {
  background: linear-gradient(100deg, transparent 25%, rgba(252, 211, 77, .35) 42%, rgba(244, 114, 182, .3) 55%, transparent 72%);
  background-size: 300% 100%;
  animation: psm-sweep .9s cubic-bezier(.3, 0, .2, 1) forwards;
}
/* 采用预测：卡片边缘亮一下 */
.psm-flash {
  box-shadow: inset 0 0 0 1.5px rgba(251, 146, 60, .75), 0 0 28px rgba(251, 146, 60, .28);
  animation: psm-fade .6s ease-out forwards;
}

/* ---------- 预测 ---------- */
.psm-ghost {
  position: absolute;
  z-index: 1;
  overflow: hidden;
  color: inherit;
  white-space: pre-wrap;
  word-break: break-word;
  pointer-events: none;
}
.psm-ghost-text { opacity: .42; }
.psm-caret {
  display: inline-block;
  width: 2px;
  height: 1em;
  margin-left: 1px;
  vertical-align: -.12em;
  background: linear-gradient(var(--psm-ember-1), var(--psm-ember-3));
  animation: psm-blink .8s steps(1) infinite;
}
[data-psm-ghost] .psm-hide-placeholder { visibility: hidden !important; }

/* 等待预测：钢琴键琶音 */
.psm-piano { display: inline-flex; align-items: flex-end; gap: 2px; height: 1.2em; position: relative; animation: psm-rise .25s ease-out; }
.psm-key {
  position: relative;
  width: 7px;
  height: 15px;
  border-radius: 1px 1px 3px 3px;
  background: rgba(160, 160, 170, .28);
  overflow: hidden;
  animation: psm-key 1.4s ease-in-out infinite;
  animation-delay: calc(var(--i) * .12s);
}
.psm-key::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(var(--psm-ember-1), var(--psm-ember-2) 60%, var(--psm-ember-3));
  opacity: 0;
  animation: psm-key-glow 1.4s ease-in-out infinite;
  animation-delay: inherit;
}
.psm-key.psm-black { width: 5px; height: 10px; margin: 0 -1px; z-index: 1; align-self: flex-start; background: rgba(90, 90, 100, .55); }
.psm-note {
  position: absolute;
  left: calc(var(--x) * 1px);
  bottom: 100%;
  font-size: 11px;
  line-height: 1;
  color: var(--psm-ember-2);
  opacity: 0;
  animation: psm-note 2.1s ease-out infinite;
  animation-delay: var(--d);
}
.psm-piano-label { margin-left: 8px; opacity: .38; font-size: .92em; }

/* ---------- 关键帧 ---------- */
@keyframes psm-shake { 0%, 100% { transform: translateX(0); } 20%, 60% { transform: translateX(-3px); } 40%, 80% { transform: translateX(3px); } }
@keyframes psm-pop { from { transform: scale(.3) rotate(-90deg); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes psm-twinkle { 0%, 100% { transform: scale(.55); opacity: .5; } 50% { transform: scale(1.15); opacity: 1; } }
@keyframes psm-hammer {
  0% { transform: rotate(0) scale(1); }
  35% { transform: rotate(-28deg) scale(1.12); }
  55% { transform: rotate(6deg) scale(.86); }
  75%, 100% { transform: rotate(0) scale(1); }
}
@keyframes psm-spin { to { transform: rotate(360deg); } }
@keyframes psm-spark {
  0% { transform: rotate(var(--a)) translateY(0) scale(1); opacity: 1; }
  100% { transform: rotate(var(--a)) translateY(var(--r)) scale(0); opacity: 0; }
}
@keyframes psm-sweep { from { background-position: 100% 0; } to { background-position: 0 0; } }
@keyframes psm-fade { from { opacity: 1; } to { opacity: 0; } }
@keyframes psm-rise { from { transform: translateY(3px); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes psm-blink { 50% { opacity: 0; } }
@keyframes psm-key { 0%, 30%, 100% { transform: translateY(0); } 12% { transform: translateY(2px); } }
@keyframes psm-key-glow { 0%, 30%, 100% { opacity: 0; } 10% { opacity: 1; } }
@keyframes psm-note {
  0% { transform: translate(0, 4px) rotate(-10deg); opacity: 0; }
  20% { opacity: .9; }
  100% { transform: translate(6px, -14px) rotate(12deg); opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .psm-polish *, .psm-polish::after, .psm-icon, .psm-bubble, .psm-ghost *, .psm-piano, .psm-piano * {
    animation: none !important;
    transition: none !important;
  }
  .psm-sparks, .psm-note { display: none; }
}
`

export function installStyles() {
  const style = document.createElement('style')
  style.dataset.dshPromptsmith = ''
  style.textContent = CSS
  document.head.appendChild(style)
  return () => style.remove()
}
