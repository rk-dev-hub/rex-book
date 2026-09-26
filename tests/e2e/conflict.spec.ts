import { expect, test } from '@playwright/test'
import { cancelStaffReservation, createStaffReservation, findBookableSlot, nextSunday } from './helpers/rexcarte'
import { MEMBER_STATE, readSessionToken } from './helpers/state'

test.use({ storageState: MEMBER_STATE })

/**
 * 同時予約: 顧客が確認画面を開いている間に、店舗が同じ枠へ電話予約を入れた場合。
 * 確認画面を表示した時点では空いていたので、確定を押して初めて RexCarte（と DB の排他制約）が弾く。
 */
test('確認画面を開いている間に枠が埋まったら、確定は 409 の共通文言になり、日時を選び直せる', async ({ page }) => {
  const slot = await findBookableSlot({ token: readSessionToken(MEMBER_STATE), staffName: '佐藤 花子', slotIndex: 5 })
  let staffReservationId: string | undefined

  try {
    // 予約ステップの選択は URL のクエリに持つので、確認画面へ直接入れる（指名は佐藤さん）
    await page.goto(`/stores/${slot.storeId}/book?plan=${slot.planId}&staff=${slot.staffId}&date=${slot.date}&time=${slot.time}`)
    await expect(page.getByRole('heading', { name: '予約内容の確認' })).toBeVisible()
    await expect(page.getByRole('button', { name: '予約を確定する' })).toBeVisible()

    // この間に店舗が同じ枠へ電話予約を入れる
    staffReservationId = await createStaffReservation(slot)

    await page.getByRole('button', { name: '予約を確定する' }).click()
    await page.getByRole('button', { name: '確定する', exact: true }).click()

    // 理由（誰かに取られた・シフト外など）は区別せず、共通の文言だけを出す
    // Next.js のルート告知用の要素（role=alert）と区別するため、文言で絞る
    const alert = page.getByRole('alert').filter({ hasText: 'この時間は予約できません' })
    await expect(alert).toContainText('この時間は予約できません。別の日時をお選びください')
    await expect(alert).not.toContainText('佐藤')
    await expect(alert).not.toContainText('重複')
    await expect(page.getByRole('heading', { name: 'ご予約の詳細' })).toHaveCount(0)

    // 日時を選び直すと、埋まった時刻は候補から消えている（担当は佐藤さんのまま）
    await alert.getByRole('link', { name: '日時を選び直す' }).click()
    await expect(page.getByRole('heading', { name: /時刻を選ぶ/ })).toBeVisible()
    await expect(page.getByRole('link', { name: slot.time, exact: true })).toHaveCount(0)
  } finally {
    if (staffReservationId) await cancelStaffReservation(staffReservationId)
  }
})

test('予約できる時刻がない日は、理由を出さず「予約できる時刻がありません」とだけ表示する', async ({ page }) => {
  const slot = await findBookableSlot({ token: readSessionToken(MEMBER_STATE) })

  // デモの渋谷店は日曜が定休日
  await page.goto(`/stores/${slot.storeId}/book?plan=${slot.planId}&date=${nextSunday()}`)

  await expect(page.getByText('予約できる時刻がありません', { exact: true })).toBeVisible()
  await expect(page.getByText(/定休|休日|満席|埋まって/)).toHaveCount(0)
  // 時刻のボタンは 1 つも出ない
  await expect(page.getByRole('link', { name: /^\d{2}:\d{2}$/ })).toHaveCount(0)
})
