'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/client'
import { Shield, Save, Users, Key, Check, X } from 'lucide-react'
import Select from '@/components/ui/SelectClient'
import { Toaster, toast } from 'react-hot-toast'

type Rol = { idrol: number, nombrerol: string }
type Permiso = { idpermiso: number, nombrepermiso: string, descripcionpermiso: string | null, modulo: string }
type RolPermiso = { idrolpermiso: number, idrol: number, idpermiso: number }

// const SelectSGPCFieldset = ({label, value, onChange, options}:any) => {
//   const selectedOption = options.find((o:any) => o.value === value) || null
//   return (
//     <fieldset className="fieldset-sgpc">
//       <legend>{label}</legend>
//       <Select options={options} value={selectedOption} onChange={(opt:any) => onChange(opt?.value || null)} placeholder="Seleccione un Rol..." isSearchable classNamePrefix="react-select" styles={{ control: (base) => ({...base, height: '4.4rem', minHeight: '4.4rem', borderRadius: '0.8rem' }) }} />
//     </fieldset>
//   )
// }

const SelectSGPCFieldset = ({label, value, onChange, options}:any) => {
  const selectedOption = options.find((o:any) => o.value === value) || null
  return (
    <fieldset className="fieldset-sgpc">
      <legend>{label}</legend>
      <Select 
        options={options} 
        value={selectedOption} 
        onChange={(opt:any) => onChange(opt?.value || null)} 
        placeholder="Seleccione un Rol..." 
        isSearchable 
        classNamePrefix="react-select"
        menuPortalTarget={typeof document !== 'undefined' ? document.body : null} // <-- ESTA ES LA CLAVE
        menuPosition="fixed" // <-- Y ESTA TAMBIEN
        styles={{ 
          control: (base) => ({...base, height: '4.4rem', minHeight: '4.4rem', borderRadius: '0.8rem' }),
          menuPortal: (base) => ({...base, zIndex: 99999 }) // <-- Para que esté encima de todo
        }} 
      />
    </fieldset>
  )
}

