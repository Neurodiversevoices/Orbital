import { supabase } from '@/lib/supabase/client';

export type ProfileRow = {
  user_id: string;
  username: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
};

export async function getMyProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as ProfileRow | null;
}

export async function createMyProfile(params: { userId: string; username: string; displayName?: string }) {
  const payload = {
    user_id: params.userId,
    username: params.username,
    display_name: params.displayName ?? null,
  };

  const { data, error } = await supabase.from('profiles').insert(payload).select('*').single();
  if (error) throw error;
  return data as ProfileRow;
}
