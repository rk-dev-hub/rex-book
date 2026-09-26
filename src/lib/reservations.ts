import { toJstIsoDate } from './datetime'
import type { CustomerReservation, ReservationStatus } from './types'

export const STATUS_LABELS: Record<ReservationStatus, string> = {
  confirmed: '予約確定',
  completed: 'ご来店済み',
  cancelled: 'キャンセル',
  no_show: '無断キャンセル',
}

/** 過去の予約を一度に出す件数（「さらに表示」で増やす） */
export const PAST_PAGE_SIZE = 10

export interface SplitReservations {
  upcoming: CustomerReservation[]
  past: CustomerReservation[]
}

/**
 * 今後の予約（日時の近い順）と過去の予約（新しい順。件数の絞り込みは表示側で行う）へ分ける。
 * 今後 = まだ確定のままで、開始が現在以降のもの。キャンセル済みなどは日時が未来でも過去側に置く。
 */
export function splitReservations(reservations: CustomerReservation[], now: Date): SplitReservations {
  const isUpcoming = (reservation: CustomerReservation) =>
    reservation.status === 'confirmed' && new Date(reservation.start_at).getTime() >= now.getTime()

  const upcoming = reservations
    .filter(isUpcoming)
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
  const past = reservations
    .filter((reservation) => !isUpcoming(reservation))
    .sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime())
  return { upcoming, past }
}

/** まだ開始していない予約か（キャンセルの案内を出すかどうかの判断に使う）。 */
export function isFutureReservation(reservation: CustomerReservation, now: Date = new Date()): boolean {
  return new Date(reservation.start_at).getTime() >= now.getTime()
}

/** 予約の内容。予約はすべてチケットを使うので、チケットの名前（例: パーソナルトレーニング1回、ダイエット1ヶ月コース）。 */
export function reservationLabel(reservation: CustomerReservation): string {
  return reservation.ticket_plan_name ?? '-'
}

/** 予約番号（予約 ID の先頭 8 桁）。電話で店舗に伝えるための短い識別子。 */
export function reservationNumber(id: string): string {
  return id.slice(0, 8).toUpperCase()
}

/** ホームのカレンダーに出す予約（確定・来店済み。キャンセルや無断キャンセルは出さない）。 */
export function calendarReservations(reservations: CustomerReservation[]): CustomerReservation[] {
  return reservations.filter((reservation) => reservation.status === 'confirmed' || reservation.status === 'completed')
}

/** 予約を JST の日付（YYYY-MM-DD）ごとにまとめる。同じ日の中は開始の早い順。 */
export function groupByJstDate(reservations: CustomerReservation[]): Map<string, CustomerReservation[]> {
  const groups = new Map<string, CustomerReservation[]>()
  const sorted = [...reservations].sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
  for (const reservation of sorted) {
    const date = toJstIsoDate(reservation.start_at)
    groups.set(date, [...(groups.get(date) ?? []), reservation])
  }
  return groups
}

/**
 * 過去の予約を何件出すか（`?past=`）。10 件ずつ増やす。指定がなければ 10 件、
 * 不正な値・小さすぎる値は 10 件にし、全件数を超える指定は全件にそろえる。
 */
export function pastVisibleCount(raw: string | string[] | undefined, total: number): number {
  const value = Number(Array.isArray(raw) ? raw[0] : raw)
  const requested = Number.isInteger(value) && value > PAST_PAGE_SIZE ? value : PAST_PAGE_SIZE
  return Math.min(requested, Math.max(total, 0))
}
