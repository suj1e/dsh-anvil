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

export const PREDICT_SYSTEM = `你负责预测用户接下来最可能对 AI 编程助手说的一句话。下面会给你最近的对话记录。

规则：
- 站在用户的角度，写出用户下一条消息，而不是助手的回答。
- 简短自然，一般不超过 30 个字，使用用户一直在用的语言。
- 优先预测对话的自然下一步，比如确认、追问、让助手继续或执行刚提出的方案。
- 没有明确的下一步时，只输出空字符串。
- 只输出这句话本身，不要解释，不要加引号。`

export function polishInput(session, options, draft) {
  const transcript = transcriptOf(session, options)
  return `${transcript === '' ? '（还没有对话记录）' : `<对话记录>\n${transcript}\n</对话记录>`}\n\n<草稿>\n${draft}\n</草稿>`
}

export function predictInput(session, options) {
  const transcript = transcriptOf(session, options)
  return transcript === '' ? null : `<对话记录>\n${transcript}\n</对话记录>`
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
