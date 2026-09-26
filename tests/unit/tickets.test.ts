import { describe, expect, it } from 'vitest'
import { formatTicketCount, groupTicketsByPlan } from '@/lib/tickets'
import type { CustomerTicket } from '@/lib/types'

describe('formatTicketCount', () => {
  const date = (value: string) => value.replaceAll('-', '/')

  it('予約に使える回数/購入時の回数（有効期限つき）', () => {
    expect(formatTicketCount({ bookable_count: 3, total_count: 8, expires_at: '2026-12-20' }, date)).toBe(
      '3/8（有効期限 2026/12/20）',
    )
  })

  it('有効期限がなければ回数だけ', () => {
    expect(formatTicketCount({ bookable_count: 1, total_count: 1, expires_at: null }, date)).toBe('1/1')
  })
})

function ticket(id: string, plan: string, over: Partial<CustomerTicket> = {}): CustomerTicket {
  return {
    id,
    store_id: 's',
    store_name: '店',
    ticket_plan_id: plan,
    plan_name: plan,
    duration_minutes: 60,
    total_count: 1,
    remaining_count: 1,
    bookable_count: 1,
    expires_at: null,
    ...over,
  }
}

describe('groupTicketsByPlan', () => {
  it('同じプランは 1 つにまとめ、回数を合計し、有効期限は最も近いものにする', () => {
    const grouped = groupTicketsByPlan([
      ticket('a', 'cut', { expires_at: '2026-12-01' }),
      ticket('b', 'color'),
      ticket('c', 'cut', { expires_at: '2026-11-01', remaining_count: 3, bookable_count: 2 }),
    ])
    expect(grouped.map((item) => item.ticket_plan_id)).toEqual(['cut', 'color'])
    expect(grouped[0]).toMatchObject({ remaining_count: 4, bookable_count: 3, total_count: 2, expires_at: '2026-11-01' })
  })

  it('期限なしと期限ありを合わせると、期限ありを示す', () => {
    const grouped = groupTicketsByPlan([ticket('a', 'cut'), ticket('b', 'cut', { expires_at: '2026-11-01' })])
    expect(grouped[0].expires_at).toBe('2026-11-01')
  })

  it('元の配列は変更しない', () => {
    const original = [ticket('a', 'cut'), ticket('b', 'cut')]
    groupTicketsByPlan(original)
    expect(original[0].bookable_count).toBe(1)
  })
})
