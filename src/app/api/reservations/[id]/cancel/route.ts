import { NextResponse } from 'next/server'
import { handleMutation, jsonError } from '@/lib/bff'
import { cancelReservation } from '@/lib/rexcarte'
import { emptySchema } from '@/lib/schemas'
import { z } from 'zod'

const NOT_FOUND = '予約が見つかりません'

export async function POST(request: Request, context: RouteContext<'/api/reservations/[id]/cancel'>) {
  const { id } = await context.params
  return handleMutation(request, { schema: emptySchema, auth: true }, async ({ token }) => {
    // 形式の違う ID は RexCarte に渡さず、存在しない予約と同じ扱いにする
    if (!z.uuid().safeParse(id).success) return jsonError(NOT_FOUND, 404)
    await cancelReservation(token, id)
    return NextResponse.json({})
  })
}
