import { expect, test } from '@playwright/test'
import { chooseDate } from './helpers/booking'
import { MEMBER_STATE, readSessionToken } from './helpers/state'
import { UI_LOGIN_EMAIL } from './helpers/env'
import { cancelWebReservationsOf, findBookableSlot, grantTicket } from './helpers/rexcarte'
import { waitForLoginCode, waitForMail } from './helpers/mailpit'

/**
 * 主要フロー: 店舗に顧客として登録済みで、チケットをまだ持たない顧客が、画面からログインし、
 * 店頭で購入したチケット（単発）を反映してもらってから予約し、予約トップで確認して、キャンセルするまで。画面の操作だけで通す。
 */
test('登録済みの顧客が、画面からログインし、店頭で購入したチケットで予約し、確認してキャンセルできる', async ({ page }) => {
  // キャンセル期限（24 時間前）に掛からない日の、指名なしで取れる枠（空き枠は RexCarte の API から取る）
  const slot = await findBookableSlot({ token: readSessionToken(MEMBER_STATE), slotIndex: 3 })
  const [, month, day] = slot.date.split('-').map(Number)
  const since = Date.now()

  try {
    // 店頭でチケット（単発）を購入し、スタッフがシステムに反映した状態にする（チケットを持たないと予約できない）
    await grantTicket(UI_LOGIN_EMAIL, 'パーソナルトレーニング1回')

    // --- ログインしていないと、どの画面もログインへ誘導される ---
    await page.goto('/')
    await expect(page).toHaveURL(/\/login\?next=%2F$/)
    await page.getByLabel('メールアドレス').fill(UI_LOGIN_EMAIL)
    await page.getByRole('button', { name: 'ログインコードを送る' }).click()

    await expect(page).toHaveURL(/\/login\/verify/)
    await page.getByLabel('6桁のコード').fill(await waitForLoginCode(UI_LOGIN_EMAIL, since))
    await page.getByRole('button', { name: 'ログイン', exact: true }).click()

    // --- ログイン後は予約トップ。お名前とその右に予約ボタン。ヘッダーにはお名前もマイページもない ---
    await expect(page.getByRole('main').getByText(/さん$/)).toBeVisible()
    await expect(page.getByRole('banner').getByText(/さん$/)).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'マイページ' })).toHaveCount(0)
    await expect(page.getByText('今後のご予約はありません。')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'マイチケット' })).toBeVisible()
    await expect(page.getByText(/お持ちのチケットを使って/)).toHaveCount(0)
    await page.getByRole('link', { name: '予約する', exact: true }).click()

    // --- 予約ボタンからは必ずチケットの選択から（自動では選ばない）。行に「選ぶ」の目印がある ---
    await expect(page.getByRole('heading', { level: 1, name: 'チケットを選択' })).toBeVisible()
    await expect(page.getByText('選ぶ ›').first()).toBeVisible()
    await page
      .getByRole('link')
      .filter({ has: page.getByText('パーソナルトレーニング1回', { exact: true }) })
      .first()
      .click()

    // --- 日時（担当はこの画面の中で選ぶ。既定は指名なし） ---
    await expect(page.getByRole('heading', { level: 1, name: '日時を選択' })).toBeVisible()
    await expect(page.getByRole('heading', { name: '日付を選ぶ' })).toBeVisible()
    await expect(page.getByRole('list', { name: '担当' }).getByRole('link', { name: /指名なし/ })).toHaveAttribute('aria-current', 'true')
    await chooseDate(page, slot.date)
    await page.getByRole('link', { name: slot.time, exact: true }).click()

    // --- 確認して確定する ---
    await expect(page.getByRole('heading', { name: '予約内容の確認' })).toBeVisible()
    const summary = page.getByRole('definition')
    await expect(summary.filter({ hasText: `${month}月${day}日` })).toBeVisible() // 選んだ日になっている
    await expect(summary.filter({ hasText: 'パーソナルトレーニング1回' })).toBeVisible()
    await expect(summary.filter({ hasText: '指名なし' })).toBeVisible()
    await expect(summary.filter({ hasText: 'チケット 1 回分' })).toBeVisible()
    await page.getByLabel('店舗へのご要望（任意）').fill('初めての来店です')
    await page.getByRole('button', { name: '予約を確定する' }).click()

    // 押しただけでは確定せず、もう一度確認する。「戻る」で確認を閉じられる
    await expect(page.getByText('この内容で予約を確定します。よろしいですか？')).toBeVisible()
    await expect(page.getByText('ご予約を承りました')).toHaveCount(0)
    await page.getByRole('button', { name: '戻る', exact: true }).click()
    await expect(page.getByText('この内容で予約を確定します。よろしいですか？')).toHaveCount(0)
    await page.getByRole('button', { name: '予約を確定する' }).click()
    await page.getByRole('button', { name: '確定する', exact: true }).click()

    // --- 予約完了（担当者は確定してから分かる） ---
    await expect(page.getByText('ご予約を承りました')).toBeVisible()
    await expect(page.getByText('確認メールを送信しました')).toBeVisible()
    await expect(page.getByText(/予約番号/)).toBeVisible()
    await expect(page.getByText('佐藤 花子').or(page.getByText('鈴木 一郎'))).toBeVisible()
    await waitForMail(UI_LOGIN_EMAIL, 'ご予約を承りました', since)

    // --- 詳細から予約トップへ戻ると、「今後のご予約」と予約カレンダーに表示される ---
    await page.getByRole('link', { name: '予約トップに戻る' }).click()
    await expect(page.getByRole('heading', { name: '今後のご予約' })).toBeVisible()
    const upcoming = page.getByRole('list', { name: '今後のご予約' })
    await expect(upcoming.getByRole('link', { name: /パーソナルトレーニング/ })).toBeVisible()
    const calendar = page.getByRole('region', { name: '予約カレンダー' })
    await calendar.getByRole('link', { name: new RegExp(`^${month}/${day}\\(.*ご予約 1件`) }).click()
    await expect(page).toHaveURL(new RegExp(`date=${slot.date}`))
    // 日付を押すと、その日の予約がカレンダーのすぐ下（同じ枠の中）に出る
    await expect(calendar.getByRole('region', { name: new RegExp(`^${month}/${day}\\(.*のご予約`) })).toBeVisible()

    // --- 「今後のご予約」のカードから詳細へ進む ---
    await upcoming.getByRole('link', { name: /パーソナルトレーニング/ }).click()

    // --- キャンセル（2 段階の確認） ---
    await page.getByRole('button', { name: '予約をキャンセルする' }).click()
    await expect(page.getByText('この予約をキャンセルします。よろしいですか？')).toBeVisible()
    await page.getByRole('button', { name: 'キャンセルする', exact: true }).click()

    await expect(page.getByText('キャンセル', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '予約をキャンセルする' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: '予約トップに戻る' })).toBeVisible()

    // --- キャンセルした予約は「過去のご予約」の折りたたみに入る（開くまで見えない） ---
    await page.getByRole('link', { name: '予約トップに戻る' }).click()
    const past = page.locator('details').filter({ has: page.getByRole('heading', { name: /過去のご予約/ }) })
    await expect(past.getByRole('link', { name: /パーソナルトレーニング/ }).first()).toBeHidden()
    await past.getByText('過去のご予約').click()
    await expect(past.getByRole('link', { name: /キャンセル.*パーソナルトレーニング/ }).first()).toBeVisible()
    // キャンセル済みなのに「ご予約を承りました」を出さない
    await expect(page.getByText('ご予約を承りました')).toHaveCount(0)
    await waitForMail(UI_LOGIN_EMAIL, 'ご予約をキャンセルしました', since)
  } finally {
    // 途中で失敗しても、確定のまま残った予約を店舗側で取り消して枠を空ける
    await cancelWebReservationsOf(UI_LOGIN_EMAIL)
  }
})
