import { z } from 'zod'

/**
 * 入力の検証。ブラウザのフォームと BFF（Route Handler）で同じものを使う。
 * RexCarte 側でも検証されるが、分かりやすい文言を早く返すためにここでも確認する。
 */

// スマートフォンの全角入力に備えて、半角へ正規化（NFKC）して前後の空白を除いてから検証する
const normalizedText = z.string().transform((value) => value.normalize('NFKC').trim())

export const emailSchema = normalizedText
  .pipe(z.string().min(1, 'メールアドレスを入力してください'))
  .pipe(z.email('メールアドレスの形式が正しくありません'))
  .pipe(z.string().max(255, 'メールアドレスが長すぎます'))
  .transform((value) => value.toLowerCase())

export const codeSchema = normalizedText.pipe(z.string().regex(/^\d{6}$/, '6桁の数字を入力してください'))

export const reservationCreateSchema = z.object({
  storeId: z.uuid(),
  /** +09:00 付きの ISO 8601（JST） */
  startAt: z.iso.datetime({ offset: true }),
  /** 使うチケット（単発・回数券）のプラン */
  ticketPlanId: z.uuid(),
  /** 指名なしは null */
  staffId: z.uuid().nullable(),
  notes: z
    .string()
    .trim()
    .max(500, 'ご要望は500文字以内で入力してください')
    .optional()
    .transform((value) => value || undefined),
})

export const emptySchema = z.object({})

export type ReservationCreateInput = z.infer<typeof reservationCreateSchema>
