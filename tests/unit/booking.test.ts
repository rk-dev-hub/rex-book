import { describe, expect, it } from 'vitest'
import {
  STAFF_ANY,
  backHref,
  bookingHref,
  changeTargetHref,
  chooseTargetHref,
  currentStep,
  parseBookingParams,
  slotStartIso,
} from '@/lib/booking'

const MENU = '11111111-1111-4111-8111-111111111111'
const PLAN = '22222222-2222-4222-8222-222222222222'
const STAFF = '33333333-3333-4333-8333-333333333333'
const STORE = '44444444-4444-4444-8444-444444444444'

describe('parseBookingParams', () => {
  it('URL のクエリから選択内容を取り出す', () => {
    expect(parseBookingParams({ plan: MENU, staff: STAFF_ANY, date: '2026-10-01', time: '10:30' })).toEqual({
      planId: MENU,
      staff: STAFF_ANY,
      date: '2026-10-01',
      time: '10:30',
    })
    expect(parseBookingParams({ plan: PLAN, staff: STAFF })).toEqual({ planId: PLAN, staff: STAFF })
  })

  it('担当は省略できる（指名なしとして扱う）。日時は担当を決めなくても選べる', () => {
    expect(parseBookingParams({ plan: PLAN, date: '2026-10-01', time: '10:00' })).toEqual({
      planId: PLAN,
      date: '2026-10-01',
      time: '10:00',
    })
  })

  it('不正な値（ID・日付・時刻・月の形式違い）は無視する', () => {
    expect(parseBookingParams({ plan: 'abc' })).toEqual({})
    expect(parseBookingParams({ plan: MENU, staff: 'abc' })).toEqual({ planId: MENU })
    expect(parseBookingParams({ plan: MENU, date: '2026-02-30' })).toEqual({ planId: MENU })
    expect(parseBookingParams({ plan: MENU, date: '2026-10-01', time: '25:00' })).toEqual({
      planId: MENU,
      date: '2026-10-01',
    })
    expect(parseBookingParams({ plan: MENU, cal: '2026-13' })).toEqual({ planId: MENU })
  })

  it('チケットが決まっていない状態の日時・担当・カレンダーは無視する（途中を飛ばせない）', () => {
    expect(parseBookingParams({ staff: STAFF_ANY, date: '2026-10-01', time: '10:00', cal: '2026-10' })).toEqual({})
    // 日付が決まっていない時刻も無視する
    expect(parseBookingParams({ plan: MENU, time: '10:00' })).toEqual({ planId: MENU })
  })

  it('選び直し（pick=1）とカレンダーの月を読み取る', () => {
    expect(parseBookingParams({ pick: '1' })).toEqual({ pick: true })
    expect(parseBookingParams({ plan: PLAN, pick: '1', cal: '2026-11' })).toEqual({
      planId: PLAN,
      pick: true,
      cal: '2026-11',
    })
    expect(parseBookingParams({ plan: PLAN, pick: '0' })).toEqual({ planId: PLAN })
  })

  it('同じキーが複数あれば先頭を使う', () => {
    expect(parseBookingParams({ plan: [MENU, PLAN] })).toEqual({ planId: MENU })
  })
})

describe('currentStep', () => {
  it('選択の進み具合からステップを決める', () => {
    expect(currentStep({})).toBe('target')
    expect(currentStep({ planId: MENU })).toBe('datetime')
    expect(currentStep({ planId: PLAN, staff: STAFF_ANY })).toBe('datetime')
    expect(currentStep({ planId: MENU, date: '2026-10-01' })).toBe('datetime')
    expect(currentStep({ planId: MENU, date: '2026-10-01', time: '10:00' })).toBe('confirm')
  })

  it('選び直し中は、選択済みでもチケットの画面を出す', () => {
    expect(currentStep({ planId: PLAN, date: '2026-10-01', time: '10:00', pick: true })).toBe('target')
  })
})

describe('bookingHref', () => {
  it('選択内容をクエリに持つ URL を作る', () => {
    expect(bookingHref(STORE, {})).toBe(`/stores/${STORE}/book`)
    expect(bookingHref(STORE, { planId: MENU, staff: STAFF_ANY, date: '2026-10-01', time: '10:00' })).toBe(
      `/stores/${STORE}/book?plan=${MENU}&staff=any&date=2026-10-01&time=10%3A00`,
    )
    expect(bookingHref(STORE, { planId: PLAN })).toBe(`/stores/${STORE}/book?plan=${PLAN}`)
    expect(bookingHref(STORE, { planId: PLAN, cal: '2026-11', pick: true })).toBe(
      `/stores/${STORE}/book?plan=${PLAN}&cal=2026-11&pick=1`,
    )
  })

  it('作った URL を解釈し直すと同じ選択になる', () => {
    const selection = { planId: MENU, staff: STAFF, date: '2026-10-01', time: '10:00', cal: '2026-10' }
    const query = Object.fromEntries(new URL(bookingHref(STORE, selection), 'http://x').searchParams)
    expect(parseBookingParams(query)).toEqual(selection)
  })
})

describe('backHref', () => {
  it('確認からは日時へ（時刻だけ外す）、日時からはチケットの選択へ戻る', () => {
    expect(backHref(STORE, { planId: MENU, staff: STAFF, date: '2026-10-01', time: '10:00' })).toBe(
      `/stores/${STORE}/book?plan=${MENU}&staff=${STAFF}&date=2026-10-01`,
    )
    expect(backHref(STORE, { planId: PLAN })).toBe(`/stores/${STORE}/book?plan=${PLAN}&pick=1`)
  })

  it('チケットの選び直しからは、選択済みの内容の日時へ戻る。最初の選択なら予約トップへ', () => {
    expect(backHref(STORE, { planId: PLAN, staff: STAFF_ANY, pick: true })).toBe(
      `/stores/${STORE}/book?plan=${PLAN}&staff=any`,
    )
    expect(backHref(STORE, {})).toBe('/')
  })
})

describe('changeTargetHref / chooseTargetHref', () => {
  const current = { planId: PLAN, staff: STAFF, date: '2026-10-05', time: '11:00', cal: '2026-10' }

  it('チケットを選び直すときは、日付・担当を残し、時刻とカレンダーを外す', () => {
    expect(changeTargetHref(STORE, current)).toBe(
      `/stores/${STORE}/book?plan=${PLAN}&staff=${STAFF}&date=2026-10-05&pick=1`,
    )
  })

  it('選び直したあとは、日付・担当を引き継いで日時の画面へ進む（所要時間が変わるため時刻は選び直す）', () => {
    expect(chooseTargetHref(STORE, MENU, current)).toBe(
      `/stores/${STORE}/book?plan=${MENU}&staff=${STAFF}&date=2026-10-05`,
    )
    // 最初の選択（引き継ぐものが無い）
    expect(chooseTargetHref(STORE, PLAN, {})).toBe(`/stores/${STORE}/book?plan=${PLAN}`)
  })
})

describe('slotStartIso', () => {
  it('JST の日付と時刻から +09:00 付きの日時を作る', () => {
    expect(slotStartIso('2026-10-01', '10:30')).toBe('2026-10-01T10:30:00+09:00')
    // RexCarte が返す空き枠と同じ形式なので、UTC に直すと 9 時間前になる
    expect(new Date(slotStartIso('2026-10-01', '10:30')).toISOString()).toBe('2026-10-01T01:30:00.000Z')
  })
})
