import { readFileSync } from 'node:fs'

/** auth.setup.ts が保存するログイン状態（Cookie）。リポジトリには含めない。 */
export const COURSE_STATE = 'tests/e2e/.auth/course-customer.json'
export const MEMBER_STATE = 'tests/e2e/.auth/member.json'
export const MULTI_STATE = 'tests/e2e/.auth/multi-store.json'

/**
 * 保存済みのログイン状態から、顧客トークン（rexbook_session Cookie の値）を取り出す。
 * ブラウザを開く前に RexCarte の顧客 API で空き枠を探すために使う（顧客 API はログインが必要）。
 */
export function readSessionToken(statePath: string): string {
  const state = JSON.parse(readFileSync(statePath, 'utf-8')) as { cookies: { name: string; value: string }[] }
  const cookie = state.cookies.find((item) => item.name === 'rexbook_session')
  if (!cookie) throw new Error(`${statePath} に rexbook_session がありません。auth.setup.ts が先に実行されましたか？`)
  return cookie.value
}
