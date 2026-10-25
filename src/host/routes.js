// HTTP 接口：POST /dsh-anvil/polish、POST /dsh-anvil/predict
import { complete, DEFAULTS, HttpError } from './llm.js'
import { cleanOutput, POLISH_SYSTEM, polishInput, PREDICT_SYSTEM, predictInput } from './prompts.js'

const MAX_BODY_BYTES = 256 * 1024
const MAX_DRAFT_CHARS = 20000

function header(request, name) {
  const value = request.headers?.[name]
  return Array.isArray(value) ? value[0] : value
}

/**
 * 只接受来自 DSH 页面本身的请求：拒绝跨站请求，Origin 必须与 Host 同源（桌面端为 dsh-app://app），
 * 并要求自定义请求头，使普通网页无法不经 CORS 预检直接调用。
 */
function trusted(request) {
  if (header(request, 'x-dsh-anvil') !== '1') return false
  if (header(request, 'sec-fetch-site') === 'cross-site') return false
  const origin = header(request, 'origin')
  if (origin === undefined) return true
  if (origin === 'dsh-app://app') return true
  try {
    return new URL(origin).host === header(request, 'host')
  } catch {
    return false
  }
}

function send(response, status, body) {
  response.statusCode = status
  response.setHeader('content-type', 'application/json; charset=utf-8')
  response.setHeader('cache-control', 'no-store')
  response.end(JSON.stringify(body))
}

async function readJson(request) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) throw new HttpError(413, '请求体过大')
    chunks.push(chunk)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
  } catch {
    throw new HttpError(400, '请求体不是合法 JSON')
  }
}

function requireSessionId(body) {
  if (typeof body.sessionId !== 'string' || body.sessionId === '') throw new HttpError(400, '缺少 sessionId')
  return body.sessionId
}

function liveSession(ctx, body) {
  const session = ctx.sessions.get(requireSessionId(body))
  if (session === undefined) throw new HttpError(404, '会话不存在或未打开')
  return session
}

const handlers = {
  async polish(ctx, options, body, signal) {
    const draft = typeof body.draft === 'string' ? body.draft.trim() : ''
    if (draft === '') throw new HttpError(400, '草稿是空的')
    if (draft.length > MAX_DRAFT_CHARS) throw new HttpError(413, '草稿太长')
    const session = liveSession(ctx, body)
    const text = await complete(ctx, options, {
      session, system: POLISH_SYSTEM, input: polishInput(session, options, draft), signal,
    })
    const polished = cleanOutput(text)
    if (polished === '') throw new HttpError(502, '模型没有返回内容')
    return { text: polished }
  },

  async predict(ctx, options, body, signal) {
    const session = liveSession(ctx, body)
    const input = predictInput(session, options)
    if (input === null) return { text: '' }
    const text = await complete(ctx, { ...options, maxTokens: Math.min(options.maxTokens, 256) }, {
      session, system: PREDICT_SYSTEM, input, signal,
    })
    return { text: cleanOutput(text).split('\n')[0].trim() }
  },
}

export function mountRoutes(ctx, config) {
  const options = { ...DEFAULTS, ...config }
  for (const [action, handle] of Object.entries(handlers)) {
    ctx.effect(() => ctx.webServer.register({
      kind: 'exact',
      path: `/dsh-anvil/${action}`,
      handler: async (request, response) => {
        if (!trusted(request)) return send(response, 403, { error: '只接受来自 DSH 页面的请求' })
        if (request.method !== 'POST') return send(response, 405, { error: '只支持 POST' })
        const abort = new AbortController()
        response.on('close', () => { if (!response.writableEnded) abort.abort() })
        try {
          const body = await readJson(request)
          send(response, 200, await handle(ctx, options, body, abort.signal))
        } catch (error) {
          if (abort.signal.aborted) return
          const status = error instanceof HttpError ? error.status : 500
          if (status === 500) console.warn('[dsh-anvil]', error)
          send(response, status, { error: error?.message ?? String(error) })
        }
      },
    }), `dsh-anvil: ${action} route`)
  }
}
