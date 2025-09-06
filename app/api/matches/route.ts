import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { jsonError } from '@/lib/http';

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if ('error' in auth) return jsonError(auth.error.status, 'unauthorized', auth.error.message);
  const { supabase, user } = auth;
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
    .order('last_activity_at', { ascending: false });
  if (error) return jsonError(500, 'matches_fetch_failed', error.message);
  return NextResponse.json(data);
}
