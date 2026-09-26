import { expect, test } from '@playwright/test'
import { NO_PHONE_EMAIL, NO_TICKET_EMAIL } from './helpers/env'
import { grantTicket } from './helpers/rexcarte'
import { loginViaApi } from './helpers/login'

/**
 * 予約はチケット（単発・回数券）を使って行う。購入は店頭で行い、スタッフがシステムに反映する。
 * チケットを持たない顧客には、購入の案内を出し、予約の入口は出さない。
 */
test('チケットを持たない顧客には、店舗で購入する案内が出て、予約できない', async ({ page }) => {
  await loginViaApi(page, NO_TICKET_EMAIL)

  await page.goto('/')
  await expect(page.getByText('ご利用いただけるチケットがありません')).toBeVisible()
  await expect(page.getByText('ご予約にはチケットが必要です')).toBeVisible()
  await expect(page.getByRole('link', { name: '予約する', exact: true })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'マイチケット' })).toBeVisible()

  // 予約の画面を直接開いても、選べるチケットはなく、同じ案内が出る
  await page.getByRole('link', { name: '店舗情報（住所・電話・営業時間）' }).click()
  await page.getByRole('link', { name: '予約する', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'チケットを選択' })).toBeVisible()
  await expect(page.getByText('ご利用いただけるチケットがありません')).toBeVisible()
  await expect(page.getByRole('heading', { name: '日付を選ぶ' })).toHaveCount(0)
})

/**
 * お名前・電話番号は店舗が管理していて、お客様自身では変更できない（プロフィールの画面・API はない）。
 * 電話番号が店舗に未登録の顧客は、チケットがあっても予約できず、店舗へ問い合わせてもらう。
 */
test('電話番号が店舗に未登録の顧客は、予約できず、お客様自身で登録する画面もない', async ({ page }) => {
  await grantTicket(NO_PHONE_EMAIL, 'パーソナルトレーニング1回')
  await loginViaApi(page, NO_PHONE_EMAIL)

  await page.goto('/')
  await expect(page.getByText('お名前・電話番号が店舗に登録されていないため、ご予約いただけません')).toBeVisible()
  await expect(page.getByRole('link', { name: '予約する', exact: true })).toHaveCount(0)

  // プロフィールの画面はない
  await page.goto('/profile')
  await expect(page.getByText('ページが見つかりません')).toBeVisible()
  const origin = new URL(process.env.APP_URL ?? 'http://localhost:3100').origin
  expect((await page.request.put('/api/me', { data: {}, headers: { Origin: origin } })).status()).toBe(404)
})
