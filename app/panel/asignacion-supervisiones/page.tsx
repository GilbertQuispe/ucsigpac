'use client'
//import { useEffect, useState, useMemo, useCallback, Fragment as ReactFragment } from 'react'
import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { Calendar, momentLocalizer, Views } from 'react-big-calendar'
import moment from 'moment'
//import moment from 'moment-timezone' // cambia el import de moment normal
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { createClient } from '@/lib/client'
//import { Check, X, UserCheck, Hospital } from 'lucide-react'
import { Check, X, UserCheck, Hospital, CalendarDays, ClipboardList, Building2, GraduationCap, User } from 'lucide-react'
import Select, { components } from 'react-select'
import toast, { Toaster } from 'react-hot-toast'

moment.locale('es') 
const localizer = momentLocalizer(moment)
const ESTADO_COLORES: any = { null: { bg: '#fff', border: '#cbd5e1', text: '#000' }, 'PROGRAMADO': { bg: '#3B82F6', border: '#2563EB', text: '#fff' }, 'EN_PROCESO': { bg: '#F59E0B', border: '#D97706', text: '#fff' }, 'SUPERVISADO': { bg: '#22C55E', border: '#16A34A', text: '#fff' } }

const SelectSGPCFieldset = ({label, value, onChange, options, disabled, isMulti = false}:any) => {
  const selectedOption = isMulti 
    ? options.filter((o:any) => value.includes(o.value))
    : options.find((o:any) => o.value === value) || null
  
  return (
    <fieldset className="fieldset-sgpc">
      <legend>{label}</legend>
      <Select
        options={options}
        value={selectedOption}
        onChange={(opt:any) => isMulti ? onChange(opt?.map((o:any) => o.value) ?? []) : onChange(opt?.value?? '')}
        placeholder="Seleccione..."
        isSearchable
        isDisabled={disabled}
        isMulti={isMulti} // <-- NUEVO
        closeMenuOnSelect={!isMulti} // <-- NUEVO: no se cierra al seleccionar
        hideSelectedOptions={false} // <-- NUEVO: para ver los checks
        maxMenuHeight={200}
        classNamePrefix="react-select"
        menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
        menuPosition="fixed"
        components={{ Option: CustomOption }} // <-- NUEVO: para pintar el checkbox
        styles={{ 
          control: (base, state) => ({...base, minHeight: '4.4rem', borderRadius: '0.6rem', border: '1px solid #cbd5e1', background: '#fff', boxShadow: state.isFocused? '0 0 0 1px var(--color-primario)' : 'none', marginTop: '0.4rem', cursor: 'pointer' }), 
          valueContainer: (base) => ({...base, padding: '0 1.2rem' }), 
          input: (base) => ({...base, margin: 0, padding: 0 }), 
          indicatorsContainer: (base) => ({...base, minHeight: '4.4rem' }), 
          menu: (base) => ({...base, zIndex: 9999, marginTop: '0.4rem' }), 
          menuList: (base) => ({...base, maxHeight: '200px'}), 
          option: (base, state) => ({...base, display: 'flex', alignItems: 'center', gap: '0.8rem', whiteSpace: 'normal', wordWrap: 'break-word', backgroundColor: state.isSelected? 'var(--color-primario)' : state.isFocused? 'var(--color-acento)' : '#fff', color: state.isSelected? '#fff' : 'var(--color-texto)', padding: '0.6rem 1rem',fontSize: '1.3rem' })
        }}
      />
    </fieldset>
  )
}

// NUEVO: Componente para pintar el checkbox
const CustomOption = (props: any) => {
  const { data, isSelected } = props;
  return (
    <components.Option {...props}>
      <input type="checkbox" checked={isSelected} readOnly style={{marginRight: '0.5rem'}} />
      {data.label}
    </components.Option>
  );
};

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
  //const [filtroDocente, setFiltroDocente] = useState<number | ''>('')
  const [filtroDocente, setFiltroDocente] = useState<number[]>([])

  const [eventos, setEventos] = useState<any[]>([])
  const [showAsignarModal, setShowAsignarModal] = useState(false)
  const [celdaSeleccionada, setCeldaSeleccionada] = useState<any>(null)
  const [formAsignar, setFormAsignar] = useState({ idsupervisor: null as number | null })

  const [showAsignarModalMasivo, setShowAsignarModalMasivo] = useState(false)

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

    

  //   const { data: asigData, error: err3 } = await supabase.from('asignacionsupervision').select(`
  //   idasignacions, iddh, estado, idsupervisor,
  //   supervisor(persona(apellidos, nombres))
  // `)
const { data: asigData, error: err3 } = await supabase.from('asignacionsupervision').select(`
    idasignacions, iddh, estado, idsupervisor,
    supervisor:idsupervisor!inner(idpersona, persona!inner(apellidos, nombres))
  `)
// NUEVO: También leer la cabecera para saber si ya está asignado el NRC


    if(err3) console.log("ERR ASIG:", err3)

      // NUEVO: Leer la cabecera para saber si el NRC ya tiene supervisor asignado
//const { data: cabeceraData, error: err4 } = await supabase.from('asignacion_nrc_supervisor').select('idcargaacad, idsupervisor, estado, supervisor(persona(apellidos, nombres))')
const { data: cabeceraData, error: err4 } = await supabase.from('asignacion_nrc_supervisor').select(`
    idasignacion_nrc, idcargaacad, idsupervisor, estado,
    supervisor:idsupervisor!inner(idpersona, persona!inner(apellidos, nombres))
  `)
if(err4) console.log("ERR CABECERA:", err4)

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

            // const asign = asigData?.filter(a => a.iddh === dh.iddh) || []
            // dataAplanada.push({
            //   iddh: dh.iddh, // me quedo con el primer iddh que encuentre
            //   dia_semana: dh.dia_semana,
            //   hora_inicio: dh.hora_inicio,
            //   hora_fin: dh.hora_fin,
            //   campoclinico: cc,
            //   cargaacademica: carga,
            //   asignacionsupervision: asign
            // })
            //const asign = asigData?.filter(a => a.iddh === dh.iddh) || []
