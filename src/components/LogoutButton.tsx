'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { postJson } from '@/lib/client-api'

/** ヘッダーのログアウト。 */
export function LogoutButton() {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function handleClick() {
    setPending(true)
    await postJson('/api/auth/logout')
    router.push('/')
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="inline-flex min-h-11 shrink-0 items-center px-1 text-sm font-semibold text-stone-700 hover:text-wine-800 disabled:text-stone-400"
    >
      {pending ? 'ログアウト中...' : 'ログアウト'}
    </button>
  )
}
