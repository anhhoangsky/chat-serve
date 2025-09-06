import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { jsonError } from '@/lib/http';

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if ('error' in auth) return jsonError(auth.error.status, 'unauthorized', auth.error.message);
  const { supabase, user } = auth;
  const { searchParams } = new URL(req.url);
  const unread = searchParams.get('unread');
  let query = supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  if (unread) {
    query = query.is('read_at', null);
  }
  const { data, error } = await query;
  if (error) return jsonError(500, 'notifications_fetch_failed', error.message);
  return NextResponse.json(data);
}

const patchSchema = z.object({
  ids: z.array(z.string().uuid()),
  read: z.boolean(),
});

export async function PATCH(req: Request) {
  const auth = await requireAuth(req);
  if ('error' in auth) return jsonError(auth.error.status, 'unauthorized', auth.error.message);
  const { supabase, user } = auth;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, 'invalid_request', parsed.error.message);
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: parsed.data.read ? new Date().toISOString() : null })
    .in('id', parsed.data.ids)
    .eq('user_id', user.id);
  if (error) return jsonError(400, 'notifications_update_failed', error.message);
  return NextResponse.json({ success: true });
}