//const cabecera = cabeceraData?.find(c => c.idcargaacad === carga.idcargaacad) // <-- NUEVO
const asign = asigData?.filter(a => Number(a.iddh) === Number(dh.iddh)) || []
const cabecera = cabeceraData?.find(c => Number(c.idcargaacad) === Number(carga.idcargaacad))

dataAplanada.push({
  iddh: dh.iddh, // me quedo con el primer iddh que encuentre
  dia_semana: dh.dia_semana,
  hora_inicio: dh.hora_inicio,
  hora_fin: dh.hora_fin,
  campoclinico: cc,
  cargaacademica: carga,
  asignacionsupervision: asign,
  cabeceraNRC: cabecera // <-- NUEVO: Para pintar si ya tiene supervisor por NRC
})
          }
        }
      })
    })
    
    console.log("DATA APLANADA FINAL:", dataAplanada, "TOTAL UNICOS:", dataAplanada.length)
    setDataRaw(dataAplanada)
    console.log("PRIMER REGISTRO:", dataAplanada[0])
    console.log("ASIG CRUDO:", asigData)
    console.log("CABECERA CRUDO:", cabeceraData)
    setLoading(false)
  }

const dataFiltrada = useMemo(() => {
  
    return dataRaw.filter(d => 
      (filtroPeriodo === '' || d.campoclinico?.idpa === filtroPeriodo) &&
      (filtroFilial === '' || d.campoclinico?.idfilial === filtroFilial) &&
      (filtroEps === '' || Number(d.campoclinico?.ideps) === Number(filtroEps)) && // <-- CONVERTIR A NUMBER
      //(filtroDocente === '' || d.campoclinico?.iddocente === filtroDocente)
      (filtroDocente.length === 0 || filtroDocente.includes(Number(d.campoclinico?.iddocente))) // <-- CAMBIO AQUI
    )
  }, [dataRaw, filtroPeriodo, filtroFilial, filtroEps, filtroDocente])

  const horasConCarga = useMemo(() => {
  if(dataFiltrada.length === 0) return []
  const setHoras = new Set<number>()

  dataFiltrada.forEach(d => {
    const hIni = Number(d.hora_inicio.split(':')[0])
    const hFin = Number(d.hora_fin.split(':')[0])
    for(let i = hIni; i <= hFin; i++) setHoras.add(i)
  })

  //return Array.from(setHoras).sort((a,b) => a-b)
const horas = Array.from(setHoras).sort((a,b) => a-b)
  const ultimaHora = horas[horas.length - 1]
  if(ultimaHora!== undefined) horas.push(ultimaHora + 1) // <-- CLAVE: agrega 1 hora más al final

  return horas

}, [dataFiltrada])

// 1. SACAR HORA MIN Y MAX REALES DE LOS DATOS
const rangoHoras = useMemo(() => {
  if(dataFiltrada.length === 0) return { min: 7, max: 22 }
  
  const horasInicio = dataFiltrada.map(d => Number(d.hora_inicio.split(':')[0]))
  const horasFin = dataFiltrada.map(d => Number(d.hora_fin.split(':')[0]))
  
  const min = Math.min(...horasInicio)
  const max = Math.max(...horasFin) + 2 // +1 para que se vea la última hora completa
  
  return { min, max }
}, [dataFiltrada])

// 2. GENERAR LOS SLOTS DE HORA DINAMICOS
const slotsHora = useMemo(() => {
  const slots = []
  for(let i = rangoHoras.min; i <= rangoHoras.max; i++){
    slots.push(`${String(i).padStart(2,'0')}:00`)
  }
  return slots
}, [rangoHoras])

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
    return [{value: '', label: 'Todos'},...docentes.filter(d => ids.includes(Number(d.iddocente))).map(d => ({value: Number(d.iddocente), label:`${d.persona?.dni} - ${d.persona?.apellidos}, ${d.persona?.nombres}`}))]
  }, [dataRaw, docentes, filtroPeriodo, filtroFilial, filtroEps])

  const opcionesSupervisor = useMemo(() => supervisores.map(s=>({value:s.idsupervisor, label:`${s.persona?.dni} - ${s.persona?.apellidos}, ${s.persona?.nombres}`})), [supervisores])

// useEffect(() => {
//     console.log("DATA FILTRADA:", dataFiltrada)
//     const dias = { 'LUNES':1,'MARTES':2,'MIERCOLES':3,'JUEVES':4,'VIERNES':5,'SABADO':6 }
    
//     // 1. MAPEO NORMAL
//     const eventosTemp = dataFiltrada
//      .filter(h => h.cargaacademica) // ya no es array
//      .map((h:any) => {
//         const diaNum = dias[h.dia_semana?.toUpperCase()] || 1
//         const [hora, min] = h.hora_inicio.split(':')
//         const start = moment().day(diaNum).hour(Number(hora)).minute(Number(min)).toDate()
//         const [horaF, minF] = h.hora_fin.split(':')
//         const end = moment().day(diaNum).hour(Number(horaF)).minute(Number(minF)).toDate()
//         // const asign = h.asignacionsupervision?.[0] 
//         const asign = h.asignacionsupervision?.[0] || h.cabeceraNRC // <-- Si no hay detalle por hora, usa la cabecera del NRC
//         //const supNombre = asign?.supervisor?.persona? `${asign.supervisor.persona.apellidos}` : 'Sin Asignar'
//         const supNombre = asign?.supervisor?.persona? `${asign.supervisor.persona.apellidos}, ${asign.supervisor.persona.nombres}` : 'Sin Asignar'
//         const carga = h.cargaacademica // AHORA ES OBJETO, NO ARRAY
//         const epsNombre = h.campoclinico.eps?.razonsocial || 'Sin EPS'
//         const rangoHora = `${h.hora_inicio} - ${h.hora_fin}`
//         return { 
//           id: h.iddh, // CLAVE PARA DEDUPLICAR
//           start, 
//           end, 
//           //title: `${rangoHora}\n${carga?.asignatura?.nombre} - NRC:${carga?.nrc}\nEPS: ${epsNombre}\nDoc: ${h.campoclinico.docente.persona.apellidos}\nSup: ${supNombre}`,
//           title: `${rangoHora}\n${carga?.asignatura?.nombre} - NRC:${carga?.nrc}\nEPS: ${epsNombre}\nDoc: ${h.campoclinico.docente.persona.dni} - ${h.campoclinico.docente.persona.apellidos}, ${h.campoclinico.docente.persona.nombres}\nSup: ${supNombre}`,
//           resource: {...h, asignacion: asign }
//         }
//       })

