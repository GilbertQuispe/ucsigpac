'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/client'
import { Shield, Search, Eraser, ChevronLeft, ChevronRight, Users, X, Save, FolderKanban, CheckSquare } from 'lucide-react'
import { Toaster, toast } from 'react-hot-toast'
import { wrap } from 'module'

type Usuario = {
  id: string, // UUID de auth.users
  idusuario: number,
  nombres: string,
  apellidos: string,
  email: string,
  nombrerol: string
}

type Permiso = {
  idpermiso: number,
  nombrepermiso: string,
  modulo: string
}

export default function AsignacionModulosPage() {
  const supabase = createClient()

  // ESTADOS PRINCIPALES
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [permisos, setPermisos] = useState<Permiso[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [permisosSeleccionados, setPermisosSeleccionados] = useState<number[]>([])

  // FILTROS Y PAGINACION
  const [search, setSearch] = useState('')
  const [filtroRol, setFiltroRol] = useState<string | null>(null)
  const [roles, setRoles] = useState<{idrol: number, nombrerol: string}[]>([])
  const [cambios, setCambios] = useState<{[key: string]: number}>({}) // {userId: idrol}
  const [paginaActual, setPaginaActual] = useState(1)
  const registrosPorPagina = 10


  // MODAL
  const [showModal, setShowModal] = useState(false)
  const [modulos, setModulos] = useState<any[]>([])
  const [modulosSeleccionados, setModulosSeleccionados] = useState<number[]>([])
  

  useEffect(() => {
    fetchUsuarios()
    fetchRoles()
    fetchPermisos()
  }, [])

const fetchUsuarios = async () => {
  const { data, error } = await supabase
 .from('persona')
 .select(`
      id,
      nombres,
      apellidos,
      idrol,
      rol!idrol(nombrerol),
      usuario!inner(idusuario, email, id)
    `)
 .eq('estado', 'ACTIVO')
 .order('apellidos')

  if(error) {
    console.log("ERROR SUPABASE:", error)
    toast.error(error.message)
    return
  }

 
  const mapped = data?.map(p => ({
    id: p.usuario[0].id,
    idusuario: p.usuario[0].idusuario,
    nombres: p.nombres,
    apellidos: p.apellidos,
    email: p.usuario[0].email,    
    nombrerol: (p.rol as any)?.nombrerol || 'Sin Rol'    
    
  })) || []
  
  setUsuarios(mapped)
  setPaginaActual(1)
}

const fetchModulosUsuario = async (userIds: string[]) => {
  const { data: persona } = await supabase.from('persona').select('idrol').in('id', userIds)
  const idrol = persona?.[0]?.idrol // Tomamos el rol del primer usuario seleccionado
  
  const { data: modulosRol } = await supabase.from('rol_modulo').select('idmodulo').eq('idrol', idrol)
  setModulosSeleccionados(modulosRol?.map(m => m.idmodulo) || [])
}

  const fetchRoles = async () => {
    const { data } = await supabase.from('rol').select('idrol, nombrerol').order('nombrerol')
    setRoles(data || [])
  }

useEffect(() => { fetchUsuarios(); fetchRoles() }, [])

  const fetchPermisos = async () => {
    const { data } = await supabase.from('permiso').select('*').order('modulo, nombrepermiso')
    setPermisos(data || [])
  }

//para asignar roles
const handleRolChange = (userId: string, idrol: number) => {
  setCambios(prev => ({...prev, [userId]: idrol }))
}

const guardarCambios = async () => {
  const updates = Object.entries(cambios).map(([userId, idrol]) => 
    supabase.from('persona').update({ idrol }).eq('id', userId)
  )
  
  const results = await Promise.all(updates)
  if(results.some(r => r.error)) toast.error("Error al guardar")
  else {
    toast.success("Roles actualizados")
    setCambios({})
    fetchUsuarios()
  }
}

  // FILTROS
  const usuariosFiltrados = usuarios.filter(u =>
    (`${u.nombres} ${u.apellidos} ${u.email}`).toLowerCase().includes(search.toLowerCase()) &&
    (!filtroRol || u.nombrerol === filtroRol)
  )

  const totalPaginas = Math.ceil(usuariosFiltrados.length / registrosPorPagina)
  const indiceInicio = (paginaActual - 1) * registrosPorPagina
  const indiceFin = indiceInicio + registrosPorPagina
  const usuariosPaginados = usuariosFiltrados.slice(indiceInicio, indiceFin)

  useEffect(() => { setPaginaActual(1) }, [search, filtroRol])

  // LOGICA DE CHECKS
  const handleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id)? prev.filter(i => i!== id) : [...prev, id])
  }
  const handleSelectAll = () => {
    setSelectedIds(prev => prev.length === usuariosPaginados.length? [] : usuariosPaginados.map(u => u.id))
  }

  // ABRIR MODAL Y CARGAR PERMISOS ACTUALES
