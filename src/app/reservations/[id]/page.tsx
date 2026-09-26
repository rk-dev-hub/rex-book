import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CancelReservation } from '@/components/CancelReservation'
import { PageShell } from '@/components/PageShell'
import { StatusBadge } from '@/components/ReservationCard'
import { Card, LinkButton, Notice, PageTitle } from '@/components/ui'
import { requireAccount } from '@/lib/auth'
import { cancelDeadline, formatJstMoment, formatJstSlot } from '@/lib/datetime'
import { getMyReservations } from '@/lib/rexcarte'
import { isUuid, loadCancelDeadlineHours } from '@/lib/loaders'
import { isFutureReservation, reservationLabel, reservationNumber } from '@/lib/reservations'

export const metadata: Metadata = { title: 'ご予約の詳細' }

export default async function ReservationDetailPage(props: PageProps<'/reservations/[id]'>) {
  const { id } = await props.params
  const { done } = await props.searchParams
  if (!isUuid(id)) notFound()

  const { token } = await requireAccount(`/reservations/${id}`)
  // 他人の予約・存在しない予約はどちらも「見つかりません」にする（一覧に無ければ同じ扱い）
  const reservation = (await getMyReservations(token)).find((item) => item.id === id)
  if (!reservation) notFound()

  const deadlineHours = (await loadCancelDeadlineHours(token, [reservation.store_id])).get(reservation.store_id)
  const isConfirmed = reservation.status === 'confirmed'
  const isFuture = isFutureReservation(reservation)

  return (
    <PageShell>
      {/* 予約直後の案内。同じ URL のままキャンセルした場合に、確定したかのように見せない */}
      {done === '1' && isConfirmed && (
        <div className="mb-5">
          <Notice tone="success" title="ご予約を承りました">
            確認メールを送信しました。当日お待ちしております。
          </Notice>
        </div>
      )}

      <PageTitle>ご予約の詳細</PageTitle>
      <Card>
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm text-stone-600">
            予約番号 <span className="font-mono font-bold text-stone-900">{reservationNumber(reservation.id)}</span>
          </p>
          <StatusBadge status={reservation.status} />
        </div>
        <dl className="space-y-3 text-sm">
          <Row label="日時" value={formatJstSlot(reservation.start_at, reservation.end_at)} />
          <Row label="店舗" value={reservation.store_name} />
          <Row label="内容" value={reservationLabel(reservation)} />
          <Row label="担当" value={reservation.staff_name ?? '-'} />
          {isConfirmed && deadlineHours !== undefined && (
            <Row
              label="キャンセル期限"
              value={`${formatJstMoment(cancelDeadline(reservation.start_at, deadlineHours))}まで`}
            />
          )}
        </dl>
      </Card>

      <div className="mt-6 space-y-3">
        {isConfirmed && isFuture && reservation.cancellable && <CancelReservation reservationId={reservation.id} />}
        {isConfirmed && isFuture && !reservation.cancellable && (
          <Notice title="キャンセル期限を過ぎています">
            キャンセルは店舗へお電話ください。
            {reservation.store_phone && (
              <>
                {' '}
                <a href={`tel:${reservation.store_phone}`} className="font-bold underline">
                  {reservation.store_phone}
                </a>
              </>
            )}
          </Notice>
        )}
        <LinkButton href={`/?store=${reservation.store_id}`} variant="secondary" block>
          予約トップに戻る
        </LinkButton>
      </div>
    </PageShell>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-24 shrink-0 font-semibold text-stone-500">{label}</dt>
      <dd className="min-w-0 flex-1 text-stone-900">{value}</dd>
    </div>
  )
}
