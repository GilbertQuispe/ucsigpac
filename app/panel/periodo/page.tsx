'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/client'
import { Plus, Edit, Trash2, X, Search, ChevronLeft, ChevronRight, Calendar, Eraser} from 'lucide-react'

type Periodo = {
  idpa: number
  codigo: string | null
  nombre: string | null
  fecha_inicio: string | null
  fecha_fin: string | null
  estado: string | null
}

const FORM_INICIAL: Partial<Periodo> = {
  codigo: "",
  nombre: "",
  fecha_inicio: "",
  fecha_fin: "",
  estado: "ACTIVO"
}

export default function PeriodoPage() {
  const supabase = createClient()
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [idAEliminar, setIdAEliminar] = useState<number | null>(null)
  const [editing, setEditing] = useState<Periodo | null>(null)
  const [form, setForm] = useState<Partial<Periodo>>(FORM_INICIAL)
  const [search, setSearch] = useState("")
  const [toast, setToast] = useState<{ msg: string; type: "error" | "success" } | null>(null)

  const [paginaActual, setPaginaActual] = useState(1)
  const registrosPorPagina = 10

  const showToast = (msg: string, type: "error" | "success" = "error") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const toTitleCase = (str: string) => str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase())

  const fetchData = async () => {
    setLoading(true)
    const { data, error } = await supabase
    .from("periodoacademico")
    .select("*")
    .order("fecha_inicio", { ascending: false })

    if (error) {
      showToast("Error cargando Periodos: " + error.message, "error")
    } else {
      setPeriodos(data || [])
    }
    setLoading(false)
    setPaginaActual(1)
  }

  useEffect(() => { fetchData() }, [])

  const puedeGuardar = useMemo(() =>
    form.nombre?.trim().length > 3 &&
    form.fecha_inicio &&
    form.fecha_fin
, [form])

  const periodosFiltrados = useMemo(() => periodos.filter(p => {
    const matchSearch = p.nombre?.toLowerCase().includes(search.toLowerCase()) || p.codigo?.toLowerCase().includes(search.toLowerCase())
    return matchSearch
  }), [periodos, search])

  const totalPaginas = Math.ceil(periodosFiltrados.length / registrosPorPagina)
  const indiceInicio = (paginaActual - 1) * registrosPorPagina
  const indiceFin = indiceInicio + registrosPorPagina
  const periodosPaginados = periodosFiltrados.slice(indiceInicio, indiceFin)
  useEffect(() => { setPaginaActual(1) }, [search])

  const limpiarFiltros = () => setSearch("")

  const handleSave = async () => {
    if (!puedeGuardar) return showToast("Complete Nombre, Fecha Inicio y Fecha Fin *", "error");
    if(form.fecha_fin! < form.fecha_inicio!) return showToast("La Fecha Fin debe ser mayor a Fecha Inicio", "error");

    try {
      let mensaje = "";
      const dataToSave = {
      ...form,
        codigo: form.codigo?.trim().toUpperCase() || null,
        nombre: toTitleCase(form.nombre?.trim() || "")
      }

      if (editing) {
        const { error } = await supabase.from("periodoacademico").update(dataToSave).eq("idpa", editing.idpa);
        if (error) throw error;
        mensaje = "Periodo actualizado correctamente";
      }
      else {
        const { error } = await supabase.from("periodoacademico").insert(dataToSave);
        if (error) throw error;
        mensaje = "Periodo registrado correctamente";
      }
      showToast(mensaje, "success");
      await fetchData();
      handleClose();
    } catch (err: any) {
      showToast(err.message || "Error al guardar", "error");
    }
  }

  const handleDelete = (id: number) => { setIdAEliminar(id); setShowConfirm(true) }
  const confirmarEliminar = async () => {
    if (!idAEliminar) return
    const { error } = await supabase.from("periodoacademico").update({ estado: "INACTIVO" }).eq("idpa", idAEliminar)
    if (error)
      showToast("Error al anular: " + error.message, "error")
    else {
      showToast("Periodo anulado correctamente", "success");
      fetchData()
    }
    setShowConfirm(false);
    setIdAEliminar(null)
  }

  const resetForm = () => {
    setForm({...FORM_INICIAL})
    setEditing(null)
  }

  const handleClose = () => {
    setShowModal(false);
    resetForm();
  }

  const openModal = (item?: Periodo) => {
    resetForm();
    if (item) {
      setEditing(item);
      setForm({
        idpa: item.idpa,
        codigo: item.codigo,
        nombre: item.nombre,
        fecha_inicio: item.fecha_inicio,
        fecha_fin: item.fecha_fin,
        estado: item.estado,
      });
    }
    setShowModal(true)
  }

  const formatearFecha = (fecha: string | null) => {
    if(!fecha) return '-'
    return new Date(fecha + 'T00:00:00').toLocaleDateString('es-PE')
  }

  return (
    <div>
      <div className="header-responsive">
        <div><h1>Registro de Periodo Académico</h1><p>Total: {periodosFiltrados.length} registros</p></div>
        <button className="btn-primario" onClick={() => openModal()}><Plus size={18} />Nuevo Periodo</button>
      </div>

      <div className="card-sgpc" style={{ marginBottom: "2.4rem", padding: "2rem" }}>
        <div style={{ display: "flex", gap: "1.6rem" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={18} style={{ position: "absolute", left: "1.2rem", top: "50%", transform: "translateY(-50%)", opacity: 0.5 }} />
            <input className="input-sgpc" placeholder="Buscar por Código o Nombre de Periodo..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: "4rem" }} />
          </div>
          <button className="btn-secundario" onClick={limpiarFiltros} style={{whiteSpace: "nowrap"}}><Eraser size={16} />Limpiar</button>
        </div>
      </div>

      <div className="card-sgpc" style={{ overflowX: "auto" }}>
        {loading? <p>Cargando...</p> : (
          <table className="tabla-sgpc">
            <thead><tr>
              <th style={{width: "6rem"}}>NRO.</th>
              <th>CÓDIGO</th>
              <th>NOMBRE PERIODO</th>
              <th>FECHA INICIO</th>
              <th>FECHA FIN</th>
              <th>ESTADO</th>
              <th style={{width: "12rem"}}>ACCIONES</th>
            </tr></thead>
            <tbody>{periodosPaginados.map((p, index) => (
              <tr key={p.idpa}>
                <td style={{ fontWeight: 600 }}>{indiceInicio + index + 1}</td>
                <td style={{ fontWeight: 600 }}>{p.codigo || '-'}</td>
                <td>{p.nombre}</td>
                <td>{formatearFecha(p.fecha_inicio)}</td>
                <td>{formatearFecha(p.fecha_fin)}</td>
                <td><span className={`chip-estado ${p.estado === "ACTIVO"? "chip-activo" : "chip-inactivo"}`}>{p.estado}</span></td>
                <td style={{ display: "flex", gap: "0.8rem" }}>
                  <button className="btn-icon btn-icon-editar" onClick={() => openModal(p)}><Edit size={15} /></button>
                  <button className="btn-icon btn-icon-eliminar" onClick={() => handleDelete(p.idpa)}><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      {totalPaginas > 1 && (
        <div className="paginacion-footer">
          <p className="paginacion-info">Mostrando {indiceInicio + 1} al {Math.min(indiceFin, periodosFiltrados.length)} de {periodosFiltrados.length} registros</p>
          <div className="paginacion-controles">
            <button className="btn-pag" onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1}><ChevronLeft size={16} /> Anterior</button>
            <span className="paginacion-pagina">Pág {paginaActual} de {totalPaginas}</span>
            <button className="btn-pag btn-pag-primario" onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas}>Siguiente <ChevronRight size={16} /></button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={handleClose}>
          <div className="modal-content card-sgpc" style={{maxWidth: "70rem"}} onClick={(e) => e.stopPropagation()}>
            {toast && (<div className={`toast-sgpc ${toast.type}`}>{toast.msg}</div>)}
            <div className="modal-header"><h2><Calendar size={20} style={{marginRight: "0.8rem"}}/>{editing? "Editar Periodo" : "Nuevo Periodo"}</h2><button onClick={handleClose} className="btn-cerrar"><X size={20} /></button></div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="input-wrapper">
                  <label className="input-label">Código Periodo</label>
                  <input className="input-sgpc-floating" placeholder="2026-I" value={form.codigo || ""} onChange={e => setForm({...form, codigo: e.target.value.toUpperCase() })} maxLength={20} />
                </div>
                <div className="input-wrapper">
                  <label className="input-label">Nombre Periodo *</label>
                  <input className="input-sgpc-floating" placeholder="Semestre 2026 - I" value={form.nombre || ""} onChange={e => setForm({...form, nombre: e.target.value })} maxLength={100} />
                </div>
              </div>
              <div className="grid-2">
                <div className="input-wrapper">
                  <label className="input-label">Fecha Inicio *</label>
                  <input type="date" className="input-sgpc-floating" value={form.fecha_inicio || ""} onChange={e => setForm({...form, fecha_inicio: e.target.value })} />
                </div>
                <div className="input-wrapper">
                  <label className="input-label">Fecha Fin *</label>
                  <input type="date" className="input-sgpc-floating" value={form.fecha_fin || ""} onChange={e => setForm({...form, fecha_fin: e.target.value })} />
                </div>
              </div>
              <div className="input-wrapper">
                <label className="input-label">Estado</label>
                <select className="input-sgpc-floating" value={form.estado || "ACTIVO"} onChange={e => setForm({...form, estado: e.target.value })}>
                  <option value="ACTIVO">ACTIVO</option>
                  <option value="INACTIVO">INACTIVO</option>
                </select>
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
          <div className="modal-header"><h2>Anular Periodo</h2><button onClick={() => setShowConfirm(false)} className="btn-cerrar"><X size={20} /></button></div>
          <div className="modal-body"><p style={{ textAlign: "center" }}>¿Está seguro de anular este Periodo? Cambiará a estado INACTIVO.</p></div>
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
      .modal-body { display: flex; flex-direction: column; gap: 2rem; }
      .input-wrapper { position: relative; width: 100%; }
      .input-sgpc-floating { width: 100%; box-sizing: border-box; padding: 1.2rem 1.4rem 1.2rem 1.4rem; border: 1px solid #e2e8f0; border-radius: 0.8rem; font-size: 1.4rem; font-family: var(--font-principal); background: var(--color-blanco); outline: none; transition: all 0.2s ease; color: var(--color-texto); height: 4.4rem; appearance: none; }
      .input-sgpc-floating:focus { border: 1px solid var(--color-primario); box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }
      .input-label { position: absolute; left: 1.2rem; top: -0.7rem; font-size: 1.1rem; color: var(--color-primario); font-weight: 600; background: var(--color-blanco); padding: 0 0.5rem; pointer-events: none; z-index: 1; }
      .toast-sgpc { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); padding: 2rem 2rem; border-radius: 0.8rem; font-size: var(--text-sm); font-weight: 700; color: var(--color-blanco); box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 9999; animation: fadeInScale 0.3s ease-out forwards; white-space: nowrap; text-align:center; }
      .toast-sgpc.error { background: #ef4444; }
      .toast-sgpc.success { background: #22c55e; }
        @keyframes fadeInScale { from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
      .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.6rem; }
        @media (max-width: 768px) {.grid-2 { grid-template-columns: 1fr!important; }}
      `}</style>
    </div>
  )
}