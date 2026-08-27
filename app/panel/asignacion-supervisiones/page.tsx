'use client'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { Calendar, momentLocalizer, Views } from 'react-big-calendar'
import moment from 'moment'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { createClient } from '@/lib/client'
import { Check, X, UserCheck, Hospital } from 'lucide-react'
import Select from 'react-select'

moment.locale('es') 
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
        menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
        menuPosition="fixed"
        styles={{ 
          control: (base, state) => ({...base, height: '4.4rem', minHeight: '4.4rem', borderRadius: '0.6rem', border: '1px solid #cbd5e1', background: '#fff', boxShadow: state.isFocused? '0 0 0 1px var(--color-primario)' : 'none', marginTop: '0.4rem', cursor: 'pointer' }), 
          valueContainer: (base) => ({...base, padding: '0 1.2rem', height: '4.4rem' }), 
          input: (base) => ({...base, margin: 0, padding: 0 }), 
          indicatorsContainer: (base) => ({...base, height: '4.4rem' }), 
          
          // <-- CAMBIA ESTO
          menu: (base) => ({...base, zIndex: 9999, marginTop: '0.4rem' }), 
          
          menuList: (base) => ({...base, maxHeight: '200px'}), 
          option: (base, state) => ({...base, whiteSpace: 'normal', wordWrap: 'break-word', backgroundColor: state.isSelected? 'var(--color-primario)' : state.isFocused? 'var(--color-acento)' : '#fff', color: state.isSelected? '#fff' : 'var(--color-texto)', padding: '0.6rem 1rem',fontSize: '1.3rem' })
        }}
      />
    </fieldset>
  )
}

const CustomHeader = ({ label, date }: any) => {
  const diaIndex = date.getDay();
  const dias = ['DOMINGO','LUNES','MARTES','MIERCOLES','JUEVES','VIERNES','SABADO'];
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
      <div style={{ fontSize: '1.4rem', fontWeight: 700, lineHeight: '1.6rem' }}>{dias[diaIndex]}</div>
      <div style={{ fontSize: '1.1rem', fontWeight: 400, opacity: 0.9, lineHeight: '1.4rem' }}>{label}</div>
    </div>
  );
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

// const fetchDataHorario = async () => {
//     setLoading(true)
    
//     // 1. JALO CAMPOC + CARGA + DOCENTE
//     const { data: ccData, error: err1 } = await supabase.from('campoclinico').select(`
//         idcampocli, idpa, idfilial, ideps, iddocente,
//         cargaacademica(idcargaacad, nrc, idasignatura, asignatura!inner(nombre)),
//         docente!inner(persona!inner(dni, apellidos, nombres)), 
//         eps(ideps, razonsocial),
//         filial(nombrefilial)
//       `).eq('estado', 'ACTIVO')
//     if(err1) console.log("ERR CAMPOC:", err1)

//     // 2. JALO HORARIO ACADEMICO: horario -> detallehorario
//     const { data: horarioData, error: err2 } = await supabase.from('horario').select(`
//         idhorario, idcargaacad,
//         detallehorario!inner(iddh, dia_semana, hora_inicio, hora_fin, estado)
//       `)
//     if(err2) console.log("ERR HORARIO:", err2)

//     // 3. JALO ASIGNACIONES
//     const { data: asigData, error: err3 } = await supabase.from('asignacionsupervision').select(`
//         idasignacions, iddh, estado, idsupervisor,
//         supervisor(persona(apellidos, nombres))
//       `)
//     if(err3) console.log("ERR ASIG:", err3)

//     if(!ccData || !horarioData){
//       setDataRaw([])
//       setLoading(false)
//       return
//     } 

// // CRUCE EN JS
//     const dataAplanada: any[] = []
//     const idsVistos = new Set<number>() // <-- CLAVE NUEVA

//     horarioData.forEach(h => {
//       h.detallehorario?.forEach((dh:any) => {
//         if(dh.estado !== 'INACTIVO'){
//           // SI YA VI ESTE IDDH, LO IGNORO
//           if(idsVistos.has(dh.iddh)) return; 
//           idsVistos.add(dh.iddh);

