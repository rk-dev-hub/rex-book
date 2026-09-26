import { MAILPIT_URL } from './env'

interface MailpitMessage {
  ID: string
  Subject: string
  Created: string
}

const POLL_INTERVAL_MS = 500

async function searchMessages(email: string): Promise<MailpitMessage[]> {
  const query = encodeURIComponent(`to:${email}`)
  const response = await fetch(`${MAILPIT_URL}/api/v1/search?query=${query}&limit=20`)
  if (!response.ok) throw new Error(`Mailpit の検索に失敗しました (${response.status})。RexCarte の compose を起動していますか？`)
  const body = (await response.json()) as { messages?: MailpitMessage[] }
  return body.messages ?? []
}

/**
 * 宛先に、件名に subjectPart を含むメールが届くまで待ち、その本文（テキスト）を返す。
 * since（ms）より前に届いたメールは無視する（過去の実行で届いた古いコードを拾わないため）。
 */
export async function waitForMail(email: string, subjectPart: string, since: number, timeoutMs = 20_000): Promise<string> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const found = (await searchMessages(email)).find(
      (message) => message.Subject.includes(subjectPart) && new Date(message.Created).getTime() >= since - 2000,
    )
    if (found) {
      const response = await fetch(`${MAILPIT_URL}/api/v1/message/${found.ID}`)
      const detail = (await response.json()) as { Text: string }
      return detail.Text
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
  }
  throw new Error(`${email} 宛の「${subjectPart}」メールが ${timeoutMs}ms 以内に届きませんでした`)
}

/** ログイン用の 6 桁コード。 */
export async function waitForLoginCode(email: string, since: number): Promise<string> {
  const body = await waitForMail(email, 'ログインコード', since)
  const match = body.match(/\b(\d{6})\b/)
  if (!match) throw new Error('メール本文に 6 桁のコードが見つかりません')
  return match[1]
}

/** 指定の時間内に、その宛先へ件名に subjectPart を含むメールが「届かない」ことを確認する。 */
export async function noMailArrives(email: string, subjectPart: string, since: number, waitMs = 3_000): Promise<boolean> {
  const deadline = Date.now() + waitMs
  while (Date.now() < deadline) {
    const arrived = (await searchMessages(email)).some(
      (message) => message.Subject.includes(subjectPart) && new Date(message.Created).getTime() >= since - 2000,
    )
    if (arrived) return false
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
  }
  return true
}

interface MailAddress {
  Name: string
  Address: string
}

export interface MailDetail {
  Subject: string
  Text: string
  From: MailAddress
  ReplyTo: MailAddress[] | null
}

/** 件名に subjectPart を含むメールが届くまで待ち、送信者・返信先を含む詳細を返す。 */
export async function waitForMailDetail(email: string, subjectPart: string, since: number, timeoutMs = 20_000): Promise<MailDetail> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const found = (await searchMessages(email)).find(
      (message) => message.Subject.includes(subjectPart) && new Date(message.Created).getTime() >= since - 2000,
    )
    if (found) return (await (await fetch(`${MAILPIT_URL}/api/v1/message/${found.ID}`)).json()) as MailDetail
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
  }
  throw new Error(`${email} 宛の「${subjectPart}」メールが ${timeoutMs}ms 以内に届きませんでした`)
}
