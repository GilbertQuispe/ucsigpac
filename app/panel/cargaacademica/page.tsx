'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/client'
import { Plus, Edit, X, Eye, Search, Trash2, Hospital, BookOpen, User, Building, Calendar, Eraser, Save, ChevronLeft, ChevronRight, MapPin } from 'lucide-react'
import AsyncSelect from 'react-select/async'
import Select from 'react-select'
import ModalHorarioAcademico from './components/ModalHorarioAcademico' // <-- NUEVO IMPORT
import ModalVerCargaDocente from './components/ModalVerCargaDocente' // <-- NUEVO

// NUEVO
const DIAS_SEMANA = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO','DOMINGO']

const calcularHoras = (inicio: string, fin: string) => {
  if(!inicio ||!fin) return 0
  const [h1, m1] = inicio.split(':').map(Number)
  const [h2, m2] = fin.split(':').map(Number)
  const diff = (h2 * 60 + m2) - (h1 * 60 + m1)
  return diff > 0? diff / 60 : 0
}

type CargaAcademica = any

const SelectSGPCFieldset = ({label, value, onChange, options, isDisabled = false, isAsync = false, loadOptions}:any) => {
  const Component = isAsync? AsyncSelect : Select
  // const selectedOption = isAsync? value : options.find((o:any) => o.value === value?.value) || value || null
const selectedOption = isAsync? value : options?.find((o:any) => o.value === value?.value) || value || null
  return (
    <fieldset className="fieldset-sgpc">
      <legend>{label}</legend>
      <Component
        options={isAsync? undefined : options}
        loadOptions={isAsync? loadOptions : undefined}
        defaultOptions={isAsync}
        value={selectedOption}
        onChange={onChange}
        isDisabled={isDisabled} placeholder="Seleccione..." isSearchable maxMenuHeight={200}
        classNamePrefix="react-select" getOptionValue={(e:any) => e.value} getOptionLabel={(e:any) => e.label}
        styles={{ control: (base, state) => ({...base, height: '4.4rem', minHeight: '4.4rem', borderRadius: '0.6rem', border: '1px solid #cbd5e1', background: '#fff', boxShadow: state.isFocused? '0 0 0 1px var(--color-primario)' : 'none', marginTop: '0.4rem', cursor: 'pointer', opacity: isDisabled? 0.6 : 1 }), valueContainer: (base) => ({...base, padding: '0 1.2rem', height: '4.4rem' }), input: (base) => ({...base, margin: 0, padding: 0 }), indicatorsContainer: (base) => ({...base, height: '4.4rem' }), option: (base, state) => ({...base, backgroundColor: state.isSelected? 'var(--color-primario)' : state.isFocused? 'var(--color-acento)' : '#fff', color: state.isSelected? '#fff' : 'var(--color-texto)', padding: '1rem 1.2rem' }), menu: (base) => ({...base, zIndex: 9999, marginTop: '0.4rem' }) }}
      />
    </fieldset>
  )
}

