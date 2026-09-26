import type { Metadata, Viewport } from 'next'
import { getBranding } from '@/lib/rexcarte'
import './globals.css'

/** ブラウザのタブのタイトルにも、導入先の事業者名を使う（RexCarte の事業者設定）。 */
export async function generateMetadata(): Promise<Metadata> {
  const { name } = await getBranding()
  return {
    title: { default: name, template: `%s | ${name}` },
    description: '空き枠を見て、そのまま予約できます',
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#83203b',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  )
}
