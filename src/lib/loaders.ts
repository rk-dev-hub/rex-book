import 'server-only'

import { notFound } from 'next/navigation'
import { RexCarteError, getMyTickets, getStore } from './rexcarte'
import type { CustomerTicket, StoreDetail } from './types'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value)
}

/**
 * 店舗の情報を取得する。顧客として登録されていない店舗・Web 予約を受け付けていない店舗・存在しない店舗は、
 * どれも同じ 404 にする（RexCarte が区別せず 404 を返す）。
 */
export async function loadStore(token: string, storeId: string): Promise<StoreDetail> {
  if (!isUuid(storeId)) notFound()
  try {
    return await getStore(token, storeId)
  } catch (error) {
    if (error instanceof RexCarteError && error.isNotFound) notFound()
    throw error
  }
}

/** その店舗で、ログイン中の顧客が予約に使えるチケット（予約に使える回数が 1 回以上あるもの。有効期限が近い順）。 */
export async function loadBookableTickets(token: string, storeId: string): Promise<CustomerTicket[]> {
  const tickets = await getMyTickets(token, storeId)
  return tickets.filter((ticket) => ticket.bookable_count > 0)
}

/**
 * 店舗ごとのキャンセル期限（時間）。マイページで「キャンセル期限」を表示するために使う。
 * 使えなくなった店舗などで取れなくても、画面全体は表示できるようにその店舗だけ省く。
 */
export async function loadCancelDeadlineHours(token: string, storeIds: string[]): Promise<Map<string, number>> {
  const hours = new Map<string, number>()
  await Promise.all(
    [...new Set(storeIds)].map(async (storeId) => {
      try {
        const store = await getStore(token, storeId)
        hours.set(storeId, store.booking_settings.cancel_deadline_hours)
      } catch (error) {
        if (!(error instanceof RexCarteError)) throw error
      }
    }),
  )
  return hours
}
