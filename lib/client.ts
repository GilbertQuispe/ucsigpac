import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  if (typeof window !== 'undefined') {
    const w = window as any
    if (w.__supabase_client) return w.__supabase_client

    const client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    w.__supabase_client = client
    return client
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}