//     // 2. DEDUPLICAR: Solo deja 1 evento por iddh
//     const eventosUnicos = Array.from(
//       new Map(eventosTemp.map(e => [e.id, e])).values()
//     )

//     setEventos(eventosUnicos)
//   }, [dataFiltrada])

useEffect(() => {
    //const dias = { 'LUNES':1,'MARTES':2,'MIERCOLES':3,'JUEVES':4,'VIERNES':5,'SABADO':6 }
    const dias: Record<string, number> = {
  LUNES: 1,
  MARTES: 2,
  MIERCOLES: 3,
  JUEVES: 4,
  VIERNES: 5,
  SABADO: 6,
  DOMINGO: 0
}
    const eventosTemp = dataFiltrada
   .filter(h => h.cargaacademica)
   .map((h:any) => {
        const diaNum = dias[h.dia_semana?.toUpperCase()] || 1
        const [hora, min] = h.hora_inicio.split(':')
        const start = moment().day(diaNum).hour(Number(hora)).minute(Number(min)).toDate()
        const [horaF, minF] = h.hora_fin.split(':')
        const end = moment().day(diaNum).hour(Number(horaF)).minute(Number(minF)).toDate()
        
        // CLAVE: Prioriza detalle por hora, si no hay usa cabecera
        const asignDetalle = h.asignacionsupervision?.[0]
        const asignCabecera = h.cabeceraNRC
        const asign = asignDetalle || asignCabecera
        
        // NUEVO: BUSCAR NOMBRE MANUALMENTE PORQUE EL JOIN FALLA
        const supId = asign?.idsupervisor
        const supEncontrado = supervisores.find(s => Number(s.idsupervisor) === Number(supId))
        const supNombre = supEncontrado 
         ? `${supEncontrado.persona.apellidos}, ${supEncontrado.persona.nombres}` 
          : 'Sin Asignar'

        const carga = h.cargaacademica
        const epsNombre = h.campoclinico.eps?.razonsocial || 'Sin EPS'
        const rangoHora = `${h.hora_inicio} - ${h.hora_fin}`
        
        return { 
          id: h.iddh,
          start, 
          end, 
          title: `${rangoHora}\n${carga?.asignatura?.nombre} - NRC:${carga?.nrc}\nEPS: ${epsNombre}\nDoc: ${h.campoclinico.docente.persona.dni} - ${h.campoclinico.docente.persona.apellidos}, ${h.campoclinico.docente.persona.nombres}\nSup: ${supNombre}`,
          resource: {...h, asignacion: asign }
        }
      })

    const eventosUnicos = Array.from(new Map(eventosTemp.map(e => [e.id, e])).values())
    setEventos(eventosUnicos)
  }, [dataFiltrada, supervisores]) // <-- AGREGAR supervisores a las dependencias

  //const handleSelectEvent = (event: any) => { setCeldaSeleccionada(event.resource); setFormAsignar({ idsupervisor: event.resource.asignacion?.idsupervisor || null }); setShowAsignarModal(true) }
    const handleSelectEvent = (event: any) => { setCeldaSeleccionada(event.resource); setFormAsignar({ idsupervisor: event.resource.asignacion?.idsupervisor || null }); setShowAsignarModal(true) }
 // const eventPropGetter = (event: any) => { const estado = event.resource.asignacion?.estado || null; const color = ESTADO_COLORES[estado]; return { style: { backgroundColor: color.bg, border: `1px solid ${color.border}`, color: color.text, fontSize: '1.1rem' }}}
 const eventPropGetter = (event: any) => {
  const estado = event.resource.asignacion?.estado || null;
  const color = ESTADO_COLORES[estado];
  return { style: { backgroundColor: color.bg, border: `2px solid ${color.border}`, color: color.text, fontSize: '1.1rem', fontWeight: '600', padding: '0.2rem' }}
}
  
// const handleAsignar = async () => {
//   if(!formAsignar.idsupervisor ||!celdaSeleccionada) return toast.error("Seleccione un supervisor");
  
//   const idasignacion_nrc = celdaSeleccionada.cabeceraNRC?.idasignacion_nrc || null;

//   // Primero borra si existe para ese iddh
//   await supabase.from('asignacionsupervision').delete().eq('iddh', celdaSeleccionada.iddh)

//   const { data: detalle, error } = await supabase.from('asignacionsupervision').insert({
//     iddh: celdaSeleccionada.iddh,
//     idsupervisor: Number(formAsignar.idsupervisor),
//     estado: 'PROGRAMADO',
//     fechaasignacion: moment().format('YYYY-MM-DD'),
//     idasignacion_nrc: idasignacion_nrc
//   }).select().single();

//   if(error) return toast.error(error.message);

//   // Opcional: Borrar visitas viejas de esa hora y generar 1 nueva
//   await supabase.from('visitasupervision').delete().eq('iddh', celdaSeleccionada.iddh)

//   setShowAsignarModal(false); 
//   toast.success("Supervisor asignado"); 
//   fetchDataHorario()
// }

