# LESSONS.md

开发 dsh-anvil 时踩过的坑。每条写清现象、原因和现在的做法，改到相关代码前先看一眼。项目结构和设计见 [AGENTS.md](AGENTS.md)。

## DSH 插件接口

- **客户端注册 id 必须等于包名**（`dsh-anvil`），否则 DSH 报 "loaded without registering"。`build.mjs` 会校验。
- **会话 Hook 需要 selector**：slot 组件收到的 `useInput`、`useSession` 必须传函数，如 `useInput(s => s.draft)`，不传报 `selector is not a function`。只取原始值字段，返回新对象会导致每次重渲染。
- **slot 选择**：`conversation.input.activity` 是 single，已被官方语音输入占用，所以闪光按钮放在 list 类型的 `conversation.input.right`；灰字和小火龙放在 `conversation.input.overlay`。list slot 注册需要 `id` 和 `order`，同一个 slot 挂多个组件靠不同 `id` 区分。
- **覆盖官方模型选择器**：`conversation.input.model` 是 single，官方占 priority 0；同 priority 再注册会抛错，更小的 priority 优先渲染，所以用 `priority: -1`。插件卸载或组件崩溃时 DSH 自动回退到官方选择器。
- **模型目录**：复用官方 `ctx.modelDirectories.directoryFor(sessionId)`。`store`（`getSnapshot`/`subscribe`，配 `useSyncExternalStore`）给出 `groups`（提供方 → 模型 → `reasoning.efforts`/`defaultEffort`）、`current`、`pending`、`error`、`failures`、`retainedEffort`；切换用 `select({ provider, model, reasoningEffort? })`，不传 `reasoningEffort` 即「自动」。与 `/model` 命令共享状态。错误码 `session/writer-held` 表示会话正被别处占用。
- **`directoryFor` 在调用方上下文里访问 `remote.session`**：必须在**插件级** `inject` 里声明 `modelDirectories`、`sessions`、`remote`、`remote.session`，否则报 `cannot get property "remote.session" without inject`。嵌套的 `ctx.inject([...])` 不行。
- **目录加载前 `current` 为 null**：所有读 `current` 的地方都要判空。曾经因为 `optimistic?.model === current?.model` 在两者都是 undefined 时成立，加载时序不同就随机崩溃；现在写成 `optimistic !== null && ...`。
- **改草稿**：`inputActions.setDraft(text)` 整体替换，会把 `@文件` 等引用块变成纯文本。
- **灰字定位**：DSH 没有公开的占位符接口。`Suggestion.jsx` 从 overlay 锚点向上找到 `[contenteditable="true"]`，按其位置和字体绝对定位，并给自带占位提示加 `anv-hide-placeholder`。DSH 改了输入框 DOM 时这里最可能坏。
- **Tab 拦截**：在 document 捕获阶段监听 keydown，仅当灰字可见且焦点在本输入卡片内时拦截。
- **host 调模型**：`ctx.sessions.get(id)` → `session.deriveMessages()` 取消息，`session.requestHeader()?.config` 取当前 provider/model，`ctx.llm.prepareCall({ provider, model, maxTokens }, signal)` 后 `call.stream({ ...call.config, messages, system, sessionId, signal })`，累加 `text-delta`。参考官方 `session-title-llm`。
- **路由安全**：`trusted()` 要求请求头 `x-dsh-anvil: 1`、拒绝 `sec-fetch-site: cross-site`、Origin 必须同源或为桌面端 `dsh-app://app`。

## DSH 的 DOM 与样式

- **全局 `corner-shape: superellipse(1.5)`**：DSH 给所有元素加了这个，`border-radius: 50%` 会被画成圆角方块（滑块拖把、润色光环都中过招）。`styles.js` 开头给插件自己的元素统一设回 `corner-shape: round`；宿主的卡片和工作区行不动。调圆形元素时先查计算样式里的 `corner-*-shape`。
- **类名是带哈希的 CSS Modules**（`JZLxKW_card`、`kiGsTW_heroWorkspaceRow`、`kiGsTW_composerSeat`）：只能按后缀匹配，如 `/_heroWorkspaceRow\b/`、`[class*="composerSeat"]`，并在卸载时摘掉自己加的 class。DSH 升级可能改名。
- **层叠上下文**：输入框外层 `composerSeat` 是 `position: sticky; z-index: 9`，卡片 `z-index: 1`，`/` 指令和 `@` 文件列表是卡片**内部**的 `z-index: 100` 弹层。挂在 body 上的 fixed 元素只要 z-index > 9 就会盖住这些弹层。小火龙因此 portal 进 `composerSeat`、`z-index: 0`，垫在卡片下面：平时在对话内容之上，弹层打开时被弹层盖住。
- **卡片会裁剪溢出内容**：画在卡片外面的东西（小火龙、扫光）用 fixed 定位，每帧用 `getBoundingClientRect` 跟随。
- **编辑器在卡片里左右不对称**：编辑器左边贴着卡片、右边留 4px，左右内边距也不同。整块盖住编辑器的扫光会一边贴边框、一边留空。`overlay()` 的 `text` 参数只盖文字的内容盒，并以卡片为基准左右镜像对称。
- **工具栏控件间距固定 12px**：润色按钮和模型按钮是一组，用 `margin-right: -6px` 收紧，两者看起来间隔 6px。
- **`.anv-ghost` 曾经 `overflow: hidden`**：钢琴上飘出的音符被裁掉，看起来「只有钢琴没有音符」。浮层上的装饰要允许溢出。