export default function CargaAcademicaPage() {
  const supabase = createClient()
  const [cargas, setCargas] = useState<CargaAcademica[]>([])
  const [periodos, setPeriodos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [filtroPeriodo, setFiltroPeriodo] = useState<any>({value: '', label: 'TODOS'})
  const [docenteSel, setDocenteSel] = useState<any>(null)
  const [asignaturaSel, setAsignaturaSel] = useState<any>(null)

  const [paginaActual, setPaginaActual] = useState(1)
  const registrosPorPagina = 10
  const [totalRegistros, setTotalRegistros] = useState(0)
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null)

  const [showModal, setShowModal] = useState(false)
  const [cargaEdit, setCargaEdit] = useState<CargaAcademica | null>(null)

  //const [form, setForm] = useState<any>({idpa: null, idhorariod: null, idasignatura: null, nrc: '', docenteData: null, planacademico: '', carrera: '' })
  const [form, setForm] = useState<any>({
  idpa: null, 
  idhorariod: null, 
  idcampocli: null, // <-- NUEVO
  idasignatura: null, 
  nrc: '', 
  docenteData: null, 
  planacademico: '', 
  carrera: '',
  camposDelDocente: [] // <-- NUEVO
})
const [showModalHorarioAcad, setShowModalHorarioAcad] = useState(false)
const [dataWizard2, setDataWizard2] = useState<any>(null)

const [showModalVerCarga, setShowModalVerCarga] = useState(false)
const [cargaVer, setCargaVer] = useState<CargaAcademica | null>(null)

  const showToast = (msg: string, type: 'error' | 'success' = 'error') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  // const loadAsignaturas = async (inputValue: string) => {
  //   const {data, error} = await supabase.from('asignatura').select(`idasignatura, codigo, nombre, carrera:idcarrera(nombrecarrera), planasignatura:idplan(nombre)`).ilike('nombre', `%${inputValue}%`).limit(50)
  //   return data?.map(a => ({value: a.idasignatura, label: `${a.codigo} - ${a.nombre}`, carrera: a.carrera?.nombrecarrera, planacademico:a.planasignatura?.nombre})) || []
  // }

const loadAsignaturas = async (inputValue: string) => {
    let query = supabase
      .from('asignatura')
      .select(`idasignatura, codigo, nombre, carrera:idcarrera(nombrecarrera), planasignatura:idplan(nombre)`)
      .limit(50)
      .order('codigo')

    if(inputValue){
      query = query.or(`codigo.ilike.%${inputValue}%,nombre.ilike.%${inputValue}%`) // <-- BUSCA EN LOS 2
    }

    const {data, error} = await query
    
    if(error) {
      console.error("Error loadAsignaturas:", error)
      return []
    }

    return data?.map(a => ({
      value: a.idasignatura, 
      label: `${a.codigo} - ${a.nombre}`, 
      carrera: a.carrera?.nombrecarrera, 
      planacademico: a.planasignatura?.nombre
    })) || []
  }

  const loadDocentesPorFiltro = async (inputValue: string) => {
  if(!filtroPeriodo?.value) return []

  const {data, error} = await supabase
 .from('cargaacademica')
 .select(`
      idcargaacad,
      horariodocente:idhorariod(
        idhorariod,
        campoclinico:idcampocli!left(
          idcampocli,
          idpa,
          docente:iddocente!inner(
            iddocente,
            persona:idpersona!inner(dni, apellidos, nombres)
          )
        )
      )
    `)
 .eq('estado', 'ACTIVO')
 .eq('horariodocente.campoclinico.idpa', filtroPeriodo.value) // <-- Filtra por periodo de la carga
 .limit(200)

  if(error ||!data) return []

  const mapaDocentes = new Map()
  data.forEach(c => {
    const id = c.horariodocente?.campoclinico?.docente?.iddocente
    if(id &&!mapaDocentes.has(id)) {
      mapaDocentes.set(id, c.horariodocente)
    }
  })


  
  const registrosUnicos = Array.from(mapaDocentes.values())
  const texto = inputValue.toLowerCase().trim()
  const filtrados = registrosUnicos.filter(h => {
    const dni = h?.campoclinico?.docente?.persona?.dni?.toLowerCase() || ''
    const apellidos = h?.campoclinico?.docente?.persona?.apellidos?.toLowerCase() || ''
    const nombres = h?.campoclinico?.docente?.persona?.nombres?.toLowerCase() || ''
    return dni.includes(texto) || apellidos.includes(texto) || nombres.includes(texto)
  })

  return (texto? filtrados : registrosUnicos).map(h => ({
    value: h.idhorariod,
    label: `${h.campoclinico.docente.persona.dni} - ${h.campoclinico.docente.persona.apellidos}, ${h.campoclinico.docente.persona.nombres}`,
    iddocente: h.campoclinico.docente.iddocente,
  }))
}

// 2. FUNCION NUEVA
const handleVerCarga = (carga: CargaAcademica) => {
  // Le pasamos idcargaacad_referencia = el mismo idcargaacad
  // Así el modal piensa que es "herencia" y jala el horario solo
  setDataWizard2({
    idcargaacad: carga.idcargaacad,
    idcargaacad_referencia: carga.idcargaacad, // <-- CLAVE: AQUI ESTA EL TRUCO
    nrc: carga.nrc,
    idhorariod: carga.idhorariod,
    iddocente: carga.horariodocente?.campoclinico?.docente?.iddocente,
    idpa: carga.horariodocente?.campoclinico?.idpa,
    idasignatura: carga.idasignatura,
    idcampocli: carga.horariodocente?.campoclinico?.idcampocli, //Agrega soloe esta
    docente: `${carga.horariodocente?.campoclinico?.docente?.persona?.apellidos}, ${carga.horariodocente?.campoclinico?.docente?.persona?.nombres}`,
    dni: carga.horariodocente?.campoclinico?.docente?.persona?.dni,
    asignatura: `${carga.asignatura?.codigo} - ${carga.asignatura?.nombre}`,
    esSoloLectura: false // <-- Permitir editar para agregar estudiante
  })
  
  setCargaVer(carga)
  setShowModalVerCarga(true)
}

const loadAsignaturasFiltro = async (inputValue: string) => {
  // 1. Traer todas las cargas con asignatura, sin filtrar por periodo todavía
  const {data, error} = await supabase
  .from('cargaacademica')
  .select(`
    idasignatura,
    idhorariod,
    asignatura:idasignatura(
      idasignatura, 
      codigo, 
      nombre, 
      carrera:idcarrera(nombrecarrera), 
      planasignatura:idplan(nombre)
    ),
    horariodocente:idhorariod(
      campoclinico:idcampocli!left(
        idpa
      )
    )
  `)
  .eq('estado', 'ACTIVO')
  .limit(500)

  if(error || !data) return []

  // 2. Filtrar en JS igual que en docentes
  let filtrado = data

  if(filtroPeriodo?.value) {
    filtrado = filtrado.filter(c => c.horariodocente?.campoclinico?.idpa === filtroPeriodo.value)
  }

  if(docenteSel?.value) {
    filtrado = filtrado.filter(c => c.idhorariod === docenteSel.value)
  }

  // 3. Filtrar por texto de búsqueda
  const texto = inputValue.toLowerCase().trim()
  if(texto) {
    filtrado = filtrado.filter(c => 
      c.asignatura?.nombre?.toLowerCase().includes(texto) ||
      c.asignatura?.codigo?.toLowerCase().includes(texto)
    )
  }

  // 4. Quitar duplicados
  const mapaAsignaturas = new Map()
  filtrado.forEach(c => { 
    const id = c.asignatura?.idasignatura
    if(id && !mapaAsignaturas.has(id)) mapaAsignaturas.set(id, c.asignatura) 
  })

  return Array.from(mapaAsignaturas.values()).map(a => ({
    value: a.idasignatura, 
    label: `${a.codigo} - ${a.nombre}`, 
    carrera: a.carrera?.nombrecarrera, 
    planacademico: a.planasignatura?.nombre
  }))
}

const loadDocentesPorPeriodo = async (inputValue: string) => {
  if(!form.idpa) return []

  const {data, error} = await supabase
 .from('horariodocente')
//  .select(`
//       idhorariod,
//       campoclinico:idcampocli!inner(
//         idcampocli,
//         idpa,
//         estado,
//         iddocente,
//         //idservicios,
//         ideps,
//         //serviciosalud:idservicios!inner(nombre),
//         eps:ideps!inner(razonsocial, distrito:iddistrito!inner(nombredt)),
//         docente:iddocente!inner(
//           iddocente,
//           persona:idpersona!inner(dni, apellidos, nombres)
//         )
//       )
//     `)
.select(`
      idhorariod,
      campoclinico:idcampocli!inner(
        idcampocli,
        idpa,
        estado,
        iddocente,
       
        ideps,
       
        eps:ideps!inner(razonsocial, distrito:iddistrito!inner(nombredt)),
        docente:iddocente!inner(
          iddocente,
          persona:idpersona!inner(dni, apellidos, nombres)
        )
      )
    `)
 .eq('campoclinico.idpa', form.idpa.value)
 .eq('campoclinico.estado', 'ACTIVO')
 .limit(200)

  if(error) return []

  const mapaDocentes = new Map()
  data?.forEach(h => {
    const id = h.campoclinico.docente.iddocente
    if(!mapaDocentes.has(id)) {
      mapaDocentes.set(id, h)
    }
  })

  const registrosUnicos = Array.from(mapaDocentes.values())

  const texto = inputValue.toLowerCase().trim()
  const filtrados = registrosUnicos.filter(h => {
    const dni = h.campoclinico?.docente?.persona?.dni?.toLowerCase() || ''
    const apellidos = h.campoclinico?.docente?.persona?.apellidos?.toLowerCase() || ''
    const nombres = h.campoclinico?.docente?.persona?.nombres?.toLowerCase() || ''
    //const servicio = h.campoclinico?.serviciosalud?.nombre?.toLowerCase() || ''
    //return dni.includes(texto) || apellidos.includes(texto) || nombres.includes(texto) || servicio.includes(texto)
    return dni.includes(texto) || apellidos.includes(texto) || nombres.includes(texto)
  })

  const listaFinal = texto? filtrados : registrosUnicos

  return listaFinal.map(h => ({
    value: h.idhorariod,
    //label: `${h.campoclinico.docente.persona.dni} - ${h.campoclinico.docente.persona.apellidos}, ${h.campoclinico.docente.persona.nombres} | ${h.campoclinico.serviciosalud.nombre}`,
    label: `${h.campoclinico.docente.persona.dni} - ${h.campoclinico.docente.persona.apellidos}, ${h.campoclinico.docente.persona.nombres}`,
    iddocente: h.campoclinico.docente.iddocente,
    idcampocli: h.campoclinico.idcampocli,
    //servicio: h.campoclinico.serviciosalud.nombre,
    eps: h.campoclinico.eps?.razonsocial,
    distrito: h.campoclinico.eps?.distrito?.nombredt
  }))
}

// const loadCamposPorDocente = async (iddocente: number) => {
//   if(!iddocente || !form.idpa) return []

//   const {data, error} = await supabase
//     .from('campoclinico') // <-- OJO: ahora jalamos directo de campoclinico
//     .select(`
//       idcampocli,
//       idservicios,
//       eps:ideps!inner(razonsocial, distrito:iddistrito!inner(nombredt)),
//       serviciosalud:idservicios(nombre)
//     `)
//     .eq('iddocente', iddocente)
//     .eq('idpa', form.idpa.value) // <-- CLAVE: filtrar por periodo
//     .eq('estado', 'ACTIVO')

//   if(error || !data) return []

//   // Quitamos duplicados por si acaso
//   const unicos = Array.from(new Map(data.map(c => [c.idcampocli, c])).values())

//   return unicos.map(c => ({
//     value: c.idcampocli,
//     label: `${c.eps.razonsocial} - ${c.eps.distrito.nombredt}`,
//     idservicios: c.idservicios,
//     servicio: c.serviciosalud?.nombre
//   }))
// }

const loadCamposPorDocente = async (iddocente: number) => {
  if(!iddocente || !form.idpa) return []

  //console.log("Buscando campos para:", iddocente, "Periodo:", form.idpa.value)

  const {data, error} = await supabase
    .from('campoclinico')
    .select(`
      idcampocli,
      estado,
      idservicios,
      eps:ideps!inner(razonsocial, distrito:iddistrito!inner(nombredt)),
      serviciosalud:idservicios(nombre)
    `)
    .eq('iddocente', iddocente)
    .eq('idpa', form.idpa.value)

  //console.log("Respuesta cruda de BD:", data) // <-- ESTO
  //console.log("Error:", error)

  if(error || !data) return []

  const activos = data.filter(c => c.estado === 'ACTIVO') // <-- Quitamos el filtro de supabase para ver todos
  //console.log("Solo activos:", activos)

  return activos.map(c => ({
    value: c.idcampocli,
    label: `${c.eps.razonsocial} - ${c.eps.distrito.nombredt} [${c.estado}]`,
    servicio: c.serviciosalud?.nombre
  }))
}

const fetchData = async () => {
    setLoading(true)
    const [perRes] = await Promise.all([
      supabase.from('periodoacademico').select('*').order('fecha_inicio', {ascending: false}),
    ])
    setPeriodos(perRes.data || [])

    let query = supabase.from('cargaacademica')
 .select(`*, 
      asignatura:idasignatura(*, carrera:idcarrera(*),planasignatura:idplan(*)), 
      horariodocente:idhorariod(*, 
        campoclinico:idcampocli!left(*, 
          periodoacademico:idpa(*), 
          filial:idfilial(*),
           serviciosalud:idservicios(*),
           eps:ideps!inner(              
            razonsocial,
            distrito:iddistrito!inner(nombredt)
          ),
          docente:iddocente(*, persona:idpersona(*))
        )
      )
    `, { count: 'exact' })
 .eq('estado', 'ACTIVO')
 .order('idcargaacad', {ascending: false})

    // Tus filtros actuales siguen igual
    if(docenteSel?.value) query = query.eq('horariodocente.idhorariod', docenteSel.value)
    if(asignaturaSel?.value) query = query.eq('idasignatura', asignaturaSel.value)
    if(search) query = query.ilike(`nrc`, `%${search}%`)

    const {data, count, error} = await query.limit(1000) // <-- Traemos max 1000 para que no explote
    if(error) { showToast(error.message, 'error'); setLoading(false); return }

    let dataFiltrada = data || []
    
    // TU FILTRADO MANUAL POR PERIODO SIGUE IGUAL
    if(filtroPeriodo?.value) {
      dataFiltrada = dataFiltrada.filter(c => c.horariodocente?.campoclinico?.idpa === filtroPeriodo.value)
    }

    // PAGINACION REAL
    const inicio = (paginaActual-1)*registrosPorPagina
    const fin = inicio + registrosPorPagina
    setCargas(dataFiltrada.slice(inicio, fin))
    setTotalRegistros(dataFiltrada.length) // <-- Usamos el length del filtrado manual
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [paginaActual, filtroPeriodo, docenteSel, asignaturaSel, search])

//   useEffect(() => {
//   if(!showModal){ // cuando se cierra
//     setForm({idpa: null, idhorariod: null, idasignatura: null, nrc: '', docenteData: null, planacademico: '', carrera: ''})
//     setCargaEdit(null) // <-- AGREGA ESTO
//   }
// }, [showModal])

useEffect(() => {
  if(!showModal){ 
    setForm({idpa: null, idhorariod: null, idcampocli: null, idasignatura: null, nrc: '', docenteData: null, planacademico: '', carrera: '', camposDelDocente: []})
    setCargaEdit(null)
  }
}, [showModal])

  const puedeGuardar = useMemo(() => form.idpa && form.idhorariod && form.idasignatura && form.nrc, [form])

const handleGuardar = async () => {
    if(!puedeGuardar) { showToast('Complete Periodo, Docente, Asignatura y NRC *', 'error'); return }
    setLoading(true)

    const idasignatura = form.idasignatura.value

    const idcampocli = form.idcampocli?.value
    
    const idhorariod = form.idhorariod.value
    const nrc = form.nrc.trim().toUpperCase()
    const iddocente = form.idhorariod.iddocente
    const idpa = form.idpa.value

    const { data: existeCargaDocente } = await supabase
    .from('cargaacademica')
    .select(`idcargaacad`)
    .eq('idasignatura', idasignatura)
    .eq('nrc', nrc)
    .eq('idhorariod', idhorariod)
    .eq('estado', 'ACTIVO')
    .maybeSingle()

    if(existeCargaDocente &&!cargaEdit) {
      showToast('Este Docente ya tiene registrado este NRC + Asignatura en el periodo', 'error')
      setLoading(false)
      return
    }

    const { data: existeCargaNRC } = await supabase
    .from('cargaacademica')
    .select(`idcargaacad`)
    .eq('idasignatura', idasignatura)
    .eq('nrc', nrc)
    .eq('estado', 'ACTIVO')
    .limit(1)
    .maybeSingle()

    let esReutilizado = false
    if(existeCargaNRC) esReutilizado = true

//     const { data, error } = cargaEdit
//  ? await supabase.from('cargaacademica').update({ idasignatura, idhorariod, nrc, estado: 'ACTIVO' }).eq('idcargaacad', cargaEdit.idcargaacad).select().single()
//       : await supabase.from('cargaacademica').insert({ idasignatura, idhorariod, nrc, estado: 'ACTIVO' }).select().single()
const { data, error } = cargaEdit
 ? await supabase.from('cargaacademica').update({ idasignatura, idhorariod, idcampocli, nrc, estado: 'ACTIVO' }).eq('idcargaacad', cargaEdit.idcargaacad).select().single()
  : await supabase.from('cargaacademica').insert({ idasignatura, idhorariod, idcampocli, nrc, estado: 'ACTIVO' }).select().single()
    setLoading(false)

    if(error) { showToast(error.message, 'error'); return }

    showToast(cargaEdit? 'Carga actualizada' : esReutilizado? 'Carga registrada - Horario heredado' : 'Carga registrada', 'success');
    setShowModal(false);

    if(!cargaEdit && data) {
      setDataWizard2({
        idcargaacad: data.idcargaacad,
        idcargaacad_referencia: existeCargaNRC?.idcargaacad || null, // <-- NUEVO: PARA HEREDAR HORARIO
        nrc: data.nrc,
        idhorariod: data.idhorariod, // <-- NUEVO: SIEMPRE EL DEL DOCENTE ACTUAL PARA EL HORARIO LABORAL
        iddocente: iddocente,
        idpa: idpa,
        idasignatura: idasignatura,
        idcampocli: idcampocli, // <-- AGREGA SOLO ESTA LINEA
        docente: `${form.idhorariod.label.split(' - ')[1] || form.idhorariod.label}`,
        dni: `${form.idhorariod.label.split(' - ')[0] || ''}`,
        asignatura: form.idasignatura.label,
        esSoloLectura: esReutilizado // <-- NUEVO: BANDERA PARA BLOQUEAR
      })
      setTimeout(() => setShowModalHorarioAcad(true), 500)
    }
    fetchData()
  }
  
 const handleEditar = (carga: CargaAcademica) => {
  setCargaEdit(carga) 
  
  setForm({
    idcampocli: carga.horariodocente?.campoclinico ? {
  value: carga.horariodocente.campoclinico.idcampocli,
  label: `${carga.horariodocente.campoclinico.eps?.razonsocial} - ${carga.horariodocente.campoclinico.eps?.distrito?.nombredt}`
} : null,
servicio: carga.horariodocente?.campoclinico?.serviciosalud?.nombre,
camposDelDocente: [],
    idpa: carga.horariodocente?.campoclinico?.periodoacademico? {
      value: carga.horariodocente.campoclinico.periodoacademico.idpa,
      label: `${carga.horariodocente.campoclinico.periodoacademico.codigo} - ${carga.horariodocente.campoclinico.periodoacademico.nombre}`
    } : null,
    idhorariod: carga.horariodocente? {
      value: carga.horariodocente.idhorariod,
      label: `${carga.horariodocente.campoclinico.docente.persona.dni} - ${carga.horariodocente.campoclinico.docente.persona.apellidos}, ${carga.horariodocente.campoclinico.docente.persona.nombres} | ${carga.horariodocente.campoclinico.serviciosalud?.nombre || ''}`,
      iddocente: carga.horariodocente.campoclinico.docente.iddocente,
      servicio: carga.horariodocente.campoclinico.serviciosalud?.nombre, // <-- ESTO
      eps: carga.horariodocente.campoclinico.eps?.razonsocial,           // <-- ESTO
      distrito: carga.horariodocente.campoclinico.eps?.distrito?.nombredt // <-- ESTO
    } : null,
    idasignatura: carga.asignatura? {
      value: carga.asignatura.idasignatura,
      label: `${carga.asignatura.codigo} - ${carga.asignatura.nombre}`,
      carrera: carga.asignatura.carrera?.nombrecarrera,      // <-- ESTO
      planacademico: carga.asignatura.planasignatura?.nombre // <-- ESTO
    } : null,
    nrc: carga.nrc,
    docenteData: carga.horariodocente? {
      servicio: carga.horariodocente.campoclinico.serviciosalud?.nombre,
      eps: carga.horariodocente.campoclinico.eps?.razonsocial,
      distrito: carga.horariodocente.campoclinico.eps?.distrito?.nombredt
    } : null,
    planacademico: carga.asignatura?.planasignatura?.nombre || '', // <-- ESTO
    carrera: carga.asignatura?.carrera?.nombrecarrera || ''         // <-- ESTO
  })
  
  setShowModal(true)
}

  return (
    <div className="main-content">
      {toast && <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 99999, background: toast.type === 'error'? '#EF4444' : '#22C55E', color: '#fff', padding: '1.2rem 2.4rem', borderRadius: '0.8rem', fontWeight: 600, fontSize: '1.4rem' }}>{toast.msg}</div>}

      <div className="header-responsive">
        <div><h1><BookOpen size={24} style={{marginRight: '0.8rem'}}/>Gestión de Carga Académica</h1><p>Total: {totalRegistros} registros</p></div>
        <button className="btn-primario" onClick={() => setShowModal(true)}><Plus size={18} />Nueva Carga</button>
      </div>

      <div className="card-sgpc" style={{ marginBottom: '2.4rem', padding: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.2rem', marginBottom: '1.6rem' }}>
          <SelectSGPCFieldset 
  label="Filtrar por Periodo" 
  value={filtroPeriodo} 
  onChange={(opt) => { setFiltroPeriodo(opt); setDocenteSel(null); setAsignaturaSel(null); setPaginaActual(1) }} 
  options={[{value: '', label: 'TODOS'},...periodos.map(p=>({value:p.idpa, label:`${p.codigo} - ${p.nombre}`}))]} 
/>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr', gap: '1.2rem', alignItems: 'flex-end' }}>
          <div><legend>Docente</legend><AsyncSelect
            key={`${filtroPeriodo?.value}-${docenteSel?.value}`}
            cacheOptions
            defaultOptions
            loadOptions={loadDocentesPorFiltro}
            value={docenteSel}
            onChange={(opt) => { setDocenteSel(opt); setPaginaActual(1) }}
            placeholder="Seleccione..."
            noOptionsMessage={() => "No hay docentes"}
            isDisabled={!filtroPeriodo?.value}
            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
    menuPosition="fixed"
    styles={{ menuPortal: (base) => ({...base, zIndex: 99999 }) }}
          /></div>
          <div><legend>Asignatura</legend><AsyncSelect key={`${filtroPeriodo?.value}-${docenteSel?.value}`} defaultOptions loadOptions={loadAsignaturasFiltro} value={asignaturaSel} onChange={setAsignaturaSel} placeholder="Buscar asignatura..." menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
    menuPosition="fixed"
    styles={{ menuPortal: (base) => ({...base, zIndex: 99999 }) }} /></div>
          <div><legend>Buscar NRC</legend><input className="input-sgpc" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} style={{height: "4.4rem", width: '100%' }} /></div>
          <button className="btn-secundario btn-limpiar" onClick={() => {setSearch(""); setFiltroPeriodo({value: '', label: 'TODOS'}); setDocenteSel(null); setAsignaturaSel(null); setPaginaActual(1)}} style={{height: '4.4rem'}}><Eraser size={16} />Limpiar</button>
        </div>
      </div>

      <div className="card-sgpc" style={{ overflowX: 'auto' }}>
        <table className='tabla-sgpc'>
          <thead><tr>
            <th>#</th><th>PERIODO</th><th>FILIAL</th><th>CARRERA</th><th>DNI</th><th>DOCENTE</th><th>ASIGNATURA</th><th>NRC</th><th>ESTADO</th><th>ACCIONES</th>
          </tr></thead>
          <tbody>
            {loading? <tr><td colSpan={10} style={{textAlign: 'center', padding: '2rem'}}>Cargando...</td></tr> :
            cargas.length === 0? <tr><td colSpan={10} style={{textAlign: 'center', padding: '2rem'}}>No hay registros. Registre una nueva carga.</td></tr> :
            cargas.map((c,i) => (
              <tr key={c.idcargaacad}>
                <td>{(paginaActual-1)*registrosPorPagina + i + 1}</td>
                <td>{c.horariodocente?.campoclinico?.periodoacademico?.codigo}</td>
                <td>{c.horariodocente?.campoclinico?.filial?.nombrefilial}</td>
                <td>{c.asignatura?.carrera?.nombrecarrera}</td>
                <td>{c.horariodocente?.campoclinico?.docente?.persona?.dni}</td>
                <td>{c.horariodocente?.campoclinico?.docente?.persona?.apellidos}, {c.horariodocente?.campoclinico?.docente?.persona?.nombres}</td>
                <td>{c.asignatura?.nombre}</td>
                <td>{c.nrc}</td>

                <td><span style={{padding: '0.4rem 0.8rem', borderRadius: '999px', fontSize: '1.2rem', fontWeight: 600, background: c.estado === 'ACTIVO'? '#F0FDF4' : '#FEF2F2', color: c.estado === 'ACTIVO'? '#22C55E' : '#EF4444'}}>{c.estado}</span></td>
                <td style={{display: 'flex', gap: '0.8rem'}}>
                  <button className="btn-icon btn-icon-ver" title="Ver Estudiantes" onClick={() => handleVerCarga(c)}>
    <Eye size={15} />
  </button>
                  <button 
  className="btn-icon btn-icon-editar" 
  title="Editar"
  onClick={() => handleEditar(c)}
>
  <Edit size={15} />
</button>
                </td>
                
              </tr>
            ))}
          </tbody>
        </table>
        {totalRegistros > 0 && (
  <div className="card-sgpc" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.6rem 2rem', marginTop: '1.6rem', borderRadius: '0.8rem'}}>
    <span style={{fontSize: '1.4rem', color: 'var(--color-texto)', fontWeight: 500}}>
      Mostrando { (paginaActual-1)*registrosPorPagina + 1 } al { Math.min(paginaActual*registrosPorPagina, totalRegistros) } de {totalRegistros} registros
    </span>
    
    <div style={{display: 'flex', alignItems: 'center', gap: '1.2rem'}}>
      <button 
        className="btn-secundario btn-outline-azul" 
        onClick={() => setPaginaActual(paginaActual - 1)}
        disabled={paginaActual === 1}
        style={{display: 'flex', alignItems: 'center', gap: '0.6rem', borderRadius: '0.6rem', padding: '0.8rem 1.6rem'}}
      >
        <ChevronLeft size={16} /> Anterior
      </button>
      
      <span style={{fontSize: '1.4rem', fontWeight: 600, color: 'var(--color-primario)'}}>
        Pág {paginaActual} de {Math.ceil(totalRegistros / registrosPorPagina) || 1}
      </span>
      
      <button 
        className="btn-primario" 
        onClick={() => setPaginaActual(paginaActual + 1)}
        disabled={paginaActual >= Math.ceil(totalRegistros / registrosPorPagina)}
        style={{display: 'flex', alignItems: 'center', gap: '0.6rem', borderRadius: '0.6rem', padding: '0.8rem 1.6rem'}}
      >
        Siguiente <ChevronRight size={16} />
      </button>
    </div>
  </div>
)}
      </div>

      {showModal && (
        <div className="modal-overlay" >
          <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{maxWidth: '90rem'}}>
            <div className="modal-header">
              <h2 style={{display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--color-primario)'}}><BookOpen size={22} /> {cargaEdit? 'Editar Carga Académica' : 'Nueva Carga Académica'}</h2>
              <button onClick={() => setShowModal(false)} className="btn-cerrar-modal"><X size={18} /></button>
            </div>
            <div className="modal-body" style={{gap: '2.4rem'}}>
                <fieldset className="fieldset-sgpc-section">
                  <legend>Datos Generales</legend>
                  <div className="grid-2">
                    <SelectSGPCFieldset
                      label="Periodo Académico *"
                      options={periodos.map(p=>({value:p.idpa, label:`${p.codigo} - ${p.nombre}`}))}
                      value={form.idpa}
                      onChange={(opt:any) => setForm({...form, idpa: opt, idhorariod: null, docenteData: null})}
                      placeholder="Seleccione..."
                      isSearchable
                      styles={{ control: (base, state) => ({...base, height: '4.4rem', minHeight: '4.4rem', borderRadius: '0.6rem', border: '1px solid #cbd5e1', marginTop: '0.4rem' }), menu: (base) => ({...base, zIndex: 9999 }) }}
                    />
                   <SelectSGPCFieldset
  label="DNI + Docente *"
  value={form.idhorariod}
  onChange={async (opt:any) => {
    setForm({...form, idhorariod: opt, docenteData: opt, idcampocli: null, servicio: '', camposDelDocente: []})
    
    // Al elegir docente, cargamos todos sus campos
    if(opt?.iddocente){
      const campos = await loadCamposPorDocente(opt.iddocente)
      setForm(prev => ({...prev, camposDelDocente: campos}))
    }
  }}
  isAsync
  loadOptions={loadDocentesPorPeriodo}
  isDisabled={!form.idpa}
  key={form.idpa?.value}
/>
  <div className="col-span-2"><SelectSGPCFieldset
  label="EPS + Distrito *"
  value={form.idcampocli}
  onChange={async (opt:any) => {
    setForm({...form, idcampocli: opt, servicio: opt?.servicio})
    
    // JALAMOS HORARIO LABORAL DE ESE CAMPO
    if(opt?.value){
      const {data: horLab} = await supabase.from('horariodocente').select('idhorariod').eq('idcampocli', opt.value).limit(1).single()
      setForm(prev => ({...prev, idhorariod: {...prev.idhorariod, value: horLab?.idhorariod}}))
    }
  }}
  options={form.camposDelDocente}
  isDisabled={!form.docenteData}
/>
</div>

{/* <fieldset className="fieldset-sgpc">
  <legend>Servicio de Salud</legend>
  <input className="input-sgpc" value={form.servicio || ''} readOnly disabled style={{marginTop: '0.4rem', paddingLeft:'1rem', background: '#F1F5F9'}} />
</fieldset> */}
                  </div>
                </fieldset>
                <fieldset className="fieldset-sgpc-section">
                  <legend>Asignatura</legend>
                  <div className="grid-3">
                    <SelectSGPCFieldset label="Asignatura *" value={form.idasignatura} onChange={(opt:any) => setForm({...form, idasignatura: opt, planacademico: opt?.planacademico || '', carrera: opt?.carrera || ''})} isAsync loadOptions={loadAsignaturas} />
                    <fieldset className="fieldset-sgpc"><legend>Plan Académico</legend><input type="text" value={form.planacademico || ''} readOnly disabled className="input-sgpc" style={{marginTop: '0.4rem', paddingLeft:'1rem', background: '#F1F5F9'}} /></fieldset>
                    <fieldset className="fieldset-sgpc"><legend>Carrera</legend><input type="text" value={form.carrera || ''} readOnly disabled className="input-sgpc" style={{marginTop: '0.4rem', paddingLeft:'1rem', background: '#F1F5F9'}} /></fieldset>
                    {/* <fieldset className="fieldset-sgpc"><legend>NRC *</legend><input className="input-sgpc" value={form.nrc} onChange={e => setForm({...form, nrc: e.target.value})} style={{marginTop: '0.4rem'}} /></fieldset> */}
                    <fieldset className="fieldset-sgpc">
  <legend>NRC *</legend>
  <input 
    type="text" 
    inputMode="numeric"  // <-- Para que salga teclado numérico en celular
    pattern="[0-9]*"     // <-- Validación HTML
    maxLength={10}       // <-- Opcional: ponle el máximo de dígitos que usa tu NRC
    className="input-sgpc" 
    value={form.nrc} 
    onChange={e => {
      const soloNumeros = e.target.value.replace(/\D/g, '') // <-- Quita todo lo que no sea número
      setForm({...form, nrc: soloNumeros})
    }} 
    style={{marginTop: '0.4rem'}} 
  />
</fieldset>
                  </div>
                </fieldset>
            </div>
           <div className="modal-footer" style={{justifyContent: 'center', gap: '1.6rem'}}>
              <button className="btn-secundario btn-outline-azul" onClick={() => setForm({idpa: null, idhorariod: null, idcampocli: null, idasignatura: null, nrc: '', docenteData: null, planacademico: '', carrera: '', camposDelDocente: []})} style={{minWidth: '18rem'}}><Eraser size={16} />Limpiar</button>
              <button className="btn-primario btn-azul-solido" onClick={handleGuardar} disabled={!puedeGuardar} style={{minWidth: '18rem'}}><Save size={16} />Guardar</button>
           </div>
          </div>
        </div>
      )}
{/* <ModalHorarioAcademico
        show={showModalHorarioAcad}
        onClose={() => setShowModalHorarioAcad(false)}
        dataWizard1={dataWizard2}
      /> */}

      <ModalHorarioAcademico
  show={showModalHorarioAcad}
  onClose={() => setShowModalHorarioAcad(false)}
  dataWizard1={dataWizard2}
  idcampocli={dataWizard2?.idcampocli || null} // <-- AGREGA ESTA LINEA
/>

<ModalVerCargaDocente
  show={showModalVerCarga}
  onClose={() => setShowModalVerCarga(false)}
  carga={cargaVer}
  onAbrirAgregarEstudiante={() => {
    setShowModalVerCarga(false)
    setTimeout(() => setShowModalHorarioAcad(true), 300)
  }}
  setDataWizard2={setDataWizard2}
/>

    <style jsx>{`
     .grid-2 {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 1.6rem;
        }
          .col-span-2 {  /* <-- NUEVO */
          grid-column: 1 / -1;
        }

     .grid-2.sgpc-fieldset {
          margin: 0;
          padding-left:0;
        }
        @media (max-width: 1024px) {
       .grid-2 {
            grid-template-columns: repeat(1, 1fr);
          }
        .col-span-2 { /* <-- Para que en móvil vuelva a 1 col */
            grid-column: 1;
          }
        }
        @media (max-width: 600px) {
       .grid-4 {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}