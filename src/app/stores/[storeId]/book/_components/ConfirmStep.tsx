import { redirect } from 'next/navigation'
import { ProfileMissingNotice } from '@/components/TicketChoices'
import { Card, LinkButton, Notice } from '@/components/ui'
import { type BookingSelection, STAFF_ANY, bookingHref, slotStartIso } from '@/lib/booking'
import { cancelDeadline, formatJstMoment, formatJstSlot, hasPassed } from '@/lib/datetime'
import { getAvailability, getStoreStaff } from '@/lib/rexcarte'
import type { CustomerAccount, StoreDetail } from '@/lib/types'
import type { BookingTarget } from '../_lib/target'
import { ConfirmForm } from './ConfirmForm'

/**
 * ステップ 3: 内容の確認と確定。氏名・電話番号は店舗が管理していて、お客様自身では登録・変更できない。
 * 店舗に未登録のときは、予約せず、店舗へ問い合わせてもらう。
 * 選んだ枠がまだ空いているかは RexCarte の空き枠 API で確認する（確定時にも RexCarte が必ず再検証する）。
 */
export async function ConfirmStep({
  token,
  account,
  store,
  selection,
  target,
}: {
  token: string
  account: CustomerAccount
  store: StoreDetail
  selection: BookingSelection
  target: BookingTarget
}) {
  const date = selection.date as string
  const time = selection.time as string
  const currentHref = bookingHref(store.id, selection)
  // 氏名・電話番号が店舗に未登録なら、予約できない（店舗がご本人に連絡できるようにするため）
  if (!account.profile_completed) {
    return (
      <Notice tone="error">
        <ProfileMissingNotice phone={store.phone} />
      </Notice>
    )
  }

  const staffChoice = selection.staff ?? STAFF_ANY
  const isAnyStaff = staffChoice === STAFF_ANY
  const staff = isAnyStaff ? null : (await getStoreStaff(token, store.id)).find((member) => member.id === staffChoice)
  // 指名したスタッフが公開されなくなっていたら、日時の画面へ戻す（指名なしで選び直せる）
  if (!isAnyStaff && !staff) redirect(bookingHref(store.id, { ...selection, staff: STAFF_ANY, time: undefined }))

  const startAt = slotStartIso(date, time)
  const start = new Date(startAt)
  const end = new Date(start.getTime() + target.durationMinutes * 60 * 1000)
  const reselectHref = bookingHref(store.id, { ...selection, time: undefined })

  const { slots } = await getAvailability(token, store.id, date, {
    ticketPlanId: target.ticketPlanId,
    staffId: staff?.id,
  })
  const stillAvailable = slots.some((slot) => new Date(slot).getTime() === start.getTime())

  if (!stillAvailable) {
    return (
      <div>
        <Notice tone="error" title="この時間は予約できなくなりました">
          別の日時をお選びください。
        </Notice>
        <div className="mt-4">
          <LinkButton href={reselectHref} block>
            日時を選び直す
          </LinkButton>
        </div>
      </div>
    )
  }

  const deadline = cancelDeadline(start, store.booking_settings.cancel_deadline_hours)

  return (
    <div>
      <Card>
        <dl className="space-y-3 text-sm">
          <Row label="店舗" value={store.name} />
          <Row label="チケット" value={target.label} />
          {/* 指名なしの場合、担当者は予約が確定してから分かる */}
          <Row label="担当" value={staff ? staff.name : '指名なし'} />
          <Row label="日時" value={formatJstSlot(start, end)} />
          <Row
            label="ご利用"
            value={
              target.totalCount > 1
                ? `チケット 1 回分（予約後、予約に使える回数 ${Math.max(target.bookableCount - 1, 0)}回）`
                : 'チケット 1 回分'
            }
          />
          {/* 直前の予約は、確定した時点でキャンセル期限を過ぎている。その場合は事実を先に伝える */}
          <Row
            label="キャンセル期限"
            value={
              hasPassed(deadline)
                ? 'ご予約日が近いため、確定後のキャンセルは店舗へお電話ください'
                : `${formatJstMoment(deadline)}まで`
            }
          />
        </dl>
      </Card>
      <ConfirmForm
        storeId={store.id}
        startAt={startAt}
        ticketPlanId={target.ticketPlanId}
        staffId={staff?.id ?? null}
        currentHref={currentHref}
        reselectHref={reselectHref}
      />
    </div>
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
