'use client'
import React, { useEffect, useState, useMemo, useRef } from 'react' // agrega useRef
//import { momentPeru as moment, nowPeru, hoyPeru, fechaHoraPeru, momentPeru } from '@/lib/momentPeru'
import { momentPeru, nowPeru, hoyPeru, fechaHoraPeru } from '@/lib/momentPeru'
import 'moment/locale/es'
import { createClient } from '@/lib/client'
import { Check, X, CalendarDays, FileText, ChevronLeft, ChevronRight } from 'lucide-react'
import Select from 'react-select'
import { Calendar, momentLocalizer } from 'react-big-calendar'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import ModalFichaSupervision from './components/ModalFichaSupervision'
import ModalConsultaVisita from './components/ModalConsultaVisita' // <-- AGREGAR ESTO


momentPeru.locale('es')
const localizer = momentLocalizer(momentPeru)

const minHora = new Date(2000,0,1,6,0) // 6am fijo
const maxHora = new Date(2000,0,1,22,0) // 10pm fijo
// const ESTADO_COLORES: any = {
//   'PROGRAMADO': { bg: '#3B82F6', border: '#2563EB', text: '#fff' },
//   'EN_PROCESO': { bg: '#F59E0B', border: '#D97706', text: '#fff' },
//   'SUPERVISADO': { bg: '#22C55E', border: '#16A34A', text: '#fff' }
// }
const ESTADO_COLORES: any = {
  'PROGRAMADO': { bg: '#3B82F6', border: '#2563EB', text: '#fff' },
  'EN_PROCESO': { bg: '#F59E0B', border: '#D97706', text: '#fff' },
  'SUPERVISADO': { bg: '#22C55E', border: '#16A34A', text: '#fff' },
  'PENDIENTE': { bg: 'rgb(218, 220, 224)', border: 'rgb(190, 195, 206)', text: 'rgb(131, 127, 127)' }, // plomo
  'PERMISO': { bg: 'rgb(235, 236, 143)', border: 'rgb(217, 213, 6)', text: 'rgb(59, 57, 57)' }, // Naranja
  'INCIDENCIA': { bg: '#EF4444', border: '#DC2626', text: '#fff' } // Rojo
}

const SelectSGPCFieldset = ({label, value, onChange, options}:any) => {
  const selectedOption = options.find((o:any) => o.value === value) || null
  return (
    <fieldset className="fieldset-sgpc">
      <legend>{label}</legend>
      <Select options={options} value={selectedOption} onChange={(opt:any) => onChange(opt?.value || '')} placeholder="Todos" isSearchable maxMenuHeight={200} classNamePrefix="react-select" menuPortalTarget={typeof window!== 'undefined'? document.body : null} menuPosition="fixed" styles={{ control: (base, state) => ({...base, height: '4.4rem', minHeight: '4.4rem', borderRadius: '0.6rem', border: '1px solid #cbd5e1', background: '#fff', boxShadow: state.isFocused? '0 0 0 1px var(--color-primario)' : 'none', marginTop: '0.4rem', cursor: 'pointer' }), valueContainer: (base) => ({...base, padding: '0 1.2rem', height: '4.4rem' }), input: (base) => ({...base, margin: 0, padding: 0 }), indicatorsContainer: (base) => ({...base, height: '4.4rem' }), option: (base, state) => ({...base, backgroundColor: state.isSelected? 'var(--color-primario)' : state.isFocused? 'var(--color-acento)' : '#fff', color: state.isSelected? '#fff' : 'var(--color-texto)', padding: '1rem 1.2rem' }), menu: (base) => ({...base, zIndex: 9999, marginTop: '0.4rem' }) }} />
    </fieldset>
  )
}

