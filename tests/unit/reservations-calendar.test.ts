import { describe, expect, it } from 'vitest'
import { calendarReservations, groupByJstDate } from '@/lib/reservations'
import type { CustomerReservation } from '@/lib/types'

function reservation(id: string, start_at: string, status: CustomerReservation['status'] = 'confirmed'): CustomerReservation {
  return {
    id,
    store_id: 's',
    store_name: '店',
    store_phone: null,
    start_at,
    end_at: start_at,
    status,
    ticket_plan_name: 'パーソナルトレーニング1回',
    staff_name: null,
    cancellable: true,
  }
}

describe('予約カレンダー用の整理', () => {
  it('キャンセル・無断キャンセルは出さない', () => {
    const list = [
      reservation('a', '2026-10-01T01:00:00Z'),
      reservation('b', '2026-10-02T01:00:00Z', 'completed'),
      reservation('c', '2026-10-03T01:00:00Z', 'cancelled'),
      reservation('d', '2026-10-04T01:00:00Z', 'no_show'),
    ]
    expect(calendarReservations(list).map((item) => item.id)).toEqual(['a', 'b'])
  })

  it('JST の日付ごとにまとめ、同じ日は開始の早い順（UTC の日付をまたぐ場合も JST で数える）', () => {
    const grouped = groupByJstDate([
      reservation('late', '2026-10-01T05:00:00Z'), // JST 10/1 14:00
      reservation('early', '2026-10-01T00:00:00Z'), // JST 10/1 09:00
      reservation('night', '2026-10-01T15:30:00Z'), // JST 10/2 00:30
    ])
    expect([...grouped.keys()]).toEqual(['2026-10-01', '2026-10-02'])
    expect(grouped.get('2026-10-01')!.map((item) => item.id)).toEqual(['early', 'late'])
    expect(grouped.get('2026-10-02')!.map((item) => item.id)).toEqual(['night'])
  })
})
