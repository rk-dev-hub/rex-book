import { describe, expect, it } from 'vitest'
import { isAllowedOrigin } from '@/lib/origin'

const APP_URL = 'http://localhost:3100'

describe('isAllowedOrigin', () => {
  it('アプリ自身の Origin は許可する', () => {
    expect(isAllowedOrigin('http://localhost:3100', APP_URL)).toBe(true)
    // APP_URL の末尾のスラッシュは Origin の比較に影響しない
    expect(isAllowedOrigin('http://localhost:3100', 'http://localhost:3100/')).toBe(true)
  })

  it('別のオリジンは拒否する', () => {
    expect(isAllowedOrigin('https://evil.example', APP_URL)).toBe(false)
    expect(isAllowedOrigin('http://localhost:3000', APP_URL)).toBe(false)
    expect(isAllowedOrigin('https://localhost:3100', APP_URL)).toBe(false)
    expect(isAllowedOrigin('http://localhost:3100.evil.example', APP_URL)).toBe(false)
  })

  it('Origin が無い・不正なリクエストは拒否する', () => {
    expect(isAllowedOrigin(null, APP_URL)).toBe(false)
    expect(isAllowedOrigin('null', APP_URL)).toBe(false)
    expect(isAllowedOrigin('', APP_URL)).toBe(false)
  })
})
