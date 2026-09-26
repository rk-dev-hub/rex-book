import { expect, test } from '@playwright/test'
import { NO_TICKET_EMAIL } from './helpers/env'
import { resetBusinessSettings, updateBusinessSettings, uploadBusinessIcon } from './helpers/rexcarte'
import { waitForMailDetail } from './helpers/mailpit'

const ORIGIN = new URL(process.env.APP_URL ?? 'http://localhost:3100').origin

/**
 * 導入先の事業者の設定（RexCarte の「事業者設定」）が、予約アプリのヘッダー・タブのタイトルと、
 * 顧客に送るメール（送信者名・返信先・件名・本文）に反映される。
 */
test('事業者名・アイコンがヘッダーに、送信者・文面がログインコードのメールに反映される', async ({ page }) => {
  const since = Date.now()
  try {
    await updateBusinessSettings({
      business_name: 'サロン ハナ',
      mail_from_name: 'サロン ハナ 予約係',
      mail_reply_to: 'info@example.com',
      templates: {
        login_code: { subject: '【{business_name}】ログインコードのお知らせ', body: 'コード: {code}\nこのコードは{expires_minutes}分間有効です。' },
      },
    })
    await uploadBusinessIcon()

    // ログイン前の画面にも、事業者名・アイコン・タイトルが出る
    await page.goto('/login')
    const header = page.getByRole('banner')
    await expect(header.getByText('サロン ハナ', { exact: true })).toBeVisible()
    await expect(header.getByText('RexBook', { exact: true })).toHaveCount(0)
    const icon = header.locator('img')
    await expect(icon).toBeVisible()
    await expect.poll(() => icon.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)
    await expect(page).toHaveTitle(/サロン ハナ/)

    // ログインコードのメールが、設定した送信者・返信先・件名・本文で届く
    const requested = await page.request.post('/api/auth/request-code', { data: { email: NO_TICKET_EMAIL }, headers: { Origin: ORIGIN } })
    expect(requested.status()).toBe(202)
    const mail = await waitForMailDetail(NO_TICKET_EMAIL, 'ログインコードのお知らせ', since)
    expect(mail.Subject).toBe('【サロン ハナ】ログインコードのお知らせ')
    expect(mail.Text).toMatch(/コード: \d{6}/)
    expect(mail.Text).toContain('10分間有効')
    expect(mail.From.Name).toBe('サロン ハナ 予約係')
    expect(mail.ReplyTo?.[0]?.Address).toBe('info@example.com')
  } finally {
    await resetBusinessSettings()
  }

  // 初期状態に戻すと、また RexBook と表示される
  await page.goto('/login')
  await expect(page.getByRole('banner').getByText('RexBook', { exact: true })).toBeVisible()
  await expect(page.getByRole('banner').locator('img')).toHaveCount(0)
})
