import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { jsonError } from '@/lib/http';

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if ('error' in auth) return jsonError(auth.error.status, 'unauthorized', auth.error.message);
  const { supabase, user } = auth;
  // Basic feed: all profiles except self; real app should filter by preferences
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .neq('id', user.id)
    .limit(20);
  if (error) return jsonError(500, 'feed_fetch_failed', error.message);
  return NextResponse.json(data);
}
