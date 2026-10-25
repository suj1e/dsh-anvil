// 组件样式，挂载时注入一次，卸载时移除。
// 动画统一用「锻造」意象：炉火色渐变（琥珀 → 橙 → 玫红）。
const CSS = `
:root {
  --anv-ember-1: #fcd34d;
  --anv-ember-2: #fb923c;
  --anv-ember-3: #f472b6;
}

/* ---------- 润色按钮 ---------- */
.anv-polish {
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
.anv-polish:hover:not(:disabled) { background: rgba(251, 146, 60, .14); }
.anv-polish:active:not(:disabled) { transform: scale(.9); }
.anv-polish[data-shake] { animation: anv-shake .4s ease-in-out; }
.anv-polish:disabled { cursor: default; opacity: .35; filter: grayscale(1); }
.anv-polish svg { width: 18px; height: 18px; overflow: visible; }
.anv-icon { display: inline-flex; animation: anv-pop .4s cubic-bezier(.34, 1.56, .64, 1); }

.anv-main { transform-origin: 10px 12px; transition: transform .35s cubic-bezier(.34, 1.56, .64, 1); }
.anv-mini { transform-origin: 18.5px 4.5px; }
.anv-polish:hover:not(:disabled) .anv-main { transform: rotate(-12deg) scale(1.08); }
.anv-polish:hover:not(:disabled) .anv-mini { animation: anv-twinkle 1.1s ease-in-out infinite; }

/* 润色中：像被锤子一下下敲打 */
.anv-polish[data-state="working"] { background: rgba(251, 146, 60, .14); }
.anv-polish[data-state="working"] .anv-main { animation: anv-hammer .6s cubic-bezier(.5, 0, .3, 1) infinite; }
.anv-polish[data-state="working"] .anv-mini { animation: anv-twinkle .6s ease-in-out infinite; }
.anv-polish[data-state="working"]::after {
  content: "";
  position: absolute;
  inset: -3px;
  border-radius: 10px;
  background: conic-gradient(from 0deg, transparent, var(--anv-ember-2), var(--anv-ember-3), transparent 60%);
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 1.5px), #000 calc(100% - 1px));
  mask: radial-gradient(farthest-side, transparent calc(100% - 1.5px), #000 calc(100% - 1px));
  animation: anv-spin 1s linear infinite;
  pointer-events: none;
}

/* 完成：火星四溅 */
.anv-sparks { position: absolute; inset: 0; pointer-events: none; }
.anv-spark {
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
  animation: anv-spark .7s cubic-bezier(.2, .8, .3, 1) forwards;
}

.anv-bubble {
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
  animation: anv-rise .2s ease-out;
}
.anv-bubble[data-kind="error"] { background: rgba(185, 28, 28, .95); white-space: normal; }

/* ---------- 输入框覆盖特效 ---------- */
.anv-fx { position: fixed; z-index: 50; pointer-events: none; }
/* 润色中：炉火光在文字上循环扫过 */
.anv-forging {
  background: linear-gradient(100deg, transparent 28%, rgba(251, 146, 60, .28) 44%, rgba(244, 114, 182, .26) 56%, transparent 72%);
  background-size: 300% 100%;
  animation: anv-sweep 1.3s linear infinite;
}
/* 润色完成：一道亮光扫过新文字 */
.anv-sweep {
  background: linear-gradient(100deg, transparent 25%, rgba(252, 211, 77, .35) 42%, rgba(244, 114, 182, .3) 55%, transparent 72%);
  background-size: 300% 100%;
  animation: anv-sweep .9s cubic-bezier(.3, 0, .2, 1) forwards;
}
/* 采用预测：卡片边缘亮一下 */
.anv-flash {
  box-shadow: inset 0 0 0 1.5px rgba(251, 146, 60, .75), 0 0 28px rgba(251, 146, 60, .28);
  animation: anv-fade .6s ease-out forwards;
}

/* ---------- 预测 ---------- */
.anv-ghost {
  position: absolute;
  z-index: 1;
  overflow: hidden;
  color: inherit;
  white-space: pre-wrap;
  word-break: break-word;
  pointer-events: none;
}
.anv-ghost-text { opacity: .42; }
.anv-caret {
  display: inline-block;
  width: 2px;
  height: 1em;
  margin-left: 1px;
  vertical-align: -.12em;
  background: linear-gradient(var(--anv-ember-1), var(--anv-ember-3));
  animation: anv-blink .8s steps(1) infinite;
}
[data-anv-ghost] .anv-hide-placeholder { visibility: hidden !important; }

/* 等待预测：钢琴键琶音 */
.anv-piano { display: inline-flex; align-items: flex-end; gap: 2px; height: 1.2em; position: relative; animation: anv-rise .25s ease-out; }
.anv-key {
  position: relative;
  width: 7px;
  height: 15px;
  border-radius: 1px 1px 3px 3px;
  background: rgba(160, 160, 170, .28);
  overflow: hidden;
  animation: anv-key 1.4s ease-in-out infinite;
  animation-delay: calc(var(--i) * .12s);
}
.anv-key::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(var(--anv-ember-1), var(--anv-ember-2) 60%, var(--anv-ember-3));
  opacity: 0;
  animation: anv-key-glow 1.4s ease-in-out infinite;
  animation-delay: inherit;
}
.anv-key.anv-black { width: 5px; height: 10px; margin: 0 -1px; z-index: 1; align-self: flex-start; background: rgba(90, 90, 100, .55); }
.anv-note {
  position: absolute;
  left: calc(var(--x) * 1px);
  bottom: 100%;
  font-size: 11px;
  line-height: 1;
  color: var(--anv-ember-2);
  opacity: 0;
  animation: anv-note 2.1s ease-out infinite;
  animation-delay: var(--d);
}
.anv-piano-label { margin-left: 8px; opacity: .38; font-size: .92em; }

/* ---------- 关键帧 ---------- */
@keyframes anv-shake { 0%, 100% { transform: translateX(0); } 20%, 60% { transform: translateX(-3px); } 40%, 80% { transform: translateX(3px); } }
@keyframes anv-pop { from { transform: scale(.3) rotate(-90deg); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes anv-twinkle { 0%, 100% { transform: scale(.55); opacity: .5; } 50% { transform: scale(1.15); opacity: 1; } }
@keyframes anv-hammer {
  0% { transform: rotate(0) scale(1); }
  35% { transform: rotate(-28deg) scale(1.12); }
  55% { transform: rotate(6deg) scale(.86); }
  75%, 100% { transform: rotate(0) scale(1); }
}
@keyframes anv-spin { to { transform: rotate(360deg); } }
@keyframes anv-spark {
  0% { transform: rotate(var(--a)) translateY(0) scale(1); opacity: 1; }
  100% { transform: rotate(var(--a)) translateY(var(--r)) scale(0); opacity: 0; }
}
@keyframes anv-sweep { from { background-position: 100% 0; } to { background-position: 0 0; } }
@keyframes anv-fade { from { opacity: 1; } to { opacity: 0; } }
@keyframes anv-rise { from { transform: translateY(3px); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes anv-blink { 50% { opacity: 0; } }
@keyframes anv-key { 0%, 30%, 100% { transform: translateY(0); } 12% { transform: translateY(2px); } }
@keyframes anv-key-glow { 0%, 30%, 100% { opacity: 0; } 10% { opacity: 1; } }
@keyframes anv-note {
  0% { transform: translate(0, 4px) rotate(-10deg); opacity: 0; }
  20% { opacity: .9; }
  100% { transform: translate(6px, -14px) rotate(12deg); opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .anv-polish *, .anv-polish::after, .anv-icon, .anv-bubble, .anv-ghost *, .anv-piano, .anv-piano * {
    animation: none !important;
    transition: none !important;
  }
  .anv-sparks, .anv-note { display: none; }
}
`

