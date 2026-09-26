import type { Metadata } from 'next'
import { LoginForm } from '@/components/LoginForm'
import { PageShell } from '@/components/PageShell'
import { PageTitle } from '@/components/ui'
import { safeNextPath } from '@/lib/navigation'

export const metadata: Metadata = { title: 'ログイン' }

export default async function LoginPage(props: PageProps<'/login'>) {
  const next = safeNextPath((await props.searchParams).next)

  return (
    <PageShell>
      <PageTitle sub="店舗にご登録のメールアドレスを入力してください。6桁のログインコードをメールでお送りします。パスワードは不要です。">
        ログイン
      </PageTitle>
      <LoginForm next={next} />
      <p className="mt-5 text-xs leading-relaxed text-stone-500">
        このアプリは、店舗に顧客としてご登録のある方のみご利用いただけます。コードが届かない場合は、ご登録のメールアドレスをご確認のうえ、店舗へお問い合わせください。
      </p>
    </PageShell>
  )
}
