import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createSupabaseClient } from './supabase';

export interface AuthError {
  error: { status: number; message: string };
}

export interface AuthSuccess {
  supabase: SupabaseClient;
  user: User;
}

export async function requireAuth(req: Request): Promise<AuthError | AuthSuccess> {
  const auth = req.headers.get('authorization');
  if (!auth) {
    return { error: { status: 401, message: 'Missing Authorization header' } };
  }
  const token = auth.replace('Bearer ', '');
  const supabase = createSupabaseClient(token);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { error: { status: 401, message: 'Invalid token' } };
  }
  return { supabase, user: data.user };
}