const handleAsignar = async () => {
  if(!formAsignar.idsupervisor ||!celdaSeleccionada) return toast.error("Seleccione un supervisor");
  
  const carga = celdaSeleccionada.cargaacademica;
  const idcargaacad = carga.idcargaacad;
  const idsupervisor = Number(formAsignar.idsupervisor);
  const iddh = celdaSeleccionada.iddh; // <- ESTE DEBE SER UNICO POR CARD

  // 1. CREAR/ACTUALIZAR CABECERA
  const { data: cabecera, error: errCab } = await supabase
    .from('asignacion_nrc_supervisor')
    .upsert({
      idcargaacad: idcargaacad,
      idsupervisor: idsupervisor,
      estado: 'PROGRAMADO',
      fechaasignacion: moment().format('YYYY-MM-DD'),
      created_at: moment().toISOString(), // <-- NUEVO
    }, { onConflict: 'idcargaacad' })
    .select()
    .single();

  if(errCab) return toast.error("Error Cabecera: " + errCab.message);

  // 2. BORRA SOLO EL DETALLE DE ESTE iddh. Igual que tu codigo anterior
  await supabase.from('asignacionsupervision').delete().eq('iddh', iddh)

  // 3. INSERTA DETALLE NUEVO CON CABECERA
  const { data: detalle, error } = await supabase.from('asignacionsupervision').insert({
    iddh: iddh,
    idsupervisor: idsupervisor,
    estado: 'PROGRAMADO',
    fechaasignacion: moment().format('YYYY-MM-DD'),
    idasignacion_nrc: cabecera.idasignacion_nrc // <- YA NO NULL
  }).select().single();

  if(error) return toast.error(error.message);

  // 4. BORRA VISITAS SOLO DE ESTE DETALLE
  await supabase.from('visitasupervision').delete().eq('idasignacions', detalle.idasignacions)

  // 5. GENERA VISITAS DEL PERIODO
  let cantidadVisitas = 0;
  const periodo = periodos.find(p => p.idpa === celdaSeleccionada.campoclinico.idpa)
  
  if(periodo){
    const diasMap: any = {'DOMINGO':0,'LUNES':1,'MARTES':2,'MIERCOLES':3,'JUEVES':4,'VIERNES':5,'SABADO':6}
    const diaNum = diasMap[celdaSeleccionada.dia_semana?.toUpperCase()]
    const visitasParaInsertar: any[] = []
    let fecha = moment(periodo.fecha_inicio)

    while(fecha.isSameOrBefore(periodo.fecha_fin)){
      if(fecha.day() === diaNum){
        visitasParaInsertar.push({
          idasignacions: detalle.idasignacions,
          fechavisita: fecha.format('YYYY-MM-DD'),
          horavisita: celdaSeleccionada.hora_inicio,
          horafin: celdaSeleccionada.hora_fin, // 09:24:00 <- NUEVO
          condicion: 'PROGRAMADO',
          iddh: iddh
        })
      }
      fecha.add(1, 'day')
    }
    
    if(visitasParaInsertar.length > 0){
      const { error: errVis } = await supabase.from('visitasupervision').insert(visitasParaInsertar)
      if(errVis) return toast.error("Error Visitas: " + errVis.message)
      cantidadVisitas = visitasParaInsertar.length;
    }
  }

  setShowAsignarModal(false); 
  toast.success(`Supervisor asignado: ${cantidadVisitas} visitas`); 
  fetchDataHorario()
}
// const handleAsignarMasivo = async () => {
//   if(!formAsignar.idsupervisor) return toast.error("Seleccione un supervisor");
//   if(!filtroPeriodo) return toast.error("Seleccione un periodo");

//   const periodo = periodos.find(p => p.idpa === filtroPeriodo)
//   if(!periodo) return toast.error("Periodo no encontrado")

//   const cargasUnicas = Array.from(new Map(eventos.map(e => [e.resource.cargaacademica.idcargaacad, e.resource.cargaacademica])).values())
//   if(cargasUnicas.length === 0) return toast.warning("No hay cargas para asignar")

//   // 1. INSERTAR/ACTUALIZAR EN CABECERA: asignacion_nrc_supervisor
//   const dataCabecera = cargasUnicas.map(c => ({
//     idcargaacad: c.idcargaacad,
//     idsupervisor: Number(formAsignar.idsupervisor),
//     estado: 'PROGRAMADO',
//     fechaasignacion: moment().format('YYYY-MM-DD')
//   }))

//   const { data: cabeceraInsertada, error: errCab } = await supabase
//    .from('asignacion_nrc_supervisor')
//    .upsert(dataCabecera, { onConflict: 'idcargaacad' }) // esta si tiene UNIQUE
//    .select()

//   if(errCab) return toast.error("Error Cabecera: " + errCab.message)

//   // 2. BORRAR DETALLE ANTERIOR Y CREAR NUEVO: asignacionsupervision
//   const dataDetalle = eventos.map(e => ({
//     iddh: e.resource.iddh,
//     idsupervisor: Number(formAsignar.idsupervisor),
//     estado: 'PROGRAMADO',
//     fechaasignacion: moment().format('YYYY-MM-DD'),
//     idasignacion_nrc: cabeceraInsertada.find((c:any) => c.idcargaacad === e.resource.cargaacademica.idcargaacad)?.idasignacion_nrc
//   }))

//   const iddhs = dataDetalle.map(d => d.iddh)
//   await supabase.from('asignacionsupervision').delete().in('iddh', iddhs) // <-- CLAVE: borra lo anterior

//   const { data: detalleInsertado, error: errDet } = await supabase
//    .from('asignacionsupervision')
//    .insert(dataDetalle) // <-- CLAVE: inserta lo nuevo
//    .select()

//   if(errDet) return toast.error("Error Detalle: " + errDet.message)

//   // 3. BORRAR VISITAS ANTERIORES Y GENERAR NUEVAS: visitasupervision
//   const idsDetalle = detalleInsertado.map((d:any) => d.idasignacions)
//   await supabase.from('visitasupervision').delete().in('idasignacions', idsDetalle) // <-- Borra visitas viejas

//   const diasMap: any = {'DOMINGO':0,'LUNES':1,'MARTES':2,'MIERCOLES':3,'JUEVES':4,'VIERNES':5,'SABADO':6}
//   const visitasParaInsertar: any[] = []

//   eventos.forEach(e => {
//     const detalle = detalleInsertado.find((d:any) => d.iddh === e.resource.iddh)
//     if(!detalle) return

//     const diaNum = diasMap[e.resource.dia_semana?.toUpperCase()]
//     let fecha = moment(periodo.fecha_inicio)

//     while(fecha.isSameOrBefore(periodo.fecha_fin)){
//       if(fecha.day() === diaNum){
//         visitasParaInsertar.push({
//           idasignacions: detalle.idasignacions,
//           fechavisita: fecha.format('YYYY-MM-DD'),
//           horavisita: e.resource.hora_inicio,
//           condicion: 'PROGRAMADO',
//           iddh: e.resource.iddh
//         })
//       }
//       fecha.add(1, 'day')
//     }
//   })

