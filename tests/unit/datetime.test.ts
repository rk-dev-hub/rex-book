import { describe, expect, it } from "vitest";

import {
  addDaysIso,
  cancelDeadline,
  dateRange,
  formatJstDate,
  formatJstDateTime,
  formatJstMoment,
  formatJstSlot,
  formatJstTime,
  formatShortDate,
  formatYmd,
  hasPassed,
  isValidIsoDate,
  toJstIsoDate,
  todayJst,
} from "@/lib/datetime";

describe("datetime", () => {
  it("UTC の時刻を JST で表示する", () => {
    expect(formatJstTime("2026-09-15T00:30:00Z")).toBe("09:30");
    expect(formatJstDate("2026-09-15T00:30:00Z")).toBe("2026/9/15(火)");
    expect(formatJstDateTime("2026-09-15T00:30:00Z")).toBe("2026/9/15(火) 09:30");
  });

  it("UTC では前日でも JST の日付になる", () => {
    // UTC 15:00 = JST 翌日 0:00
    expect(toJstIsoDate("2026-09-15T15:00:00Z")).toBe("2026-09-16");
    expect(formatJstDate("2026-09-15T15:00:00Z")).toBe("2026/9/16(水)");
    expect(toJstIsoDate("2026-09-15T14:59:59Z")).toBe("2026-09-15");
  });
});

describe('日付の計算', () => {
  it('日数を足す・並べる（月をまたぐ）', () => {
    expect(addDaysIso('2026-09-30', 1)).toBe('2026-10-01')
    expect(addDaysIso('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDaysIso('2026-10-01', -1)).toBe('2026-09-30')
    expect(dateRange('2026-09-29', 4)).toEqual(['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'])
  })

  it('実在する日付だけを有効とする', () => {
    expect(isValidIsoDate('2026-10-01')).toBe(true)
    expect(isValidIsoDate('2026-02-30')).toBe(false)
    expect(isValidIsoDate('2026-13-01')).toBe(false)
    expect(isValidIsoDate('2026-1-1')).toBe(false)
  })

  it('今日の日付は JST で決まる（UTC の 15 時以降は翌日）', () => {
    expect(todayJst(new Date('2026-10-01T14:59:00Z'))).toBe('2026-10-01')
    expect(todayJst(new Date('2026-10-01T15:00:00Z'))).toBe('2026-10-02')
  })
})

describe('予約の日時表記', () => {
  it('予約の日時を「2026年10月1日(木) 10:00〜11:00」で表す', () => {
    expect(formatJstSlot('2026-10-01T01:00:00Z', '2026-10-01T02:00:00Z')).toBe('2026年10月1日(木) 10:00〜11:00')
    expect(formatJstMoment('2026-10-01T01:00:00Z')).toBe('2026年10月1日(木) 10:00')
  })

  it('日付タブは「10/1(木)」で表す', () => {
    expect(formatShortDate('2026-10-01')).toBe('10/1(木)')
    expect(formatShortDate('2026-10-04')).toBe('10/4(日)')
  })

  it('キャンセル期限は予約開始の指定時間前', () => {
    expect(cancelDeadline('2026-10-02T01:00:00Z', 24).toISOString()).toBe('2026-10-01T01:00:00.000Z')
  })
})

describe('hasPassed', () => {
  it('指定の時刻を過ぎているかを判定する', () => {
    const now = new Date('2026-10-01T03:00:00Z')
    expect(hasPassed('2026-10-01T02:59:59Z', now)).toBe(true)
    expect(hasPassed('2026-10-01T03:00:00Z', now)).toBe(true)
    expect(hasPassed('2026-10-01T03:00:01Z', now)).toBe(false)
  })
})

describe("formatYmd", () => {
  it("曜日なしの年/月/日（ゼロ埋めなし）", () => {
    expect(formatYmd("2026-12-20")).toBe("2026/12/20");
    expect(formatYmd("2027-01-05")).toBe("2027/1/5");
  });
});
