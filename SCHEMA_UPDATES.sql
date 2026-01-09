-- Create a table to store password reset tokens
create table if not exists public.password_reset_tokens (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz default now() not null,
  ip_address text -- Optional: for audit/rate limiting by IP
);

-- Index for faster lookup by token hash
create index if not exists idx_password_reset_tokens_token_hash on public.password_reset_tokens(token_hash);

-- Index for lookup by user_id (to invalidate old tokens)
create index if not exists idx_password_reset_tokens_user_id on public.password_reset_tokens(user_id);

-- Enable Row Level Security (RLS)
alter table public.password_reset_tokens enable row level security;

-- Policy: Users should NOT be able to read/write this table directly from the client.
-- It is meant to be accessed via Server Actions / API Routes using the Service Role.
-- So we generally do NOT add permissive policies for 'anon' or 'authenticated' here
-- unless we want them to read their own history (optional).
-- For now, strict security: No public access.
