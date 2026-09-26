import { formatYmd } from '@/lib/datetime'
import { formatDuration } from '@/lib/format'
import { formatTicketCount } from '@/lib/tickets'
import type { CustomerTicket } from '@/lib/types'
import { AppLink, Card } from './ui'

/** チケット名と「3/8（有効期限 2026/12/20）」。3 = 予約に使える回数、8 = 購入時の回数。 */
function TicketBody({ ticket, withDuration = false }: { ticket: CustomerTicket; withDuration?: boolean }) {
  return (
    <span className="min-w-0">
      <span className="block font-bold text-stone-900">{ticket.plan_name}</span>
      <span className="block text-sm text-stone-700">
        {withDuration && <>{formatDuration(ticket.duration_minutes)}　</>}
        <span aria-hidden="true">{formatTicketCount(ticket, formatYmd)}</span>
        <span className="sr-only">
          予約に使える回数 {ticket.bookable_count}回、購入時 {ticket.total_count}回
          {ticket.expires_at ? `、有効期限 ${formatYmd(ticket.expires_at)}` : ''}
        </span>
      </span>
    </span>
  )
}

/**
 * 予約に使えるチケットの一覧。1 件押すと、そのチケットで日時の選択へ進む。
 * 「選ぶ ›」の目印で、選べば予約に進めることを示す。選び直しのときは、現在の選択が「選択中」になる。
 */
export function TicketChoices({
  tickets,
  hrefFor,
  selectedPlanId,
}: {
  tickets: CustomerTicket[]
  hrefFor: (ticket: CustomerTicket) => string
  selectedPlanId?: string
}) {
  return (
    <ul className="space-y-3">
      {tickets.map((ticket) => {
        const selected = selectedPlanId === ticket.ticket_plan_id
        return (
          <li key={ticket.id}>
            <AppLink href={hrefFor(ticket)} aria-current={selected ? 'true' : undefined} className="block">
              <Card
                className={`flex min-h-11 items-center justify-between gap-3 transition-colors hover:border-wine-700 ${
                  selected ? 'border-wine-700 bg-wine-50' : ''
                }`}
              >
                <TicketBody ticket={ticket} withDuration />
                <span
                  aria-hidden="true"
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${
                    selected ? 'border-wine-700 wine-gradient text-white' : 'border-wine-700 text-wine-800'
                  }`}
                >
                  {selected ? '選択中' : '選ぶ ›'}
                </span>
                {selected && <span className="sr-only">（選択中）</span>}
              </Card>
            </AppLink>
          </li>
        )
      })}
    </ul>
  )
}

/** マイチケット（表示だけ。押せない）。 */
export function TicketList({ tickets }: { tickets: CustomerTicket[] }) {
  return (
    <ul className="space-y-3">
      {tickets.map((ticket) => (
        <li key={ticket.id}>
          <Card>
            <TicketBody ticket={ticket} />
          </Card>
        </li>
      ))}
    </ul>
  )
}

/** チケットが無いとき。購入は店舗で行い、スタッフが反映すると予約できるようになる。 */
export function NoTicketNotice({ storeName, phone }: { storeName?: string; phone?: string | null }) {
  return (
    <div>
      <p className="font-bold">ご利用いただけるチケットがありません</p>
      <p className="mt-1">
        ご予約にはチケットが必要です。{storeName ? `${storeName}で` : '店舗で'}ご購入いただくと、こちらからご予約いただけます。
      </p>
      {phone && (
        <p className="mt-1">
          お問い合わせ:{' '}
          <a href={`tel:${phone}`} className="font-semibold underline">
            {phone}
          </a>
        </p>
      )}
    </div>
  )
}

/** お名前・電話番号が店舗に登録されていないとき。お客様自身では変更できないため、店舗へ連絡してもらう。 */
export function ProfileMissingNotice({ phone }: { phone?: string | null }) {
  return (
    <div>
      <p className="font-bold">ご予約いただけません</p>
      <p className="mt-1">お名前・電話番号が店舗に登録されていないため、ご予約いただけません。店舗へお問い合わせください。</p>
      {phone && (
        <p className="mt-1">
          <a href={`tel:${phone}`} className="font-semibold underline">
            {phone}
          </a>
        </p>
      )}
    </div>
  )
}
