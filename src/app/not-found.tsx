import { PageShell } from '@/components/PageShell'
import { LinkButton, Notice } from '@/components/ui'

export default function NotFound() {
  return (
    <PageShell>
      <Notice title="ページが見つかりません">
        お探しのページは存在しないか、現在ご利用いただけません。
      </Notice>
      <div className="mt-6">
        <LinkButton href="/" block>
          トップへ戻る
        </LinkButton>
      </div>
    </PageShell>
  )
}
