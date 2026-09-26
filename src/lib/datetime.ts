// 時刻は API から UTC の ISO 8601 で受け取り、表示は常に JST（端末のタイムゾーンに依存させない）
const TIME_ZONE = "Asia/Tokyo";

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  weekday: "short",
});

const timeFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const isoDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** 例: 2026/9/15(火) */
export function formatJstDate(value: string | Date): string {
  return dateFormatter.format(new Date(value));
}

/** 例: 09:30 */
export function formatJstTime(value: string | Date): string {
  return timeFormatter.format(new Date(value));
}

/** 例: 2026/9/15(火) 09:30 */
export function formatJstDateTime(value: string | Date): string {
  return `${formatJstDate(value)} ${formatJstTime(value)}`;
}

/** JST の日付を YYYY-MM-DD で返す（空き枠 API の date クエリ用） */
export function toJstIsoDate(value: string | Date): string {
  return isoDateFormatter.format(new Date(value));
}

/** 今日の日付（JST、YYYY-MM-DD）。 */
export function todayJst(now: Date = new Date()): string {
  return toJstIsoDate(now)
}

/** YYYY-MM-DD に日数を足す（JST に夏時間はないため、暦の計算だけで済む）。 */
export function addDaysIso(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

/** 開始日から count 日分の日付を並べる。 */
export function dateRange(from: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => addDaysIso(from, index))
}

/** 実在する日付か（2026-02-30 のような値を弾く）。 */
export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

const longDateFormatter = new Intl.DateTimeFormat('ja-JP', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'short',
})

/** 例: 2026年10月1日(木) 10:00〜11:00（予約の日時表記。docs/05-screens.md §3） */
export function formatJstSlot(start: string | Date, end: string | Date): string {
  return `${longDateFormatter.format(new Date(start))} ${formatJstTime(start)}〜${formatJstTime(end)}`
}

/** 例: 2026年10月1日(木) 10:00（キャンセル期限などの時点の表記） */
export function formatJstMoment(value: string | Date): string {
  return `${longDateFormatter.format(new Date(value))} ${formatJstTime(value)}`
}

const WEEKDAY_SHORT = ['日', '月', '火', '水', '木', '金', '土']

/** 日付タブの表記。例: 10/1(木) */
export function formatShortDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const weekday = WEEKDAY_SHORT[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]
  return `${month}/${day}(${weekday})`
}

/** 指定の時刻をすでに過ぎているか。 */
export function hasPassed(value: string | Date, now: Date = new Date()): boolean {
  return new Date(value).getTime() <= now.getTime()
}

/** キャンセルできる最終時刻（予約開始の cancelDeadlineHours 時間前）。 */
export function cancelDeadline(start: string | Date, cancelDeadlineHours: number): Date {
  return new Date(new Date(start).getTime() - cancelDeadlineHours * 60 * 60 * 1000)
}

/** 曜日なしの日付。例: 2026/12/20（マイチケットの有効期限など、括弧の中で使う表記）。 */
export function formatYmd(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number)
  return `${year}/${month}/${day}`
}