//           const carga = ccData.flatMap(cc => cc.cargaacademica).find(c => c.idcargaacad === h.idcargaacad)
//           const cc = ccData.find(c => c.cargaacademica?.some(ca => ca.idcargaacad === h.idcargaacad))
          
//           if(cc && carga){
//             const asign = asigData?.filter(a => a.iddh === dh.iddh) || []
//             dataAplanada.push({
//               iddh: dh.iddh,
//               dia_semana: dh.dia_semana,
//               hora_inicio: dh.hora_inicio,
//               hora_fin: dh.hora_fin,
//               campoclinico: cc,
//               cargaacademica: carga,
//               asignacionsupervision: asign
//             })
//           }
//         }
//       })
//     })
    
//     console.log("DATA APLANADA FINAL:", dataAplanada, "TOTAL UNICOS:", dataAplanada.length)
//     setDataRaw(dataAplanada)
//     setLoading(false)
//   }

const fetchDataHorario = async () => {
    setLoading(true)
    const { data: ccData, error: err1 } = await supabase.from('campoclinico').select(`
        idcampocli, idpa, idfilial, ideps, iddocente,
        cargaacademica(idcargaacad, nrc, idasignatura, asignatura!inner(nombre)),
        docente!inner(persona!inner(dni, apellidos, nombres)), 
        eps(ideps, razonsocial),
        filial(nombrefilial)
      `).eq('estado', 'ACTIVO')
    if(err1) console.log("ERR CAMPOC:", err1)

    const { data: horarioData, error: err2 } = await supabase.from('horario').select(`
        idhorario, idcargaacad,
        detallehorario!inner(iddh, dia_semana, hora_inicio, hora_fin, estado)
      `)
    if(err2) console.log("ERR HORARIO:", err2)

    const { data: asigData, error: err3 } = await supabase.from('asignacionsupervision').select(`
        idasignacions, iddh, estado, idsupervisor,
        supervisor(persona(apellidos, nombres))
      `)
    if(err3) console.log("ERR ASIG:", err3)

    if(!ccData || !horarioData){ setDataRaw([]); setLoading(false); return } 

    const dataAplanada: any[] = []
    const llavesVistas = new Set<string>() // <-- CAMBIO CLAVE

    horarioData.forEach(h => {
      h.detallehorario?.forEach((dh:any) => {
        if(dh.estado !== 'INACTIVO'){
          
          const carga = ccData.flatMap(cc => cc.cargaacademica).find(c => c.idcargaacad === h.idcargaacad)
          const cc = ccData.find(c => c.cargaacademica?.some(ca => ca.idcargaacad === h.idcargaacad))
          
          if(cc && carga){
            // LLAVE UNICA: Si ya existe esta hora para este NRC y Docente, la ignoro
            const llave = `${carga.idcargaacad}-${dh.dia_semana}-${dh.hora_inicio}-${dh.hora_fin}`;
            if(llavesVistas.has(llave)) return; 
            llavesVistas.add(llave);

            const asign = asigData?.filter(a => a.iddh === dh.iddh) || []
            dataAplanada.push({
              iddh: dh.iddh, // me quedo con el primer iddh que encuentre
              dia_semana: dh.dia_semana,
              hora_inicio: dh.hora_inicio,
              hora_fin: dh.hora_fin,
              campoclinico: cc,
              cargaacademica: carga,
              asignacionsupervision: asign
            })
          }
        }
      })
    })
    
    console.log("DATA APLANADA FINAL:", dataAplanada, "TOTAL UNICOS:", dataAplanada.length)
    setDataRaw(dataAplanada)
    setLoading(false)
  }

const dataFiltrada = useMemo(() => {
    return dataRaw.filter(d => 
      (filtroPeriodo === '' || d.campoclinico?.idpa === filtroPeriodo) &&
      (filtroFilial === '' || d.campoclinico?.idfilial === filtroFilial) &&
      (filtroEps === '' || Number(d.campoclinico?.ideps) === Number(filtroEps)) && // <-- CONVERTIR A NUMBER
      (filtroDocente === '' || d.campoclinico?.iddocente === filtroDocente)
    )
  }, [dataRaw, filtroPeriodo, filtroFilial, filtroEps, filtroDocente])

 // 1. PERIODO: Solo los que tienen campoclinico
