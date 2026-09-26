import { ADMIN, COURSE_EMAIL, REXCARTE_API_URL } from './env'

/**
 * テストの前提データの取得と、店舗側の操作（電話予約の代理入力・取り消し）を RexCarte の API で行う。
 * 予約の可否の判定は RexCarte が持つので、テストでも空き枠は RexCarte の API から取る（独自に計算しない）。
 * 顧客向けの API はログインが必要なので、保存済みのログイン状態の顧客トークンを渡す。
 */

/**
 * RexCarte の顧客向けの店舗・空き枠 API は、アカウントごとに「1 分あたり 120 回」までに制限されている。
 * E2E を続けて実行すると上限に達することがあるため、429 のときは枠が空くまで待って再試行する
 * （この上限は製品の仕様なので、テストのために緩めない）。
 */
const RATE_LIMIT_RETRY_MS = 5_000
const RATE_LIMIT_MAX_RETRIES = 14 // 合計 70 秒 ≒ 制限の 1 分間を超える

async function call<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    const response = await fetch(`${REXCARTE_API_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    })
    if (response.status === 429 && attempt < RATE_LIMIT_MAX_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_RETRY_MS))
      continue
    }
    if (!response.ok) throw new Error(`${init.method ?? 'GET'} ${path} が ${response.status}: ${await response.text()}`)
    return (await response.json()) as T
  }
}

const jstDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' })

export function todayJst(now = new Date()): string {
  return jstDate.format(now)
}

export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

/** 今日から数えて最初の日曜日（デモの渋谷店は日曜が定休日）。 */
export function nextSunday(from = todayJst()): string {
  for (let offset = 0; offset < 7; offset += 1) {
    const date = addDays(from, offset)
    const [year, month, day] = date.split('-').map(Number)
    if (new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 0) return date
  }
  throw new Error('unreachable')
}

interface StoreInfo { id: string; name: string }
interface TicketInfo { ticket_plan_id: string; plan_name: string; duration_minutes: number }
interface StaffInfo { id: string; name: string }

export interface BookableSlot {
  storeId: string
  storeName: string
  /** 使うチケットのプラン */
  planId: string
  planName: string
  staffId: string | null
  staffName: string | null
  /** JST の日付 YYYY-MM-DD */
  date: string
  /** JST の時刻 HH:MM */
  time: string
  /** +09:00 付きの開始日時 */
  startAt: string
  durationMinutes: number
}

interface FindOptions {
  /** 顧客トークン（保存済みのログイン状態から取り出す） */
  token: string
  /** 店舗名に含まれる文字。省略すると渋谷店 */
  storeName?: string
  /** 使うチケットのプラン名。省略すると「パーソナルトレーニング1回」（顧客がその店舗で持っているチケットから探す） */
  planName?: string
  /** 指名するスタッフ名。省略すると指名なしの空き枠を探す。 */
  staffName?: string
  /** 何日後以降から探すか。キャンセル期限（24 時間前）に掛からないよう 2 日以上にする。 */
  minDaysAhead?: number
  /** 見つかった時刻のうち、先頭から何番目を使うか（テスト同士で枠が重ならないようにするため）。 */
  slotIndex?: number
}

/** ログイン中の顧客が使える店舗の一覧。 */
export async function myStores(token: string): Promise<StoreInfo[]> {
  return call<StoreInfo[]>('/api/customer/stores', {}, token)
}

/** RexCarte の顧客向け API から、予約できる枠を 1 つ探す。 */
export async function findBookableSlot(options: FindOptions): Promise<BookableSlot> {
  const { token, storeName = '渋谷', planName = 'パーソナルトレーニング1回', staffName, minDaysAhead = 2, slotIndex = 0 } = options

  const store = (await myStores(token)).find((item) => item.name.includes(storeName))
  if (!store) throw new Error(`「${storeName}」を含む店舗が、このアカウントで使えません。seed_demo を実行しましたか？`)

  const ticket = (await call<TicketInfo[]>(`/api/customer/tickets?store_id=${store.id}`, {}, token)).find(
    (item) => item.plan_name === planName,
  )
  if (!ticket) throw new Error(`このアカウントが持っているチケット「${planName}」がありません。seed_demo を実行しましたか？`)

  let staff: StaffInfo | undefined
  if (staffName) {
    staff = (await call<StaffInfo[]>(`/api/customer/stores/${store.id}/staff`, {}, token)).find((item) => item.name === staffName)
    if (!staff) throw new Error(`指名できるスタッフ「${staffName}」がいません`)
  }

  const targetQuery = new URLSearchParams({ ticket_plan_id: ticket.ticket_plan_id })
  if (staff) targetQuery.set('staff_id', staff.id)

  const from = addDays(todayJst(), minDaysAhead)
  const days = await call<{ days: { date: string; available: boolean }[] }>(
    `/api/customer/stores/${store.id}/availability/days?from=${from}&to=${addDays(from, 40)}&${targetQuery}`,
    {},
    token,
  )
  for (const day of days.days.filter((item) => item.available)) {
    const { slots } = await call<{ slots: string[] }>(
      `/api/customer/stores/${store.id}/availability?date=${day.date}&${targetQuery}`,
      {},
      token,
    )
    if (slots.length > slotIndex) {
      const startAt = slots[slotIndex]
      return {
        storeId: store.id,
        storeName: store.name,
        planId: ticket.ticket_plan_id,
        planName: ticket.plan_name,
        staffId: staff?.id ?? null,
        staffName: staff?.name ?? null,
        date: day.date,
        time: startAt.slice(11, 16),
        startAt,
        durationMinutes: ticket.duration_minutes,
      }
    }
  }
  throw new Error('予約できる枠が見つかりません。seed_demo を実行し直してください')
}

// --- 店舗スタッフ側の操作 ---

export async function adminToken(): Promise<string> {
  const { access_token: token } = await call<{ access_token: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: ADMIN.email, password: ADMIN.password }),
  })
  return token
}

/**
 * 電話予約などを店舗側で代理入力する。顧客が画面を開いている間に同じ枠が埋まる状況を作るのに使う。
 * 予約はすべてチケットを使うため、チケットを持つ顧客（回数券つきのデモ顧客）の名前で入れる。
 */
export async function createStaffReservation(slot: BookableSlot): Promise<string> {
  if (!slot.staffId) throw new Error('担当スタッフを指定した枠が必要です')
  const token = await adminToken()
  const customers = await call<{ id: string; email: string | null }[]>(`/api/customers?store_id=${slot.storeId}`, {}, token)
  const customer = customers.find((item) => item.email?.toLowerCase() === COURSE_EMAIL)
  if (!customer) throw new Error(`${COURSE_EMAIL} が店舗に登録されていません`)
  const tickets = await call<{ id: string; status: string; remaining_count: number; reserved_count: number }[]>(
    `/api/customer-tickets?customer_id=${customer.id}`,
    {},
    token,
  )
  const ticket = tickets.find((item) => item.status === 'active' && item.remaining_count - item.reserved_count > 0)
  if (!ticket) throw new Error('予約に使えるチケットがありません。seed_demo を実行し直してください')
  const end = new Date(new Date(slot.startAt).getTime() + slot.durationMinutes * 60_000)
  const reservation = await call<{ id: string }>(
    '/api/reservations',
    {
      method: 'POST',
      body: JSON.stringify({
        store_id: slot.storeId,
        customer_id: customer.id,
        staff_id: slot.staffId,
        customer_ticket_id: ticket.id,
        start_at: slot.startAt,
        end_at: end.toISOString(),
        source: 'phone',
      }),
    },
    token,
  )
  return reservation.id
}

/** テストが作った店舗側の予約を取り消し、枠を空ける（次の実行に影響を残さない）。 */
export async function cancelStaffReservation(reservationId: string): Promise<void> {
  const token = await adminToken()
  await call(`/api/reservations/${reservationId}`, { method: 'PATCH', body: JSON.stringify({ status: 'cancelled' }) }, token)
}

/**
 * 顧客（メールアドレス）が Web から入れた予約のうち、確定のままのものを、全店舗ですべて取り消す。
 * テストが途中で失敗しても、枠やコースの使える回数を次の実行に残さないための後片付け。
 * 直前の予約は顧客自身ではキャンセルできないため、店舗側（管理者）の操作で取り消す。
 */
export async function cancelWebReservationsOf(email: string): Promise<void> {
  const token = await adminToken()
  const stores = await call<StoreInfo[]>('/api/stores', {}, token)
  for (const store of stores) {
    const customers = await call<{ id: string; email: string | null }[]>(`/api/customers?store_id=${store.id}`, {}, token)
    const customer = customers.find((item) => item.email?.toLowerCase() === email.toLowerCase())
    if (!customer) continue

    const reservations = await call<{ id: string; status: string; source: string }[]>(
      `/api/reservations?store_id=${store.id}&customer_id=${customer.id}`,
      {},
      token,
    )
    for (const reservation of reservations.filter((item) => item.source === 'web' && item.status === 'confirmed')) {
      await call(`/api/reservations/${reservation.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'cancelled' }) }, token)
    }
  }
}

