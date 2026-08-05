'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/client'
import { Plus, Edit, X, Search, ChevronLeft, ChevronRight, FileText, Eraser, Filter, BookOpen, Power, PowerOff} from 'lucide-react'

type Facultad = { idfacultad: number, nombrefacultad: string }
type Carrera = { idcarrera: number, idfacultad: number, nombrecarrera: string }
type Plan = {
  idplan: number,
  idcarrera: number,
  nombre: string,
  estado: boolean, // NUEVO
  carrera?: Carrera & { facultad?: Facultad }
}

const FORM_INICIAL: Partial<Plan> = { idcarrera: null, nombre: "", estado: true }

export default function PlanAsignaturaPage() {
  const supabase = createClient()
  const [planes, setPlanes] = useState<Plan[]>([])
  const [facultades, setFacultades] = useState<Facultad[]>([])
  const [carreras, setCarreras] = useState<Carrera[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false) // Ahora es para Activar/Desactivar
  const [idACambiar, setIdACambiar] = useState<number | null>(null)
  const [estadoACambiar, setEstadoACambiar] = useState<boolean | null>(null)
  const [editing, setEditing] = useState<Plan | null>(null)
  const [form, setForm] = useState<Partial<Plan>>(FORM_INICIAL)
  const [search, setSearch] = useState("")
  const [filtroFacultad, setFiltroFacultad] = useState<number | null>(null)
  const [filtroCarrera, setFiltroCarrera] = useState<number | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<string>("true") // NUEVO: Por defecto Activos
  const [toast, setToast] = useState<{ msg: string; type: "error" | "success" } | null>(null)

  const [paginaActual, setPaginaActual] = useState(1)
  const registrosPorPagina = 10
  const showToast = (msg: string, type: "error" | "success" = "error") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  const fetchData = async () => {
    setLoading(true)
    const { data } = await supabase
    .from("planasignatura")
    .select(`*, carrera(idcarrera, nombrecarrera, idfacultad, facultad(idfacultad, nombrefacultad))`)
    .order("idplan", { ascending: true })
    setPlanes(data || [])

    const { data: dataFac } = await supabase.from("facultad").select("*").order("nombrefacultad")
    setFacultades(dataFac || [])
    const { data: dataCar } = await supabase.from("carrera").select("*").order("nombrecarrera")
    setCarreras(dataCar || [])
    setLoading(false); setPaginaActual(1)
  }
  useEffect(() => { fetchData() }, [])

  const carrerasFiltradas = useMemo(() => carreras.filter(c => c.idfacultad === form.idfacultad), [carreras, form.idfacultad])
  const carrerasFiltro = useMemo(() => carreras.filter(c => c.idfacultad === filtroFacultad), [carreras, filtroFacultad])

  const puedeGuardar = useMemo(() => form.nombre?.trim().length > 2 && form.idcarrera, [form])

  const planesFiltrados = useMemo(() => planes.filter(p => {
    const matchSearch = p.nombre?.toLowerCase().includes(search.toLowerCase()) ||
                        p.carrera?.nombrecarrera?.toLowerCase().includes(search.toLowerCase())
    const matchFac =!filtroFacultad || p.carrera?.idfacultad === filtroFacultad
    const matchCar =!filtroCarrera || p.idcarrera === filtroCarrera
    const matchEstado = filtroEstado === "" || String(p.estado) === filtroEstado // NUEVO
    return matchSearch && matchFac && matchCar && matchEstado
  }), [planes, search, filtroFacultad, filtroCarrera, filtroEstado])

  const totalPaginas = Math.ceil(planesFiltrados.length / registrosPorPagina)
  const indiceInicio = (paginaActual - 1) * registrosPorPagina
  const planesPaginados = planesFiltrados.slice(indiceInicio, indiceInicio + registrosPorPagina)

  useEffect(() => { setPaginaActual(1) }, [search, filtroFacultad, filtroCarrera, filtroEstado])

  const limpiarFiltros = () => {
    setSearch(""); setFiltroFacultad(null); setFiltroCarrera(null); setFiltroEstado("true");
  }

  const handleSave = async () => {
    if (!puedeGuardar) return showToast("Complete Facultad, Carrera y Nombre del Plan *", "error");
    try {
      let mensaje = "";
      const { idfacultad,...dataToSave } = form;
      dataToSave.nombre = form.nombre?.trim().toUpperCase() || "";

      if (editing) {
        const { error } = await supabase.from("planasignatura").update({...dataToSave, fechamodificacion: new Date()}).eq("idplan", editing.idplan);
        if (error) throw error; mensaje = "Plan actualizado correctamente";
      } else {
        const { error } = await supabase.from("planasignatura").insert(dataToSave);
        if (error) throw error; mensaje = "Plan registrado correctamente";
      }
      showToast(mensaje, "success"); await fetchData(); handleClose();
    } catch (err: any) {
      showToast(err.message || "Error al guardar", "error");
    }
  }

  // CAMBIO: Ahora es Activar/Desactivar
  const handleCambiarEstado = (id: number, estadoActual: boolean) => {
    setIdACambiar(id);
    setEstadoACambiar(!estadoActual);
    setShowConfirm(true)
  }

  const confirmarCambioEstado = async () => {
    if (idACambiar === null || estadoACambiar === null) return
    const { error } = await supabase.from("planasignatura").update({estado: estadoACambiar, fechamodificacion: new Date()}).eq("idplan", idACambiar)
    if (error) showToast("Error al cambiar estado: " + error.message, "error")
    else { showToast(`Plan ${estadoACambiar? 'activado' : 'desactivado'} correctamente`, "success"); fetchData() }
    setShowConfirm(false); setIdACambiar(null); setEstadoACambiar(null);
  }

  const resetForm = () => { setForm({...FORM_INICIAL}); setEditing(null) }
  const handleClose = () => { setShowModal(false); resetForm(); }

  const openModal = (item?: Plan) => {
    resetForm();
    if (item) {
      setForm({
        idplan: item.idplan, idcarrera: item.idcarrera,
        nombre: item.nombre, idfacultad: item.carrera?.idfacultad, estado: item.estado
      });
    }
    setShowModal(true)
  }

  return (
    <div>
      <div className="header-responsive">
        <div><h1>Gestión de Planes de Estudio</h1><p>Total: {planesFiltrados.length} registros</p></div>
        <button className="btn-primario" onClick={() => openModal()}><Plus size={18} />Nuevo Plan</button>
      </div>

      {/* FILTROS EN 1 SOLA LINEA */}
      <div className="card-sgpc" style={{ marginBottom: "2.4rem", padding: "2rem" }}>
        <div className="filtros-linea-4"> {/* Cambié a 4 columnas */}
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
          <div className="input-wrapper">
            <label className="input-label"><Filter size={12}/> Estado</label> {/* NUEVO */}
            <select className="input-sgpc-floating" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
              <option value="true">ACTIVOS</option>
              <option value="false">INACTIVOS</option>
              <option value="">TODOS</option>
            </select>
          </div>
          <div className="input-wrapper" style={{flex: 2}}>
            <label className="input-label"><Search size={12}/> Buscar</label>
            <input className="input-sgpc-floating" placeholder="Nombre Plan, Carrera..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn-secundario" onClick={limpiarFiltros} style={{height: "4.4rem", marginTop: "2.1rem"}}><Eraser size={16} />Limpiar</button>
        </div>
      </div>

      <div className="card-sgpc" style={{ overflowX: "auto" }}>
        {loading? <p>Cargando...</p> : (
          <table className="tabla-sgpc">
            <thead><tr>
              <th style={{width: "6rem"}}>NRO.</th><th>FACULTAD</th><th>CARRERA</th><th>NOMBRE DEL PLAN</th><th style={{width: "10rem"}}>ESTADO</th><th style={{width: "12rem"}}>ACCIONES</th>
            </tr></thead>
            <tbody>
  {planesPaginados.length > 0? planesPaginados.map((p, index) => (
    <tr key={p.idplan} style={{ opacity: p.estado? 1 : 0.6 }}>
      <td style={{ fontWeight: 600 }}>{indiceInicio + index + 1}</td>
      <td>{p.carrera?.facultad?.nombrefacultad || '-'}</td>
      <td>{p.carrera?.nombrecarrera || '-'}</td>
      <td style={{ fontWeight: 600 }}>{p.nombre}</td>
      <td>
        <span className={`badge-estado ${p.estado? 'activo' : 'inactivo'}`}>
          {p.estado? 'ACTIVO' : 'INACTIVO'}
        </span>
      </td>
      <td style={{ display: "flex", gap: "0.8rem" }}>
        <button className="btn-icon btn-icon-editar" onClick={() => openModal(p)}><Edit size={15} /></button>
        <button
          className={`btn-icon ${p.estado? 'btn-icon-eliminar' : 'btn-icon-activar'}`}
          onClick={() => handleCambiarEstado(p.idplan, p.estado)}
          title={p.estado? 'Desactivar' : 'Activar'}
        >
          {p.estado? <PowerOff size={15} /> : <Power size={15} />}
        </button>
      </td>
    </tr>
  )) : <tr><td colSpan={6} style={{textAlign: "center", padding: "2rem"}}>No se encontraron registros</td></tr>}
</tbody>
          </table>
        )}
      </div>

      {/* PAGINACION */}
      {totalPaginas > 1 && (
        <div className="paginacion-footer">
          <p className="paginacion-info">Mostrando {indiceInicio + 1} al {Math.min(indiceInicio + registrosPorPagina, planesFiltrados.length)} de {planesFiltrados.length} registros</p>
          <div className="paginacion-controles">
            <button className="btn-pag" onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1}><ChevronLeft size={16} /> Anterior</button>
            <span className="paginacion-pagina">Pág {paginaActual} de {totalPaginas}</span>
            <button className="btn-pag btn-pag-primario" onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas}>Siguiente <ChevronRight size={16} /></button>
          </div>
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={handleClose}>
          <div className="modal-content card-sgpc" style={{maxWidth: "60rem"}} onClick={(e) => e.stopPropagation()}>
            {toast && (<div className={`toast-sgpc ${toast.type}`}>{toast.msg}</div>)}
            <div className="modal-header"><h2><BookOpen size={20} style={{marginRight: "0.8rem"}}/>{editing? "Editar Plan" : "Nuevo Plan de Estudio"}</h2><button onClick={handleClose} className="btn-cerrar"><X size={20} /></button></div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="input-wrapper"><label className="input-label">Facultad *</label><select className="input-sgpc-floating" value={form.idfacultad || ""} onChange={e => setForm({...form, idfacultad: Number(e.target.value), idcarrera: null })}><option value="">-- SELECCIONE --</option>{facultades.map(f => <option key={f.idfacultad} value={f.idfacultad}>{f.nombrefacultad}</option>)}</select></div>
                <div className="input-wrapper"><label className="input-label">Carrera *</label><select className="input-sgpc-floating" value={form.idcarrera || ""} onChange={e => setForm({...form, idcarrera: Number(e.target.value) })} disabled={!form.idfacultad}><option value="">-- SELECCIONE --</option>{carrerasFiltradas.map(c => <option key={c.idcarrera} value={c.idcarrera}>{c.nombrecarrera}</option>)}</select></div>
              </div>
              <div className="input-wrapper"><label className="input-label">Nombre del Plan *</label><input className="input-sgpc-floating" placeholder="PLAN 2024" value={form.nombre || ""} onChange={e => setForm({...form, nombre: e.target.value.toUpperCase() })} maxLength={20} style={{ textTransform: 'uppercase' }} /></div>
            </div>
            <div className="modal-footer"><button className="btn-secundario" onClick={resetForm} type="button"><Eraser size={16} style={{marginRight: "0.5rem"}} />Limpiar</button><button className="btn-primario" onClick={handleSave} disabled={!puedeGuardar}>Guardar</button></div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR ACTIVAR/DESACTIVAR */}
     {showConfirm && (
  <div className="modal-overlay">
    <div className="modal-content card-sgpc" style={{ maxWidth: "40rem" }}>
      <div className="modal-header"><h2>{estadoACambiar? 'Activar Plan' : 'Desactivar Plan'}</h2><button onClick={() => setShowConfirm(false)} className="btn-cerrar"><X size={20} /></button></div>
      <div className="modal-body"><p style={{ textAlign: "center" }}>¿Está seguro de {estadoACambiar? 'activar' : 'desactivar'} este Plan?</p></div>
      <div className="modal-footer">
        <button className="btn-secundario" onClick={() => setShowConfirm(false)}>Cancelar</button>
        <button 
          className={`btn-primario ${!estadoACambiar ? 'btn-danger' : ''}`} 
          onClick={confirmarCambioEstado}
        >
          {estadoACambiar? 'Activar' : 'Desactivar'}
        </button>
      </div>
    </div>
  </div>
)}

      <style jsx>{`
     .filtros-linea-4 { display: grid; grid-template-columns: 1.2fr 1.2fr 1fr 2.5fr auto; gap: 1.6rem; align-items: end; }
        @media (max-width: 1200px) {.filtros-linea-4 { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 768px) {.filtros-linea-4 { grid-template-columns: 1fr; } }

     .badge-estado { padding: 0.4rem 1rem; border-radius: 2rem; font-size: 1.1rem; font-weight: 700; text-transform: uppercase; }
     .badge-estado.activo { background: #dcfce7; color: #166534; }
     .badge-estado.inactivo { background: #fee2e2; color: #991b1b; }

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
        @media (max-width: 768px) {.grid-2 { grid-template-columns: 1fr!important; }}
      `}</style>
    </div>
  )
}