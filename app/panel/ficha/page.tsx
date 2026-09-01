'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/client'
import { Plus, Edit, Trash2, X, Search, ChevronLeft, ChevronRight, BookOpen, Eraser, ClipboardList, Ban, CheckCircle} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast' // <-- NUEVO

type PeriodoAcademico = { idpa: number, nombre: string }
type Ficha = {
  idficha: number
  idpa: number | null
  tipoactor: string | null
  item: string | null
  observaciones: string | null
  estado: string | null // <-- NUEVO
  periodoacademico?: PeriodoAcademico
}

const TIPO_ACTOR_OPCIONES = ['Docente', 'Estudiante']
const FORM_INICIAL: Partial<Ficha> = {
  idpa: null,
  tipoactor: "",
  item: "",
  observaciones: "",
  estado: "ACTIVO" // <-- NUEVO
}

export default function FichaPage() {
  const supabase = createClient()
  const [fichas, setFichas] = useState<Ficha[]>([])
  const [periodos, setPeriodos] = useState<PeriodoAcademico[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [idAToggle, setIdAToggle] = useState<number | null>(null)
  const [estadoActual, setEstadoActual] = useState<string | null>(null) // <-- NUEVO
  const [editing, setEditing] = useState<Ficha | null>(null)
  const [form, setForm] = useState<Partial<Ficha>>(FORM_INICIAL)
  const [search, setSearch] = useState("")
  const [filtroPeriodo, setFiltroPeriodo] = useState<number | ''>('')
  const [filtroTipoActor, setFiltroTipoActor] = useState<string>('')
  const [filtroEstado, setFiltroEstado] = useState<string>('') // <-- NUEVO

  const [paginaActual, setPaginaActual] = useState(1)
  const registrosPorPagina = 10

  // YA NO NECESITAMOS showToast, USAMOS toast de react-hot-toast

  const fetchData = async () => {
    setLoading(true)
    const { data, error } = await supabase
 .from("ficha")
 .select(`*, periodoacademico(idpa, nombre)`)
 .order("idficha", { ascending: true })

    if (error) {
      toast.error("Error cargando Ficha: " + error.message)
    } else {
      setFichas(data || [])
    }

    const { data: dataPer } = await supabase.from("periodoacademico").select("idpa, nombre").order("nombre")
    setPeriodos(dataPer || [])

    setLoading(false)
    setPaginaActual(1)
  }

  useEffect(() => { fetchData() }, [])

  const puedeGuardar = useMemo(() =>
    form.idpa && form.tipoactor && form.item?.trim().length > 3
, [form])

  const fichasFiltrados = useMemo(() => fichas.filter(f => {
    const matchSearch = f.item?.toLowerCase().includes(search.toLowerCase()) ||
                        f.observaciones?.toLowerCase().includes(search.toLowerCase())
    const matchPeriodo = filtroPeriodo? f.idpa === Number(filtroPeriodo) : true
    const matchTipo = filtroTipoActor? f.tipoactor === filtroTipoActor : true
    const matchEstado = filtroEstado? f.estado === filtroEstado : true // <-- NUEVO
    return matchSearch && matchPeriodo && matchTipo && matchEstado
  }), [fichas, search, filtroPeriodo, filtroTipoActor, filtroEstado])

  const totalPaginas = Math.ceil(fichasFiltrados.length / registrosPorPagina)
  const indiceInicio = (paginaActual - 1) * registrosPorPagina
  const indiceFin = indiceInicio + registrosPorPagina
  const fichasPaginados = fichasFiltrados.slice(indiceInicio, indiceFin)
  useEffect(() => { setPaginaActual(1) }, [search, filtroPeriodo, filtroTipoActor, filtroEstado])

  const limpiarFiltros = () => {
    setSearch("")
    setFiltroPeriodo('')
    setFiltroTipoActor('')
    setFiltroEstado('') // <-- NUEVO
  }

  const handleSave = async () => {
    if (!puedeGuardar) return toast.error("Complete Periodo, Tipo Actor y Item *");
    try {
      const dataToSave = {
        idpa: form.idpa,
        tipoactor: form.tipoactor,
        item: form.item?.trim().toUpperCase() || "",
        observaciones: form.observaciones?.trim().toUpperCase() || null,
        estado: "ACTIVO" // Siempre activo al crear/editar
      }

      if (editing) {
        const { error } = await supabase.from("ficha").update(dataToSave).eq("idficha", editing.idficha);
        if (error) throw error;
        toast.success("Item actualizado correctamente");
      }
      else {
        const { error } = await supabase.from("ficha").insert(dataToSave);
        if (error) throw error;
        toast.success("Item registrado correctamente");
      }
      await fetchData();
      handleClose();
    } catch (err: any) {
      toast.error(err.message || "Error al guardar");
    }
  }

  // CAMBIO: Ahora es Soft Delete - Cambia estado
  const handleToggleEstado = (id: number, estado: string) => {
    setIdAToggle(id);
    setEstadoActual(estado);
    setShowConfirm(true)
  }
  const confirmarToggle = async () => {
    if (!idAToggle) return
    const nuevoEstado = estadoActual === 'ACTIVO'? 'INACTIVO' : 'ACTIVO'
    const { error } = await supabase.from("ficha").update({estado: nuevoEstado}).eq("idficha", idAToggle)
    if (error)
      toast.error("Error al cambiar estado: " + error.message)
    else {
      toast.success(`Item marcado como ${nuevoEstado}`);
      fetchData()
    }
    setShowConfirm(false);
    setIdAToggle(null)
  }

  const resetForm = () => {
    setForm({...FORM_INICIAL})
    setEditing(null)
  }

  const handleClose = () => {
    setShowModal(false);
    resetForm();
  }

  const openModal = (item?: Ficha) => {
    resetForm();
    if (item) {
      setEditing(item);
      setForm({
        idficha: item.idficha,
        idpa: item.idpa,
        tipoactor: item.tipoactor,
        item: item.item,
        observaciones: item.observaciones,
        estado: item.estado
      });
    }
    setShowModal(true)
  }

  return (
    <div>
      <Toaster position="top-center" /> {/* <-- NUEVO TOASTER */}

      <div className="header-responsive">
        <div><h1><ClipboardList size={24} style={{marginRight: "0.8rem", verticalAlign: "middle"}} />Registro ítems de Ficha</h1><p>Total: {fichasFiltrados.length} registros</p></div>
        <button className="btn-primario" onClick={() => openModal()}><Plus size={18} />Agregar Item</button>
      </div>

      <div className="card-sgpc" style={{ marginBottom: "2.4rem", padding: "2rem" }}>
        <div style={{ display: "flex", gap: "1.6rem", flexWrap: "wrap" }}>
          <div className="input-wrapper" style={{flex: 1, minWidth: "18rem"}}>
            <label className="input-label">Periodo Académico</label>
            <select className="input-sgpc-floating" value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)}>
              <option value="">-- TODOS --</option>
              {periodos.map(p => <option key={p.idpa} value={p.idpa}>{p.nombre}</option>)}
            </select>
          </div>
          <div className="input-wrapper" style={{flex: 1, minWidth: "18rem"}}>
            <label className="input-label">Tipo Actor</label>
            <select className="input-sgpc-floating" value={filtroTipoActor} onChange={e => setFiltroTipoActor(e.target.value)}>
              <option value="">-- TODOS --</option>
              {TIPO_ACTOR_OPCIONES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="input-wrapper" style={{flex: 1, minWidth: "18rem"}}> {/* NUEVO FILTRO */}
            <label className="input-label">Estado</label>
            <select className="input-sgpc-floating" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
              <option value="">-- TODOS --</option>
              <option value="ACTIVO">ACTIVO</option>
              <option value="INACTIVO">INACTIVO</option>
            </select>
          </div>
          <div style={{ position: "relative", flex: 2, minWidth: "25rem" }}>
            <Search size={18} style={{ position: "absolute", left: "1.2rem", top: "50%", transform: "translateY(-50%)", opacity: 0.5 }} />
            <input className="input-sgpc" placeholder="Buscar por Item u Observación..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: "4rem", height: "4.4rem" }} />
          </div>
          <button className="btn-secundario" onClick={limpiarFiltros} style={{whiteSpace: "nowrap", height: "4.4rem"}}><Eraser size={16} />Limpiar</button>
        </div>
      </div>

      <div className="card-sgpc" style={{ overflowX: "auto" }}>
        {loading? <p>Cargando...</p> : (
          <table className="tabla-sgpc">
            <thead><tr>
  <th style={{width: "6rem"}}>N°</th>
  <th>PERIODO ACADEMICO</th>
  <th>TIPO ACTOR</th>
  <th>ITEM</th>
  <th>OBSERVACIONES</th>
  <th>ESTADO</th>
  <th style={{width: "12rem"}}>ACCIONES</th>
</tr></thead>
<tbody>{fichasPaginados.map((f, index) => (
  <tr key={f.idficha} style={{opacity: f.estado === 'INACTIVO'? 0.5 : 1}}>
    <td style={{ fontWeight: 600 }}>{indiceInicio + index + 1}</td>
    <td>{f.periodoacademico?.nombre || '-'}</td>
    <td><span className={`badge-${f.tipoactor === 'Docente'? 'primario' : 'secundario'}`}>{f.tipoactor}</span></td>
    <td>{f.item}</td>
    <td>{f.observaciones || '-'}</td>
    <td>
      <span className={f.estado === 'ACTIVO'? 'badge-activo' : 'badge-inactivo'}>
        {f.estado === 'ACTIVO'? <CheckCircle size={14} /> : <Ban size={14} />} {f.estado}
      </span>
    </td>
    <td style={{ display: "flex", gap: "0.8rem" }}>
      <button className="btn-icon btn-icon-editar" onClick={() => openModal(f)}><Edit size={15} /></button>
      <button className="btn-icon btn-icon-eliminar" onClick={() => handleToggleEstado(f.idficha, f.estado || 'ACTIVO')}>
        {f.estado === 'ACTIVO'? <Trash2 size={15} /> : <CheckCircle size={15} />}
      </button>
    </td>
  </tr>
))}</tbody>
          </table>
        )}
      </div>

      {totalPaginas > 1 && (
        <div className="paginacion-footer">
          <p className="paginacion-info">Mostrando {indiceInicio + 1} al {Math.min(indiceFin, fichasFiltrados.length)} de {fichasFiltrados.length} registros</p>
          <div className="paginacion-controles">
            <button className="btn-pag" onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1}><ChevronLeft size={16} /> Anterior</button>
            <span className="paginacion-pagina">Pág {paginaActual} de {totalPaginas}</span>
            <button className="btn-pag btn-pag-primario" onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas}>Siguiente <ChevronRight size={16} /></button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" >
          <div className="modal-content card-sgpc" style={{maxWidth: "60rem"}} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h2><BookOpen size={20} style={{marginRight: "0.8rem"}}/>{editing? "Editar Item de Ficha" : "Nuevo Item de Ficha"}</h2><button onClick={handleClose} className="btn-cerrar"><X size={20} /></button></div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="input-wrapper">
                  <label className="input-label">Periodo Académico *</label>
                  <select className="input-sgpc-floating" value={form.idpa || ""} onChange={e => setForm({...form, idpa: Number(e.target.value) })}>
                    <option value="">-- SELECCIONE --</option>
                    {periodos.map(p => <option key={p.idpa} value={p.idpa}>{p.nombre}</option>)}
                  </select>
                </div>
                <div className="input-wrapper">
                  <label className="input-label">Tipo Actor *</label>
                  <select className="input-sgpc-floating" value={form.tipoactor || ""} onChange={e => setForm({...form, tipoactor: e.target.value })}>
                    <option value="">-- SELECCIONE --</option>
                    {TIPO_ACTOR_OPCIONES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="input-wrapper">
                <label className="input-label">Item *</label>
                <input className="input-sgpc-floating" placeholder="EJ: EL DOCENTE LLEGA PUNTUAL A CLASE" value={form.item || ""} onChange={e => setForm({...form, item: e.target.value.toUpperCase() })} maxLength={500} />
              </div>
              <div className="input-wrapper">
                <label className="input-label">Observaciones</label>
                <textarea className="input-sgpc-floating" placeholder="OBSERVACIONES ADICIONALES" value={form.observaciones || ""} onChange={e => setForm({...form, observaciones: e.target.value.toUpperCase() })} maxLength={500} style={{height: "8rem", resize: "vertical"}} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secundario" onClick={resetForm} type="button"><Eraser size={16} style={{marginRight: "0.5rem"}} />Limpiar</button>
              <button className="btn-primario" onClick={handleSave} disabled={!puedeGuardar}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="modal-overlay"><div className="modal-content card-sgpc" style={{ maxWidth: "40rem" }}>
          <div className="modal-header"><h2>{estadoActual === 'ACTIVO'? 'Desactivar' : 'Activar'} Item</h2><button onClick={() => setShowConfirm(false)} className="btn-cerrar"><X size={20} /></button></div>
          <div className="modal-body"><p style={{ textAlign: "center" }}>¿Está seguro de marcar este Item como {estadoActual === 'ACTIVO'? 'INACTIVO' : 'ACTIVO'}?</p></div>
          <div className="modal-footer"><button className="btn-secundario" onClick={() => setShowConfirm(false)}>Cancelar</button><button className="btn-primario" onClick={confirmarToggle}>{estadoActual === 'ACTIVO'? 'Desactivar' : 'Activar'}</button></div>
        </div></div>
      )}

      <style jsx>{`
   .btn-primario:disabled { opacity: 0.5; cursor: not-allowed; }
   .btn-cerrar { background: #f1f5f9; border: none; border-radius: 0.8rem; padding: 0.8rem; cursor: pointer; color: #64748b; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; }
   .btn-cerrar:hover { background: #fee2e2; color: #ef4444; transform: rotate(90deg); }
   .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 2rem; }
   .modal-content { width: 100%; background: var(--color-blanco); border-radius: 1.6rem; box-shadow: 0 20px 60px rgba(0,0,0,0.3); padding: 3.2rem; position: relative; display:flex; flex-direction:column; max-height:90vh; overflow-y: auto; }
   .modal-body { display: flex; flex-direction: column; gap: 2rem; }
   .input-wrapper { position: relative; width: 100%; }
   .input-sgpc-floating { width: 100%; box-sizing: border-box; padding: 1.2rem 1.4rem 1.2rem 1.4rem; border: 1px solid #e2e8f0; border-radius: 0.8rem; font-size: 1.4rem; font-family: var(--font-principal); background: var(--color-blanco); outline: none; transition: all 0.2s ease; color: var(--color-texto); height: 4.4rem; appearance: none; }
   .input-sgpc-floating:focus { border: 1px solid var(--color-primario); box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }
   .input-label { position: absolute; left: 1.2rem; top: -0.7rem; font-size: 1.1rem; color: var(--color-primario); font-weight: 600; background: var(--color-blanco); padding: 0 0.5rem; pointer-events: none; z-index: 1; }
   .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.6rem; }
   .badge-primario { background: #dbeafe; color: #1e40af; padding: 0.4rem 1rem; border-radius: 2rem; font-size: 1.2rem; font-weight: 600; }
   .badge-secundario { background: #fef3c7; color: #92400e; padding: 0.4rem 1rem; border-radius: 2rem; font-size: 1.2rem; font-weight: 600; }
   .badge-activo { background: #dcfce7; color: #166534; padding: 0.4rem 1rem; border-radius: 2rem; font-size: 1.2rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem; }
   .badge-inactivo { background: #fee2e2; color: #991b1b; padding: 0.4rem 1rem; border-radius: 2rem; font-size: 1.2rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem; }
        @media (max-width: 768px) {.grid-2 { grid-template-columns: 1fr!important; }}
      `}</style>
    </div>
  )
}