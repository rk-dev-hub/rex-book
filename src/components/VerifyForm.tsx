'use client'

import { useRouter } from 'next/navigation'
import { type FormEvent, useEffect, useState } from 'react'
import { FormField, Notice, buttonClass, inputClass } from '@/components/ui'
import { postJson } from '@/lib/client-api'
import { codeSchema } from '@/lib/schemas'

/** 「コードを再送する」を押せるようになるまでの秒数 */
const RESEND_COOLDOWN_SECONDS = 60

/** 6 桁のコードを入力してログインする。失敗の理由（違う・期限切れ・回数超過）は区別しない。 */
export function VerifyForm({ email, next }: { email: string; next: string }) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pending, setPending] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS)

  useEffect(() => {
    const timer = setInterval(() => setSecondsLeft((seconds) => Math.max(0, seconds - 1)), 1000)
    return () => clearInterval(timer)
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return

    const parsed = codeSchema.safeParse(code)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? '6桁の数字を入力してください')
      return
    }

    setPending(true)
    setError('')
    setNotice('')
    const result = await postJson('/api/auth/verify', { code: parsed.data })
    if (result.ok) {
      router.push(next)
      return
    }
    setPending(false)
    setError(result.message)
  }

  async function handleResend() {
    if (secondsLeft > 0) return
    setError('')
    const result = await postJson('/api/auth/request-code', { email })
    if (result.ok) {
      setSecondsLeft(RESEND_COOLDOWN_SECONDS)
      setNotice('コードを再送しました。')
    } else {
      setError(result.message)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-700">
        <span className="break-all font-semibold">{email}</span> が店舗にご登録のメールアドレスの場合、ログインコードを送信しました。メールに書かれた6桁の数字を入力してください。
      </p>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormField label="6桁のコード" htmlFor="code" error={error}>
          <input
            id="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'code-error' : undefined}
            className={`${inputClass} text-center text-2xl tracking-[0.5em]`}
          />
        </FormField>
        {notice && <Notice tone="success">{notice}</Notice>}
        <button type="submit" disabled={pending} className={buttonClass('primary', true)}>
          {pending ? '確認しています...' : 'ログイン'}
        </button>
      </form>

      <button
        type="button"
        onClick={handleResend}
        disabled={secondsLeft > 0}
        className={buttonClass('secondary', true)}
      >
        {secondsLeft > 0 ? `コードを再送する（${secondsLeft}秒後）` : 'コードを再送する'}
      </button>
    </div>
  )
}