export default function ProgramacionVisitasPage() {
  const supabase = createClient()
  const esAdminRef = useRef(false)
  const [loading, setLoading] = useState(true)
  const [visitas, setVisitas] = useState<any[]>([])
  const [supervisores, setSupervisores] = useState<any[]>([])
  const [periodos, setPeriodos] = useState<any[]>([])
  const [filiales, setFiliales] = useState<any[]>([])
  const [eps, setEps] = useState<any[]>([])
  const [esAdmin, setEsAdmin] = useState(false)
  const [idSupervisorLogeado, setIdSupervisorLogeado] = useState<number | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [semanaActual, setSemanaActual] = useState(momentPeru())

  const limpiarFiltros = () => {
    setFiltroPeriodo('')
    setFiltroFilial('')
    setFiltroEps('')
    setFiltroSupervisor('')
    setSemanaActual(momentPeru()) // NUEVO: volver a la semana de hoy
  }



  const [showModalConsulta, setShowModalConsulta] = useState(false)
  const [visitaParaConsulta, setVisitaParaConsulta] = useState<any>(null)

  const [filtroSupervisor, setFiltroSupervisor] = useState<number | ''>('')
  const [filtroPeriodo, setFiltroPeriodo] = useState<number | ''>('')
  const [filtroFilial, setFiltroFilial] = useState<number | ''>('')
  const [filtroEps, setFiltroEps] = useState<number | ''>('')
  const [showFichaModal, setShowFichaModal] = useState(false)
  const [visitaSeleccionada, setVisitaSeleccionada] = useState<any>(null)
  const [observacion, setObservacion] = useState('')

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => { fetchDataMaestra() }, [])

const fetchDataMaestra = async () => {
    setLoading(true)
    let esAdminAhora = false
    let idSupLocal: number | null = null

const [sup] = await Promise.all([
      supabase.from('supervisor').select('idsupervisor, persona(dni, apellidos, nombres)').eq('estado', 'ACTIVO')
    ])
    setSupervisores(sup.data || [])

    const { data: { user } } = await supabase.auth.getUser()
    if(user){
      // CLAVE: JALAR TODO EN 1 SOLA CONSULTA DESDE USUARIO
      const { data: usuarioData, error } = await supabase.from('usuario')
       .select('idpersona, persona!inner(idrol, rol!inner(nombrerol))')
       .eq('id', user.id).single()
      
      if(error) console.log("ERROR ROL:", error)

      const rol = usuarioData?.persona?.rol?.nombrerol
      //esAdminAhora = rol === 'ADMINISTRADOR' || rol === 'GESTOR'

      const rolLower = rol?.toLowerCase().trim()
esAdminAhora = rolLower === 'administrador' || rolLower === 'gestor' || rolLower === 'supervisor'

      //console.log("ROL ENCONTRADO:", rol, "ES ADMIN:", esAdminAhora)
      esAdminRef.current = esAdminAhora
      setEsAdmin(esAdminAhora)
      
      if(!esAdminAhora && usuarioData?.idpersona){
        const { data: supData } = await supabase.from('supervisor').select('idsupervisor').eq('idpersona', usuarioData.idpersona).single()
        idSupLocal = supData?.idsupervisor || null
        setIdSupervisorLogeado(idSupLocal)
      }
    }
    await fetchVisitas(esAdminAhora, idSupLocal)
  }
  const fetchVisitas = async (forzarEsAdmin?: boolean, forzarIdSup?: number | null) => {
    setLoading(true)
    
    const esAdminParaQuery = forzarEsAdmin !== undefined ? forzarEsAdmin : esAdmin // Usar el que me pasen
    //console.log("CONSULTANDO COMO ADMIN:", esAdminParaQuery)
    const idSupParaQuery = forzarIdSup !== undefined ? forzarIdSup : idSupervisorLogeado // NUEVO
    //console.log("CONSULTANDO COMO ADMIN:", esAdminParaQuery)
    
    const inicioSemana = semanaActual.clone().startOf('week').format('YYYY-MM-DD')
    const finSemana = semanaActual.clone().endOf('week').format('YYYY-MM-DD')

    // QUERY SIMPLE SIN TANTO!INNER PARA EVITAR 406
    let query = supabase.from('visitasupervision').select(`
      idvisitas, fechavisita, horavisita, condicion, observaciones,
      asignacionsupervision(
        idasignacions, idsupervisor,
        asignacion_nrc_supervisor(
          idcargaacad, idsupervisor,
          cargaacademica(
            nrc,
            asignatura(nombre),
            campoclinico(
              idpa, idfilial, ideps,
              filial(nombrefilial),
              eps(razonsocial),
              docente(persona(apellidos, nombres))
            )
          )
        )
      ),
      solicitud_permiso(idvisitas, estado, motivo)
    `)
   .gte('fechavisita', inicioSemana)
   .lte('fechavisita', finSemana)

    if(!esAdminParaQuery && idSupParaQuery){ // USAR LA VARIABLE LOCAL
      query = query.eq('asignacionsupervision.idsupervisor', idSupParaQuery)
    } else {
      if(filtroSupervisor) query = query.eq('asignacionsupervision.idsupervisor', Number(filtroSupervisor))
      if(filtroFilial) query = query.eq('asignacionsupervision.asignacion_nrc_supervisor.cargaacademica.campoclinico.idfilial', Number(filtroFilial))
      if(filtroEps) query = query.eq('asignacionsupervision.asignacion_nrc_supervisor.cargaacademica.campoclinico.ideps', Number(filtroEps))
    }
    
    if(filtroPeriodo) query = query.eq('asignacionsupervision.asignacion_nrc_supervisor.cargaacademica.campoclinico.idpa', Number(filtroPeriodo))

    const { data, error } = await query.order('fechavisita', {ascending: true})
    if(error) {
      console.log("ERR VISITAS:", error)
    }
    setVisitas(data || [])

    // SACAR OPCIONES DINÁMICAS DE LAS VISITAS
    const visitasData = data || []
    
    const periodosUnicos = new Map()
    const filialesUnicas = new Map()
    const epsUnicas = new Map()
    
    visitasData.forEach(v => {
      const carga = v.asignacionsupervision?.asignacion_nrc_supervisor?.cargaacademica
      if(carga?.campoclinico){
        if(carga.campoclinico.idpa) periodosUnicos.set(carga.campoclinico.idpa, carga.campoclinico.idpa)
        if(carga.campoclinico.idfilial) filialesUnicas.set(carga.campoclinico.idfilial, {id: carga.campoclinico.idfilial, nombre: carga.campoclinico.filial?.nombrefilial})
        if(carga.campoclinico.ideps) epsUnicas.set(carga.campoclinico.ideps, {id: carga.campoclinico.ideps, nombre: carga.campoclinico.eps?.razonsocial})
      }
    })

    // Convertir a array para los selects
    setPeriodos(Array.from(periodosUnicos.keys()).map(id => ({idpa: id, codigo: `PA-${id}`}))
     .sort((a,b) => b.idpa - a.idpa))
    setFiliales(Array.from(filialesUnicas.values()).map(f => ({idfilial: f.id, nombrefilial: f.nombre})))
    setEps(Array.from(epsUnicas.values()).map(e => ({ideps: e.id, razonsocial: e.nombre})))

    setLoading(false)
  }
  
  useEffect(() => { if(supervisores.length > 0) fetchVisitas(esAdminRef.current, idSupervisorLogeado) }, [filtroSupervisor, filtroPeriodo, filtroFilial, filtroEps, esAdmin, idSupervisorLogeado, semanaActual])

    const opcionesPeriodo = useMemo(() => [
    {value: '', label: 'Todos'},
   ...periodos.map(p => ({value: p.idpa, label: p.codigo || `PA-${p.idpa}`}))
  ], [periodos])
  
  const opcionesFilial = useMemo(() => [
    {value: '', label: 'Todas'},
   ...filiales.map(f => ({value: f.idfilial, label: f.nombrefilial}))
  ], [filiales])
  
  const opcionesEps = useMemo(() => [
    {value: '', label: 'Todas'},
   ...eps.map(e => ({value: e.ideps, label: e.razonsocial}))
  ], [eps])

  const opcionesSupervisor = useMemo(() => [{value: '', label: 'Todos'},...supervisores.map(s=>({value:s.idsupervisor, label:`${s.persona?.dni} - ${s.persona?.apellidos}`}))], [supervisores]) 

