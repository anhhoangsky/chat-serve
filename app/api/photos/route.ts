import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { jsonError } from '@/lib/http';
import { v4 as uuidv4 } from 'uuid';

const uploadSchema = z.object({ contentType: z.string() });

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if ('error' in auth) return jsonError(auth.error.status, 'unauthorized', auth.error.message);
  const { supabase, user } = auth;
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('user_id', user.id)
    .order('position');
  if (error) return jsonError(500, 'photos_fetch_failed', error.message);
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if ('error' in auth) return jsonError(auth.error.status, 'unauthorized', auth.error.message);
  const { supabase, user } = auth;
  const body = await req.json().catch(() => null);
  const parsed = uploadSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, 'invalid_request', parsed.error.message);
  const path = `${user.id}/${uuidv4()}`;
  const { data, error } = await supabase.storage
    .from('media')
    .createSignedUploadUrl(path);
  if (error) return jsonError(500, 'signed_url_failed', error.message);
  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  const auth = await requireAuth(req);
  if ('error' in auth) return jsonError(auth.error.status, 'unauthorized', auth.error.message);
  const { supabase, user } = auth;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return jsonError(400, 'invalid_request', 'missing id');
  const { data: photo, error: fetchError } = await supabase
    .from('photos')
    .select('storage_path')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();
  if (fetchError) return jsonError(400, 'photo_not_found', fetchError.message);
  await supabase.storage.from('media').remove([photo.storage_path]);
  await supabase.from('photos').delete().eq('id', id).eq('user_id', user.id);
  return NextResponse.json({ success: true });
}
