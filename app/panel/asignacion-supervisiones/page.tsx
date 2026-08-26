'use client'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { Calendar, momentLocalizer, Views } from 'react-big-calendar'
import moment from 'moment'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { createClient } from '@/lib/client'
import { Check, X, UserCheck, Hospital } from 'lucide-react'
import Select from 'react-select'

const localizer = momentLocalizer(moment)
const ESTADO_COLORES: any = { null: { bg: '#fff', border: '#cbd5e1', text: '#000' }, 'PROGRAMADO': { bg: '#3B82F6', border: '#2563EB', text: '#fff' }, 'EN_PROCESO': { bg: '#F59E0B', border: '#D97706', text: '#fff' }, 'SUPERVISADO': { bg: '#22C55E', border: '#16A34A', text: '#fff' } }

const SelectSGPCFieldset = ({label, value, onChange, options, disabled}:any) => {
  const selectedOption = options.find((o:any) => o.value === value) || null
  return (
    <fieldset className="fieldset-sgpc">
      <legend>{label}</legend>
      <Select
        options={options}
        value={selectedOption}
        onChange={(opt:any) => onChange(opt?.value?? '')}
        placeholder="Seleccione..."
        isSearchable
        isDisabled={disabled}
        maxMenuHeight={200}
        classNamePrefix="react-select"
        styles={{ control: (base, state) => ({...base, height: '4.4rem', minHeight: '4.4rem', borderRadius: '0.6rem', border: '1px solid #cbd5e1', background: '#fff', boxShadow: state.isFocused? '0 0 0 1px var(--color-primario)' : 'none', marginTop: '0.4rem', cursor: 'pointer' }), valueContainer: (base) => ({...base, padding: '0 1.2rem', height: '4.4rem' }), input: (base) => ({...base, margin: 0, padding: 0 }), indicatorsContainer: (base) => ({...base, height: '4.4rem' }), menu: (base) => ({...base, zIndex: 9999, marginTop: '0.4rem' }), menuList: (base) => ({...base, maxHeight: '200px'}), option: (base, state) => ({...base, whiteSpace: 'normal', wordWrap: 'break-word', backgroundColor: state.isSelected? 'var(--color-primario)' : state.isFocused? 'var(--color-acento)' : '#fff', color: state.isSelected? '#fff' : 'var(--color-texto)', padding: '1rem 1.2rem' })}}
      />
    </fieldset>
  )
}

export default function MatrizSupervisionPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [dataRaw, setDataRaw] = useState<any[]>([])

  const [periodos, setPeriodos] = useState<any[]>([])
  const [filiales, setFiliales] = useState<any[]>([])
  const [eps, setEps] = useState<any[]>([])
  const [docentes, setDocentes] = useState<any[]>([])
  const [supervisores, setSupervisores] = useState<any[]>([])

  const [filtroPeriodo, setFiltroPeriodo] = useState<number | ''>('')
  const [filtroFilial, setFiltroFilial] = useState<number | ''>('')
  const [filtroEps, setFiltroEps] = useState<number | ''>('')
  const [filtroDocente, setFiltroDocente] = useState<number | ''>('')

  const [eventos, setEventos] = useState<any[]>([])
  const [showAsignarModal, setShowAsignarModal] = useState(false)
  const [celdaSeleccionada, setCeldaSeleccionada] = useState<any>(null)
  const [formAsignar, setFormAsignar] = useState({ idsupervisor: null as number | null })

  useEffect(() => { fetchDataMaestra() }, [])

  const fetchDataMaestra = async () => {
    setLoading(true)
    const [per, fil, eps, sup, doc] = await Promise.all([
      supabase.from('periodoacademico').select('*').order('idpa', {ascending: false}),
      supabase.from('filial').select('*'),
      supabase.from('eps').select('*').eq('estado', 'ACTIVO'),
      supabase.from('supervisor').select('*, persona(*)').eq('estado', 'ACTIVO'),
      supabase.from('docente').select('*, persona(*), profesion(*)').eq('estado', 'ACTIVO'),
    ])
    setPeriodos(per.data || [])
    setFiliales(fil.data || [])
    setEps(eps.data || [])
    setSupervisores(sup.data || [])
    setDocentes(doc.data || [])
    await fetchDataHorario()
  }

