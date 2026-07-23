import { createContext, useContext } from 'react'
import { supabase } from './supabase'

// Non-component exports live here so useAuth.jsx exports only the provider,
// which keeps Fast Refresh working during development.

export const AuthContext = createContext({ user: null, loading: true })

export function useAuth() {
  return useContext(AuthContext)
}

export function signUp(email, password, fullName) {
  return supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  })
}

export function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password })
}

export function signOut() {
  return supabase.auth.signOut()
}
