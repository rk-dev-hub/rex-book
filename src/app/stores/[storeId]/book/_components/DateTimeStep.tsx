import { AppLink, Card, SectionTitle } from '@/components/ui'
import { type BookingSelection, STAFF_ANY, bookingHref, changeTargetHref } from '@/lib/booking'
import { addMonths, bookableRangeInMonth, monthOf, navigableMonths } from '@/lib/calendar'
import { addDaysIso, dateRange, formatJstTime, formatShortDate, todayJst } from '@/lib/datetime'
import { getAvailability, getAvailabilityDays, getStoreStaff } from '@/lib/rexcarte'
import type { StoreDetail } from '@/lib/types'
import type { BookingTarget } from '../_lib/target'
import { Calendar } from './Calendar'

/** 日付タブに並べる日数（docs/05-screens.md §2.3: 2 週間分）。それより先はカレンダーで選ぶ。 */
const DATE_TAB_DAYS = 14

/**
 * ステップ 2: 日時（と担当）を選ぶ。
 * 空き枠かどうかは RexCarte の API の結果だけで決める（ここでは営業時間やシフトを判定しない）。
 * 予約できる時刻がない場合も、理由（休日か埋まりか）は出さず「予約できる時刻がありません」とだけ示す。
 * チケットなら所要時間が決まっているので、選ぶものはなく、ここから始められる。
 */
