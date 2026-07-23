import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = Boolean(url && anonKey)

if (!isConfigured) {
  console.warn(
    'Supabase is not configured. Copy .env.example to .env, add your project ' +
      'URL and anon key, then restart the dev server. Running on demo data.'
  )
}

// createClient throws on an empty URL, which would kill the whole app at import
// time and render a blank page. Fall back to a placeholder so the UI still
// mounts; every request fails harmlessly and callers fall back to demo data.
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key'
)
