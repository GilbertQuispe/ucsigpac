'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/client'
import Sidebar from './Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { session }}= await supabase.auth.getSession()
      if (!session) return router.push('/login')
      const { data } = await supabase.from('v_usuario_completo').select('*').eq('id', session.user.id).single()
      setUser(data)
      setLoading(false)
    }
    getUser()
  }, [supabase, router])

  if (loading) return <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh'}}><div className="spinner"></div></div>

  return (
    <div className="layout-wrapper">
      <Sidebar user={user} />
      <main className="content-area">
        {children}
      </main>
    </div>
  )
}