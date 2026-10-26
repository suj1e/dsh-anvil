# AGENTS.md

dsh-anvil（Anvil 铁砧）是 DeepSeek Harness（DSH）输入框增强插件：一键润色草稿、回答结束后预测下一句、模型与推理等级选择（熔炉滑块）、输入框换皮和趴在输入框上的像素小火龙。用户文档见 [README.md](README.md)，踩过的坑见 [LESSONS.md](LESSONS.md)。前身是 `dsh-promptsmith`，0.2.0 起改名。

## 结构

```
src/
├── index.js            host 入口：注入 webServer/sessions/llm，挂载路由
├── host/
│   ├── routes.js       POST /dsh-anvil/{polish,predict}，含同源校验
│   ├── llm.js          读会话上下文、用会话当前模型发一次独立请求；DEFAULTS 即可配置项
│   └── prompts.js      润色/预测的系统提示词与输出清洗
└── client/
    ├── index.jsx       注册到 window.__ModuleLoader__，把组件挂进输入框 slot
    ├── react.js        运行时注入的 React / ReactDOM（JSX 编译成 h(...)）
    ├── api.js          调 host 接口
    ├── dom.js          查找输入卡片/编辑器、在其上叠 fixed 定位特效
    ├── shared.js       组件间共享的推理「热度」（模型选择器写，小火龙读）
    ├── styles.js       注入的 CSS（全部动画和关键帧）
    ├── sparks.js       canvas 炉火粒子
    ├── PolishButton.jsx  闪光按钮（slot: conversation.input.right）
    ├── Suggestion.jsx    预测灰字 + Tab（slot: conversation.input.overlay）
    ├── ModelPicker.jsx   模型与推理等级菜单（slot: conversation.input.model，覆盖官方）
    ├── FurnaceSlider.jsx 推理等级熔炉滑块（熔流、火星粒子）
    ├── Pet.jsx           小火龙（slot: conversation.input.overlay），顺带给卡片和工作区行打换皮 class
    └── dragon.js         小火龙的像素点阵和各状态帧
scripts/build.mjs       esbuild：src/index.js → lib/index.js（Node ESM），src/client → lib/client.js（浏览器 IIFE）
cordis.patch.yml        把 anvil 行插入 profile
locale/{en,zh}.json     插件市场显示的标题和描述（en 必填）
```

`lib/` 是构建产物，不进 git，发 npm 时由 `prepublishOnly` 构建。

## 踩坑记录

DSH 插件接口、DOM 与样式、动画、预测、调试、发布相关的坑都记在 [LESSONS.md](LESSONS.md)。改输入框相关代码前先看一遍，新踩的坑也补进去。

DSH 源码参考：`packages/client/ui-conversation`（slot 与 InputActions 契约）、`packages/client/ui-model-selection`（模型目录与官方选择器）、`packages/client/ui-slots`（slot 优先级规则）、`packages/experimental/client-ui-voice-input`（输入框控件写法）、`packages/session/session-title-llm`（host 调模型）。

## 模型选择器设计

参照 Claude 的模型菜单，一个按钮加一个短菜单：

- **工具栏按钮**：模型名 + 等级文字标签，标签颜色随推理热度从琥珀到玫红；在按钮上滚动鼠标滚轮直接换挡（停 350ms 后提交，界面先乐观更新）。
- **主菜单**（从上到下）：最近用的 4 个模型（`localStorage` 的 `dsh-anvil:recent-models`，不足时用当前模型及同组补齐），数字键 1–4 直选；「更多模型 ›」；分隔线；推理等级（大号等级名 + 熔炉滑块 + 「自动」开关），←→ 换挡。
- **选完模型菜单不关**，可以接着调推理等级；新模型也有当前这一挡就沿用，否则交给它的默认等级。
- **熔炉滑块**：胶囊轨道里是随挡位升温的熔流（热浪纹 + 火星），白色圆形拖把带 2px 炉火圈；拖动拖出火花尾迹，越挡迸火星，停在最高挡偶尔自己爆一下。刻度下方写挡位名，挡位多于 5 个时奇数挡显示为「·」。「自动」是独立开关，不占挡位。
- **更多模型子菜单**：只在点击时打开（悬停只高亮，避免误触），始终在主菜单右侧；右边放不下时主菜单向左滑开让位（`menuShift`）。搜索按模型名和提供方名做子序列匹配；分组展开时先列 8 个，其余点「显示全部」。

## 换皮与小火龙

- **只换皮加东西**，不改 DSH 的交互：输入卡片上方的「默认工作区 / 标准模式」行做成标签条（`.anv-tabstrip`），卡片聚焦时亮一圈炉火色（`.anv-card`）；权限选择仍在「+」旁边。
- **小火龙**：像素画，趴在卡片右上沿、朝左。闲着时一格一格地呼吸、眨眼、尾巴火跳；打字时眼珠往左看；模型思考时张嘴朝左喷火，推理挡位越高火越长；回答完成 ^^ 眼蹦两下；闲置 90 秒睡着；点它蹦一下。