// const openModal = async () => {
//     if(selectedIds.length === 0) return toast.error('Selecciona al menos 1 usuario')

//     // 1. Obtener el rol del primer usuario seleccionado
//     const { data: persona } = await supabase.from('persona').select('idrol').eq('id', selectedIds[0]).single()

//     if(!persona?.idrol) {
//       toast.error("Este usuario no tiene rol asignado")
//       return
//     }

//     // 2. Cargar los permisos de ESE ROL desde la tabla rolpermiso
//     const { data: permisosRol } = await supabase.from('rolpermiso').select('idpermiso').eq('idrol', persona.idrol)

//     setPermisosSeleccionados(permisosRol?.map(p => p.idpermiso) || [])
//     setShowModal(true)
//   }

const openModal = async () => {
    if(selectedIds.length === 0) return toast.error('Selecciona al menos 1 usuario')
    setShowModal(true)

    // 1. Buscar si el usuario YA TIENE permisos propios en usuariopermiso
    const { data: permisosPropios } = await supabase
     .from('usuariopermiso')
     .select('idpermiso')
     .eq('idusuario', selectedIds[0])
     .eq('estado', true)

    if(permisosPropios && permisosPropios.length > 0) {
      // CASO A: El usuario ya tiene permisos propios. Usamos esos.
      setPermisosSeleccionados(permisosPropios.map(p => p.idpermiso))
    } else {
      // CASO B: No tiene permisos propios. JALAMOS LOS DEL ROL
      const { data: persona } = await supabase.from('persona').select('idrol').eq('id', selectedIds[0]).single()

      if(!persona?.idrol) {
        toast.error("Este usuario no tiene rol asignado")
        setPermisosSeleccionados([])
        return
      }

      const { data: permisosRol } = await supabase.from('rolpermiso').select('idpermiso').eq('idrol', persona.idrol)
      setPermisosSeleccionados(permisosRol?.map(p => p.idpermiso) || [])
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setPermisosSeleccionados([])
  }

  const togglePermiso = (idpermiso: number) => {
    setPermisosSeleccionados(prev =>
      prev.includes(idpermiso)? prev.filter(p => p!== idpermiso) : [...prev, idpermiso]
    )
  }

//  const handleGuardar = async () => {
//     try {
//       // 1. Obtener el rol del primer usuario seleccionado
//       const { data: persona } = await supabase.from('persona').select('idrol').eq('id', selectedIds[0]).single()
//       const idrol = persona?.idrol

//       if(!idrol) throw new Error("Usuario sin rol")

//       // 2. Borrar permisos anteriores de ESE ROL
//       await supabase.from('rolpermiso').delete().eq('idrol', idrol)

//       // 3. Insertar los nuevos permisos para ESE ROL
//       const inserts = permisosSeleccionados.map(idPerm => ({ idrol, idpermiso: idPerm }))
//       if(inserts.length > 0){
//         const { error } = await supabase.from('rolpermiso').insert(inserts)
//         if(error) throw error
//       }

//       toast.success(`Permisos actualizados para el rol`)
//       closeModal()
//       setSelectedIds([])
//     } catch (error: any) {
//       toast.error(error.message)
//     }
//   } 
  
const handleGuardar = async () => {
    try {
      await supabase.from('usuariopermiso').delete().in('idusuario', selectedIds)

      const inserts = []
      for(const idUser of selectedIds){
        for(const idPerm of permisosSeleccionados){
          inserts.push({ idusuario: idUser, idpermiso: idPerm, estado: true })
        }
      }
      if(inserts.length > 0){
        const { error } = await supabase.from('usuariopermiso').insert(inserts)
        if(error) throw error
      }

      toast.success(`Permisos personalizados guardados para ${selectedIds.length} usuario(s)`)
      closeModal()
      setSelectedIds([])
    } catch (error: any) {
      toast.error(error.message)
    }
  }
  
  const permisosAgrupados = useMemo(() => {
    return permisos.reduce((acc, p) => {
      (acc[p.modulo] = acc[p.modulo] || []).push(p)
      return acc
    }, {} as Record<string, Permiso[]>)
  }, [permisos])

  return (
    <div>
      <Toaster position="top-right" toastOptions={{ duration: 3000, style: { borderRadius: '0.8rem', fontSize: '1.4rem', fontWeight: 600 }}}/>

      <div className="header-responsive">
        <div>
          <h1><Shield size={18} /> Asignación de Módulos por Usuario</h1>
          <p>Total: {usuariosFiltrados.length} usuarios</p>
        </div>
        <button onClick={openModal} className="btn-primario" disabled={selectedIds.length === 0}>
          <CheckSquare size={18} /> Asignar Módulos ({selectedIds.length})
        </button>
      </div>

      <div className="content-area">
        {/* FILTROS */}
        
        <div className="card-sgpc" style={{ marginBottom: '2.4rem', padding: '2rem' }}>
  {/* <div 
    className="grid-filtros-usuarios" 
    style={{ 
      display:'flex', 
      alignItems:'end',
      gap: '1.2rem',           // separación entre elementos
      flexWrap: 'wrap'         // permite que bajen en móvil
    }}
  >
    <SelectSGPCFieldset 
      label="Filtrar por Rol" 
      value={filtroRol || ""} 
      onChange={setFiltroRol} 
      options={roles} 
      style={{ minWidth: '180px', flexWrap: 'wrap' }} // que no se haga chiquito
    />
    
    <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
      <Search size={18} style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, zIndex: 1 }} />
      <input 
        className="input-sgpc" 
        placeholder="Buscar por Nombres, Apellidos, Email..." 
        value={search} 
        onChange={e => setSearch(e.target.value)} 
        style={{ paddingLeft: '4rem', height: "4.4rem", width: "100%" }} 
      />
    </div>
    
    <button 
      className="btn-secundario btn-limpiar" 
      onClick={() => {setSearch(""); setFiltroRol(null)}}
      style={{ height: '4.4rem' }} // mismo alto que el input
    >
      <Eraser size={16} />Limpiar
    </button>
  </div> */}
        <div className="grid-filtros-usuarios"
        //  style={{ 
        //         display:'flex', 
        //         alignItems:'end',
        //         gap: '1.2rem',
        //         flexWrap: 'wrap'
        //     }}   
        >
        <div style={{ flex: '1 1 180px', minWidth: '100%' }}> {/* Contenedor para el select */}
            <SelectSGPCFieldset 
            label="Filtrar por Rol" 
            value={filtroRol || ""} 
            onChange={setFiltroRol} 
            options={roles} 
            />
        </div>
        
        <div style={{ position: 'relative', flex: '1 1 250px', minWidth: '100%' }}>
            <Search size={18} style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, zIndex: 1 }} />
            <input 
            className="input-sgpc" 
            placeholder="Buscar por Nombres, Apellidos, Email..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            style={{ paddingLeft: '4rem', height: "4.4rem", width: "100%" }} 
            />
        </div>
        
        <button 
            className="btn-secundario btn-limpiar" 
            onClick={() => {setSearch(""); setFiltroRol(null)}}
            style={{ 
            height: '4.4rem',
            flex: '1 1 120px',
            minWidth: '100%' // ESTA ES LA CLAVE PARA MÓVIL
            }}
        >
            <Eraser size={16} />Limpiar
        </button>
        </div>
