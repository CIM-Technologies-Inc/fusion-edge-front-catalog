import { useEffect, useState } from 'react'
import { supabase, isConfigured } from './supabase'
import { AuthContext, isCustomerAccount } from './auth'

export function AuthProvider({ children }) {
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

    supabase.auth.getSession().then(async ({ data }) => {
      const u = await accept(data.session?.user ?? null)
      if (!active) return
      setUser(u)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const u = await accept(session?.user ?? null)
        if (active) setUser(u)
      }
    )
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