const fetchDataHorario = async () => {
    setLoading(true)
    
    // 1. JALO CAMPOC CON CARGA
    const { data: ccData } = await supabase.from('campoclinico').select(`
        idcampocli, idpa, idfilial, ideps, iddocente,
        cargaacademica(idcargaacad, nrc, idasignatura, asignatura!inner(nombre)),
        docente!inner(persona!inner(dni, apellidos, nombres)),        
        eps(ideps, razonsocial),
        filial(nombrefilial)
      `).eq('estado', 'ACTIVO')

    // 2. JALO HORARIO SOLO
    const { data: hData } = await supabase.from('horariodocente').select(`
        idhorariod, idcampocli, dia_semana, hora_inicio, hora_fin
      `)

    // 3. JALO ASIGNACIONES SOLO
    // const { data: asigData } = await supabase.from('asignacionsupervision').select(`
    //     idasignacions, iddh, estado, idsupervisor,
    //     supervisor!inner(persona!inner(apellidos, nombres))
    //   `)
    const { data: asigData } = await supabase.from('asignacionsupervision').select(`
        idasignacions, iddh, estado, idsupervisor
      `)
 // 4. JALO SUPERVISORES PARA CRUZAR NOMBRES
    const { data: supData } = await supabase.from('supervisor').select(`
        idsupervisor,
        persona!inner(apellidos, nombres)
      `)

    console.log("DATA CAMPOC:", ccData)
    console.log("DATA HORARIO:", hData)
    console.log("DATA ASIG:", asigData)

    if(!ccData ||!hData){
      setDataRaw([])
    } else {
      // const dataAplanada = hData.map(h => {
      //   const cc = ccData.find(c => c.idcampocli === h.idcampocli)
      //   if(!cc || cc.cargaacademica.length === 0) return null;
        
      //   const asign = asigData?.filter(a => a.iddh === h.idhorariod) || [] // <-- CRUCE MANUAL

      //   return {
      //     idhorariod: h.idhorariod,
      //     dia_semana: h.dia_semana,
      //     hora_inicio: h.hora_inicio,
      //     hora_fin: h.hora_fin,
      //     campoclinico: cc,
      //     asignacionsupervision: asign // <-- YA NO DEPENDE DEL JOIN
      //   }
      // }).filter(Boolean)
const dataAplanada = hData.map(h => {
        const cc = ccData.find(c => c.idcampocli === h.idcampocli)
        if(!cc || cc.cargaacademica.length === 0) return null;
        
        const asignRaw = asigData?.filter(a => a.iddh === h.idhorariod) || []
        // LE PEGO EL NOMBRE DEL SUPERVISOR MANUAL
        const asign = asignRaw.map(a => ({
          ...a,
          supervisor: { persona: supData?.find(s => s.idsupervisor === a.idsupervisor)?.persona }
        }))

        return {
          idhorariod: h.idhorariod,
          dia_semana: h.dia_semana,
          hora_inicio: h.hora_inicio,
          hora_fin: h.hora_fin,
          campoclinico: cc,
          asignacionsupervision: asign
        }
      }).filter(Boolean)
      setDataRaw(dataAplanada)
    }
    setLoading(false)
  }

 // SOLO 1 VEZ CADA UNO

