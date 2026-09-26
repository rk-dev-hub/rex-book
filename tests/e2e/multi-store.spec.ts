import { expect, test } from '@playwright/test'
import { MULTI_EMAIL } from './helpers/env'
import { cancelWebReservationsOf, findBookableSlot, myStores } from './helpers/rexcarte'
import { MULTI_STATE, readSessionToken } from './helpers/state'

test.use({ storageState: MULTI_STATE })

/**
 * 顧客が複数の店舗に登録されている場合、店舗を切り替えられる。
 * 予約・チケット・予約状況は店舗ごとに管理されており、選んだ店舗の分だけを表示する。
 */
test('2 店舗に登録されている顧客は、店舗を選び、切り替えられる', async ({ page }) => {
  const stores = await myStores(readSessionToken(MULTI_STATE))
  expect(stores).toHaveLength(2)
  const shibuya = stores.find((store) => store.name.includes('渋谷'))!
  const shinjuku = stores.find((store) => store.name.includes('新宿'))!

  // ホームで、登録のある店舗を切り替えられる。お持ちのチケットは店舗ごとに違う
  await page.goto('/')
  await page.getByLabel('店舗を切り替える').selectOption({ label: shibuya.name })
  await expect(page).toHaveURL(new RegExp(`store=${shibuya.id}`))
  await expect(page.getByText('パーソナルトレーニング1回', { exact: true })).toBeVisible() // 渋谷店のチケット
  await expect(page.getByText('パートナーストレッチ1回', { exact: true })).toHaveCount(0)

  await page.getByLabel('店舗を切り替える').selectOption({ label: shinjuku.name })
  await expect(page).toHaveURL(new RegExp(`store=${shinjuku.id}`))
  await expect(page.getByText('パートナーストレッチ1回', { exact: true })).toBeVisible() // 新宿店のチケット
  await expect(page.getByText('パーソナルトレーニング1回', { exact: true })).toHaveCount(0)

  // 予約の画面も、選んだ店舗のチケットで始まる。セレクターで店舗を切り替えられる
  await page.getByRole('link', { name: '予約する', exact: true }).click()
  await page.getByRole('link').filter({ has: page.getByText('パートナーストレッチ1回', { exact: true }) }).click()
  await expect(page).toHaveURL(new RegExp(`/stores/${shinjuku.id}/book`))
  await expect(page.getByRole('heading', { name: '日付を選ぶ' })).toBeVisible()
  await expect(page.getByText('パートナーストレッチ1回', { exact: true })).toBeVisible()
  await page.getByLabel('店舗を切り替える').selectOption({ label: shibuya.name })
  await expect(page).toHaveURL(new RegExp(`/stores/${shibuya.id}/book`))
  await expect(page.getByRole('heading', { level: 1, name: 'チケットを選択' })).toBeVisible()
  await expect(page.getByText('パーソナルトレーニング1回', { exact: true })).toBeVisible()
  await expect(page.getByText('パートナーストレッチ1回', { exact: true })).toHaveCount(0)
})

test('予約トップの予約状況は店舗ごとに表示され、セレクターで切り替えられる', async ({ page }) => {
  const token = readSessionToken(MULTI_STATE)
  const stores = await myStores(token)
  const shibuya = stores.find((store) => store.name.includes('渋谷'))!
  const shinjuku = stores.find((store) => store.name.includes('新宿'))!
  // 新宿店で予約を 1 件入れる（渋谷店には入れない）
  const slot = await findBookableSlot({ token, storeName: '新宿', planName: 'パートナーストレッチ1回', slotIndex: 2 })

  try {
    const created = await page.request.post('/api/reservations', {
      data: { storeId: slot.storeId, startAt: slot.startAt, ticketPlanId: slot.planId, staffId: null },
      headers: { Origin: new URL(process.env.APP_URL ?? 'http://localhost:3100').origin },
    })
    expect(created.status()).toBe(201)

    // 新宿店の予約トップには、その予約がある
    await page.goto(`/?store=${shinjuku.id}`)
    await expect(page.getByRole('list', { name: '今後のご予約' }).getByRole('link', { name: /パートナーストレッチ/ })).toBeVisible()

    // セレクターで渋谷店に切り替えると、予約は表示されない（店舗ごとに管理されている）
    await page.getByLabel('店舗を切り替える').selectOption({ label: shibuya.name })
    await expect(page).toHaveURL(new RegExp(`store=${shibuya.id}`))
    await expect(page.getByText('今後のご予約はありません。')).toBeVisible()
    await expect(page.getByRole('link', { name: /パートナーストレッチ/ })).toHaveCount(0)
  } finally {
    await cancelWebReservationsOf(MULTI_EMAIL)
  }
})
