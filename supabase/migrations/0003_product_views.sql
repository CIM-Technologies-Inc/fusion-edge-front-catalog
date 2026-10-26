-- Product view tracking for the home "Trending / Most Viewed" section.
-- Run this once in the Supabase SQL editor.
--
-- The storefront uses the anon key, which must NOT be able to UPDATE products
-- directly (RLS). So views are recorded through a SECURITY DEFINER function
-- that only ever increments the counter for a published product — it can't
-- touch any other column.

-- 1. The counter. Starts at 0 for every existing product.
alter table public.products
  add column if not exists view_count integer not null default 0;

-- Helps the "order by view_count desc" query on the home page.
create index if not exists products_view_count_idx
  on public.products (view_count desc);

-- 2. Secure increment. Callable by anon/authenticated via RPC; runs as owner
--    so it bypasses RLS, but is hard-scoped to a single harmless action:
--    +1 on the view_count of ONE published product.
create or replace function public.increment_product_view(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.products
     set view_count = view_count + 1
   where id = p_id
     and published = true;
$$;

-- Let the storefront roles call it.
grant execute on function public.increment_product_view(uuid) to anon, authenticated;
