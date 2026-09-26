import { NextResponse } from 'next/server'
import { handleMutation } from '@/lib/bff'
import { emptySchema } from '@/lib/schemas'
import { clearSessionToken } from '@/lib/session'

export async function POST(request: Request) {
  return handleMutation(request, { schema: emptySchema }, async () => {
    await clearSessionToken()
    return NextResponse.json({})
  })
}