//   if(visitasParaInsertar.length > 0){
//     for(let i = 0; i < visitasParaInsertar.length; i += 1000){
//       const lote = visitasParaInsertar.slice(i, i + 1000)
//       const { error: errVis } = await supabase.from('visitasupervision').insert(lote)
//       if(errVis) return toast.error("Error al programar visitas: " + errVis.message)
//     }
//   }

//   setShowAsignarModalMasivo(false)
//   toast.success(`Se asignaron ${cargasUnicas.length} NRCs y se programaron ${visitasParaInsertar.length} visitas`)
//   fetchDataHorario()
// }
/* actualizado*/
const handleAsignarMasivo = async () => {
  if(!formAsignar.idsupervisor) return toast.error("Seleccione un supervisor");
  if(!filtroPeriodo) return toast.error("Seleccione un periodo");

  const periodo = periodos.find(p => p.idpa === filtroPeriodo)
  if(!periodo) return toast.error("Periodo no encontrado")

  const cargasUnicas = Array.from(new Map(eventos.map(e => [e.resource.cargaacademica.idcargaacad, e.resource.cargaacademica])).values())
  //if(cargasUnicas.length === 0) return toast.warning("No hay cargas para asignar")
  if(cargasUnicas.length === 0) return toast("No hay cargas para asignar", { icon: '⚠️' })

  const idsupervisor = Number(formAsignar.idsupervisor);
  const idcargaacadList = cargasUnicas.map(c => c.idcargaacad);

  // === CLAVE 1: VERIFICAR QUIENES YA TIEN SUPERVISOR ===
  const { data: yaAsignados, error: errCheck } = await supabase
    .from('asignacion_nrc_supervisor')
    .select('idcargaacad')
    .in('idcargaacad', idcargaacadList);

  if(errCheck) return toast.error("Error al verificar: " + errCheck.message);

  const idsYaAsignados = new Set(yaAsignados?.map(a => a.idcargaacad) || []);
  
  // Solo trabajamos con los que NO tienen supervisor
  const cargasParaAsignar = cargasUnicas.filter(c => !idsYaAsignados.has(c.idcargaacad));
  const cargasOmitidas = cargasUnicas.filter(c => idsYaAsignados.has(c.idcargaacad));

  if(cargasParaAsignar.length === 0) {
    return toast.warning(`Ningún NRC seleccionado está vacío. ${cargasOmitidas.length} ya tenían supervisor`);
  }

  // === CLAVE 2: FILTRAR EVENTOS SOLO DE LOS NRC VACIOS ===
  const eventosParaAsignar = eventos.filter(e => !idsYaAsignados.has(e.resource.cargaacademica.idcargaacad));

  // 1. INSERTAR SOLO EN CABECERA: asignacion_nrc_supervisor
  const dataCabecera = cargasParaAsignar.map(c => ({
    idcargaacad: c.idcargaacad,
    idsupervisor: idsupervisor,
    estado: 'PROGRAMADO',
    fechaasignacion: moment().format('YYYY-MM-DD')
  }))

  const { data: cabeceraInsertada, error: errCab } = await supabase
   .from('asignacion_nrc_supervisor')
   .insert(dataCabecera) // <- CAMBIO: insert normal, no upsert
   .select()

  if(errCab) return toast.error("Error Cabecera: " + errCab.message)

  // 2. BORRAR DETALLE ANTERIOR Y CREAR NUEVO: asignacionsupervision
  const dataDetalle = eventosParaAsignar.map(e => ({
    iddh: e.resource.iddh,
    idsupervisor: idsupervisor,
    estado: 'PROGRAMADO',
    fechaasignacion: moment().format('YYYY-MM-DD'),
    created_at: moment().toISOString(), // <-- NUEVO
    idasignacion_nrc: cabeceraInsertada.find((c:any) => c.idcargaacad === e.resource.cargaacademica.idcargaacad)?.idasignacion_nrc
  }))

  const iddhs = dataDetalle.map(d => d.iddh)
  await supabase.from('asignacionsupervision').delete().in('iddh', iddhs) // <-- CLAVE: borra lo anterior

  const { data: detalleInsertado, error: errDet } = await supabase
   .from('asignacionsupervision')
   .insert(dataDetalle) // <-- CLAVE: inserta lo nuevo
   .select()

  if(errDet) return toast.error("Error Detalle: " + errDet.message)

  // 3. BORRAR VISITAS ANTERIORES Y GENERAR NUEVAS: visitasupervision
  const idsDetalle = detalleInsertado.map((d:any) => d.idasignacions)
  await supabase.from('visitasupervision').delete().in('idasignacions', idsDetalle) // <-- Borra visitas viejas

  const diasMap: any = {'DOMINGO':0,'LUNES':1,'MARTES':2,'MIERCOLES':3,'JUEVES':4,'VIERNES':5,'SABADO':6}
  const visitasParaInsertar: any[] = []

  eventosParaAsignar.forEach(e => {
    const detalle = detalleInsertado.find((d:any) => d.iddh === e.resource.iddh)
    if(!detalle) return

    const diaNum = diasMap[e.resource.dia_semana?.toUpperCase()]
    let fecha = moment(periodo.fecha_inicio)

    while(fecha.isSameOrBefore(periodo.fecha_fin)){
      if(fecha.day() === diaNum){
        visitasParaInsertar.push({
          idasignacions: detalle.idasignacions,
          fechavisita: fecha.format('YYYY-MM-DD'),
          horavisita: e.resource.hora_inicio,
          horafin: e.resource.hora_fin, // 16:24:00 <- AGREGA ESTA LINE
          condicion: 'PROGRAMADO',
          iddh: e.resource.iddh
        })
      }
      fecha.add(1, 'day')
    }
  })

  if(visitasParaInsertar.length > 0){
    for(let i = 0; i < visitasParaInsertar.length; i += 1000){
      const lote = visitasParaInsertar.slice(i, i + 1000)
      const { error: errVis } = await supabase.from('visitasupervision').insert(lote)
      if(errVis) return toast.error("Error al programar visitas: " + errVis.message)
    }
  }

  setShowAsignarModalMasivo(false)
  toast.success(`Se asignaron ${cargasParaAsignar.length} NRCs nuevos. ${cargasOmitidas.length} ya tenían supervisor. Total visitas: ${visitasParaInsertar.length}`)
  fetchDataHorario()
}

  return (
    <div className="main-content">
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />

      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
  <h1 style={{display: 'flex', alignItems: 'center', gap: '1rem', margin: 0}}>
    <Hospital size={24}/> Matriz de Asignación de Supervisión
  </h1>

  {/* BOTON ASIGNAR MASIVO */}
{ filtroEps && eventos.filter(e =>!e.resource.asignacion?.idsupervisor).length > 0 && (
    <button
      className="btn-primario"
      style={{height: '4.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#059669', whiteSpace: 'nowrap'}}
      onClick={() => {setFormAsignar({ idsupervisor: null }); setShowAsignarModalMasivo(true)}}
    >
      <UserCheck size={16}/> Asignar Masivo ({eventos.filter(e =>!e.resource.asignacion?.idsupervisor).length})
    </button>
  )}
</div>
      <div className="card-sgpc" style={{ padding: '2rem', marginBottom: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(22rem, 1fr))', gap: '1.2rem', alignItems: 'end' }}>

  <SelectSGPCFieldset label="Periodo Académico" options={opcionesPeriodo} value={filtroPeriodo} onChange={(val) => {setFiltroPeriodo(val); setFiltroFilial(''); setFiltroEps(''); setFiltroDocente('')}} disabled={loading}/>
  <SelectSGPCFieldset label="Filial" options={opcionesFilial} value={filtroFilial} onChange={(val) => {setFiltroFilial(val); setFiltroEps(''); setFiltroDocente('')}} disabled={!filtroPeriodo}/>
  <SelectSGPCFieldset label="EPS" options={opcionesEps} value={filtroEps} onChange={(val) => {setFiltroEps(val); setFiltroDocente('')}} disabled={!filtroFilial}/>
  {/* <SelectSGPCFieldset label="DNI + Docente" options={opcionesDocente} value={filtroDocente} onChange={(val) => setFiltroDocente(val)} disabled={!filtroEps}/> */}
  <SelectSGPCFieldset 
  label="DNI + Docente" 
  options={opcionesDocente} 
  value={filtroDocente} 
  onChange={setFiltroDocente} 
  disabled={!filtroEps}
  isMulti={true} // <-- CLAVE
/>



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
    Total Horas: {eventos.length} | Asignados: {eventos.filter(e => e.resource.asignacion?.idsupervisor).length}
  </div>
</div>
<div className="card-sgpc" style={{ height: '70vh', padding: '1rem' }}>
        {!filtroFilial? <p style={{textAlign:'center', paddingTop:'5rem'}}>Seleccione Periodo, Filial y EPS para ver el horario</p> : loading? <p style={{textAlign:'center', paddingTop:'5rem'}}>Cargando matriz...</p> :         
<div style={{overflowX: 'auto', overflowY: 'auto', maxHeight: '70vh'}}>
  <div style={{
    display: 'grid',
    gridTemplateColumns: `80px repeat(6, 1fr)`, // Hora + L-V-S
    minWidth: '1000px',
    border: '1px solid #cbd5e1',
    borderRadius: '0.6rem',
    //overflow: 'hidden',
    position: 'relative' // <-- IMPORTANTE
  }}>
    {/* HEADER */}
    <div style={{background: '#004AAD', color: '#fff', padding: '1rem', fontWeight: 700, textAlign: 'center', position: 'sticky', top: 0, left:0, zIndex: 30}}>Hora</div>
    {['LUNES','MARTES','MIERCOLES','JUEVES','VIERNES','SABADO'].map(dia => (
      <div key={dia} style={{background: '#004AAD', color: '#fff', padding: '1rem', fontWeight: 700, textAlign: 'center', position: 'sticky', top: 0, zIndex: 20}}>{dia}</div>
    ))}

    {/* FILAS DE HORAS */}
   {horasConCarga.map(hora => {
  // Calcular que tan alto debe ser esta fila
  const eventosEnEstaFila = eventos.filter(e => e.start.getHours() === hora || e.end.getHours() === hora)
  const alturaFila = 60 // 1 hora = 60px base

  return (
    <React.Fragment key={hora}>
      {/* COLUMNA HORA - AHORA CON FLEX PARA CENTRAR */}
      <div style={{
        background: '#F8FAFC', 
        borderRight: '1px solid #e2e8f0', 
        borderBottom: '1px solid #e2e8f0', 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600, 
        color: '#004AAD',
        height: `${alturaFila}px`,
        position: 'sticky',
        left: 0,
        zIndex: 15
      }}>
        {String(hora).padStart(2,'0')}:00
      </div>
      
      {/* 6 COLUMNAS DE DIAS */}
      {[1,2,3,4,5,6].map(diaNum => (
        <div key={diaNum} style={{
          borderRight: '1px solid #e2e8f0', 
          borderBottom: '1px solid #e2e8f0', 
          background: '#fff', 
          position: 'relative', 
          height: `${alturaFila}px`
        }}>
          {eventos
          .filter(e => e.start.getDay() === diaNum && e.start.getHours() === hora)
          .map(event => {
              const estado = event.resource.asignacion?.estado || null
              const color = ESTADO_COLORES[estado]
              
              const inicioMinutos = event.start.getHours() * 60 + event.start.getMinutes()
              const finMinutos = event.end.getHours() * 60 + event.end.getMinutes()
              const duracionMinutos = finMinutos - inicioMinutos
              
              const alturaPx = (duracionMinutos * 60) / 60 // 60px por hora
              const minutosInicio = event.start.getMinutes()
              const topOffset = (minutosInicio * 60) / 60 // Si empieza 08:30, baja 30px

              return (
                <div 
                  key={event.id}
                  onClick={() => handleSelectEvent(event)}
                  style={{
                    background: color.bg,
                    border: `2px solid ${color.border}`,
                    color: color.text,
                    padding: '0.4rem',
                    borderRadius: '0.4rem',
                    fontSize: '1rem',
                    whiteSpace: 'pre-line',
                    cursor: 'pointer',
                    position: 'absolute',
                    top: `${topOffset + 2}px`, // <-- NUEVO: respeta los minutos
                    left: '2px',
                    right: '2px',
                    height: `${alturaPx - 4}px`,
                    zIndex: 10,
                    overflow: 'hidden'
                  }}
                >
                {event.title.split('\n').map((linea, i) => {
  let estilo: React.CSSProperties = { fontSize: '1.1rem', lineHeight: '1.3' }
  
  //if(i === 0) estilo = { ...estilo, fontWeight: 700, color: '#004AAD' } // HORA - Azul y Negrita
  if(i === 0) estilo = { ...estilo, fontWeight: 800 } // HORA - Azul y Negrita
  if(i === 1) estilo = { ...estilo, fontWeight: 700 } // ASIGNATURA - Seminegrita
  //if(i === 2) estilo = { ...estilo, fontWeight: 500, color: '#059669' } // EPS - Verde
  if(i === 2) estilo = { ...estilo, fontWeight: 500 } // EPS - Verde
  if(i === 3) estilo = { ...estilo, fontStyle: 'italic', fontSize: '1rem', fontWeight: 600 } // DOC - Cursiva
  if(i === 4) estilo = { ...estilo, fontSize: '1rem', opacity: 0.8 } // SUP - Más pequeño

  return <div key={i} style={estilo}>{linea}</div>
})}
                </div>
              )
          })}
        </div>
      ))}
    </React.Fragment>
  )
})}
  </div>
</div>
        }
</div>
      {/* {showAsignarModal && ( <div className="modal-overlay" onClick={() => setShowAsignarModal(false)}> <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{maxWidth: '50rem'}}> <div className="modal-header"><h2 style={{display: 'flex', alignItems: 'center', gap: '0.8rem'}}><UserCheck size={20}/>Asignar Supervisor</h2><button onClick={()=>setShowAsignarModal(false)} className="btn-cerrar-modal"><X/></button></div> <div className="modal-body"> <p><b>Docente:</b> {celdaSeleccionada?.campoclinico?.docente?.persona?.apellidos}</p> <p><b>Asignatura:</b> {celdaSeleccionada?.campoclinico?.cargaacademica[0]?.asignatura?.nombre}</p> <p><b>Día/Hora:</b> {celdaSeleccionada?.dia_semana} {celdaSeleccionada?.hora_inicio} - {celdaSeleccionada?.hora_fin}</p> <SelectSGPCFieldset label="Supervisor" options={opcionesSupervisor} value={formAsignar.idsupervisor} onChange={(val) => setFormAsignar({idsupervisor: val})} /> </div> <div className="modal-footer"><button className="btn-primario" onClick={handleAsignar} disabled={!formAsignar.idsupervisor}><Check/> Guardar</button></div> </div> </div> )} */}
{showAsignarModal && ( 
  <div className="modal-overlay" style={{zIndex: 3000}} onClick={() => setShowAsignarModal(false)}> 
    <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{maxWidth: '60rem', padding: '0', borderRadius: '1.2rem', overflow: 'hidden'}}> 
      
      {/* HEADER AZUL IGUAL A CONSULTA */}
      <div className="modal-header" style={{background: 'var(--color-primario)', color: '#fff', padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h2 style={{color:'#fff', display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '1.6rem', margin: 0}}>
          <UserCheck size={22}/> Asignar Supervisor
        </h2>          
        <button 
          onClick={() => setShowAsignarModal(false)} 
          onMouseEnter={e => {e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.color = '#DC2626'; e.currentTarget.style.transform = 'rotate(90deg)';}}
          onMouseLeave={e => {e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'rotate(0deg)';}}
          style={{background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.8rem', borderRadius: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', transition: 'all 0.2s ease'}}
        >
          <X size={20}/>
        </button>
      </div>

      {/* BODY CON CARDS */}
      <div className="modal-body" style={{padding: '2rem'}}>
        <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '2rem'}}>

          <div style={{display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.2rem', background: '#EFF6FF', borderRadius: '0.8rem', borderLeft: '4px solid #3B82F6'}}>
            <GraduationCap size={20} color="#3B82F6"/>
            <div>
              <div style={{fontSize: '1.1rem', color: '#64748b'}}>Asignatura</div>
              <div style={{fontSize: '1.4rem', fontWeight: 700, color: '#1E293B'}}>{celdaSeleccionada?.cargaacademica?.asignatura?.nombre}</div>
            </div>
          </div>

          <div style={{display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.2rem', background: '#F0FDF4', borderRadius: '0.8rem', borderLeft: '4px solid #22C55E'}}>
            <User size={20} color="#22C55E"/>
            <div>
              <div style={{fontSize: '1.1rem', color: '#64748b'}}>Docente</div>
              <div style={{fontSize: '1.4rem', fontWeight: 700, color: '#1E293B'}}>{celdaSeleccionada?.campoclinico?.docente?.persona?.apellidos}, {celdaSeleccionada?.campoclinico?.docente?.persona?.nombres}</div>
            </div>
          </div>

          <div style={{display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.2rem', background: '#FFFBEB', borderRadius: '0.8rem', borderLeft: '4px solid #F59E0B'}}>
            <Building2 size={20} color="#F59E0B"/>
            <div>
              <div style={{fontSize: '1.1rem', color: '#64748b'}}>EPS / Filial / NRC</div>
              <div style={{fontSize: '1.4rem', fontWeight: 700, color: '#1E293B'}}>
                {celdaSeleccionada?.campoclinico?.eps?.razonsocial} | {celdaSeleccionada?.campoclinico?.filial?.nombrefilial} | NRC: {celdaSeleccionada?.cargaacademica?.nrc}
              </div>
            </div>
          </div>

          <div style={{display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.2rem', background: '#F8FAFC', borderRadius: '0.8rem', borderLeft: '4px solid #94A3B8'}}>
            <CalendarDays size={20} color="#64748b"/>
            <div>
              <div style={{fontSize: '1.1rem', color: '#64748b'}}>Día y Hora</div>
              <div style={{fontSize: '1.4rem', fontWeight: 700, color: '#1E293B'}}>{celdaSeleccionada?.dia_semana} {celdaSeleccionada?.hora_inicio} - {celdaSeleccionada?.hora_fin}</div>
            </div>
          </div>

        </div>

        <SelectSGPCFieldset label="Supervisor" options={opcionesSupervisor} value={formAsignar.idsupervisor} onChange={(val) => setFormAsignar({idsupervisor: val})} /> 
      </div>

      {/* FOOTER BOTON */}
      <div style={{display: 'flex', padding: '1.5rem 2rem', background: '#F8FAFC', borderTop: '1px solid #E2E8F0'}}>
        <button 
          className="btn-primario" 
          onClick={handleAsignar} 
          disabled={!formAsignar.idsupervisor}
          onMouseEnter={e => {e.currentTarget.style.background = '#1E40AF'; e.currentTarget.style.transform = 'translateY(-2px)'}}
          onMouseLeave={e => {e.currentTarget.style.background = 'var(--color-primario)'; e.currentTarget.style.transform = 'translateY(0)'}}
          style={{width: '100%', height: '4.8rem', borderRadius: '0.8rem', fontSize: '1.4rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', cursor: 'pointer', transition: 'all 0.2s ease', opacity: !formAsignar.idsupervisor ? 0.6 : 1}}
        >
          <Check size={16}/> Guardar Asignación
        </button>
      </div> 
    </div> 
  </div> 
)}

      {/* {showAsignarModalMasivo && ( 
  <div className="modal-overlay" onClick={() => setShowAsignarModalMasivo(false)}> 
    <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{maxWidth: '50rem'}}> 
      <div className="modal-header">
        <h2 style={{display: 'flex', alignItems: 'center', gap: '0.8rem'}}>
          <UserCheck size={20}/>Asignación Masiva
        </h2>
        <button onClick={()=>setShowAsignarModalMasivo(false)} className="btn-cerrar-modal"><X/></button>
      </div> 
      <div className="modal-body"> 
        <p><b>EPS:</b> {eps.find(e => e.ideps === filtroEps)?.razonsocial}</p> 
        <p><b>Total horas sin supervisor:</b> {eventos.filter(e => !e.resource.asignacion).length}</p>
        <p style={{fontSize: '1.2rem', color: '#64748b'}}>Se asignará el mismo supervisor a todas las horas filtradas que estén sin asignar</p>
        <SelectSGPCFieldset label="Supervisor" options={opcionesSupervisor} value={formAsignar.idsupervisor} onChange={(val) => setFormAsignar({idsupervisor: val})} /> 
      </div> 
      <div className="modal-footer">
        <button className="btn-primario" onClick={handleAsignarMasivo} disabled={!formAsignar.idsupervisor}>
          <Check/> Asignar a {eventos.filter(e => !e.resource.asignacion).length} horas
        </button>
      </div> 
    </div> 
  </div> 
)} */}

{showAsignarModalMasivo && ( 
  <div className="modal-overlay" style={{zIndex: 3000}} onClick={() => setShowAsignarModalMasivo(false)}> 
    <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{maxWidth: '60rem', padding: '0', borderRadius: '1.2rem', overflow: 'hidden'}}> 
      <div className="modal-header" style={{background: '#059669', color: '#fff', padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h2 style={{color:'#fff', display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '1.6rem', margin: 0}}>
          <UserCheck size={22}/> Asignación Masiva
        </h2>          
       <button 
  onClick={()=>setShowAsignarModalMasivo(false)} 
  onMouseEnter={e => {e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.color = '#DC2626'; e.currentTarget.style.transform = 'rotate(90deg)';}}
  onMouseLeave={e => {e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'rotate(0deg)';}}
  style={{background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.8rem', borderRadius: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', transition: 'all 0.2s ease'}}
>
  <X size={20}/>
</button>
      </div> 
      <div className="modal-body" style={{padding: '2rem'}}> 
        <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '2rem'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.2rem', background: '#F0FDF4', borderRadius: '0.8rem', borderLeft: '4px solid #22C55E'}}>
            <Building2 size={20} color="#22C55E"/>
            <div>
              <div style={{fontSize: '1.1rem', color: '#64748b'}}>EPS Seleccionada</div>
              <div style={{fontSize: '1.4rem', fontWeight: 700, color: '#1E293B'}}>{eps.find(e => e.ideps === filtroEps)?.razonsocial}</div>
            </div>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.2rem', background: '#EFF6FF', borderRadius: '0.8rem', borderLeft: '4px solid #3B82F6'}}>
            <ClipboardList size={20} color="#3B82F6"/>
            <div>
              <div style={{fontSize: '1.1rem', color: '#64748b'}}>Total horas sin supervisor</div>
              <div style={{fontSize: '1.4rem', fontWeight: 700, color: '#1E293B'}}>{eventos.filter(e =>!e.resource.asignacion?.idsupervisor).length}</div>
            </div>
          </div>
        </div>
        <p style={{fontSize: '1.2rem', color: '#64748b', marginBottom: '1.5rem'}}>Se asignará el mismo supervisor a todas las horas filtradas que estén sin asignar</p>
        <SelectSGPCFieldset label="Supervisor" options={opcionesSupervisor} value={formAsignar.idsupervisor} onChange={(val) => setFormAsignar({idsupervisor: val})} /> 
      </div> 
      <div style={{display: 'flex', padding: '1.5rem 2rem', background: '#F8FAFC', borderTop: '1px solid #E2E8F0'}}>
        <button 
          className="btn-primario" 
          onClick={handleAsignarMasivo} 
          disabled={!formAsignar.idsupervisor}
          style={{width: '100%', height: '4.8rem', borderRadius: '0.8rem', background: '#059669', border: '1.5px solid #059669', fontSize: '1.4rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', cursor: 'pointer', opacity: !formAsignar.idsupervisor ? 0.6 : 1}}
        >
          <Check/> Asignar a {eventos.filter(e => !e.resource.asignacion).length} horas
        </button>
      </div> 
    </div> 
  </div> 
)}
<style jsx global>{`
.react-select__menu { z-index: 9999!important; }
`}</style>
    </div>
  )
}