import { describe, expect, it } from 'vitest'
import { codeSchema, emailSchema, reservationCreateSchema } from '@/lib/schemas'

const ID = '11111111-1111-4111-8111-111111111111'

describe('emailSchema', () => {
  it('前後の空白を除き、小文字にそろえる', () => {
    expect(emailSchema.parse('  Taro@Example.COM ')).toBe('taro@example.com')
  })

  it('全角で入力されても半角に直して受け付ける', () => {
    expect(emailSchema.parse('ｔａｒｏ＠ｅｘａｍｐｌｅ．ｃｏｍ')).toBe('taro@example.com')
  })

  it('形式が正しくなければ拒否する', () => {
    expect(emailSchema.safeParse('taro').success).toBe(false)
    expect(emailSchema.safeParse('').success).toBe(false)
  })
})

describe('codeSchema', () => {
  it('6 桁の数字だけを受け付ける（全角も半角に直す）', () => {
    expect(codeSchema.parse('123456')).toBe('123456')
    expect(codeSchema.parse(' １２３４５６ ')).toBe('123456')
    expect(codeSchema.safeParse('12345').success).toBe(false)
    expect(codeSchema.safeParse('12345a').success).toBe(false)
    expect(codeSchema.safeParse('1234567').success).toBe(false)
  })
})

describe('reservationCreateSchema', () => {
  const base = { storeId: ID, startAt: '2026-10-01T10:00:00+09:00', staffId: null }

  it('使うチケットのプランが必要（メニューを指定した予約はできない）', () => {
    expect(reservationCreateSchema.safeParse({ ...base, ticketPlanId: ID }).success).toBe(true)
    expect(reservationCreateSchema.safeParse(base).success).toBe(false)
    expect(reservationCreateSchema.safeParse({ ...base, ticketPlanId: 'abc' }).success).toBe(false)
  })

  it('日時は +09:00 などのオフセット付きの ISO 8601 だけを受け付ける', () => {
    expect(reservationCreateSchema.safeParse({ ...base, ticketPlanId: ID, startAt: '2026-10-01 10:00' }).success).toBe(false)
    expect(reservationCreateSchema.safeParse({ ...base, ticketPlanId: ID, startAt: '2026-10-01T10:00:00' }).success).toBe(false)
  })

  it('ご要望は 500 文字まで、空なら未入力として扱う', () => {
    expect(reservationCreateSchema.parse({ ...base, ticketPlanId: ID, notes: '   ' }).notes).toBeUndefined()
    expect(reservationCreateSchema.parse({ ...base, ticketPlanId: ID, notes: ' 初めてです ' }).notes).toBe('初めてです')
    expect(reservationCreateSchema.safeParse({ ...base, ticketPlanId: ID, notes: 'あ'.repeat(501) }).success).toBe(false)
  })
})