## React 与动画

- **fixed 菜单从左边飞进来**：菜单首次渲染放在 `left: -9999` 量尺寸，再定位；如果 `left` 一直有 transition，就会从屏外滑进来。现在定位完成后才加 `anv-placed` class 开启水平过渡。
- **只启动一次的绘制循环读到旧值**：`useMolten` 的 rAF 循环在挂载时启动，闭包里的 `auto` 永远是首次的值，切换「自动」后熔流不熄。循环里要读的状态一律走 ref（`fRef`、`autoRef`）。
- **外溢光晕被裁成方块**：拖把用大范围 `box-shadow` 发光，被 `overflow: hidden` 的胶囊上下边缘削平，看起来像方块、上下间隙也不一致。现在只用贴身的 2px 炉火圈。
- **整块 svg 吃点击**：小火龙的 svg 盒子比画出来的龙大得多，`pointer-events: auto` 会挡住下面的消息和按钮。现在 svg 本身 `pointer-events: none`，只有像素 `rect` 用 `visiblePainted` 接收点击。
- **异步结果覆盖用户输入**：润色请求期间用户继续打字，结果回来会覆盖新打的字。用 ref 记最新草稿，和发请求时的草稿不一样就放弃结果。
- **延迟提交要在卸载时清掉**：滚轮换挡停 350ms 才提交，组件卸载时要 `clearTimeout`，否则会在已经离开的会话上切换等级。
- **手绘 SVG 角色很难好看**：曲线画的小动物比例稍偏就显得僵硬甚至吓人，反复改也收效甚微。改用像素画（`dragon.js` 的字符点阵，每个状态只替换几行）后观感稳定，也容易做逐帧动画。

## 预测下一句

- **预测读起来像在回答用户**：只给对话记录时，模型常以助手口吻续写（「好的，以下是…」）。现在系统提示词明确「你写的是用户要发的话」，要求输出以「用户：」开头；`cleanPrediction` 去掉前缀，丢掉以「助手：」开头的，未按格式输出时再用助手式开场白正则把关（按格式输出的「好的，就这么改」是正常用户话术，不能误杀）。
- **复述检测别误伤短句**：和助手上一条回答做字符二元组重合度判断，> 0.5 视为复述丢弃；但「谢谢」「继续」这类短句跟任何回答都容易撞字，少于 8 个字不做这项判断。

## 调试

- **在独立 profile 里测**：用 `anvil-dev` profile，会话记录与桌面版共享。测模型选择器时新建会话，别动正在用的会话的模型。改了 `src/host` 要重启 dsh，改 `src/client` 刷新即可。
- **拖慢请求来截图**：在页面里临时包一层 `fetch`，对 `/dsh-anvil/` 请求延迟几秒，便于看清润色中、等待预测时的动画（代码见 AGENTS.md）。
- **内置浏览器截图偶尔慢一帧**：刚改完 DOM 立刻截图可能还是旧画面，再截一次。量尺寸、判断遮挡用 `getBoundingClientRect` 和 `elementFromPoint`，比看截图可靠。看细节可以临时给元素加 `zoom`。

## 发布与插件市场

- **npm staged publishing**：CI 发布的版本先进暂存区，要维护者在 npmjs.com 的 Staged Packages 里批准（2FA），批准前 registry 看不到新版本；包首次发布时只有 `0.0.0-stage` 占位版本。
- **删包**：`npm unpublish` 在有下载或超过时限后会被拒，旧包 `dsh-promptsmith` 最后是在网页上删的。
- **seek-bazaar 收录**：市场每日自动按 `plugins.txt` 生成索引，新版本想立即上架就手动运行 generate index 工作流。
- **GitHub Pages 自定义域名**：`.cn` 域名在本机代理（fake-ip、`.cn` 直连规则）下解析异常，自己都打不开，最后换成 `seekbazaar.beer`。GitHub 的 DNS 检查卡在失败状态时，用 API 删掉再重新设置自定义域名即可恢复。
