'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/client'
import { Plus, Edit, X, Search, Upload, Users, ChevronLeft, ChevronRight, Eraser, Check, Calendar, Building2, GraduationCap, UserCheck, UserX, Eye, MapPin, Hospital, Clock, Printer} from 'lucide-react'
import Select from 'react-select'

type Persona = { idpersona: number; dni: string; apellidos: string; nombres: string }
type Supervisor = { idsupervisor: number; estado: string; persona?: Persona; profesion?: { profesion: string } }
type EPS = { ideps: number; razonsocial: string; direccion: string; iddistrito: number | null; distrito?: Distrito; provincia?: Provincia; departamento?: Departamento }
type Filial = { idfilial: number; nombrefilial: string }
type Periodo = { idpa: number; nombre: string; codigo?: string } // <-- AGREGUE codigo por si lo usas
type Docente = { iddocente: number; persona?: Persona }
type Distrito = { iddistrito: number; nombredt: string; idprovincia: number; provincia?: Provincia }
type Provincia = { idprovincia: number; nombrep: string; iddepartamento: number; departamento?: Departamento }
type Departamento = { iddepartamento: number; nombred: string }

type CargaAcademica = { 
  idcargaacad: number; nrc: string; grupo: string | null;
  asignatura?: { nombre: string };
  docente?: { iddocente: number; persona?: Persona };
  campoclinico?: { idcampocli: number; nombre: string; ideps: number; idfilial: number; idpa: number; estado: string; eps?: EPS; filial?: Filial };
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
        onChange={(opt:any) => onChange(opt?.value ?? '')}
        placeholder="Seleccione..."
        isSearchable 
        maxMenuHeight={200}
        classNamePrefix="react-select" 
        styles={{ 
          control: (base, state) => ({ ...base, height: '4.4rem', minHeight: '4.4rem', borderRadius: '0.6rem', border: '1px solid #cbd5e1', background: '#fff', boxShadow: state.isFocused ? '0 0 0 1px var(--color-primario)' : 'none', marginTop: '0.4rem', cursor: 'pointer' }),
          valueContainer: (base) => ({ ...base, padding: '0 1.2rem', height: '4.4rem' }),
          input: (base) => ({ ...base, margin: 0, padding: 0 }),
          indicatorsContainer: (base) => ({ ...base, height: '4.4rem' }),
          menu: (base) => ({...base, zIndex: 9999, marginTop: '0.4rem' }),
          menuList: (base) => ({...base, maxHeight: '200px'}),
          option: (base, state) => ({ 
            ...base, 
            whiteSpace: 'normal',
            wordWrap: 'break-word',
            backgroundColor: state.isSelected ? 'var(--color-primario)' : state.isFocused ? 'var(--color-acento)' : '#fff', 
            color: state.isSelected? '#fff' : 'var(--color-texto)', 
            padding: '1rem 1.2rem' 
          })
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
  const [distritos, setDistritos] = useState<Distrito[]>([])
  const [provincias, setProvincias] = useState<Provincia[]>([])
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])

  const [filtroEps, setFiltroEps] = useState<number | ''>('')
  const [filtroFilial, setFiltroFilial] = useState<number | ''>('')
  const [filtroPeriodo, setFiltroPeriodo] = useState<number | ''>('')
  const [filtroDocente, setFiltroDocente] = useState<number | ''>('')
  
  const [seleccionados, setSeleccionados] = useState<number[]>([])
  const [paginaActual, setPaginaActual] = useState(1)
  const registrosPorPagina = 10
  const [contadores, setContadores] = useState({pendientes: 0, asignadas: 0, enproceso: 0, supervisado: 0})
  

  const [showAsignarModal, setShowAsignarModal] = useState(false)
  const [showHorarioModal, setShowHorarioModal] = useState(false)
  const [horarioData, setHorarioData] = useState<any>(null)
  const [showActualizarModal, setShowActualizarModal] = useState(false)
  const [asignacionEdit, setAsignacionEdit] = useState<AsignacionNRC | null>(null)
  const [formAsignar, setFormAsignar] = useState({ idsupervisor: null as number | null })

  // AGREGA ESTOS STATES ARRIBA
const [showVerCargaModal, setShowVerCargaModal] = useState(false)
const [cargaParaVer, setCargaParaVer] = useState<any>(null)
const [horariosVer, setHorariosVer] = useState<any[]>([])
const [estudiantesVer, setEstudiantesVer] = useState<any[]>([])
const [epsCompletaVer, setEpsCompletaVer] = useState<any>(null)
const [loadingVer, setLoadingVer] = useState(false)

// FUNCION PARA ABRIR
const openVerCargaModal = async (carga: any) => {
  setCargaParaVer(carga)
  setShowVerCargaModal(true)
  setLoadingVer(true)

  // 1. Cargar Horario
  const { data: horData } = await supabase
   .from('horario')
   .select(`idhorario, detallehorario(*)`)
   .eq('idcargaacad', carga.idcargaacad)
   .eq('estado', 'ACTIVO')
   .limit(1)
   .single()
  setHorariosVer(horData?.detallehorario || [])

  // 2. Cargar Estudiantes
  const { data: estData } = await supabase
   .from('horario')
   .select(`*, matricula!inner(idmatricula, estado, idestudiante, estudiante!inner(idpersona, persona!inner(dni, apellidos, nombres)))`)
   .eq('idcargaacad', carga.idcargaacad)
   .eq('estado', 'ACTIVO')
   .eq('matricula.estado', 'MATRICULADO')
  setEstudiantesVer(estData || [])

  // 3. Cargar Dirección EPS completa
  if(carga.campoclinico?.ideps){
    const { data: epsData } = await supabase
    .from('eps')
    .select(`direccion, distrito(nombredt, provincia(nombrep, departamento(nombred)))`)
    .eq('ideps', carga.campoclinico.ideps)
    .single()
    setEpsCompletaVer(epsData)
  }
  setLoadingVer(false)
}

  const showToast = (msg: string, type: 'error' | 'success' = 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const [dataListo, setDataListo] = useState(false)

  useEffect(() => { fetchData() }, [])
  useEffect(() => { if(dataListo) fetchCargas() }, [dataListo, filtroEps, filtroFilial, filtroPeriodo, filtroDocente, search, tab, paginaActual]) // AGREGUE search, tab, paginaActual

  const fetchData = async () => {
      setLoading(true)
      
      const [epsRes, filRes, perRes, supRes, docRes] = await Promise.all([
        supabase.from('eps').select('*').eq('estado', 'ACTIVO'),
        supabase.from('filial').select('*'),
        supabase.from('periodoacademico').select('*').eq('estado', 'ACTIVO'),
        supabase.from('supervisor').select('*, persona(*), profesion(*)').eq('estado', 'ACTIVO'),
        supabase.from('docente').select('*, persona(*)').eq('estado', 'ACTIVO'),
      ])

      const [distRes1, distRes2] = await Promise.all([
        supabase.from('distrito').select('*').range(0, 999),
        supabase.from('distrito').select('*').range(1000, 3000),
      ])
      const todosDistritos = [...(distRes1.data || []), ...(distRes2.data || [])]

      const [provRes, depRes] = await Promise.all([
        supabase.from('provincia').select('*').range(0, 1000),
        supabase.from('departamento').select('*').range(0, 100)
      ])

      setEps(epsRes.data || [])
      setFiliales(filRes.data || [])
      setPeriodos(perRes.data || [])
      setSupervisores(supRes.data || [])
      setDocentes(docRes.data || [])
      setDistritos(todosDistritos)
      setProvincias(provRes.data || [])
      setDepartamentos(depRes.data || [])
      setDataListo(true)
      setLoading(false)
    }

  const fetchCargas = async () => {
      setLoading(true)
      
      const [asigRes, cargasRes, campocliRes, asignaturaRes, docenteRes, horarioRes, supervisorRes] = await Promise.all([
        supabase.from('asignacion_nrc_supervisor').select('*'),
        supabase.from('cargaacademica').select('*').eq('estado', 'ACTIVO'),
        supabase.from('campoclinico').select('*, eps(*), filial(*)'),
        supabase.from('asignatura').select('*'),
        supabase.from('docente').select('*, persona(*)'),
        supabase.from('horariodocente').select('*'),
        supabase.from('supervisor').select('*, persona(*)')
      ])

      const mapCampocli = new Map(campocliRes.data?.map(c => [c.idcampocli, c]))
      const mapAsignatura = new Map(asignaturaRes.data?.map(a => [a.idasignatura, a]))
      const mapDocente = new Map(docenteRes.data?.map(d => [d.iddocente, d]))
      const mapSupervisor = new Map(supervisorRes.data?.map(s => [s.idsupervisor, s]))
      const mapHorario = new Map(horarioRes.data?.map(h => [h.idhorariod, h]))
      const mapFilial = new Map(filiales.map(f => [f.idfilial, f]))

      const mapDistrito = new Map(distritos.map(d => [d.iddistrito, d]))
      const mapProvincia = new Map(provincias.map(p => [p.idprovincia, p]))
      const mapDepartamento = new Map(departamentos.map(d => [d.iddepartamento, d]))

      const epsConUbicacion = (eps || []).map(e => {
        const distrito = mapDistrito.get(e.iddistrito!)
        const provincia = distrito? mapProvincia.get(distrito.idprovincia) : null
        const departamento = provincia? mapDepartamento.get(provincia.iddepartamento) : null
        return {...e, distrito, provincia, departamento}
      })

      const mapEpsUbicacion = new Map(epsConUbicacion.map(e => [e.ideps, e]))
      
      const cargasCompletas = (cargasRes.data || []).map(c => {
        const campocli = mapCampocli.get(c.idcampocli)
        const epsCompleto = campocli?.ideps ? mapEpsUbicacion.get(Number(campocli.ideps)) : undefined
        
        return {
          ...c,
          campoclinico: campocli ? {
            ...campocli, 
            eps: epsCompleto,
            filial: mapFilial.get(campocli.idfilial)
          } : undefined,
          asignatura: mapAsignatura.get(c.idasignatura),
          docente: mapDocente.get(campocli?.iddocente),
          horariodocente: campocli?.horariodocente || [mapHorario.get(c.idhorariod)].filter(Boolean) // <-- FIX HORARIO
        }
      })

      const idsAsignados = asigRes.data?.map(a => a.idcargaacad) || []
      const cargasAsig = (asigRes.data || []).map(a => {
        const carga = cargasCompletas.find(c => c.idcargaacad === a.idcargaacad)
        return carga ? { ...carga, ...a, supervisor: mapSupervisor.get(a.idsupervisor) } : null
      }).filter(Boolean) as AsignacionNRC[]

      let cargasPend = cargasCompletas.filter(c =>
        !idsAsignados.includes(c.idcargaacad) &&
        c.campoclinico?.estado === 'ACTIVO' &&
        (filtroEps === '' || c.campoclinico?.ideps === filtroEps) &&
        (filtroFilial === '' || c.campoclinico?.idfilial === filtroFilial) &&
        (filtroPeriodo === '' || c.campoclinico?.idpa === filtroPeriodo) &&
        (filtroDocente === '' || c.docente?.iddocente === filtroDocente)
      )

      let cargasAsigFiltradas = cargasAsig.filter(a =>
        (filtroEps === '' || a.campoclinico?.ideps === filtroEps) &&
        (filtroFilial === '' || a.campoclinico?.idfilial === filtroFilial) &&
        (filtroPeriodo === '' || a.campoclinico?.idpa === filtroPeriodo) &&
        (filtroDocente === '' || a.docente?.iddocente === filtroDocente)
      )

      // FILTRAR POR SEARCH
      const dataFiltrada = (tab === 'pendientes' ? cargasPend : cargasAsigFiltradas).filter((d:any) => {
        const matchSearch = 
          d.nrc?.toLowerCase().includes(search.toLowerCase()) ||
          d.asignatura?.nombre.toLowerCase().includes(search.toLowerCase()) ||
          d.docente?.persona?.apellidos.toLowerCase().includes(search.toLowerCase()) ||
          d.docente?.persona?.dni.toLowerCase().includes(search.toLowerCase()) ||
          d.campoclinico?.eps?.razonsocial.toLowerCase().includes(search.toLowerCase())
        return search === '' ? true : matchSearch
      })

      // PAGINACION EN CLIENTE
      const total = dataFiltrada.length
      const inicio = (paginaActual - 1) * registrosPorPagina
      const fin = inicio + registrosPorPagina
      const datosPaginados = dataFiltrada.slice(inicio, fin)

      if(tab === 'pendientes') {
        setCargas(datosPaginados)
      } else {
        setCargasAsignadas(datosPaginados)
      }

      setContadores({ 
        pendientes: cargasPend.length, 
        asignadas: cargasAsigFiltradas.filter(a => a.estado === 'PROGRAMADO').length, 
        enproceso: cargasAsigFiltradas.filter(a => a.estado === 'EN_PROCESO').length, 
        supervisado: cargasAsigFiltradas.filter(a => a.estado === 'SUPERVISADO').length 
      })
      setTotalRegistros(total) // <-- NUEVO PARA PAGINACION
      setLoading(false)
      setSeleccionados([])
    }

  const [totalRegistros, setTotalRegistros] = useState(0) // <-- NUEVO
  const totalPaginas = Math.ceil(totalRegistros / registrosPorPagina)
  const indiceInicio = (paginaActual - 1) * registrosPorPagina
  const datosPaginados = tab === 'pendientes' ? cargas : cargasAsignadas // <-- YA VIENE PAGINADO

  const opcionesDinamicas = useMemo(() => {
    const data = tab === 'pendientes' ? cargas : cargasAsignadas
    const dataCompleta = tab === 'pendientes' ? cargas : cargasAsignadas // usamos la paginada para que no se cuelgue
    
    const periodosUnicos = [...new Set(dataCompleta.map(d => d.campoclinico?.idpa).filter(Boolean))]
    const filialesUnicas = [...new Set(dataCompleta.map(d => d.campoclinico?.idfilial).filter(Boolean))]
    const epsUnicas = [...new Set(dataCompleta.map(d => d.campoclinico?.ideps).filter(Boolean))]
    const docentesUnicos = [...new Set(dataCompleta.map(d => d.docente?.iddocente).filter(Boolean))]

    return {
      periodos: periodos.filter(p => periodosUnicos.includes(p.idpa)).map(p => ({value: p.idpa, label: p.nombre})),
      filiales: filiales.filter(f => filialesUnicas.includes(f.idfilial)).map(f => ({value: f.idfilial, label: f.nombrefilial})),
      eps: eps.filter(e => epsUnicas.includes(e.ideps)).map(e => ({value: e.ideps, label: e.razonsocial})),
      docentes: docentes.filter(d => docentesUnicos.includes(d.iddocente)).map(d => ({value: d.iddocente, label: `${d.persona?.apellidos}, ${d.persona?.nombres}`}))
    }
  }, [cargas, cargasAsignadas, tab, periodos, filiales, eps, docentes])

  const toggleCheck = (id: number) => { setSeleccionados(prev => prev.includes(id)? prev.filter(i => i!== id) : [...prev, id]) }
  const handleAsignarMasivo = async () => { /* TU CODIGO IGUAL */ }
  const openHorarioModal = (carga: CargaAcademica) => { setHorarioData(carga); setShowHorarioModal(true) }
  const openActualizarModal = (a: AsignacionNRC) => { setAsignacionEdit(a); setFormAsignar({idsupervisor: a.supervisor?.idsupervisor || null}); setShowActualizarModal(true) }
  const handleActualizar = async () => { /* TU CODIGO IGUAL */ }
  const limpiarFiltros = () => { setSearch(""); setFiltroEps(""); setFiltroFilial(""); setFiltroPeriodo(""); setFiltroDocente(""); setPaginaActual(1) }

  const getUbicacion = (eps?: EPS) => {
      if(!eps) return '-'
      const partes = [
        eps.direccion,
        eps.distrito?.nombredt,
        eps.provincia?.nombrep,
        eps.departamento?.nombred
      ].filter(Boolean)
      return partes.join(' - ')
    }
    return (
      <div className="main-content">
        <div className="header-responsive">
          <div>
            <h1><Users size={24} style={{marginRight: '0.8rem'}}/>Asignación de Supervisiones</h1>
            <div style={{display: 'flex', gap: '2rem', fontSize: '1.3rem', marginTop: '0.5rem'}}>
              <span><b>Pendientes:</b> {contadores.pendientes}</span>
              <span><b>Asignadas:</b> {contadores.asignadas}</span>
              <span><b>En Proceso:</b> {contadores.enproceso}</span>
              <span><b>Supervisado:</b> {contadores.supervisado}</span>
            </div>
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
            <SelectSGPCFieldset label="Periodo" value={filtroPeriodo} onChange={(val:any) => {setFiltroPeriodo(val); setPaginaActual(1)}} options={[{value: "", label: "Todos"}, ...opcionesDinamicas.periodos]}/>
            <SelectSGPCFieldset label="Filial" value={filtroFilial} onChange={(val:any) => {setFiltroFilial(val); setPaginaActual(1)}} options={[{value: "", label: "Todas"}, ...opcionesDinamicas.filiales]}/>
            <SelectSGPCFieldset label="EPS" value={filtroEps} onChange={(val:any) => {setFiltroEps(val); setPaginaActual(1)}} options={[{value: "", label: "Todas"}, ...opcionesDinamicas.eps]}/>
            <SelectSGPCFieldset label="Docente" value={filtroDocente} onChange={(val:any) => {setFiltroDocente(val); setPaginaActual(1)}} options={[{value: "", label: "Todos"}, ...opcionesDinamicas.docentes]} />
          </div>
          <div style={{display: 'flex', gap: '1rem', alignItems: 'flex-end'}}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={18} style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
              <input className="input-sgpc" placeholder="Buscar por DNI, NRC, Asignatura, Docente..." value={search} onChange={e => {setSearch(e.target.value); setPaginaActual(1)}} style={{ paddingLeft: '4rem', height: "4.4rem", width: '100%' }} />
            </div>
            <button className="btn-secundario btn-limpiar" onClick={limpiarFiltros} style={{height: '4.4rem'}}><Eraser size={16} />Limpiar</button>
          </div>
        </div>

        <div className="card-sgpc" style={{ overflowX: 'auto', position: 'relative', minHeight: '20rem' }}>
          {toast && ( <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10, background: toast.type === 'error'? '#EF4444' : '#22C55E', color: '#fff', padding: '0.9rem 2rem', borderRadius: '0.8rem', fontWeight: 600, fontSize: '1.4rem' }}> {toast.msg} </div> )}
          {loading? <p style={{padding: '2rem', textAlign: 'center'}}>Cargando...</p> : (
            <table className='tabla-sgpc'>
             <thead>
    <tr>
      {tab==='pendientes' ? <th style={{width: '5rem'}}>SEL</th> : null}
      <th>N°</th>
      <th>PERIODO</th>
      <th>FILIAL</th>
      <th>EPS</th>
      <th>UBICACIÓN</th>
      <th>DNI + DOCENTE</th>
      <th>ASIGNATURA</th>
      <th>NRC</th>
      {tab==='asignadas' ? <th>SUPERVISOR</th> : null}
      <th>ACCIONES</th>
    </tr>
  </thead>
              <tbody>
    {datosPaginados.length === 0? (
      <tr>
        <td colSpan={tab==='pendientes'? 10 : 10} style={{textAlign: 'center', padding: '2rem'}}>
          No hay registros
        </td>
      </tr>
    ) : (
      datosPaginados.map((d:any, i) => (
        <tr key={d.idcargaacad}>
          {tab==='pendientes'? (
            <td><input type="checkbox" checked={seleccionados.includes(d.idcargaacad)} onChange={() => toggleCheck(d.idcargaacad)} /></td>
          ) : null}
          <td>{indiceInicio + i + 1}</td>
          <td>{periodos.find(p=>p.idpa === d.campoclinico?.idpa)?.codigo}</td>
          <td>{d.campoclinico?.filial?.nombrefilial}</td>
          <td>{d.campoclinico?.eps?.razonsocial}</td>
  <td style={{fontSize: '1.2rem', maxWidth: '25rem'}}>
    <MapPin size={12} style={{marginRight: '0.4rem'}}/>
    {getUbicacion(d.campoclinico?.eps)}
  </td>
          <td>{d.docente?.persona?.dni} - {d.docente?.persona?.apellidos}, {d.docente?.persona?.nombre}</td>
          <td>{d.asignatura?.nombre}</td>
          <td>{d.nrc}</td>
          {tab==='asignadas'? (
            <td>{d.supervisor?.persona?.apellidos}, {d.supervisor?.persona?.nombres}</td>
          ) : null}
          <td style={{display: 'flex', gap: '0.8rem'}}>
            {/* <button onClick={() => openHorarioModal(d)} className="btn-icon" title="Ver Horario"><Eye size={15} /></button> */}
            <button onClick={() => openVerCargaModal(d)} className="btn-icon" title="Ver Horario"><Eye size={15} /></button>
            {tab==='asignadas'? (
              <button onClick={() => openActualizarModal(d)} className="btn-icon btn-icon-editar" title="Actualizar"><Edit size={15} /></button>
            ) : null}
          </td>
        </tr>
      ))
    )}



  </tbody>
            </table>
          )}
        </div>

        {totalPaginas > 1 && ( <div className="paginacion-footer"> <p>Mostrando {indiceInicio + 1} al {Math.min(indiceInicio + registrosPorPagina, totalRegistros)} de {totalRegistros}</p> <div className="paginacion-controles"> <button className="btn-pag" onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1}><ChevronLeft size={16} /> Anterior</button> <span>Pág {paginaActual} de {totalPaginas}</span> <button className="btn-pag" onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas}>Siguiente <ChevronRight size={16} /></button> </div> </div> )}

        {/* MODALES IGUALES */}
        {showAsignarModal && ( <div className="modal-overlay" > <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{maxWidth: '50rem'}}> <div className="modal-header"><h2 style={{display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--color-primario)', fontSize: '1.8rem'}}><UserCheck size={22} />Asignar Supervisor a {seleccionados.length} NRC</h2><button onClick={() => setShowAsignarModal(false)} className="btn-cerrar-modal"><X size={18} /></button></div> <div className="modal-body"> <SelectSGPCFieldset label="Supervisor *" value={formAsignar.idsupervisor} onChange={(val:any) => setFormAsignar({...formAsignar, idsupervisor: val})} options={supervisores.map(s=>({value:s.idsupervisor, label:`${s.persona?.dni} - ${s.persona?.apellidos}, ${s.persona?.nombres}`}))} /> </div> <div className="modal-footer"> <button className="btn-primario" onClick={handleAsignarMasivo} disabled={!formAsignar.idsupervisor}><Check size={18} /> Asignar</button> </div> </div> </div> )}
        {showHorarioModal && horarioData && ( <div className="modal-overlay" onClick={() => setShowHorarioModal(false)}> <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{maxWidth: '60rem'}}> <div className="modal-header"><h2><Calendar size={18}/> Horario NRC: {horarioData.nrc}</h2><button onClick={() => setShowHorarioModal(false)} className="btn-cerrar-modal"><X size={18} /></button></div> <div className="modal-body"> <p><b>Asignatura:</b> {horarioData.asignatura?.nombre}</p> <p><b>EPS:</b> {horarioData.campoclinico?.eps?.razonsocial}</p> <table className='tabla-sgpc' style={{marginTop: '1.6rem'}}> <thead><tr><th>DIA</th><th>HORA INICIO</th><th>HORA FIN</th></tr></thead> <tbody>{horarioData.horariodocente?.map((h:any,i:number) => <tr key={i}><td>{h.dia_semana}</td><td>{h.hora_inicio}</td><td>{h.hora_fin}</td></tr>)}</tbody> </table> </div> </div> </div> )}
        {showActualizarModal && ( <div className="modal-overlay" onClick={() => setShowActualizarModal(false)}> <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{maxWidth: '50rem'}}> <div className="modal-header"><h2>Cambiar Supervisor NRC: {asignacionEdit?.nrc}</h2><button onClick={() => setShowActualizarModal(false)} className="btn-cerrar-modal"><X size={18} /></button></div> <div className="modal-body"> <SelectSGPCFieldset label="Nuevo Supervisor *" value={formAsignar.idsupervisor} onChange={(val:any) => setFormAsignar({...formAsignar, idsupervisor: val})} options={supervisores.map(s=>({value:s.idsupervisor, label:`${s.persona?.apellidos}, ${s.persona?.nombres}`}))} /> </div> <div className="modal-footer"> <button className="btn-secundario" onClick={() => setShowActualizarModal(false)}>Cancelar</button> <button className="btn-primario" onClick={handleActualizar} disabled={!formAsignar.idsupervisor}><Check size={18} /> Guardar</button> </div> </div> </div> )}
        {showVerCargaModal && cargaParaVer && (
  <div className="modal-overlay" >
    <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{maxWidth: '95rem', maxHeight: '90vh', display: 'flex', flexDirection: 'column'}}>
      
      <div className="modal-header">
        <h2 style={{display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--color-primario)', fontSize: '1.8rem'}}>
          <Users size={22} /> Carga Docente - NRC: {cargaParaVer?.nrc}
        </h2>
        <button onClick={() => setShowVerCargaModal(false)} className="btn-cerrar-modal"><X size={18} /></button>
      </div>

      <div className="modal-body" style={{overflowY: 'auto', padding: '2rem'}}>
        
        <fieldset className="fieldset-sgpc-section">
          <legend>Información General</legend>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.2rem', fontSize: '1.3rem'}}>
            <div><b>Periodo Académico:</b> {periodos.find(p=>p.idpa === cargaParaVer.campoclinico?.idpa)?.nombre}</div>
            <div><b>DNI + Docente:</b> {cargaParaVer.docente?.persona?.dni} - {cargaParaVer.docente?.persona?.apellidos}, {cargaParaVer.docente?.persona?.nombres}</div>
            <div><b>Especialidad:</b> {cargaParaVer.docente?.profesion?.profesion || 'S/ESPECIALIDAD'}</div>
            <div><b>Asignatura:</b> {cargaParaVer.asignatura?.nombre}</div>
            <div style={{gridColumn: '1 / 3'}}><b>Campo Clínico:</b> <Hospital size={14}/> {cargaParaVer.campoclinico?.eps?.razonsocial}</div>
            <div style={{gridColumn: '1 / 3', color: 'var(--color-texto-secundario)'}}><b>Dirección:</b> <MapPin size={14}/> {epsCompletaVer?.direccion}, {epsCompletaVer?.distrito?.nombredt} - {epsCompletaVer?.distrito?.provincia?.nombrep} - {epsCompletaVer?.distrito?.provincia?.departamento?.nombred}</div>
          </div>
        </fieldset>

        <fieldset className="fieldset-sgpc-section">
          <legend className="legend-sgpc-titulo"><Clock size={16}/> Horario Académico</legend>
          <div className="table-responsive">
            <table className='tabla-sgpc'>
              <thead><tr><th>Nro</th><th>Día</th><th>Hora Inicio</th><th>Hora Fin</th></tr></thead>
              <tbody>
                {loadingVer? <tr><td colSpan={4}>Cargando...</td></tr> :
                 horariosVer.length === 0? <tr><td colSpan={4}>No hay horario registrado</td></tr> :
                 horariosVer.map((h,i) => (
                  <tr key={i}>
                    <td>{i+1}</td>
                    <td>{h.dia_semana}</td>
                    <td>{h.hora_inicio}</td>
                    <td>{h.hora_fin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </fieldset>

        <fieldset className="fieldset-sgpc-section">
          <legend className="legend-sgpc-titulo"><Users size={16}/> Relación de Estudiantes</legend>
          <div className="table-responsive">
            <table className='tabla-sgpc'>
              <thead><tr><th>Nro</th><th>DNI</th><th>Estudiante</th></tr></thead>
              <tbody>
                {loadingVer? <tr><td colSpan={3}>Cargando...</td></tr> :
                 estudiantesVer.length === 0? <tr><td colSpan={3}>No hay estudiantes</td></tr> :
                 estudiantesVer.map((h,i) => (
                  <tr key={i}>
                    <td>{i+1}</td>
                    <td>{h.matricula?.estudiante?.persona?.dni}</td>
                    <td>{h.matricula?.estudiante?.persona?.apellidos}, {h.matricula?.estudiante?.persona?.nombres}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </fieldset>
      </div>

      <div className="modal-footer" style={{justifyContent: 'center'}}>
        <button className="btn-primario" onClick={() => window.print()}><Printer size={16}/>Imprimir</button>
      </div>
    </div>
  </div>
)}
      </div>
    
  
  )
}