export default function PermisosPage() {
  const supabase = createClient()
  const [roles, setRoles] = useState<Rol[]>([])
  const [permisos, setPermisos] = useState<Permiso[]>([])
  const [rolPermisos, setRolPermisos] = useState<number[]>([]) // Solo guardamos los idpermiso
  const [idRolSel, setIdRolSel] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchInicial() }, [])

  const fetchInicial = async () => {
    const { data: rolesData } = await supabase.from('rol').select('idrol, nombrerol').eq('estado', 'ACTIVO').order('nombrerol')
    setRoles(rolesData || [])
    const { data: permisosData } = await supabase.from('permiso').select('*').order('modulo').order('nombrepermiso')
    setPermisos(permisosData || [])
  }

  useEffect(() => {
    if(!idRolSel) { setRolPermisos([]); return }
    fetchRolPermisos(idRolSel)
  }, [idRolSel])

  const fetchRolPermisos = async (idrol: number) => {
    setLoading(true)
    const { data } = await supabase.from('rolpermiso').select('idpermiso').eq('idrol', idrol)
    setRolPermisos((data || []).map((rp:any) => rp.idpermiso))
    setLoading(false)
  }

  const handleTogglePermiso = async (idpermiso: number) => {
    if(!idRolSel) return toast.error('Primero seleccione un Rol')

    const tienePermiso = rolPermisos.includes(idpermiso)

    if(tienePermiso) {
      // QUITAR PERMISO
      const { error } = await supabase.from('rolpermiso').delete().eq('idrol', idRolSel).eq('idpermiso', idpermiso)
      if(error) return toast.error('Error al quitar permiso')
      setRolPermisos(prev => prev.filter(p => p!== idpermiso))
      toast.success('Permiso quitado')
    } else {
      // ASIGNAR PERMISO
      const { error } = await supabase.from('rolpermiso').insert({idrol: idRolSel, idpermiso: idpermiso})
      if(error) return toast.error('Error al asignar permiso')
      setRolPermisos(prev => [...prev, idpermiso])
      toast.success('Permiso asignado')
    }
  }

  const permisosAgrupados = useMemo(() => {
    return permisos.reduce((acc, p) => {
      const modulo = p.modulo || 'General'
      if(!acc[modulo]) acc[modulo] = []
      acc[modulo].push(p)
      return acc
    }, {} as Record<string, Permiso[]>)
  }, [permisos])

  return (
    <div>
      <Toaster position="top-right" />
      <div className="header-responsive">
        <div>
          <h1><Shield size={20}/> Gestión de Permisos</h1>
          <p>Asigna permisos a cada Rol del sistema</p>
        </div>
      </div>

      <div className="content-area">
        <div className="card-sgpc" style={{ marginBottom: "2.4rem", padding: "2rem", maxWidth: '50rem' }}>
          <SelectSGPCFieldset
            label="Seleccione un Rol para configurar"
            value={idRolSel || ""}
            onChange={(val:any) => setIdRolSel(val)}
            options={roles.map(r => ({value: r.idrol, label: r.nombrerol}))}
          />
        </div>

        {idRolSel && (
          <div className="card-sgpc" style={{padding: '2.4rem'}}>
            {loading? <p>Cargando permisos...</p> :
              Object.keys(permisosAgrupados).map(modulo => (
                <div key={modulo} style={{marginBottom: '3rem'}}>
                  <h3 style={{display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '1.8rem', marginBottom: '1.6rem', color: 'var(--color-primario)'}}>
                    <Key size={18}/> {modulo}
                  </h3>
                  <div className="grid-permisos">
                    {permisosAgrupados[modulo].map(p => (
                      <div key={p.idpermiso} className="card-permiso" onClick={() => handleTogglePermiso(p.idpermiso)}>
                        <div className={`checkbox ${rolPermisos.includes(p.idpermiso)? 'checked' : ''}`}>
                          {rolPermisos.includes(p.idpermiso)? <Check size={14}/> : null}
                        </div>
                        <div>
                          <div style={{fontWeight: 700, fontSize: '1.4rem'}}>{p.nombrepermiso}</div>
                          <div style={{fontSize: '1.2rem', color: 'var(--color-texto-sec)'}}>{p.descripcionpermiso || 'Sin descripción'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {!idRolSel && (
          <div className="card-sgpc" style={{padding: '4rem', textAlign: 'center', color: 'var(--color-texto-sec)'}}>
            <Users size={40} style={{margin: '0 auto 1rem'}}/>
            <p>Seleccione un Rol para comenzar a asignar permisos</p>
          </div>
        )}
      </div>

      <style jsx>{`
       .fieldset-sgpc { border: 1px solid #e2e8f0; border-radius: 0.8rem; padding: 0.8rem 1.2rem; }
       .fieldset-sgpc legend { font-size: 1.2rem; font-weight: 600; color: var(--color-primario); padding: 0 0.4rem; display: flex; align-items: center; gap: 0.4rem; }
       .grid-permisos { display: grid; grid-template-columns: repeat(auto-fill, minmax(30rem, 1fr)); gap: 1.2rem; }
       .card-permiso { display: flex; align-items: center; gap: 1.2rem; padding: 1.2rem; border: 1px solid #e2e8f0; border-radius: 0.8rem; cursor: pointer; transition: all 0.2s; }
       .card-permiso:hover { background: #f8fafc; border-color: var(--color-primario); }
       .checkbox { width: 2rem; height: 2rem; border: 2px solid #cbd5e1; border-radius: 0.4rem; display: flex; align-items: center; justify-content: center; color: #fff; }
       .checkbox.checked { background: var(--color-primario); border-color: var(--color-primario); }
      `}</style>
    </div>
  )
}