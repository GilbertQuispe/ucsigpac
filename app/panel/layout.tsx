'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/client'
import Header from './Header'
import Sidebar from './Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.push('/login')
      
      const { data } = await supabase.from('v_usuario_completo').select('*').eq('id', session.user.id).single()
      setUser(data)
      setLoading(false)
    }
    getUser()
  }, [])

  if (loading) return <div style={{display:'flex', justifyContent:'center', padding:'5rem'}}><div className="spinner"></div></div>

  return (
    <div style={{ display:'flex', minHeight:'100vh', backgroundColor:'var(--color-fondo)' }}>
      <Sidebar rol={user.rol_nombre} />
      <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
        <Header nombre={`${user.nombres} ${user.apellidos}`} />
        <main style={{ flex:1, padding:'2.4rem' }}>{children}</main>
        <footer style={{ 
          backgroundColor: 'var(--color-primario)', 
          color: 'var(--color-blanco)', 
          textAlign: 'center', 
          padding: '1.6rem',
          fontSize: 'var(--text-sm)'
        }}>
          {process.env.NEXT_PUBLIC_FOOTER_TEXT || '© 2026 GAQE'}
        </footer>
      </div>
    </div>
  )
}
