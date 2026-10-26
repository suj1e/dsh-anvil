// 润色与预测的提示词。
import { transcriptOf } from './llm.js'

export const POLISH_SYSTEM = `你是提示词润色助手。用户正在和一个 AI 编程助手对话，下面会给你最近的对话记录和用户正在输入的草稿。
你的任务是改写草稿，让它更清晰、具体、易于 AI 理解。

规则：
- 只改写草稿，绝对不要回答或执行草稿里的问题和任务。
- 保留用户的原意、语气和语言（中文草稿输出中文，英文输出英文）。
- 结合对话记录补全指代（比如"这个""上面那个"），但不要编造对话里没有的信息。
- 草稿已经足够清晰时，只做最小修改。
- 保留草稿中的路径、代码、命令、@引用和 /命令 原样不变。
- 只输出改写后的草稿本身，不要解释，不要加引号或标题。`

export const PREDICT_SYSTEM = `你在帮「用户」预测他下一条要发给 AI 编程助手的消息。下面是最近的对话记录，每条都标明了是用户说的还是助手说的。

规则：
- 你写的是**用户**接下来要发的话，绝不是助手的回答。不要以助手的口吻自我介绍、解释或回答问题。
- 简短自然，一般不超过 30 个字，使用用户一直在用的语言和语气。
- 优先预测对话的自然下一步：确认、追问细节、让助手继续，或让它执行刚提出的方案。
- 不要复述助手刚说过的内容。
- 没有明确的下一步时，只输出「用户：」。
- 输出格式固定为一行：以「用户：」开头，后面紧跟这句话，不要解释，不要加引号。`

export function polishInput(session, options, draft) {
  const transcript = transcriptOf(session, options)
  return `${transcript === '' ? '（还没有对话记录）' : `<对话记录>\n${transcript}\n</对话记录>`}\n\n<草稿>\n${draft}\n</草稿>`
}

export function predictInput(session, options) {
  const transcript = transcriptOf(session, options)
  return transcript === '' ? null : `<对话记录>\n${transcript}\n</对话记录>\n\n用户接下来会说什么？`
}

/** 两段文字的字符二元组重合度（0~1），用来判断预测是不是在复述助手的话 */
function overlap(a, b) {
  const grams = (t) => {
    const clean = t.replace(/\s+/g, '')
    const set = new Set()
    for (let i = 0; i < clean.length - 1; i++) set.add(clean.slice(i, i + 2))
    return set
  }
  const x = grams(a)
  if (x.size === 0) return 0
  const y = grams(b)
  let hit = 0
  for (const g of x) if (y.has(g)) hit++
  return hit / x.size
}

const ASSISTANT_VOICE = /^(我是(你的|一个|一名|AI|DeepSeek)|好的[，,：:]|当然[可以，,]|以下是|作为(一个|你的|AI)|没问题[，,]|你好[，,！!])/

/**
 * 把模型输出清洗成「用户的下一句」：去掉「用户：」前缀；
 * 写成了助手口吻、或在复述助手上一条回答时返回空串（宁可不显示，也不显示错的）。
 */
export function cleanPrediction(raw, lastAssistant) {
  let text = cleanOutput(raw).split('\n')[0].trim()
  if (/^(助手|AI|assistant)\s*[：:]/i.test(text)) return ''
  // 按格式以「用户：」开头时信任它（「好的，就这么改」本来就是用户常说的话）；
  // 没按格式输出说明模型可能跑偏了，这时才用助手式开场白把关
  const followedFormat = /^(用户|user)\s*[：:]/i.test(text)
  text = cleanOutput(text.replace(/^(用户|user)\s*[：:]\s*/i, '').trim())
  if (text === '') return ''
  if (!followedFormat && ASSISTANT_VOICE.test(text)) return ''
  // 太短的话（「谢谢」「继续」）跟任何回答都容易撞字，不做复述判断
  if (lastAssistant && text.replace(/\s+/g, '').length >= 8 && overlap(text, lastAssistant) > 0.5) return ''
  return text
}

/** 会话里助手的最后一条文字回答 */
export function lastAssistantText(session) {
  const messages = session.deriveMessages()
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role !== 'assistant') continue
    const text = (Array.isArray(m.content) ? m.content : []).filter(b => b?.type === 'text').map(b => b.text).join('\n').trim()
    if (text !== '') return text
  }
  return ''
}

/** 去掉模型偶尔加上的成对引号或代码围栏 */
export function cleanOutput(text) {
  let out = text.trim()
  const fence = out.match(/^```[a-zA-Z]*\n([\s\S]*?)\n```$/)
  if (fence) out = fence[1].trim()
  const pairs = [['"', '"'], ['“', '”'], ['「', '」'], ["'", "'"]]
  for (const [open, close] of pairs) {
    if (out.length >= 2 && out.startsWith(open) && out.endsWith(close)) out = out.slice(1, -1).trim()
  }
  return out
}
