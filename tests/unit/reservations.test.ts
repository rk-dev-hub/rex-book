import { describe, expect, it } from 'vitest'
import {
  PAST_PAGE_SIZE,
  pastVisibleCount,
  isFutureReservation,
  reservationLabel,
  reservationNumber,
  splitReservations,
} from '@/lib/reservations'
import type { CustomerReservation, ReservationStatus } from '@/lib/types'

const NOW = new Date('2026-10-01T03:00:00Z') // JST 12:00

function reservation(id: string, start: string, status: ReservationStatus = 'confirmed'): CustomerReservation {
  return {
    id,
    store_id: 's1',
    store_name: 'テスト店',
    store_phone: null,
    start_at: start,
    end_at: start,
    status,
    ticket_plan_name: 'パーソナルトレーニング1回',
    staff_name: '担当',
    cancellable: true,
  }
}

describe('splitReservations', () => {
  it('今後の予約は日時の近い順、過去の予約は新しい順に並べる', () => {
    const { upcoming, past } = splitReservations(
      [
        reservation('later', '2026-10-10T01:00:00Z'),
        reservation('old', '2026-09-01T01:00:00Z', 'completed'),
        reservation('soon', '2026-10-02T01:00:00Z'),
        reservation('recent', '2026-09-20T01:00:00Z', 'completed'),
      ],
      NOW,
    )
    expect(upcoming.map((r) => r.id)).toEqual(['soon', 'later'])
    expect(past.map((r) => r.id)).toEqual(['recent', 'old'])
  })

  it('未来の日時でもキャンセル済みは過去側に置く', () => {
    const { upcoming, past } = splitReservations([reservation('x', '2026-10-10T01:00:00Z', 'cancelled')], NOW)
    expect(upcoming).toEqual([])
    expect(past.map((r) => r.id)).toEqual(['x'])
  })

  it('開始を過ぎても確定のままの予約は過去側に置く', () => {
    const { upcoming, past } = splitReservations([reservation('x', '2026-10-01T01:00:00Z')], NOW)
    expect(upcoming).toEqual([])
    expect(past).toHaveLength(1)
  })

  it('過去の予約は件数で切らず、新しい順にすべて返す（絞り込みは表示側）', () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      reservation(`r${i}`, new Date(Date.UTC(2026, 8, 1 + (i % 28))).toISOString(), 'completed'),
    )
    const { past } = splitReservations(many, NOW)
    expect(past).toHaveLength(many.length)
    expect(new Date(past[0].start_at).getTime()).toBeGreaterThanOrEqual(new Date(past[past.length - 1].start_at).getTime())
  })
})

describe('reservationLabel / reservationNumber', () => {
  it('チケット名を返す（なければ -）', () => {
    expect(reservationLabel(reservation('a', '2026-10-01T00:00:00Z'))).toBe('パーソナルトレーニング1回')
    expect(reservationLabel({ ...reservation('a', '2026-10-01T00:00:00Z'), ticket_plan_name: '8回コース' })).toBe('8回コース')
    expect(reservationLabel({ ...reservation('a', '2026-10-01T00:00:00Z'), ticket_plan_name: null })).toBe('-')
  })

  it('予約番号は ID の先頭 8 桁（大文字）', () => {
    expect(reservationNumber('ffae069a-1234-4abc-8def-000000000000')).toBe('FFAE069A')
  })
})

describe('isFutureReservation', () => {
  it('開始が現在以降なら今後の予約', () => {
    expect(isFutureReservation(reservation('a', '2026-10-01T03:00:00Z'), NOW)).toBe(true)
    expect(isFutureReservation(reservation('a', '2026-10-02T00:00:00Z'), NOW)).toBe(true)
    expect(isFutureReservation(reservation('a', '2026-10-01T02:59:59Z'), NOW)).toBe(false)
  })
})

describe('pastVisibleCount', () => {
  it('既定は 10 件。10 件ずつ増やせる', () => {
    expect(pastVisibleCount(undefined, 50)).toBe(PAST_PAGE_SIZE)
    expect(pastVisibleCount('20', 50)).toBe(20)
    expect(pastVisibleCount(['30', '40'], 50)).toBe(30)
  })

  it('不正な値・小さすぎる値は 10 件、全件数を超える指定は全件にする', () => {
    for (const value of ['abc', '-5', '0', '5', '12.5', '']) expect(pastVisibleCount(value, 50)).toBe(PAST_PAGE_SIZE)
    expect(pastVisibleCount('200', 35)).toBe(35)
    expect(pastVisibleCount(undefined, 3)).toBe(3)
    expect(pastVisibleCount('20', 0)).toBe(0)
  })
})
