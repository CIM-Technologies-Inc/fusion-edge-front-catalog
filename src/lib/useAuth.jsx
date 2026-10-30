import { useEffect, useRef, useState } from 'react'
import { supabase, isConfigured } from './supabase'
import { useToast } from './toast'
import {
  AuthContext,
  isCustomerAccount,
  postSessionToCimPlugin,
  listenForCimSession,
} from './auth'

export function AuthProvider({ children }) {
  // Held in a ref so the mount-once auth effect can call the current toast
  // without taking `toast` as a dependency (it's rebuilt each render).
  const toast = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Without credentials there is no session to fetch; resolve immediately
    // so pages don't sit in a permanent loading state.
    if (!isConfigured) {
      setLoading(false)
      return
    }

    let active = true

    // Only customers may hold a session on the storefront. A staff/admin
    // session (created here or shared from the admin panel — same Supabase)
    // is signed out. Fail closed: keep only confirmed customer sessions.
    const accept = async (sessionUser) => {
      if (!sessionUser) return null
      if (await isCustomerAccount(sessionUser.id)) return sessionUser
      await supabase.auth.signOut()
      return null
    }

    // Only hand the session to the Revit plugin once it's confirmed a customer
    // session (accept() signs out staff/admin), so staff tokens never leak into
    // the panel. No-op outside the plugin's WebView2 panel.
    supabase.auth.getSession().then(async ({ data }) => {
      const u = await accept(data.session?.user ?? null)
      if (!active) return
      if (u) postSessionToCimPlugin(data.session)
      setUser(u)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const u = await accept(session?.user ?? null)
        if (!active) return
        if (u) postSessionToCimPlugin(session)
        setUser(u)
      }
    )

    // Reverse direction: accept a session the plugin pushes, and request one if
    // we're inside the panel but signed out. No-op on the normal web. When
    // setSession succeeds, onAuthStateChange above fires and hands it back —
    // the plugin ignores a session it already holds.
    const stopCimListener = listenForCimSession({
      onSetSession: () =>
        toastRef.current.success('Signed in from the Revit plugin.'),
      onSignOut: () =>
        toastRef.current.success('Signed out from the Revit plugin.'),
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
      stopCimListener()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
