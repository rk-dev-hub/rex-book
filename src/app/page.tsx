import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Collapsible } from '@/components/Collapsible'
import { PageShell } from '@/components/PageShell'
import { ReservationCalendar } from '@/components/ReservationCalendar'
import { ReservationCard, UpcomingCard } from '@/components/ReservationCard'
import { StoreSwitcher } from '@/components/StoreSwitcher'
import { NoTicketNotice, ProfileMissingNotice, TicketList } from '@/components/TicketChoices'
import { AppLink, LinkButton, Notice, SectionTitle } from '@/components/ui'
import { requireAccount } from '@/lib/auth'
import { addMonths, isValidMonth, monthOf, reservationMonthBounds } from '@/lib/calendar'
import { formatShortDate, isValidIsoDate, todayJst, toJstIsoDate } from '@/lib/datetime'
import { getMyReservations, getMyStores, getMyTickets } from '@/lib/rexcarte'
import { isUuid, loadCancelDeadlineHours } from '@/lib/loaders'
import {
  PAST_PAGE_SIZE,
  calendarReservations,
  groupByJstDate,
  isFutureReservation,
  pastVisibleCount,
  splitReservations,
} from '@/lib/reservations'

export const metadata: Metadata = { title: 'ご予約' }

/**
 * ログイン後の最初の画面（ホーム）。このアプリの主役は予約なので、
 * 「予約する」ボタン → 今後のご予約 → 予約カレンダー の順に並べる。
 * 予約は店舗ごとに管理されているため、複数の店舗に登録されていれば店舗を切り替えられる（?store=）。
 * カレンダーの月・選んだ日は ?month=YYYY-MM・?date=YYYY-MM-DD。
 */
