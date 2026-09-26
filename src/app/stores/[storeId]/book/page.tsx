import type { Metadata } from 'next'
import { PageShell } from '@/components/PageShell'
import { StoreSwitcher } from '@/components/StoreSwitcher'
import { AppLink, PageTitle } from '@/components/ui'
import { requireAccount } from '@/lib/auth'
import { backHref, bookingHref, currentStep, parseBookingParams } from '@/lib/booking'
import { getMyStores } from '@/lib/rexcarte'
import { loadBookableTickets, loadStore } from '@/lib/loaders'
import { groupTicketsByPlan } from '@/lib/tickets'
import { ConfirmStep } from './_components/ConfirmStep'
import { DateTimeStep } from './_components/DateTimeStep'
import { Stepper } from './_components/Stepper'
import { TargetStep } from './_components/TargetStep'
import { resolveTarget } from './_lib/target'

const STEP_TITLES = { target: 'チケットを選択', datetime: '日時を選択', confirm: '予約内容の確認' } as const

export const metadata: Metadata = { title: 'ご予約' }

/**
 * 予約ステップ（チケットを選択 → 日時を選択 → 予約内容の確認）。1 ページの中でステップを切り替え、選択内容は URL のクエリに持つ。
 * そのためブラウザの戻る操作やリロードでも選択が失われない（docs/05-screens.md）。
 *
 * 予約はチケット（単発・回数券）を 1 回分使って行う。予約ボタンからは必ず「チケットを選択」から始まる
 * （チケットが 1 つだけでも自動では選ばない）。チケットが無い顧客には、店舗で購入してもらう案内を出す。
 */
export default async function BookPage(props: PageProps<'/stores/[storeId]/book'>) {
  const { storeId } = await props.params
  const selection = parseBookingParams(await props.searchParams)
  const { token, account } = await requireAccount(bookingHref(storeId, selection))
  const store = await loadStore(token, storeId)
  const [ownedTickets, stores] = await Promise.all([loadBookableTickets(token, storeId), getMyStores(token)])
  // 同じプランのチケットは 1 つにまとめる（どのチケットを使うかは RexCarte が有効期限の近いものから決める）
  const tickets = groupTicketsByPlan(ownedTickets)

  const step = currentStep(selection)
  // チケットを選ぶ画面より先では、選ばれたものを確認する（不正・使い切りなら選び直しへ戻す）
  const target = step === 'target' ? null : resolveTarget(store, selection, tickets)

  return (
    <PageShell>
      <div className="mb-2">
        <AppLink
          href={backHref(store.id, selection)}
          className="inline-flex min-h-11 items-center text-sm font-semibold text-wine-800"
        >
          ← 戻る
        </AppLink>
      </div>
      <StoreSwitcher stores={stores} currentId={store.id} target="book" />
      <PageTitle>{STEP_TITLES[step]}</PageTitle>
      <Stepper current={step} />

      {step === 'target' && <TargetStep store={store} selection={selection} tickets={tickets} />}
      {step === 'datetime' && target && (
        <DateTimeStep token={token} store={store} selection={selection} target={target} />
      )}
      {step === 'confirm' && target && (
        <ConfirmStep token={token} account={account} store={store} selection={selection} target={target} />
      )}
    </PageShell>
  )
}