// const dataFiltrada = useMemo(() => {
//     return dataRaw.filter(d => 
//       (filtroPeriodo === '' || d.campoclinico?.idpa === filtroPeriodo) &&
//       (filtroFilial === '' || d.campoclinico?.idfilial === filtroFilial) &&
//       (filtroEps === '' || 
//        (filtroEps === 'NULL' && !d.campoclinico?.ideps) || // <-- SI ELIGE SIN EPS
//        d.campoclinico?.ideps === filtroEps) &&
//       (filtroDocente === '' || d.campoclinico?.iddocente === filtroDocente)
//     )
//   }, [dataRaw, filtroPeriodo, filtroFilial, filtroEps, filtroDocente])
const dataFiltrada = useMemo(() => {
    return dataRaw.filter(d => 
      (filtroPeriodo === '' || d.campoclinico?.idpa === filtroPeriodo) &&
      (filtroFilial === '' || d.campoclinico?.idfilial === filtroFilial) &&
      (filtroEps === '' || Number(d.campoclinico?.ideps) === Number(filtroEps)) && // <-- CONVERTIR A NUMBER
      (filtroDocente === '' || d.campoclinico?.iddocente === filtroDocente)
    )
  }, [dataRaw, filtroPeriodo, filtroFilial, filtroEps, filtroDocente])

 const opcionesPeriodo = useMemo(() => {
    const ids = [...new Set(dataRaw.map(d => d.campoclinico?.idpa).filter(Boolean))]
    return periodos.filter(p => ids.includes(p.idpa)).map(p => ({value:p.idpa, label: p.codigo || p.nombre}))
  }, [dataRaw, periodos])

  const opcionesFilial = useMemo(() => {
    const data = filtroPeriodo === ''? dataRaw : dataRaw.filter(d => d.campoclinico?.idpa === filtroPeriodo)
    const ids = [...new Set(data.map(d => d.campoclinico?.idfilial).filter(Boolean))]
    return [{value: '', label: 'Todas'},...filiales.filter(f => ids.includes(f.idfilial)).map(f => ({value:f.idfilial, label:f.nombrefilial}))]
  }, [dataRaw, filiales, filtroPeriodo])


  // const opcionesEps = useMemo(() => {
  //   let data = dataRaw
  //   if(filtroPeriodo) data = data.filter(d => d.campoclinico?.idpa === filtroPeriodo)
  //   if(filtroFilial) data = data.filter(d => d.campoclinico?.idfilial === filtroFilial)
    
  //   const ids = [...new Set(data.map(d => d.campoclinico?.ideps).filter(id => id!== null && id!== undefined))]
    
  //   return [
  //     {value: '', label: 'Todas'},
  //    ...eps.filter(e => ids.includes(e.ideps)).map(e => ({value:e.ideps, label:e.razonsocial}))
  //   ]
  // }, [dataRaw, eps, filtroPeriodo, filtroFilial])

  const opcionesEps = useMemo(() => {
    let data = dataRaw
    if(filtroPeriodo) data = data.filter(d => d.campoclinico?.idpa === filtroPeriodo)
    if(filtroFilial) data = data.filter(d => d.campoclinico?.idfilial === filtroFilial)
    
    const ids = [...new Set(data.map(d => d.campoclinico?.ideps).filter(id => id !== null && id !== undefined))]
    
    console.log("IDS EPS ENCONTRADOS:", ids) // <-- AGREGA ESTO PARA DEBUG
    console.log("EPS TOTALES:", eps) // <-- AGREGA ESTO PARA DEBUG

    return [
      {value: '', label: 'Todas'},
     ...eps.filter(e => ids.includes(e.ideps)).map(e => ({value: Number(e.ideps), label:e.razonsocial})) // <-- FORCE A NUMBER
    ]
  }, [dataRaw, eps, filtroPeriodo, filtroFilial])

  const opcionesDocente = useMemo(() => {
    let data = dataRaw
    if(filtroPeriodo) data = data.filter(d => d.campoclinico?.idpa === filtroPeriodo)
    if(filtroFilial) data = data.filter(d => d.campoclinico?.idfilial === filtroFilial)
    if(filtroEps) data = data.filter(d => d.campoclinico?.ideps === filtroEps)
    const ids = [...new Set(data.map(d => d.campoclinico?.iddocente).filter(Boolean))]
    return [{value: '', label: 'Todos'},...docentes.filter(d => ids.includes(d.iddocente)).map(d => ({value:d.iddocente, label:`${d.persona?.apellidos}, ${d.persona?.nombres}`}))]
  }, [dataRaw, docentes, filtroPeriodo, filtroFilial, filtroEps])

  const opcionesSupervisor = useMemo(() => supervisores.map(s=>({value:s.idsupervisor, label:`${s.persona?.dni} - ${s.persona?.apellidos}, ${s.persona?.nombres}`})), [supervisores])

  useEffect(() => {
    console.log("DATA FILTRADA:", dataFiltrada)
    const dias = { 'LUNES':1,'MARTES':2,'MIERCOLES':3,'JUEVES':4,'VIERNES':5,'SABADO':6 }
    const eventosMapeados = dataFiltrada.filter(h => h.campoclinico && h.campoclinico.cargaacademica?.[0]).map((h:any) => {
      const diaNum = dias[h.dia_semana?.toUpperCase()] || 1
      const [hora, min] = h.hora_inicio.split(':')
      const start = moment().day(diaNum).hour(Number(hora)).minute(Number(min)).toDate()
      const [horaF, minF] = h.hora_fin.split(':')
      const end = moment().day(diaNum).hour(Number(horaF)).minute(Number(minF)).toDate()
      const asign = h.asignacionsupervision?.[0]
      //const supNombre = asign?.supervisor?.persona? `${asign.supervisor.persona.apellidos}` : 'Sin Asignar'
      const carga = h.campoclinico.cargaacademica[0]
      const epsNombre = h.campoclinico.eps?.razonsocial || 'Sin EPS' // <-- NUEVO
      //const supNombre = asign.length > 0? asign[0].supervisor?.persona?.apellidos || 'Sin Asignar' : 'Sin Asignar'
      const supNombre = (asign?.length || 0) > 0? asign[0].supervisor?.persona?.apellidos || 'Sin Asignar' : 'Sin Asignar'
      //return { id: h.idhorariod, start, end, title: `${carga?.asignatura?.nombre}\nNRC:${carga?.nrc}\n${h.campoclinico.docente.persona.apellidos}\nSup: ${supNombre}`, resource: {...h, asignacion: asign }}
      return { 
  id: h.idhorariod, 
  start, 
  end, 
  title: `${carga?.asignatura?.nombre}\nNRC:${carga?.nrc}\nEPS:${epsNombre}\n${h.campoclinico.docente.persona.apellidos}\nSup: ${supNombre}`, // <-- AGREGUE EPS
  resource: {...h, asignacion: asign }
}
    })
    setEventos(eventosMapeados)
  }, [dataFiltrada])

  const handleSelectEvent = (event: any) => { setCeldaSeleccionada(event.resource); setFormAsignar({ idsupervisor: event.resource.asignacion?.idsupervisor || null }); setShowAsignarModal(true) }
  const eventPropGetter = (event: any) => { const estado = event.resource.asignacion?.estado || null; const color = ESTADO_COLORES[estado]; return { style: { backgroundColor: color.bg, border: `1px solid ${color.border}`, color: color.text, fontSize: '1.1rem' }}}

  const handleAsignar = async () => {
    if(!formAsignar.idsupervisor ||!celdaSeleccionada) return;
    const { error } = await supabase.from('asignacionsupervision').upsert({
      iddh: celdaSeleccionada.idhorariod, // <-- CORREGIDO: era iddetallehorario
      idsupervisor: formAsignar.idsupervisor,
      estado: 'PROGRAMADO'
    }, { onConflict: 'iddh' }); // <-- CORREGIDO

    if(error) alert(error.message);
    else { setShowAsignarModal(false); fetchDataHorario() }
  }

  return (
    <div className="main-content">
      <h1 style={{display: 'flex', alignItems: 'center', gap: '1rem'}}><Hospital size={24}/> Matriz de Asignación de Supervisión</h1>
      <div className="card-sgpc" style={{ padding: '2rem', marginBottom: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(22rem, 1fr))', gap: '1.2rem' }}>
        <SelectSGPCFieldset label="Periodo Académico" options={opcionesPeriodo} value={filtroPeriodo} onChange={(val) => {setFiltroPeriodo(val); setFiltroFilial(''); setFiltroEps(''); setFiltroDocente('')}} disabled={loading}/>
        <SelectSGPCFieldset label="Filial" options={opcionesFilial} value={filtroFilial} onChange={(val) => {setFiltroFilial(val); setFiltroEps(''); setFiltroDocente('')}} disabled={!filtroPeriodo}/>
        <SelectSGPCFieldset label="EPS" options={opcionesEps} value={filtroEps} onChange={(val) => {setFiltroEps(val); setFiltroDocente('')}} disabled={!filtroFilial}/>
        <SelectSGPCFieldset label="Docente" options={opcionesDocente} value={filtroDocente} onChange={(val) => setFiltroDocente(val)} disabled={!filtroEps}/>
      </div>
      <div className="card-sgpc" style={{ height: '70vh', padding: '1rem' }}>
        {!filtroFilial? <p style={{textAlign:'center', paddingTop:'5rem'}}>Seleccione Periodo, Filial y EPS para ver el horario</p> : loading? <p style={{textAlign:'center', paddingTop:'5rem'}}>Cargando matriz...</p> : <Calendar localizer={localizer} events={eventos} startAccessor="start" endAccessor="end" views={[Views.WEEK]} defaultView={Views.WEEK} step={60} timeslots={1} min={new Date(2025, 1, 0, 7, 0, 0)} max={new Date(2025, 1, 0, 21, 0, 0)} onSelectEvent={handleSelectEvent} eventPropGetter={eventPropGetter} messages={{ week: 'Semana', today: 'Hoy', previous: 'Ant', next: 'Sig' }} />}
      </div>
      {showAsignarModal && ( <div className="modal-overlay" onClick={() => setShowAsignarModal(false)}> <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{maxWidth: '50rem'}}> <div className="modal-header"><h2 style={{display: 'flex', alignItems: 'center', gap: '0.8rem'}}><UserCheck size={20}/>Asignar Supervisor</h2><button onClick={()=>setShowAsignarModal(false)} className="btn-cerrar-modal"><X/></button></div> <div className="modal-body"> <p><b>Docente:</b> {celdaSeleccionada?.campoclinico?.docente?.persona?.apellidos}</p> <p><b>Asignatura:</b> {celdaSeleccionada?.campoclinico?.cargaacademica[0]?.asignatura?.nombre}</p> <p><b>Día/Hora:</b> {celdaSeleccionada?.dia_semana} {celdaSeleccionada?.hora_inicio} - {celdaSeleccionada?.hora_fin}</p> <SelectSGPCFieldset label="Supervisor" options={opcionesSupervisor} value={formAsignar.idsupervisor} onChange={(val) => setFormAsignar({idsupervisor: val})} /> </div> <div className="modal-footer"><button className="btn-primario" onClick={handleAsignar} disabled={!formAsignar.idsupervisor}><Check/> Guardar</button></div> </div> </div> )}
    </div>
  )
}