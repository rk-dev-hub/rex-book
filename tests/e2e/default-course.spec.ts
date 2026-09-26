import { type Page, expect, test } from '@playwright/test'
import { chooseDate } from './helpers/booking'
import { COURSE_EMAIL } from './helpers/env'
import { cancelWebReservationsOf, findBookableSlot, myStores } from './helpers/rexcarte'
import { COURSE_STATE, readSessionToken } from './helpers/state'

test.use({ storageState: COURSE_STATE })

/** 予約トップのマイチケットにある「ダイエット1ヶ月コース」の、予約に使える回数（「6/8」の 6）。 */
async function bookableCount(page: Page): Promise<number> {
  await page.goto('/')
  // マイチケットの見出しの直後の一覧（今後のご予約のカードと区別する）
  const list = page.getByRole('heading', { name: 'マイチケット' }).locator('xpath=following-sibling::ul[1]')
  await expect(list).toBeVisible()
  const card = list.getByRole('listitem').filter({ hasText: 'ダイエット1ヶ月コース' })
  const match = (await card.innerText()).match(/(\d+)\/8/)
  if (!match) throw new Error('マイチケットにダイエット1ヶ月コースの回数（例: 6/8）が見つかりません')
  return Number(match[1])
}

test('予約ボタンからは、チケットの選択から始まる（自動では選ばれない）', async ({ page }) => {
  await page.goto('/')
  // マイチケットは「予約に使える回数/購入時の回数（有効期限）」の形式。回数券・単発のバッジは出さない
  await expect(page.getByText(/^8\/8（有効期限 \d{4}\/\d+\/\d+）$/)).toBeVisible()
  await expect(page.getByText('回数券', { exact: true })).toHaveCount(0)
  await expect(page.getByText('単発', { exact: true })).toHaveCount(0)

  await page.getByRole('link', { name: '予約する', exact: true }).click()

  // 日時の画面へは飛ばず、持っているチケットが並ぶ
  await expect(page).toHaveURL(/\/book$/)
  await expect(page.getByRole('heading', { level: 1, name: 'チケットを選択' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '日付を選ぶ' })).toHaveCount(0)
  await expect(page.getByText('選ぶ ›')).toHaveCount(2)

  // 選ぶと、そのチケットで日時を選ぶ画面になる。所要時間が決まっているので、そのまま予約できる時刻が並ぶ
  await page.getByRole('link').filter({ has: page.getByText('ダイエット1ヶ月コース', { exact: true }) }).click()
  await expect(page.getByRole('heading', { level: 1, name: '日時を選択' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '日付を選ぶ' })).toBeVisible()
  await expect(page.getByText('ダイエット1ヶ月コース', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: /^\d{2}:\d{2}$/ }).first()).toBeVisible()

  // 担当は日時の画面の中で選べる（既定は指名なし）
  const staff = page.getByRole('list', { name: '担当' })
  await expect(staff.getByRole('link', { name: /指名なし/ })).toHaveAttribute('aria-current', 'true')
  await expect(staff.getByRole('link', { name: '佐藤 花子' })).toBeVisible()
})

test('チケットは「チケット変更」で選び直せる', async ({ page }) => {
  const [store] = await myStores(readSessionToken(COURSE_STATE))

  await page.goto(`/stores/${store.id}/book`)
  await page.getByRole('link').filter({ has: page.getByText('ダイエット1ヶ月コース', { exact: true }) }).click()
  await expect(page.getByText('ダイエット1ヶ月コース', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'チケット変更' }).click()

  // 持っているチケットが並び、現在のものは選択中。押せることが「選ぶ」の目印で分かる
  await expect(page).toHaveURL(/pick=1/)
  await expect(page.getByRole('heading', { level: 1, name: 'チケットを選択' })).toBeVisible()
  await expect(page.getByText('選択中', { exact: true })).toBeVisible()
  await expect(page.getByText('選ぶ ›')).toHaveCount(1)

  // 別のチケットを選ぶと、そのチケットで日時を選ぶ画面になる
  await page.getByRole('link').filter({ has: page.getByText('トレーニング＋ストレッチ1回', { exact: true }) }).click()
  await expect(page.getByRole('heading', { name: '日付を選ぶ' })).toBeVisible()
  await expect(page.getByText('トレーニング＋ストレッチ1回', { exact: true })).toBeVisible()
  await expect(page.getByText('ダイエット1ヶ月コース', { exact: true })).toHaveCount(0)
})

/**
 * 回数券での予約。予約時点では残回数を減らさず、「予約に使える回数」だけが減る。
 * キャンセルすると使える回数が元に戻る。
 */
test('保有コースで予約すると予約に使える回数が減り、キャンセルすると戻る', async ({ page }) => {
  const slot = await findBookableSlot({ token: readSessionToken(COURSE_STATE), planName: 'ダイエット1ヶ月コース', slotIndex: 7, minDaysAhead: 3 })
  const [, month, day] = slot.date.split('-').map(Number)

  try {
    const before = await bookableCount(page)
    expect(before).toBeGreaterThanOrEqual(1)

    // 予約トップの「予約する」から、チケットを選んで日時へ進む
    await page.goto('/')
    await page.getByRole('link', { name: '予約する', exact: true }).click()
    await page.getByRole('link').filter({ has: page.getByText('ダイエット1ヶ月コース', { exact: true }) }).click()
    await expect(page.getByRole('heading', { name: '日付を選ぶ' })).toBeVisible()

    await chooseDate(page, slot.date)
    await page.getByRole('link', { name: slot.time, exact: true }).click()

    // チケットを 1 回分使う
    await expect(page.getByRole('heading', { name: '予約内容の確認' })).toBeVisible()
    await expect(page.getByRole('definition').filter({ hasText: `${month}月${day}日` })).toBeVisible()
    await expect(page.getByRole('definition').filter({ hasText: 'チケット 1 回分' })).toBeVisible()
    await page.getByRole('button', { name: '予約を確定する' }).click()
    await page.getByRole('button', { name: '確定する', exact: true }).click()

    await expect(page.getByText('ご予約を承りました')).toBeVisible()
    await expect(page.getByText('ダイエット1ヶ月コース')).toBeVisible()

    // 予約した分だけ、予約に使える回数が減っている
    expect(await bookableCount(page)).toBe(before - 1)

    // キャンセルすると元に戻る（予約トップの「今後のご予約」から詳細へ）
    await page.goto('/')
    await page.getByRole('list', { name: '今後のご予約' }).getByRole('link', { name: new RegExp(`^${month}/${day}\\(`) }).click()
    await page.getByRole('button', { name: '予約をキャンセルする' }).click()
    await page.getByRole('button', { name: 'キャンセルする', exact: true }).click()
    await expect(page.getByText('キャンセル', { exact: true })).toBeVisible()

    expect(await bookableCount(page)).toBe(before)
  } finally {
    // 途中で失敗しても、コースの予約に使える回数を次の実行に残さない
    await cancelWebReservationsOf(COURSE_EMAIL)
  }
})
