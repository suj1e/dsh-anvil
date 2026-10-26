// 组件样式，挂载时注入一次，卸载时移除。
// 动画统一用「锻造」意象：炉火色渐变（琥珀 → 橙 → 玫红）。
const CSS = `
:root {
  --anv-ember-1: #fcd34d;
  --anv-ember-2: #fb923c;
  --anv-ember-3: #f472b6;
}
/* DSH 全局给元素加了 corner-shape: superellipse(1.5)，会把 50% 圆角压成圆角方块；
   插件自己的元素一律用真圆角（宿主的卡片和工作区行保留宿主风格） */
:is([class^="anv-"], [class*=" anv-"]):not(.anv-card, .anv-tabstrip),
:is([class^="anv-"], [class*=" anv-"]):not(.anv-card, .anv-tabstrip) * { corner-shape: round; }

/* ---------- 润色按钮 ---------- */
.anv-polish {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: background-color .2s, transform .15s;
}
.anv-polish:hover:not(:disabled) { background: rgba(251, 146, 60, .14); }
/* DSH 工具栏控件间固定 12px，润色按钮和右边的模型按钮是一组，往回收 6px */
.anv-polish { margin-right: -6px; }
.anv-polish:active:not(:disabled) { transform: scale(.9); }
.anv-polish[data-shake] { animation: anv-shake .4s ease-in-out; }
.anv-polish:disabled { cursor: default; opacity: .35; filter: grayscale(1); }
.anv-polish svg { width: 18px; height: 18px; overflow: visible; }
.anv-icon { display: inline-flex; animation: anv-pop .4s cubic-bezier(.34, 1.56, .64, 1); }

.anv-main { transform-origin: 10px 12px; transition: transform .35s cubic-bezier(.34, 1.56, .64, 1); }
.anv-mini { transform-origin: 18.5px 4.5px; }
.anv-polish:hover:not(:disabled) .anv-main { transform: rotate(-12deg) scale(1.08); }
.anv-polish:hover:not(:disabled) .anv-mini { animation: anv-twinkle 1.1s ease-in-out infinite; }

/* 润色中：像被锤子一下下敲打；圆形炉火光晕随锤击明暗，每锤一下向上溅火星 */
.anv-polish[data-state="working"] { background: rgba(251, 146, 60, .16); animation: anv-halo .6s cubic-bezier(.5, 0, .3, 1) infinite; }
.anv-polish[data-state="working"] .anv-main { animation: anv-hammer .6s cubic-bezier(.5, 0, .3, 1) infinite; }
.anv-polish[data-state="working"] .anv-mini { animation: anv-twinkle .6s ease-in-out infinite; }
.anv-strikes { position: absolute; inset: 0; pointer-events: none; }
.anv-strike {
  position: absolute; left: 50%; top: 40%;
  width: 3px; height: 3px; margin: -1.5px 0 0 -1.5px;
  border-radius: 50%;
  background: var(--c); box-shadow: 0 0 5px var(--c);
  opacity: 0;
  animation: anv-strike .6s cubic-bezier(.2, .8, .3, 1) infinite;
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
  overflow: visible;
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
  bottom: 60%;
  font-size: 14px;
  line-height: 1;
  color: var(--anv-ember-2);
  text-shadow: 0 0 6px rgba(251, 146, 60, .6);
  opacity: 0;
  animation: anv-note 2.1s ease-out infinite;
  animation-delay: var(--d);
}
.anv-piano-label { margin-left: 8px; opacity: .38; font-size: .92em; }

/* ---------- 输入框换皮 ---------- */
/* 新会话页上方的「工作区 / 模式」行变成垫在卡片后面的标签条 */
.anv-tabstrip {
  position: relative; z-index: 0;
  box-sizing: border-box;
  margin: 0 22px -14px !important;
  width: auto !important;
  height: auto !important;
  padding: 8px 12px 22px !important;
  border: 1px solid rgba(127, 127, 127, .14);
  border-bottom: none;
  border-radius: 16px 16px 0 0;
  background: rgba(127, 127, 127, .07);
}
.anv-card { position: relative; z-index: 1; transition: box-shadow .25s; }
.anv-card:focus-within { box-shadow: 0 0 0 1px rgba(251, 146, 60, .35), 0 8px 28px rgba(251, 146, 60, .06); }

/* ---------- 小火龙 ---------- */
.anv-pet { position: fixed; z-index: 0; pointer-events: none; }
/* 只有画出来的像素能点：整块 svg 接收点击会挡住下面的消息和按钮 */
.anv-pet-svg { display: block; overflow: visible; pointer-events: none; image-rendering: pixelated; }
.anv-pet-svg rect { pointer-events: visiblePainted; cursor: pointer; }
/* 像素风的呼吸：整体上下挪一格，不做平滑缩放 */
.anv-pet-bob { animation: anv-pet-bob 1.6s steps(1) infinite; }
.anv-pet-hop { animation: anv-pet-hop .8s steps(4) 2; }
.anv-pet-z { opacity: 0; animation: anv-pet-z 2.4s steps(6) infinite; }
.anv-pet-twinkle { animation: anv-pet-tw .5s steps(1) infinite; }
.anv-pet[data-mood="sleep"] .anv-pet-bob { animation-duration: 3.2s; }

/* ---------- 关键帧 ---------- */
@keyframes anv-pet-bob { 50% { transform: translateY(1px); } }
@keyframes anv-pet-hop { 0%, 100% { transform: translateY(0); } 25% { transform: translateY(-8px); } 50% { transform: translateY(-4px); } }
@keyframes anv-pet-z { 0% { opacity: 0; transform: translate(0, 0); } 20% { opacity: 1; } 100% { opacity: 0; transform: translate(-4px, -6px); } }
@keyframes anv-pet-tw { 50% { opacity: 0; } }
@keyframes anv-shake { 0%, 100% { transform: translateX(0); } 20%, 60% { transform: translateX(-3px); } 40%, 80% { transform: translateX(3px); } }
@keyframes anv-pop { from { transform: scale(.3) rotate(-90deg); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes anv-twinkle { 0%, 100% { transform: scale(.55); opacity: .5; } 50% { transform: scale(1.15); opacity: 1; } }
@keyframes anv-hammer {
  0% { transform: rotate(0) scale(1); }
  35% { transform: rotate(-28deg) scale(1.12); }
  55% { transform: rotate(6deg) scale(.86); }
  75%, 100% { transform: rotate(0) scale(1); }
}
@keyframes anv-halo {
  0%, 100% { box-shadow: 0 0 0 0 rgba(251, 146, 60, 0), 0 0 6px 1px rgba(251, 146, 60, .25); }
  50% { box-shadow: 0 0 0 3px rgba(251, 146, 60, .18), 0 0 16px 4px rgba(251, 146, 60, .45); }
}
@keyframes anv-strike {
  0%, 45% { transform: rotate(var(--a)) translateY(0); opacity: 0; }
  55% { opacity: 1; }
  100% { transform: rotate(var(--a)) translateY(var(--r)); opacity: 0; }
}
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
  0% { transform: translate(0, 6px) rotate(-12deg) scale(.7); opacity: 0; }
  15% { opacity: 1; transform: translate(1px, 0) rotate(-6deg) scale(1); }
  70% { opacity: 1; }
  100% { transform: translate(8px, -22px) rotate(14deg) scale(1); opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .anv-polish, .anv-polish *, .anv-icon, .anv-bubble, .anv-ghost *, .anv-piano, .anv-piano * {
    animation: none !important;
    transition: none !important;
  }
  .anv-sparks, .anv-strikes, .anv-note { display: none; }
  .anv-pet * { animation: none !important; }
}
`

