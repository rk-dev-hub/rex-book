import { existsSync } from 'node:fs'
import { type Browser, expect, test as setup } from '@playwright/test'
import { COURSE_EMAIL, MEMBER_EMAIL, MULTI_EMAIL } from './helpers/env'
import { loginViaApi } from './helpers/login'
import { COURSE_STATE, MEMBER_STATE, MULTI_STATE } from './helpers/state'

/**
 * ログイン状態（Cookie）を作って保存し、各テストで使い回す。
 *
 * ログインできるのは、店舗に顧客として登録済みのメールアドレスだけ（seed_demo が用意する）。
 * RexCarte はログインコードの送信に「同じメールアドレス宛は 10 分に 3 回」「同じ接続元 IP は 10 分に 10 回」の
 * 回数制限をかけている（製品の仕様）。テストのたびにログインするとすぐ上限に達するため、
 *   - 保存済みの状態がまだ有効（顧客トークンは 7 日有効）ならそれを使い、
 *   - 無効（期限切れ・seed_demo でアカウントが作り直された等）のときだけログインし直す。
 * ログインの画面操作そのもの（メール → コード）は booking-flow.spec.ts で通しで確認する。
 */

/** 保存済みの状態でホームを開き、ログイン画面へ戻されなければ有効とみなす。 */
async function isStillValid(browser: Browser, baseURL: string | undefined, statePath: string): Promise<boolean> {
  if (!existsSync(statePath)) return false

  const context = await browser.newContext({ baseURL, storageState: statePath })
  try {
    const page = await context.newPage()
    await page.goto('/')
    const home = page.getByRole('button', { name: 'ログアウト' })
    const login = page.getByRole('heading', { name: 'ログイン', exact: true })
    // 無効な Cookie が残っていると、ログイン画面のヘッダーにもログアウトが出るため、ログイン画面かどうかで判断する
    await expect(home.or(login).first()).toBeVisible()
    return !(await login.isVisible())
  } finally {
    await context.close()
  }
}

const PERSONAS = [
  { title: 'コースを持つ顧客（渋谷店）でログインする', email: COURSE_EMAIL, state: COURSE_STATE },
  { title: 'コースを持たない顧客（渋谷店）でログインする', email: MEMBER_EMAIL, state: MEMBER_STATE },
  { title: '2 店舗に登録されている顧客でログインする', email: MULTI_EMAIL, state: MULTI_STATE },
]

for (const persona of PERSONAS) {
  setup(persona.title, async ({ page, browser, baseURL }) => {
    if (await isStillValid(browser, baseURL, persona.state)) return

    await loginViaApi(page, persona.email)
    await page.context().storageState({ path: persona.state })
  })
}