//   const eventosCalendario = useMemo(() => visitas.map(v => {
//   const carga = v.asignacionsupervision?.asignacion_nrc_supervisor?.cargaacademica
//   const campoclinico = carga?.campoclinico

//   const horaIni = momentPeru(`${v.fechavisita} ${v.horavisita}`)
//   const horaFin = horaIni.clone().add(1, 'hour') // si tienes duración real cámbiala

//   return {
//     id: v.idvisitas,
//     title: carga?.asignatura?.nombre || 'Sin Asignatura', // ya no se usa tanto
//     start: horaIni.toDate(),
//     end: horaFin.toDate(),
//     resource: {
//      ...v,
//       horaRango: `${horaIni.format('HH:mm')} - ${horaFin.format('HH:mm')}`,
//       curso: `${carga?.asignatura?.nombre || 'Sin Asignatura'} - NRC:${carga?.nrc || ''}`,
//       eps: campoclinico?.eps?.razonsocial || 'Sin EPS',
//       docente: `${campoclinico?.docente?.persona?.apellidos || ''}, ${campoclinico?.docente?.persona?.nombres || ''}`
//     }
//   }
// }), [visitas])

const eventosCalendario = useMemo(() => {
  if (!visitas ||!Array.isArray(visitas)) return []

  return visitas.reduce((acc, v) => {
    if (!v.fechavisita ||!v.horavisita) return acc

    const carga = v.asignacionsupervision?.asignacion_nrc_supervisor?.cargaacademica
    const campoclinico = carga?.campoclinico

    // 1. Tomar solo HH:mm de "15:40:00"
    const horaStr = String(v.horavisita).substring(0,5) // "15:40"
    
    // 2. Unir fecha + hora sin T y sin formato estricto
    const horaIni = momentPeru(`${v.fechavisita} ${horaStr}`) 
    
    if (!horaIni.isValid()) {
      console.warn('Visita inválida:', v.idvisitas, v.fechavisita, v.horavisita)
      return acc
    }

    const horaFin = horaIni.clone().add(1, 'hour')

    acc.push({
      id: v.idvisitas,
      title: carga?.asignatura?.nombre || 'Sin Asignatura',
      start: horaIni.toDate(),
      end: horaFin.toDate(),
      resource: {
    ...v,
        horaRango: `${horaIni.format('HH:mm')} - ${horaFin.format('HH:mm')}`,
        curso: `${carga?.asignatura?.nombre || 'Sin Asignatura'} - NRC:${carga?.nrc || ''}`,
        eps: campoclinico?.eps?.razonsocial || 'Sin EPS',
        docente: `${campoclinico?.docente?.persona?.apellidos || ''}, ${campoclinico?.docente?.persona?.nombres || ''}`
      }
    })
    return acc
  }, [] as any[])
}, [visitas])