export default async function HomePage(props: PageProps<'/'>) {
  // 予約状況は常に最新を RexCarte から取る（ビルド時に固定しない）
  await connection()
  const query = await props.searchParams
  const { token, account } = await requireAccount('/')
  const stores = await getMyStores(token)

  if (stores.length === 0) {
    return (
      <PageShell>
        <Notice title="ご利用いただける店舗がありません">お手数ですが、店舗へお問い合わせください。</Notice>
      </PageShell>
    )
  }

  const requestedStore = typeof query.store === 'string' && isUuid(query.store) ? query.store : undefined
  const store = stores.find((item) => item.id === requestedStore) ?? stores[0]

  const [allReservations, deadlineHours, tickets] = await Promise.all([
    getMyReservations(token),
    loadCancelDeadlineHours(token, [store.id]),
    getMyTickets(token, store.id),
  ])
  const canBook = tickets.some((ticket) => ticket.bookable_count > 0)
  const reservations = allReservations.filter((reservation) => reservation.store_id === store.id)
  const now = new Date()
  const today = todayJst(now)
  const { upcoming, past } = splitReservations(reservations, now)

  // --- 予約カレンダー ---
  const byDate = groupByJstDate(calendarReservations(reservations))
  const bounds = reservationMonthBounds(today, [...byDate.keys()])
  const requestedDate = typeof query.date === 'string' && isValidIsoDate(query.date) ? query.date : undefined
  const requestedMonth = typeof query.month === 'string' && isValidMonth(query.month) ? query.month : undefined
  // 選んだ日があればその月を、なければ指定の月、なければ次の予約の月（なければ今月）を開く
  const initialMonth = requestedDate ? monthOf(requestedDate) : (requestedMonth ?? monthOf(upcoming[0] ? toJstIsoDate(upcoming[0].start_at) : today))
  const month = initialMonth < bounds.min ? bounds.min : initialMonth > bounds.max ? bounds.max : initialMonth
  const selectedDate = requestedDate && byDate.has(requestedDate) && monthOf(requestedDate) === month ? requestedDate : undefined

  const homeHref = (params: { month?: string; date?: string; past?: number }) => {
    const search = new URLSearchParams()
    if (stores.length > 1) search.set('store', store.id)
    if (params.month) search.set('month', params.month)
    if (params.date) search.set('date', params.date)
    // 「さらに表示」で開いた過去のご予約は、カレンダーを動かしても開いたままにする
    const past = params.past ?? (pastRequested ? pastShown : undefined)
    if (past) search.set('past', String(past))
    const text = search.toString()
    return text ? `/?${text}` : '/'
  }

  // 過去のご予約は 10 件ずつ。「さらに表示」を押したあとは、開いたまま表示する
  const pastShown = pastVisibleCount(query.past, past.length)
  const pastRequested = query.past !== undefined

  const counts = new Map([...byDate].map(([date, items]) => [date, items.length]))
  const upcomingDates = new Set(upcoming.map((reservation) => toJstIsoDate(reservation.start_at)))
  const selectedReservations = selectedDate ? (byDate.get(selectedDate) ?? []) : []
  const deadline = deadlineHours.get(store.id)

  return (
    <PageShell>
      <StoreSwitcher stores={stores} currentId={store.id} target="home" />

      {/* 1. お名前と、その右に予約ボタン。予約はお持ちのチケット（単発・回数券）を使って行う */}
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-lg font-bold text-stone-900">{account.name} さん</p>
        {canBook && account.profile_completed && (
          <LinkButton href={`/stores/${store.id}/book`} className="min-h-14! shrink-0 px-8! text-base!">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="mr-2 h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            予約する
          </LinkButton>
        )}
      </div>
      {!account.profile_completed ? (
        <div className="mt-3">
          <Notice tone="error">
            <ProfileMissingNotice phone={store.phone} />
          </Notice>
        </div>
      ) : (
        !canBook && (
          <div className="mt-3">
            <Notice>
              <NoTicketNotice storeName={store.name} phone={store.phone} />
            </Notice>
          </div>
        )
      )}

      {/* 2. 今後のご予約。正方形に近いカードを横スクロールで並べる */}
      <SectionTitle>今後のご予約</SectionTitle>
      {upcoming.length === 0 ? (
        <Notice>今後のご予約はありません。</Notice>
      ) : (
        <ul
          aria-label="今後のご予約"
          className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scroll-padding-inline:1rem]"
        >
          {upcoming.map((reservation) => (
            <li key={reservation.id} className="w-[42%] shrink-0 snap-start">
              <UpcomingCard reservation={reservation} />
            </li>
          ))}
        </ul>
      )}

      {/* 3. 予約カレンダー */}
      <SectionTitle>予約カレンダー</SectionTitle>
      <ReservationCalendar
        month={month}
        today={today}
        counts={counts}
        upcomingDates={upcomingDates}
        selectedDate={selectedDate}
        hrefForDate={(date) => homeHref({ month, date })}
        prevHref={month > bounds.min ? homeHref({ month: addMonths(month, -1) }) : undefined}
        nextHref={month < bounds.max ? homeHref({ month: addMonths(month, 1) }) : undefined}
      >
      {selectedDate && (
        <section aria-label={`${formatShortDate(selectedDate)}のご予約`} className="mt-3 border-t border-stone-200 pt-3">
          <h3 className="mb-2 text-sm font-bold text-stone-900">{formatShortDate(selectedDate)} のご予約</h3>
          <ul className="space-y-3">
            {selectedReservations.map((reservation) => (
              <li key={reservation.id}>
                <ReservationCard
                  reservation={reservation}
                  cancelDeadlineHours={isFutureReservation(reservation, now) ? deadline : undefined}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
      </ReservationCalendar>
      {/* 4. マイチケット */}
      <SectionTitle>マイチケット</SectionTitle>
      {tickets.length === 0 ? (
        <Notice>ご利用いただけるチケットはありません。</Notice>
      ) : (
        <TicketList tickets={tickets} />
      )}

      {past.length > 0 && (
        <Collapsible title="過去のご予約" count={past.length} defaultOpen={pastRequested}>
          <ul className="space-y-3">
            {past.slice(0, pastShown).map((reservation) => (
              <li key={reservation.id}>
                <ReservationCard reservation={reservation} />
              </li>
            ))}
          </ul>
          {/* 件数が増えても長くならないよう、10 件ずつ表示する */}
          {pastShown < past.length && (
            <div className="mt-3">
              <LinkButton
                href={homeHref({ month, date: selectedDate, past: pastShown + PAST_PAGE_SIZE })}
                scroll={false}
                variant="secondary"
                block
              >
                さらに{Math.min(PAST_PAGE_SIZE, past.length - pastShown)}件表示（{pastShown}/{past.length}件）
              </LinkButton>
            </div>
          )}
        </Collapsible>
      )}

      <p className="mt-8 text-center">
        <AppLink href={`/stores/${store.id}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-wine-800 underline">
          店舗情報（住所・電話・営業時間）
        </AppLink>
      </p>
    </PageShell>
  )
}
