'use client'

import { useRouter } from 'next/navigation'
import { inputClass } from './ui'

interface StoreSwitcherProps {
  stores: { id: string; name: string }[]
  currentId: string
  /** 切り替えたあとに開く画面。home = ホーム、store = 店舗情報、book = その店舗の予約 */
  target: 'home' | 'store' | 'book'
}

const HREFS: Record<StoreSwitcherProps['target'], (storeId: string) => string> = {
  home: (storeId) => `/?store=${storeId}`,
  store: (storeId) => `/stores/${storeId}`,
  book: (storeId) => `/stores/${storeId}/book`,
}

/**
 * 店舗の切り替え。複数の店舗に顧客として登録されている場合だけ表示する
 * （予約・予約の確認・チケットは、店舗ごとに別々に管理されているため）。
 */
export function StoreSwitcher({ stores, currentId, target }: StoreSwitcherProps) {
  const router = useRouter()
  if (stores.length < 2) return null

  return (
    <div className="mb-5">
      <label htmlFor="store-switcher" className="mb-1 block text-xs font-semibold text-stone-500">
        店舗を切り替える
      </label>
      <select
        id="store-switcher"
        value={currentId}
        onChange={(event) => router.push(HREFS[target](event.target.value))}
        className={inputClass}
      >
        {stores.map((store) => (
          <option key={store.id} value={store.id}>
            {store.name}
          </option>
        ))}
      </select>
    </div>
  )
}
