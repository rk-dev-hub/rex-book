import { type Page, expect } from '@playwright/test'

/**
 * 日付タブを選び、画面が切り替わるのを待つ。
 * 待たずに時刻を押すと、切り替え前（別の日）の時刻を押してしまうことがある。
 */
export async function chooseDate(page: Page, isoDate: string): Promise<void> {
  const [, month, day] = isoDate.split('-').map(Number)
  const tab = () => page.getByRole('navigation', { name: '日付' }).getByRole('link', { name: new RegExp(`${month}/${day}\\(`) })

  await tab().click()
  await expect(page).toHaveURL(new RegExp(`date=${isoDate}`))
  await expect(tab()).toHaveAttribute('aria-current', 'date')
}
