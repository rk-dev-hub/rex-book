import type { ReactNode } from 'react'

/**
 * 折りたたみ（<details>）。過去のご予約のように、件数が増えても画面を埋めないようにするために使う。
 * JavaScript を使わないので、サーバーコンポーネントの中でそのまま使え、開閉の状態はブラウザが持つ。
 * 見出しは <summary> の中に置き、押せる範囲は 44px 以上にする。開閉は矢印の向きでも示す（色だけにしない）。
 */
export function Collapsible({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string
  count?: number
  defaultOpen?: boolean
  children: ReactNode
}) {
  return (
    <details open={defaultOpen} className="group mt-7 rounded-2xl border border-stone-200 bg-white px-4 shadow-sm">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-2 [&::-webkit-details-marker]:hidden">
        <h2 className="text-base font-bold text-stone-900">
          {title}
          {count !== undefined && <span className="ml-2 text-sm font-semibold text-stone-500">{count}件</span>}
        </h2>
        <span aria-hidden="true" className="text-xs text-stone-500 transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="pb-4">{children}</div>
    </details>
  )
}
