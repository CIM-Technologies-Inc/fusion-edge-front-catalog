-- Per-user download history. One row per confirmed download, strictly private
-- to its owner — same RLS shape as saved_items. Run once in the SQL editor.

create table if not exists public.download_history (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  product_id   uuid references public.products(id) on delete set null,
  variation_id uuid references public.variations(id) on delete set null,
  -- What was actually downloaded, captured at download time so the record
  -- survives later product edits.
  kind         text,  -- 'rfa' | 'image'
  file_name    text,
  file_url     text,
  created_at   timestamptz not null default now()
);

create index if not exists download_history_user_idx
  on public.download_history (user_id, created_at desc);

alter table public.download_history enable row level security;

-- Read only your own history.
create policy "read own downloads"
  on public.download_history for select
  using (user_id = auth.uid());

-- Log a download only for yourself, and only for a product you can see
-- (reuses the existing product_visible() guard from 0002_rls.sql).
create policy "log own downloads"
  on public.download_history for insert
  with check (user_id = auth.uid() and product_visible(product_id));

-- History is append-only from the client: no update/delete policies, so rows
-- can't be altered or removed with the anon key.
