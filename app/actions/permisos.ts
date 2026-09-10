'use server'

import { createClient } from '@/lib/supabase/server'

export async function getPerfilUsuario(id: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('v_usuario_completo')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error getPerfilUsuario:', error)
    return null
  }

  return data
  // Devuelve: { id, email, nombres, nombrerol, permisos: ['/panel/roles', ...] }
}