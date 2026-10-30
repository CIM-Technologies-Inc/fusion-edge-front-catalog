import { createContext, useContext } from 'react'
import { supabase } from './supabase'

// Non-component exports live here so useAuth.jsx exports only the provider,
// which keeps Fast Refresh working during development.

export const AuthContext = createContext({ user: null, loading: true })

export function useAuth() {
  return useContext(AuthContext)
}

// This storefront shares one Supabase project with the admin panel, so the same
// accounts exist in both. Only CUSTOMER accounts may use the storefront:
// role = 'customer', no admin role assigned (role_id null), and not an admin.
export const NOT_CUSTOMER_MESSAGE =
  "This account can't shop here. Staff accounts sign in through the admin panel."

/**
 * Whether the given user id is a customer account (allowed on the storefront).
 * Reads the user's own profiles row (RLS permits reading your own row). If the
 * row can't be read, treat as NOT a customer — fail closed.
 */
export async function isCustomerAccount(userId) {
  if (!userId) return false
  const { data, error } = await supabase
    .from('profiles')
    .select('is_admin, role, role_id')
    .eq('id', userId)
    .maybeSingle()

  if (error || !data) return false
  return (
    data.is_admin !== true &&
    data.role_id == null &&
    (data.role == null || data.role === 'customer')
  )
}

export function signUp(email, password, fullName) {
  // New signups are always customers (the DB defaults role to 'customer' and
  // leaves role_id null), so no extra check is needed here.
  return supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  })
}

export async function signIn(email, password) {
  const result = await supabase.auth.signInWithPassword({ email, password })
  if (result.error) return result

  // Reject non-customer (staff/admin) accounts: sign them straight back out so
  // no half-authenticated staff session lingers on the storefront.
  const userId = result.data?.user?.id
  if (!(await isCustomerAccount(userId))) {
    await supabase.auth.signOut()
    return { data: null, error: { message: NOT_CUSTOMER_MESSAGE } }
  }
  return result
}

export function signOut() {
  return supabase.auth.signOut()
}

// Hands the current Supabase session to the CIM Revit plugin, but ONLY when the
// site is running inside the plugin's WebView2 panel. window.chrome.webview
// exists only there; in a normal browser it's undefined, so this is a no-op on
// the web and needs no environment gating. Lets the plugin auto sign-in when a
// user signs in on the storefront inside the docked panel.
export function postSessionToCimPlugin(session) {
  try {
    const bridge = window.chrome && window.chrome.webview
    if (!bridge || !session) return
    bridge.postMessage(
      JSON.stringify({
        type: 'cim-auth',
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
      })
    )
  } catch { /* ignore — not in the plugin panel, or bridge unavailable */ }
}

// Listen for a session pushed FROM the CIM Revit plugin (plugin -> site) and
// sign the site in with it, and — when we're inside the panel but not signed in
// — ask the plugin for its session (covers the user having signed in via the
// plugin's own Account window before this page loaded). Returns a cleanup fn.
// No-op outside the plugin's WebView2 panel. Pairs with postSessionToCimPlugin.
export function listenForCimSession() {
  const bridge =
    typeof window !== 'undefined' && window.chrome && window.chrome.webview
  if (!bridge) return () => {}

  const onMessage = (ev) => {
    let msg
    try {
      msg = JSON.parse(ev.data)
    } catch {
      return
    }
    if (msg?.type === 'cim-set-session' && msg.access_token) {
      supabase.auth.setSession({
        access_token: msg.access_token,
        refresh_token: msg.refresh_token,
      })
    }
    // Mirror a sign-out initiated in the plugin's own Account window.
    if (msg?.type === 'cim-sign-out') {
      supabase.auth.signOut()
    }
  }

  bridge.addEventListener('message', onMessage)

  // If we're in the panel and not signed in yet, ask the plugin for its session.
  supabase.auth.getSession().then(({ data }) => {
    if (!data.session) {
      try {
        bridge.postMessage(JSON.stringify({ type: 'cim-request-session' }))
      } catch { /* ignore */ }
    }
  })

  return () => bridge.removeEventListener('message', onMessage)
}

// SIMULATION ONLY — activate a plan for the signed-in user with no payment,
// via the simulate_subscribe() RPC. Requires an active session (auth.uid()).
// Mirrors signup_sim.html; must be removed when real checkout (PayMongo) ships.
// Plan ids match public.plans: 'fusionedge' | 'plugin' | 'bundle'.
export function simulateSubscribe(planId) {
  return supabase.rpc('simulate_subscribe', { p_plan_id: planId })
}
