import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { PageShell } from '@/components/PageShell'
import { PageTitle } from '@/components/ui'
import { VerifyForm } from '@/components/VerifyForm'
import { loginHref, safeNextPath } from '@/lib/navigation'
import { getLoginEmail } from '@/lib/session'

export const metadata: Metadata = { title: 'コードの入力' }

export default async function VerifyPage(props: PageProps<'/login/verify'>) {
  const next = safeNextPath((await props.searchParams).next)
  const email = await getLoginEmail()
  // コードを送っていない（または Cookie が切れた）場合は、メールアドレスの入力からやり直す
  if (!email) redirect(loginHref(next))

  return (
    <PageShell>
      <PageTitle>コードの入力</PageTitle>
      <VerifyForm email={email} next={next} />
    </PageShell>
  )
}