// 模型与推理等级选择器。菜单挂在 body 上，主题由 data-theme 决定（见 ModelPicker 的 isDarkText）。
const MODEL_CSS = `
.anv-gauge { flex: none; overflow: visible; display: block; }
.anv-gauge-track { fill: none; stroke: rgba(140, 140, 150, .4); stroke-linecap: round; }
.anv-gauge-arc { fill: none; stroke: var(--anv-ember-2); stroke-linecap: round; transition: d .4s cubic-bezier(.34, 1.4, .64, 1); }
.anv-gauge-needle { stroke: currentColor; stroke-linecap: round; transform-origin: 17px 21px; transition: transform .45s cubic-bezier(.34, 1.4, .64, 1); }
.anv-gauge-hub { fill: currentColor; }

/* 工具栏按钮：模型名、表盘、等级在同一条中线上 */
.anv-trigger {
  display: inline-flex; align-items: center; gap: 6px;
  max-width: 260px; height: 28px; padding: 0 10px;
  border: none; border-radius: 999px;
  background: transparent; color: inherit;
  font: inherit; font-size: 13px; line-height: 1;
  cursor: pointer;
  transition: background-color .15s;
}
.anv-trigger:hover:not(:disabled), .anv-trigger.anv-open { background: rgba(251, 146, 60, .13); }
.anv-trigger:disabled { cursor: default; opacity: .5; }
.anv-trigger-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.anv-trigger-gear { color: var(--anv-ember-2); font-size: 12px; white-space: nowrap; animation: anv-gear-in .3s cubic-bezier(.34, 1.56, .64, 1); }
.anv-trigger.anv-busy .anv-gauge-needle { animation: anv-idle .8s ease-in-out infinite alternate; }

/* 菜单与子菜单 */
.anv-pop {
  position: fixed; z-index: 1000;
  padding: 6px;
  border: 0.5px solid var(--anv-border); border-radius: 14px;
  background: var(--anv-bg); color: var(--anv-text);
  font-size: 13px;
  box-shadow: 0 14px 36px rgba(0, 0, 0, .3);
  outline: none;
  animation: anv-panel-in .16s cubic-bezier(.2, .8, .3, 1);
}
.anv-pop[data-theme="dark"] {
  --anv-bg: #262629; --anv-border: rgba(255, 255, 255, .1); --anv-text: #e7e7ea; --anv-muted: #8d8d96;
  --anv-hover: rgba(255, 255, 255, .07); --anv-input: #1c1c1f; --anv-rail: #3f3f46; --anv-on: #fcd34d;
}
.anv-pop[data-theme="light"] {
  --anv-bg: #ffffff; --anv-border: rgba(0, 0, 0, .1); --anv-text: #1f1f23; --anv-muted: #74747c;
  --anv-hover: rgba(0, 0, 0, .05); --anv-input: #f4f4f5; --anv-rail: #e4e4e7; --anv-on: #d9730f;
}
.anv-menu { width: 280px; transition: left .22s cubic-bezier(.2, .8, .3, 1); }
.anv-sub { width: 270px; }
.anv-row {
  all: unset; box-sizing: border-box;
  display: flex; align-items: center; gap: 8px;
  width: 100%; min-height: 34px; padding: 6px 10px;
  border-radius: 9px;
  cursor: pointer;
}
.anv-row.anv-active { background: var(--anv-hover); }
.anv-row-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.anv-row.anv-selected .anv-row-name { color: var(--anv-on); }
.anv-row-end { display: inline-flex; align-items: center; color: var(--anv-muted); font-size: 12px; }
.anv-row-end kbd { font: inherit; font-size: 12px; color: var(--anv-muted); }
.anv-check { color: var(--anv-ember-2); font-size: 14px; }
.anv-muted { color: var(--anv-muted); }
.anv-sep { height: 0.5px; margin: 5px 8px; background: var(--anv-border); }
.anv-mp-empty { padding: 10px 12px; color: var(--anv-muted); font-size: 12px; }
.anv-pop-error { margin: 6px 4px 2px; padding: 8px 10px; border-radius: 8px; background: rgba(220, 38, 38, .14); color: #f87171; font-size: 12px; }

/* 推理等级 */
.anv-gearbox { padding: 6px 10px 4px; }
.anv-gear-head { display: flex; align-items: center; gap: 8px; height: 24px; }
.anv-gear-title { flex: 1; }
.anv-gear-none { color: var(--anv-muted); font-size: 12px; }
.anv-auto { all: unset; display: inline-flex; align-items: center; gap: 6px; color: var(--anv-muted); font-size: 12px; cursor: pointer; }
.anv-auto:disabled { cursor: default; opacity: .5; }
.anv-switch { position: relative; width: 26px; height: 15px; border-radius: 8px; background: var(--anv-rail); transition: background .2s; }
.anv-switch i { position: absolute; top: 2px; left: 2px; width: 11px; height: 11px; border-radius: 50%; background: #f4f4f5; transition: left .2s cubic-bezier(.34, 1.56, .64, 1); }
.anv-switch.anv-on { background: var(--anv-ember-2); }
.anv-switch.anv-on i { left: 13px; }
.anv-gear-ends { display: flex; justify-content: space-between; padding: 0 17px; color: var(--anv-muted); font-size: 11px; }

.anv-track-wrap { position: relative; }
.anv-track { position: relative; height: 32px; margin-top: 2px; cursor: grab; touch-action: none; }
.anv-track.anv-dragging { cursor: grabbing; }
.anv-track[aria-disabled] { cursor: default; opacity: .5; }
.anv-rail { position: absolute; left: 0; right: 0; top: 14px; height: 4px; border-radius: 2px; background: var(--anv-rail); }
.anv-rail-fill {
  position: absolute; left: 0; top: 14px; height: 4px; border-radius: 2px;
  background: linear-gradient(90deg, var(--anv-ember-1), var(--anv-ember-2));
  transition: width .35s cubic-bezier(.34, 1.56, .64, 1);
}
.anv-tick { position: absolute; top: 10px; width: 2px; height: 12px; border-radius: 1px; background: var(--anv-muted); opacity: .55; transform: translateX(-50%); transition: background .2s, opacity .2s; }
.anv-tick-on { background: var(--anv-ember-2); opacity: 1; }
.anv-knob {
  position: absolute; top: 16px;
  display: flex; align-items: center; justify-content: center;
  height: 22px; padding: 0 9px;
  border-radius: 11px;
  background: linear-gradient(135deg, var(--anv-ember-1), var(--anv-ember-2) 60%, var(--anv-ember-3));
  color: #3b1d06; font-size: 11px; font-weight: 500; line-height: 1; white-space: nowrap;
  box-shadow: 0 0 10px rgba(251, 146, 60, .45);
  transform: translate(-50%, -50%);
  transition: left .35s cubic-bezier(.34, 1.56, .64, 1);
  animation: anv-click .2s ease-out;
  pointer-events: none;
}
.anv-track.anv-dragging .anv-knob, .anv-track.anv-dragging .anv-rail-fill { transition: none; }
.anv-track-fx { position: absolute; left: -16px; top: -52px; width: calc(100% + 32px); height: 100px; pointer-events: none; }

/* 更多模型 */
.anv-search {
  display: flex; align-items: center; gap: 8px;
  height: 32px; margin: 2px 2px 6px; padding: 0 10px;
  border: 0.5px solid var(--anv-border); border-radius: 8px;
  background: var(--anv-input); color: var(--anv-muted);
}
.anv-search input { all: unset; flex: 1; min-width: 0; color: var(--anv-text); font-size: 13px; }
.anv-search input::placeholder { color: var(--anv-muted); }
.anv-more-list { max-height: 340px; overflow-y: auto; scrollbar-width: thin; }
.anv-group, .anv-group-more, .anv-group-title {
  all: unset; box-sizing: border-box;
  display: flex; align-items: center; justify-content: space-between;
  width: 100%; padding: 8px 10px 4px;
  color: var(--anv-muted); font-size: 11px;
}
.anv-group, .anv-group-more { cursor: pointer; }
.anv-group:hover, .anv-group-more:hover { color: var(--anv-text); }
.anv-group svg { transition: transform .2s; }
.anv-group-more { padding: 6px 10px 8px; }

@keyframes anv-panel-in { from { opacity: 0; transform: translateY(6px) scale(.98); } to { opacity: 1; transform: none; } }
@keyframes anv-click { 50% { transform: translate(-50%, -50%) scale(1.22); } }
@keyframes anv-gear-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
@keyframes anv-idle { from { transform: rotate(-60deg); } to { transform: rotate(60deg); } }

@media (prefers-reduced-motion: reduce) {
  .anv-pop, .anv-knob, .anv-rail-fill, .anv-gauge-needle, .anv-gauge-arc, .anv-trigger-gear, .anv-switch i { animation: none !important; transition: none !important; }
  .anv-track-fx { display: none; }
}
`

export function installStyles() {
  const style = document.createElement('style')
  style.dataset.dshAnvil = ''
  style.textContent = CSS + MODEL_CSS
  document.head.appendChild(style)
  return () => style.remove()
}
