import type { ReactNode } from 'react'
import { hasSession } from '@/lib/auth'
import { getBranding } from '@/lib/rexcarte'
import { LogoutButton } from './LogoutButton'
import { AppLink } from './ui'

/**
 * 全画面共通の枠。スマートフォン幅を基準に、PC では中央寄せの 1 カラムにする。
 * ヘッダーには導入先の事業者名とアイコン（RexCarte の事業者設定。予約トップへのリンク）と、
 * ログイン中ならログアウトを出す。このアプリはログインしていないと使えないため、
 * 未ログインの画面（ログイン・コード入力）にはログアウトを出さない。
 */
export async function PageShell({ children }: { children: ReactNode }) {
  const [loggedIn, branding] = await Promise.all([hasSession(), getBranding()])

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 bg-white/90 shadow-sm shadow-wine-900/5 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-lg items-center justify-between gap-3 px-4">
          <AppLink href="/" className="flex min-w-0 items-center gap-2 py-2 text-base font-bold text-wine-800">
            {branding.hasIcon && (
              // eslint-disable-next-line @next/next/no-img-element -- 小さなロゴで、最適化は不要
              <img
                src={`/branding/icon?v=${encodeURIComponent(branding.iconVersion ?? '')}`}
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 shrink-0 rounded-md object-contain"
              />
            )}
            <span className="wine-gradient-text truncate">{branding.name}</span>
          </AppLink>
          {loggedIn && <LogoutButton />}
        </div>
        {/* 下端に、ブランドカラー（ローズゴールド → ワインレッド）のグラデーションの細い線 */}
        <div aria-hidden="true" className="wine-gradient h-[3px]" />
      </header>
      <main className="mx-auto w-full max-w-lg px-4 pb-16 pt-6">{children}</main>
    </div>
  )
}