/**
 * 店頭でチケットを購入した想定で、スタッフがシステムに反映する（店舗側の操作）。
 * 顧客（メールアドレス）に、その店舗のチケットプランを 1 枚付与する。
 */
export async function grantTicket(email: string, planName: string, storeName = '渋谷'): Promise<void> {
  const token = await adminToken()
  const store = (await call<StoreInfo[]>('/api/stores', {}, token)).find((item) => item.name.includes(storeName))
  if (!store) throw new Error(`「${storeName}」を含む店舗がありません`)

  const customers = await call<{ id: string; email: string | null }[]>(`/api/customers?store_id=${store.id}`, {}, token)
  const customer = customers.find((item) => item.email?.toLowerCase() === email.toLowerCase())
  if (!customer) throw new Error(`${email} は ${store.name} に顧客として登録されていません`)

  const plans = await call<{ id: string; name: string }[]>(`/api/ticket-plans?store_id=${store.id}`, {}, token)
  const plan = plans.find((item) => item.name === planName)
  if (!plan) throw new Error(`チケットプラン「${planName}」がありません`)

  await call('/api/customer-tickets', { method: 'POST', body: JSON.stringify({ customer_id: customer.id, ticket_plan_id: plan.id }) }, token)
}

// --- 事業者設定（店舗管理者の操作） ---

export interface BusinessSettingsInput {
  business_name?: string | null
  mail_from_name?: string | null
  mail_reply_to?: string | null
  templates?: Record<string, { subject: string; body: string } | null>
}

export async function updateBusinessSettings(input: BusinessSettingsInput): Promise<void> {
  await call('/api/business-settings', { method: 'PUT', body: JSON.stringify(input) }, await adminToken())
}

/** 1x1 の PNG（アイコンの表示確認用）。 */
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

export async function uploadBusinessIcon(): Promise<void> {
  await call('/api/business-settings/icon', { method: 'PUT', body: JSON.stringify({ content_type: 'image/png', data_base64: TINY_PNG_BASE64 }) }, await adminToken())
}

/** 事業者設定を初期状態（名前・アイコン・送信者・文面すべて既定）に戻す。 */
export async function resetBusinessSettings(): Promise<void> {
  const token = await adminToken()
  await call('/api/business-settings/icon', { method: 'DELETE' }, token)
  await call(
    '/api/business-settings',
    {
      method: 'PUT',
      body: JSON.stringify({
        business_name: null,
        mail_from_name: null,
        mail_reply_to: null,
        templates: { login_code: null, reservation_confirmed: null, reservation_cancelled: null },
      }),
    },
    token,
  )
}
