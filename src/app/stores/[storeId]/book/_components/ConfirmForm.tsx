'use client'

import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'
import { AppLink, FormField, LinkButton, Notice, buttonClass, inputClass } from '@/components/ui'
import { postJson } from '@/lib/client-api'
import { loginHref } from '@/lib/navigation'
import { reservationCreateSchema } from '@/lib/schemas'

interface ConfirmFormProps {
  storeId: string
  /** +09:00 付きの開始日時 */
  startAt: string
  ticketPlanId: string
  /** 指名なしは null */
  staffId: string | null
  /** この確認画面の URL。ログインの有効期限が切れていたとき、ログイン後にここへ戻る */
  currentHref: string
  /** 日時の選び直し先 */
  reselectHref: string
}

export function ConfirmForm({
  storeId,
  startAt,
  ticketPlanId,
  staffId,
  currentHref,
  reselectHref,
}: ConfirmFormProps) {
  const router = useRouter()
  const [notes, setNotes] = useState('')
  const [pending, setPending] = useState(false)
  // 「予約を確定する」を押したあと、もう一度確認してから確定する（誤操作で予約が入らないように）
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<{ message: string; status: number } | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return // 二重送信を防ぐ
    const parsed = reservationCreateSchema.safeParse({ storeId, startAt, ticketPlanId, staffId, notes })
    if (!parsed.success) {
      setConfirming(false)
      setError({ message: parsed.error.issues[0]?.message ?? 'ご入力内容をご確認ください', status: 400 })
      return
    }

    // 確認の前に確定はしない（Enter キーでの送信も、確認を出すだけ）
    if (!confirming) {
      setConfirming(true)
      return
    }

    setPending(true)
    setError(null)
    const result = await postJson<{ id: string }>('/api/reservations', parsed.data)

    if (result.ok && result.data) {
      // 成功したら送信中のままにして、画面が切り替わるまでボタンを押せないようにする
      router.push(`/reservations/${result.data.id}?done=1`)
      return
    }
    if (result.status === 401) {
      router.push(loginHref(currentHref))
      return
    }
    setPending(false)
    setConfirming(false)
    setError({ message: result.message, status: result.status })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
      <FormField
        label="店舗へのご要望（任意）"
        hint="アレルギーやご希望などがあればご記入ください"
        htmlFor="notes"
      >
        <textarea
          id="notes"
          rows={3}
          maxLength={500}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className={inputClass}
        />
      </FormField>

      {error && (
        <Notice tone="error">
          <p>{error.message}</p>
          {/* 枠が埋まっていた場合は、日時を選び直せるようにする */}
          {error.status === 409 && (
            <p className="mt-2">
              <AppLink href={reselectHref} className="font-semibold underline">
                日時を選び直す
              </AppLink>
            </p>
          )}
        </Notice>
      )}

      {confirming ? (
        <div role="alertdialog" aria-labelledby="confirm-title" className="space-y-3 rounded-xl border border-wine-200 bg-wine-50 p-4">
          <p id="confirm-title" className="text-sm font-bold text-wine-900">
            この内容で予約を確定します。よろしいですか？
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setConfirming(false)} disabled={pending} className={buttonClass('secondary')}>
              戻る
            </button>
            <button type="submit" disabled={pending} className={buttonClass('primary')}>
              {pending ? '予約しています...' : '確定する'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <button type="submit" className={buttonClass('primary', true)}>
            予約を確定する
          </button>
          <LinkButton href={reselectHref} variant="secondary" block>
            日時を選び直す
          </LinkButton>
        </>
      )}
    </form>
  )
}
