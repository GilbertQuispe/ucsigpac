'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/client'
import { Plus, Edit, Trash2, X, Search, ChevronLeft, ChevronRight, Building, CheckCircle, XCircle } from 'lucide-react'

type Eps = {
  ideps: number
  iddistrito: number | null
  idnivela: number | null
  ruc: string | null
  razonsocial: string | null
  direccion: string | null
  telefono: string | null
  contacto: string | null
  estado: string | null
  idtipoeps: number | null
  distrito?: { nombredt: string }
  nivelatencion?: { nombre: string }
  tipoeps?: { nombretipoeps: string }
}
type Distrito = { iddistrito: number, nombredt: string }
type Nivel = { idnivela: number, nombre: string }
type TipoEps = { idtipoeps: number, nombretipoeps: string }

export default function EpsPage() {
  const supabase = createClient()
  const [eps, setEps] = useState<Eps[]>([])
  const [distritos, setDistritos] = useState<Distrito[]>([])
  const [niveles, setNiveles] = useState<Nivel[]>([])
  const [tipos, setTipos] = useState<TipoEps[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [idAEliminar, setIdAEliminar] = useState<number | null>(null)
  const [editing, setEditing] = useState<Eps | null>(null)
  const [form, setForm] = useState<Partial<Eps>>({ estado: 'ACTIVO' })
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null)

  // PAGINACION
  const [paginaActual, setPaginaActual] = useState(1)
  const registrosPorPagina = 10

  const showToast = (msg: string, type: 'error' | 'success' = 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const toTitleCase = (str: string) => str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase())

  const fetchData = async () => {
    setLoading(true)
    const { data: epsData, error: epsError } = await supabase
   .from('eps')
   .select(`
      *,
      distrito!iddistrito ( nombredt ),
      nivelatencion!idnivela ( nombre ),
      tipoeps!idtipoeps ( nombretipoeps )
    `).order('ideps')

    if (epsError) showToast('Error cargando EPS: ' + epsError.message, 'error')

    const { data: distData } = await supabase.from('distrito').select('*').order('nombredt')
    const { data: nivData } = await supabase.from('nivelatencion').select('*').order('nombre')
    const { data: tipoData } = await supabase.from('tipoeps').select('*').order('nombretipoeps')

    setEps(epsData || [])
    setDistritos(distData || [])
    setNiveles(nivData || [])
    setTipos(tipoData || [])
    setLoading(false)
    setPaginaActual(1)
  }

  useEffect(() => { fetchData() }, [])

  const puedeGuardar = useMemo(() => {
    return form.ruc?.trim().length === 11 && form.razonsocial?.trim() && form.iddistrito && form.idnivela && form.idtipoeps
  }, [form])

  const epsFiltrados = useMemo(() => {
    return eps.filter(e =>
      e.razonsocial?.toLowerCase().includes(search.toLowerCase()) ||
      e.ruc?.includes(search)
    )
  }, [eps, search])

  // LOGICA DE PAGINACION IGUAL A REGISTROS
  const totalPaginas = Math.ceil(epsFiltrados.length / registrosPorPagina)
  const indiceInicio = (paginaActual - 1) * registrosPorPagina
  const indiceFin = indiceInicio + registrosPorPagina
  const epsPaginados = epsFiltrados.slice(indiceInicio, indiceFin)

  useEffect(() => { setPaginaActual(1) }, [search])

  const handleSave = async () => {
    if (!puedeGuardar) return showToast('Complete todos los campos obligatorios *', 'error');
    try {
      let mensaje = '';
      const dataToSave = {
     ...form,
        ruc: form.ruc?.trim(),
        razonsocial: toTitleCase(form.razonsocial?.trim() || ''),
        direccion: toTitleCase(form.direccion?.trim() || ''),
        contacto: toTitleCase(form.contacto?.trim() || '')
      }

      if (editing) {
        const { error } = await supabase.from('eps').update(dataToSave).eq('ideps', editing.ideps);
        if (error) throw error; mensaje = 'EPS actualizada correctamente';
      } else {
        const { error } = await supabase.from('eps').insert(dataToSave);
        if (error) throw error; mensaje = 'EPS registrada correctamente';
      }
      showToast(mensaje, 'success'); await fetchData(); closeModal();
    } catch (err: any) {
      if (err.code === '23505') showToast('El RUC ya está registrado', 'error')
      else showToast(err.message || 'Error al guardar', 'error');
    }
  }

  const handleDelete = (id: number) => { setIdAEliminar(id); setShowConfirm(true) }
  const confirmarEliminar = async () => {
    if (!idAEliminar) return
    const { error } = await supabase.from('eps').update({ estado: 'INACTIVO' }).eq('ideps', idAEliminar)
    if (error) showToast('Error al anular: ' + error.message, 'error')
    else { showToast('EPS anulada correctamente', 'success'); fetchData() }
    setShowConfirm(false); setIdAEliminar(null)
  }

  const openModal = (item?: Eps) => {
    if (item) setEditing(item), setForm(item);
    else setEditing(null), setForm({ estado: 'ACTIVO' });
    setShowModal(true)
  }
  const closeModal = () => { setShowModal(false); setForm({ estado: 'ACTIVO' }); setEditing(null); }

  return (
    <div>
      <div className="header-responsive">
        <div><h1>Registro de EPS</h1><p>Total: {epsFiltrados.length} registros</p></div>
        <button className="btn-primario" onClick={() => openModal()}><Plus size={18} />Nueva EPS</button>
      </div>

      <div className="card-sgpc" style={{ marginBottom: '2.4rem' }}>
        <div style={{ position: 'relative', maxWidth: '40rem' }}>
          <Search size={18} style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
          <input className="input-sgpc" placeholder="Buscar por Razón Social o RUC..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '4rem' }} />
        </div>
      </div>

      <div className="card-sgpc" style={{ overflowX: 'auto' }}>
        {loading? <p>Cargando...</p> : (
          <table className='tabla-sgpc'>
            <thead><tr><th style={{width: '6rem'}}>NRO.</th><th>RUC</th><th>RAZÓN SOCIAL</th><th>NIVEL</th><th>DISTRITO</th><th>ESTADO</th><th>ACCIONES</th></tr></thead>
            <tbody><>{epsPaginados.map((e, index) => (<tr key={e.ideps}>
              <td style={{ fontWeight: 600 }}>{indiceInicio + index + 1}</td>
              <td style={{ fontWeight: 600 }}>{e.ruc}</td>
              <td>{e.razonsocial}</td>
              <td style={{ fontSize: '1.3rem' }}>{e.nivelatencion?.nombre || '-'}</td>
              <td style={{ fontSize: '1.3rem' }}>{e.distrito?.nombredt || '-'}</td>
              <td><span className={`chip-estado ${e.estado === 'ACTIVO'? 'chip-activo' : 'chip-inactivo'}`}>{e.estado}</span></td>
              <td style={{ display: 'flex', gap: '0.8rem' }}>
                <button className="btn-icon btn-icon-editar" onClick={() => openModal(e)}><Edit size={15} /></button>
                <button className="btn-icon btn-icon-eliminar" onClick={() => handleDelete(e.ideps)}><Trash2 size={15} /></button>
              </td>
            </tr>))}</></tbody>
          </table>
        )}
      </div>

      {/* FOOTER PAGINACION IGUAL A REGISTROS */}
      {totalPaginas > 1 && (
        <div className="paginacion-footer">
          <p className="paginacion-info">
            Mostrando {indiceInicio + 1} al {Math.min(indiceFin, epsFiltrados.length)} de {epsFiltrados.length} registros
          </p>
          <div className="paginacion-controles">
            <button
              className="btn-pag"
              onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
              disabled={paginaActual === 1}
            >
              <ChevronLeft size={16} /> Anterior
            </button>
            <span className="paginacion-pagina">
              Pág {paginaActual} de {totalPaginas}
            </span>
            <button
              className="btn-pag btn-pag-primario"
              onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
              disabled={paginaActual === totalPaginas}
            >
              Siguiente <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay"><div className="modal-content card-sgpc" style={{maxWidth: '70rem'}} onClick={(e) => e.stopPropagation()}>
          {toast && (<div className={`toast-sgpc ${toast.type}`}>{toast.msg}</div>)}
          <div className="modal-header"><h2><Building size={20} style={{marginRight: '0.8rem'}}/>{editing? 'Editar EPS' : 'Nueva EPS'}</h2><button onClick={closeModal} className="btn-cerrar"><X size={20} /></button></div>
          <div className="modal-body" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.6rem'}}>
            <div className="input-wrapper"><label className="input-label">RUC *</label><input className="input-sgpc-floating" placeholder="20123456789" value={form.ruc || ''} onChange={e => setForm({...form, ruc: e.target.value.replace(/\D/g,'') })} maxLength={11} /></div>
            <div className="input-wrapper"><label className="input-label">Razón Social *</label><input className="input-sgpc-floating" placeholder="EPS RIMAC S.A." value={form.razonsocial || ''} onChange={e => setForm({...form, razonsocial: e.target.value })} maxLength={250} /></div>
            <div className="input-wrapper"><label className="input-label">Nivel de Atención *</label>
              <select className="input-sgpc-floating" value={form.idnivela || ''} onChange={e => setForm({...form, idnivela: Number(e.target.value) })}><option value="">Seleccione</option>{niveles.map(n => <option key={n.idnivela} value={n.idnivela}>{n.nombre}</option>)}</select>
            </div>
            <div className="input-wrapper"><label className="input-label">Tipo EPS *</label>
              <select className="input-sgpc-floating" value={form.idtipoeps || ''} onChange={e => setForm({...form, idtipoeps: Number(e.target.value) })}><option value="">Seleccione</option>{tipos.map(t => <option key={t.idtipoeps} value={t.idtipoeps}>{t.nombretipoeps}</option>)}</select>
            </div>
            <div className="input-wrapper" style={{gridColumn: '1 / 3'}}><label className="input-label">Dirección</label><input className="input-sgpc-floating" placeholder="Av. Arequipa 123" value={form.direccion || ''} onChange={e => setForm({...form, direccion: e.target.value })} maxLength={250} /></div>
            <div className="input-wrapper"><label className="input-label">Distrito *</label>
              <select className="input-sgpc-floating" value={form.iddistrito || ''} onChange={e => setForm({...form, iddistrito: Number(e.target.value) })}><option value="">Seleccione</option>{distritos.map(d => <option key={d.iddistrito} value={d.iddistrito}>{d.nombredt}</option>)}</select>
            </div>
            <div className="input-wrapper"><label className="input-label">Teléfono</label><input className="input-sgpc-floating" placeholder="999888777" value={form.telefono || ''} onChange={e => setForm({...form, telefono: e.target.value })} maxLength={20} /></div>
            <div className="input-wrapper" style={{gridColumn: '1 / 3'}}><label className="input-label">Persona de Contacto</label><input className="input-sgpc-floating" placeholder="Juan Perez" value={form.contacto || ''} onChange={e => setForm({...form, contacto: e.target.value })} maxLength={200} /></div>
          </div>
          <div className="modal-footer"><button className="btn-secundario" onClick={closeModal}>Cancelar</button><button className="btn-primario" onClick={handleSave} disabled={!puedeGuardar}>Guardar</button></div>
        </div></div>
      )}

      {showConfirm && (
        <div className="modal-overlay"><div className="modal-content card-sgpc" style={{ maxWidth: '40rem' }}>
          <div className="modal-header"><h2>Anular EPS</h2><button onClick={() => setShowConfirm(false)} className="btn-cerrar"><X size={20} /></button></div>
          <div className="modal-body"><p style={{ textAlign: 'center' }}>¿Está seguro de anular esta EPS? No se eliminará, solo cambiará a INACTIVO.</p></div>
          <div className="modal-footer"><button className="btn-secundario" onClick={() => setShowConfirm(false)}>Cancelar</button><button className="btn-primario btn-danger" onClick={confirmarEliminar}>Anular</button></div>
        </div></div>
      )}

      <style jsx>{`
   .chip-estado { padding: 0.4rem 1rem; border-radius: 2rem; font-size: 1.1rem; font-weight: 700; }
   .chip-activo { background: #dcfce7; color: #166534; }
   .chip-inactivo { background: #fee2e2; color: #991b1b; }
   .btn-danger { background: #ef4444; color: white; }
   .btn-primario:disabled { opacity: 0.5; cursor: not-allowed; }
   .btn-cerrar { background: #f1f5f9; border: none; border-radius: 0.8rem; padding: 0.8rem; cursor: pointer; color: #64748b; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; }
   .btn-cerrar:hover { background: #fee2e2; color: #ef4444; transform: rotate(90deg); }
   .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 2rem; }
   .modal-content { width: 100%; background: var(--color-blanco); border-radius: 1.6rem; box-shadow: 0 20px 60px rgba(0,0,0,0.3); padding: 3.2rem; position: relative; display:flex; flex-direction:column; max-height:90vh; overflow-y: auto; }
   .input-wrapper { position: relative; width: 100%; margin-bottom: 1.6rem; }
   .input-sgpc-floating { width: 100%; box-sizing: border-box; padding: 1.8rem 1.6rem 0.8rem 1.6rem; border: 1px solid var(--color-secundario); border-radius: 0.8rem; font-size: var(--text-base); font-family: var(--font-principal); background: var(--color-blanco); outline: none; transition: all 0.2s ease; color: var(--color-texto); height: 5.2rem; appearance: none; }
   .input-sgpc-floating:focus { border: 2px solid var(--color-primario); padding: 1.7rem 1.5rem 0.7rem 1.5rem; }
   .input-label { position: absolute; left: 1.4rem; top: -0.8rem; font-size: 1.2rem; color: var(--color-primario); font-weight: 600; background: var(--color-blanco); padding: 0 0.6rem; pointer-events: none; z-index: 1; }
   .toast-sgpc { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); padding: 2rem 2rem; border-radius: 0.8rem; font-size: var(--text-sm); font-weight: 700; color: var(--color-blanco); box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 9999; animation: fadeInScale 0.3s ease-out forwards; white-space: nowrap; text-align:center; }
   .toast-sgpc.error { background: #ef4444; }
   .toast-sgpc.success { background: #22c55e; }
    @keyframes fadeInScale { from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }

    /* ESTILOS TABLA Y BOTONES IGUAL A REGISTROS */
   .tabla-sgpc { width: 100%; border-collapse: collapse; }
   .tabla-sgpc thead tr { background: #f8fafc; }
   .tabla-sgpc th { padding: 1.2rem 1rem; text-align: left; font-size: 1.2rem; font-weight: 700; color: #475569; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
   .tabla-sgpc td { padding: 1.2rem 1rem; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 1.4rem; }
   .btn-icon { display: flex; align-items: center; justify-content: center; width: 3rem; height: 3rem; border-radius: 0.6rem; border: none; cursor: pointer; transition: all 0.2s ease; }
   .btn-icon-editar { background: #dbeafe; color: #1d4ed8; }
   .btn-icon-editar:hover { background: #bfdbfe; }
   .btn-icon-eliminar { background: #ef4444; color: white; }
   .btn-icon-eliminar:hover { background: #dc2626; }

    /* ESTILOS PAGINACION IGUAL A REGISTROS */
   .paginacion-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 1.6rem; padding: 1.6rem; background: var(--color-blanco); border-radius: 1.2rem; gap: 1.6rem; box-shadow: 0 1px 3px 0 rgba(0,0,0,0.1); }
   .paginacion-info { font-size: var(--text-sm); color: var(--color-texto-sec); margin: 0; }
   .paginacion-controles { display: flex; gap: 0.8rem; align-items: center; }
   .btn-pag { display: flex; align-items: center; gap: 0.4rem; padding: 0.8rem 1.2rem; border-radius: 0.8rem; font-size: var(--text-sm); font-weight: 600; border: 1px solid var(--color-borde); background: var(--color-blanco); color: var(--color-primario); cursor: pointer; transition: all 0.2s ease; }
   .btn-pag:hover:not(:disabled) { background: #f8fafc; }
   .btn-pag:disabled { opacity: 0.5; cursor: not-allowed; }
   .btn-pag-primario { background: var(--color-primario); color: var(--color-blanco); border: 1px solid var(--color-primario); }
   .btn-pag-primario:hover:not(:disabled) { opacity: 0.9; }
   .paginacion-pagina { padding: 0.8rem 1.2rem; font-weight: 600; font-size: var(--text-sm); white-space: nowrap; }

    @media (max-width: 768px) {
     .modal-body { grid-template-columns: 1fr!important; }
     .paginacion-footer { flex-direction: column; padding: 1.2rem; }
     .paginacion-controles { width: 100%; justify-content: space-between; }
    }
      `}</style>
    </div>
  )
}