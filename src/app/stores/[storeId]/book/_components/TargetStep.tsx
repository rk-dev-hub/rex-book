import { NoTicketNotice, TicketChoices } from '@/components/TicketChoices'
import { Notice } from '@/components/ui'
import { type BookingSelection, chooseTargetHref } from '@/lib/booking'
import type { CustomerTicket, StoreDetail } from '@/lib/types'

/**
 * ステップ 1: 使うチケットを選ぶ。予約ボタンからは必ずここから始まる。
 * 予約はチケットを 1 回分使って行う（単発 = 1 回のチケット、回数券 = 複数回のチケット）。
 * チケットが無い場合は、店舗で購入してもらう案内を出す（購入はスタッフがシステムに反映する）。
 */
export function TargetStep({
  store,
  selection,
  tickets,
}: {
  store: StoreDetail
  selection: BookingSelection
  tickets: CustomerTicket[]
}) {
  if (tickets.length === 0) {
    return (
      <Notice>
        <NoTicketNotice storeName={store.name} phone={store.phone} />
      </Notice>
    )
  }

  return (
    <TicketChoices
      tickets={tickets}
      selectedPlanId={selection.planId}
      hrefFor={(ticket) => chooseTargetHref(store.id, ticket.ticket_plan_id, selection)}
    />
  )
}