//  const visitasAgrupadasPorDia = useMemo(() => {
//     const grupos: any = {}
//     visitas.forEach(v => {
//       const dia = momentPeru(v.fechavisita).format('YYYY-MM-DD')
//       if(!grupos[dia]) grupos[dia] = []
//       grupos[dia].push(v)
//     })
//     return grupos
//   }, [visitas])

    const visitasAgrupadasPorDia = useMemo(() => {
      const grupos: any = {}
      visitas.filter(v => v.fechavisita).forEach(v => { // <- agrega filter
        const dia = momentPeru(v.fechavisita).format('YYYY-MM-DD')
        if(!grupos[dia]) grupos[dia] = []
        grupos[dia].push(v)
      })
      return grupos
    }, [visitas])


  const handleClickCard = (visita: any) => {
    // Si ya esta supervisado, permiso o incidencia → solo ver detalle
    if(['SUPERVISADO', 'PERMISO', 'INCIDENCIA'].includes(visita.condicion)){
      setVisitaSeleccionada(visita)
      setShowFichaModal(true) // Abre la ficha en solo lectura
      return
    }
    
    // Si esta programado o en proceso → abre modal de consulta
    setVisitaParaConsulta(visita)
    setShowModalConsulta(true)
  }

  const handleGuardarFicha = async () => {
    const { error } = await supabase.from('visitasupervision').update({
      condicion: 'SUPERVISADO',
      observaciones: observacion
    }).eq('idvisitas', visitaSeleccionada.idvisitas)
    if(error) alert(error.message)
    //else { setShowFichaModal(false); fetchVisitas() }
  else { setShowFichaModal(false); fetchVisitas(esAdmin, idSupervisorLogeado) }
  }

  //console.log("ES ADMIN:", esAdmin, "ROL DETECTADO")

  // const { minHora, maxHora } = useMemo(() => {
  //   if(visitas.length === 0) return { minHora: new Date(2026,0,1,7,0), maxHora: new Date(2026,0,1,20,0) }

  //   const horas = visitas.map(v => momentPeru(`${v.fechavisita} ${v.horavisita}`))
  //   const min = momentPeru.min(horas).startOf('hour').subtract(1, 'hour') // 1 hora antes
  //   const max = momentPeru.max(horas).endOf('hour').add(1, 'hour') // 1 hora después

  //   return {
  //     minHora: min.toDate(),
  //     maxHora: max.toDate()
  //   }
  // }, [visitas])
  
