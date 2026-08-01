'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/client'
import { Plus, Edit, Trash2, X, Search, ChevronLeft, ChevronRight, BookOpen, Eraser} from 'lucide-react'

type Facultad = { idfacultad: number, nombrefacultad: string }
type Carrera = {
  idcarrera: number
  idfacultad: number | null
  codigocarrera: string | null
  nombrecarrera: string
  facultad?: Facultad // para el join
}

const FORM_INICIAL: Partial<Carrera> = {
  idfacultad: null,
  codigocarrera: "",
  nombrecarrera: "",
}

export default function CarrerasPage() {
  const supabase = createClient()
  const [carreras, setCarreras] = useState<Carrera[]>([])
  const [facultades, setFacultades] = useState<Facultad[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [idAEliminar, setIdAEliminar] = useState<number | null>(null)
  const [editing, setEditing] = useState<Carrera | null>(null)
  const [form, setForm] = useState<Partial<Carrera>>(FORM_INICIAL)
  const [search, setSearch] = useState("")
  const [toast, setToast] = useState<{ msg: string; type: "error" | "success" } | null>(null)

  const [paginaActual, setPaginaActual] = useState(1)
  const registrosPorPagina = 10

  const showToast = (msg: string, type: "error" | "success" = "error") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchData = async () => {
    setLoading(true)
    // Traemos carreras con el nombre de facultad
    const { data, error } = await supabase
   .from("carrera")
   .select(`*, facultad(idfacultad, nombrefacultad)`)
   .order("idcarrera", { ascending: true })

    if (error) {
      showToast("Error cargando Carreras: " + error.message, "error")
    } else {
      setCarreras(data || [])
    }

    // Traemos facultades para el select
    const { data: dataFac } = await supabase.from("facultad").select("idfacultad, nombrefacultad").order("nombrefacultad")
    setFacultades(dataFac || [])

    setLoading(false)
    setPaginaActual(1)
  }

  useEffect(() => { fetchData() }, [])

  const puedeGuardar = useMemo(() =>
    form.nombrecarrera?.trim().length > 3 && form.idfacultad
, [form])

  const carrerasFiltrados = useMemo(() => carreras.filter(c => {
    const matchSearch = c.nombrecarrera?.toLowerCase().includes(search.toLowerCase()) ||
                        c.codigocarrera?.toLowerCase().includes(search.toLowerCase()) ||
                        c.facultad?.nombrefacultad?.toLowerCase().includes(search.toLowerCase())
    return matchSearch
  }), [carreras, search])

  const totalPaginas = Math.ceil(carrerasFiltrados.length / registrosPorPagina)
  const indiceInicio = (paginaActual - 1) * registrosPorPagina
  const indiceFin = indiceInicio + registrosPorPagina
  const carrerasPaginados = carrerasFiltrados.slice(indiceInicio, indiceFin)
  useEffect(() => { setPaginaActual(1) }, [search])

  const limpiarFiltros = () => setSearch("")

  const handleSave = async () => {
    if (!puedeGuardar) return showToast("Complete Facultad y Nombre de Carrera *", "error");
    try {
      let mensaje = "";
      const dataToSave = {
      ...form,
        idfacultad: form.idfacultad,
        codigocarrera: form.codigocarrera?.trim().toUpperCase() || null,
        nombrecarrera: form.nombrecarrera?.trim().toUpperCase() || "" // TODO MAYÚSCULAS
      }

      if (editing) {
        const { error } = await supabase.from("carrera").update(dataToSave).eq("idcarrera", editing.idcarrera);
        if (error) throw error;
        mensaje = "Carrera actualizada correctamente";
      }
      else {
        const { error } = await supabase.from("carrera").insert(dataToSave);
        if (error) throw error;
        mensaje = "Carrera registrada correctamente";
      }
      showToast(mensaje, "success");
      await fetchData();
      handleClose();
    } catch (err: any) {
      if (err.code === "23505")
        showToast("El Código de Carrera ya está registrado", "error")
      else
        showToast(err.message || "Error al guardar", "error");
    }
  }

  const handleDelete = (id: number) => { setIdAEliminar(id); setShowConfirm(true) }
  const confirmarEliminar = async () => {
    if (!idAEliminar) return
    const { error } = await supabase.from("carrera").delete().eq("idcarrera", idAEliminar)
    if (error)
      showToast("Error al eliminar: " + error.message, "error")
    else {
      showToast("Carrera eliminada correctamente", "success");
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

  const openModal = (item?: Carrera) => {
    resetForm();
    if (item) {
      setEditing(item);
      setForm({
        idcarrera: item.idcarrera,
        idfacultad: item.idfacultad,
        codigocarrera: item.codigocarrera,
        nombrecarrera: item.nombrecarrera,
      });
    }
    setShowModal(true)
  }

  return (
    <div>
      <div className="header-responsive">
        <div><h1>Registro de Carreras</h1><p>Total: {carrerasFiltrados.length} registros</p></div>
        <button className="btn-primario" onClick={() => openModal()}><Plus size={18} />Nueva Carrera</button>
      </div>

      <div className="card-sgpc" style={{ marginBottom: "2.4rem", padding: "2rem" }}>
        <div style={{ display: "flex", gap: "1.6rem" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={18} style={{ position: "absolute", left: "1.2rem", top: "50%", transform: "translateY(-50%)", opacity: 0.5 }} />
            <input className="input-sgpc" placeholder="Buscar por Código, Nombre de Carrera o Facultad..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: "4rem" }} />
          </div>
          <button className="btn-secundario" onClick={limpiarFiltros} style={{whiteSpace: "nowrap"}}><Eraser size={16} />Limpiar</button>
        </div>
      </div>

      <div className="card-sgpc" style={{ overflowX: "auto" }}>
        {loading? <p>Cargando...</p> : (
          <table className="tabla-sgpc">
            <thead><tr>
              <th style={{width: "6rem"}}>NRO.</th>
              <th>FACULTAD</th>
              <th>CÓDIGO</th>
              <th>NOMBRE DE CARRERA</th>
              <th style={{width: "12rem"}}>ACCIONES</th>
            </tr></thead>
            <tbody>{carrerasPaginados.map((c, index) => (
              <tr key={c.idcarrera}>
                <td style={{ fontWeight: 600 }}>{indiceInicio + index + 1}</td>
                <td>{c.facultad?.nombrefacultad || '-'}</td>
                <td style={{ fontWeight: 600 }}>{c.codigocarrera || '-'}</td>
                <td>{c.nombrecarrera}</td>
                <td style={{ display: "flex", gap: "0.8rem" }}>
                  <button className="btn-icon btn-icon-editar" onClick={() => openModal(c)}><Edit size={15} /></button>
                  <button className="btn-icon btn-icon-eliminar" onClick={() => handleDelete(c.idcarrera)}><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      {totalPaginas > 1 && (
        <div className="paginacion-footer">
          <p className="paginacion-info">Mostrando {indiceInicio + 1} al {Math.min(indiceFin, carrerasFiltrados.length)} de {carrerasFiltrados.length} registros</p>
          <div className="paginacion-controles">
            <button className="btn-pag" onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1}><ChevronLeft size={16} /> Anterior</button>
            <span className="paginacion-pagina">Pág {paginaActual} de {totalPaginas}</span>
            <button className="btn-pag btn-pag-primario" onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas}>Siguiente <ChevronRight size={16} /></button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={handleClose}>
          <div className="modal-content card-sgpc" style={{maxWidth: "60rem"}} onClick={(e) => e.stopPropagation()}>
            {toast && (<div className={`toast-sgpc ${toast.type}`}>{toast.msg}</div>)}
            <div className="modal-header"><h2><BookOpen size={20} style={{marginRight: "0.8rem"}}/>{editing? "Editar Carrera" : "Nueva Carrera"}</h2><button onClick={handleClose} className="btn-cerrar"><X size={20} /></button></div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="input-wrapper">
                  <label className="input-label">Facultad *</label>
                  <select className="input-sgpc-floating" value={form.idfacultad || ""} onChange={e => setForm({...form, idfacultad: Number(e.target.value) })}>
                    <option value="">-- SELECCIONE --</option>
                    {facultades.map(f => <option key={f.idfacultad} value={f.idfacultad}>{f.nombrefacultad}</option>)}
                  </select>
                </div>
                <div className="input-wrapper">
                  <label className="input-label">Código Carrera</label>
                  <input className="input-sgpc-floating" placeholder="CARR-01" value={form.codigocarrera || ""} onChange={e => setForm({...form, codigocarrera: e.target.value.toUpperCase() })} maxLength={20} style={{ textTransform: 'uppercase' }} />
                </div>
              </div>
              <div className="input-wrapper">
                <label className="input-label">Nombre de Carrera *</label>
                <input className="input-sgpc-floating" placeholder="MEDICINA HUMANA" value={form.nombrecarrera || ""} onChange={e => setForm({...form, nombrecarrera: e.target.value.toUpperCase() })} maxLength={200} style={{ textTransform: 'uppercase' }} />
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
          <div className="modal-header"><h2>Eliminar Carrera</h2><button onClick={() => setShowConfirm(false)} className="btn-cerrar"><X size={20} /></button></div>
          <div className="modal-body"><p style={{ textAlign: "center" }}>¿Está seguro de eliminar esta Carrera? Esta acción no se puede deshacer.</p></div>
          <div className="modal-footer"><button className="btn-secundario" onClick={() => setShowConfirm(false)}>Cancelar</button><button className="btn-primario btn-danger" onClick={confirmarEliminar}>Eliminar</button></div>
        </div></div>
      )}

      <style jsx>{`
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