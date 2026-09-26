import 'server-only'

import { headers } from 'next/headers'
import { getEnv } from './env'
import type {
  Availability,
  AvailabilityDays,
  CustomerAccount,
  CustomerReservation,
  CustomerTicket,
  StoreStaff,
  StoreSummary,
  StoreDetail,
} from './types'

/**
 * RexCarte API のクライアント（サーバー専用）。
 * ブラウザは RexCarte を直接呼ばず、Next.js のサーバー側（Server Component / Route Handler）だけが呼ぶ。
 * そのため RexCarte の URL はブラウザに出ず、CORS の設定も要らない。
 */

const REQUEST_TIMEOUT_MS = 10_000

const GENERIC_ERROR = '通信に失敗しました。時間をおいて再度お試しください'

export class RexCarteError extends Error {
  /** RexCarte が返した、顧客に見せてよい文言（文字列のときだけ）。 */
  readonly detail: string | null

  constructor(
    readonly status: number,
    detail: string | null,
  ) {
    super(detail ?? `RexCarte API error (${status})`)
    this.name = 'RexCarteError'
    this.detail = detail
  }

  /** 認証切れ（トークンの期限切れ・無効）。 */
  get isUnauthorized(): boolean {
    return this.status === 401
  }

  get isNotFound(): boolean {
    return this.status === 404
  }

  /** 顧客に見せる文言。RexCarte は理由を区別しない共通文言を返すので、文字列ならそのまま使う。 */
  get publicMessage(): string {
    if (this.detail && this.status >= 400 && this.status < 500) return this.detail
    if (this.status === 422) return 'ご入力内容をご確認ください'
    return GENERIC_ERROR
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT'
  token?: string | null
  query?: Record<string, string | undefined>
  body?: unknown
}

/**
 * 接続元の IP アドレス。RexCarte は IP 単位で回数制限をかけるため、BFF が代わりに呼ぶ場合は
 * 実際の利用者の IP を渡さないと、全利用者が BFF の 1 つの IP として数えられてしまう。
 * RexCarte 側で FORWARDED_ALLOW_IPS に BFF の送信元を指定したときだけ、この値が使われる。
 */
async function clientIp(): Promise<string | null> {
  try {
    const incoming = await headers()
    const real = incoming.get('x-real-ip')
    if (real) return real.trim()
    const forwarded = incoming.get('x-forwarded-for')
    return forwarded ? (forwarded.split(',')[0]?.trim() ?? null) : null
  } catch {
    // リクエストの外（ビルド時など）で呼ばれた場合
    return null
  }
}

function extractDetail(payload: unknown): string | null {
  if (payload && typeof payload === 'object' && 'detail' in payload) {
    const { detail } = payload as { detail: unknown }
    // FastAPI の入力検証エラーは配列で返るため、顧客には見せない
    return typeof detail === 'string' ? detail : null
  }
  return null
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', token, query, body } = options
  const url = new URL(path, getEnv().REXCARTE_API_URL)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, value)
  }

  const requestHeaders: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) requestHeaders['Content-Type'] = 'application/json'
  if (token) requestHeaders.Authorization = `Bearer ${token}`
  const ip = await clientIp()
  if (ip) requestHeaders['X-Forwarded-For'] = ip

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      // 空き枠や予約は常に最新でなければならない
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch {
    // 接続できない・タイムアウト
    throw new RexCarteError(503, null)
  }

  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null)
    throw new RexCarteError(response.status, extractDetail(payload))
  }
  return (await response.json()) as T
}

// --- 店舗・スタッフ・空き枠（ログイン必須。自分が顧客として登録されている店舗だけ扱える） ---

/** ログイン中の顧客が使える店舗（顧客として登録されている店舗）。 */
export function getMyStores(token: string): Promise<StoreSummary[]> {
  return request('/api/customer/stores', { token })
}

export function getStore(token: string, storeId: string): Promise<StoreDetail> {
  return request(`/api/customer/stores/${storeId}`, { token })
}

export function getStoreStaff(token: string, storeId: string): Promise<StoreStaff[]> {
  return request(`/api/customer/stores/${storeId}/staff`, { token })
}

/** 予約の対象。使うチケットのプランと、指名するスタッフ（指名なしは undefined）。 */
export interface AvailabilityTarget {
  ticketPlanId: string
  staffId?: string
}

function targetQuery(target: AvailabilityTarget): Record<string, string | undefined> {
  return { ticket_plan_id: target.ticketPlanId, staff_id: target.staffId }
}

export function getAvailability(
  token: string,
  storeId: string,
  date: string,
  target: AvailabilityTarget,
): Promise<Availability> {
  return request(`/api/customer/stores/${storeId}/availability`, {
    token,
    query: { date, ...targetQuery(target) },
  })
}

export function getAvailabilityDays(
  token: string,
  storeId: string,
  range: { from: string; to: string },
  target: AvailabilityTarget,
): Promise<AvailabilityDays> {
  return request(`/api/customer/stores/${storeId}/availability/days`, {
    token,
    query: { from: range.from, to: range.to, ...targetQuery(target) },
  })
}

// --- 顧客認証 ---

export function requestLoginCode(email: string): Promise<{ status: string }> {
  return request('/api/customer/auth/request-code', { method: 'POST', body: { email } })
}

export function verifyLoginCode(email: string, code: string): Promise<{ access_token: string }> {
  return request('/api/customer/auth/verify', { method: 'POST', body: { email, code } })
}

// --- 事業者の表示（ログイン前でも読める。公開してよい名前とアイコンの有無だけ） ---

export interface Branding {
  name: string
  hasIcon: boolean
  /** アイコンを差し替えたら変わる値（画像のキャッシュ更新用） */
  iconVersion: string | null
}

export const DEFAULT_BRANDING: Branding = { name: 'RexBook', hasIcon: false, iconVersion: null }

/**
 * ヘッダー・タイトルに出す事業者名とアイコン（RexCarte の事業者設定）。
 * 表示のためだけなので、取得できなくてもページ全体は表示できるよう、既定（RexBook）に戻す。
 */
export async function getBranding(): Promise<Branding> {
  try {
    const data = await request<{ business_name: string; has_icon: boolean; icon_version: string | null }>(
      '/api/customer/branding',
    )
    return { name: data.business_name, hasIcon: data.has_icon, iconVersion: data.icon_version }
  } catch {
    return DEFAULT_BRANDING
  }
}

// --- 顧客 API（顧客トークンが必要） ---

export function getMe(token: string): Promise<CustomerAccount> {
  return request('/api/customer/me', { token })
}

export function getMyTickets(token: string, storeId?: string): Promise<CustomerTicket[]> {
  return request('/api/customer/tickets', { token, query: { store_id: storeId } })
}

export function getMyReservations(token: string): Promise<CustomerReservation[]> {
  return request('/api/customer/reservations', { token })
}

export interface CreateReservationInput {
  storeId: string
  startAt: string
  ticketPlanId: string
  staffId: string | null
  notes?: string
}

export function createReservation(token: string, input: CreateReservationInput): Promise<CustomerReservation> {
  return request('/api/customer/reservations', {
    method: 'POST',
    token,
    body: {
      store_id: input.storeId,
      start_at: input.startAt,
      ticket_plan_id: input.ticketPlanId,
      staff_id: input.staffId,
      notes: input.notes,
    },
  })
}

export function cancelReservation(token: string, reservationId: string): Promise<CustomerReservation> {
  return request(`/api/customer/reservations/${reservationId}/cancel`, { method: 'POST', token, body: {} })
}
