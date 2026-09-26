import 'server-only'

import { redirect } from 'next/navigation'
import { RexCarteError, getMe } from './rexcarte'
import { loginHref } from './navigation'
import { getSessionToken } from './session'
import type { CustomerAccount } from './types'

/** ログインしているか（Cookie があるか）だけを見る。トークンの有効性までは確認しない。 */
export async function hasSession(): Promise<boolean> {
  return (await getSessionToken()) !== null
}

/**
 * ログイン必須の画面で使う。未ログイン・トークンの期限切れならログイン画面へ、
 * 戻り先（nextPath）を付けて誘導する。
 */
export async function requireAccount(nextPath: string): Promise<{ token: string; account: CustomerAccount }> {
  const token = await getSessionToken()
  if (!token) redirect(loginHref(nextPath))

  let account: CustomerAccount
  try {
    account = await getMe(token)
  } catch (error) {
    if (error instanceof RexCarteError && error.isUnauthorized) redirect(loginHref(nextPath))
    throw error
  }

  return { token, account }
}