## 动画设计

统一用「锻造」意象（铁砧、铁匠），配色是炉火渐变 `--anv-ember-1/2/3`（琥珀 → 橙 → 玫红）。成功和撤销只用动画表达，不弹文字；只有出错时显示文字。

| 时机 | 动画 | 位置 |
|---|---|---|
| 悬停闪光按钮 | 主闪光微转放大，小闪光闪烁 | `.anv-polish:hover` |
| 草稿为空时点击 | 按钮左右抖动 | `anv-shake` |
| 润色中 | 按钮像被锤子敲打，圆形光晕随锤击明暗，每锤溅出 5 颗火星；草稿文字上循环扫过炉火光 | `anv-hammer`、`anv-halo`、`.anv-strike`、`.anv-forging` |
| 润色完成 | 12 颗火星迸出，图标弹出切换为撤销，新文字上扫过亮光 | `.anv-spark`、`anv-pop`、`.anv-sweep` |
| 等待预测 | 钢琴键琶音 + 飘出音符 | `.anv-piano` |
| 预测出现 | 逐字打出，带炉火色光标 | `TYPE_MS`、`.anv-caret` |
| 按 Tab 采用 | 输入卡片边缘亮一圈 | `.anv-flash` |
| 拖动挡位 | 拖把跟手、熔流跟着伸缩，身后拖出火花尾迹 | `FurnaceSlider`、`sparks.js` |
| 换挡 | 迸一簇火星，挡位越高越猛；等级名弹一下 | `FurnaceSlider`、`.anv-gear-level` |
| 小火龙 | 逐帧换图（眨眼、尾巴火、喷火），呼吸和蹦跳用 `steps()` 保持像素感 | `Pet.jsx`、`dragon.js` |
| 菜单 | 弹出时上浮淡入；主菜单为子菜单让位时滑动 | `anv-panel-in`、`.anv-menu` |

覆盖在输入框上的特效（扫光、闪光）用 `dom.js` 的 `overlay()` 以 fixed 定位挂到 body，每帧跟随目标元素位置；盖文字的扫光只盖内容盒并左右对称。系统开启「减弱动态效果」时全部关闭，打字机直接显示全文，不出火星。

调试动画时可在页面里临时拖慢插件请求，便于截图：
`const f = fetch; window.fetch = async (u, o) => { if (String(u).includes('/dsh-anvil/')) await new Promise(r => setTimeout(r, 4000)); return f(u, o) }`

## 本地开发

用 DSH 桌面版自带的 CLI，在独立的 `anvil-dev` profile 里调试，不影响桌面版配置：

```bash
DSH="/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh"
"$DSH" --profile anvil-dev --from-default-profile web --help   # 首次：用 web 模板建 profile
"$DSH" plugin --profile anvil-dev add "$PWD"                   # 首次：以 link 方式装入本仓库
npm run watch                                                   # 改代码自动构建
"$DSH" --profile anvil-dev --no-open --port 3099                # 启动，打开它打印的带 token 的地址
```

- 改了 `src/client`：刷新页面即可。
- 改了 `src/host`：重启 dsh。
- 会话记录和模型配置与桌面版共享（都在 `~/.dsh`），测试会话会出现在桌面版侧栏里。测试模型选择器时新建一个会话，避免改动正在用的会话的模型。

## 发布

1. 改 `package.json` 的 `version`，提交；
2. 打同名 tag 并推送：`git tag v0.2.0 && git push origin v0.2.0`；
3. `release.yml` 校验 tag 与版本一致后发布到 npm（带 `-` 的预发布版本发到 `next` 渠道）。需要仓库 secret `NPM_TOKEN`；
4. **到 npm 批准**：npm 的 staged publishing 会把 CI 发布的版本先放进暂存区，需要维护者在 npmjs.com 的 **Staged Packages** 页签点 **Approve**（要 2FA），或用 npm ≥ 11.15 执行 `npm stage list dsh-anvil` / `npm stage approve <stage-id>`。批准前 registry 上看不到新版本；包首次发布时只有一个 `0.0.0-stage` 占位版本。

插件市场 [seek-bazaar](https://github.com/suj1e/seek-bazaar) 的 `plugins.txt` 收录 npm 包名，新版本批准后会被市场每日自动收录，想立即更新可在 seek-bazaar 手动运行 generate index 工作流。

## 约定

- 文档和界面文案用中文。
- `engines.dsh` 声明支持的 DSH 版本范围，插件市场依赖它；升级适配新 DSH 版本时同步修改。
