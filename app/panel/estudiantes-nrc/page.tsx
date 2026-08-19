'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/client'
import { Users, Eye, Trash2, RefreshCcw, Eraser, ChevronLeft, ChevronRight, AlertCircle, X } from 'lucide-react'
import AsyncSelect from 'react-select/async'
import Select from 'react-select'
import ModalVerHorarioSoloLectura from './components/ModalVerHorarioSoloLectura'
import ModalReasignarEstudiante from './components/ModalReasignarEstudiante'

type RegistroNRC = any

const SelectSGPCFieldset = ({label, value, onChange, options, isAsync = false, loadOptions, isDisabled = false}:any) => {
  const Component = isAsync? AsyncSelect : Select
  return (
    <fieldset className="fieldset-sgpc">
      <legend>{label}</legend>
      <Component
        options={isAsync? undefined : options}
        loadOptions={isAsync? loadOptions : undefined}
        defaultOptions={isAsync}
        cacheOptions={isAsync}
        value={value}
        onChange={onChange}
        isDisabled={isDisabled}
        placeholder="Seleccione..." isSearchable maxMenuHeight={200}
        classNamePrefix="react-select"
        menuPortalTarget={typeof document !== 'undefined' ? document.body : null} // <-- ESTO ES CLAVE
        menuPosition="fixed"
        styles={{ 
          control: (base, state) => ({...base, height: '4.4rem', minHeight: '4.4rem', borderRadius: '0.6rem', border: '1px solid #cbd5e1', background: '#fff', boxShadow: state.isFocused? '0 0 0 1px var(--color-primario)' : 'none', marginTop: '0.4rem' }), 
          menuPortal: (base) => ({...base, zIndex: 99999 }), // <-- ESTO ES CLAVE
          menu: (base) => ({...base, zIndex: 9999 }) 
        }}
      />
    </fieldset>
  )
}

export default function EstudiantesNRCPage() {
  const supabase = createClient()

  // NUEVO - PARA LOS MODALES
  const [showVer, setShowVer] = useState(false)
  const [idHorarioSel, setIdHorarioSel] = useState<number | null>(null)
  
  const [showReasignar, setShowReasignar] = useState(false)
  const [dataReasignar, setDataReasignar] = useState<any>(null)
  
  const [registros, setRegistros] = useState<RegistroNRC[]>([])
  const [periodos, setPeriodos] = useState<any[]>([])

const [filiales, setFiliales] = useState<any[]>([])
const [filtroFilial, setFiltroFilial] = useState<any>({value: '', label: 'TODOS'})
const [filtroEstado, setFiltroEstado] = useState<any>({value: 'ACTIVO', label: 'ACTIVO'})

  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null)

  const [searchNRC, setSearchNRC] = useState('')
  const [filtroPeriodo, setFiltroPeriodo] = useState<any>({value: '', label: 'TODOS'})
  const [estudianteSel, setEstudianteSel] = useState<any>(null)
  const [asignaturaSel, setAsignaturaSel] = useState<any>(null)

  const [paginaActual, setPaginaActual] = useState(1)
  const registrosPorPagina = 10
  const [totalRegistros, setTotalRegistros] = useState(0)

const [showBaja, setShowBaja] = useState(false)
const [dataBaja, setDataBaja] = useState<any>(null)

  const showToast = (msg: string, type: 'error' | 'success' = 'error') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

// useEffect(() => {
//   const cargarFiliales = async () => {
//     const {data} = await supabase.from('filial').select('*').order('nombrefilial')
//     setFiliales(data || [])
//   }
//   cargarFiliales()
// }, [])

useEffect(() => {
  cargarFilialesDelPeriodo()
}, [filtroPeriodo?.value])

