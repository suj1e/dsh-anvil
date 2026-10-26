// 输入框工具栏的模型与推理等级选择器（替换 DSH 自带的模型位），交互参照 Claude 的模型菜单：
// 一个按钮「模型名 + 等级文字标签（随热度变色）」，滚轮直接换挡；点开是一个短菜单：
//   最近用的 4 个模型（数字键 1–4 直选）→「更多模型 ›」（点击才在右侧展开搜索与完整列表）→ 推理等级熔炉滑块（自动开关）。
//   选完模型菜单不关，可以接着调推理等级。
import { Fragment, h, React, ReactDOM } from './react.js'
import { FurnaceSlider, heatColor } from './FurnaceSlider.jsx'
import { heatStore } from './shared.js'

const RECENT_KEY = 'dsh-anvil:recent-models'
const QUICK_MAX = 4
const GROUP_PREVIEW = 8 // 子菜单里分组展开时先列出的模型数
const WHEEL_COMMIT_MS = 350
const GAP = 6

const sameModel = (a, b) => Boolean(a && b) && a.provider === b.provider && a.model === b.model

function readRecent() {
  try {
    const value = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    return Array.isArray(value) ? value.filter(v => typeof v?.provider === 'string' && typeof v?.model === 'string') : []
  } catch { return [] }
}

function writeRecent(list) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)) } catch { /* 隐私模式等：不记最近使用 */ }
}

/** 模型的挡位（不含「自动」）：reasoning.efforts 原样排列 */
export function gearsOf(model) {
  return (model?.reasoning?.efforts ?? []).map(effort => ({ key: effort.id, effort: effort.id, label: effort.name }))
}

/** 触发按钮文字是浅色 → 深色主题。菜单挂在 body 上，读不到输入框所在主题，只能这样推断 */
function isDarkText(el) {
  if (!el) return true
  const m = getComputedStyle(el).color.match(/\d+(\.\d+)?/g)
  if (!m) return true
  const [r, g, b] = m.map(Number)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 140
}

function matches(name, query) {
  if (query === '') return true
  const text = name.toLowerCase()
  let at = 0
  for (const ch of query.toLowerCase()) {
    at = text.indexOf(ch, at)
    if (at < 0) return false
    at++
  }
  return true
}

