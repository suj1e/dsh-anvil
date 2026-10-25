// 调用 host 端接口（与页面同源）。
async function post(action, body, signal) {
  const response = await fetch(`/dsh-promptsmith/${action}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-dsh-promptsmith': '1' },
    body: JSON.stringify(body),
    signal,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error ?? `请求失败（${response.status}）`)
  return data.text ?? ''
}

export const polish = (sessionId, draft, signal) => post('polish', { sessionId, draft }, signal)
export const predict = (sessionId, signal) => post('predict', { sessionId }, signal)
