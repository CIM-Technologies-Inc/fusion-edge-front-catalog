-- =====================================================================
-- SIMULATION ONLY - activate a plan WITHOUT payment.
--
-- This lets a signed-in user grant THEMSELVES a plan with no PayMongo, so we
-- can test the whole journey (register -> pick plan -> access unlocks in the
-- plugin and palette) before billing is built.
--
-- SECURITY WARNING: simulate_subscribe is a deliberate paywall bypass. Any
-- signed-in user can call it and give themselves a free active subscription.
-- It MUST be removed (or its EXECUTE grant revoked) before go-live. The real
-- flow writes these same rows from the PayMongo webhook (server side only).
--
-- Apply AFTER 01_schema.sql. Self-contained: it also (idempotently) seeds the
-- three plans, so it is safe to run on its own.
-- =====================================================================

-- Make sure the three sellable plans exist (same as 03_seed_and_test.sql).
insert into public.plans (id, name, grants_fusionedge, grants_plugin) values
  ('fusionedge', 'FusionEdge only',     true,  false),
  ('plugin',     'Revit Plugin only',   false, true),
  ('bundle',     'FusionEdge + Plugin', true,  true)
on conflict (id) do nothing;

-- Grant the caller a one-year ACTIVE subscription to the chosen plan.
-- security definer so it can write subscriptions (normal users have no write
-- policy there, by design). Keeps one simulated subscription per user.
create or replace function public.simulate_subscribe(p_plan_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_until timestamptz := now() + interval '1 year';
begin
  if v_uid is null then
    raise exception 'Not signed in.';
  end if;
  if not exists (select 1 from public.plans where id = p_plan_id) then
    raise exception 'Unknown plan: %', p_plan_id;
  end if;

  -- One active simulated subscription per user: clear any old ones first.
  delete from public.subscriptions where owner_user_id = v_uid;

  insert into public.subscriptions
    (owner_user_id, plan_id, status, current_period_end)
  values
    (v_uid, p_plan_id, 'active', v_until);

  return jsonb_build_object(
    'ok',          true,
    'plan',        p_plan_id,
    'valid_until', v_until
  );
end;
$$;

grant execute on function public.simulate_subscribe(text) to authenticated;

-- To DISABLE the simulation later (do this before production):
--   revoke execute on function public.simulate_subscribe(text) from authenticated;
--   drop function if exists public.simulate_subscribe(text);
