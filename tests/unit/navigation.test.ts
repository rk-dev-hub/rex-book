import { describe, expect, it } from 'vitest'
import { loginHref, safeNextPath } from '@/lib/navigation'

describe('safeNextPath', () => {
  it('アプリ内の相対パスはそのまま通す', () => {
    expect(safeNextPath('/stores/abc/book?menu=1&staff=any')).toBe('/stores/abc/book?menu=1&staff=any')
    expect(safeNextPath('/reservations/abc')).toBe('/reservations/abc')
  })

  it('未指定・空は既定値（ホーム）にする', () => {
    expect(safeNextPath(undefined)).toBe('/')
    expect(safeNextPath('')).toBe('/')
    expect(safeNextPath(null, '/stores/abc')).toBe('/stores/abc')
  })

  it('配列で渡されたら先頭だけを見る', () => {
    expect(safeNextPath(['/reservations/abc', 'https://evil.example'])).toBe('/reservations/abc')
  })

  it('外部サイトへのリダイレクト（オープンリダイレクト）を拒否する', () => {
    const backslash = String.fromCharCode(92)
    for (const value of [
      'https://evil.example',
      '//evil.example',
      `/${backslash}evil.example`,
      'javascript:alert(1)',
      'evil.example',
      '/redirect?to=https://evil.example',
    ]) {
      expect(safeNextPath(value)).toBe('/')
    }
  })

  it('改行などの制御文字を含む値を拒否する', () => {
    const crlf = String.fromCharCode(13, 10)
    const nul = String.fromCharCode(0)
    expect(safeNextPath(`/reservations${crlf}Set-Cookie: a=b`)).toBe('/')
    expect(safeNextPath(`/reservations${nul}`)).toBe('/')
  })

  it('API・ログイン画面には戻さない（ループ防止）', () => {
    expect(safeNextPath('/api/reservations')).toBe('/')
    expect(safeNextPath('/login')).toBe('/')
    expect(safeNextPath('/login/verify')).toBe('/')
  })
})

describe('loginHref', () => {
  it('遷移先を URL エンコードして付ける', () => {
    expect(loginHref('/stores/a/book?menu=1&staff=any')).toBe(
      '/login?next=%2Fstores%2Fa%2Fbook%3Fmenu%3D1%26staff%3Dany',
    )
    expect(loginHref()).toBe('/login')
  })
})
