'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Notice, buttonClass } from '@/components/ui'
import { postJson } from '@/lib/client-api'

/** 予約のキャンセル。誤操作を防ぐため、押したあとにもう一度確認する。 */
export function CancelReservation({ reservationId }: { reservationId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function handleCancel() {
    if (pending) return
    setPending(true)
    setError('')
    const result = await postJson(`/api/reservations/${reservationId}/cancel`)
    if (result.ok) {
      // 画面を読み込み直して、キャンセル済みの表示にする
      router.refresh()
      return
    }
    setPending(false)
    setConfirming(false)
    setError(result.message)
  }

  if (!confirming) {
    return (
      <div className="space-y-3">
        {error && <Notice tone="error">{error}</Notice>}
        <button type="button" onClick={() => setConfirming(true)} className={buttonClass('secondary', true)}>
          予約をキャンセルする
        </button>
      </div>
    )
  }

  return (
    <div role="alertdialog" aria-labelledby="cancel-title" className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
      <p id="cancel-title" className="text-sm font-bold text-rose-900">
        この予約をキャンセルします。よろしいですか？
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setConfirming(false)} disabled={pending} className={buttonClass('secondary')}>
          戻る
        </button>
        <button type="button" onClick={handleCancel} disabled={pending} className={buttonClass('danger')}>
          {pending ? '処理中...' : 'キャンセルする'}
        </button>
      </div>
    </div>
  )
}
