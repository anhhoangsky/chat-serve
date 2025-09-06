import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { jsonError } from '@/lib/http';

const schema = z.object({
  targetId: z.string().uuid(),
  type: z.enum(['like', 'superlike', 'pass']),
});

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if ('error' in auth) return jsonError(auth.error.status, 'unauthorized', auth.error.message);
  const { supabase, user } = auth;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(400, 'invalid_request', parsed.error.message);
  const { error } = await supabase.from('likes').upsert({
    liker_id: user.id,
    target_id: parsed.data.targetId,
    type: parsed.data.type,
  });
  if (error) return jsonError(400, 'like_failed', error.message);
  // check if match exists
  const { data: match } = await supabase
    .from('matches')
    .select('id')
    .or(
      `and(user_a.eq.${user.id},user_b.eq.${parsed.data.targetId}),and(user_a.eq.${parsed.data.targetId},user_b.eq.${user.id})`
    )
    .maybeSingle();
  return NextResponse.json({ matched: !!match });
}
