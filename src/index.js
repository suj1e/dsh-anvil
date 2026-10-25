// Host 端入口：在 DSH 的 web 服务上注册润色和预测接口，client 端通过同源 fetch 调用。
import { mountRoutes } from './host/routes.js'

export const name = 'dsh-anvil'

/**
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {object} [config] - cordis.patch.yml 里该行的 config，见 host/llm.js 的 DEFAULTS
 */
export function apply(ctx, config = {}) {
  ctx.inject(['webServer', 'sessions', 'llm'], (scope) => {
    mountRoutes(scope, config)
  })
}
