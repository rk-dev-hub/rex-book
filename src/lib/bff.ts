import 'server-only'

import { NextResponse } from 'next/server'
import type { z } from 'zod'
import { getEnv } from './env'
import { RexCarteError } from './rexcarte'
import { isAllowedOrigin } from './origin'
import { getSessionToken } from './session'

/**
 * BFF の Route Handler 共通処理。状態を変える操作は、ここを通して次を必ず行う。
 *   1. Origin の検証（CSRF 対策。Cookie の SameSite=Lax に加えて二重に防ぐ）
 *   2. Content-Type: application/json の確認（他サイトのフォーム送信では作れないリクエストだけを受ける）
 *   3. Zod による入力検証
 *   4. 顧客トークン（Cookie）の取り出し
 *   5. RexCarte のエラーを、顧客に見せてよい文言に変換
 */

export function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ message }, { status })
}


const GENERIC_VALIDATION_MESSAGE = 'ご入力内容をご確認ください'

/**
 * 入力エラーの文言。日本語で書いた文言（スキーマに指定したもの）だけを顧客に見せる。
 * Zod が既定で作る英語のメッセージ（"Invalid input: ..." など）は、改ざんされたリクエストなどでしか
 * 出ないうえ顧客には意味が分からないため、共通の文言に置き換える。
 */
function friendlyValidationMessage(error: z.ZodError): string {
  const message = error.issues[0]?.message ?? ''
  return /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(message) ? message : GENERIC_VALIDATION_MESSAGE
}

interface PostOptions<S extends z.ZodType> {
  schema: S
  /** true なら、ログイン（顧客トークン）が必須。 */
  auth?: boolean
}

interface PostContext<S extends z.ZodType> {
  body: z.output<S>
  /** auth: true のときは必ず値がある。 */
  token: string
}

export async function handleMutation<S extends z.ZodType>(
  request: Request,
  options: PostOptions<S>,
  handler: (context: PostContext<S>) => Promise<NextResponse>,
): Promise<NextResponse> {
  if (!isAllowedOrigin(request.headers.get('origin'), getEnv().APP_URL)) {
    return jsonError('リクエストを受け付けられませんでした', 403)
  }
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return jsonError('リクエストを受け付けられませんでした', 415)
  }

  // 未ログインなら、入力の内容にかかわらず 401 を返す（認証を先に確認する）
  let token = ''
  if (options.auth) {
    const session = await getSessionToken()
    if (!session) return jsonError('ログインしてください', 401)
    token = session
  }

  const raw: unknown = await request.json().catch(() => null)
  const parsed = options.schema.safeParse(raw)
  if (!parsed.success) {
    return jsonError(friendlyValidationMessage(parsed.error), 400)
  }

  try {
    return await handler({ body: parsed.data, token })
  } catch (error) {
    if (error instanceof RexCarteError) {
      // ログイン切れは、画面側でログイン画面へ誘導できるよう 401 のまま返す
      return jsonError(
        error.isUnauthorized && options.auth ? 'ログインの有効期限が切れました。もう一度ログインしてください' : error.publicMessage,
        error.status >= 400 && error.status < 600 ? error.status : 502,
      )
    }
    throw error
  }
}
