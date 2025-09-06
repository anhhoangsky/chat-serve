import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { jsonError } from '@/lib/http';

const updateSchema = z.object({
  username: z.string().min(3).max(30).optional(),
  display_name: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
  gender: z.enum(['male', 'female', 'other']).nullable().optional(),
  birthdate: z.string().optional(),
  location: z.string().optional(),
  preferences: z.any().optional(),
});

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if ('error' in auth) return jsonError(auth.error.status, 'unauthorized', auth.error.message);
  const { supabase, user } = auth;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (error) return jsonError(500, 'profile_fetch_failed', error.message);
  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const auth = await requireAuth(req);
  if ('error' in auth) return jsonError(auth.error.status, 'unauthorized', auth.error.message);
  const { supabase, user } = auth;
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, 'invalid_request', parsed.error.message);
  const { data, error } = await supabase
    .from('profiles')
    .update(parsed.data)
    .eq('id', user.id)
    .select()
    .single();
  if (error) return jsonError(400, 'profile_update_failed', error.message);
  return NextResponse.json(data);
}