/** 跟随锚点重新定位：滚动、缩放、自身尺寸变化时调用 place */
function useFollow(active, place, observe) {
  React.useLayoutEffect(() => {
    if (!active) return undefined
    place()
    const observer = new ResizeObserver(place)
    for (const ref of observe) if (ref.current) observer.observe(ref.current)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [active])
}

export function ModelPicker({ locked, available, directory, load, select }) {
  const state = React.useSyncExternalStore(directory.subscribe, directory.getSnapshot)
  const [open, setOpen] = React.useState(false)
  const [moreOpen, setMoreOpen] = React.useState(false)
  const [highlight, setHighlight] = React.useState(-1) // 主菜单行：0..quick-1 为模型，quick 为「更多模型」
  const [recent, setRecent] = React.useState(readRecent)
  const [optimistic, setOptimistic] = React.useState(null) // 换挡后、服务端确认前显示的 { model, effort }
  const [preview, setPreview] = React.useState(null) // 拖动中的表盘读数 0~1
  const [error, setError] = React.useState(null)
  const [dark, setDark] = React.useState(true)
  const [menuPos, setMenuPos] = React.useState(null)
  const [subPos, setSubPos] = React.useState(null)
  const trigger = React.useRef(null)
  const menu = React.useRef(null)
  const moreRow = React.useRef(null)
  const sub = React.useRef(null)
  const wheelTimer = React.useRef(0)
  const [menuShift, setMenuShift] = React.useState(0) // 子菜单右侧放不下时，主菜单向左让出的距离
  // 菜单首次定位前先放在屏外量尺寸；定好位之后才给水平移动加过渡，否则首次出现会从左边「飞」进来
  const [menuPlaced, setMenuPlaced] = React.useState(false)

  const groups = state.groups
  const current = state.current
  const currentGroup = groups.find(g => g.id === current?.provider)
  const currentModel = currentGroup?.models.find(m => m.id === current?.model)
  const gears = gearsOf(currentModel)
  const effort = optimistic !== null && optimistic.model === current?.model ? optimistic.effort : current?.reasoningEffort
  const auto = effort === undefined
  const index = auto ? -1 : Math.max(0, gears.findIndex(g => g.effort === effort))
  const fraction = preview ?? (auto ? 0 : gears.length <= 1 ? 1 : index / (gears.length - 1))

  // 主菜单顶部的常用模型：最近使用优先，不足时用当前模型和它同组的模型补齐
  const lookup = (ref) => {
    const group = groups.find(g => g.id === ref.provider)
    const model = group?.models.find(m => m.id === ref.model)
    return group && model ? { group, model } : null
  }
  const quick = []
  const pushQuick = (entry) => {
    if (entry && quick.length < QUICK_MAX && !quick.some(q => q.group.id === entry.group.id && q.model.id === entry.model.id)) quick.push(entry)
  }
  recent.forEach(r => pushQuick(lookup(r)))
  if (current) pushQuick(lookup(current))
  for (const model of currentGroup?.models ?? []) pushQuick({ group: currentGroup, model })
  for (const group of groups) for (const model of group.models) pushQuick({ group, model })
  const moreIndex = quick.length

  // 卸载时丢掉还没提交的滚轮换挡
  React.useEffect(() => () => clearTimeout(wheelTimer.current), [])

  React.useEffect(() => { heatStore.set(auto || gears.length === 0 ? 0.35 : fraction) }, [fraction, auto, gears.length])

  React.useEffect(() => {
    if (optimistic !== null && current?.model === optimistic.model && current?.reasoningEffort === optimistic.effort) setOptimistic(null)
  }, [current, optimistic])

  React.useEffect(() => {
    if (!open) { setMoreOpen(false); setMenuShift(0); setMenuPlaced(false); return }
    load()
    setError(null)
    setHighlight(-1)
    setDark(isDarkText(trigger.current))
    requestAnimationFrame(() => menu.current?.focus())
  }, [open])

  // 点菜单、子菜单、按钮以外的地方关闭
  React.useEffect(() => {
    if (!open) return undefined
    const onDown = (event) => {
      if ([trigger, menu, sub].some(ref => ref.current?.contains(event.target))) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onDown, true)
    return () => document.removeEventListener('pointerdown', onDown, true)
  }, [open])

  // 主菜单：按钮上方、右对齐（子菜单打开且右侧空间不够时整体左移 menuShift）
  const baseMenuLeft = () => {
    const rect = trigger.current?.getBoundingClientRect()
    const el = menu.current
    if (!rect || !el) return null
    const margin = 12
    return Math.min(Math.max(rect.right - el.offsetWidth, margin), window.innerWidth - el.offsetWidth - margin)
  }
  const placeMenu = () => {
    const rect = trigger.current?.getBoundingClientRect()
    const el = menu.current
    const left = baseMenuLeft()
    if (!rect || !el || left === null) return
    setMenuPos({ left: Math.max(12, left - menuShiftRef.current), top: Math.max(12, rect.top - 8 - el.offsetHeight) })
    requestAnimationFrame(() => setMenuPlaced(true))
  }
  const menuShiftRef = React.useRef(0)
  menuShiftRef.current = menuShift
  useFollow(open, placeMenu, [menu])
  React.useLayoutEffect(() => { if (open) placeMenu() }, [menuShift])

  // 子菜单：始终在主菜单右侧，底边对齐「更多模型」行；右边放不下就让主菜单左移
  useFollow(moreOpen, () => {
    const el = sub.current
    const row = moreRow.current?.getBoundingClientRect()
    const left = baseMenuLeft()
    if (!el || !row || left === null) return
    const margin = 12
    const width = menu.current.offsetWidth
    const need = left + width + GAP + el.offsetWidth + margin - window.innerWidth
    const shift = Math.max(0, Math.min(need, left - margin))
    if (shift !== menuShiftRef.current) setMenuShift(shift)
    const top = Math.min(Math.max(margin, row.bottom + 6 - el.offsetHeight), window.innerHeight - el.offsetHeight - margin)
    setSubPos({ left: left - shift + width + GAP, top })
  }, [sub, menu])

  if (!available) return null

  const fail = (result) => {
    if (result === undefined || result.ok) return
    setOptimistic(null)
    setError(result.error?.code === 'session/writer-held' ? '这个会话正在别处使用，暂时不能切换' : (result.error?.message ?? '切换失败'))
  }

  /** 提交推理等级；effortId 为 undefined 表示「自动」 */
  const commitEffort = async (effortId) => {
    if (!current || !currentModel) return
    setError(null)
    setOptimistic({ model: current.model, effort: effortId })
    fail(await select({ provider: current.provider, model: current.model, ...effortId === undefined ? {} : { reasoningEffort: effortId } }))
  }

  const shift = (delta) => {
    if (locked || gears.length === 0 || current === null) return
    const base = auto ? (delta > 0 ? -1 : gears.length) : index
    const target = Math.max(0, Math.min(gears.length - 1, base + delta))
    if (target === index && !auto) return
    setOptimistic({ model: current.model, effort: gears[target].effort })
    clearTimeout(wheelTimer.current)
    wheelTimer.current = setTimeout(() => commitEffort(gears[target].effort), WHEEL_COMMIT_MS)
  }

  const onWheel = (event) => {
    if (gears.length === 0) return
    event.preventDefault()
    shift(event.deltaY < 0 ? 1 : -1)
  }

  const pickModel = async (group, model) => {
    setError(null)
    const list = [{ provider: group.id, model: model.id }, ...recent.filter(r => !sameModel(r, { provider: group.id, model: model.id }))].slice(0, QUICK_MAX)
    setRecent(list)
    writeRecent(list)
    // 新模型也有当前这一挡就沿用；否则交给它的默认等级（不传 effort）
    const keep = gearsOf(model).find(g => g.effort === effort)
    // 菜单保持打开，选完模型可以接着调推理等级；从子菜单选的则收起子菜单回到主菜单
    setMoreOpen(false)
    setMenuShift(0)
    requestAnimationFrame(() => menu.current?.focus())
    fail(await select({ provider: group.id, model: model.id, ...keep ? { reasoningEffort: keep.effort } : {} }))
  }

  const closeMore = () => { setMoreOpen(false); setMenuShift(0) }

  const openMore = (focus) => {
    setMoreOpen(true)
    setHighlight(moreIndex)
    if (focus) requestAnimationFrame(() => sub.current?.querySelector('input')?.focus())
  }

  const onMenuKeyDown = (event) => {
    if (event.target.tagName === 'INPUT') return
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false); trigger.current?.focus(); return }
    if (/^[1-9]$/.test(event.key)) {
      const entry = quick[Number(event.key) - 1]
      if (entry) { event.preventDefault(); pickModel(entry.group, entry.model) }
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const count = moreIndex + 1
      setHighlight(h => ((h < 0 ? (event.key === 'ArrowDown' ? -1 : 0) : h) + (event.key === 'ArrowDown' ? 1 : -1) + count) % count)
      return
    }
    if (event.key === 'ArrowRight' && highlight === moreIndex) { event.preventDefault(); openMore(true); return }
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); shift(event.key === 'ArrowRight' ? 1 : -1); return }
    if (event.key === 'Enter') {
      event.preventDefault()
      if (highlight === moreIndex) openMore(true)
      else if (quick[highlight]) pickModel(quick[highlight].group, quick[highlight].model)
    }
  }

  const gearLabel = currentModel === undefined
    ? (state.retainedEffort ?? '')
    : gears.length === 0 ? '' : auto ? '自动' : gears[index]?.label ?? ''
  const modelLabel = currentModel?.name ?? (current === null ? '请选择模型' : current.model)
  const shortModel = modelLabel.split(' · ')[0]
  const previewIndex = preview === null || gears.length === 0 ? null : Math.round(preview * (gears.length - 1))
  const levelName = gears.length === 0 ? '不可调' : previewIndex !== null ? gears[previewIndex].label : auto ? '自动' : gears[index]?.label ?? ''
  const theme = dark ? 'dark' : 'light'
  const shownError = error ?? (state.status === 'error' ? state.error : null)

  const menuBody = (
    <div
      ref={menu}
      className={menuPlaced ? 'anv-pop anv-menu anv-placed' : 'anv-pop anv-menu'}
      data-theme={theme}
      role="menu"
      aria-label="模型与推理等级"
      tabIndex={-1}
      style={menuPos ? { left: menuPos.left, top: menuPos.top } : { left: -9999, top: 0, visibility: 'hidden' }}
      onKeyDown={onMenuKeyDown}
    >
      {quick.length === 0 ? (
        <div className="anv-mp-empty">{state.status === 'loading' ? '加载模型中…' : '暂无可用模型'}</div>
      ) : quick.map((entry, i) => {
        const selected = sameModel(current, { provider: entry.group.id, model: entry.model.id })
        const pending = sameModel(state.pending, { provider: entry.group.id, model: entry.model.id })
        return (
          <button
            key={`${entry.group.id}/${entry.model.id}`}
            type="button"
            role="menuitemradio"
            aria-checked={selected}
            className={`anv-row${i === highlight ? ' anv-active' : ''}${selected ? ' anv-selected' : ''}`}
            title={`${entry.model.name} · ${entry.group.name}`}
            onMouseEnter={() => setHighlight(i)}
            onClick={() => pickModel(entry.group, entry.model)}
          >
            <span className="anv-row-name">{entry.model.name}</span>
            <span className="anv-row-end">{pending ? '…' : selected ? <span className="anv-check">✓</span> : <kbd>{i + 1}</kbd>}</span>
          </button>
        )
      })}

      <button
        ref={moreRow}
        type="button"
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={moreOpen}
        className={`anv-row${highlight === moreIndex || moreOpen ? ' anv-active' : ''}`}
        onMouseEnter={() => setHighlight(moreIndex)}
        onClick={() => (moreOpen ? closeMore() : openMore(true))}
      >
        <span className="anv-row-name">更多模型</span>
        <span className="anv-row-end anv-muted">{groups.reduce((n, g) => n + g.models.length, 0) || ''}</span>
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" className="anv-muted">
          <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      <div className="anv-sep" />

      <div className="anv-gearbox" onWheel={onWheel}>
        <div className="anv-gear-head">
          <div className="anv-gear-titles">
            <span className="anv-gear-level" key={levelName} style={{ color: auto || gears.length === 0 ? undefined : heatColor(fraction) }}>{levelName}</span>
            <span className="anv-gear-sub">推理等级 · {shortModel}</span>
          </div>
          {gears.length > 0 ? (
            <button
              type="button"
              className="anv-auto"
              role="switch"
              aria-checked={auto}
              disabled={locked}
              title="自动：交给模型决定推理强度"
              onClick={() => commitEffort(auto ? (currentModel?.reasoning?.defaultEffort ?? gears[Math.min(1, gears.length - 1)].effort) : undefined)}
            >
              <span className={auto ? 'anv-switch anv-on' : 'anv-switch'}><i /></span>
              <span>自动</span>
            </button>
          ) : null}
        </div>
        {gears.length > 0 ? (
          <FurnaceSlider
            gears={gears}
            index={Math.max(0, index)}
            auto={auto}
            disabled={locked}
            onCommit={i => commitEffort(gears[i].effort)}
            onPreview={setPreview}
          />
        ) : null}
      </div>

      {shownError ? <div className="anv-pop-error">{shownError}</div> : null}
    </div>
  )

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={`anv-trigger${open ? ' anv-open' : ''}${state.pending ? ' anv-busy' : ''}`}
        disabled={locked}
        aria-haspopup="menu"
        aria-expanded={open}
        title={gears.length > 0 ? '选择模型；滚轮切换推理等级' : '选择模型'}
        onClick={() => setOpen(o => !o)}
        onWheel={onWheel}
      >
        <span className="anv-trigger-name">{modelLabel}</span>
        {gearLabel ? (
          <span
            className="anv-trigger-gear"
            key={gearLabel}
            style={auto || gears.length === 0 ? undefined : { color: heatColor(fraction), background: `${heatColor(fraction)}24` }}
          >
            {gearLabel}
          </span>
        ) : null}
      </button>
      {open ? ReactDOM.createPortal(menuBody, document.body) : null}
      {open && moreOpen ? ReactDOM.createPortal(
        <div
          ref={sub}
          className="anv-pop anv-sub"
          data-theme={theme}
          style={subPos ? { left: subPos.left, top: subPos.top } : { left: -9999, top: 0, visibility: 'hidden' }}
        >
          <MoreModels
            state={state}
            current={current}
            onPick={pickModel}
            onBack={() => { setMoreOpen(false); setMenuShift(0); menu.current?.focus() }}
            onClose={() => { setOpen(false); trigger.current?.focus() }}
          />
        </div>,
        document.body,
      ) : null}
    </>
  )
}

