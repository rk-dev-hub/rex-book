'use client'

import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'
import { FormField, buttonClass, inputClass } from '@/components/ui'
import { postJson } from '@/lib/client-api'
import { verifyHref } from '@/lib/navigation'
import { emailSchema } from '@/lib/schemas'

/** メールアドレスを入力して、ワンタイムコードを送る。登録済みかどうかで画面の文言を変えない。 */
export function LoginForm({ next }: { next: string }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return

    const parsed = emailSchema.safeParse(email)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'メールアドレスを確認してください')
      return
    }

    setPending(true)
    setError('')
    const result = await postJson('/api/auth/request-code', { email: parsed.data })
    if (result.ok) {
      router.push(verifyHref(next))
      return
    }
    setPending(false)
    setError(result.message)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <FormField label="メールアドレス" htmlFor="email" error={error}>
        <input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'email-error' : undefined}
          className={inputClass}
        />
      </FormField>
      <button type="submit" disabled={pending} className={buttonClass('primary', true)}>
        {pending ? '送信しています...' : 'ログインコードを送る'}
      </button>
    </form>
  )
}