const cargarFilialesDelPeriodo = async () => {
  const idpa = filtroPeriodo?.value
  if(!idpa) {
    setFiliales([]);
    return
  }

  const {data, error} = await supabase.from('horario')
   .select(`
      matricula!inner(
        estudiante!inner(idfilial)
      ),
      cargaacademica!inner(
        horariodocente:idhorariod(
          campoclinico:idcampocli!inner(idpa)
        )
      )
    `)
   .eq('estado', 'ACTIVO')
   .eq('cargaacademica.estado', 'ACTIVO')
   .eq('cargaacademica.horariodocente.campoclinico.idpa', Number(filtroPeriodo.value))
   .limit(1000)

  if(error ||!data) { setFiliales([]); return }

  // Sacar filiales únicas
  const idsFiliales = [...new Set(data.map(h => h.matricula?.estudiante?.idfilial).filter(Boolean))]

  if(idsFiliales.length === 0) { setFiliales([]); return }

  // Traer nombres de esas filiales
  const {data: filData} = await supabase.from('filial').select('idfilial, nombrefilial').in('idfilial', idsFiliales).order('nombrefilial')

  setFiliales(filData || [])
}

const loadEstudiantes = async (inputValue: string) => {
  const {data, error} = await supabase.from('horario')
    .select(`
      idmatricula,
      matricula!inner(
        idmatricula,
        estudiante!inner(
          idestudiante, 
          persona:idpersona!inner(dni, apellidos, nombres)
        )
      ),
      cargaacademica!inner(
        idcargaacad,
        horariodocente:idhorariod(
          campoclinico:idcampocli!inner(idpa)
        )
      )
    `)
    .eq('estado', 'ACTIVO')
    .eq('cargaacademica.estado', 'ACTIVO')
    .limit(1000)

  if(error || !data) return []

  // 1. Filtrar por periodo en JS
  let filtrado = data
  if(filtroPeriodo?.value) {
    const idpa = Number(filtroPeriodo.value)
    filtrado = filtrado.filter(h => h.cargaacademica?.horariodocente?.campoclinico?.idpa === idpa)
  }

  if(filtroFilial?.value) {
  const idfilial = Number(filtroFilial.value)
  filtrado = filtrado.filter(h => h.matricula?.estudiante?.idfilial === idfilial)
}

  // 2. Quitar duplicados por idestudiante
  const mapaEst = new Map()
  filtrado.forEach(h => {
    const est = h.matricula?.estudiante
    if(est?.idestudiante && !mapaEst.has(est.idestudiante)) {
      mapaEst.set(est.idestudiante, est)
    }
  })

  // 3. Filtrar por texto
  const texto = inputValue.toLowerCase().trim()
  const lista = Array.from(mapaEst.values())
  const filtrados = texto ? lista.filter(e => 
    e.persona?.dni?.toLowerCase().includes(texto) || 
    e.persona?.apellidos?.toLowerCase().includes(texto) ||
    e.persona?.nombres?.toLowerCase().includes(texto)
  ) : lista

  return filtrados.map(e => ({
    value: e.idestudiante,
    label: `${e.persona.dni} - ${e.persona.apellidos}, ${e.persona.nombres}`
  }))
}

