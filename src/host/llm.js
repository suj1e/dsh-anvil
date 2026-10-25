// 读取会话上下文并调用会话当前使用的模型。
import { randomUUID } from 'node:crypto'

export const DEFAULTS = {
  /** 带给模型的最近消息条数 */
  contextMessages: 12,
  /** 单条消息最多保留的字符数 */
  maxCharsPerMessage: 2000,
  /** 上下文总字符上限（从最近往前截） */
  maxContextChars: 12000,
  /** 输出 token 上限 */
  maxTokens: 1024,
  /** 单次请求超时 */
  timeoutMs: 60000,
  /** 可选：固定用某个模型；不填则用会话当前的模型。provider 和 model 必须同时填 */
  provider: undefined,
  model: undefined,
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

function textOf(message) {
  const content = Array.isArray(message.content) ? message.content : []
  return content
    .filter(block => block?.type === 'text' && typeof block.text === 'string')
    .map(block => block.text)
    .join('\n')
    .trim()
}

/** 把会话最近的用户/助手文字整理成纯文本对话记录，跳过工具调用等非文字内容。 */
export function transcriptOf(session, options) {
  const lines = []
  let total = 0
  const messages = session.deriveMessages()
  for (let i = messages.length - 1; i >= 0 && lines.length < options.contextMessages; i--) {
    const message = messages[i]
    if (message.role !== 'user' && message.role !== 'assistant') continue
    let text = textOf(message)
    if (text === '') continue
    if (text.length > options.maxCharsPerMessage) text = `${text.slice(0, options.maxCharsPerMessage)}…`
    const line = `${message.role === 'user' ? '用户' : '助手'}：${text}`
    if (total + line.length > options.maxContextChars) break
    total += line.length
    lines.unshift(line)
  }
  return lines.join('\n\n')
}

function routeOf(session, options) {
  if (options.provider !== undefined && options.model !== undefined) {
    return { provider: options.provider, model: options.model }
  }
  const config = session.requestHeader()?.config
  if (config === undefined) throw new HttpError(409, '这个会话还没有用过模型，先发一条消息再试')
  return { provider: config.provider, model: config.model }
}

/**
 * 以会话当前模型做一次独立的补充请求，不写入会话记录。
 * @returns {Promise<string>} 模型输出的纯文本
 */
export async function complete(ctx, options, { session, system, input, signal }) {
  const sessionId = session.id
  const route = routeOf(session, options)
  const timeout = AbortSignal.timeout(options.timeoutMs)
  const combined = AbortSignal.any([signal, timeout])
  const call = await ctx.llm.prepareCall({ ...route, maxTokens: options.maxTokens }, combined)
  const messages = [{
    id: randomUUID(),
    role: 'user',
    content: [{ type: 'text', text: input }],
    source: { kind: 'dsh-anvil' },
  }]
  let text = ''
  for await (const chunk of call.stream({ ...call.config, messages, system, sessionId, signal: combined })) {
    if (chunk.type === 'text-delta') text += chunk.text
    if (chunk.type === 'finish' && chunk.reason?.kind === 'error') {
      throw new HttpError(502, chunk.reason.message ?? '模型返回错误')
    }
  }
  return text.trim()
}
