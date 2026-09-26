import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

/**
 * 共通の見た目。サーバー・クライアントのどちらのコンポーネントからも使えるよう、フックは使わない。
 * タップ領域は 44px 以上（min-h-11）を確保し、選択状態は色だけで表さない（docs/05-screens.md §3）。
 */

type Variant = 'primary' | 'secondary' | 'danger'

const VARIANTS: Record<Variant, string> = {
  primary:
    'wine-gradient text-white shadow-md shadow-wine-900/25 hover:brightness-110 active:brightness-95 disabled:bg-none disabled:bg-wine-300 disabled:shadow-none',
  secondary: 'border border-wine-200 bg-white text-wine-800 hover:border-wine-400 hover:bg-wine-50 disabled:text-stone-400',
  danger: 'bg-rose-700 text-white hover:bg-rose-800 disabled:bg-rose-300',
}

export function buttonClass(variant: Variant = 'primary', block = false): string {
  return [
    'inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold transition-colors',
    'disabled:cursor-not-allowed',
    VARIANTS[variant],
    block ? 'w-full' : '',
  ].join(' ')
}

/**
 * ページ内のリンク。予約の画面は空き枠など毎回 RexCarte に問い合わせるため、
 * 画面に入っただけで先読みされないよう prefetch を切っている（公開 API には回数制限がある）。
 */
export function AppLink({ prefetch = false, ...props }: ComponentProps<typeof Link>) {
  return <Link prefetch={prefetch} {...props} />
}

export function LinkButton({
  variant = 'primary',
  block = false,
  className = '',
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; block?: boolean }) {
  return <AppLink className={`${buttonClass(variant, block)} ${className}`} {...props} />
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-stone-200 bg-white p-4 shadow-md shadow-wine-900/5 ${className}`}>{children}</div>
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-5">
      <h1 className="text-xl font-bold text-wine-900">{children}</h1>
      {sub && <p className="mt-1 text-sm text-stone-600">{sub}</p>}
    </div>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-2 mt-7 flex items-center gap-2 text-base font-bold text-stone-900">
      <span aria-hidden="true" className="wine-gradient h-4 w-1 shrink-0 rounded-full" />
      {children}
    </h2>
  )
}

const NOTICE_TONES = {
  info: 'border-wine-200 bg-gradient-to-br from-wine-50 to-white text-wine-900',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-rose-200 bg-rose-50 text-rose-900',
} as const

export function Notice({
  tone = 'info',
  children,
  title,
}: {
  tone?: keyof typeof NOTICE_TONES
  children: ReactNode
  title?: string
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-xl border px-4 py-3 text-sm ${NOTICE_TONES[tone]}`}
    >
      {title && <p className="mb-1 font-bold">{title}</p>}
      {children}
    </div>
  )
}

/** ラベルと入力欄をまとめる。エラーは入力欄の直下に文字で示す（色だけにしない）。 */
export function FormField({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string
  hint?: string
  error?: string
  htmlFor: string
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-semibold text-stone-800">
        {label}
      </label>
      {hint && <p className="mb-1 text-xs text-stone-500">{hint}</p>}
      {children}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1 text-sm font-medium text-rose-700">
          {error}
        </p>
      )}
    </div>
  )
}

export const inputClass =
  'block min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-base text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-wine-700 focus:outline-none focus:ring-1 focus:ring-wine-700 aria-[invalid=true]:border-rose-600'
