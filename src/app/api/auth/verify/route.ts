import { NextResponse } from 'next/server'
import { z } from 'zod'
import { handleMutation, jsonError } from '@/lib/bff'
import { verifyLoginCode } from '@/lib/rexcarte'
import { codeSchema } from '@/lib/schemas'
import { clearLoginEmail, getLoginEmail, setSessionToken } from '@/lib/session'

const INVALID_CODE = 'コードが正しくないか、有効期限が切れています。もう一度お試しください'

/** ワンタイムコードを確認し、顧客トークンを httpOnly Cookie に保存する（ブラウザの JS には渡さない）。 */
export async function POST(request: Request) {
  return handleMutation(request, { schema: z.object({ code: codeSchema }) }, async ({ body }) => {
    const email = await getLoginEmail()
    // メールアドレスの Cookie が切れている場合も、コード違いと同じ文言にする（理由を区別しない）
    if (!email) return jsonError(INVALID_CODE, 401)

    const { access_token: token } = await verifyLoginCode(email, body.code)
    await setSessionToken(token)
    await clearLoginEmail()

    return NextResponse.json({ ok: true })
  })
}
