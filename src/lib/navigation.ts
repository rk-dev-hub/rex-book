const DEFAULT_NEXT = '/'

/** 改行などの制御文字（ヘッダー注入・URL の偽装に使われうる）を含むか。 */
function hasControlCharacter(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i)
    if (code < 32 || code === 127) return true
  }
  return false
}

/**
 * ログイン後などに戻る先（`?next=`）を検証する。
 * 外部サイトへ飛ばされるオープンリダイレクトを防ぐため、このアプリ内の相対パスだけを許可する。
 */
export function safeNextPath(raw: string | string[] | null | undefined, fallback: string = DEFAULT_NEXT): string {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!value) return fallback
  // 制御文字・バックスラッシュ・スキーム付き・プロトコル相対（//host）は拒否する
  if (hasControlCharacter(value) || value.includes('\\')) return fallback
  if (!value.startsWith('/') || value.startsWith('//')) return fallback
  if (value.includes('://')) return fallback
  // ログイン画面・API へ戻すとループや意図しない挙動になるため、画面のパスに限る
  if (value.startsWith('/api/') || value === '/api' || value.startsWith('/login')) return fallback
  return value
}

export function loginHref(next?: string): string {
  return next ? `/login?next=${encodeURIComponent(next)}` : '/login'
}

export function verifyHref(next?: string): string {
  return next ? `/login/verify?next=${encodeURIComponent(next)}` : '/login/verify'
}