const loadAsignaturasFiltro = async (inputValue: string) => {
  const {data, error} = await supabase.from('horario')
    .select(`
      cargaacademica!inner(
        idasignatura,
        asignatura:idasignatura(idasignatura, codigo, nombre),
        horariodocente:idhorariod(
          campoclinico:idcampocli!inner(idpa)
        )
      ),
      matricula!inner(
        estudiante!inner(idestudiante,idfilial)
      )
    `)
    .eq('estado', 'ACTIVO')
    .eq('cargaacademica.estado', 'ACTIVO')
    .limit(1000)

  if(error || !data) return []

  // 1. Filtrar por periodo en JS
  let filtrado = data
  if(filtroPeriodo?.value) {
    const idpa = Number(filtroPeriodo.value)
    filtrado = filtrado.filter(h => h.cargaacademica?.horariodocente?.campoclinico?.idpa === idpa)
  }
  if(filtroFilial?.value) {
  const idfilial = Number(filtroFilial.value)
  filtrado = filtrado.filter(h => h.matricula?.estudiante?.idfilial === idfilial)
}

  // 2. Filtrar por estudiante en JS - ESTO ES LO NUEVO
  if(estudianteSel?.value) {
    filtrado = filtrado.filter(h => h.matricula?.estudiante?.idestudiante === estudianteSel.value)
  }

  // 3. Quitar duplicados por idasignatura
  const mapaAsig = new Map()
  filtrado.forEach(h => {
    const asig = h.cargaacademica?.asignatura
    if(asig?.idasignatura && !mapaAsig.has(asig.idasignatura)) {
      mapaAsig.set(asig.idasignatura, asig)
    }
  })

  // 4. Filtrar por texto
  const texto = inputValue.toLowerCase().trim()
  const lista = Array.from(mapaAsig.values())
  const filtrados = texto ? lista.filter(a => 
    a.nombre?.toLowerCase().includes(texto) || 
    a.codigo?.toLowerCase().includes(texto)
  ) : lista

  return filtrados.map(a => ({
    value: a.idasignatura, 
    label: `${a.codigo} - ${a.nombre}`
  }))
}

  const fetchData = async () => {
  setLoading(true)
  const {data: per} = await supabase.from('periodoacademico').select('*').order('fecha_inicio', {ascending: false})
  setPeriodos(per || [])

  // 1. Trae todo sin filtro de periodo
  let query = supabase.from('horario')
    .select(`
      idhorario, estado,
      cargaacademica!inner(
        idcargaacad, nrc,
        asignatura:idasignatura(*, carrera:idcarrera(*)),
        horariodocente:idhorariod(*, campoclinico:idcampocli!inner(*, periodoacademico:idpa(*), filial:idfilial(*)))
      ),
      matricula!inner(
        idmatricula,
        estudiante!inner(idestudiante, idcarrera, idfilial, persona:idpersona(*))
      )
    `, { count: 'exact' })
    
    .eq('cargaacademica.estado', 'ACTIVO')

  if(estudianteSel?.value) query = query.eq('matricula.estudiante.idestudiante', estudianteSel.value)
  if(filtroEstado?.value) query = query.eq('estado', filtroEstado.value)
  if(asignaturaSel?.value) query = query.eq('cargaacademica.idasignatura', asignaturaSel.value)
  if(searchNRC) query = query.ilike('cargaacademica.nrc', `%${searchNRC}%`)

  const {data, count, error} = await query.order('idhorario', {ascending: false}).limit(1000) // Trae max 1000
  
  if(error) { showToast(error.message, 'error') }

  let dataFiltrada = data || []
  
  // 2. FILTRA EN JS IGUAL QUE EN CARGAACADEMICA
  if(filtroPeriodo?.value) {
    const idpa = Number(filtroPeriodo.value)
    dataFiltrada = dataFiltrada.filter(h => h.cargaacademica?.horariodocente?.campoclinico?.idpa === idpa)
  }
  if(filtroFilial?.value) {
  const idfilial = Number(filtroFilial.value)
  dataFiltrada = dataFiltrada.filter(h => h.matricula?.estudiante?.idfilial === idfilial)
}

  // 3. PAGINACION MANUAL
  const inicio = (paginaActual-1)*registrosPorPagina
  const fin = inicio + registrosPorPagina
  setRegistros(dataFiltrada.slice(inicio, fin))
  setTotalRegistros(dataFiltrada.length) // <-- IMPORTANTE: usa length del filtrado
  setLoading(false)
}

  useEffect(() => { fetchData() }, [paginaActual, filtroPeriodo, filtroFilial, filtroEstado, estudianteSel, asignaturaSel, searchNRC])

const handlePeriodoChange = (opt) => {
  setFiltroPeriodo(opt)
  setFiltroFilial({value: '', label: 'TODOS'}) // limpia
  setEstudianteSel(null)
  setAsignaturaSel(null)
  setPaginaActual(1)
  cargarFilialesDelPeriodo() // NUEVO
}

 const handleEliminar = (reg: any) => {
  setDataBaja({
    idhorario: reg.idhorario,
    estudiante: `${reg.matricula?.estudiante?.persona?.apellidos}, ${reg.matricula?.estudiante?.persona?.nombres}`,
    asignatura: reg.cargaacademica?.asignatura?.nombre,
    nrc: reg.cargaacademica?.nrc
  })
  setShowBaja(true)
}

