import 'server-only'

import { redirect } from 'next/navigation'
import { type BookingSelection, bookingHref } from '@/lib/booking'
import type { CustomerTicket, StoreDetail } from '@/lib/types'

/** 予約で使うチケット。画面に見せる名前・所要時間・回数をまとめる。 */
export interface BookingTarget {
  label: string
  durationMinutes: number
  ticketPlanId: string
  /** 予約に使える回数（この予約の前） */
  bookableCount: number
  totalCount: number
}

/**
 * 選択されたチケットを解決する。
 * 手で URL を書き換えたり、使い切った・期限切れのチケットを指していたりする場合は、チケットの選択画面へ戻す。
 */
export function resolveTarget(
  store: StoreDetail,
  selection: BookingSelection,
  tickets: CustomerTicket[],
): BookingTarget {
  const ticket = tickets.find((item) => item.ticket_plan_id === selection.planId)
  if (!ticket) redirect(bookingHref(store.id, { pick: true }))
  return {
    label: ticket.plan_name,
    durationMinutes: ticket.duration_minutes,
    ticketPlanId: ticket.ticket_plan_id,
    bookableCount: ticket.bookable_count,
    totalCount: ticket.total_count,
  }
}