</div>
{/* //Se agregó */}
        {cambios && Object.keys(cambios).length > 0 && (
  <button onClick={guardarCambios} className="bg-green-600 text-white px-4 py-2 rounded mb-4">
    Guardar Cambios
  </button>
)}
        {/* TABLA */}
        <div className="card-sgpc" style={{overflowX: 'auto'}}>
          <table className='tabla-sgpc'>
            <thead>
              <tr>
                <th style={{ padding: '1rem 0.5rem 1rem 1.6rem', width: '4rem', textAlign: 'center' }}>
                  <input type="checkbox" onChange={handleSelectAll} checked={selectedIds.length === usuariosPaginados.length && usuariosPaginados.length > 0} />
                </th>
                <th style={{ padding: '1rem' }}>NRO.</th>
                <th style={{ padding: '1rem' }}>APELLIDOS Y NOMBRES</th>
                <th style={{ padding: '1rem' }}>EMAIL</th>
                <th style={{ padding: '1rem' }}>ROL ACTUAL</th>
              </tr>
            </thead>
            <tbody>
              {usuariosPaginados.map((u, index) => (
                <tr key={u.id}>
                  <td style={{ padding: '1rem 0.5rem 1rem 1.6rem', textAlign: 'center' }}>
                    <input type="checkbox" checked={selectedIds.includes(u.id)} onChange={() => handleSelect(u.id)} />
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{indiceInicio + index + 1}</td>
                  <td style={{ padding: '1rem', fontWeight: 700 }}>{u.apellidos}, {u.nombres}</td>
                  <td style={{ padding: '1rem' }}>{u.email}</td>
                  <td style={{ padding: '1rem' }}><span className="badge-rol">{u.nombrerol}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PAGINACION */}
        {totalPaginas > 1 && (
          <div className="paginacion-footer">
            <p className="paginacion-info">Mostrando {indiceInicio + 1} al {Math.min(indiceFin, usuariosFiltrados.length)} de {usuariosFiltrados.length} registros</p>
            <div className="paginacion-controles">
              <button className="btn-pag" onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1}><ChevronLeft size={16} /> Anterior</button>
              <span className="paginacion-pagina">Pág {paginaActual} de {totalPaginas}</span>
              <button className="btn-pag btn-pag-primario" onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas}>Siguiente <ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL ASIGNAR MODULOS */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content card-sgpc" style={{ maxWidth: '70rem', padding: '0' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{color:'#fff', display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '1.6rem', margin: 0}}>
                <FolderKanban size={22} /> Asignar Módulos a {selectedIds.length} Usuario(s)
              </h2>
              <button onClick={closeModal} className="btn-cerrar-modal"><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {Object.entries(permisosAgrupados).map(([modulo, perms]) => (
                <div key={modulo} className="card-modulo">
                  <h3 className="titulo-modulo"><FolderKanban size={16} /> {modulo}</h3>
                  <div className="grid-permisos">
                    {perms.map(p => (
                      <label key={p.idpermiso} className="check-permiso">
                        <input type="checkbox" checked={permisosSeleccionados.includes(p.idpermiso)} onChange={() => togglePermiso(p.idpermiso)} />
                        {p.nombrepermiso}
                      </label>
                    ))}
                  </div>
                </div>
              ))}         
            </div>

            <div className="modal-footer" style={{borderTop: '2px solid var(--color-primario)'}}>
              <button className="btn-secundario" onClick={closeModal}><X size={16} />Cancelar</button>
              <button className="btn-primario" onClick={handleGuardar}><Save size={16} />Guardar Asignación</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
       .btn-cerrar-modal { color: #fff; background: transparent; border: none; cursor: pointer; }
       .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 2rem; }
       .modal-content { width: 100%; background: #fff; border-radius: 1.2rem; box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden; }
       .modal-header { background: var(--color-primario); color: #fff; padding: 2rem 2.4rem; display: flex; justify-content: space-between; align-items: center; }
       .modal-body { padding: 2.4rem; display: flex; flex-direction: column; gap: 1.6rem; }
       .modal-footer { padding: 1.6rem 2.4rem; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 1.2rem; background: #f8fafc; }

       .grid-filtros-usuarios { display: grid; grid-template-columns:1fr; gap: 1.6rem; align-items: stretch; }
       .btn-limpiar { height: 4.4rem; white-space: nowrap; justify-content: center; }
        @media (min-width: 768px) {.grid-filtros-usuarios { grid-template-columns: repeat(3,1fr); align-items: stretch; align-items: end; } }

       .badge-rol { background: #dbeafe; color: #1d4ed8; padding: 0.4rem 1rem; border-radius: 2rem; font-size: 1.2rem; font-weight: 600; }

       .card-modulo { border: 1px solid #e2e8f0; border-radius: 0.8rem; padding: 1.6rem; background: #f8fafc; }
       .titulo-modulo { display: flex; align-items: center; gap: 0.8rem; font-size: 1.4rem; font-weight: 700; color: var(--color-primario); margin: 0 0 1.2rem 0; }
       .grid-permisos { display: grid; grid-template-columns: repeat(auto-fill, minmax(22rem, 1fr)); gap: 1rem; }
       .check-permiso { display: flex; align-items: center; gap: 0.8rem; font-size: 1.4rem; cursor: pointer; }
       
      `}</style>
    </div>
  )
}

// COMPONENTE SELECT REUTILIZABLE
function SelectSGPCFieldset({ label, value, onChange, options }: any) {
  return (
    <fieldset style={{ border: "1px solid #cbd5e1", borderRadius: "0.6rem", padding: "0.2rem 0.8rem 0.8rem 0.8rem", margin: 0, height: "4.4rem" }}>
      <legend style={{ fontSize: "1.2rem", color: "#64748b", padding: "0 0.4rem", fontWeight: 600 }}>{label}</legend>
      <select value={value} onChange={e => onChange(e.target.value || null)} style={{ border: "none", outline: "none", width: "100%", fontSize: "1.4rem", background: "transparent", height: "2.6rem" }}>
        <option value="">Todos</option>
        {options.map((o: any) => <option key={o.idrol} value={o.nombrerol}>{o.nombrerol}</option>)}
      </select>
    </fieldset>
  )
}