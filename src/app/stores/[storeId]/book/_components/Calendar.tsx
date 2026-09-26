import { AppLink } from '@/components/ui'
import { CALENDAR_WEEKDAY_LABELS, calendarWeeks, formatMonthLabel } from '@/lib/calendar'
import { formatShortDate } from '@/lib/datetime'

interface CalendarProps {
  /** 表示する月 YYYY-MM */
  month: string
  /** 予約できる期間の日付（今日〜予約できる最後の日）かどうか */
  isBookableDate: (isoDate: string) => boolean
  /** RexCarte が「予約できる時刻がある」と返した日 */
  availableDates: Set<string>
  selectedDate?: string
  hrefForDate: (isoDate: string) => string
  /** 前の月・次の月へ移動するリンク。移動できない（期間の外）ときは undefined */
  prevHref?: string
  nextHref?: string
  closeHref: string
}

/**
 * 月カレンダー（先の日付を選ぶため）。日曜始まり。
 * 予約できる日だけがリンクになり、そうでない日は理由を出さず選べない表示にする。
 * 選択状態・選べない状態は色だけでなく、記号・文字（読み上げ用を含む）でも示す。
 */
export function Calendar({
  month,
  isBookableDate,
  availableDates,
  selectedDate,
  hrefForDate,
  prevHref,
  nextHref,
  closeHref,
}: CalendarProps) {
  const navClass = 'flex min-h-11 min-w-11 items-center justify-center rounded-xl border px-3 text-sm font-semibold'

  return (
    <section aria-label="カレンダー" className="mt-3 rounded-2xl border border-stone-200 bg-white p-3">
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
                const selected = date === selectedDate
                const available = isBookableDate(date) && availableDates.has(date)
                const cell = 'relative flex h-11 w-full items-center justify-center rounded-lg text-sm font-semibold'

                return (
                  <td key={date} className="p-0">
                    {available ? (
                      <AppLink
                        href={hrefForDate(date)}
                        scroll={false}
                        aria-label={`${formatShortDate(date)} 予約できる時刻があります`}
                        aria-current={selected ? 'date' : undefined}
                        className={`${cell} ${
                          selected
                            ? 'wine-gradient text-white shadow-sm shadow-wine-900/30'
                            : 'border border-wine-700/40 bg-wine-50 text-wine-900 hover:bg-wine-100'
                        }`}
                      >
                        {selected && <span aria-hidden="true">✓</span>}
                        {day}
                      </AppLink>
                    ) : (
                      // 予約できる時刻がない日・予約できる期間の外の日は選べない（理由は出さない）
                      <span aria-disabled="true" className={`${cell} text-stone-300`}>
                        {day}
                        <span className="sr-only">（予約できる時刻がありません）</span>
                      </span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-2 text-xs text-stone-500">色のついた日が、予約できる時刻のある日です。</p>
      <div className="mt-2 flex justify-end">
        <AppLink href={closeHref} scroll={false} className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-wine-800 underline">
          カレンダーを閉じる
        </AppLink>
      </div>
    </section>
  )
}
