import { getEnv } from '@/lib/env'

/**
 * 事業者のアイコン画像を RexCarte から取ってきて返す（ブラウザは RexCarte を直接呼ばないため）。
 * 画像は公開してよい情報なのでログインなしで見られ、ログイン画面のヘッダーにも使う。
 * URL の `?v=` はアイコンを差し替えたときにキャッシュを更新するための値。
 */
export async function GET() {
  try {
    const response = await fetch(new URL('/api/customer/branding/icon', getEnv().REXCARTE_API_URL), {
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) return new Response(null, { status: 404 })
    return new Response(response.body, {
      headers: {
        'Content-Type': response.headers.get('content-type') ?? 'image/png',
        'Cache-Control': 'public, max-age=300',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return new Response(null, { status: 404 })
  }
}
