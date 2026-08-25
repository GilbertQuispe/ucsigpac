'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/client'
import { Plus, Edit, X, Search, Upload, Users, ChevronLeft, ChevronRight, Eraser, Check, Calendar, Building2, GraduationCap, UserCheck, UserX, Eye } from 'lucide-react'
import Select from 'react-select'

type Persona = { idpersona: number; dni: string; apellidos: string; nombres: string }
type Supervisor = { idsupervisor: number; estado: string; persona?: Persona; profesion?: { profesion: string } }
type EPS = { ideps: number; razonsocial: string }
type Filial = { idfilial: number; nombrefilial: string }
type Periodo = { idpa: number; nombre: string }
type Docente = { iddocente: number; persona?: Persona }
type CargaAcademica = { 
  idcargaacad: number; nrc: string; grupo: string | null;
  asignatura?: { nombre: string };
  docente?: { iddocente: number; persona?: Persona };
  campoclinico?: { idcampocli: number; nombre: string; ideps: number; idfilial: number; idpa: number; eps?: EPS; filial?: Filial };
  horariodocente?: { dia_semana: string; hora_inicio: string; hora_fin: string }[];
}
type AsignacionNRC = CargaAcademica & { 
  idasignacion_nrc: number; 
  estado: string; 
  supervisor?: Supervisor;
  idsupervisor_reemplazo: number | null;
}

const SelectSGPCFieldset = ({label, value, onChange, options}:any) => {
  const selectedOption = options.find((o:any) => o.value === value) || null
  return (
    <fieldset className="fieldset-sgpc">
      <legend>{label}</legend>
      <Select 
        options={options} 
        value={selectedOption} 
        onChange={(opt:any) => onChange(opt?.value || null)} 
        placeholder="Seleccione..."
        isSearchable 
        maxMenuHeight={200}
        classNamePrefix="react-select" 
        styles={{ 
          control: (base, state) => ({ 
           ...base, 
            height: '4.4rem', minHeight: '4.4rem', borderRadius: '0.6rem', 
            border: '1px solid #cbd5e1', background: '#fff',
            boxShadow: state.isFocused ? '0 0 0 1px var(--color-primario)' : 'none',
            marginTop: '0.4rem', cursor: 'pointer'
          }),
          valueContainer: (base) => ({ ...base, padding: '0 1.2rem', height: '4.4rem' }),
          input: (base) => ({ ...base, margin: 0, padding: 0 }),
          indicatorsContainer: (base) => ({ ...base, height: '4.4rem' }),
          option: (base, state) => ({
           ...base, backgroundColor: state.isSelected ? 'var(--color-primario)' : state.isFocused ? 'var(--color-acento)' : '#fff',
            color: state.isSelected? '#fff' : 'var(--color-texto)', padding: '1rem 1.2rem'
          }),
          menu: (base) => ({...base, zIndex: 9999, marginTop: '0.4rem' })
        }}
      />
    </fieldset>
  )
}