const opcionesPeriodo = useMemo(() => {
    const ids = [...new Set(dataRaw.map(d => Number(d.campoclinico?.idpa)).filter(Boolean))]
    return [{value: '', label: 'Todos'}, ...periodos.filter(p => ids.includes(Number(p.idpa))).map(p => ({value: Number(p.idpa), label: p.codigo || p.nombre}))]
  }, [dataRaw, periodos])

  // 2. FILIAL: Depende de Periodo
  const opcionesFilial = useMemo(() => {
    let data = filtroPeriodo === '' ? dataRaw : dataRaw.filter(d => Number(d.campoclinico?.idpa) === Number(filtroPeriodo))
    const ids = [...new Set(data.map(d => Number(d.campoclinico?.idfilial)).filter(Boolean))]
    return [{value: '', label: 'Todas'},...filiales.filter(f => ids.includes(Number(f.idfilial))).map(f => ({value: Number(f.idfilial), label:f.nombrefilial}))]
  }, [dataRaw, filiales, filtroPeriodo])

  // 3. EPS: Depende de Periodo + Filial. SOLUCIÓN RAÍZ: Leer del objeto eps del join
  const opcionesEps = useMemo(() => {
    let data = dataRaw
    if(filtroPeriodo) data = data.filter(d => Number(d.campoclinico?.idpa) === Number(filtroPeriodo))
    if(filtroFilial) data = data.filter(d => Number(d.campoclinico?.idfilial) === Number(filtroFilial))
    
    // <-- CLAVE: No cruzo con tabla eps. Uso el objeto que ya viene
    const epsMap = new Map()
    data.forEach(d => {
      if(d.campoclinico?.eps?.ideps) {
        epsMap.set(Number(d.campoclinico.eps.ideps), d.campoclinico.eps.razonsocial)
      }
    })
    
    return [{value: '', label: 'Todas'}, ...Array.from(epsMap.entries()).map(([value, label]) => ({value, label}))]
  }, [dataRaw, filtroPeriodo, filtroFilial])

  // 4. DOCENTE: Depende de Periodo + Filial + EPS
  const opcionesDocente = useMemo(() => {
    let data = dataRaw
    if(filtroPeriodo) data = data.filter(d => Number(d.campoclinico?.idpa) === Number(filtroPeriodo))
    if(filtroFilial) data = data.filter(d => Number(d.campoclinico?.idfilial) === Number(filtroFilial))
    if(filtroEps !== '') data = data.filter(d => Number(d.campoclinico?.ideps) === Number(filtroEps))
    
    const ids = [...new Set(data.map(d => Number(d.campoclinico?.iddocente)).filter(Boolean))]
    return [{value: '', label: 'Todos'},...docentes.filter(d => ids.includes(Number(d.iddocente))).map(d => ({value: Number(d.iddocente), label:`${d.persona?.apellidos}, ${d.persona?.nombres}`}))]
  }, [dataRaw, docentes, filtroPeriodo, filtroFilial, filtroEps])

  const opcionesSupervisor = useMemo(() => supervisores.map(s=>({value:s.idsupervisor, label:`${s.persona?.dni} - ${s.persona?.apellidos}, ${s.persona?.nombres}`})), [supervisores])

//   useEffect(() => {
//     console.log("DATA FILTRADA:", dataFiltrada)
//     const dias = { 'LUNES':1,'MARTES':2,'MIERCOLES':3,'JUEVES':4,'VIERNES':5,'SABADO':6 }
//     const eventosMapeados = dataFiltrada.filter(h => h.campoclinico && h.campoclinico.cargaacademica?.[0]).map((h:any) => {
//       const diaNum = dias[h.dia_semana?.toUpperCase()] || 1
//       const [hora, min] = h.hora_inicio.split(':')
//       const start = moment().day(diaNum).hour(Number(hora)).minute(Number(min)).toDate()
//       const [horaF, minF] = h.hora_fin.split(':')
//       const end = moment().day(diaNum).hour(Number(horaF)).minute(Number(minF)).toDate()
//       const asign = h.asignacionsupervision?.[0]      
//       const supNombre = asign?.supervisor?.persona ? `${asign.supervisor.persona.apellidos}` : 'Sin Asignar'
//       //const carga = h.campoclinico.cargaacademica[0]
//       const carga = h.cargaacademica
//       const epsNombre = h.campoclinico.eps?.razonsocial || 'Sin EPS' // <-- NUEVO      
//       return { 
//   id: h.iddh,
//   //h.idhorariod, 

