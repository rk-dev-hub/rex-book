import type { Metadata } from 'next'
import { PageShell } from '@/components/PageShell'
import { StoreSwitcher } from '@/components/StoreSwitcher'
import { Card, LinkButton, PageTitle } from '@/components/ui'
import { requireAccount } from '@/lib/auth'
import { businessHoursRows } from '@/lib/hours'
import { getMyStores } from '@/lib/rexcarte'
import { loadStore } from '@/lib/loaders'

export const metadata: Metadata = { title: '店舗情報' }

/**
 * 店舗情報（住所・電話番号・曜日ごとの営業時間）。予約はホームの「予約する」から、
 * お持ちのチケットを使って行うため、ここには予約の選択肢は置かない。
 */
export default async function StorePage(props: PageProps<'/stores/[storeId]'>) {
  const { storeId } = await props.params
  const { token } = await requireAccount(`/stores/${storeId}`)
  const [store, stores] = await Promise.all([loadStore(token, storeId), getMyStores(token)])

  return (
    <PageShell>
      <StoreSwitcher stores={stores} currentId={store.id} target="store" />
      <PageTitle>{store.name}</PageTitle>

      <Card>
        <dl className="space-y-3 text-sm">
          {store.address && (
            <div>
              <dt className="font-semibold text-stone-500">住所</dt>
              <dd className="text-stone-800">{store.address}</dd>
            </div>
          )}
          {store.phone && (
            <div>
              <dt className="font-semibold text-stone-500">電話番号</dt>
              <dd>
                {/* タップでそのまま発信できるようにする */}
                <a href={`tel:${store.phone}`} className="font-semibold text-wine-800 underline">
                  {store.phone}
                </a>
              </dd>
            </div>
          )}
          <div>
            <dt className="font-semibold text-stone-500">営業時間</dt>
            <dd>
              <table className="mt-1 text-stone-800">
                <tbody>
                  {businessHoursRows(store.business_hours).map((row) => (
                    <tr key={row.weekday}>
                      <th scope="row" className="w-10 py-0.5 text-left font-medium">
                        {row.label}
                      </th>
                      <td className="py-0.5">{row.text}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </dd>
          </div>
        </dl>
      </Card>

      <div className="mt-6">
        <LinkButton href={`/stores/${store.id}/book`} block>
          予約する
        </LinkButton>
      </div>
    </PageShell>
  )
}
