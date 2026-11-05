-- 08_custom_access_token_hook.sql
-- ---------------------------------------------------------------------------
-- Phase B of the signed-token hardening: inject the entitlement into the login
-- token as namespaced cim_* claims, so the plugin can trust a cryptographically
-- signed source instead of a server reply a fake server could forge.
--
-- The claims mirror entitlement_base() EXACTLY, so the token's cim_* values
-- always agree with what get_entitlement returns (Phase C compares them).
--
-- IMPORTANT difference from entitlement_base(): this hook runs as
-- supabase_auth_admin at token-issue time, where auth.uid() is NOT set. The
-- user id comes from event->>'user_id' instead, so we replicate the same query
-- keyed on that id rather than calling entitlement_base() directly.
--
-- Apply AFTER the licensing schema (subscriptions/plans) exists. Then enable it
-- in Supabase: Authentication -> Hooks -> Custom Access Token -> select
-- public.custom_access_token_hook. Safe to re-run.
-- ---------------------------------------------------------------------------

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  claims   jsonb;
  uid      uuid := (event->>'user_id')::uuid;
  p_active boolean;
  p_exp    timestamptz;
  f_active boolean;
  f_exp    timestamptz;
begin
  -- Same source and rules as entitlement_base(), but for the token's user id.
  -- active plans = status in (active, past_due) and not past grace/period end.
  with active as (
    select p.grants_fusionedge,
           p.grants_plugin,
           coalesce(s.grace_until, s.current_period_end) as good_until
    from public.subscriptions s
    join public.plans p on p.id = s.plan_id
    where s.owner_user_id = uid
      and s.status in ('active', 'past_due')
      and coalesce(s.grace_until, s.current_period_end) >= now()
  )
  select coalesce(bool_or(grants_plugin), false),
         max(good_until) filter (where grants_plugin),
         coalesce(bool_or(grants_fusionedge), false),
         max(good_until) filter (where grants_fusionedge)
    into p_active, p_exp, f_active, f_exp
  from active;

  -- Namespaced so they never collide with Supabase's own claims. Timestamps go
  -- out as ISO-8601 text (or JSON null when there's no active grant).
  claims := event->'claims';
  claims := jsonb_set(claims, '{cim_plugin_active}',     to_jsonb(coalesce(p_active, false)));
  claims := jsonb_set(claims, '{cim_plugin_expires_at}', coalesce(to_jsonb(p_exp), 'null'::jsonb));
  claims := jsonb_set(claims, '{cim_fe_active}',         to_jsonb(coalesce(f_active, false)));
  claims := jsonb_set(claims, '{cim_fe_expires_at}',     coalesce(to_jsonb(f_exp), 'null'::jsonb));
  event  := jsonb_set(event, '{claims}', claims);

  return event;
end;
$$;

-- Only the Auth admin role may run the hook; no one else (it reads other users'
-- entitlement by id, so it must not be callable by anon/authenticated).
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

-- REQUIRED: the hook runs AS supabase_auth_admin (a restricted role), not as
-- the user. It must be able to read the tables the entitlement query touches,
-- or token issuance fails with "Error running hook URI". Grant that role the
-- reads it needs. (The hook stays SECURITY INVOKER per Supabase's guidance —
-- we grant access rather than making it SECURITY DEFINER.)
grant usage on schema public to supabase_auth_admin;
grant select on public.subscriptions to supabase_auth_admin;
grant select on public.plans         to supabase_auth_admin;

-- If RLS is ENABLED on subscriptions/plans, a plain grant isn't enough — the
-- role also needs a policy that lets it read every row (it reads on behalf of
-- the user being issued a token, so it can't rely on auth.uid()). Add one:
--   create policy "auth admin reads subs" on public.subscriptions
--     for select to supabase_auth_admin using (true);
--   create policy "auth admin reads plans" on public.plans
--     for select to supabase_auth_admin using (true);
