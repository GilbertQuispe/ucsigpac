import { getPerfilUsuario } from '@/app/actions/permisos'

export default async function TestPage() {
  // Pega aquí tu ID de usuario Administrador
  const perfil = await getPerfilUsuario('e8e1dfe9-b4bb-439f-aff1-116b85412813') 
  
  return (
    <pre>{JSON.stringify(perfil, null, 2)}</pre>
  )
}