import 'server-only'

import { cookies } from 'next/headers'
import { getEnv } from './env'

/**
 * 顧客トークンは httpOnly の Cookie にだけ保存し、ブラウザの JavaScript からは読めないようにする。
 * （RexCarte 管理画面は localStorage に保存しているため XSS でトークンを盗まれうる。
 *  不特定多数が使う顧客向けはより安全な方式にする。docs/02-architecture.md §1）
 */
export const SESSION_COOKIE = 'rexbook_session'
/** ワンタイムコードを送ったメールアドレス。URL に載せず、コード入力画面へ受け渡すために短時間だけ持つ。 */
export const LOGIN_EMAIL_COOKIE = 'rexbook_login_email'

/** 顧客トークンの有効期限（RexCarte の CUSTOMER_TOKEN_EXPIRE_DAYS と同じ 7 日）。 */
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60
/** ワンタイムコードの有効期限（10 分）に合わせる。 */
const LOGIN_EMAIL_MAX_AGE_SECONDS = 10 * 60

function baseOptions() {
  return {
    httpOnly: true,
    secure: getEnv().SESSION_COOKIE_SECURE,
    sameSite: 'lax' as const,
    path: '/',
  }
}

export async function getSessionToken(): Promise<string | null> {
  const store = await cookies()
  return store.get(SESSION_COOKIE)?.value ?? null
}

export async function setSessionToken(token: string): Promise<void> {
  const store = await cookies()
  store.set(SESSION_COOKIE, token, { ...baseOptions(), maxAge: SESSION_MAX_AGE_SECONDS })
}

export async function clearSessionToken(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

export async function getLoginEmail(): Promise<string | null> {
  const store = await cookies()
  return store.get(LOGIN_EMAIL_COOKIE)?.value ?? null
}

export async function setLoginEmail(email: string): Promise<void> {
  const store = await cookies()
  store.set(LOGIN_EMAIL_COOKIE, email, { ...baseOptions(), maxAge: LOGIN_EMAIL_MAX_AGE_SECONDS })
}

export async function clearLoginEmail(): Promise<void> {
  const store = await cookies()
  store.delete(LOGIN_EMAIL_COOKIE)
}
