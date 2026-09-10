// QUITAR: 'use client'
import { createClient } from '@/lib/supabase/server' // AGREGAR: Import del server
import { redirect } from 'next/navigation' // AGREGAR: Para redirigir desde server
import { getPerfilUsuario } from '@/app/actions/permisos' // AGREGAR: Nuestra función
import Sidebar from './Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) { // QUITAR: useState, useEffect
  const supabase = await createClient() // AGREGAR: Server client

  // AGREGAR: Obtener sesión en servidor
  const { data: { session }} = await supabase.auth.getSession()
  if (!session) redirect('/login') // QUITAR: router.push

  // AGREGAR: Llamar a nuestra Server Action con permisos
  const user = await getPerfilUsuario(session.user.id)
  if (!user) redirect('/login')

  // QUITAR: loading state. Server render ya no necesita spinner

  return (
    <div className="layout-wrapper">
      <Sidebar user={user} /> {/* user ya viene con.permisos */}
      <main className="content-area">
        {children}
      </main>
    </div>
  )
}