// 模型与推理等级选择器。菜单挂在 body 上，主题由 data-theme 决定（见 ModelPicker 的 isDarkText）。
const MODEL_CSS = `
/* 工具栏按钮：模型名 + 等级标签（随热度变色），在同一条中线上 */
.anv-trigger {
  display: inline-flex; align-items: center; gap: 6px;
  max-width: 260px; height: 28px; padding: 0 8px;
  border: none; border-radius: 999px;
  background: transparent; color: inherit;
  font: inherit; font-size: 13px; line-height: 1;
  cursor: pointer;
  transition: background-color .15s;
}
.anv-trigger:hover:not(:disabled), .anv-trigger.anv-open { background: rgba(251, 146, 60, .13); }
.anv-trigger:disabled { cursor: default; opacity: .5; }
.anv-trigger-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.anv-trigger-gear { padding: 3px 7px; border-radius: 6px; background: rgba(140, 140, 150, .16); color: var(--anv-muted, #8d8d96); font-size: 12px; line-height: 1.2; white-space: nowrap; transition: color .3s, background-color .3s; animation: anv-gear-in .3s cubic-bezier(.34, 1.56, .64, 1); }
.anv-trigger.anv-busy .anv-trigger-gear { animation: anv-idle .6s ease-in-out infinite alternate; }

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
  --anv-hover: rgba(255, 255, 255, .07); --anv-input: #1c1c1f; --anv-rail: #3f3f46; --anv-on: #fcd34d; --anv-pill: #18181b;
}
.anv-pop[data-theme="light"] {
  --anv-bg: #ffffff; --anv-border: rgba(0, 0, 0, .1); --anv-text: #1f1f23; --anv-muted: #74747c;
  --anv-hover: rgba(0, 0, 0, .05); --anv-input: #f4f4f5; --anv-rail: #e4e4e7; --anv-on: #d9730f; --anv-pill: #f1f1f3;
}
.anv-menu { width: 320px; }
.anv-menu.anv-placed { transition: left .22s cubic-bezier(.2, .8, .3, 1); }
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

/* 推理等级：大字等级名 + 熔炉滑块 */
.anv-gearbox { padding: 10px 10px 6px; }
.anv-gear-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
.anv-gear-titles { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.anv-gear-level { font-size: 22px; font-weight: 500; line-height: 1; color: var(--anv-muted); transition: color .3s; animation: anv-gear-in .3s cubic-bezier(.34, 1.56, .64, 1); }
.anv-gear-sub { color: var(--anv-muted); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.anv-auto { all: unset; display: inline-flex; align-items: center; gap: 6px; padding-bottom: 2px; color: var(--anv-muted); font-size: 12px; cursor: pointer; }
.anv-auto:disabled { cursor: default; opacity: .5; }
.anv-switch { position: relative; width: 28px; height: 16px; border-radius: 8px; background: var(--anv-rail); transition: background .2s; }
.anv-switch i { position: absolute; top: 2px; left: 2px; width: 12px; height: 12px; border-radius: 50%; background: #f4f4f5; transition: left .2s cubic-bezier(.34, 1.56, .64, 1); }
.anv-switch.anv-on { background: #d97706; }
.anv-switch.anv-on i { left: 14px; }

.anv-furnace { position: relative; }
.anv-pill {
  position: relative; height: 28px;
  border-radius: 14px;
  background: var(--anv-pill);
  box-shadow: inset 0 0 0 1px var(--anv-border);
  overflow: hidden;
  cursor: grab; touch-action: none;
}
.anv-pill.anv-dragging { cursor: grabbing; }
.anv-pill[aria-disabled] { cursor: default; opacity: .5; }
.anv-molten {
  position: absolute; left: 0; top: 0; bottom: 0;
  border-radius: 14px;
  background: linear-gradient(90deg, #78350f, #b45309 40%, #f59e0b 80%, #fbbf24);
  transition: width .35s cubic-bezier(.34, 1.56, .64, 1);
  animation: anv-molten-flick .35s ease-in-out infinite alternate;
}
.anv-molten-hot { background: linear-gradient(90deg, #92400e, #d97706 35%, #f97316 70%, #f472b6); }
.anv-molten-fx { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.anv-thumb {
  /* top / width / height 由 FurnaceSlider 按 PILL、GAP 算出 */
  position: absolute;
  border-radius: 50%;
  background: #fafafa;
  transition: left .35s cubic-bezier(.34, 1.56, .64, 1), box-shadow .3s, opacity .2s;
  pointer-events: none;
}
.anv-pill.anv-dragging .anv-molten, .anv-pill.anv-dragging .anv-thumb { transition: none; }
.anv-pill.anv-dragging .anv-thumb { transform: scale(1.08); }
.anv-furnace-fx { position: absolute; left: -24px; top: -56px; width: calc(100% + 48px); height: 120px; pointer-events: none; }
.anv-furnace-ticks { display: flex; justify-content: space-between; padding: 8px 6px 0; }
.anv-ftick { all: unset; min-width: 12px; text-align: center; color: var(--anv-muted); font-size: 12px; cursor: pointer; transition: color .2s; }
.anv-ftick:hover { color: var(--anv-text); }
.anv-ftick.anv-on { color: var(--anv-on); }

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
@keyframes anv-molten-flick { from { filter: brightness(.9); } to { filter: brightness(1.15); } }
@keyframes anv-gear-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
@keyframes anv-idle { from { opacity: .55; } to { opacity: 1; } }

@media (prefers-reduced-motion: reduce) {
  .anv-pop, .anv-molten, .anv-thumb, .anv-gear-level, .anv-trigger-gear, .anv-switch i { animation: none !important; transition: none !important; }
  .anv-furnace-fx, .anv-molten-fx { display: none; }
}
`

export function installStyles() {
  const style = document.createElement('style')
  style.dataset.dshAnvil = ''
  style.textContent = CSS + MODEL_CSS
  document.head.appendChild(style)
  return () => style.remove()
}
