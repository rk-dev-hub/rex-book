/**
 * 状態を変える操作（予約確定・キャンセル・ログアウトなど）を受ける前に、リクエストの Origin を確認する。
 * Cookie は SameSite=Lax だが、これに加えて Origin を検証して CSRF を二重に防ぐ（docs/02-architecture.md §3.3）。
 */
export function isAllowedOrigin(origin: string | null, appUrl: string): boolean {
  if (!origin) return false
  try {
    return new URL(origin).origin === new URL(appUrl).origin
  } catch {
    // "null"（サンドボックス化された iframe など）や不正な値
    return false
  }
}
