import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseClient } from '@/lib/supabase';
import { jsonError } from '@/lib/http';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, 'invalid_request', parsed.error.message);
  }
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { display_name: parsed.data.displayName } },
  });
  if (error) {
    return jsonError(400, error.code ?? 'signup_failed', error.message);
  }
  return NextResponse.json({ user: data.user });
}
