/**
 * ブラウザから BFF（この Next.js の /api）を呼ぶ関数。
 * RexCarte へは直接つながず、必ずここを通す。JSON 以外の形式では送らない
 * （BFF は Content-Type: application/json のリクエストだけを受ける）。
 */

export interface ApiResult<T> {
  ok: boolean
  status: number
  data: T | null
  /** 失敗したとき顧客に見せる文言 */
  message: string
}

const NETWORK_ERROR = '通信に失敗しました。時間をおいて再度お試しください'

export async function postJson<T = Record<string, never>>(
  path: string,
  body: unknown = {},
  method: 'POST' | 'PUT' = 'POST',
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const payload: unknown = await response.json().catch(() => null)
    if (response.ok) return { ok: true, status: response.status, data: payload as T, message: '' }
    const message =
      payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
        ? payload.message
        : NETWORK_ERROR
    return { ok: false, status: response.status, data: null, message }
  } catch {
    return { ok: false, status: 0, data: null, message: NETWORK_ERROR }
  }
}
