import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseClient, supabaseUrl } from '@/lib/supabase';
import { jsonError } from '@/lib/http';
const callbackUrl = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/confirmed`;
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
  function getErrorMessage(err: unknown): string {
    if (err instanceof Error && typeof err.message === 'string') return err.message;
    if (typeof err === 'object' && err && 'message' in err) {
      const msg = (err as { message?: unknown }).message;
      if (typeof msg === 'string') return msg;
    }
    try {
      return String(err);
    } catch {
      return 'unknown_error';
    }
  }

  function getErrorCode(err: unknown): string | undefined {
    if (typeof err === 'object' && err && 'code' in err) {
      const code = (err as { code?: unknown }).code;
      if (typeof code === 'string') return code;
    }
    return undefined;
  }

  function isFetchFailed(err: unknown): boolean {
    const msg = getErrorMessage(err).toLowerCase();
    return msg === 'fetch failed' || msg.includes('fetch failed');
  }

  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { data: { display_name: parsed.data.displayName }, emailRedirectTo: callbackUrl },
    });
    if (error) {
      if (isFetchFailed(error)) {
        return jsonError(503, 'supabase_unreachable', 'Cannot reach Supabase. Check NEXT_PUBLIC_SUPABASE_URL and keys.', { url: supabaseUrl });
      }
      return jsonError(400, getErrorCode(error) ?? 'signup_failed', getErrorMessage(error));
    }
    return NextResponse.json({ user: data.user });
  } catch (e: unknown) {
    if (isFetchFailed(e)) {
      return jsonError(503, 'supabase_unreachable', 'Cannot reach Supabase. Check NEXT_PUBLIC_SUPABASE_URL and keys.', { url: supabaseUrl });
    }
    return jsonError(500, 'signup_failed', getErrorMessage(e));
  }
}
