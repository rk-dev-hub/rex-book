import type { ReactNode } from 'react'
import { AppLink } from '@/components/ui'
import { CALENDAR_WEEKDAY_LABELS, calendarWeeks, formatMonthLabel } from '@/lib/calendar'
import { formatShortDate } from '@/lib/datetime'

interface ReservationCalendarProps {
  /** 表示する月 YYYY-MM */
  month: string
  today: string
  /** 予約がある日（YYYY-MM-DD）→ 件数 */
  counts: Map<string, number>
  /** 予約が今後のものか（今後の予約は色を強く、過去の予約は薄く示す） */
  upcomingDates: Set<string>
  selectedDate?: string
  hrefForDate: (isoDate: string) => string
  prevHref?: string
  nextHref?: string
  /** 選んだ日の予約など。カレンダーのすぐ下（同じ枠の中）に出し、日付を押した結果がすぐ見えるようにする */
  children?: ReactNode
}

/**
 * ご自身の予約を示す月カレンダー（日曜始まり）。予約のある日だけがリンクで、押すとその日の予約が下に出る。
 * 今日・選択中・予約あり（今後／過去）は、色だけでなく記号・文字（読み上げ用を含む）でも示す。
 */
export function ReservationCalendar({
  month,
  today,
  counts,
  upcomingDates,
  selectedDate,
  hrefForDate,
  prevHref,
  nextHref,
  children,
}: ReservationCalendarProps) {
  const navClass = 'flex min-h-11 min-w-11 items-center justify-center rounded-xl border px-3 text-sm font-semibold'
  const cell = 'relative flex h-11 w-full flex-col items-center justify-center rounded-lg text-sm font-semibold leading-none'

  return (
    <section aria-label="予約カレンダー" className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        {prevHref ? (
          <AppLink href={prevHref} scroll={false} aria-label="前の月" className={`${navClass} border-stone-300 text-stone-800`}>
            ‹
          </AppLink>
        ) : (
          <span aria-hidden="true" className={`${navClass} border-transparent text-stone-300`}>
            ‹
          </span>
        )}
        <p className="text-base font-bold text-stone-900" aria-live="polite">
          {formatMonthLabel(month)}
        </p>
        {nextHref ? (
          <AppLink href={nextHref} scroll={false} aria-label="次の月" className={`${navClass} border-stone-300 text-stone-800`}>
            ›
          </AppLink>
        ) : (
          <span aria-hidden="true" className={`${navClass} border-transparent text-stone-300`}>
            ›
          </span>
        )}
      </div>

      <table className="w-full table-fixed border-separate border-spacing-1 text-center">
        <thead>
          <tr>
            {CALENDAR_WEEKDAY_LABELS.map((label) => (
              <th key={label} scope="col" className="pb-1 text-xs font-semibold text-stone-500">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {calendarWeeks(month).map((week, index) => (
            <tr key={index}>
              {week.map((date, column) => {
                if (date === null) return <td key={`blank-${column}`} />
                const day = Number(date.slice(8))
                const count = counts.get(date) ?? 0
                const isToday = date === today
                const selected = date === selectedDate
                const upcoming = upcomingDates.has(date)
                const ring = isToday ? 'ring-2 ring-wine-700' : ''

                if (count === 0) {
                  return (
                    <td key={date} className="p-0">
                      <span className={`${cell} ${ring} text-stone-500`}>
                        {day}
                        {isToday && <span className="sr-only">（今日）</span>}
                      </span>
                    </td>
                  )
                }
                const tone = selected
                  ? 'wine-gradient text-white shadow-sm shadow-wine-900/30'
                  : upcoming
                    ? 'border border-wine-700 bg-wine-50 text-wine-900 hover:bg-wine-100'
                    : 'border border-stone-300 bg-stone-100 text-stone-700 hover:bg-stone-200'
                return (
                  <td key={date} className="p-0">
                    <AppLink
                      href={hrefForDate(date)}
                      scroll={false}
                      aria-label={`${formatShortDate(date)}${isToday ? '（今日）' : ''} ご予約 ${count}件`}
                      aria-current={selected ? 'date' : undefined}
                      className={`${cell} ${ring} ${tone}`}
                    >
                      {day}
                      {/* 件数を色以外でも示す（● = 1 件、●● = 2 件、3 件以上は数字） */}
                      <span aria-hidden="true" className="mt-0.5 text-[10px] tracking-tighter">
                        {count <= 2 ? '●'.repeat(count) : `●${count}`}
                      </span>
                    </AppLink>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {children}

      <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-600">
        <span>
          <span aria-hidden="true" className="text-wine-700">
            ●
          </span>{' '}
          今後の予約
        </span>
        <span>
          <span aria-hidden="true" className="text-stone-400">
            ●
          </span>{' '}
          過去の予約
        </span>
        <span className="text-stone-500">日付を押すと内容が表示されます</span>
      </p>
    </section>
  )
}