const { minHora, maxHora } = useMemo(() => {
  const defaultMin = new Date(2026,0,1,7,0) // 7am
  const defaultMax = new Date(2026,0,1,20,0) // 8pm

  if(eventosCalendario.length === 0) 
    return { minHora: defaultMin, maxHora: defaultMax }

  const fechasValidas = eventosCalendario
   .map(e => e.start)
   .filter(d => d instanceof Date &&!isNaN(d.getTime())) // <- Filtra Invalid Date

  if(fechasValidas.length === 0) 
    return { minHora: defaultMin, maxHora: defaultMax }

  const minDate = new Date(Math.min(...fechasValidas.map(d => d.getTime())))
  const maxDate = new Date(Math.max(...fechasValidas.map(d => d.getTime())))

  minDate.setHours(minDate.getHours() - 1) // 1 hora antes
  maxDate.setHours(maxDate.getHours() + 1) // 1 hora después

  return {
    minHora: minDate,
    maxHora: maxDate
  }
}, [eventosCalendario])

console.log("EVENTOS FINALES:", eventosCalendario)
console.log("MIN:", minHora, "MAX:", maxHora)

  return (
    
    <div className="main-content" style={{padding: '1rem'}}>
      <h1 style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', fontSize: '2rem'}}>
        <CalendarDays size={24}/> Programación de Visitas
      </h1>

      <div className="card-sgpc" style={{ padding: '1.5rem', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(20rem, 1fr))', gap: '1.2rem' }}>
        <SelectSGPCFieldset label="Periodo Académico" options={opcionesPeriodo} value={filtroPeriodo} onChange={setFiltroPeriodo} />
        {esAdminRef.current ? <>
          <SelectSGPCFieldset label="Filial" options={opcionesFilial} value={filtroFilial} onChange={setFiltroFilial} />          
        </> : null}
        <SelectSGPCFieldset label="EPS" options={opcionesEps} value={filtroEps} onChange={setFiltroEps} />
  
        {esAdminRef.current ? <>
          
          <SelectSGPCFieldset label="Supervisor" options={opcionesSupervisor} value={filtroSupervisor} onChange={setFiltroSupervisor} />
        </> : null}

        {/* BOTON LIMPIAR */}
        <button 
          className="btn-secundario" 
          style={{padding: '1rem', height: '4.4rem', marginTop: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'}}
          onClick={limpiarFiltros}
        >
          <X size={16}/> Limpiar Filtros
        </button>
      </div>

{/* LEYENDA + CONTADOR */}
<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem'}}>
  <div style={{display: 'flex', gap: '1.5rem', fontSize: '1.2rem', flexWrap: 'wrap'}}>
    {Object.entries(ESTADO_COLORES).map(([key, val]) => (
      <div key={key} style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
        <div style={{width: '1.6rem', height: '1.6rem', background: val.bg, border: `2px solid ${val.border}`, borderRadius: '0.3rem'}}></div>
        <span style={{fontWeight: 600}}>{key.replace('_', ' ')}</span>
      </div>
    ))}
  </div>
  <div style={{fontSize: '1.3rem', fontWeight: 'bold', color: '#004AAD'}}>
    {/* Total Semanal: {visitas.length} | Programadas: {visitas.filter(v => v.condicion === 'PROGRAMADO').length} | Proceso: {visitas.filter(v => v.condicion === 'EN_PROCESO').length} | Supervisadas: {visitas.filter(v => v.condicion === 'SUPERVISADO').length} */}
    Total Semanal: {visitas.length} | 
Programadas: {visitas.filter(v => ['PROGRAMADO','EN_PROCESO'].includes(v.condicion)).length} | 
Permiso: {visitas.filter(v => v.condicion === 'PERMISO').length} | 
Incidencia: {visitas.filter(v => v.condicion === 'INCIDENCIA').length} |
Supervisadas: {visitas.filter(v => v.condicion === 'SUPERVISADO').length}
  </div>
</div>

      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
        <button className="btn-secundario" style={{padding: '0.8rem 1.2rem'}} onClick={() => setSemanaActual(semanaActual.clone().subtract(1, 'week'))}>
          <ChevronLeft size={16}/> Anterior
        </button>
        <h3 style={{color: '#004AAD', fontSize: '1.6rem', textAlign: 'center'}}>
          Semana {semanaActual.format('W - YYYY')}
        </h3>
        <button className="btn-secundario" style={{padding: '0.8rem 1.2rem'}} onClick={() => setSemanaActual(semanaActual.clone().add(1, 'week'))}>
          Siguiente <ChevronRight size={16}/>
        </button>
      </div>

      {isMobile? (
        loading? <p style={{textAlign: 'center'}}>Cargando...</p> : 
        visitas.length === 0? <p style={{textAlign: 'center', color: '#64748b'}}>No tienes visitas programadas esta semana</p> :
        Object.keys(visitasAgrupadasPorDia).sort().map(dia => (
        <div key={dia} style={{marginBottom: '2rem'}}>
          <h3 style={{color: '#004AAD', marginBottom: '1rem', fontSize: '1.5rem', borderBottom: '2px solid #E2E8F0', paddingBottom: '0.5rem'}}>
            {momentPeru(dia).format('dddd DD [de] MMMM')}
          </h3>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(24rem, 1fr))', gap: '1rem'}}>
            {visitasAgrupadasPorDia[dia].map((v:any) => {
              const color = ESTADO_COLORES[v.condicion] || ESTADO_COLORES['PROGRAMADO']
              const carga = v.asignacionsupervision?.asignacion_nrc_supervisor?.cargaacademica
              return (
                <div key={v.idvisitas} className="card-sgpc" onClick={() => handleClickCard(v)} style={{padding: '1.5rem', borderLeft: `0.5rem solid ${color.bg}`, cursor: 'pointer'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                    <span style={{fontWeight: 700, fontSize: '1.4rem'}}>{v.horavisita}</span>
                    <span style={{background: color.bg, color: color.text, padding: '0.4rem 0.8rem', borderRadius: '2rem', fontWeight: 600, fontSize: '1.1rem'}}>{v.condicion}</span>
                  </div>
                  <p style={{margin: '0.4rem 0', fontSize: '1.3rem', fontWeight: 600}}>{carga?.asignatura?.nombre}</p>
                  <p style={{margin: '0.4rem 0', fontSize: '1.2rem', color: '#475569'}}>NRC: {carga?.nrc} | {carga?.campoclinico?.filial?.nombrefilial}</p>
                  <p style={{margin: '0.4rem 0', fontSize: '1.2rem', color: '#475569'}}>Doc: {carga?.campoclinico?.docente?.persona?.apellidos}</p>
                  <p style={{margin: '0.4rem 0', fontSize: '1.2rem', color: '#475569'}}>EPS: {carga?.campoclinico?.eps?.razonsocial}</p>
                  {/* <div style={{marginTop: '1.5rem'}}>
                    {v.condicion!== 'SUPERVISADO'?
                      <button className="btn-primario" style={{width: '100%', padding: '1rem'}} onClick={()=>handleRegistrarVisita(v)}>
                        <FileText size={16}/> Registrar
                      </button>
                      : <span style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#22C55E', fontWeight: 600}}><Check/> Supervisado</span>
                    }
                  </div> */}
                  <div style={{marginTop: '1.5rem'}}>
  {v.condicion!== 'SUPERVISADO'? (
    <button
      className="btn-primario"
      style={{width: '100%', padding: '1rem'}}
      onClick={(e) => {
        e.stopPropagation() // para que no se dispare 2 veces
        handleClickCard(v)
      }}
    >
      <FileText size={16}/> Registrar
    </button>
  ) : (
    <div
      style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#22C55E', fontWeight: 600}}
      onClick={(e) => e.stopPropagation()} // para que no haga nada al click
    >
      <Check/> Ver Detalle
    </div>
  )}
</div>
                </div>
              )
            })}
          </div>
        </div>
      ))) : (
        <div className="card-sgpc" style={{height: '70vh', padding: '1rem'}}>
         {loading? (
  <div style={{textAlign:'center', padding:'5rem'}}>Cargando calendario...</div>
  ) : eventosCalendario.length === 0? ( // <- NUEVO
    <div style={{textAlign:'center', padding:'5rem', color:'#64748b'}}>
      No hay visitas programadas esta semana
    </div>
) : (
         <Calendar
            localizer={localizer}
            events={eventosCalendario}
            startAccessor="start"
            endAccessor="end"
            defaultView="week"
            views={['week', 'day']}
            date={semanaActual.toDate()}
            onNavigate={(date) => setSemanaActual(momentPeru(date))}
            onSelectEvent={(event) => handleClickCard(event.resource)}

            //min={minHora}
            //max={maxHora}
            step={30}
            timeslots={2}

            components={{
              event: ({ event }) => ( // NUEVO: PINTAR EVENTO PERSONALIZADO
                <div style={{ padding: '4px 6px', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {/* <div style={{ fontSize: '1rem', fontWeight: 800 }}>{event.resource.horaRango}</div> */}
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, textTransform: 'uppercase', lineHeight: '1.2' }}>
                    {event.resource.curso}
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 500, opacity: 0.95 }}>
                    EPS: {event.resource.eps}
                  </div>
                  <div style={{ fontSize: '0.95rem', fontStyle: 'italic', fontWeight: 600, opacity: 0.95 }}>
                    DOC: {event.resource.docente}
                  </div>
                </div>
              ),
              header: ({ date }) => {
                const dia = momentPeru(date).format('dddd').toUpperCase()
                const fecha = momentPeru(date).format('DD MMM').toUpperCase()
                return (
                  <span>
                    {dia}
                    <span style={{fontSize: '1.1rem', fontWeight: 400}}>{fecha}</span>
                  </span>
                )
              }
            }}

            eventPropGetter={(event) => ({
              style: {
                backgroundColor: ESTADO_COLORES[event.resource.condicion]?.bg || '#3B82F6',
                borderRadius: '0.5rem',
                color: '#fff',
                border: `2px solid ${ESTADO_COLORES[event.resource.condicion]?.border || '#2563EB'}`,
                padding: '2px'
              }
            })}
            messages={{
              next: "Siguiente", previous: "Anterior", today: "Hoy", week: "Semana", day: "Día"
            }}
          />
)}
        </div>
      )}

   

       <ModalFichaSupervision
        show={showFichaModal}
        onClose={() => {setShowFichaModal(false); fetchVisitas(esAdmin, idSupervisorLogeado)}}
        visita={visitaSeleccionada}
      />

      <ModalConsultaVisita // <-- AGREGAR ESTE
        show={showModalConsulta}
        onClose={() => setShowModalConsulta(false)}
        visita={visitaParaConsulta}
        onAbrirFicha={(v, solo) => {setVisitaSeleccionada(v); setShowFichaModal(true)}}
        onRefresh={() => fetchVisitas(esAdmin, idSupervisorLogeado)}
      />
      <style jsx global>{`
        /* HEADER AZUL */
       .rbc-toolbar {
          background: #004AAD;
          color: #fff;
          padding: 1rem;
          border-radius: 0.8rem 0.8rem 0 0;
          margin-bottom: 0;
        }
       .rbc-toolbar button { color: #fff; border: 1px solid rgba(255,255,255,0.5); }
       .rbc-toolbar button.rbc-active { background: #fff; color: #004AAD; }

        /* HEADER DIAS - CON NEGRITA */
       .rbc-header {
          background: #004AAD;
          color: #fff;
          padding: 1rem 0.5rem;
          font-weight: 800; /* NUEVO: NEGRITA FUERTE */
          font-size: 1.4rem;
          text-align: center;
          height: 5.5rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          line-height: 1.4;
          text-transform: uppercase;
          border-bottom: 2px solid #2563EB;
        }
           /* Forzar que el header muestre 2 lineas */
        .rbc-header span {
          display: block;
        }
       .rbc-header span:last-child {
          font-size: 1.2rem;
          font-weight: 600; /* La fecha un poco menos negrita */
        }

        /* COLUMNA HORA - AZUL + TITULO "HORA" */
       .rbc-time-header-gutter {
          background: #004AAD !important; /* AZUL IGUAL QUE HEADER */
          color: #fff !important;
          font-weight: 800;
          font-size: 1.4rem;
          text-transform: uppercase;
          display: flex !important;
          align-items: center;
          justify-content: center;
        }
       .rbc-time-header-gutter::before {
          content: "HORA"; /* NUEVO: LE PONE EL TEXTO */
        }
       .rbc-time-gutter {
          background: #EFF6FF; /* Fondo clarito */
        }
       .rbc-time-gutter .rbc-label {
          color: #004AAD; /* Texto azul oscuro */
          font-weight: 700; /* NEGRITA */
          font-size: 1.2rem;
          padding-right: 1rem;
          text-align: right;
        }

        /* OCULTAR ALLDAY */
       .rbc-allday-cell { display: none !important; }

        /* BORDES */
       .rbc-month-view, .rbc-time-view { border: 1px solid #DBEAFE; border-radius: 0 0 0.8rem 0.8rem; }
      `}</style>
    </div>
    
  )
  
}