import { expect, test } from '@playwright/test'
import { unregisteredEmail } from './helpers/env'
import { myStores } from './helpers/rexcarte'
import { noMailArrives } from './helpers/mailpit'
import { MEMBER_STATE, readSessionToken } from './helpers/state'

const ORIGIN = new URL(process.env.APP_URL ?? 'http://localhost:3100').origin

test.describe('ログインしていない場合（このアプリはログインしないと使えない）', () => {
  test('どの画面も、戻り先つきでログイン画面へ誘導される', async ({ page }) => {
    const [store] = await myStores(readSessionToken(MEMBER_STATE))

    for (const path of ['/', `/stores/${store.id}`, `/stores/${store.id}/book`]) {
      await page.goto(path)
      await expect(page).toHaveURL(/\/login\?next=/)
      await expect(page.getByRole('heading', { name: 'ログイン', exact: true })).toBeVisible()
      // 店舗・チケット・空き枠の情報は、ログインするまで一切出ない
      await expect(page.getByText(store.name)).toHaveCount(0)
    }
  })

  test('店舗に顧客として登録されていないメールアドレスは、コードが届かず、ログインもできない', async ({ page }) => {
    const email = unregisteredEmail()
    const since = Date.now()

    await page.goto('/login')
    await page.getByLabel('メールアドレス').fill(email)
    await page.getByRole('button', { name: 'ログインコードを送る' }).click()

    // 登録済みの場合と同じ画面になる（どのメールアドレスが登録されているかを推測させない）
    await expect(page).toHaveURL(/\/login\/verify/)
    await expect(page.getByText('が店舗にご登録のメールアドレスの場合、ログインコードを送信しました')).toBeVisible()
    // 実際にはコードは送られない
    expect(await noMailArrives(email, 'ログインコード', since)).toBe(true)

    // 適当なコードでもログインできない（登録済みで誤ったコードのときと同じ文言）
    await page.getByLabel('6桁のコード').fill('123456')
    await page.getByRole('button', { name: 'ログイン', exact: true }).click()
    await expect(page.getByText('コードが正しくないか、有効期限が切れています')).toBeVisible()
    await expect(page).toHaveURL(/\/login\/verify/)
  })

  test('状態を変える API は、Origin が無い・別のオリジン・JSON 以外だと受け付けない（CSRF 対策）', async ({ request }) => {
    const body = { email: 'csrf@example.com' }
    expect((await request.post('/api/auth/request-code', { data: body })).status()).toBe(403)
    expect(
      (await request.post('/api/auth/request-code', { data: body, headers: { Origin: 'https://evil.example' } })).status(),
    ).toBe(403)
    // 別サイトのフォームから送れる形式（application/x-www-form-urlencoded）
    expect((await request.post('/api/auth/request-code', { form: body, headers: { Origin: ORIGIN } })).status()).toBe(415)
  })

  test('予約・キャンセルは、ログインしていなければ 401', async ({ request }) => {
    const headers = { Origin: ORIGIN }
    expect((await request.post('/api/reservations', { data: {}, headers })).status()).toBe(401)
    expect(
      (await request.post('/api/reservations/11111111-1111-4111-8111-111111111111/cancel', { data: {}, headers })).status(),
    ).toBe(401)
  })
})

test.describe('ログイン済み', () => {
  test.use({ storageState: MEMBER_STATE })

  test('顧客トークンは httpOnly の Cookie にだけあり、ブラウザの JavaScript からは読めない', async ({ page, context }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'ログアウト' })).toBeVisible()

    const session = (await context.cookies()).find((cookie) => cookie.name === 'rexbook_session')
    expect(session).toBeDefined()
    expect(session?.httpOnly).toBe(true)
    expect(session?.sameSite).toBe('Lax')
    expect(await page.evaluate(() => document.cookie)).not.toContain('rexbook_session')
    // ブラウザのストレージにもトークン（JWT）を置いていない
    expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toMatch(/eyJ/)
  })

  test('存在しない・形式の違う予約 ID や、使えない店舗は「ページが見つかりません」になる', async ({ page }) => {
    // 描画が先に流れ始めるため HTTP ステータスではなく、画面の表示で確認する
    for (const path of [
      '/reservations/not-a-uuid',
      '/reservations/11111111-1111-4111-8111-111111111111',
      // 顧客として登録されていない（存在しない）店舗
      '/stores/11111111-1111-4111-8111-111111111111',
      '/stores/11111111-1111-4111-8111-111111111111/book',
    ]) {
      await page.goto(path)
      await expect(page.getByText('ページが見つかりません')).toBeVisible()
    }
  })
})
