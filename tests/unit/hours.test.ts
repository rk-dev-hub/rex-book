import { describe, expect, it } from 'vitest'
import { businessHoursRows, formatDayHours, hoursOn, weekdayOf } from '@/lib/hours'
import type { BusinessHours } from '@/lib/types'

const hours: BusinessHours = {
  mon: { open: '09:00', close: '20:00' },
  tue: { open: '10:30', close: '19:00' },
  sun: null,
}

describe('formatDayHours', () => {
  it('営業時間・定休日・未設定を表す', () => {
    expect(formatDayHours({ open: '09:00', close: '20:00' })).toBe('9:00〜20:00')
    expect(formatDayHours({ open: '10:30', close: '19:00' })).toBe('10:30〜19:00')
    expect(formatDayHours(null)).toBe('定休日')
    expect(formatDayHours(undefined)).toBe('-')
  })
})

describe('businessHoursRows', () => {
  it('月曜始まりで 7 曜日を並べる', () => {
    const rows = businessHoursRows(hours)
    expect(rows.map((row) => row.label)).toEqual(['月', '火', '水', '木', '金', '土', '日'])
    expect(rows[0].text).toBe('9:00〜20:00')
    expect(rows[2].text).toBe('-') // 水曜は未設定
    expect(rows[6].text).toBe('定休日')
  })

  it('営業時間が未設定の店舗でも表を作れる', () => {
    expect(businessHoursRows(null).every((row) => row.text === '-')).toBe(true)
  })
})

describe('weekdayOf / hoursOn', () => {
  it('日付から曜日を求める', () => {
    expect(weekdayOf('2026-10-01')).toBe('thu')
    expect(weekdayOf('2026-10-04')).toBe('sun')
    expect(weekdayOf('2026-10-05')).toBe('mon')
  })

  it('その日の営業時間を返す', () => {
    expect(hoursOn(hours, '2026-10-05')).toEqual({ open: '09:00', close: '20:00' })
    expect(hoursOn(hours, '2026-10-04')).toBeNull()
    expect(hoursOn(null, '2026-10-05')).toBeUndefined()
  })
})
