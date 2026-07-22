'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/client'
import { Plus, Edit, Trash2, X, Search, ChevronLeft, ChevronRight, Building2 } from 'lucide-react'

type NivelAtencion = {
  idnivela: number
  codigo: string | null
  nombre: string | null
}

export default function NivelesPage() {
  const supabase = createClient()
  const [niveles, setNiveles] = useState<NivelAtencion[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [idAEliminar, setIdAEliminar] = useState<number | null>(null)
  const [editing, setEditing] = useState<NivelAtencion | null>(null)
  const [form, setForm] = useState<Partial<NivelAtencion>>({})
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null)

  // PAGINACION
  const [paginaActual, setPaginaActual] = useState(1)
  const registrosPorPagina = 10

  const showToast = (msg: string, type: 'error' | 'success' = 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const toTitleCase = (str: string) =>
    str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase())

  const fetchNiveles = async () => {
    setLoading(true)
    const { data } = await supabase
     .from('nivelatencion')
     .select('*')
     .order('idnivela')
    setNiveles(data || [])
    setLoading(false)
    setPaginaActual(1)
  }

  useEffect(() => { fetchNiveles() }, [])

  const puedeGuardar = useMemo(() => {
    return form.codigo?.trim() && form.nombre?.trim()
  }, [form])

  const nivelesFiltrados = useMemo(() => {
    return niveles.filter(n => {
      const matchSearch =
        n.codigo?.toLowerCase().includes(search.toLowerCase()) ||
        n.nombre?.toLowerCase().includes(search.toLowerCase())
      return matchSearch
    })
  }, [niveles, search])

  // LOGICA PAGINACION
  const totalPaginas = Math.ceil(nivelesFiltrados.length / registrosPorPagina)
  const indiceInicio = (paginaActual - 1) * registrosPorPagina
  const indiceFin = indiceInicio + registrosPorPagina
  const nivelesPaginados = nivelesFiltrados.slice(indiceInicio, indiceFin)

  useEffect(() => { setPaginaActual(1) }, [search])

  const handleSave = async () => {
    if (!puedeGuardar) return;

    try {
      let mensaje = '';
      const dataToSave = {
        codigo: form.codigo?.trim().toUpperCase(),
        nombre: toTitleCase(form.nombre?.trim() || '')
      }

      if (editing) {
        const { error } = await supabase
         .from('nivelatencion')
         .update(dataToSave)
         .eq('idnivela', editing.idnivela);
        if (error) throw error;
        mensaje = 'Nivel actualizado correctamente';
      } else {
        const { error } = await supabase
         .from('nivelatencion')
         .insert(dataToSave);
        if (error) throw error;
        mensaje = 'Nivel registrado correctamente';
      }
      showToast(mensaje, 'success');
      await fetchNiveles();
      closeModal();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar', 'error');
    }
  }

  const handleDelete = (id: number) => {
    setIdAEliminar(id)
    setShowConfirm(true)
  }

  const confirmarEliminar = async () => {
    if (!idAEliminar) return
    const { error } = await supabase
     .from('nivelatencion')
     .delete()
     .eq('idnivela', idAEliminar)
    if (error) {
      showToast('Error al eliminar: ' + error.message, 'error')
    } else {
      showToast('Registro eliminado correctamente', 'success')
      fetchNiveles()
    }
    setShowConfirm(false)
    setIdAEliminar(null)
  }

  const openModal = (nivel?: NivelAtencion) => {
    if (nivel) {
      setEditing(nivel);
      setForm({ codigo: nivel.codigo || '', nombre: nivel.nombre || '' });
    } else {
      setEditing(null);
      setForm({ codigo: '', nombre: '' });
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false);
    setForm({});
    setEditing(null);
  }

  return (
    <div>
      <div className="header-responsive">
        <div>
          <h1>Niveles de Atención</h1>
          <p>Total: {nivelesFiltrados.length} registros</p>
        </div>
        <button className="btn-primario" onClick={() => openModal()}>
          <Plus size={18} />
          Nuevo Nivel
        </button>
      </div>

      <div className="card-sgpc" style={{ marginBottom: '2.4rem' }}>
        <div style={{ position: 'relative', maxWidth: '40rem' }}>
          <Search size={18} style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
          <input className="input-sgpc" placeholder="Buscar por Código o Nombre..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '4rem' }} />
        </div>
      </div>

      <div className="card-sgpc" style={{ overflowX: 'auto' }}>
        {loading? <p>Cargando...</p> : (
          <table className='tabla-sgpc'>
            <thead><>{/* Fix Hydration */}<tr style={{ borderBottom: '0.2rem solid var(--color-borde)', textAlign: 'left' }}><th style={{ padding: '1rem', width: '6rem' }}>Nro.</th><th style={{ padding: '1rem' }}>Código</th><th style={{ padding: '1rem' }}>Nombre</th><th style={{ padding: '1rem' }}>Acciones</th></tr></></thead>
            <tbody><>{nivelesPaginados.map((n, index) => (<tr key={n.idnivela} style={{ borderBottom: '1px solid var(--color-borde)' }}><td style={{ padding: '1rem', fontWeight: 600 }}>{indiceInicio + index + 1}</td><td style={{ padding: '1rem', fontWeight: 600 }}>{n.codigo}</td><td style={{ padding: '1rem' }}>{n.nombre}</td><td style={{ padding: '1rem', display: 'flex', gap: '0.8rem' }}><button className="btn-icon btn-icon-editar" onClick={() => openModal(n)}><Edit size={15} /></button><button className="btn-icon btn-icon-eliminar" onClick={() => handleDelete(n.idnivela)}><Trash2 size={15} /></button></td></tr>))}</></tbody>
          </table>
        )}
      </div>

      {totalPaginas > 1 && (
        <div className="paginacion-footer">
          <p className="paginacion-info">Mostrando {indiceInicio + 1} al {Math.min(indiceFin, nivelesFiltrados.length)} de {nivelesFiltrados.length} registros</p>
          <div className="paginacion-controles">
            <button className="btn-pag" onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1}><ChevronLeft size={16} /> Anterior</button>
            <span className="paginacion-pagina">Pág {paginaActual} de {totalPaginas}</span>
            <button className="btn-pag btn-pag-primario" onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas}>Siguiente <ChevronRight size={16} /></button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay"><div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()}>
          {toast && (<div className={`toast-sgpc ${toast.type}`}>{toast.msg}</div>)}
          <div className="modal-header"><h2><Building2 size={20} style={{marginRight: '0.8rem'}}/>{editing? 'Editar Nivel' : 'Nuevo Nivel'}</h2><button onClick={closeModal} className="btn-cerrar"><X size={20} /></button></div>
          <div className="modal-body">
            <div className="input-wrapper"><label className="input-label">Código *</label><input className="input-sgpc-floating" placeholder="I-1" value={form.codigo || ''} onChange={e => setForm({...form, codigo: e.target.value.toUpperCase() })} maxLength={100} /></div>
            <div className="input-wrapper"><label className="input-label">Nombre *</label><input className="input-sgpc-floating" placeholder="Puesto de Salud" value={form.nombre || ''} onChange={e => setForm({...form, nombre: e.target.value })} maxLength={100} /></div>
          </div>
          <div className="modal-footer"><button className="btn-secundario" onClick={closeModal}>Cancelar</button><button className="btn-primario" onClick={handleSave} disabled={!puedeGuardar}>Guardar</button></div>
        </div></div>
      )}

      {showConfirm && (
        <div className="modal-overlay"><div className="modal-content card-sgpc" style={{ maxWidth: '40rem' }}>
          <div className="modal-header"><h2>Confirmar Eliminación</h2><button onClick={() => setShowConfirm(false)} className="btn-cerrar"><X size={20} /></button></div>
          <div className="modal-body"><p style={{ textAlign: 'center' }}>¿Está seguro de eliminar este registro?</p></div>
          <div className="modal-footer"><button className="btn-secundario" onClick={() => setShowConfirm(false)}>Cancelar</button><button className="btn-primario btn-danger" onClick={confirmarEliminar}>Eliminar</button></div>
        </div></div>
      )}

      <style jsx>{`
       .btn-danger { background: #ef4444; color: white; }
       .btn-primario:disabled { opacity: 0.5; cursor: not-allowed; }
       .btn-cerrar { background: #f1f5f9; border: none; border-radius: 0.8rem; padding: 0.8rem; cursor: pointer; color: #64748b; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; }
       .btn-cerrar:hover { background: #fee2e2; color: #ef4444; transform: rotate(90deg); }
       .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 2rem; }
       .modal-content { width: 100%; max-width: 50rem; background: var(--color-blanco); border-radius: 1.6rem; box-shadow: 0 20px 60px rgba(0,0,0,0.3); padding: 3.2rem; position: relative; display:flex; flex-direction:column; max-height:90vh; }
       .input-wrapper { position: relative; width: 100%; margin-bottom: 1.6rem; }
       .input-sgpc-floating { width: 100%; box-sizing: border-box; padding: 1.8rem 1.6rem 0.8rem 1.6rem; border: 1px solid var(--color-secundario); border-radius: 0.8rem; font-size: var(--text-base); font-family: var(--font-principal); background: var(--color-blanco); outline: none; transition: all 0.2s ease; color: var(--color-texto); height: 5.2rem; }
       .input-sgpc-floating:focus { border: 2px solid var(--color-primario); padding: 1.7rem 1.5rem 0.7rem 1.5rem; }
       .input-label { position: absolute; left: 1.4rem; top: -0.8rem; font-size: 1.2rem; color: var(--color-primario); font-weight: 600; background: var(--color-blanco); padding: 0 0.6rem; pointer-events: none; z-index: 1; }
       .toast-sgpc { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); padding: 2rem 2rem; border-radius: 0.8rem; font-size: var(--text-sm); font-weight: 700; color: var(--color-blanco); box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 9999; animation: fadeInScale 0.3s ease-out forwards; white-space: nowrap; text-align:center; }
       .toast-sgpc.error { background: #ef4444; }
       .toast-sgpc.success { background: #22c55e; }
        @keyframes fadeInScale { from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
       .paginacion-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 1.6rem; padding: 1.6rem; background: var(--color-blanco); border-radius: 1.2rem; gap: 1.6rem; }
       .paginacion-info { font-size: var(--text-sm); color: var(--color-texto-sec); }
       .paginacion-controles { display: flex; gap: 0.8rem; align-items: center; }
       .btn-pag { display: flex; align-items: center; gap: 0.4rem; padding: 0.8rem 1.2rem; border-radius: 0.8rem; font-size: var(--text-sm); font-weight: 600; border: 1px solid var(--color-borde); background: var(--color-blanco); color: var(--color-primario); cursor: pointer; transition: all 0.2s ease; }
       .btn-pag:hover:not(:disabled) { background: #f8fafc; }
       .btn-pag:disabled { opacity: 0.5; cursor: not-allowed; }
       .btn-pag-primario { background: var(--color-primario); color: var(--color-blanco); border: 1px solid var(--color-primario); }
       .btn-pag-primario:hover:not(:disabled) { opacity: 0.9; }
       .paginacion-pagina { padding: 0.8rem 1.2rem; font-weight: 600; font-size: var(--text-sm); white-space: nowrap; }
        @media (max-width: 768px) {.paginacion-footer { flex-direction: column; padding: 1.2rem; }.paginacion-controles { width: 100%; justify-content: space-between; }.btn-pag { padding: 0.6rem 1rem; font-size: 1.2rem; flex: 1; justify-content: center; }.paginacion-pagina { padding: 0.6rem 0.8rem; font-size: 1.2rem; }.paginacion-info { text-align: center; width: 100%; }
      `}</style>
    </div>
  )
}