export async function DateTimeStep({
  token,
  store,
  selection,
  target,
}: {
  token: string
  store: StoreDetail
  selection: BookingSelection
  target: BookingTarget
}) {
  const staffChoice = selection.staff ?? STAFF_ANY
  const availabilityTarget = {
    ticketPlanId: target.ticketPlanId,
    staffId: staffChoice === STAFF_ANY ? undefined : staffChoice,
  }

  const today = todayJst()
  const maxAdvanceDays = store.booking_settings.max_advance_days
  const lastBookableDate = addDaysIso(today, maxAdvanceDays)

  // 予約できる先の期間（店舗設定）を超えないようにする
  const tabDates = dateRange(today, Math.min(DATE_TAB_DAYS, maxAdvanceDays + 1))
  const [staff, tabDays] = await Promise.all([
    getStoreStaff(token, store.id),
    getAvailabilityDays(token, store.id, { from: tabDates[0], to: tabDates[tabDates.length - 1] }, availabilityTarget),
  ])
  const tabAvailable = new Set(tabDays.days.filter((day) => day.available).map((day) => day.date))

  // 日付が未選択なら、最初に予約できる日を表示する
  const selectedDate = selection.date ?? tabDates.find((date) => tabAvailable.has(date))
  const slots = selectedDate
    ? (await getAvailability(token, store.id, selectedDate, availabilityTarget)).slots
    : []

  // --- カレンダー（先の日付） ---
  const months = navigableMonths(today, maxAdvanceDays)
  const calendarMonth = selection.cal && selection.cal >= months.first && selection.cal <= months.last ? selection.cal : undefined
  let calendarAvailable = new Set<string>()
  if (calendarMonth) {
    const range = bookableRangeInMonth(calendarMonth, today, maxAdvanceDays)
    if (range) {
      const monthDays = await getAvailabilityDays(token, store.id, range, availabilityTarget)
      calendarAvailable = new Set(monthDays.days.filter((day) => day.available).map((day) => day.date))
    }
  }

  const withoutCalendar = { ...selection, cal: undefined }
  const openCalendarHref = bookingHref(store.id, { ...selection, cal: monthOf(selectedDate ?? today) })
  const selectedIsBeyondTabs = Boolean(selectedDate && !tabDates.includes(selectedDate))

  return (
    <div>
      {/* 使うチケット。所要時間が決まっているので、日時からそのまま選べる */}
      <Card className="mb-1">
        <p className="text-xs font-semibold text-stone-500">ご利用のチケット</p>
        <p className="break-words font-bold text-stone-900">{target.label}</p>
        <AppLink
          href={changeTargetHref(store.id, selection)}
          className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-stone-300 px-3 text-sm font-semibold text-stone-800 hover:bg-stone-50"
        >
          チケット変更
        </AppLink>
      </Card>

      <SectionTitle>担当</SectionTitle>
      <ul className="flex flex-wrap gap-2" aria-label="担当">
        {[{ id: STAFF_ANY, name: '指名なし' }, ...staff].map((member) => {
          const selected = member.id === staffChoice
          return (
            <li key={member.id}>
              <AppLink
                href={bookingHref(store.id, { ...withoutCalendar, staff: member.id, time: undefined })}
                scroll={false}
                aria-current={selected ? 'true' : undefined}
                className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold ${
                  selected
                    ? 'border-wine-700 wine-gradient text-white'
                    : 'border-stone-300 bg-white text-stone-800 hover:border-wine-700'
                }`}
              >
                {selected && <span aria-hidden="true">✓&nbsp;</span>}
                {member.name}
              </AppLink>
            </li>
          )
        })}
      </ul>

      <SectionTitle>日付を選ぶ</SectionTitle>
      <nav aria-label="日付">
        {/* relative: 中の sr-only（絶対配置）がこの横スクロール領域の外へはみ出してページ幅を広げないようにする */}
        <ul className="relative -mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
          {tabDates.map((date) => {
            const selected = date === selectedDate
            const available = tabAvailable.has(date)
            const label = formatShortDate(date)
            const base = 'flex min-h-11 min-w-[4.5rem] items-center justify-center rounded-xl border px-3 text-sm font-semibold'

            return (
              <li key={date} className="shrink-0">
                {available ? (
                  <AppLink
                    href={bookingHref(store.id, { ...withoutCalendar, date, time: undefined })}
                    scroll={false}
                    aria-current={selected ? 'date' : undefined}
                    className={`${base} ${
                      selected
                        ? 'border-wine-700 wine-gradient text-white'
                        : 'border-stone-300 bg-white text-stone-800 hover:border-wine-700'
                    }`}
                  >
                    {selected && <span aria-hidden="true">✓ </span>}
                    {label}
                  </AppLink>
                ) : (
                  // 予約できる時刻がない日は選べない（理由は出さない）
                  <span
                    aria-disabled="true"
                    className={`${base} cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400`}
                  >
                    {label}
                    <span className="sr-only">（予約できる時刻がありません）</span>
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </nav>

      {calendarMonth ? (
        <Calendar
          month={calendarMonth}
          isBookableDate={(date) => date >= today && date <= lastBookableDate}
          availableDates={calendarAvailable}
          selectedDate={selectedDate}
          hrefForDate={(date) => bookingHref(store.id, { ...withoutCalendar, date, time: undefined })}
          prevHref={
            calendarMonth > months.first
              ? bookingHref(store.id, { ...selection, cal: addMonths(calendarMonth, -1) })
              : undefined
          }
          nextHref={
            calendarMonth < months.last
              ? bookingHref(store.id, { ...selection, cal: addMonths(calendarMonth, 1) })
              : undefined
          }
          closeHref={bookingHref(store.id, withoutCalendar)}
        />
      ) : (
        <div className="mt-1">
          <AppLink
            href={openCalendarHref}
            scroll={false}
            className="inline-flex min-h-11 items-center rounded-xl border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-800 hover:border-wine-700"
          >
            カレンダーで先の日付を選ぶ
          </AppLink>
        </div>
      )}

      <SectionTitle>
        時刻を選ぶ
        {selectedDate && <span className="ml-2 text-sm font-semibold text-stone-600">{formatShortDate(selectedDate)}</span>}
      </SectionTitle>
      {selectedIsBeyondTabs && (
        <p className="mb-2 text-xs text-stone-500">カレンダーで選んだ日の時刻を表示しています。</p>
      )}
      {slots.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 bg-white px-4 py-6 text-center text-sm text-stone-600">
          予約できる時刻がありません
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-2">
          {slots.map((slot) => {
            const time = formatJstTime(slot)
            return (
              <li key={slot}>
                <AppLink
                  href={bookingHref(store.id, { ...withoutCalendar, date: selectedDate, time })}
                  className="flex min-h-11 items-center justify-center rounded-xl border border-stone-300 bg-white text-base font-semibold text-stone-900 hover:border-wine-700 hover:bg-wine-50"
                >
                  {time}
                </AppLink>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
