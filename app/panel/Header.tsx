'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/client'
import { useRouter } from 'next/navigation'


export default function Header({ nombre }: { nombre: string }) {
  const [time, setTime] = useState('')
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleString('es-PE'))
    update()
    const i = setInterval(update, 1000)
    return () => clearInterval(i)
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header style={{
      backgroundColor: 'var(--color-blanco)',
      padding: '1.6rem 2.4rem',
      display:'flex', justifyContent:'space-between', alignItems:'center',
      borderBottom: '1px solid var(--color-borde)',
      position:'sticky', top:0, zIndex:50
    }}>
      <h1 style={{ fontSize: 'var(--text-xl)', margin:0 }}>Sistema de Gestión de Prácticas Clínicas</h1>
      <div style={{ display:'flex', alignItems:'center', gap:'2rem' }}>
        <span style={{ fontSize:'var(--text-sm)' }}>{time}</span>
        <span style={{ fontSize:'var(--text-base)', fontWeight:600 }}>{nombre}</span>
        <button onClick={logout} className="btn-primario" style={{ padding:'0.8rem 1.6rem', fontSize:'var(--text-sm)' }}>
          Salir
        </button>
      </div>

    </header>
  )
}