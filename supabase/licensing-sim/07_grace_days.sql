-- 07_grace_days.sql
-- ---------------------------------------------------------------------------
-- Server-adjustable offline grace window (grace_days).
--
-- Lets CIM change how long a paying user can keep working offline before the
-- plugin locks, from Supabase, with NO new plugin build. The plugin already
-- reads an optional top-level `grace_days` from get_entitlement:
--   * a number -> used, clamped to 0..90 on the plugin side
--   * explicit null / omitted -> plugin keeps its built-in 3-day default
--
-- This file: (1) a one-row config table CIM can edit from the Table Editor,
-- (2) a helper to read it, and (3) the exact snippet to splice into the
-- EXISTING get_entitlement function (not rewritten here, since its full body
-- lives in the licensing project — see STEP 2 below).
--
-- Apply AFTER 01_schema.sql. Safe to re-run.
-- ---------------------------------------------------------------------------

-- STEP 1 -- config table + seed ---------------------------------------------
-- One global value. To change the window later, CIM edits the `grace_days`
-- row's `value` in the Supabase Table Editor — no code or build needed.
create table if not exists public.app_config (
  key   text primary key,
  value integer
);

insert into public.app_config (key, value)
values ('grace_days', 3)
on conflict (key) do nothing;

-- Helper: current grace_days, or null when the row is missing (plugin then
-- falls back to its 3-day default). security definer so get_entitlement can
-- read it regardless of the caller's RLS on app_config.
create or replace function public.get_grace_days()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select value from public.app_config where key = 'grace_days';
$$;

grant execute on function public.get_grace_days() to authenticated;

-- Note: app_config holds only this operational knob and is read through the
-- security-definer helper above, so it needs no public RLS read policy. Leave
-- RLS disabled (default) OR enable it with no policies — either way the plugin
-- gets the value via get_entitlement, not by reading the table directly.

-- STEP 2 -- splice grace_days into the EXISTING get_entitlement --------------
-- get_entitlement's full body is defined in the licensing project (01_schema /
-- its own migration), so DON'T recreate it blindly here. Instead, open that
-- function and add grace_days to the jsonb it returns. Two common shapes:
--
--   (a) If it builds the result with jsonb_build_object(...), add one pair:
--
--       return jsonb_build_object(
--         'plugin',     ...,
--         'fusionedge', ...,
--         'device',     ...,
--         'grace_days', public.get_grace_days()   -- <-- add this line
--       );
--
--   (b) If it assembles `result jsonb` and returns it, merge the key in just
--       before returning:
--
--       result := result || jsonb_build_object('grace_days', public.get_grace_days());
--       return result;
--
-- public.get_grace_days() returns NULL when the config row is absent, which the
-- plugin treats as "use the 3-day default". The plugin also clamps to 0..90, so
-- a stray large value in the table can't grant near-permanent offline access.

-- STEP 3 (OPTIONAL) -- per-plan / per-user grace ----------------------------
-- The same wiring supports a non-global value later: compute grace_days from
-- the user's plan or an override column on their row instead of the single
-- app_config value, and return it the same way. No plugin change needed.
