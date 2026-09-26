import { cancelDeadline, formatJstMoment, formatJstSlot, formatJstTime, formatShortDate, toJstIsoDate } from '@/lib/datetime'
import { STATUS_LABELS, reservationLabel } from '@/lib/reservations'
import type { CustomerReservation } from '@/lib/types'
import { AppLink, Card } from './ui'

/** 予約の状態。色だけに頼らず、文字でも示す。 */
export function StatusBadge({ status }: { status: CustomerReservation['status'] }) {
  const tone =
    status === 'confirmed'
      ? 'border-wine-700 text-wine-800'
      : status === 'completed'
        ? 'border-stone-400 text-stone-600'
        : 'border-rose-400 text-rose-700'
  return (
    <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border bg-white px-2 py-0.5 text-xs font-bold ${tone}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}

/** マイページの予約一覧の 1 件。タップで詳細（キャンセルもここから）へ進む。 */
export function ReservationCard({
  reservation,
  cancelDeadlineHours,
}: {
  reservation: CustomerReservation
  /** 今後の予約でだけ、キャンセルできる期限を添える */
  cancelDeadlineHours?: number
}) {
  const showDeadline = reservation.status === 'confirmed' && cancelDeadlineHours !== undefined

  return (
    <AppLink href={`/reservations/${reservation.id}`} className="block">
      <Card className="transition-colors hover:border-wine-700">
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold text-stone-900">{formatJstSlot(reservation.start_at, reservation.end_at)}</p>
          <StatusBadge status={reservation.status} />
        </div>
        <p className="mt-1 text-sm text-stone-800">{reservation.store_name}</p>
        <p className="text-sm text-stone-700">
          {reservationLabel(reservation)}
          {reservation.staff_name ? `　担当: ${reservation.staff_name}` : ''}
        </p>
        {showDeadline && (
          <p className="mt-2 text-xs text-stone-500">
            {reservation.cancellable
              ? `キャンセル期限: ${formatJstMoment(cancelDeadline(reservation.start_at, cancelDeadlineHours))}まで`
              : 'キャンセル期限を過ぎています'}
          </p>
        )}
      </Card>
    </AppLink>
  )
}

/**
 * ホームの「今後のご予約」の 1 枚。正方形に近い四角で、横スクロールの列に並べる（2〜3 枚が見える幅）。
 * 日付・時刻・チケット・担当だけを載せ、キャンセルなどは詳細で行う。
 */
export function UpcomingCard({ reservation }: { reservation: CustomerReservation }) {
  return (
    <AppLink
      href={`/reservations/${reservation.id}`}
      className="flex aspect-square w-full flex-col justify-between rounded-2xl border border-wine-200 bg-gradient-to-br from-white via-white to-wine-50 p-3 shadow-md shadow-wine-900/10 transition-colors hover:border-wine-700"
    >
      <span>
        <span className="block text-lg font-bold leading-tight text-stone-900">
          {formatShortDate(toJstIsoDate(reservation.start_at))}
        </span>
        <span className="block text-sm font-semibold text-wine-800">
          {formatJstTime(reservation.start_at)}〜{formatJstTime(reservation.end_at)}
        </span>
      </span>
      <span className="min-w-0">
        <span className="line-clamp-2 block break-words text-sm font-bold text-stone-900">{reservationLabel(reservation)}</span>
        {reservation.staff_name && <span className="mt-0.5 block truncate text-xs text-stone-600">担当 {reservation.staff_name}</span>}
      </span>
    </AppLink>
  )
}
