import { NextResponse } from 'next/server'
import { handleMutation } from '@/lib/bff'
import { createReservation } from '@/lib/rexcarte'
import { reservationCreateSchema } from '@/lib/schemas'

/**
 * 予約を確定する。可否の判定は RexCarte の予約ルールが行い、ここでは独自に判定しない。
 * 予約できない場合の理由（休日・埋まりなど）は区別されず、共通の文言が返る。
 */
export async function POST(request: Request) {
  return handleMutation(request, { schema: reservationCreateSchema, auth: true }, async ({ body, token }) => {
    const reservation = await createReservation(token, body)
    return NextResponse.json({ id: reservation.id }, { status: 201 })
  })
}
