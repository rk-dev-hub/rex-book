import { NextResponse } from 'next/server'
import { z } from 'zod'
import { handleMutation } from '@/lib/bff'
import { requestLoginCode } from '@/lib/rexcarte'
import { emailSchema } from '@/lib/schemas'
import { setLoginEmail } from '@/lib/session'

/**
 * ログイン用のワンタイムコードをメールで送る。
 * 登録済みかどうか・送信回数の制限にかかったかどうかで応答を変えない（RexCarte が常に 202 を返す）。
 */
export async function POST(request: Request) {
  return handleMutation(request, { schema: z.object({ email: emailSchema }) }, async ({ body }) => {
    await requestLoginCode(body.email)
    // コード入力画面で使うため、メールアドレスは URL ではなく短時間の httpOnly Cookie で渡す
    await setLoginEmail(body.email)
    return NextResponse.json({ status: 'accepted' }, { status: 202 })
  })
}
