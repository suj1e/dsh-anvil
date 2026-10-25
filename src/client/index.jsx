// Client 端入口：注册到 DSH 的模块加载器，把星星按钮放进输入框工具栏、把预测灰字放进输入卡片。
import { setReact } from './react.js'
import { installStyles } from './styles.js'
import { PolishButton } from './PolishButton.jsx'
import { Suggestion } from './Suggestion.jsx'

window.__ModuleLoader__.load({
  // 必须等于 package.json 的 name，DSH 按包名匹配客户端模块
  id: "dsh-promptsmith",
  factory: (require) => {
    setReact(require('react'))

    function apply(ctx) {
      ctx.effect(installStyles, 'dsh-promptsmith: styles')
      // 发送按钮前的紧凑控件区
      ctx.slots.inject('conversation.input.right', () => ctx.slots.register({
        name: 'conversation.input.right', id: 'dsh-promptsmith-polish', order: 0,
      }, PolishButton))
      // 输入卡片内的浮层
      ctx.slots.inject('conversation.input.overlay', () => ctx.slots.register({
        name: 'conversation.input.overlay', id: 'dsh-promptsmith-suggestion', order: 0,
      }, Suggestion))
    }

    return { apply, inject: ['slots'] }
  },
})