export default function AsignacionSupervisionesPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<'pendientes' | 'asignadas'>('pendientes')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null)

  const [cargas, setCargas] = useState<CargaAcademica[]>([])
  const [cargasAsignadas, setCargasAsignadas] = useState<AsignacionNRC[]>([])
  const [supervisores, setSupervisores] = useState<Supervisor[]>([])
  const [eps, setEps] = useState<EPS[]>([])
  const [filiales, setFiliales] = useState<Filial[]>([])
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [docentes, setDocentes] = useState<Docente[]>([])

  const [filtroEps, setFiltroEps] = useState<number | ''>('')
  const [filtroFilial, setFiltroFilial] = useState<number | ''>('')
  const [filtroPeriodo, setFiltroPeriodo] = useState<number | ''>('')
  const [filtroDocente, setFiltroDocente] = useState<number | ''>('')
  
  const [seleccionados, setSeleccionados] = useState<number[]>([])
  const [paginaActual, setPaginaActual] = useState(1)
  const registrosPorPagina = 10

  const [showAsignarModal, setShowAsignarModal] = useState(false)
  const [showHorarioModal, setShowHorarioModal] = useState(false)
  const [horarioData, setHorarioData] = useState<any>(null)
  const [showActualizarModal, setShowActualizarModal] = useState(false)
  const [asignacionEdit, setAsignacionEdit] = useState<AsignacionNRC | null>(null)
  const [formAsignar, setFormAsignar] = useState({ idsupervisor: null })

  const showToast = (msg: string, type: 'error' | 'success' = 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    const [{data: epsData}, {data: filData}, {data: perData}, {data: supData}, {data: docData}] = await Promise.all([
      supabase.from('eps').select('*').eq('estado', 'ACTIVO'),
      supabase.from('filial').select('*'),
      supabase.from('periodoacademico').select('*').eq('estado', 'ACTIVO'),
      supabase.from('supervisor').select('*, persona(*), profesion(*)').eq('estado', 'ACTIVO'),
      supabase.from('docente').select('*, persona(*)').eq('estado', 'ACTIVO')
    ])
    setEps(epsData || []); setFiliales(filData || []); setPeriodos(perData || [])
    setSupervisores(supData || []); setDocentes(docData || [])
    await fetchCargas()
    setLoading(false)
  }

  const fetchCargas = async () => {
    let queryPend = supabase.from('cargaacademica').select(`
      *, asignatura(nombre), docente:docente(idpersona, persona(*)), 
      campoclinico!inner(*, eps(*), filial(*)),
      horariodocente(*)
    `).eq('estado', 'ACTIVO')

    let queryAsig = supabase.from('asignacion_nrc_supervisor').select(`
      *, supervisor(*, persona(*)),
      cargaacademica!inner(*, asignatura(nombre), docente:docente(idpersona, persona(*)), 
      campoclinico!inner(*, eps(*), filial(*)),
      horariodocente(*))
    `)

    if(filtroEps) { queryPend = queryPend.eq('campoclinico.ideps', filtroEps); queryAsig = queryAsig.eq('cargaacademica.campoclinico.ideps', filtroEps) }
    if(filtroFilial) { queryPend = queryPend.eq('campoclinico.idfilial', filtroFilial); queryAsig = queryAsig.eq('cargaacademica.campoclinico.idfilial', filtroFilial) }
    if(filtroPeriodo) { queryPend = queryPend.eq('campoclinico.idpa', filtroPeriodo); queryAsig = queryAsig.eq('cargaacademica.campoclinico.idpa', filtroPeriodo) }
    if(filtroDocente) { queryPend = queryPend.eq('docente.iddocente', filtroDocente); queryAsig = queryAsig.eq('cargaacademica.docente.iddocente', filtroDocente) }

    const {data: asigData} = await queryAsig
    const idsAsignados = asigData?.map(a => a.cargaacademica.idcargaacad) || []
    if(idsAsignados.length > 0) queryPend = queryPend.not('idcargaacad', 'in', `(${idsAsignados.join(',')})`)

    const {data: pendData} = await queryPend
    setCargas(pendData as CargaAcademica[] || [])
    setCargasAsignadas((asigData || []).map(a => ({...a.cargaacademica, ...a})) as AsignacionNRC[])
    setSeleccionados([])
  }

  const datosFiltrados = useMemo(() => {
    const data = tab === 'pendientes'? cargas : cargasAsignadas
    return data.filter((d:any) => {
      const matchSearch = 
        d.nrc?.toLowerCase().includes(search.toLowerCase()) ||
        d.asignatura?.nombre.toLowerCase().includes(search.toLowerCase()) ||
        d.docente?.persona?.apellidos.toLowerCase().includes(search.toLowerCase())
      return matchSearch
    })
  }, [cargas, cargasAsignadas, search, tab])

  const totalPaginas = Math.ceil(datosFiltrados.length / registrosPorPagina)
  const indiceInicio = (paginaActual - 1) * registrosPorPagina
  const datosPaginados = datosFiltrados.slice(indiceInicio, indiceInicio + registrosPorPagina)

  const toggleCheck = (id: number) => {
    setSeleccionados(prev => prev.includes(id)? prev.filter(i => i!== id) : [...prev, id])
  }

  const handleAsignarMasivo = async () => {
    if(seleccionados.length === 0 || !formAsignar.idsupervisor) {
      showToast('Seleccione registros y supervisor', 'error')
      return
    }
    setLoading(true)
    const paraInsertar = seleccionados.map(idcargaacad => ({ 
      idcargaacad, 
      idsupervisor: formAsignar.idsupervisor, 
      estado: 'PROGRAMADO' 
    }))
    const {error} = await supabase.from('asignacion_nrc_supervisor').insert(paraInsertar)
    if(error) showToast(error.message, 'error')
    else {
      showToast(`${seleccionados.length} NRC asignados`, 'success')
      setShowAsignarModal(false)
      setFormAsignar({idsupervisor: null})
      fetchCargas()
    }
    setLoading(false)
  }

  const openHorarioModal = (carga: CargaAcademica) => {
    setHorarioData(carga)
    setShowHorarioModal(true)
  }

  const openActualizarModal = (a: AsignacionNRC) => {
    setAsignacionEdit(a)
    setFormAsignar({idsupervisor: a.supervisor?.idsupervisor || null})
    setShowActualizarModal(true)
  }

  const handleActualizar = async () => {
    if(!asignacionEdit || !formAsignar.idsupervisor) return
    const {error} = await supabase.from('asignacion_nrc_supervisor')
      .update({idsupervisor: formAsignar.idsupervisor})
      .eq('idasignacion_nrc', asignacionEdit.idasignacion_nrc)
    if(error) showToast(error.message, 'error')
    else {
      showToast('Supervisor actualizado', 'success')
      setShowActualizarModal(false)
      fetchCargas()
    }
  }

  const limpiarFiltros = () => {
    setSearch(""); setFiltroEps(""); setFiltroFilial(""); setFiltroPeriodo(""); setFiltroDocente(""); setPaginaActual(1)
  }

  return (
    <div className="main-content">
      <div className="header-responsive">
        <div>
          <h1><Users size={24} style={{marginRight: '0.8rem'}}/>Asignación de Supervisiones</h1>
          <p>Total: {datosFiltrados.length} registros</p>
        </div>
        {tab === 'pendientes' && (
          <button className="btn-primario" onClick={() => setShowAsignarModal(true)} disabled={seleccionados.length === 0}>
            <Check size={18} /> Asignar {seleccionados.length} Seleccionados
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1rem', margin: '2rem 0' }}>
        <button onClick={() => {setTab('pendientes'); setPaginaActual(1)}} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0 2rem', height: '4.4rem', borderRadius: '0.8rem', border: tab==='pendientes'? '1px solid var(--color-primario)' : '1px solid #cbd5e1', background: tab==='pendientes'? 'var(--color-primario)' : '#fff', color: tab==='pendientes'? '#fff' : 'var(--color-texto-secundario)', fontWeight: 600, fontSize: '1.4rem', cursor: 'pointer' }}>
          <Users size={16}/> Carga Académica Pendiente
        </button>
        <button onClick={() => {setTab('asignadas'); setPaginaActual(1)}} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0 2rem', height: '4.4rem', borderRadius: '0.8rem', border: tab==='asignadas'? '1px solid var(--color-primario)' : '1px solid #cbd5e1', background: tab==='asignadas'? 'var(--color-primario)' : '#fff', color: tab==='asignadas'? '#fff' : 'var(--color-texto-secundario)', fontWeight: 600, fontSize: '1.4rem', cursor: 'pointer' }}>
          <UserCheck size={16}/> Carga Académica Asignada
        </button>
      </div>

      <div className="card-sgpc" style={{ marginBottom: '2.4rem', padding: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(20rem, 1fr))', gap: '1.2rem', marginBottom: '1.6rem' }}>
          <SelectSGPCFieldset label="Periodo" value={filtroPeriodo} onChange={(val:any) => {setFiltroPeriodo(val); setPaginaActual(1); fetchCargas()}} options={[{value: "", label: "Todos"}, ...periodos.map(p=>({value:p.idpa, label:p.nombre}))]}/>
          <SelectSGPCFieldset label="Filial" value={filtroFilial} onChange={(val:any) => {setFiltroFilial(val); setPaginaActual(1); fetchCargas()}} options={[{value: "", label: "Todas"}, ...filiales.map(f=>({value:f.idfilial, label:f.nombrefilial}))]}/>
          <SelectSGPCFieldset label="EPS" value={filtroEps} onChange={(val:any) => {setFiltroEps(val); setPaginaActual(1); fetchCargas()}} options={[{value: "", label: "Todas"}, ...eps.map(e=>({value:e.ideps, label:e.razonsocial}))]}/>
          <SelectSGPCFieldset label="Docente" value={filtroDocente} onChange={(val:any) => {setFiltroDocente(val); setPaginaActual(1); fetchCargas()}} options={[{value: "", label: "Todos"}, ...docentes.map(d=>({value:d.iddocente, label:`${d.persona?.apellidos}, ${d.persona?.nombres}`}))]} />
        </div>
        <div style={{display: 'flex', gap: '1rem', alignItems: 'flex-end'}}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
            <input className="input-sgpc" placeholder="Buscar por NRC, Asignatura, Docente..." value={search} onChange={e => {setSearch(e.target.value); setPaginaActual(1)}} style={{ paddingLeft: '4rem', height: "4.4rem", width: '100%' }} />
          </div>
          <button className="btn-secundario btn-limpiar" onClick={limpiarFiltros} style={{height: '4.4rem'}}><Eraser size={16} />Limpiar</button>
        </div>
      </div>

      <div className="card-sgpc" style={{ overflowX: 'auto', position: 'relative', minHeight: '20rem' }}>
        {toast && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10, background: toast.type === 'error'? '#EF4444' : '#22C55E', color: '#fff', padding: '0.9rem 2rem', borderRadius: '0.8rem', fontWeight: 600, fontSize: '1.4rem' }}>
            {toast.msg}
          </div>
        )}
        {loading? <p style={{padding: '2rem', textAlign: 'center'}}>Cargando...</p> : (
          <table className='tabla-sgpc'>
            <thead><tr>
              {tab==='pendientes' && <th style={{width: '5rem'}}>SEL</th>}
              <th>#</th><th>NRC</th><th>ASIGNATURA</th><th>DOCENTE</th><th>EPS</th><th>FILIAL</th>
              {tab==='asignadas' && <th>SUPERVISOR</th>}
              <th>ACCIONES</th>
            </tr></thead>
            <tbody>
              {datosPaginados.map((d:any, i) => (
                <tr key={d.idcargaacad}>
                  {tab==='pendientes' && <td><input type="checkbox" checked={seleccionados.includes(d.idcargaacad)} onChange={() => toggleCheck(d.idcargaacad)} /></td>}
                  <td>{indiceInicio + i + 1}</td>
                  <td>{d.nrc}</td>
                  <td>{d.asignatura?.nombre}</td>
                  <td>{d.docente?.persona?.apellidos}, {d.docente?.persona?.nombres}</td>
                  <td>{d.campoclinico?.eps?.razonsocial}</td>
                  <td>{d.campoclinico?.filial?.nombrefilial}</td>
                  {tab==='asignadas' && <td>{d.supervisor?.persona?.apellidos}, {d.supervisor?.persona?.nombres}</td>}
                  <td style={{display: 'flex', gap: '0.8rem'}}>
                    <button onClick={() => openHorarioModal(d)} className="btn-icon" title="Ver Horario"><Eye size={15} /></button>
                    {tab==='asignadas' && <button onClick={() => openActualizarModal(d)} className="btn-icon btn-icon-editar" title="Actualizar"><Edit size={15} /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPaginas > 1 && (
        <div className="paginacion-footer">
          <p>Mostrando {indiceInicio + 1} al {Math.min(indiceInicio + registrosPorPagina, datosFiltrados.length)} de {datosFiltrados.length}</p>
          <div className="paginacion-controles">
            <button className="btn-pag" onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1}><ChevronLeft size={16} /> Anterior</button>
            <span>Pág {paginaActual} de {totalPaginas}</span>
            <button className="btn-pag" onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas}>Siguiente <ChevronRight size={16} /></button>
          </div>
        </div>
      )}

      {/* MODAL ASIGNAR */}
      {showAsignarModal && (
        <div className="modal-overlay" onClick={() => setShowAsignarModal(false)}>
          <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{maxWidth: '50rem'}}>
            <div className="modal-header"><h2>Asignar Supervisor a {seleccionados.length} NRC</h2><button onClick={() => setShowAsignarModal(false)} className="btn-cerrar-modal"><X size={18} /></button></div>
            <div className="modal-body">
              <SelectSGPCFieldset label="Supervisor *" value={formAsignar.idsupervisor} onChange={(val:any) => setFormAsignar({...formAsignar, idsupervisor: val})} options={supervisores.map(s=>({value:s.idsupervisor, label:`${s.persona?.apellidos}, ${s.persona?.nombres}`}))} />
            </div>
            <div className="modal-footer">
              <button className="btn-secundario" onClick={() => setShowAsignarModal(false)}>Cancelar</button>
              <button className="btn-primario" onClick={handleAsignarMasivo} disabled={!formAsignar.idsupervisor}><Check size={18} /> Asignar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HORARIO */}
      {showHorarioModal && horarioData && (
        <div className="modal-overlay" onClick={() => setShowHorarioModal(false)}>
          <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{maxWidth: '60rem'}}>
            <div className="modal-header"><h2><Calendar size={18}/> Horario NRC: {horarioData.nrc}</h2><button onClick={() => setShowHorarioModal(false)} className="btn-cerrar-modal"><X size={18} /></button></div>
            <div className="modal-body">
              <p><b>Asignatura:</b> {horarioData.asignatura?.nombre}</p>
              <p><b>EPS:</b> {horarioData.campoclinico?.eps?.razonsocial}</p>
              <table className='tabla-sgpc' style={{marginTop: '1.6rem'}}>
                <thead><tr><th>DIA</th><th>HORA INICIO</th><th>HORA FIN</th></tr></thead>
                <tbody>{horarioData.horariodocente?.map((h:any,i:number) => <tr key={i}><td>{h.dia_semana}</td><td>{h.hora_inicio}</td><td>{h.hora_fin}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ACTUALIZAR */}
      {showActualizarModal && (
        <div className="modal-overlay" onClick={() => setShowActualizarModal(false)}>
          <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{maxWidth: '50rem'}}>
            <div className="modal-header"><h2>Cambiar Supervisor NRC: {asignacionEdit?.nrc}</h2><button onClick={() => setShowActualizarModal(false)} className="btn-cerrar-modal"><X size={18} /></button></div>
            <div className="modal-body">
              <SelectSGPCFieldset label="Nuevo Supervisor *" value={formAsignar.idsupervisor} onChange={(val:any) => setFormAsignar({...formAsignar, idsupervisor: val})} options={supervisores.map(s=>({value:s.idsupervisor, label:`${s.persona?.apellidos}, ${s.persona?.nombres}`}))} />
            </div>
            <div className="modal-footer">
              <button className="btn-secundario" onClick={() => setShowActualizarModal(false)}>Cancelar</button>
              <button className="btn-primario" onClick={handleActualizar} disabled={!formAsignar.idsupervisor}><Check size={18} /> Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}