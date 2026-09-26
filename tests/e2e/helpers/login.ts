import { type Page, expect } from '@playwright/test'
import { APP_URL } from './env'
import { waitForLoginCode } from './mailpit'

const ORIGIN = new URL(APP_URL).origin

/**
 * 画面を通さずに、BFF の API でログインする（ログイン画面そのものを試す以外のテストで、時間と
 * ログインコードの送信回数を節約するため）。Cookie はブラウザのコンテキストに保存される。
 */
export async function loginViaApi(page: Page, email: string): Promise<void> {
  const since = Date.now()
  const requested = await page.request.post('/api/auth/request-code', { data: { email }, headers: { Origin: ORIGIN } })
  expect(requested.status()).toBe(202)

  const code = await waitForLoginCode(email, since)
  const verified = await page.request.post('/api/auth/verify', { data: { code }, headers: { Origin: ORIGIN } })
  expect(verified.ok()).toBeTruthy()
}
