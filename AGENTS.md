# AGENTS.md

dsh-promptsmith 是 DeepSeek Harness（DSH）插件：输入框一键润色草稿、回答结束后预测下一句。用户文档见 [README.md](README.md)。

## 结构

```
src/
├── index.js            host 入口：注入 webServer/sessions/llm，挂载路由
├── host/
│   ├── routes.js       POST /dsh-promptsmith/{polish,predict}，含同源校验
│   ├── llm.js          读会话上下文、用会话当前模型发一次独立请求；DEFAULTS 即可配置项
│   └── prompts.js      润色/预测的系统提示词与输出清洗
└── client/
    ├── index.jsx       注册到 window.__ModuleLoader__，把组件挂进输入框 slot
    ├── react.js        运行时注入的 React（JSX 编译成 h(...)）
    ├── api.js          调 host 接口
    ├── dom.js          查找输入卡片/编辑器、在其上叠 fixed 定位特效
    ├── styles.js       注入的 CSS（全部动画和关键帧）
    ├── PolishButton.jsx  闪光按钮（slot: conversation.input.right）
    └── Suggestion.jsx    预测灰字 + Tab（slot: conversation.input.overlay）
scripts/build.mjs       esbuild：src/index.js → lib/index.js（Node ESM），src/client → lib/client.js（浏览器 IIFE）
cordis.patch.yml        把 promptsmith 行插入 profile
locale/{en,zh}.json     插件市场显示的标题和描述（en 必填）
```

`lib/` 是构建产物，不进 git，发 npm 时由 `prepublishOnly` 构建。

## DSH 接口要点（踩过的坑）

- **客户端注册 id 必须等于包名**（`dsh-promptsmith`），否则 DSH 报 "loaded without registering"。`build.mjs` 会校验。
- **会话 Hook 需要 selector**：slot 组件收到的 `useInput`、`useSession` 必须传函数，如 `useInput(s => s.draft)`，不传会报 `selector is not a function`。只取原始值字段，避免每次返回新对象导致重渲染。
- **slot 选择**：`conversation.input.activity` 是 single，已被官方语音输入占用，所以星星放在 list 类型的 `conversation.input.right`；灰字放在 `conversation.input.overlay`（输入卡片内浮层）。list slot 注册需要 `id` 和 `order`。
- **改草稿**：`inputActions.setDraft(text)` 整体替换，会把 `@文件` 等引用块变成纯文本。
- **灰字定位**：DSH 没有公开的占位符接口。`Suggestion.jsx` 从 overlay 锚点向上找到 `[contenteditable="true"]` 编辑器，按其位置和字体绝对定位，并给 DSH 自带的占位提示加 `psm-hide-placeholder` 隐藏。DSH 改了输入框 DOM 结构时这里最可能坏。
- **Tab 拦截**：在 document 捕获阶段监听 keydown，仅当灰字可见且焦点在本输入卡片内时拦截。
- **host 调模型**：`ctx.sessions.get(id)` 取会话，`session.deriveMessages()` 取消息，`session.requestHeader()?.config` 取当前 provider/model，`ctx.llm.prepareCall({provider, model, maxTokens}, signal)` 后 `call.stream({...call.config, messages, system, sessionId, signal})`，累加 `text-delta`。参考了官方 `session-title-llm`。
- **路由安全**：`routes.js` 的 `trusted()` 要求自定义请求头 `x-dsh-promptsmith: 1`、拒绝 `sec-fetch-site: cross-site`、Origin 必须同源或为桌面端 `dsh-app://app`。

DSH 源码参考：`packages/client/ui-conversation`（slot 与 InputActions 契约）、`packages/experimental/client-ui-voice-input`（输入框控件写法）、`packages/session/session-title-llm`（host 调模型）。

## 动画设计

统一用「锻造」意象（PromptSmith = 铁匠），配色是炉火渐变 `--psm-ember-1/2/3`（琥珀 → 橙 → 玫红）。成功和撤销只用动画表达，不弹文字；只有出错时显示文字气泡。

| 时机 | 动画 | 位置 |
|---|---|---|
| 悬停 | 主闪光微转放大，小闪光闪烁 | `.psm-polish:hover` |
| 草稿为空时点击 | 按钮左右抖动 | `psm-shake` |
| 润色中 | 按钮像被锤子敲打 + 外圈旋转光环；草稿文字上循环扫过炉火光 | `psm-hammer`、`.psm-forging` |
| 润色完成 | 12 颗火星迸出，图标弹出切换为撤销，新文字上扫过亮光 | `.psm-spark`、`psm-pop`、`.psm-sweep` |
| 等待预测 | 钢琴键琶音 + 飘出音符 | `.psm-piano` |
| 预测出现 | 逐字打出，带炉火色光标 | `TYPE_MS`、`.psm-caret` |
| 按 Tab 采用 | 输入卡片边缘亮一圈 | `.psm-flash` |

覆盖在输入框上的特效（扫光、闪光）用 `dom.js` 的 `overlay()` 以 fixed 定位挂到 body，每帧跟随目标元素位置。系统开启「减弱动态效果」时全部关闭，打字机直接显示全文。

调试动画时可在页面里临时拖慢插件请求，便于截图：
`const f = fetch; window.fetch = async (u, o) => { if (String(u).includes('/dsh-promptsmith/')) await new Promise(r => setTimeout(r, 4000)); return f(u, o) }`

## 本地开发

用 DSH 桌面版自带的 CLI，在独立的 `promptsmith-dev` profile 里调试，不影响桌面版配置：

```bash
DSH="/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh"
"$DSH" --profile promptsmith-dev --from-default-profile web --help   # 首次：用 web 模板建 profile
"$DSH" plugin --profile promptsmith-dev add "$PWD"                   # 首次：以 link 方式装入本仓库
npm run watch                                                         # 改代码自动构建
"$DSH" --profile promptsmith-dev --no-open --port 3099                # 启动，打开它打印的带 token 的地址
```

- 改了 `src/client`：刷新页面即可。
- 改了 `src/host`：重启 dsh。
- 会话记录和模型配置与桌面版共享（都在 `~/.dsh`），测试会话会出现在桌面版侧栏里。

## 发布

1. 改 `package.json` 的 `version`，提交；
2. 打同名 tag 并推送：`git tag v0.1.0 && git push origin v0.1.0`；
3. `release.yml` 校验 tag 与版本一致后发布到 npm（带 `-` 的预发布版本发到 `next` 渠道）。需要仓库 secret `NPM_TOKEN`；
4. **到 npm 批准**：npm 的 staged publishing 会把 CI 发布的版本先放进暂存区，需要维护者在 npmjs.com 的 **Staged Packages** 页签点 **Approve**（要 2FA），或用 npm ≥ 11.15 执行 `npm stage list dsh-promptsmith` / `npm stage approve <stage-id>`。批准前 registry 上看不到新版本；包首次发布时只有一个 `0.0.0-stage` 占位版本。

插件已收录在 [seek-bazaar](https://github.com/suj1e/seek-bazaar) 的 `plugins.txt`，新版本批准后会被市场每日自动收录，想立即更新可在 seek-bazaar 手动运行 generate index 工作流。

## 约定

- 文档和界面文案用中文。
- `engines.dsh` 声明支持的 DSH 版本范围，插件市场依赖它；升级适配新 DSH 版本时同步修改。
