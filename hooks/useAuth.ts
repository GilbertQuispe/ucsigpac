// 'use client'
// import { useEffect, useState } from 'react'
// import { supabase } from '@/lib/supabase'

// export function useAuth() {
//   const [user, setUser] = useState<any>(null)
//   const [loading, setLoading] = useState(true)

//   useEffect(() => {
//     // Obtiene usuario al cargar
//     supabase.auth.getUser().then(({ data }) => {
//       setUser(data.user)
//       setLoading(false)
//     })

//     // Escucha cambios de login/logout
//     const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
//       setUser(session?.user ?? null)
//     })

//     return () => {
//       listener.subscription.unsubscribe()
//     }
//   }, [])

//   return { user, loading }
// }

'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useAuth() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // FORMA SIN LLORONES - con async/await
    const getUser = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data?.user ?? null)
      setLoading(false)
    }
    getUser()

    // FIX DE LA LINEA 17 - le ponemos :any para que no llore
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return { user, loading }
}