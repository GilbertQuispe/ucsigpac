'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/client'
import { Plus, Edit, Trash2, X, Search, ChevronLeft, ChevronRight, Building, MapPin, Phone, Eraser, Filter} from 'lucide-react'
import Select from 'react-select'

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
  distrito?: { nombredt: string, idprovincia: number, provincia?: { nombrep: string, iddepartamento: number, departamento?: { nombred: string } }}
  nivelatencion?: { codigo: string | null, nombre: string } // 1. AGREGADO CODIGO
  tipoeps?: { nombretipoeps: string }
}
type Distrito = { iddistrito: number, nombredt: string, idprovincia: number }
type Provincia = { idprovincia: number, nombrep: string, iddepartamento: number }
type Departamento = { iddepartamento: number, nombred: string }
type Nivel = { idnivela: number, codigo: string | null, nombre: string }
type TipoEps = { idtipoeps: number, nombretipoeps: string }

const FORM_INICIAL: Partial<Eps> = {
  estado: "ACTIVO",
  ruc: "",
  razonsocial: "",
  direccion: "",
  telefono: "",
  contacto: "",
  iddistrito: null,
  idnivela: null,
  idtipoeps: null
}

export default function EpsPage() {
  const supabase = createClient()
  const [eps, setEps] = useState<Eps[]>([])
  const [distritos, setDistritos] = useState<Distrito[]>([])
  const [provincias, setProvincias] = useState<Provincia[]>([])
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [niveles, setNiveles] = useState<Nivel[]>([])
  const [tipos, setTipos] = useState<TipoEps[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [idAEliminar, setIdAEliminar] = useState<number | null>(null)
  const [editing, setEditing] = useState<Eps | null>(null)
  const [form, setForm] = useState<Partial<Eps>>(FORM_INICIAL)
  const [search, setSearch] = useState("")
  const [toast, setToast] = useState<{ msg: string; type: "error" | "success" } | null>(null)

  const [paginaActual, setPaginaActual] = useState(1)
  const registrosPorPagina = 10
  const [idDeptoSel, setIdDeptoSel] = useState<number | undefined>(undefined)
  const [idProvSel, setIdProvSel] = useState<number | undefined>(undefined)

  const [filtroDepto, setFiltroDepto] = useState<number | null>(null)
  const [filtroProv, setFiltroProv] = useState<number | null>(null)
  const [filtroDist, setFiltroDist] = useState<number | null>(null)
  const [filtroTipo, setFiltroTipo] = useState<number | null>(null)

  const showToast = (msg: string, type: "error" | "success" = "error") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const toTitleCase = (str: string) => str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase())

  const fetchData = async () => {
  setLoading(true)
  
  let allEps: Eps[] = []
  let from = 0
  const pageSize = 1000
  let hasMore = true

  while (hasMore) {
    const { data, error } = await supabase
      .from("eps")
      .select(`
        *,
        distrito!iddistrito (
          nombredt,
          idprovincia,
          provincia!idprovincia (
            nombrep,
            iddepartamento,
            departamento!iddepartamento ( nombred )
          )
        ),
        nivelatencion!idnivela ( codigo, nombre ),
        tipoeps!idtipoeps ( nombretipoeps )
      `)
      .order("ideps")
      .range(from, from + pageSize - 1)

    if (error) {
      console.error("ERROR SUPABASE EPS:", error) // <-- MIRA LA CONSOLA AQUI
      showToast("Error cargando EPS: " + error.message + " | Detalle: " + error.details, "error")
      break
    }

    if (data && data.length > 0) {
      allEps = [...allEps, ...data]
      hasMore = data.length === pageSize
      from += pageSize
    } else {
      hasMore = false
    }
  }

  const { data: distData } = await supabase.from("distrito").select("iddistrito, nombredt, idprovincia").eq("estado", "ACTIVO").order("nombredt").range(0, 9999)
  const { data: provData } = await supabase.from("provincia").select("idprovincia, nombrep, iddepartamento").eq("estado", "ACTIVO").order("nombrep").range(0, 9999)
  const { data: deptoData } = await supabase.from("departamento").select("iddepartamento, nombred").eq("estado", "ACTIVO").order("nombred").range(0, 9999)
  const { data: nivData } = await supabase.from("nivelatencion").select("idnivela, codigo, nombre").order("idnivela").range(0, 9999) // Cambié a order por id
  const { data: tipoData } = await supabase.from("tipoeps").select("*").order("nombretipoeps").range(0, 9999)

  setEps(allEps || []); setDistritos(distData || []); setProvincias(provData || []); setDepartamentos(deptoData || []); setNiveles(nivData || []); setTipos(tipoData || [])
  setLoading(false); setPaginaActual(1)
}

  useEffect(() => { fetchData() }, [])

  const puedeGuardar = useMemo(() =>
    form.ruc?.trim().length === 11 &&
    form.razonsocial?.trim() &&
    form.iddistrito &&
    form.idnivela &&
    form.idtipoeps
, [form])

  const provinciasFiltro = useMemo(() => filtroDepto? provincias.filter(p => p.iddepartamento === filtroDepto) : [], [filtroDepto, provincias])
  const distritosFiltro = useMemo(() => filtroProv? distritos.filter(d => d.idprovincia === filtroProv) : [], [filtroProv, distritos])

  const epsFiltrados = useMemo(() => eps.filter(e => {
    const matchSearch = e.razonsocial?.toLowerCase().includes(search.toLowerCase()) || e.ruc?.includes(search)
    const matchDepto =!filtroDepto || e.distrito?.provincia?.iddepartamento === filtroDepto
    const matchProv =!filtroProv || e.distrito?.idprovincia === filtroProv
    const matchDist =!filtroDist || e.iddistrito === filtroDist
    const matchTipo =!filtroTipo || e.idtipoeps === filtroTipo
    return matchSearch && matchDepto && matchProv && matchDist && matchTipo
  }), [eps, search, filtroDepto, filtroProv, filtroDist, filtroTipo])

  const provinciasFiltradas = useMemo(() => idDeptoSel? provincias.filter(p => p.iddepartamento === idDeptoSel) : [], [idDeptoSel, provincias])
  const distritosFiltrados = useMemo(() => idProvSel? distritos.filter(d => d.idprovincia === idProvSel) : [], [idProvSel, distritos])
  const totalPaginas = Math.ceil(epsFiltrados.length / registrosPorPagina)
  const indiceInicio = (paginaActual - 1) * registrosPorPagina
  const indiceFin = indiceInicio + registrosPorPagina
  const epsPaginados = epsFiltrados.slice(indiceInicio, indiceFin)
  useEffect(() => { setPaginaActual(1) }, [search, filtroDepto, filtroProv, filtroDist, filtroTipo])

  const limpiarFiltros = () => {
    setFiltroDepto(null); setFiltroProv(null); setFiltroDist(null); setFiltroTipo(null); setSearch("")
  }

  const handleSave = async () => {
  if (!puedeGuardar) return showToast("Complete todos los campos obligatorios *", "error");
  try {
    let mensaje = "";
    const dataToSave = {
     ...form,
      ruc: form.ruc?.trim(),
      razonsocial: toTitleCase(form.razonsocial?.trim() || ""),
      direccion: toTitleCase(form.direccion?.trim() || ""),
      contacto: toTitleCase(form.contacto?.trim() || "")
    }

    delete (dataToSave as any).distrito
    delete (dataToSave as any).nivelatencion
    delete (dataToSave as any).tipoeps

    if (editing) {
      const { error } = await supabase.from("eps").update(dataToSave).eq("ideps", editing.ideps);
      if (error) throw error;
      mensaje = "EPS actualizada correctamente";
    }
    else {
      const { error } = await supabase.from("eps").insert(dataToSave);
      if (error) throw error;
      mensaje = "EPS registrada correctamente";
    }
    showToast(mensaje, "success");
    await fetchData();
    handleClose();
  } catch (err: any) {
    if (err.code === "23505")
      showToast("El RUC ya está registrado", "error")
    else
      showToast(err.message || "Error al guardar", "error");
  }
}

  const handleDelete = (id: number) => { setIdAEliminar(id); setShowConfirm(true) }
  const confirmarEliminar = async () => {
    if (!idAEliminar) return
    const { error } = await supabase.from("eps").update({ estado: "INACTIVO" }).eq("ideps", idAEliminar)
    if (error)
      showToast("Error al anular: " + error.message, "error")
    else {
      showToast("EPS anulada correctamente", "success");
      fetchData()
    }
    setShowConfirm(false);
    setIdAEliminar(null)
  }

  const resetForm = () => {
    setForm({...FORM_INICIAL})
    setIdDeptoSel(undefined)
    setIdProvSel(undefined)
    setEditing(null)
  }

  const handleClose = () => {
    setShowModal(false);
    resetForm();
  }

 const openModal = (item?: Eps) => {
  resetForm();
  if (item) {
    setEditing(item);
    setForm({
      ideps: item.ideps,
      ruc: item.ruc,
      razonsocial: item.razonsocial,
      direccion: item.direccion,
      telefono: item.telefono,
      contacto: item.contacto,
      estado: item.estado,
      iddistrito: item.iddistrito,
      idnivela: item.idnivela,
      idtipoeps: item.idtipoeps,
    });

    const dist = distritos.find(d => d.iddistrito === item.iddistrito)
    if(dist){
      setIdProvSel(dist.idprovincia);
      const prov = provincias.find(p => p.idprovincia === dist.idprovincia);
      if(prov) setIdDeptoSel(prov.iddepartamento)
    }
  }
  setShowModal(true)
}
  const SelectSGPC = ({label, value, onChange, options, placeholder, isDisabled = false}:any) => {
  const selectedOption = options.find((o:any) => o.value === value) || null
  return (
    <div className="input-wrapper">
      <label className="input-label">{label}</label>
      <Select
        options={options}
        value={selectedOption}
        onChange={(opt:any) => onChange(opt?.value || null)}
        placeholder={placeholder}
        isDisabled={isDisabled}
        isSearchable={true}
        menuPortalTarget={typeof document!== 'undefined'? document.body : null}
        classNamePrefix="react-select"
        noOptionsMessage={() => "No se encontraron resultados"}
        styles={{
          control: (base) => ({
        ...base,
            minHeight: '4.4rem',
            height: '4.4rem',
            borderRadius: '0.8rem',
            borderColor: '#e2e8f0',
            boxShadow: 'none',
            fontSize: '1.4rem',
            fontFamily: 'var(--font-principal)',
            '&:hover': { borderColor: 'var(--color-primario)' }
          }),
          menuPortal: (base) => ({...base, zIndex: 99999 }),
          menu: (base) => ({...base, fontSize: '1.4rem' }),
          singleValue: (base) => ({...base, color: 'var(--color-texto)' }),
          option: (base, state) => ({
        ...base,
            backgroundColor: state.isSelected? 'var(--color-primario)' : state.isFocused? '#f1f5f9' : 'white',
            color: state.isSelected? 'white' : '#1e293b'
          }),
          input: (base) => ({...base, color: 'var(--color-texto)'})
        }}
      />
    </div>
  )
}

  return (
    <div>
      <div className="header-responsive">
        <div><h1>Registro de EPS</h1><p>Total: {epsFiltrados.length} registros</p></div>
        <button className="btn-primario" onClick={() => openModal()}><Plus size={18} />Nueva EPS</button>
      </div>

      <div className="card-sgpc" style={{ marginBottom: "2.4rem", padding: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginBottom: "1.6rem" }}><Filter size={18} /><h3 style={{margin: 0, fontSize: "1.6rem"}}>Filtros</h3></div>
        <div className="grid-4" style={{ gap: "1.6rem" }}>
          <SelectSGPC label="Departamento" value={filtroDepto || ""} onChange={(val:any) => {setFiltroDepto(val); setFiltroProv(null); setFiltroDist(null)}} placeholder="Todos" options={departamentos.map(d => ({value: d.iddepartamento, label: d.nombred}))} />
          <SelectSGPC label="Provincia" value={filtroProv || ""} onChange={(val:any) => {setFiltroProv(val); setFiltroDist(null)}} placeholder="Todos" options={provinciasFiltro.map(p => ({value: p.idprovincia, label: p.nombrep}))} isDisabled={!filtroDepto} />
          <SelectSGPC label="Distrito" value={filtroDist || ""} onChange={(val:any) => setFiltroDist(val)} placeholder="Todos" options={distritosFiltro.map(d => ({value: d.iddistrito, label: d.nombredt}))} isDisabled={!filtroProv} />
          <SelectSGPC label="Tipo EPS" value={filtroTipo || ""} onChange={(val:any) => setFiltroTipo(val)} placeholder="Todos" options={tipos.map(t => ({value: t.idtipoeps, label: t.nombretipoeps}))} />
        </div>
        <div style={{ display: "flex", gap: "1.6rem", marginTop: "1.6rem" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={18} style={{ position: "absolute", left: "1.2rem", top: "50%", transform: "translateY(-50%)", opacity: 0.5 }} />
            <input className="input-sgpc" placeholder="Buscar por Razón Social o RUC..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: "4rem" }} />
          </div>
          <button className="btn-secundario" onClick={limpiarFiltros} style={{whiteSpace: "nowrap"}}><Eraser size={16} />Limpiar Filtros</button>
        </div>
      </div>

      <div className="card-sgpc" style={{ overflowX: "auto" }}>
        {loading? <p>Cargando...</p> : (
          <table className="tabla-sgpc">
  <thead><tr><th style={{width: "6rem"}}>NRO.</th>
    <th>RUC</th>
    <th>RAZÓN SOCIAL</th>
    <th>CÓD. NIVEL</th>
    <th>NIVEL</th>
    <th>DEPARTAMENTO</th>
    <th>PROVINCIA</th>
    <th>DISTRITO</th>
    <th>TIPO EPS</th>
    <th>ESTADO</th>
    <th>ACCIONES</th></tr></thead>
            <tbody>{epsPaginados.map((e, index) => (
  <tr key={e.ideps}><td style={{ fontWeight: 600 }}>{indiceInicio + index + 1}</td>
    <td style={{ fontWeight: 600 }}>{e.ruc}</td>
    <td>{e.razonsocial}</td>
    <td><span className="badge-nivel">{e.nivelatencion?.codigo || '-'}</span></td>
    <td style={{ fontSize: "1.3rem" }}>{e.nivelatencion?.nombre || "-"}</td>
    <td style={{ fontSize: "1.3rem" }}>{e.distrito?.provincia?.departamento?.nombred || "-"}</td>
    <td style={{ fontSize: "1.3rem" }}>{e.distrito?.provincia?.nombrep || "-"}</td>
    <td style={{ fontSize: "1.3rem" }}>{e.distrito?.nombredt || "-"}</td>
    <td style={{ fontSize: "1.3rem" }}>{e.tipoeps?.nombretipoeps || "-"}</td>
    <td><span className={`chip-estado ${e.estado === "ACTIVO"? "chip-activo" : "chip-inactivo"}`}>{e.estado}</span></td>
    <td style={{ display: "flex", gap: "0.8rem" }}>
      <button className="btn-icon btn-icon-editar" onClick={() => openModal(e)}><Edit size={15} /></button>
      <button className="btn-icon btn-icon-eliminar" onClick={() => handleDelete(e.ideps)}><Trash2 size={15} /></button>
    </td></tr>
))}</tbody>
          </table>
        )}
      </div>
      {totalPaginas > 1 && (
        <div className="paginacion-footer">
          <p className="paginacion-info">Mostrando {indiceInicio + 1} al {Math.min(indiceFin, epsFiltrados.length)} de {epsFiltrados.length} registros</p>
          <div className="paginacion-controles">
            <button className="btn-pag" onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1}><ChevronLeft size={16} /> Anterior</button>
            <span className="paginacion-pagina">Pág {paginaActual} de {totalPaginas}</span>
            <button className="btn-pag btn-pag-primario" onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas}>Siguiente <ChevronRight size={16} /></button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={handleClose}>
          <div className="modal-content card-sgpc" style={{maxWidth: "78rem"}} onClick={(e) => e.stopPropagation()}>
            {toast && (<div className={`toast-sgpc ${toast.type}`}>{toast.msg}</div>)}
            <div className="modal-header"><h2><Building size={20} style={{marginRight: "0.8rem"}}/>{editing? "Editar EPS" : "Nueva EPS"}</h2><button onClick={handleClose} className="btn-cerrar"><X size={20} /></button></div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="input-wrapper"><label className="input-label">RUC *</label><input className="input-sgpc-floating" placeholder="20123456789" value={form.ruc || ""} onChange={e => setForm({...form, ruc: e.target.value.replace(/\D/g,"") })} maxLength={11} /></div>
                <div className="input-wrapper"><label className="input-label">Razón Social *</label><input className="input-sgpc-floating" placeholder="EPS RIMAC S.A." value={form.razonsocial || ""} onChange={e => setForm({...form, razonsocial: e.target.value })} maxLength={250} /></div>

                <SelectSGPC
                  label="Nivel de Atención *"
                  value={form.idnivela || ""}
                  onChange={(val:any) => setForm({...form, idnivela: Number(val) })}
                  placeholder="Seleccione"
                  options={niveles.map(n => ({value: n.idnivela, label: `${n.codigo || n.idnivela} - ${n.nombre}`}))} // 5. ACTUALIZADO
                />

                <SelectSGPC
                  label="Tipo EPS *"
                  value={form.idtipoeps || ""}
                  onChange={(val:any) => setForm({...form, idtipoeps: Number(val) })}
                  placeholder="Seleccione"
                  options={tipos.map(t => ({value: t.idtipoeps, label: t.nombretipoeps}))}
                />
              </div>
              <div className="card-sgpc card-section">
                <div className="card-section-header"><MapPin size={16} /><h3>Dirección</h3></div>
                <div className="grid-3">
                  <SelectSGPC label="Departamento" value={idDeptoSel || ""} onChange={(val:any) => {setIdDeptoSel(Number(val)); setIdProvSel(undefined); setForm({...form, iddistrito: null})}} placeholder="Seleccione" options={departamentos.map(d => ({value: d.iddepartamento, label: d.nombred}))} />
                  <SelectSGPC label="Provincia" value={idProvSel || ""} onChange={(val:any) => {setIdProvSel(Number(val)); setForm({...form, iddistrito: null})}} placeholder="Seleccione" options={provinciasFiltradas.map(p => ({value: p.idprovincia, label: p.nombrep}))} isDisabled={!idDeptoSel} />
                  <SelectSGPC label="Distrito *" value={form.iddistrito || ""} onChange={(val:any) => setForm({...form, iddistrito: Number(val) })} placeholder="Seleccione" options={distritosFiltrados.map(d => ({value: d.iddistrito, label: d.nombredt}))} isDisabled={!idProvSel} />
                </div>
                <div className="input-wrapper" style={{marginTop: "1.6rem"}}><label className="input-label">Dirección Detallada</label><input className="input-sgpc-floating" placeholder="Av. Arequipa 123, Mz B Lote 5" value={form.direccion || ""} onChange={e => setForm({...form, direccion: e.target.value })} maxLength={250} /></div>
              </div>
              <div className="card-sgpc card-section">
                <div className="card-section-header"><Phone size={16} /><h3>Contacto</h3></div>
                <div className="grid-2">
                  <div className="input-wrapper"><label className="input-label">Teléfono</label><input className="input-sgpc-floating" placeholder="999888777" value={form.telefono || ""} onChange={e => setForm({...form, telefono: e.target.value })} maxLength={20} /></div>
                  <div className="input-wrapper"><label className="input-label">Persona de Contacto</label><input className="input-sgpc-floating" placeholder="Juan Perez" value={form.contacto || ""} onChange={e => setForm({...form, contacto: e.target.value })} maxLength={200} /></div>
                </div>
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
          <div className="modal-header"><h2>Anular EPS</h2><button onClick={() => setShowConfirm(false)} className="btn-cerrar"><X size={20} /></button></div>
          <div className="modal-body"><p style={{ textAlign: "center" }}>¿Está seguro de anular esta EPS? No se eliminará, solo cambiará a INACTIVO.</p></div>
          <div className="modal-footer"><button className="btn-secundario" onClick={() => setShowConfirm(false)}>Cancelar</button><button className="btn-primario btn-danger" onClick={confirmarEliminar}>Anular</button></div>
        </div></div>
      )}

      <style jsx>{`
.badge-nivel { background: #eff6ff; color: #1d4ed8; padding: 0.3rem 0.6rem; border-radius: 6px; font-size: 1.2rem; font-weight: 700; letter-spacing: 0.5px; } // 6. NUEVO ESTILO
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
.input-sgpc-floating:disabled { background: #f8fafc; cursor: not-allowed; }
.input-label { position: absolute; left: 1.2rem; top: -0.7rem; font-size: 1.1rem; color: var(--color-primario); font-weight: 600; background: var(--color-blanco); padding: 0 0.5rem; pointer-events: none; z-index: 1; }
.toast-sgpc { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); padding: 2rem 2rem; border-radius: 0.8rem; font-size: var(--text-sm); font-weight: 700; color: var(--color-blanco); box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 9999; animation: fadeInScale 0.3s ease-out forwards; white-space: nowrap; text-align:center; }
.toast-sgpc.error { background: #ef4444; }
.toast-sgpc.success { background: #22c55e; }
@keyframes fadeInScale { from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
.tabla-sgpc { width: 100%; border-collapse: collapse; }
.tabla-sgpc thead tr { background: #f8fafc; }
.tabla-sgpc th { padding: 1rem 0.8rem; text-align: left; font-size: 1rem; font-weight: 700; color: #475569; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
.tabla-sgpc td { padding: 1rem 0.8rem; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 1.2rem; }
.btn-icon { display: flex; align-items: center; justify-content: center; width: 3rem; height: 3rem; border-radius: 0.6rem; border: none; cursor: pointer; transition: all 0.2s ease; }
.btn-icon-editar { background: #dbeafe; color: #1d4ed8; }
.btn-icon-editar:hover { background: #bfdbfe; }
.btn-icon-eliminar { background: #ef4444; color: white; }
.btn-icon-eliminar:hover { background: #dc2626; }
.paginacion-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 1.6rem; padding: 1.6rem; background: var(--color-blanco); border-radius: 1.2rem; gap: 1.6rem; box-shadow: 0 1px 3px 0 rgba(0,0,0,0.1); }
.paginacion-info { font-size: var(--text-sm); color: var(--color-texto-sec); margin: 0; }
.paginacion-controles { display: flex; gap: 0.8rem; align-items: center; }
.btn-pag { display: flex; align-items: center; gap: 0.4rem; padding: 0.8rem 1.2rem; border-radius: 0.8rem; font-size: var(--text-sm); font-weight: 600; border: 1px solid var(--color-borde); background: var(--color-blanco); color: var(--color-primario); cursor: pointer; transition: all 0.2s ease; }
.btn-pag:hover:not(:disabled) { background: #f8fafc; }
.btn-pag:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-pag-primario { background: var(--color-primario); color: var(--color-blanco); border: 1px solid var(--color-primario); }
.btn-pag-primario:hover:not(:disabled) { opacity: 0.9; }
.paginacion-pagina { padding: 0.8rem 1.2rem; font-weight: 600; font-size: var(--text-sm); white-space: nowrap; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.6rem; }
.grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1.6rem; }
.grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.6rem; }
.card-section { padding: 2rem!important; background: #f8fafc!important; border: 1px solid #e2e8f0!important; box-shadow: none!important; }
.card-section-header { display: flex; align-items: center; gap: 0.8rem; margin-bottom: 1.6rem; color: var(--color-primario); }
.card-section-header h3 { font-size: 1.5rem; font-weight: 700; margin: 0; }
@media (max-width: 1024px) {.grid-4 { grid-template-columns: 1fr 1fr; }}
@media (max-width: 768px) {
.grid-2,.grid-3,.grid-4 { grid-template-columns: 1fr!important; }
.paginacion-footer { flex-direction: column; padding: 1.2rem; }
.paginacion-controles { width: 100%; justify-content: space-between; }
}
`}</style>
    </div>
  )
}