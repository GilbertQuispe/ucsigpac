'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/client'
import { Plus, Edit, Trash2, X, Save, Shield, Search, Eraser, ChevronLeft, ChevronRight, Users, AlertTriangle } from 'lucide-react'
import { Toaster, toast } from 'react-hot-toast'

type Rol = {
  idrol: number,
  nombrerol: string,
  descripcionrol: string | null
}

export default function RolesPage() {
  const supabase = createClient()
  const [roles, setRoles] = useState<Rol[]>([])
  const [filtro, setFiltro] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [idRolEdit, setIdRolEdit] = useState<number | null>(null)

  const [showConfirm, setShowConfirm] = useState(false)
  const [idRolAEliminar, setIdRolAEliminar] = useState<number | null>(null)
  
  const [nombreRol, setNombreRol] = useState('')
  const [descripcionRol, setDescripcionRol] = useState('')

  // PAGINACION
  const [paginaActual, setPaginaActual] = useState(1)
  const registrosPorPagina = 10

  useEffect(() => { fetchRoles() }, [])

  const fetchRoles = async () => {
    const { data } = await supabase.from('rol').select('*').order('nombrerol')
    setRoles(data || [])
    setPaginaActual(1)
  }

  const rolesFiltrados = roles.filter(r => 
    r.nombrerol.toLowerCase().includes(filtro.toLowerCase()) || 
    (r.descripcionrol || '').toLowerCase().includes(filtro.toLowerCase())
  )

  const totalPaginas = Math.ceil(rolesFiltrados.length / registrosPorPagina)
  const indiceInicio = (paginaActual - 1) * registrosPorPagina
  const indiceFin = indiceInicio + registrosPorPagina
  const rolesPaginados = rolesFiltrados.slice(indiceInicio, indiceFin)

  useEffect(() => { setPaginaActual(1) }, [filtro])

  const puedeGuardar = useMemo(() => nombreRol.trim()!== '', [nombreRol])

  const openModal = (r?: Rol) => {
    if(r) {
      setIsEditing(true)
      setIdRolEdit(r.idrol)
      setNombreRol(r.nombrerol)
      setDescripcionRol(r.descripcionrol || '')
    } else {
      setIsEditing(false)
      setIdRolEdit(null)
      setNombreRol('')
      setDescripcionRol('')
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setIsEditing(false)
    setIdRolEdit(null)
    setNombreRol('')
    setDescripcionRol('')
  }

  const handleLimpiar = () => {
    setNombreRol('')
    setDescripcionRol('')
    toast.success('Formulario limpiado')
  }

  const handleGuardar = async () => {
    if(!puedeGuardar) return toast.error('El nombre del rol es obligatorio')
    const payload = { nombrerol: nombreRol.trim(), descripcionrol: descripcionRol.trim() || null }

    try {
      if(isEditing) {
        const { error } = await supabase.from('rol').update(payload).eq('idrol', idRolEdit)
        if(error) throw error
        toast.success('Rol actualizado correctamente')
      } else {
        const { error } = await supabase.from('rol').insert(payload)
        if(error) {
          if(error.code === '23505') toast.error('Ya existe un rol con ese nombre')
          else throw error
        } else {
          toast.success('Rol registrado correctamente')
        }
      }
      await fetchRoles()
      setTimeout(() => { closeModal() }, 1500)
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  // const handleEliminar = async (id: number) => {
  //   if(!confirm('¿Eliminar este rol? Ojo: si está asignado a usuarios dará error.')) return
  //   const { error } = await supabase.from('rol').delete().eq('idrol', id)
  //   if(error) toast.error('No se puede eliminar. Primero desasígnalo de los usuarios.')
  //   else {
  //     toast.success('Rol eliminado')
  //     fetchRoles()
  //   }
  // }

  const handleEliminar = (id: number) => {
  setIdRolAEliminar(id)
  setShowConfirm(true)
}

const confirmarEliminar = async () => {
  if(!idRolAEliminar) return
  
  const { error } = await supabase.from('rol').delete().eq('idrol', idRolAEliminar)
  
  if(error) {
    toast.error('No se puede eliminar. Primero desasígnalo de los usuarios.')
  } else {
    toast.success('Rol eliminado')
    fetchRoles()
  }
  
  setShowConfirm(false)
  setIdRolAEliminar(null)
}

  return (
    <div>
      <Toaster position="top-right" toastOptions={{ duration: 3000, style: { borderRadius: '0.8rem', fontSize: '1.4rem', fontWeight: 600 }}}/>
      
      <div className="header-responsive"> 
        <div>
          <h1><Users size={18} /> Gestión de Roles</h1>
          <p>Total: {rolesFiltrados.length} registros</p>
        </div>
        <button onClick={() => openModal()} className="btn-primario">
          <Plus size={18} /> Nuevo Rol
        </button>
      </div>

      <div className="content-area">
        <div className="card-sgpc" style={{ marginBottom: "2.4rem", padding: "2rem" }}>
          <div style={{ position: "relative", width: "100%", maxWidth: '40rem' }}>
            <Search size={18} style={{ position: "absolute", left: "1.2rem", top: "50%", transform: "translateY(-50%)", opacity: 0.5 }} />
            <input 
              className="input-sgpc" 
              placeholder="Buscar por nombre o descripción..." 
              value={filtro} 
              onChange={e => setFiltro(e.target.value)} 
              style={{ paddingLeft: "4rem", height: "4.4rem", width: "100%" }} 
            />
          </div>
        </div>

        <div className="card-sgpc" style={{overflowX: 'auto'}}>
          <table className='tabla-sgpc'>
            <thead>
              <tr>
                <th style={{padding: '1.2rem', width: '80px'}}>Nro.</th>
                <th style={{padding: '1.2rem'}}>NOMBRE DEL ROL</th>
                <th style={{padding: '1.2rem'}}>DESCRIPCIÓN</th>
                <th style={{padding: '1.2rem', width: '120px'}}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {rolesPaginados.map((r, index) => (
                  <tr key={r.idrol}>
                    <td style={{padding: '1rem', fontWeight: 600}}>{indiceInicio + index + 1}</td>
                    <td style={{padding: '1rem', fontWeight: 700}}>{r.nombrerol}</td>
                    <td style={{padding: '1rem'}}>{r.descripcionrol || '-'}</td>
                    <td style={{padding: '1rem', display: 'flex', gap: '0.8rem'}}>
                      <div style={{display: 'flex', gap: '0.8rem', justifyContent: 'center', alignItems: 'center'}}>
                      <button className="btn-icon btn-icon-editar" onClick={() => openModal(r)}><Edit size={15} /></button>
                      <button className="btn-icon btn-icon-eliminar" onClick={() => handleEliminar(r.idrol)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {totalPaginas > 1 && (
          <div className="paginacion-footer">
            <p className="paginacion-info">
              Mostrando {indiceInicio + 1} al {Math.min(indiceFin, rolesFiltrados.length)} de {rolesFiltrados.length} registros
            </p>
            <div className="paginacion-controles">
              <button className="btn-pag" onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1}>
                <ChevronLeft size={16} /> Anterior
              </button>
              <span className="paginacion-pagina">Pág {paginaActual} de {totalPaginas}</span>
              <button className="btn-pag btn-pag-primario" onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas}>
                Siguiente <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content card-sgpc" style={{ maxWidth: '45rem', padding: '0' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" >
              <h2 style={{color:'#fff', display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '1.6rem', margin: 0}}>
                <Shield size={22} /> {isEditing? 'Editar Rol' : 'Nuevo Rol'}
              </h2>
              <button onClick={closeModal} className="btn-cerrar-modal"><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="card-info-ejecutiva" style={{borderLeft: '4px solid #3B82F6', background: '#EFF6FF'}}>
                <Shield size={20} color="#3B82F6"/>
                <div style={{flex: 1}}>
                  <div className="card-info-label">Nombre del Rol *</div>
                  <input className="input-sin-borde" placeholder="Ej: Administrador" value={nombreRol} onChange={e => setNombreRol(e.target.value)} maxLength={100} />
                </div>
              </div>
              <div className="card-info-ejecutiva" style={{borderLeft: '4px solid #8B5CF6', background: '#F5F3FF'}}>
                <Edit size={20} color="#8B5CF6"/>
                <div style={{flex: 1}}>
                  <div className="card-info-label">Descripción</div>
                  <input className="input-sin-borde" placeholder="Ej: Acceso total al sistema" value={descripcionRol} onChange={e => setDescripcionRol(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{borderTop: '2px solid var(--color-primario)'}}>
              <button className="btn-secundario" onClick={handleLimpiar}><Eraser size={16} /> Limpiar</button>
              <button className="btn-primario" onClick={handleGuardar} disabled={!puedeGuardar}><Save size={16} />Guardar</button>
            </div> 
          </div>
        </div>
      )}

      {showConfirm && (
      <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
        <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '45rem', padding: '0', borderRadius: '1.2rem', overflow: 'hidden' }}>
          
          <div className="modal-header" style={{background: 'var(--color-primario)', color: '#fff', padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <h2 style={{color:'#fff', display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '1.6rem', margin: 0, fontWeight: 600}}>
              <AlertTriangle size={22}/>Confirmar Eliminación
            </h2>
            <button onClick={() => setShowConfirm(false)} className="btn-cerrar-modal" style={{background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.8rem', borderRadius: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'}}>
              <X size={20} />
            </button>
          </div>

          <div className="modal-body" style={{padding: '3rem 2rem', textAlign: 'center'}}>
            <p style={{fontSize: '1.6rem', fontWeight: 600, color: 'var(--color-texto)', margin: '0 0 0.8rem 0'}}>
              ¿Está seguro de ELIMINAR este rol?
            </p>
            <p style={{fontSize: '1.4rem', color: 'var(--color-texto-secundario)', margin: 0, lineHeight: 1.5}}>
              Esta acción no se puede deshacer. El rol debe estar desasignado de todos los usuarios.
            </p>
          </div>

          <div className="modal-footer" style={{display: 'flex', padding: '1.5rem 2rem', background: 'var(--color-fondo-card)', borderTop: '1px solid var(--color-borde)', gap: '1rem'}}>
            <button className="btn-secundario" style={{flex:1, height: '4.8rem'}} onClick={() => setShowConfirm(false)}>
              <X size={16} />Cancelar
            </button>
            <button className="btn-primario" style={{flex:1, height: '4.8rem', background: '#ef4444'}} onClick={confirmarEliminar}> 
              <Trash2 size={16} /> Eliminar
            </button>
          </div>
        </div>
      </div>
    )}
      <style jsx>{`
  .btn-cerrar-modal { color: #fff; background: transparent; border: none; }
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 2rem; }
  .modal-content { width: 100%; max-width: 50rem; background: #fff; border-radius: 1.2rem; box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden; }
  .modal-header { background: var(--color-primario); color: #fff; padding: 2rem 2.4rem; display: flex; justify-content: space-between; align-items: center; }
  .modal-body { padding: 2.4rem; display: flex; flex-direction: column; gap: 1.6rem; }
  .modal-footer { padding: 1.6rem 2.4rem; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 1.2rem; background: #f8fafc; }
  
  .card-info-ejecutiva { display: flex; align-items: center; gap: 1.2rem; padding: 1.2rem 1.6rem; border-radius: 0.8rem; }
  .card-info-label { font-size: 1.2rem; color: #475569; font-weight: 600; margin-bottom: 0.2rem; }
  .input-sin-borde { width: 100%; border: none; background: transparent; font-size: 1.5rem; font-weight: 700; color: #1e293b; outline: none; padding: 0; }
  .input-sin-borde::placeholder { font-weight: 400; color: #94a3b8; }

  //.btn-primario { display: flex; align-items: center; gap: 0.6rem; background: #1e3a8a; color: #fff; padding: 1rem 1.6rem; border-radius: 0.8rem; border: none; font-weight: 600; cursor: pointer; }
  .btn-primario:disabled { opacity: 0.5; cursor: not-allowed; }
  //.btn-secundario { display: flex; align-items: center; gap: 0.6rem; background: #fff; color: #1e3a8a; padding: 1rem 1.6rem; border-radius: 0.8rem; border: 1px solid #1e3a8a; font-weight: 600; cursor: pointer; }
  .btn-icon { padding: 0.6rem; border-radius: 0.6rem; border: none; cursor: pointer; }
  // { background: #dbeafe; color: #1d4ed8; }
  //.btn-icon-eliminar { background: #fee2e2; color: #b91c1c; }

  //.tabla-sgpc { width: 100%; border-collapse: collapse; }
  //.tabla-sgpc th { background: #f8fafc; font-weight: 700; font-size: 1.2rem; text-transform: uppercase; }
  //.tabla-sgpc td { border-bottom: 1px solid #e2e8f0; }
`}</style>
    </div>
  )
}