//   start, 
//   end,   
//   title: `${carga?.asignatura?.nombre} - NRC:${carga?.nrc}\nEPS: ${epsNombre}\nDoc: ${h.campoclinico.docente.persona.apellidos}\nSup: ${supNombre}`, // <-- Mas compacto
//   resource: {...h, asignacion: asign }
// }
//     })
//     setEventos(eventosMapeados)
//   }, [dataFiltrada])

useEffect(() => {
    console.log("DATA FILTRADA:", dataFiltrada)
    const dias = { 'LUNES':1,'MARTES':2,'MIERCOLES':3,'JUEVES':4,'VIERNES':5,'SABADO':6 }
    
    // 1. MAPEO NORMAL
    const eventosTemp = dataFiltrada
     .filter(h => h.cargaacademica) // ya no es array
     .map((h:any) => {
        const diaNum = dias[h.dia_semana?.toUpperCase()] || 1
        const [hora, min] = h.hora_inicio.split(':')
        const start = moment().day(diaNum).hour(Number(hora)).minute(Number(min)).toDate()
        const [horaF, minF] = h.hora_fin.split(':')
        const end = moment().day(diaNum).hour(Number(horaF)).minute(Number(minF)).toDate()
        const asign = h.asignacionsupervision?.[0] 
        const supNombre = asign?.supervisor?.persona? `${asign.supervisor.persona.apellidos}` : 'Sin Asignar'
        const carga = h.cargaacademica // AHORA ES OBJETO, NO ARRAY
        const epsNombre = h.campoclinico.eps?.razonsocial || 'Sin EPS'
        
        return { 
          id: h.iddh, // CLAVE PARA DEDUPLICAR
          start, 
          end, 
          title: `${carga?.asignatura?.nombre} - NRC:${carga?.nrc}\nEPS: ${epsNombre}\nDoc: ${h.campoclinico.docente.persona.apellidos}\nSup: ${supNombre}`,
          resource: {...h, asignacion: asign }
        }
      })

    // 2. DEDUPLICAR: Solo deja 1 evento por iddh
    const eventosUnicos = Array.from(
      new Map(eventosTemp.map(e => [e.id, e])).values()
    )

    setEventos(eventosUnicos)
  }, [dataFiltrada])

  const handleSelectEvent = (event: any) => { setCeldaSeleccionada(event.resource); setFormAsignar({ idsupervisor: event.resource.asignacion?.idsupervisor || null }); setShowAsignarModal(true) }
 // const eventPropGetter = (event: any) => { const estado = event.resource.asignacion?.estado || null; const color = ESTADO_COLORES[estado]; return { style: { backgroundColor: color.bg, border: `1px solid ${color.border}`, color: color.text, fontSize: '1.1rem' }}}
 const eventPropGetter = (event: any) => {
  const estado = event.resource.asignacion?.estado || null;
  const color = ESTADO_COLORES[estado];
  return { style: { backgroundColor: color.bg, border: `2px solid ${color.border}`, color: color.text, fontSize: '1.1rem', fontWeight: '600', padding: '0.2rem' }}
}
  
  const handleAsignar = async () => {
    if(!formAsignar.idsupervisor ||!celdaSeleccionada) return alert("Seleccione un supervisor");
    const { error } = await supabase.from('asignacionsupervision').upsert({
      //iddh: celdaSeleccionada.idhorariod,
      iddh: celdaSeleccionada.iddh,
      idsupervisor: Number(formAsignar.idsupervisor), // <-- Force number
      estado: 'PROGRAMADO'
    }, { onConflict: 'iddh' });

    if(error) alert(error.message);
    else { setShowAsignarModal(false); fetchDataHorario() }
  }

  return (
    <div className="main-content">
      <h1 style={{display: 'flex', alignItems: 'center', gap: '1rem'}}><Hospital size={24}/> Matriz de Asignación de Supervisión</h1>
      <div className="card-sgpc" style={{ padding: '2rem', marginBottom: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(22rem, 1fr))', gap: '1.2rem', alignItems: 'end' }}>

  <SelectSGPCFieldset label="Periodo Académico" options={opcionesPeriodo} value={filtroPeriodo} onChange={(val) => {setFiltroPeriodo(val); setFiltroFilial(''); setFiltroEps(''); setFiltroDocente('')}} disabled={loading}/>
  <SelectSGPCFieldset label="Filial" options={opcionesFilial} value={filtroFilial} onChange={(val) => {setFiltroFilial(val); setFiltroEps(''); setFiltroDocente('')}} disabled={!filtroPeriodo}/>
  <SelectSGPCFieldset label="EPS" options={opcionesEps} value={filtroEps} onChange={(val) => {setFiltroEps(val); setFiltroDocente('')}} disabled={!filtroFilial}/>
  <SelectSGPCFieldset label="Docente" options={opcionesDocente} value={filtroDocente} onChange={(val) => setFiltroDocente(val)} disabled={!filtroEps}/>

  {/* BOTON LIMPIAR NUEVO */}
  <button
    className="btn-secundario"
    style={{height: '4.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'}}
    onClick={() => {setFiltroPeriodo(''); setFiltroFilial(''); setFiltroEps(''); setFiltroDocente('')}}
  >
    <X size={16}/> Limpiar
  </button>
</div>
{/* LEYENDA + CONTADOR */}
<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem'}}>
  <div style={{display: 'flex', gap: '1.5rem', fontSize: '1.2rem'}}>
    {Object.entries(ESTADO_COLORES).map(([key, val]) => (
      <div key={key} style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
        <div style={{width: '1.6rem', height: '1.6rem', background: val.bg, border: `1px solid ${val.border}`, borderRadius: '0.3rem'}}></div>
        <span>{key === 'null'? 'SIN ASIGNAR' : key}</span>
      </div>
    ))}
  </div>
  <div style={{fontSize: '1.3rem', fontWeight: 'bold'}}>
    Total Horas: {eventos.length} | Asignados: {eventos.filter(e => e.resource.asignacion).length}
  </div>
</div>
      <div className="card-sgpc" style={{ height: '70vh', padding: '1rem' }}>
        {!filtroFilial? <p style={{textAlign:'center', paddingTop:'5rem'}}>Seleccione Periodo, Filial y EPS para ver el horario</p> : loading? <p style={{textAlign:'center', paddingTop:'5rem'}}>Cargando matriz...</p> :         
<Calendar 
  localizer={localizer} 
  events={eventos} 
  startAccessor="start" 
  endAccessor="end" 
  views={[Views.WEEK]} 
  defaultView={Views.WEEK} 
  step={60} 
  timeslots={1} 
  
  min={new Date(2025, 1, 0, 7, 0, 0)} 
  max={new Date(2025, 1, 0, 21, 0, 0)} 
  onSelectEvent={handleSelectEvent} 
  eventPropGetter={eventPropGetter} 
  
  allDayMaxRows={0}
  showAllEvents={false}

  formats={{ // <-- NUEVO: QUITA LA HORA DENTRO DEL BLOQUE
    timeGutterFormat: 'HH:mm',
    eventTimeRangeFormat: () => ''
  }}

  components={{
  week: {
    header: CustomHeader,
    allDayHeader: () => null, 
    event: ({ event }) => ( 
        <div style={{whiteSpace: 'pre-line', fontSize: '1rem', lineHeight: '1.3'}}>
          {event.title}
        </div>)
  },
  timeGutterHeader: () => <div>Hora</div>
}}
  
  messages={{ week: 'Semana', today: 'Hoy', previous: 'Ant', next: 'Sig' }} 
/>
        }
      </div>
      {showAsignarModal && ( <div className="modal-overlay" onClick={() => setShowAsignarModal(false)}> <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{maxWidth: '50rem'}}> <div className="modal-header"><h2 style={{display: 'flex', alignItems: 'center', gap: '0.8rem'}}><UserCheck size={20}/>Asignar Supervisor</h2><button onClick={()=>setShowAsignarModal(false)} className="btn-cerrar-modal"><X/></button></div> <div className="modal-body"> <p><b>Docente:</b> {celdaSeleccionada?.campoclinico?.docente?.persona?.apellidos}</p> <p><b>Asignatura:</b> {celdaSeleccionada?.campoclinico?.cargaacademica[0]?.asignatura?.nombre}</p> <p><b>Día/Hora:</b> {celdaSeleccionada?.dia_semana} {celdaSeleccionada?.hora_inicio} - {celdaSeleccionada?.hora_fin}</p> <SelectSGPCFieldset label="Supervisor" options={opcionesSupervisor} value={formAsignar.idsupervisor} onChange={(val) => setFormAsignar({idsupervisor: val})} /> </div> <div className="modal-footer"><button className="btn-primario" onClick={handleAsignar} disabled={!formAsignar.idsupervisor}><Check/> Guardar</button></div> </div> </div> )}
<style jsx global>{`

/* 0. MATAR FILA CELESTE */
.rbc-allday-cell,
.rbc-row-bg {
  display: none!important;
}

/* 1. FORZAR QUE HEADER Y BODY MIDAN IGUAL */
.rbc-time-header.rbc-overflowing {
  margin-right: 0!important; /* QUITA EL -1PX QUE METE RBC */
  border-bottom: none!important;
}

/* 2. ANCHO FIJO PARA COLUMNA HORA EN AMBOS LADOS */
.rbc-time-header-gutter,
.rbc-time-gutter {
  width: 60px!important;
  min-width: 60px!important;
  max-width: 60px!important;
  flex: 0 0 60px!important;
}

/* 3. QUE EL CONTENIDO DEL HEADER Y BODY SE REPARTA IGUAL */
.rbc-time-header-content,
.rbc-time-content > div:last-child { /* el contenedor de los días */
  width: calc(100% - 60px)!important;
  display: flex!important;
}

/* 4. CADA COLUMNA DE DIA MIDE IGUAL: 1/7 */
.rbc-header,
.rbc-day-bg {
  flex: 1 1 0%!important;
  width: auto!important;
}

/* 5. CABECERA AZUL */

.rbc-header {
  background: var(--color-primario, #004AAD)!important;
  color: #fff!important;
  border: 1px solid #003A8C!important;
  border-left: none!important;
  height: 6rem!important;
  padding: 0!important;
  display: flex!important;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
.rbc-time-header-gutter {
  background: var(--color-primario, #004AAD)!important;
  color: #fff!important;
  font-weight: 700;
  font-size: 1.4rem;
  border: 1px solid #003A8C!important;
  height: 6rem!important;
  text-align: center!important;
  line-height: 6rem;
  
}

/* 6. FILAS */
.rbc-timeslot-group {
  //border-bottom: 1px solid #e2e8f0!important;
  //min-height: 6rem!important;
  //height: 6rem!important;
  
  min-height: 6rem!important;
}
.rbc-time-gutter.rbc-timeslot-group {
  display: flex!important;
  align-items: center!important;
  justify-content: center!important;
  line-height: normal!important;
//line-height: 6rem;
  text-align: center;
  
}

/* 7. HOY */
.rbc-header.rbc-today {
  box-shadow: inset 0 -4px 0 0 #FDB813!important;
}
  .rbc-toolbar-label {
  text-transform: uppercase!important;
  font-weight: 700;
  letter-spacing: 1px;
}

.rbc-time-gutter .rbc-label {
  display: flex!important;
  align-items: center!important;
  justify-content: center!important;
  height: 100%!important;
  width: 100%!important;
  font-weight: 600;
  color: var(--color-primario, #004AAD);
}

.rbc-event-content {
  white-space: pre-line !important;
}
.rbc-event {
  padding: 2px 4px !important;
}

`}</style>
    </div>
  )
}