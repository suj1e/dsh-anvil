// 组件样式，挂载时注入一次，卸载时移除。
const CSS = `
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
  opacity: 0.75;
  cursor: pointer;
  transition: opacity .15s, background-color .15s, transform .15s;
}
.psm-polish:hover:not(:disabled) { opacity: 1; background: rgba(127, 127, 127, .12); }
.psm-polish:active:not(:disabled) { transform: scale(.92); }
.psm-polish:disabled { cursor: default; opacity: .35; }
.psm-polish svg { width: 18px; height: 18px; overflow: visible; }
.psm-polish .psm-star { transform-origin: 12px 12px; transition: transform .3s; }
.psm-polish:hover:not(:disabled) .psm-star { transform: rotate(18deg) scale(1.08); }
.psm-polish .psm-twinkle { opacity: 0; transform-origin: center; }
.psm-polish:hover:not(:disabled) .psm-twinkle { animation: psm-twinkle 1.2s ease-in-out infinite; }
.psm-polish .psm-twinkle-2 { animation-delay: .4s !important; }

.psm-polish[data-state="working"] { opacity: 1; }
.psm-polish[data-state="working"] .psm-star { animation: psm-spin 1.6s cubic-bezier(.5, 0, .5, 1) infinite; }
.psm-polish[data-state="working"] .psm-twinkle { animation: psm-twinkle .9s ease-in-out infinite; }
.psm-polish[data-state="working"]::after {
  content: "";
  position: absolute;
  inset: 2px;
  border-radius: 8px;
  background: radial-gradient(circle, rgba(250, 204, 21, .35), transparent 70%);
  animation: psm-pulse 1.2s ease-in-out infinite;
  pointer-events: none;
}
.psm-polish[data-state="done"] { opacity: 1; }

.psm-bubble {
  position: absolute;
  right: 0;
  bottom: calc(100% + 8px);
  z-index: 20;
  max-width: 260px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(30, 30, 30, .92);
  color: #fff;
  font-size: 12px;
  line-height: 1.4;
  white-space: nowrap;
  pointer-events: none;
}
.psm-bubble[data-kind="error"] { background: rgba(185, 28, 28, .95); white-space: normal; }

.psm-ghost {
  position: absolute;
  z-index: 1;
  overflow: hidden;
  color: inherit;
  opacity: .42;
  white-space: pre-wrap;
  word-break: break-word;
  pointer-events: none;
}
.psm-ghost kbd {
  margin-left: 6px;
  padding: 0 5px;
  border: 1px solid currentColor;
  border-radius: 4px;
  font: inherit;
  font-size: .8em;
}
[data-psm-ghost] .psm-hide-placeholder { visibility: hidden !important; }

@keyframes psm-spin { to { transform: rotate(360deg); } }
@keyframes psm-twinkle { 0%, 100% { opacity: 0; transform: scale(.4); } 50% { opacity: 1; transform: scale(1); } }
@keyframes psm-pulse { 0%, 100% { opacity: .3; } 50% { opacity: 1; } }
`

export function installStyles() {
  const style = document.createElement('style')
  style.dataset.dshPromptsmith = ''
  style.textContent = CSS
  document.head.appendChild(style)
  return () => style.remove()
}
