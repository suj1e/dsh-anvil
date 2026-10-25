// Client 端入口：注册到 DSH 的模块加载器，往输入框里挂润色按钮、预测灰字和模型选择器。
import { setReact } from './react.js'
import { installStyles } from './styles.js'
import { PolishButton } from './PolishButton.jsx'
import { Suggestion } from './Suggestion.jsx'
import { ModelPicker } from './ModelPicker.jsx'

// 模型位是 single slot，官方选择器占着 priority 0；更小的 priority 优先渲染，卸载插件即恢复官方
const MODEL_PRIORITY = -1

window.__ModuleLoader__.load({
  // 必须等于 package.json 的 name，DSH 按包名匹配客户端模块
  id: "dsh-anvil",
  factory: (require) => {
    setReact(require('react'), require('react-dom'))

    function apply(ctx) {
      ctx.effect(installStyles, 'dsh-anvil: styles')
      // 发送按钮前的紧凑控件区
      ctx.slots.inject('conversation.input.right', () => ctx.slots.register({
        name: 'conversation.input.right', id: 'dsh-anvil-polish', order: 0,
      }, PolishButton))
      // 输入卡片内的浮层
      ctx.slots.inject('conversation.input.overlay', () => ctx.slots.register({
        name: 'conversation.input.overlay', id: 'dsh-anvil-suggestion', order: 0,
      }, Suggestion))
      // 模型位：复用官方的会话模型目录（与 /model 命令共享状态）。
      // directoryFor 在调用方上下文里访问 remote.session，所以插件级 inject 要声明官方服务的依赖。
      const models = ctx.modelDirectories
      const sessions = ctx.sessions
      ctx.slots.inject('conversation.input.model', () => ctx.slots.register({
        name: 'conversation.input.model',
        priority: MODEL_PRIORITY,
        inject: (sessionId) => {
          const directory = models.directoryFor(sessionId)
          const available = sessions.subagentAddress(sessionId) === undefined
          return {
            available,
            directory: directory.store,
            load: () => { if (available) directory.load().catch(() => { /* 错误落在 store 上 */ }) },
            select: selection => available ? directory.select(selection) : Promise.resolve(undefined),
          }
        },
      }, ModelPicker))
    }

    return { apply, inject: ['slots', 'modelDirectories', 'sessions', 'remote', 'remote.session'] }
  },
})
