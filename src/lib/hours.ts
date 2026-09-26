import type { BusinessHours, DayHours, Weekday } from './types'

export const WEEKDAYS: readonly Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: '月',
  tue: '火',
  wed: '水',
  thu: '木',
  fri: '金',
  sat: '土',
  sun: '日',
}

/** "09:00" → "9:00"（先頭の 0 を落として読みやすくする） */
export function formatHour(hhmm: string): string {
  return hhmm.replace(/^0/, '')
}

export function formatDayHours(hours: DayHours | null | undefined): string {
  if (hours === undefined) return '-'
  if (hours === null) return '定休日'
  return `${formatHour(hours.open)}〜${formatHour(hours.close)}`
}

export interface HoursRow {
  weekday: Weekday
  label: string
  text: string
}

/** 店舗ページの営業時間表。曜日順に、営業時間または「定休日」を並べる。 */
export function businessHoursRows(hours: BusinessHours | null): HoursRow[] {
  return WEEKDAYS.map((weekday) => ({
    weekday,
    label: WEEKDAY_LABELS[weekday],
    text: formatDayHours(hours?.[weekday]),
  }))
}

/** JST の日付（YYYY-MM-DD）の曜日。 */
export function weekdayOf(isoDate: string): Weekday {
  const [year, month, day] = isoDate.split('-').map(Number)
  const sundayFirst = new Date(Date.UTC(year, month - 1, day)).getUTCDay() // 0 = 日曜
  return WEEKDAYS[(sundayFirst + 6) % 7]
}

/** その日の営業時間。営業時間が未設定の店舗は undefined、定休日は null。 */
export function hoursOn(hours: BusinessHours | null, isoDate: string): DayHours | null | undefined {
  if (!hours) return undefined
  return hours[weekdayOf(isoDate)]
}
