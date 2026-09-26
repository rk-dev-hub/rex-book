import type { CustomerTicket } from './types'

/**
 * チケットの表記。予約はチケットを 1 回分使って行う（単発 = 1 回のチケット、回数券 = 複数回のチケット。
 * 画面では区別せず、回数だけで示す）。店舗で購入すると、スタッフがチケットとして付与する。
 */

/** 「3/8（有効期限 2026/12/20）」。3 = 予約に使える回数、8 = 購入時の回数。有効期限がなければ「3/8」。 */
export function formatTicketCount(
  ticket: Pick<CustomerTicket, 'total_count' | 'bookable_count' | 'expires_at'>,
  formatDate: (value: string) => string,
): string {
  const count = `${ticket.bookable_count}/${ticket.total_count}`
  return ticket.expires_at ? `${count}（有効期限 ${formatDate(ticket.expires_at)}）` : count
}

/**
 * 同じプランのチケットを 1 つにまとめる（単発を 2 回買った、など）。予約はプランを選び、
 * どのチケットを使うかは RexCarte が有効期限の近いものから決めるため、選ぶ画面ではプランごとに 1 行にする。
 * 回数は合計し、有効期限は最も近いものを示す。並びは最初に出てくるプランの順（有効期限が近い順）のまま。
 */
export function groupTicketsByPlan(tickets: CustomerTicket[]): CustomerTicket[] {
  const groups = new Map<string, CustomerTicket>()
  for (const ticket of tickets) {
    const existing = groups.get(ticket.ticket_plan_id)
    if (!existing) {
      groups.set(ticket.ticket_plan_id, { ...ticket })
      continue
    }
    existing.remaining_count += ticket.remaining_count
    existing.bookable_count += ticket.bookable_count
    existing.total_count += ticket.total_count
    if (ticket.expires_at && (!existing.expires_at || ticket.expires_at < existing.expires_at)) {
      existing.expires_at = ticket.expires_at
    }
  }
  return [...groups.values()]
}
