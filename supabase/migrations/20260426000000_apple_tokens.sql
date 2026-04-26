-- Apple identity token storage for Sign in with Apple revocation.
-- Populated by the auth callback when a user signs in with Apple.
-- Read/deleted only by the delete-account edge function (service_role).
create table if not exists public.apple_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  refresh_token text not null,
  created_at timestamptz not null default now()
);

alter table public.apple_tokens enable row level security;

-- No user-level access — service_role only (edge functions use service role key).
-- Users cannot read or modify their own token rows via client SDK.
create policy "service_role_only" on public.apple_tokens
  as restrictive
  using (false);
