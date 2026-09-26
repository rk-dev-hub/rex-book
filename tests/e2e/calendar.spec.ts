import { expect, test } from '@playwright/test'
import { addDays, findBookableSlot, todayJst } from './helpers/rexcarte'
import { MEMBER_STATE, readSessionToken } from './helpers/state'

test.use({ storageState: MEMBER_STATE })

/** 'YYYY-MM' に n か月を足す。 */
function addMonths(month: string, count: number): string {
  const [year, monthNumber] = month.split('-').map(Number)
  return new Date(Date.UTC(year, monthNumber - 1 + count, 1)).toISOString().slice(0, 7)
}

/**
 * 日付タブは 2 週間分。それより先の日付は、カレンダーで選べる。
 * 予約できる日かどうかは RexCarte の API の結果だけで決まる（画面で営業時間を判定しない）。
 */
test('2 週間より先の日付も、カレンダーで選んで予約の確認画面まで進める', async ({ page }) => {
  // 日付タブ（今日から 14 日分）に入らない、先の日の空き枠
  const slot = await findBookableSlot({ token: readSessionToken(MEMBER_STATE), minDaysAhead: 16 })
  const [year, month, day] = slot.date.split('-').map(Number)
  const targetMonth = slot.date.slice(0, 7)

  await page.goto(`/stores/${slot.storeId}/book?plan=${slot.planId}`)
  await expect(page.getByRole('heading', { name: '日付を選ぶ' })).toBeVisible()
  // 日付タブには、先の日は出ていない
  await expect(page.getByRole('navigation', { name: '日付' }).getByRole('link', { name: new RegExp(`^${month}/${day}\\(`) })).toHaveCount(0)

  await page.getByRole('link', { name: 'カレンダーで先の日付を選ぶ' }).click()
  const calendar = page.getByRole('region', { name: 'カレンダー' })
  await expect(calendar).toBeVisible()

  // 目的の月まで、1 か月ずつ進む
  let shown = todayJst().slice(0, 7)
  while (shown < targetMonth) {
    shown = addMonths(shown, 1)
    await calendar.getByRole('link', { name: '次の月' }).click()
    await expect(page).toHaveURL(new RegExp(`cal=${shown}`))
  }
  await expect(calendar.getByText(`${year}年${month}月`, { exact: true })).toBeVisible()

  // 予約できない日（定休日など）は選べず、理由も出さない
  await expect(calendar.getByText('（予約できる時刻がありません）').first()).toBeAttached()
  await expect(calendar.getByRole('link', { name: /予約できる時刻があります/ }).first()).toBeVisible()

  // 予約できる日を選ぶと、カレンダーが閉じ、その日の時刻が並ぶ
  await calendar.getByRole('link', { name: new RegExp(`^${month}/${day}\\(.*予約できる時刻があります`) }).click()
  await expect(page).toHaveURL(new RegExp(`date=${slot.date}`))
  await expect(page.getByRole('region', { name: 'カレンダー' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: new RegExp(`時刻を選ぶ.*${month}/${day}\\(`) })).toBeVisible()
  await expect(page.getByText('カレンダーで選んだ日の時刻を表示しています。')).toBeVisible()

  // 時刻を選ぶと、その日付で確認画面になる
  await page.getByRole('link', { name: slot.time, exact: true }).click()
  await expect(page.getByRole('heading', { name: '予約内容の確認' })).toBeVisible()
  await expect(page.getByRole('definition').filter({ hasText: `${month}月${day}日` })).toBeVisible()
})

test('カレンダーで移動できるのは、今日の月から予約できる最後の日の月まで', async ({ page }) => {
  const slot = await findBookableSlot({ token: readSessionToken(MEMBER_STATE) })
  const firstMonth = todayJst().slice(0, 7)
  // 予約できる先の期間の初期値は 60 日
  const lastMonth = addDays(todayJst(), 60).slice(0, 7)

  await page.goto(`/stores/${slot.storeId}/book?plan=${slot.planId}&cal=${firstMonth}`)
  const calendar = page.getByRole('region', { name: 'カレンダー' })
  await expect(calendar).toBeVisible()
  // 今日の月より前へは戻れない
  await expect(calendar.getByRole('link', { name: '前の月' })).toHaveCount(0)

  await page.goto(`/stores/${slot.storeId}/book?plan=${slot.planId}&cal=${lastMonth}`)
  await expect(page.getByRole('region', { name: 'カレンダー' }).getByRole('link', { name: '次の月' })).toHaveCount(0)
})

/** 日付を変えても、スクロール位置が先頭に戻らない（見ていた場所のまま切り替わる）。 */
test('日時の選択で日付を変えても、スクロール位置が戻らない', async ({ page }) => {
  const slot = await findBookableSlot({ token: readSessionToken(MEMBER_STATE) })

  await page.goto(`/stores/${slot.storeId}/book?plan=${slot.planId}`)
  await expect(page.getByRole('heading', { name: '日付を選ぶ' })).toBeVisible()

  await page.evaluate(() => window.scrollTo(0, 150))
  const before = await page.evaluate(() => window.scrollY)
  test.skip(before < 50, 'ページが短くスクロールできない')

  // 選択中ではない日付タブ（予約できるもの）を押す
  const other = page
    .getByRole('navigation', { name: '日付' })
    .getByRole('link')
    .filter({ hasNot: page.locator('[aria-current="date"]') })
    .first()
  const currentUrl = page.url()
  await other.click()
  await expect.poll(() => page.url()).not.toBe(currentUrl)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(50)
})
