'use client'

import { buttonClass } from '@/components/ui'

/** 想定外のエラー。詳細（RexCarte の URL やスタック）は画面に出さない。 */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-lg px-4 py-16">
      <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
        <p className="mb-1 font-bold">読み込めませんでした</p>
        <p>通信に失敗しました。時間をおいて再度お試しください。</p>
      </div>
      <button type="button" onClick={reset} className={`${buttonClass('primary', true)} mt-6`}>
        もう一度試す
      </button>
    </main>
  )
}
