'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/client'
import { Plus, Edit, Trash2, X, Search, ChevronLeft, ChevronRight, Stethoscope, Eraser} from 'lucide-react'

type Especialidad = {
  idespecialidad: number
  especialidad: string | null
}

const FORM_INICIAL: Partial<Especialidad> = {
  especialidad: "",
}

export default function EspecialidadPage() {
  const supabase = createClient()
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [idAEliminar, setIdAEliminar] = useState<number | null>(null)
  const [editing, setEditing] = useState<Especialidad | null>(null)
  const [form, setForm] = useState<Partial<Especialidad>>(FORM_INICIAL)
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
    .from("especialidad")
    .select("*")
    .order("especialidad", { ascending: true })

    if (error) {
      showToast("Error cargando Especialidades: " + error.message, "error")
    } else {
      setEspecialidades(data || [])
    }
    setLoading(false)
    setPaginaActual(1)
  }

  useEffect(() => { fetchData() }, [])

  const puedeGuardar = useMemo(() =>
    form.especialidad?.trim().length > 3
 , [form])

  const especialidadesFiltradas = useMemo(() => especialidades.filter(e => {
    const matchSearch = e.especialidad?.toLowerCase().includes(search.toLowerCase())
    return matchSearch
  }), [especialidades, search])

  const totalPaginas = Math.ceil(especialidadesFiltradas.length / registrosPorPagina)
  const indiceInicio = (paginaActual - 1) * registrosPorPagina
  const indiceFin = indiceInicio + registrosPorPagina
  const especialidadesPaginadas = especialidadesFiltradas.slice(indiceInicio, indiceFin)

  useEffect(() => { setPaginaActual(1) }, [search])

  const limpiarFiltros = () => setSearch("")

  const handleSave = async () => {
    if (!puedeGuardar) return showToast("Complete el Nombre de Especialidad *", "error");
    try {
      let mensaje = "";
      const dataToSave = {
        especialidad: toTitleCase(form.especialidad?.trim() || "")
      }

      if (editing) {
        const { error } = await supabase.from("especialidad").update(dataToSave).eq("idespecialidad", editing.idespecialidad);
        if (error) throw error;
        mensaje = "Especialidad actualizada correctamente";
      }
      else {
        const { error } = await supabase.from("especialidad").insert(dataToSave);
        if (error) throw error;
        mensaje = "Especialidad registrada correctamente";
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
    const { error } = await supabase.from("especialidad").delete().eq("idespecialidad", idAEliminar)
    if (error)
      showToast("Error al eliminar: " + error.message, "error")
    else {
      showToast("Especialidad eliminada correctamente", "success");
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

  const openModal = (item?: Especialidad) => {
    resetForm();
    if (item) {
      setEditing(item);
      setForm({
        idespecialidad: item.idespecialidad,
        especialidad: item.especialidad,
      });
    }
    setShowModal(true)
  }

  return (
    <div>
      <div className="header-responsive">
        <div><h1>Registro de Especialidades</h1><p>Total: {especialidadesFiltradas.length} registros</p></div>
        <button className="btn-primario" onClick={() => openModal()}><Plus size={18} />Nueva Especialidad</button>
      </div>

      <div className="card-sgpc" style={{ marginBottom: "2.4rem", padding: "2rem" }}>
        <div style={{ display: "flex", gap: "1.6rem" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={18} style={{ position: "absolute", left: "1.2rem", top: "50%", transform: "translateY(-50%)", opacity: 0.5 }} />
            <input className="input-sgpc" placeholder="Buscar Especialidad..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: "4rem" }} />
          </div>
          <button className="btn-secundario" onClick={limpiarFiltros} style={{whiteSpace: "nowrap"}}><Eraser size={16} />Limpiar</button>
        </div>
      </div>

      <div className="card-sgpc" style={{ overflowX: "auto" }}>
        {loading? <p>Cargando...</p> : (
          <table className="tabla-sgpc">
            <thead><tr>
              <th style={{width: "6rem"}}>NRO.</th>
              <th>NOMBRE DE ESPECIALIDAD</th>
              <th style={{width: "12rem"}}>ACCIONES</th>
            </tr></thead>
            <tbody>{especialidadesPaginadas.map((e, index) => (
              <tr key={e.idespecialidad}>
                <td style={{ fontWeight: 600 }}>{indiceInicio + index + 1}</td>
                <td>{e.especialidad}</td>
                <td style={{ display: "flex", gap: "0.8rem" }}>
                  <button className="btn-icon btn-icon-editar" onClick={() => openModal(e)}><Edit size={15} /></button>
                  <button className="btn-icon btn-icon-eliminar" onClick={() => handleDelete(e.idespecialidad)}><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      {totalPaginas > 1 && (
        <div className="paginacion-footer">
          <p className="paginacion-info">Mostrando {indiceInicio + 1} al {Math.min(indiceFin, especialidadesFiltradas.length)} de {especialidadesFiltradas.length} registros</p>
          <div className="paginacion-controles">
            <button className="btn-pag" onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1}><ChevronLeft size={16} /> Anterior</button>
            <span className="paginacion-pagina">Pág {paginaActual} de {totalPaginas}</span>
            <button className="btn-pag btn-pag-primario" onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas}>Siguiente <ChevronRight size={16} /></button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={handleClose}>
          <div className="modal-content card-sgpc" style={{maxWidth: "50rem"}} onClick={(e) => e.stopPropagation()}>
            {toast && (<div className={`toast-sgpc ${toast.type}`}>{toast.msg}</div>)}
            <div className="modal-header"><h2><Stethoscope size={20} style={{marginRight: "0.8rem"}}/>{editing? "Editar Especialidad" : "Nueva Especialidad"}</h2><button onClick={handleClose} className="btn-cerrar"><X size={20} /></button></div>
            <div className="modal-body">
              <div className="input-wrapper">
                <label className="input-label">Nombre de Especialidad *</label>
                <input className="input-sgpc-floating" placeholder="CARDIOLOGÍA" value={form.especialidad || ""} onChange={e => setForm({...form, especialidad: e.target.value })} maxLength={200} />
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
          <div className="modal-header"><h2>Eliminar Especialidad</h2><button onClick={() => setShowConfirm(false)} className="btn-cerrar"><X size={20} /></button></div>
          <div className="modal-body"><p style={{ textAlign: "center" }}>¿Está seguro de eliminar esta Especialidad? Esta acción no se puede deshacer.</p></div>
          <div className="modal-footer"><button className="btn-secundario" onClick={() => setShowConfirm(false)}>Cancelar</button><button className="btn-primario btn-danger" onClick={confirmarEliminar}>Eliminar</button></div>
        </div></div>
      )}
      <style jsx>{`
  .btn-danger { background: #ef4444; color: white; }
  .btn-primario:disabled { opacity: 0.5; cursor: not-allowed; }
  
  .btn-cerrar { 
    background: #f1f5f9; 
    border: none; 
    border-radius: 0.8rem; 
    padding: 0.8rem; 
    cursor: pointer; 
    color: #64748b; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    transition: all 0.2s ease; 
  }
  .btn-cerrar:hover { 
    background: #fee2e2; 
    color: #ef4444; 
    transform: rotate(90deg); 
  }

  .modal-overlay { 
    position: fixed; 
    inset: 0; 
    background: rgba(0,0,0,0.3); 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    z-index: 2000; 
    padding: 2rem; 
  }
  .modal-content { 
    width: 100%; 
    background: var(--color-blanco); 
    border-radius: 1.6rem; 
    box-shadow: 0 20px 60px rgba(0,0,0,0.3); 
    padding: 3.2rem; 
    position: relative; 
    display:flex; 
    flex-direction:column; 
    max-height:90vh; 
    overflow-y: auto; 
  }
  .modal-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:2.4rem; }
  .modal-header h2 { display:flex; align-items:center; font-size: var(--text-xl); color: var(--color-texto); }
  .modal-body { display: flex; flex-direction: column; gap: 2rem; }
  .modal-footer { display:flex; justify-content:flex-end; gap:1.2rem; margin-top:2.4rem; }

  .input-wrapper { position: relative; width: 100%; }
  .input-sgpc-floating { 
    width: 100%; 
    box-sizing: border-box; 
    padding: 1.2rem 1.4rem 1.2rem 1.4rem; 
    border: 1px solid #e2e8f0; 
    border-radius: 0.8rem; 
    font-size: 1.4rem; 
    font-family: var(--font-principal); 
    background: var(--color-blanco); 
    outline: none; 
    transition: all 0.2s ease; 
    color: var(--color-texto); 
    height: 4.4rem; 
    appearance: none; 
  }
  .input-sgpc-floating:focus { 
    border: 1px solid var(--color-primario); 
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); 
  }
  .input-label { 
    position: absolute; 
    left: 1.2rem; 
    top: -0.7rem; 
    font-size: 1.1rem; 
    color: var(--color-primario); 
    font-weight: 600; 
    background: var(--color-blanco); 
    padding: 0 0.5rem; 
    pointer-events: none; 
    z-index: 1; 
  }

  .toast-sgpc { 
    position: absolute; 
    top: 50%; 
    left: 50%; 
    transform: translate(-50%,-50%); 
    padding: 2rem 2rem; 
    border-radius: 0.8rem; 
    font-size: var(--text-sm); 
    font-weight: 700; 
    color: var(--color-blanco); 
    box-shadow: 0 4px 12px rgba(0,0,0,0.2); 
    z-index: 9999; 
    animation: fadeInScale 0.3s ease-out forwards; 
    white-space: nowrap; 
    text-align:center; 
  }
  .toast-sgpc.error { background: #ef4444; }
  .toast-sgpc.success { background: #22c55e; }
  @keyframes fadeInScale { from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
`}</style>
    </div>
  )
}