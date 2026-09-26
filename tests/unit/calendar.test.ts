import { describe, expect, it } from 'vitest'
import {
  addMonths,
  bookableRangeInMonth,
  calendarWeeks,
  firstDayOf,
  formatMonthLabel,
  isValidMonth,
  lastDayOf,
  monthOf,
  navigableMonths,
  reservationMonthBounds,
} from '@/lib/calendar'

describe('月の計算', () => {
  it('月の形式を検証する', () => {
    expect(isValidMonth('2026-10')).toBe(true)
    expect(isValidMonth('2026-13')).toBe(false)
    expect(isValidMonth('2026-00')).toBe(false)
    expect(isValidMonth('2026-1')).toBe(false)
    expect(isValidMonth('2026-10-01')).toBe(false)
  })

  it('日付が属する月・月の初日と末日', () => {
    expect(monthOf('2026-10-15')).toBe('2026-10')
    expect(firstDayOf('2026-10')).toBe('2026-10-01')
    expect(lastDayOf('2026-10')).toBe('2026-10-31')
    expect(lastDayOf('2026-02')).toBe('2026-02-28')
    expect(lastDayOf('2028-02')).toBe('2028-02-29') // うるう年
  })

  it('月を足す・戻す（年をまたぐ）', () => {
    expect(addMonths('2026-10', 1)).toBe('2026-11')
    expect(addMonths('2026-12', 1)).toBe('2027-01')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
    expect(addMonths('2026-10', 0)).toBe('2026-10')
  })

  it('月の表記', () => {
    expect(formatMonthLabel('2026-10')).toBe('2026年10月')
    expect(formatMonthLabel('2027-01')).toBe('2027年1月')
  })
})

describe('calendarWeeks', () => {
  it('日曜始まりで、月の前後は空白（null）にする', () => {
    const weeks = calendarWeeks('2026-10') // 2026-10-01 は木曜
    expect(weeks[0]).toEqual([null, null, null, null, '2026-10-01', '2026-10-02', '2026-10-03'])
    expect(weeks[1][0]).toBe('2026-10-04') // 日曜
    expect(weeks[weeks.length - 1]).toEqual(['2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31'])
    expect(weeks.every((week) => week.length === 7)).toBe(true)
  })

  it('月のすべての日を 1 回ずつ含む', () => {
    for (const month of ['2026-02', '2026-10', '2026-11', '2028-02']) {
      const days = calendarWeeks(month).flat().filter((day): day is string => day !== null)
      expect(days).toHaveLength(Number(lastDayOf(month).slice(8)))
      expect(new Set(days).size).toBe(days.length)
      expect(days.every((day) => day.startsWith(month))).toBe(true)
    }
  })

  it('1 日が日曜の月は先頭に空白が無い', () => {
    expect(calendarWeeks('2026-11')[0][0]).toBe('2026-11-01') // 2026-11-01 は日曜
  })
})

describe('予約できる期間との関係', () => {
  const today = '2026-10-15'

  it('その月のうち、今日〜予約できる最後の日に含まれる範囲を返す', () => {
    expect(bookableRangeInMonth('2026-10', today, 60)).toEqual({ from: '2026-10-15', to: '2026-10-31' })
    expect(bookableRangeInMonth('2026-11', today, 60)).toEqual({ from: '2026-11-01', to: '2026-11-30' })
    // 60 日後は 2026-12-14
    expect(bookableRangeInMonth('2026-12', today, 60)).toEqual({ from: '2026-12-01', to: '2026-12-14' })
  })

  it('期間の外の月は null（問い合わせない）', () => {
    expect(bookableRangeInMonth('2026-09', today, 60)).toBeNull()
    expect(bookableRangeInMonth('2027-01', today, 60)).toBeNull()
  })

  it('移動できる月は、今日の月から予約できる最後の日の月まで', () => {
    expect(navigableMonths(today, 60)).toEqual({ first: '2026-10', last: '2026-12' })
    expect(navigableMonths(today, 10)).toEqual({ first: '2026-10', last: '2026-10' })
  })
})

describe('reservationMonthBounds', () => {
  it('予約がなければ、今日の月から 2 か月先まで', () => {
    expect(reservationMonthBounds('2026-09-21', [])).toEqual({ min: '2026-09', max: '2026-11' })
  })

  it('過去・先の予約がある月まで広げる', () => {
    expect(reservationMonthBounds('2026-09-21', ['2026-07-03', '2026-12-25', '2026-09-30'])).toEqual({
      min: '2026-07',
      max: '2026-12',
    })
  })
})
