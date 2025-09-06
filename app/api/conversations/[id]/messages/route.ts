import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { jsonError } from '@/lib/http';

const messageSchema = z.object({
  content: z.string().min(1),
  type: z.enum(['text', 'image', 'system']).optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAuth(req);
  if ('error' in auth) return jsonError(auth.error.status, 'unauthorized', auth.error.message);
  const { supabase } = auth;
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get('cursor');
  const limit = Number(searchParams.get('limit') ?? 30);
  let query = supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', id)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (cursor) {
    query = query.lt('created_at', cursor);
  }
  const { data, error } = await query;
  if (error) return jsonError(500, 'messages_fetch_failed', error.message);
  return NextResponse.json(data);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAuth(req);
  if ('error' in auth) return jsonError(auth.error.status, 'unauthorized', auth.error.message);
  const { supabase, user } = auth;
  const body = await req.json().catch(() => null);
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, 'invalid_request', parsed.error.message);
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: id,
      sender_id: user.id,
      content: parsed.data.content,
      type: parsed.data.type ?? 'text',
    })
    .select()
    .single();
  if (error) return jsonError(400, 'message_failed', error.message);
  return NextResponse.json(data);
}
