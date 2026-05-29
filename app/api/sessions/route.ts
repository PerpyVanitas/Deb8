import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const createSessionSchema = z.object({
  motion_id: z.string().min(1),
  role: z.string().min(1).max(80),
  format: z.string().min(1).max(160),
})

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = createSessionSchema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid session payload' }, { status: 400 })
  }

  const { motion_id, role, format } = body.data
  const { data, error } = await supabase
    .from('debate_sessions')
    .insert({ user_id: user.id, motion_id, role, format })
    .select().single()

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json(data)
}
