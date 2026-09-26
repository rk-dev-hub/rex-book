// RexCarte の公開 API・顧客 API のレスポンス（../rex-carte/backend/app/schemas/public.py・customer_portal.py と対応）

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export interface DayHours {
  open: string // "HH:MM"
  close: string // "HH:MM"
}

/** 値が null の曜日は定休日、キーが無い曜日は未設定。 */
export type BusinessHours = Partial<Record<Weekday, DayHours | null>>

export interface BookingSettings {
  slot_interval_minutes: number
  min_lead_minutes: number
  max_advance_days: number
  cancel_deadline_hours: number
}

export interface StoreSummary {
  id: string
  name: string
  address: string | null
  phone: string | null
}

export interface StoreDetail extends StoreSummary {
  business_hours: BusinessHours | null
  booking_settings: BookingSettings
}

export interface StoreStaff {
  id: string
  name: string
}

export interface Availability {
  date: string
  /** 開始時刻（+09:00 付きの ISO 8601）だけを返す。どのスタッフが空いているかは分からない。 */
  slots: string[]
}

export interface AvailabilityDays {
  days: { date: string; available: boolean }[]
}

export interface CustomerAccount {
  id: string
  email: string
  name: string | null
  name_kana: string | null
  phone: string | null
  last_login_at: string | null
  profile_completed: boolean
}

export interface CustomerTicket {
  id: string
  store_id: string
  store_name: string
  ticket_plan_id: string
  plan_name: string
  duration_minutes: number
  /** 購入時の回数。1 なら単発、2 以上なら回数券 */
  total_count: number
  remaining_count: number
  /** 新しい予約に使える回数（残回数 − 確定済みの予約で利用予定の回数） */
  bookable_count: number
  expires_at: string | null
}

export type ReservationStatus = 'confirmed' | 'completed' | 'cancelled' | 'no_show'

export interface CustomerReservation {
  id: string
  store_id: string
  store_name: string
  store_phone: string | null
  start_at: string
  end_at: string
  status: ReservationStatus
  ticket_plan_name: string | null
  staff_name: string | null
  cancellable: boolean
}
