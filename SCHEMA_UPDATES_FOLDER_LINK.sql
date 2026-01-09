-- 1. Add review_public_id to clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS review_public_id UUID DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS clients_review_public_id_idx ON public.clients (review_public_id);

-- 2. Create folder_magic_links table
CREATE TABLE IF NOT EXISTS public.folder_magic_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS folder_magic_links_client_id_idx ON public.folder_magic_links (client_id);
CREATE INDEX IF NOT EXISTS folder_magic_links_token_hash_idx ON public.folder_magic_links (token_hash);
