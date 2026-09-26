/**
 * E2E の接続先。既定値はローカルの Docker（RexCarte の `docker compose --profile app up` と
 * このリポジトリの `docker compose --profile app up`）に合わせてある。
 */
export const APP_URL = process.env.APP_URL ?? 'http://localhost:3100'
export const REXCARTE_API_URL = process.env.REXCARTE_API_URL ?? 'http://localhost:8000'
export const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://localhost:8025'

/** 店舗側の操作（電話予約の代理入力など）に使う管理者。RexCarte の seed の既定値。 */
export const ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL ?? 'admin@example.com',
  password: process.env.E2E_ADMIN_PASSWORD ?? 'admin12345',
}

/**
 * seed_demo が作る、店舗に顧客として登録済みのメールアドレス。
 * このアプリは店舗に顧客として登録されている人だけが使える（登録のないメールアドレスにはコードが届かない）。
 */
export const COURSE_EMAIL = 'customer@example.com' // 渋谷店・ダイエット1ヶ月コースとトレーニング＋ストレッチ1回
export const MEMBER_EMAIL = 'member@example.com' // 渋谷店・パーソナルトレーニング1回を 2 枚（状態を使い回すテスト用）
export const MULTI_EMAIL = 'multi@example.com' // 渋谷店と新宿店の 2 店舗に登録
export const UI_LOGIN_EMAIL = 'nocourse@example.com' // 渋谷店・チケットなし（画面からログインし、店頭購入の反映を確かめるテスト用）
export const NO_TICKET_EMAIL = 'noticket@example.com' // 渋谷店・チケットなし（付与しない。チケットがないときの案内を確かめる）
export const NO_PHONE_EMAIL = 'nophone@example.com' // 渋谷店・電話番号が未登録（お客様自身では変更できない）

/** 店舗に登録されていないメールアドレス（毎回別のもの）。 */
export function unregisteredEmail(): string {
  return `unregistered-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`
}
