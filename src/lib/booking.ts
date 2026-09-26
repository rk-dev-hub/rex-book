import { isValidIsoDate } from './datetime'
import { isValidMonth } from './calendar'

/**
 * 予約ステップの状態は URL のクエリに持たせ、戻る操作・リロードで失われないようにする（docs/05-screens.md）。
 *   ?plan=<チケットプランの id> & staff=any|<id> & date=YYYY-MM-DD & time=HH:MM   … 予約の選択内容
 *   & pick=1   … チケットを選び直している（選択済みの内容は残したまま、選ぶ画面を出す）
 *   & cal=YYYY-MM   … 日時の画面で、その月のカレンダーを開いている
 *
 * 予約は必ずチケット（単発 = 1 回のチケット、回数券 = 複数回のチケット）を 1 回分使って行う。
 * ステップは 3 つ: チケット → 日時（担当はこの画面の中で選ぶ）→ 確認。
 * 前のステップが決まっていない値は無視する（手で URL を書き換えても、途中を飛ばした状態にならない）。
 */

/** 担当の「指名なし」を表す値（担当者は予約確定時に RexCarte が決める）。省略したときも指名なしとして扱う。 */
export const STAFF_ANY = 'any'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

export interface BookingSelection {
  /** 使うチケットのプラン */
  planId?: string
  /** STAFF_ANY または担当スタッフの ID。省略は指名なし */
  staff?: string
  /** JST の日付 YYYY-MM-DD */
  date?: string
  /** JST の時刻 HH:MM */
  time?: string
  /** チケットを選び直している */
  pick?: boolean
  /** 開いているカレンダーの月 YYYY-MM */
  cal?: string
}

export type BookingStep = 'target' | 'datetime' | 'confirm'

export const BOOKING_STEPS: { key: BookingStep; label: string }[] = [
  { key: 'target', label: 'チケット' },
  { key: 'datetime', label: '日時' },
  { key: 'confirm', label: '確認' },
]

type RawParams = Record<string, string | string[] | undefined>

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export function parseBookingParams(raw: RawParams): BookingSelection {
  const selection: BookingSelection = {}
  if (first(raw.pick) === '1') selection.pick = true

  const plan = first(raw.plan)
  if (plan && UUID_PATTERN.test(plan)) selection.planId = plan
  if (!selection.planId) return selection

  const staff = first(raw.staff)
  if (staff === STAFF_ANY || (staff && UUID_PATTERN.test(staff))) selection.staff = staff

  const cal = first(raw.cal)
  if (cal && isValidMonth(cal)) selection.cal = cal

  const date = first(raw.date)
  if (date && isValidIsoDate(date)) selection.date = date
  if (!selection.date) return selection

  const time = first(raw.time)
  if (time && TIME_PATTERN.test(time)) selection.time = time
  return selection
}

export function hasTarget(selection: BookingSelection): boolean {
  return Boolean(selection.planId)
}

export function currentStep(selection: BookingSelection): BookingStep {
  if (selection.pick || !hasTarget(selection)) return 'target'
  if (!selection.date || !selection.time) return 'datetime'
  return 'confirm'
}

export function bookingHref(storeId: string, selection: BookingSelection): string {
  const query = new URLSearchParams()
  if (selection.planId) query.set('plan', selection.planId)
  if (selection.staff) query.set('staff', selection.staff)
  if (selection.date) query.set('date', selection.date)
  if (selection.time) query.set('time', selection.time)
  if (selection.cal) query.set('cal', selection.cal)
  if (selection.pick) query.set('pick', '1')
  const suffix = query.toString()
  return `/stores/${storeId}/book${suffix ? `?${suffix}` : ''}`
}

/** 「戻る」の遷移先。確認 → 日時 → チケットの選択 → 予約トップ。 */
export function backHref(storeId: string, selection: BookingSelection): string {
  switch (currentStep(selection)) {
    case 'confirm':
      return bookingHref(storeId, { ...selection, time: undefined })
    case 'datetime':
      return changeTargetHref(storeId, selection)
    default:
      // チケットを選び直している途中なら、日時へ戻る。最初の選択なら予約トップへ
      return hasTarget(selection) ? bookingHref(storeId, { ...selection, pick: false }) : '/'
  }
}

/** チケットを選び直すときの遷移先（日付・担当は引き継ぐ。時刻は所要時間が変わりうるので外す）。 */
export function changeTargetHref(storeId: string, selection: BookingSelection): string {
  return bookingHref(storeId, { ...selection, time: undefined, cal: undefined, pick: true })
}

/** チケットを選んだあとの遷移先（選び直しの場合は日付・担当を引き継ぐ）。 */
export function chooseTargetHref(storeId: string, planId: string, current: BookingSelection): string {
  return bookingHref(storeId, { planId, staff: current.staff, date: current.date })
}

/** JST の日付と時刻から、RexCarte に送る開始日時（+09:00 付きの ISO 8601）を作る。 */
export function slotStartIso(date: string, time: string): string {
  return `${date}T${time}:00+09:00`
}
