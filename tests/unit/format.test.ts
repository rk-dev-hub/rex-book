import { describe, expect, it } from 'vitest'
import { formatDuration, formatPrice } from '@/lib/format'

describe('formatPrice', () => {
  it('税込の円で表す', () => {
    expect(formatPrice(5000)).toBe('5,000円（税込）')
    expect(formatPrice(15000)).toBe('15,000円（税込）')
    expect(formatPrice(0)).toBe('0円（税込）')
  })
})

describe('formatDuration', () => {
  it('分と時間で表す', () => {
    expect(formatDuration(45)).toBe('45分')
    expect(formatDuration(60)).toBe('1時間')
    expect(formatDuration(90)).toBe('1時間30分')
    expect(formatDuration(120)).toBe('2時間')
  })
})
