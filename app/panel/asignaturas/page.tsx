'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/client'
import { Plus, Edit, Trash2, X, Search, ChevronLeft, ChevronRight, FileText, Eraser, Filter} from 'lucide-react'

type Facultad = { idfacultad: number, nombrefacultad: string }
type Carrera = { idcarrera: number, idfacultad: number, nombrecarrera: string }
type Plan = { idplan: number, idcarrera: number, nombre: string }
type Asignatura = {
  idasignatura: number
  idcarrera: number | null
  idplan: number | null
  codigo: string | null
  nombre: string
  carrera?: Carrera & { facultad?: Facultad }
  planasignatura?: Plan
}

const FORM_INICIAL: Partial<Asignatura> = { idcarrera: null, idplan: null, codigo: "", nombre: "" }

export default function AsignaturasPage() {
  const supabase = createClient()
  const [asignaturas, setAsignaturas] = useState<Asignatura[]>([])
  const [facultades, setFacultades] = useState<Facultad[]>([])
  const [carreras, setCarreras] = useState<Carrera[]>([])
  const [planes, setPlanes] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [idAEliminar, setIdAEliminar] = useState<number | null>(null)
  const [editing, setEditing] = useState<Asignatura | null>(null)
  const [form, setForm] = useState<Partial<Asignatura>>(FORM_INICIAL)
  const [search, setSearch] = useState("")
  const [filtroFacultad, setFiltroFacultad] = useState<number | null>(null) // NUEVO
  const [filtroCarrera, setFiltroCarrera] = useState<number | null>(null) // NUEVO
  const [toast, setToast] = useState<{ msg: string; type: "error" | "success" } | null>(null)

  const [paginaActual, setPaginaActual] = useState(1)
  const registrosPorPagina = 10
  const showToast = (msg: string, type: "error" | "success" = "error") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  const fetchData = async () => {
    setLoading(true)
    const { data } = await supabase
    .from("asignatura")
    .select(`*, carrera(idcarrera, nombrecarrera, idfacultad, facultad(idfacultad, nombrefacultad)), planasignatura(idplan, nombre)`)
    .order("idasignatura", { ascending: true })
    setAsignaturas(data || [])

    const { data: dataFac } = await supabase.from("facultad").select("*").order("nombrefacultad")
    setFacultades(dataFac || [])
    const { data: dataCar } = await supabase.from("carrera").select("*").order("nombrecarrera")
    setCarreras(dataCar || [])
    const { data: dataPlan } = await supabase.from("planasignatura").select("*").order("nombre")
    setPlanes(dataPlan || [])
    setLoading(false); setPaginaActual(1)
  }
  useEffect(() => { fetchData() }, [])

  // Selects dependientes del MODAL
  const carrerasFiltradas = useMemo(() => carreras.filter(c => c.idfacultad === form.idfacultad), [carreras, form.idfacultad])
  const planesFiltrados = useMemo(() => planes.filter(p => p.idcarrera === form.idcarrera), [planes, form.idcarrera])

  // Selects dependientes del FILTRO
  const carrerasFiltro = useMemo(() => carreras.filter(c => c.idfacultad === filtroFacultad), [carreras, filtroFacultad])

  const puedeGuardar = useMemo(() => form.nombre?.trim().length > 3 && form.idcarrera && form.idplan, [form])

 const asignaturasFiltrados = useMemo(() => asignaturas.filter(a => {
    const matchSearch = a.nombre?.toLowerCase().includes(search.toLowerCase()) ||
                        a.codigo?.toLowerCase().includes(search.toLowerCase()) ||
                        a.carrera?.nombrecarrera?.toLowerCase().includes(search.toLowerCase()) ||
                        a.planasignatura?.nombre?.toLowerCase().includes(search.toLowerCase()) // NUEVO: BUSCAR POR PLAN
    const matchFac =!filtroFacultad || a.carrera?.idfacultad === filtroFacultad
    const matchCar =!filtroCarrera || a.idcarrera === filtroCarrera
    return matchSearch && matchFac && matchCar
  }), [asignaturas, search, filtroFacultad, filtroCarrera])

  // PAGINACION REAL
  const totalPaginas = Math.ceil(asignaturasFiltrados.length / registrosPorPagina)
  const indiceInicio = (paginaActual - 1) * registrosPorPagina
  const asignaturasPaginados = asignaturasFiltrados.slice(indiceInicio, indiceInicio + registrosPorPagina)

  useEffect(() => { setPaginaActual(1) }, [search, filtroFacultad, filtroCarrera])

  const limpiarFiltros = () => {
    setSearch(""); setFiltroFacultad(null); setFiltroCarrera(null);
  }

  const handleSave = async () => {
    if (!puedeGuardar) return showToast("Complete Facultad, Carrera, Plan y Nombre *", "error");
    try {
      let mensaje = "";
      const dataToSave = {...form, idcarrera: form.idcarrera, idplan: form.idplan, codigo: form.codigo?.trim().toUpperCase() || null, nombre: form.nombre?.trim().toUpperCase() || "" }
      if (editing) {
        const { error } = await supabase.from("asignatura").update(dataToSave).eq("idasignatura", editing.idasignatura);
        if (error) throw error; mensaje = "Asignatura actualizada correctamente";
      } else {
        const { error } = await supabase.from("asignatura").insert(dataToSave);
        if (error) throw error; mensaje = "Asignatura registrada correctamente";
      }
      showToast(mensaje, "success"); await fetchData(); handleClose();
    } catch (err: any) {
      if (err.code === "23505") showToast("El Código de Asignatura ya está registrado", "error")
      else showToast(err.message || "Error al guardar", "error");
    }
  }

  const handleDelete = (id: number) => { setIdAEliminar(id); setShowConfirm(true) }
  const confirmarEliminar = async () => {
    if (!idAEliminar) return
    const { error } = await supabase.from("asignatura").delete().eq("idasignatura", idAEliminar)
    if (error) showToast("Error al eliminar: " + error.message, "error")
    else { showToast("Asignatura eliminada correctamente", "success"); fetchData() }
    setShowConfirm(false); setIdAEliminar(null)
  }

  const resetForm = () => { setForm({...FORM_INICIAL}); setEditing(null) }
  const handleClose = () => { setShowModal(false); resetForm(); }

  const openModal = (item?: Asignatura) => {
    resetForm();
    if (item) {
      setForm({
        idasignatura: item.idasignatura, idcarrera: item.idcarrera, idplan: item.idplan,
        codigo: item.codigo, nombre: item.nombre, idfacultad: item.carrera?.idfacultad
      });
    }
    setShowModal(true)
  }

  return (
    <div>
      <div className="header-responsive">
        <div><h1>Registro de Asignaturas</h1><p>Total: {asignaturasFiltrados.length} registros</p></div>
        <button className="btn-primario" onClick={() => openModal()}><Plus size={18} />Nueva Asignatura</button>
      </div>

      {/* FILTROS EN 1 SOLA LINEA */}
      <div className="card-sgpc" style={{ marginBottom: "2.4rem", padding: "2rem" }}>
        <div className="filtros-linea">
          <div className="input-wrapper">
            <label className="input-label"><Filter size={12}/> Facultad</label>
            <select className="input-sgpc-floating" value={filtroFacultad || ""} onChange={e => { setFiltroFacultad(Number(e.target.value) || null); setFiltroCarrera(null); }}>
              <option value="">TODAS</option>
              {facultades.map(f => <option key={f.idfacultad} value={f.idfacultad}>{f.nombrefacultad}</option>)}
            </select>
          </div>
          <div className="input-wrapper">
            <label className="input-label"><Filter size={12}/> Carrera</label>
            <select className="input-sgpc-floating" value={filtroCarrera || ""} onChange={e => setFiltroCarrera(Number(e.target.value) || null)} disabled={!filtroFacultad}>
              <option value="">TODAS</option>
              {carrerasFiltro.map(c => <option key={c.idcarrera} value={c.idcarrera}>{c.nombrecarrera}</option>)}
            </select>
          </div>
          <div className="input-wrapper" style={{flex: 2}}>
            <label className="input-label"><Search size={12}/> Buscar</label>
            <input className="input-sgpc-floating" placeholder="Código, Nombre, Carrera, Plan..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn-secundario" onClick={limpiarFiltros} style={{height: "4.4rem", marginTop: "2.1rem"}}><Eraser size={16} />Limpiar</button>
        </div>
      </div>

      <div className="card-sgpc" style={{ overflowX: "auto" }}>
        {loading? <p>Cargando...</p> : (
          <table className="tabla-sgpc">
            <thead><tr>
              <th style={{width: "6rem"}}>NRO.</th><th>FACULTAD</th><th>CARRERA</th><th>PLAN</th><th>CÓDIGO</th><th>NOMBRE ASIGNATURA</th><th style={{width: "12rem"}}>ACCIONES</th>
            </tr></thead>
            <tbody>{asignaturasPaginados.length > 0? asignaturasPaginados.map((a, index) => (
              <tr key={a.idasignatura}>
                <td style={{ fontWeight: 600 }}>{indiceInicio + index + 1}</td>
                <td>{a.carrera?.facultad?.nombrefacultad || '-'}</td>
                <td>{a.carrera?.nombrecarrera || '-'}</td>
                <td>{a.planasignatura?.nombre || '-'}</td>
                <td style={{ fontWeight: 600 }}>{a.codigo || '-'}</td>
                <td>{a.nombre}</td>
                <td style={{ display: "flex", gap: "0.8rem" }}>
                  <button className="btn-icon btn-icon-editar" onClick={() => openModal(a)}><Edit size={15} /></button>
                  <button className="btn-icon btn-icon-eliminar" onClick={() => handleDelete(a.idasignatura)}><Trash2 size={15} /></button>
                </td>
              </tr>
            )) : <tr><td colSpan={7} style={{textAlign: "center", padding: "2rem"}}>No se encontraron registros</td></tr>}</tbody>
          </table>
        )}
      </div>

    {/* PAGINACION REAL CON ESTILOS GLOBALES */}
      {totalPaginas > 1 && (
        <div className="paginacion-footer">
          <p className="paginacion-info">
            Mostrando {indiceInicio + 1} al {Math.min(indiceInicio + registrosPorPagina, asignaturasFiltrados.length)} de {asignaturasFiltrados.length} registros
          </p>
          <div className="paginacion-controles">
            <button 
              className="btn-pag" 
              onClick={() => setPaginaActual(p => Math.max(1, p - 1))} 
              disabled={paginaActual === 1}
            >
              <ChevronLeft size={16} /> Anterior
            </button>
            
            <span className="paginacion-pagina">Pág {paginaActual} de {totalPaginas}</span>
            
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

      {/* MODAL IGUAL */}
      {showModal && (
        <div className="modal-overlay" onClick={handleClose}>
          <div className="modal-content card-sgpc" style={{maxWidth: "70rem"}} onClick={(e) => e.stopPropagation()}>
            {toast && (<div className={`toast-sgpc ${toast.type}`}>{toast.msg}</div>)}
            <div className="modal-header"><h2><FileText size={20} style={{marginRight: "0.8rem"}}/>{editing? "Editar Asignatura" : "Nueva Asignatura"}</h2><button onClick={handleClose} className="btn-cerrar"><X size={20} /></button></div>
            <div className="modal-body">
              <div className="grid-3">
                <div className="input-wrapper"><label className="input-label">Facultad *</label><select className="input-sgpc-floating" value={form.idfacultad || ""} onChange={e => setForm({...form, idfacultad: Number(e.target.value), idcarrera: null, idplan: null })}><option value="">-- SELECCIONE --</option>{facultades.map(f => <option key={f.idfacultad} value={f.idfacultad}>{f.nombrefacultad}</option>)}</select></div>
                <div className="input-wrapper"><label className="input-label">Carrera *</label><select className="input-sgpc-floating" value={form.idcarrera || ""} onChange={e => setForm({...form, idcarrera: Number(e.target.value), idplan: null })} disabled={!form.idfacultad}><option value="">-- SELECCIONE --</option>{carrerasFiltradas.map(c => <option key={c.idcarrera} value={c.idcarrera}>{c.nombrecarrera}</option>)}</select></div>
                <div className="input-wrapper"><label className="input-label">Plan *</label><select className="input-sgpc-floating" value={form.idplan || ""} onChange={e => setForm({...form, idplan: Number(e.target.value) })} disabled={!form.idcarrera}><option value="">-- SELECCIONE --</option>{planesFiltrados.map(p => <option key={p.idplan} value={p.idplan}>{p.nombre}</option>)}</select></div>
              </div>
              <div className="grid-2">
                <div className="input-wrapper"><label className="input-label">Código Asignatura</label><input className="input-sgpc-floating" placeholder="MED-101" value={form.codigo || ""} onChange={e => setForm({...form, codigo: e.target.value.toUpperCase() })} maxLength={20} style={{ textTransform: 'uppercase' }} /></div>
                <div className="input-wrapper"><label className="input-label">Nombre Asignatura *</label><input className="input-sgpc-floating" placeholder="ANATOMIA HUMANA" value={form.nombre || ""} onChange={e => setForm({...form, nombre: e.target.value.toUpperCase() })} maxLength={200} style={{ textTransform: 'uppercase' }} /></div>
              </div>
            </div>
            <div className="modal-footer"><button className="btn-secundario" onClick={resetForm} type="button"><Eraser size={16} style={{marginRight: "0.5rem"}} />Limpiar</button><button className="btn-primario" onClick={handleSave} disabled={!puedeGuardar}>Guardar</button></div>
          </div>
        </div>
      )}

      {showConfirm && ( <div className="modal-overlay"><div className="modal-content card-sgpc" style={{ maxWidth: "40rem" }}><div className="modal-header"><h2>Eliminar Asignatura</h2><button onClick={() => setShowConfirm(false)} className="btn-cerrar"><X size={20} /></button></div><div className="modal-body"><p style={{ textAlign: "center" }}>¿Está seguro de eliminar esta Asignatura?</p></div><div className="modal-footer"><button className="btn-secundario" onClick={() => setShowConfirm(false)}>Cancelar</button><button className="btn-primario btn-danger" onClick={confirmarEliminar}>Eliminar</button></div></div></div> )}

      <style jsx>{`
       .filtros-linea { display: grid; grid-template-columns: 1.5fr 1.5fr 3fr auto; gap: 1.6rem; align-items: end; }
        @media (max-width: 1024px) {.filtros-linea { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 768px) {.filtros-linea { grid-template-columns: 1fr; } }
       
       .paginacion-controles button:disabled { opacity: 0.5; cursor: not-allowed; }
       .btn-danger { background: #ef4444; color: white; }.btn-primario:disabled { opacity: 0.5; cursor: not-allowed; }
       .btn-cerrar { background: #f1f5f9; border: none; border-radius: 0.8rem; padding: 0.8rem; cursor: pointer; color: #64748b; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; }
       .btn-cerrar:hover { background: #fee2e2; color: #ef4444; transform: rotate(90deg); }
       .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 2rem; }
       .modal-content { width: 100%; background: var(--color-blanco); border-radius: 1.6rem; box-shadow: 0 20px 60px rgba(0,0,0,0.3); padding: 3.2rem; position: relative; display:flex; flex-direction:column; max-height:90vh; overflow-y: auto; }
       .modal-body { display: flex; flex-direction: column; gap: 2rem; }
       .input-wrapper { position: relative; width: 100%; }
       .input-sgpc-floating { width: 100%; box-sizing: border-box; padding: 1.2rem 1.4rem; border: 1px solid #e2e8f0; border-radius: 0.8rem; font-size: 1.4rem; font-family: var(--font-principal); background: var(--color-blanco); outline: none; transition: all 0.2s ease; color: var(--color-texto); height: 4.4rem; appearance: none; }
       .input-sgpc-floating:focus { border: 1px solid var(--color-primario); box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }
       .input-label { position: absolute; left: 1.2rem; top: -0.7rem; font-size: 1.1rem; color: var(--color-primario); font-weight: 600; background: var(--color-blanco); padding: 0 0.5rem; pointer-events: none; z-index: 1; display:flex; align-items:center; gap:0.4rem; }
       .toast-sgpc { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); padding: 2rem 2rem; border-radius: 0.8rem; font-size: var(--text-sm); font-weight: 700; color: var(--color-blanco); box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 9999; animation: fadeInScale 0.3s ease-out forwards; white-space: nowrap; text-align:center; }
       .toast-sgpc.error { background: #ef4444; }.toast-sgpc.success { background: #22c55e; }
        @keyframes fadeInScale { from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
       .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.6rem; }
       .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1.6rem; }
        @media (max-width: 1024px) {.grid-3 { grid-template-columns: 1fr!important; }}
        @media (max-width: 768px) {.grid-2 { grid-template-columns: 1fr!important; }}
      `}</style>
    </div>
  )
}