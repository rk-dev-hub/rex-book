import { addDaysIso, isValidIsoDate } from './datetime'

/**
 * 日時の画面の月カレンダー（先の日付を選ぶため）。日曜始まり。
 * どの日が予約できるかは RexCarte の空き枠 API の結果だけで決める（ここでは判定しない）。
 * 月は "YYYY-MM"、日付は "YYYY-MM-DD"（いずれも JST）。
 */

export const CALENDAR_WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const

export function isValidMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

/** 日付が属する月。 */
export function monthOf(isoDate: string): string {
  return isoDate.slice(0, 7)
}

export function firstDayOf(month: string): string {
  return `${month}-01`
}

export function lastDayOf(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number)
  // 翌月 0 日 = 当月末日
  return new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10)
}

/** 月に n か月を足す（負なら戻す）。 */
export function addMonths(month: string, count: number): string {
  const [year, monthNumber] = month.split('-').map(Number)
  const date = new Date(Date.UTC(year, monthNumber - 1 + count, 1))
  return date.toISOString().slice(0, 7)
}

/** 例: 2026年10月 */
export function formatMonthLabel(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number)
  return `${year}年${monthNumber}月`
}

/**
 * その月の週ごとの日付（日曜始まり）。月の前後の余白は null。
 * 例: 2026-10 → 1 週目は [null, null, null, null, '2026-10-01', '2026-10-02', '2026-10-03']
 */
export function calendarWeeks(month: string): (string | null)[][] {
  const first = firstDayOf(month)
  const [year, monthNumber, day] = first.split('-').map(Number)
  const leading = new Date(Date.UTC(year, monthNumber - 1, day)).getUTCDay() // 1 日の曜日（0 = 日曜）
  const lastDay = Number(lastDayOf(month).slice(8))

  const cells: (string | null)[] = [
    ...Array<null>(leading).fill(null),
    ...Array.from({ length: lastDay }, (_, index) => addDaysIso(first, index)),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks: (string | null)[][] = []
  for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7))
  return weeks
}

/**
 * 予約できる期間（今日〜今日 + max_advance_days 日）のうち、その月に含まれる範囲。
 * 空き枠 API はこの範囲だけを問い合わせる（範囲外は問い合わせても常に空のため）。含まれなければ null。
 */
export function bookableRangeInMonth(
  month: string,
  today: string,
  maxAdvanceDays: number,
): { from: string; to: string } | null {
  const lastBookable = addDaysIso(today, maxAdvanceDays)
  const from = firstDayOf(month) > today ? firstDayOf(month) : today
  const to = lastDayOf(month) < lastBookable ? lastDayOf(month) : lastBookable
  if (!isValidIsoDate(from) || from > to) return null
  return { from, to }
}

/** カレンダーで移動できる月の範囲（今日の属する月〜予約できる最後の日の属する月）。 */
export function navigableMonths(today: string, maxAdvanceDays: number): { first: string; last: string } {
  return { first: monthOf(today), last: monthOf(addDaysIso(today, maxAdvanceDays)) }
}

/**
 * 予約カレンダーで移動できる月の範囲。今日の月から 2 か月先までに加えて、
 * 予約がある月（過去・先）も含める（見返せなくならないように）。
 */
export function reservationMonthBounds(today: string, reservationDates: string[]): { min: string; max: string } {
  const todayMonth = monthOf(today)
  let min = todayMonth
  let max = addMonths(todayMonth, 2)
  for (const date of reservationDates) {
    const month = monthOf(date)
    if (month < min) min = month
    if (month > max) max = month
  }
  return { min, max }
}