function MoreModels({ state, current, onPick, onBack, onClose }) {
  const groups = state.groups
  const [query, setQuery] = React.useState('')
  const [highlight, setHighlight] = React.useState(0)
  const [expanded, setExpanded] = React.useState(() => (current?.provider ? { [current.provider]: 'preview' } : {}))

  const q = query.trim()
  const rows = []
  for (const group of groups) {
    if (q === '') {
      const mode = expanded[group.id]
      rows.push({ kind: 'group', group, open: Boolean(mode) })
      if (!mode) continue
      let shown = group.models
      if (mode === 'preview' && group.models.length > GROUP_PREVIEW) {
        shown = group.models.slice(0, GROUP_PREVIEW)
        const selected = group.models.find(m => sameModel(current, { provider: group.id, model: m.id }))
        if (selected && !shown.includes(selected)) shown = [...shown.slice(0, GROUP_PREVIEW - 1), selected]
      }
      shown.forEach(model => rows.push({ kind: 'model', group, model }))
      if (shown.length < group.models.length) rows.push({ kind: 'more', group, rest: group.models.length - shown.length })
    } else {
      const hits = group.models.filter(m => matches(m.name, q) || matches(group.name, q))
      if (hits.length === 0) continue
      rows.push({ kind: 'section', group })
      hits.forEach(model => rows.push({ kind: 'model', group, model }))
    }
  }
  const modelRows = rows.filter(r => r.kind === 'model')
  const active = Math.min(highlight, Math.max(0, modelRows.length - 1))

  const onKeyDown = (event) => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); return }
    if (event.key === 'ArrowLeft' && query === '') { event.preventDefault(); onBack(); return }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (modelRows.length > 0) setHighlight((active + (event.key === 'ArrowDown' ? 1 : -1) + modelRows.length) % modelRows.length)
    } else if (event.key === 'Enter') {
      const row = modelRows[active]
      if (row) { event.preventDefault(); onPick(row.group, row.model) }
    }
  }

  let ordinal = -1
  return (
    <div className="anv-more" onKeyDown={onKeyDown}>
      <div className="anv-search">
        <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
          <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          value={query}
          placeholder={`搜索 ${groups.reduce((n, g) => n + g.models.length, 0)} 个模型`}
          aria-label="搜索模型"
          onChange={(event) => { setQuery(event.target.value); setHighlight(0) }}
        />
      </div>
      <div className="anv-more-list" role="listbox">
        {q !== '' && modelRows.length === 0 ? <div className="anv-mp-empty">没有匹配的模型</div> : null}
        {rows.map((row, i) => {
          if (row.kind === 'section') return <div key={`s${i}`} className="anv-group-title">{row.group.name}</div>
          if (row.kind === 'group') {
            return (
              <button
                key={`g${row.group.id}`}
                type="button"
                className="anv-group"
                aria-expanded={row.open}
                onClick={() => setExpanded(e => ({ ...e, [row.group.id]: row.open ? undefined : 'preview' }))}
              >
                <span>{row.group.name} · {row.group.models.length}</span>
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" style={{ transform: row.open ? 'rotate(180deg)' : 'none' }}>
                  <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            )
          }
          if (row.kind === 'more') {
            return (
              <button key={`more${row.group.id}`} type="button" className="anv-group-more" onClick={() => setExpanded(e => ({ ...e, [row.group.id]: 'all' }))}>
                还有 {row.rest} 个，显示全部
              </button>
            )
          }
          ordinal++
          const mine = ordinal
          const selected = sameModel(current, { provider: row.group.id, model: row.model.id })
          const levels = gearsOf(row.model).map(g => g.label)
          return (
            <button
              key={`${row.group.id}/${row.model.id}`}
              type="button"
              role="option"
              aria-selected={selected}
              className={`anv-row${mine === active ? ' anv-active' : ''}${selected ? ' anv-selected' : ''}`}
              title={`${row.model.name} · ${row.group.name}\n${levels.length > 0 ? `推理：${levels.join(' / ')}` : '不支持推理等级'}${row.model.description ? `\n${row.model.description}` : ''}`}
              onMouseEnter={() => setHighlight(mine)}
              onClick={() => onPick(row.group, row.model)}
            >
              <span className="anv-row-name">{row.model.name}</span>
              <span className="anv-row-end">{selected ? <span className="anv-check">✓</span> : null}</span>
            </button>
          )
        })}
      </div>
      {state.failures.length > 0 ? <div className="anv-mp-empty">{state.failures.map(f => f.name).join('、')} 的模型列表加载失败</div> : null}
    </div>
  )
}