const confirmarBaja = async () => {
  if(!dataBaja) return
  const {error} = await supabase.from('horario').update({estado: 'INACTIVO'}).eq('idhorario', dataBaja.idhorario)
  if(error) showToast(error.message, 'error') 
  else { 
    showToast('Estudiante dado de baja del NRC', 'success'); 
    fetchData() 
  }
}

  const handleReasignar = (reg: any) => {
    showToast(`Próximamente: Reasignar a otro NRC`, 'success')
  }

  const handleVerHorario = (reg: any) => {
    showToast(`Próximamente: Ver horario del estudiante`, 'success')
  }

 const limpiarFiltros = () => {
  setSearchNRC(""); 
  setFiltroPeriodo({value: '', label: 'TODOS'}); 
  setFiltroFilial({value: '', label: 'TODOS'});
  setFiltroEstado({value: 'ACTIVO', label: 'ACTIVO'});
  setEstudianteSel(null); 
  setAsignaturaSel(null); 
  setPaginaActual(1)
}

  return (
    <div className="main-content">
      {toast && <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 99999, background: toast.type === 'error'? '#EF4444' : '#22C55E', color: '#fff', padding: '1.2rem 2.4rem', borderRadius: '0.8rem', fontWeight: 600, fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}><AlertCircle size={16}/>{toast.msg}</div>}

      <div className="header-responsive">
        <div><h1><Users size={24} style={{marginRight: '0.8rem'}}/>Gestión Estudiantes con NRC</h1><p>Total: {totalRegistros} registros</p></div>
      </div>

      <div className="card-sgpc" style={{ marginBottom: '2.4rem', padding: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr), auto', gap: '1.2rem', alignItems: 'flex-end' }}>
          <SelectSGPCFieldset label="Filtrar por Periodo" value={filtroPeriodo} onChange={(opt) => { setFiltroPeriodo(opt); setEstudianteSel(null); setAsignaturaSel(null); setPaginaActual(1) }} options={[{value: '', label: 'TODOS'},...periodos.map(p=>({value:p.idpa, label:`${p.codigo} - ${p.nombre}`}))]} />
             <SelectSGPCFieldset label="Filial" value={filtroFilial} onChange={(opt) => { setFiltroFilial(opt); setEstudianteSel(null); setAsignaturaSel(null); setPaginaActual(1) }} options={[{value: '', label: 'TODOS'},...filiales.map(f=>({value:f.idfilial, label:f.nombrefilial}))]} isDisabled={!filtroPeriodo?.value} />
          <SelectSGPCFieldset label="Estudiante" value={estudianteSel} onChange={(opt) => {setEstudianteSel(opt); setPaginaActual(1)}} isAsync loadOptions={loadEstudiantes} isDisabled={!filtroPeriodo?.value} />
          <SelectSGPCFieldset  
  key={`asig-${filtroPeriodo?.value || 'todos'}-${filtroFilial?.value || 'todos'}-${estudianteSel?.value || 'todos'}`}
  label="Asignatura"
  value={asignaturaSel}
  onChange={setAsignaturaSel}
  isAsync
  loadOptions={loadAsignaturasFiltro}
/>
<SelectSGPCFieldset label="Estado" value={filtroEstado} onChange={(opt)=>{setFiltroEstado(opt); setPaginaActual(1)}} options={[{value: 'ACTIVO', label: 'ACTIVO'}, {value: 'INACTIVO', label: 'INACTIVO'}, {value: '', label: 'TODOS'}]} />
          <div><legend>Buscar NRC</legend><input className="input-sgpc" placeholder="Buscar NRC..." value={searchNRC} onChange={e => {setSearchNRC(e.target.value); setPaginaActual(1)}} style={{height: "4.4rem", width: '100%', marginTop: '0.4rem' }} /></div>
          <button className="btn-secundario btn-limpiar" onClick={limpiarFiltros} style={{height: '4.4rem'}}><Eraser size={16} />Limpiar</button>
        </div>
      </div>

      <div className="card-sgpc" style={{ overflowX: 'auto' }}>
        <table className='tabla-sgpc'>
          <thead><tr>
            <th>N°</th><th>PERIODO</th><th>FILIAL</th><th>CARRERA</th><th>DNI</th><th>ESTUDIANTE</th><th>ASIGNATURA</th><th>NRC</th><th>ESTADO</th><th>ACCIONES</th>
          </tr></thead>
          <tbody>
            {loading? <tr><td colSpan={10} style={{textAlign: 'center', padding: '2rem'}}>Cargando...</td></tr> :
            registros.length === 0? <tr><td colSpan={10} style={{textAlign: 'center', padding: '2rem'}}>No hay estudiantes registrados con los filtros actuales</td></tr> :
            registros.map((r,i) => (
              <tr key={r.idhorario}>
                <td>{(paginaActual-1)*registrosPorPagina + i + 1}</td>
                <td>{r.cargaacademica?.horariodocente?.campoclinico?.periodoacademico?.codigo}</td>
                <td>{r.cargaacademica?.horariodocente?.campoclinico?.filial?.nombrefilial}</td>
                <td>{r.cargaacademica?.asignatura?.carrera?.nombrecarrera}</td>
                <td>{r.matricula?.estudiante?.persona?.dni}</td>
                <td>{r.matricula?.estudiante?.persona?.apellidos}, {r.matricula?.estudiante?.persona?.nombres}</td>
                <td>{r.cargaacademica?.asignatura?.nombre}</td>
                <td><b>{r.cargaacademica?.nrc}</b></td>
                <td>
  <span style={{
    padding: '0.4rem 0.8rem', 
    borderRadius: '999px', 
    fontSize: '1.2rem', 
    fontWeight: 600, 
    background: r.estado === 'ACTIVO' ? '#F0FDF4' : '#FEF2F2', 
    color: r.estado === 'ACTIVO' ? '#22C55E' : '#DC2626'
  }}>
    {r.estado}
  </span>
</td>
                <td style={{display: 'flex', gap: '0.8rem'}}>
  {r.estado === 'ACTIVO'? (
    <>
      <button className="btn-icon" title="Ver Horario" onClick={() => {setIdHorarioSel(r.idhorario); setShowVer(true)}}><Eye size={15} /></button>
      
      <button 
        className="btn-icon btn-icon-editar" 
        title="Reasignar" 
        onClick={() => { 
          setDataReasignar({
            idhorario: r.idhorario,
            idmatricula: r.matricula?.idmatricula,
            idcargaacad: r.cargaacademica?.idcargaacad,
            idpa: r.cargaacademica?.horariodocente?.campoclinico?.idpa,
            idasignatura: r.cargaacademica?.idasignatura,
            estudiante: `${r.matricula?.estudiante?.persona?.apellidos}, ${r.matricula?.estudiante?.persona?.nombres}`,
            nrc_actual: r.cargaacademica?.nrc
          }); 
          setShowReasignar(true) 
        }}
      >
        <RefreshCcw size={15} />
      </button>
      
      <button className="btn-icon btn-icon-eliminar" title="Dar de Baja" onClick={() => handleEliminar(r)}><Trash2 size={15} /></button>
    </>
  ) : (
    <>
      <button className="btn-icon" title="Ver Horario" disabled><Eye size={15} /></button>
      <button className="btn-icon btn-icon-editar" title="Reasignar" disabled><RefreshCcw size={15} /></button>
      <button
        className="btn-icon btn-icon-reactivar"
        title="Reactivar"
        onClick={async () => {
          const {error} = await supabase.from('horario').update({estado: 'ACTIVO'}).eq('idhorario', r.idhorario)
          if(error) showToast(error.message, 'error') 
          else { showToast('Estudiante reactivado en el NRC', 'success'); fetchData() }
        }}
      >
        <RefreshCcw size={15} />
      </button>
    </>
  )}
</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {totalRegistros > 0 && (
          <div className="card-sgpc" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.6rem 2rem', marginTop: '1.6rem', borderRadius: '0.8rem'}}>
            <span style={{fontSize: '1.4rem'}}>Mostrando { (paginaActual-1)*registrosPorPagina + 1 } al { Math.min(paginaActual*registrosPorPagina, totalRegistros) } de {totalRegistros} registros</span>
            <div style={{display: 'flex', alignItems: 'center', gap: '1.2rem'}}>
              <button className="btn-secundario btn-outline-azul" onClick={() => setPaginaActual(paginaActual - 1)} disabled={paginaActual === 1} style={{display: 'flex', alignItems: 'center', gap: '0.6rem'}}><ChevronLeft size={16} /> Anterior</button>
              <span style={{fontWeight: 600}}>Pág {paginaActual} de {Math.ceil(totalRegistros / registrosPorPagina) || 1}</span>
              <button className="btn-primario" onClick={() => setPaginaActual(paginaActual + 1)} disabled={paginaActual >= Math.ceil(totalRegistros / registrosPorPagina)} style={{display: 'flex', alignItems: 'center', gap: '0.6rem'}}>Siguiente <ChevronRight size={16} /></button>
            </div>
          </div>
        )}

        {/* MODALES NUEVOS */}
<ModalVerHorarioSoloLectura 
  show={showVer} 
  onClose={() => setShowVer(false)} 
  idhorario={idHorarioSel} 
/>

<ModalReasignarEstudiante 
  show={showReasignar} 
  onClose={() => setShowReasignar(false)} 
  dataEstudiante={dataReasignar}
  onReasignado={() => fetchData()} // para que recargue la tabla
/>

{showBaja && (
  <div className="modal-overlay" style={{background: 'rgba(0,0,0,0.5)'}}>
    <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{maxWidth: '45rem'}}>
      <div className="modal-header">
        <h2 style={{display: 'flex', alignItems: 'center', gap: '0.8rem', color: '#DC2626'}}><Trash2 size={22} /> Confirmar Baja</h2>
        <button onClick={() => setShowBaja(false)} className="btn-cerrar-modal"><X size={18} /></button>
      </div>
      <div className="modal-body">
        <p style={{fontSize: '1.5rem', textAlign: 'center', marginBottom: '1rem'}}>
          ¿Está seguro de dar de baja a este estudiante del NRC?
        </p>
        <div style={{background: '#FEF2F2', padding: '1rem', borderRadius: '0.8rem', border: '1px solid #FECACA'}}>
          <p><b>Estudiante:</b> {dataBaja?.estudiante}</p>
          <p><b>Asignatura:</b> {dataBaja?.asignatura}</p>
          <p><b>NRC:</b> {dataBaja?.nrc}</p>
        </div>
      </div>
      <div className="modal-footer" style={{justifyContent: 'center', gap: '1rem'}}>
  <button 
    className="btn-secundario btn-outline-azul" 
    style={{display: 'flex', alignItems: 'center', gap: '0.6rem'}}
    onClick={() => setShowBaja(false)}
  >
    <X size={16} />Cancelar
  </button>
  <button 
    className="btn-primario" 
    style={{
      display: 'flex', 
      alignItems: 'center', 
      gap: '0.6rem', 
      background: '#DC2626', 
      borderColor: '#DC2626'
    }}
    onClick={async () => { await confirmarBaja(); setShowBaja(false) }}
  >
    <Trash2 size={16} />Confirmar Baja
  </button>
</div>
    </div>
  </div>
)}

      </div>
      <style jsx>{`
.grid-filtros-nrc {
  display: grid;
  gap: 1.2rem;
  align-items: flex-end;
}

/* PC: 1025px en adelante = 3 arriba y 4 abajo */
@media (min-width: 1025px) {
  .grid-filtros-nrc {
    grid-template-columns: repeat(4, 1fr);
    grid-template-areas: 
      "periodo filial estado ."
      "estudiante asignatura buscar limpiar";
  }
  .periodo { grid-area: periodo; }
  .filial { grid-area: filial; }
  .estado { grid-area: estado; }
  .estudiante { grid-area: estudiante; }
  .asignatura { grid-area: asignatura; }
  .buscar { grid-area: buscar; }
  .limpiar { grid-area: limpiar; }
}

/* TABLET: 641px a 1024px = 2 columnas */
@media (min-width: 641px) and (max-width: 1024px) {
  .grid-filtros-nrc {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* CELULAR: 640px o menos = 1 columna */
@media (max-width: 640px) {
  .grid-filtros-nrc {
    grid-template-columns: 1fr;
  }
}
  `}</style>
    </div>
  )
}