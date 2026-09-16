'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/client'
import { Search, Eraser, Check, FileText, Download, Users, ChevronLeft, ChevronRight, Calendar, FileClock, Edit, Eye } from 'lucide-react'
import Select from '@/components/ui/SelectClient'
import toast from 'react-hot-toast'
import { Toaster } from 'react-hot-toast'
import { generarInforme } from '@/lib/generarInforme'
import { useAuth } from '@/hooks/useAuth'

type Supervision = {
  idvisitas: number
  idsvs: number
  fecha: string
  nrc: string
  supervisor: { nombres: string, apellidos: string }
  idpersona_supervisor: number
  docente: { nombres: string, apellidos: string }
  curso: { nombre: string }
  porcentaje_docente: number
  porcentaje_alumno: number
  resultado_baremo_general: string
  estado: string
  idsupervisor: number
}

type Persona = {
  idpersona: number;
  idsupervisor: number;
  nombres: string;
  apellidos: string
}

const SelectSGPCFieldset = ({label, value, onChange, options}:any) => {
  const selectedOption = options.find((o:any) => o.value === value) || null
  return (
    <fieldset className="fieldset-sgpc">
      <legend>{label}</legend>
      <Select
        options={options}
        value={selectedOption}
        onChange={(opt:any) => onChange(opt?.value || '')}
        placeholder="Seleccione..."
        isSearchable
        maxMenuHeight={200}
        classNamePrefix="react-select"
        styles={{ control: (base:any, state:any) => ({...base, height: '4.4rem', minHeight: '4.4rem', borderRadius: '0.6rem', border: '1px solid #cbd5e1', background: '#fff', boxShadow: state.isFocused? '0 0 0 1px var(--color-primario)' : 'none', marginTop: '0.4rem' }) }}
      />
    </fieldset>
  )
}

export default function InformeSupervisionPage() {
  const supabase = createClient()
  const { user } = useAuth()
  const [supervisiones, setSupervisiones] = useState<Supervision[]>([])
  const [supervisores, setSupervisores] = useState<Persona[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [seleccionados, setSeleccionados] = useState<number[]>([])

  const [fechaDel, setFechaDel] = useState('')
  const [fechaAl, setFechaAl] = useState('')
  const [filtroSupervisor, setFiltroSupervisor] = useState<number | ''>('')
  const [esAdmin, setEsAdmin] = useState(false)

  const [idPersonaUsuario, setIdPersonaUsuario] = useState<number | null>(null)
  const [idRolUsuario, setIdRolUsuario] = useState<number | null>(null)

  const [paginaActual, setPaginaActual] = useState(1)
  const registrosPorPagina = 10

  // NUEVO PARA INFORME CONSOLIDADO
  const [tab, setTab] = useState<'buscar' | 'historial'>('buscar')
  const [historialInformes, setHistorialInformes] = useState<any[]>([])
  const [generando, setGenerando] = useState(false)

  useEffect(() => {
    fetchSupervisores()
    if(user?.id) obtenerRolUsuario()
  }, [user?.id])

  const obtenerRolUsuario = async () => {
    if(!user?.id) return
    const { data: persona } = await supabase
    .from('persona')
    .select('idpersona, idrol')
    .eq('id', user.id)
    .maybeSingle()

    if(persona) {
      setIdPersonaUsuario(persona.idpersona)
      setIdRolUsuario(persona.idrol)
      setEsAdmin(persona.idrol!== 5)
    }
  }

  const fetchSupervisores = async () => {
    try {
      const { data, error } = await supabase
      .from('supervisor')
      .select('idsupervisor, idpersona, persona!inner(idpersona, nombres, apellidos, estado)')
      .eq('persona.estado', 'ACTIVO')

      if(error) throw error

      const mapeados = (data || []).map((s: any) => ({
        idsupervisor: s.idsupervisor,
        idpersona: s.persona.idpersona,
        nombres: s.persona.nombres,
        apellidos: s.persona.apellidos
      }))

      setSupervisores(mapeados as any)
    } catch(e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const fetchHistorial = async () => {
    try {
      setLoading(true)
      let query = supabase.from('informesupervision').select('*').order('created_at', {ascending: false})

      // Si es supervisor, solo ve sus informes
      if(idRolUsuario === 5 && idPersonaUsuario) {
        query = query.eq('idpersona_supervisor', idPersonaUsuario)
      } else if(filtroSupervisor) {
        query = query.eq('idpersona_supervisor', Number(filtroSupervisor))
      }

      const { data, error } = await query
      if(error) throw error
      setHistorialInformes(data || [])
    } catch(e:any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleBuscar = async () => {
    if(!fechaDel ||!fechaAl) { toast.error('Seleccione rango de fechas'); return }
    if(!idPersonaUsuario) { toast.error('Cargando usuario...'); return }
    setLoading(true)

    // CAMBIO CLAVE: Ya no filtramos por SUPERVISADO, traemos TODO para Métrica 1
    const { data: dataVisitas, error } = await supabase
    .from('visitasupervision')
    .select('idvisitas, condicion, idasignacions, iddh, fechavisita, porcentaje_docente, porcentaje_alumno, resultado_baremo_general')
    .gte('fechavisita', fechaDel)
    .lte('fechavisita', fechaAl)

    if(error) { toast.error(error.message); setLoading(false); return }
    if(!dataVisitas || dataVisitas.length === 0) { setSupervisiones([]); setLoading(false); toast('No se encontraron visitas en ese periodo'); return }

    const idsAsignacion = [...new Set(dataVisitas.map((v: any) => v.idasignacions).filter(Boolean))]
    const idsDetalle = [...new Set(dataVisitas.map((v: any) => v.iddh).filter(Boolean))]

    const { data: asignaciones } = await supabase.from('asignacionsupervision').select('idasignacions, idsupervisor').in('idasignacions', idsAsignacion)
    const idsSup = [...new Set(asignaciones?.map((a: any) => a.idsupervisor) || [])]

    const { data: supervisoresData } = await supabase.from('supervisor').select('idsupervisor, idpersona, persona!inner(nombres, apellidos)').in('idsupervisor', idsSup.length? idsSup : [0])

    const { data: detalles } = await supabase.from('detallehorario').select('iddh, idhorario').in('iddh', idsDetalle)
    const idsHorario = [...new Set(detalles?.map((d: any) => d.idhorario) || [])]
    const { data: horarios } = await supabase.from('horario').select('idhorario, idcargaacad').in('idhorario', idsHorario.length? idsHorario : [0])

    const idsCarga = [...new Set(horarios?.map((h: any) => h.idcargaacad) || [])]
    const { data: cargas } = await supabase.from('cargaacademica').select('idcargaacad, nrc, idcampocli, asignatura!inner(nombre)').in('idcargaacad', idsCarga.length? idsCarga : [0])

    const idsCampo = [...new Set(cargas?.map((c: any) => c.idcampocli) || [])]
    const { data: campos } = await supabase.from('campoclinico').select('idcampocli, iddocente').in('idcampocli', idsCampo.length? idsCampo : [0])

    const idsDocente = [...new Set(campos?.map((c: any) => c.iddocente) || [])]
    const { data: docentes } = await supabase.from('docente').select('iddocente, persona!inner(nombres, apellidos)').in('iddocente', idsDocente.length? idsDocente : [0])

    const { data: svsData } = await supabase.from('seleccionvisitasupervision').select('idsvs, idvisitas').in('idvisitas', dataVisitas.map((v: any) => v.idvisitas))

    const mapSup = Object.fromEntries(supervisoresData?.map((s:any) => [s.idsupervisor, s.persona]) || [])
    const mapSupIdPersona = Object.fromEntries(supervisoresData?.map((s:any) => [s.idsupervisor, s.idpersona]) || [])
    const mapAsig = Object.fromEntries(asignaciones?.map((a: any) => [a.idasignacions, a.idsupervisor]) || [])
    const mapDet = Object.fromEntries(detalles?.map((d: any) => [d.iddh, d.idhorario]) || [])
    const mapHor = Object.fromEntries(horarios?.map((h: any) => [h.idhorario, h.idcargaacad]) || [])
    const mapCar = Object.fromEntries(cargas?.map((c:any) => [c.idcargaacad, c]) || [])
    const mapCam = Object.fromEntries(campos?.map((c: any) => [c.idcampocli, c.iddocente]) || [])
    const mapDoc = Object.fromEntries(docentes?.map((d:any) => [d.iddocente, d.persona]) || [])
    const mapSvs = Object.fromEntries(svsData?.map((s: any) => [s.idvisitas, s.idsvs]) || [])

    const dataCompleta = dataVisitas.map((visita:any) => {
      const idsup = mapAsig[visita.idasignacions]
      const idhor = mapDet[visita.iddh]
      const idcar = mapHor[idhor]
      const carga:any = mapCar[idcar]
      const iddoc = mapCam[carga?.idcampocli]

      return {
        idvisitas: visita.idvisitas,
        idsvs: mapSvs[visita.idvisitas] || 0,
        fecha: visita.fechavisita,
        nrc: carga?.nrc || 'N/A',
        supervisor: mapSup[idsup] || {nombres: 'N/A', apellidos: ''},
        idsupervisor: idsup || 0,
        idpersona_supervisor: mapSupIdPersona[idsup] || 0,
        docente: mapDoc[iddoc] || {nombres: 'N/A', apellidos: ''},
        curso: carga?.asignatura || {nombre: 'N/A'},
        porcentaje_docente: visita.porcentaje_docente || 0,
        porcentaje_alumno: visita.porcentaje_alumno || 0,
        resultado_baremo_general: visita.resultado_baremo_general || 'N/A',
        estado: visita.condicion
      }
    })

    let finalData: any[] = dataCompleta
    if(idRolUsuario === 5) {
      finalData = dataCompleta.filter((v:any) => v.idpersona_supervisor === idPersonaUsuario)
    }

    setSupervisiones(finalData as any)
    setLoading(false)
    setSeleccionados([])
    setPaginaActual(1)
  }

  // const handleGenerarConsolidado = async () => {
  //   if(!fechaDel ||!fechaAl) { toast.error('Seleccione rango de fechas'); return }

  //   let supervisorObjetivo: Persona | undefined
  //   if(idRolUsuario === 5) {
  //     supervisorObjetivo = supervisores.find(s => s.idpersona === idPersonaUsuario)
  //   } else {
  //     if(!filtroSupervisor) { toast.error('Seleccione un supervisor (como admin)'); return }
  //     supervisorObjetivo = supervisores.find(s => s.idpersona === Number(filtroSupervisor))
  //   }

  //   if(!supervisorObjetivo) { toast.error('Supervisor no encontrado'); return }

  //   setGenerando(true)
  //   try {
  //     // Import dinámico para no romper SSR
  //     const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, AlignmentType } = await import('docx')
  //     const { saveAs } = await import('file-saver')

  //     const visitasPeriodo = supervisiones // Ya tenemos las del periodo filtradas por supervisor

  //     const conteoEstados = visitasPeriodo.reduce((acc:any, v:any) => {
  //       acc[v.estado] = (acc[v.estado] || 0) + 1
  //       return acc
  //     }, {})

  //     const total = visitasPeriodo.length || 1
  //     const apellidos = supervisorObjetivo.apellidos.trim()
  //     const nombres = supervisorObjetivo.nombres.trim()
  //     const partesApe = apellidos.split(' ').filter(Boolean)
  //     const partesNom = nombres.split(' ').filter(Boolean)
  //     const siglas = `${partesApe[0]?.charAt(0) || ''}${partesApe[1]?.charAt(0) || partesApe[0]?.charAt(1) || ''}${partesNom[0]?.charAt(0) || ''}${partesNom[1]?.charAt(0) || ''}`.toUpperCase()
  //     const numeroInforme = `${String(Math.floor(Math.random()*900)+100)}-2026-${siglas}-SC-UC`

  //     // Datos para antecedentes desde asignacion_nrc_supervisor
  //     const { data: asignacionesNRC } = await supabase.from('asignacion_nrc_supervisor')
  //     .select('idcargaacad, cargaacademica!inner(nrc, asignatura!inner(nombre), campoclinico!inner(ideps, idfilial, filial!inner(nombrefilial), eps!inner(razonsocial, direccion, distrito!inner(nombredt, provincia!inner(nombrep, departamento!inner(nombred))))))')
  //     .eq('idsupervisor', supervisorObjetivo.idsupervisor)

  //     const doc = new Document({
  //       sections: [{
  //         children: [
  //           new Paragraph({ text: `Informe N° ${numeroInforme}`, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
  //           new Paragraph({ children: [new TextRun({ text: `A: Coordinación Académica de la Carrera de Medicina Humana`, bold: true })] }),
  //           new Paragraph({ children: [new TextRun(`Asunto: Supervisión de Prácticas Clínicas con corte al periodo ${fechaDel} - ${fechaAl}`)] }),
  //           new Paragraph({ children: [new TextRun(`Fecha elaboración: ${new Date().toLocaleDateString()} - ${asignacionesNRC?.[0]?.cargaacademica?.campoclinico?.filial?.nombrefilial || ''}`)] }),
  //           new Paragraph({ text: "", spacing: { after: 200 } }),
  //           new Paragraph({ text: "I. ANTECEDENTES", heading: HeadingLevel.HEADING_2 }),
  //           new Paragraph({ text: `Asignación de EPS del supervisor ${apellidos}, ${nombres}` }),
  //           new Table({
  //             rows: [
  //               new TableRow({ children: [
  //                 new TableCell({ children: [new Paragraph("EPS")] }),
  //                 new TableCell({ children: [new Paragraph("Dirección")] }),
  //                 new TableCell({ children: [new Paragraph("Distrito")] }),
  //                 new TableCell({ children: [new Paragraph("NRC")] }),
  //                 new TableCell({ children: [new Paragraph("Asignatura")] }),
  //               ]}),
  //              ...(asignacionesNRC || []).slice(0,20).map((a:any) => new TableRow({
  //                 children: [
  //                   new TableCell({ children: [new Paragraph(a.cargaacademica?.campoclinico?.eps?.razonsocial || 'N/A')] }),
  //                   new TableCell({ children: [new Paragraph(a.cargaacademica?.campoclinico?.eps?.direccion || 'N/A')] }),
  //                   new TableCell({ children: [new Paragraph(a.cargaacademica?.campoclinico?.eps?.distrito?.nombredt || 'N/A')] }),
  //                   new TableCell({ children: [new Paragraph(a.cargaacademica?.nrc || 'N/A')] }),
  //                   new TableCell({ children: [new Paragraph(a.cargaacademica?.asignatura?.nombre || 'N/A')] }),
  //                 ]
  //               }))
  //             ]
  //           }),
  //           new Paragraph({ text: "II. RESUMEN EJECUTIVO - MÉTRICAS POR ESTADO", heading: HeadingLevel.HEADING_2 }),
  //           new Table({
  //             rows: [
  //               new TableRow({ children: [
  //                 new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Estado", bold: true })] })] }),
  //                 new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Cantidad", bold: true })] })] }),
  //                 new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "% del Total Programado", bold: true })] })] }),
  //               ]}),
  //              ...Object.entries(conteoEstados).map(([estado, cant]: any) => new TableRow({
  //                 children: [
  //                   new TableCell({ children: [new Paragraph(estado)] }),
  //                   new TableCell({ children: [new Paragraph(String(cant))] }),
  //                   new TableCell({ children: [new Paragraph(`${((cant/total)*100).toFixed(1)}%`)] }),
  //                 ]
  //               })),
  //               new TableRow({ children: [
  //                 new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "TOTAL PROGRAMADO", bold: true })] })] }),
  //                 new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(total), bold: true })] })] }),
  //                 new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "100%", bold: true })] })] }),
  //               ]})
  //             ]
  //           }),
  //           new Paragraph({ text: "III. DETALLE DE LA SUPERVISIÓN POR NRC", heading: HeadingLevel.HEADING_2 }),
  //          ...visitasPeriodo.filter((v:any)=>v.estado==='SUPERVISADO').slice(0,15).map((v:any) =>
  //             new Paragraph({ text: `NRC: ${v.nrc} - ${v.curso.nombre} - Docente: ${v.docente.apellidos}, ${v.docente.nombres} - Fecha: ${v.fecha} - %Doc: ${v.porcentaje_docente}% - %Alu: ${v.porcentaje_alumno}% - ${v.resultado_baremo_general}` })
  //           ),
  //           new Paragraph({ text: "IV. ANÁLISIS CRÍTICO DE INCIDENCIAS", heading: HeadingLevel.HEADING_2 }),
  //          ...visitasPeriodo.filter((v:any)=>['INCIDENCIA','PENDIENTE','PERMISO'].includes(v.estado)).map((v:any)=>
  //             new Paragraph({ text: `NRC: ${v.nrc} - Fecha: ${v.fecha} - Estado: ${v.estado}` })
  //           ),
  //           new Paragraph({ text: "V. CONCLUSIONES Y RECOMENDACIONES", heading: HeadingLevel.HEADING_2 }),
  //           new Paragraph({ text: "El supervisor completará esta sección al editar el informe." }),
  //         ]
  //       }]
  //     })

  //     const blob = await Packer.toBlob(doc)
  //     const fileName = `Informe_${numeroInforme}_${fechaDel}_${fechaAl}.docx`

  //     // Guardar en Storage
  //     const arrayBuffer = await blob.arrayBuffer()
  //     const { data: uploadData, error: uploadError } = await supabase.storage.from('informes').upload(`supervision/${fileName}`, arrayBuffer, { contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', upsert: true })

  //     if(uploadError) console.warn('Error upload storage (continuamos):', uploadError.message)

  //     // Guardar en tabla informesupervision
  //     const { data: informeCreado, error: dbError } = await supabase.from('informesupervision').insert({
  //       idsupervisor: supervisorObjetivo.idsupervisor,
  //       idpersona_supervisor: supervisorObjetivo.idpersona,
  //       fecha_periodo_inicio: fechaDel,
  //       fecha_periodo_fin: fechaAl,
  //       numero_informe: numeroInforme,
  //       estadisticas: conteoEstados,
  //       nombrearchivo: fileName,
  //       rutaarchivo: uploadData?.path || `supervision/${fileName}`,
  //       fecha_emision: new Date().toISOString().split('T')[0],
  //       estado: 'BORRADOR',
  //       conclusiones: '',
  //       recomendaciones: ''
  //     }).select().single()

  //     if(dbError) throw dbError

  //     saveAs(blob, fileName)
  //     toast.success(`Informe ${numeroInforme} generado`)
  //     fetchHistorial()
  //     setTab('historial')

  //   } catch(e:any) {
  //     console.error(e)
  //     toast.error('Error generando: ' + e.message)
  //   } finally {
  //     setGenerando(false)
  //   }
  // }
const handleGenerarConsolidado = async () => {
  if(!fechaDel ||!fechaAl) { toast.error('Seleccione rango'); return }
  const sup = idRolUsuario===5? supervisores.find(s=>s.idpersona===idPersonaUsuario) : supervisores.find(s=>s.idpersona===Number(filtroSupervisor))
  if(!sup) { toast.error('Seleccione supervisor'); return }
  setGenerando(true)
  try {
    const { generarInformeConsolidado } = await import('@/lib/generarInformeConsolidado')
    await generarInformeConsolidado(sup, fechaDel, fechaAl, supervisiones)
    toast.success('Informe consolidado generado')
    fetchHistorial(); setTab('historial')
  } catch(e:any){ toast.error(e.message) } finally { setGenerando(false) }
}

  const datosFiltrados = useMemo(() => {
    let final = [...supervisiones]
    if(filtroSupervisor && esAdmin) {
      final = final.filter(s => s.idpersona_supervisor === Number(filtroSupervisor))
    }
    if(search) {
      final = final.filter((s) =>
        s.nrc.toLowerCase().includes(search.toLowerCase()) ||
        `${s.docente.nombres} ${s.docente.apellidos}`.toLowerCase().includes(search.toLowerCase()) ||
        s.curso.nombre.toLowerCase().includes(search.toLowerCase()) ||
        s.estado.toLowerCase().includes(search.toLowerCase())
      )
    }
    return final
  }, [supervisiones, search, filtroSupervisor, esAdmin])

  const totalPaginas = Math.ceil(datosFiltrados.length / registrosPorPagina)
  const indiceInicio = (paginaActual - 1) * registrosPorPagina
  const datosPaginados = datosFiltrados.slice(indiceInicio, indiceInicio + registrosPorPagina)

  const toggleCheck = (id: number) => { setSeleccionados(prev => prev.includes(id)? prev.filter(i => i!== id) : [...prev, id]) }
  const toggleAll = () => { setSeleccionados(seleccionados.length === datosPaginados.length? [] : datosPaginados.map(d => d.idsvs)) }

  const handleGenerarLote = async () => {
    if(seleccionados.length === 0) { toast.error('Seleccione al menos 1 supervisión'); return }
    setLoading(true)
    for(const id of seleccionados) {
      const visita = supervisiones.find(s => s.idsvs === id)
      if(visita) await generarInforme(visita, [])
    }
    toast.success(`${seleccionados.length} informes generados`)
    setLoading(false)
  }

  const limpiarFiltros = () => {
    setFechaDel(''); setFechaAl(''); setFiltroSupervisor(''); setSearch('');
    setSupervisiones([]); setPaginaActual(1)
  }

  return (
    <>
    <Toaster position="top-right" />
    <div className="main-content">
      <div className="header-responsive">
        <div><h1><FileText size={24} style={{marginRight: '0.8rem'}}/>Gestión de Informes de Supervisión</h1><p>Total: {datosFiltrados.length} supervisiones en periodo</p></div>
        <div style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap' }}>
          <button className={`btn ${tab==='buscar'?'btn-primario':'btn-secundario'}`} onClick={()=>setTab('buscar')}><Search size={18}/> Buscar Visitas</button>
          <button className={`btn ${tab==='historial'?'btn-primario':'btn-secundario'}`} onClick={()=>{setTab('historial'); fetchHistorial()}}><FileClock size={18}/> Informes ({historialInformes.length})</button>
        </div>
      </div>

      {tab === 'buscar' && (
      <>
      <div className="card-sgpc" style={{ marginBottom: '2.4rem', padding: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(20rem, 1fr))', gap: '1.2rem', marginBottom: '1.6rem' }}>
          <fieldset className="fieldset-sgpc">
            <legend><Calendar size={14}/> Del</legend>
            <input type="date" value={fechaDel} onChange={e => {setFechaDel(e.target.value); setPaginaActual(1)}} className="input-sgpc" />
          </fieldset>
          <fieldset className="fieldset-sgpc">
            <legend><Calendar size={14}/> Al</legend>
            <input type="date" value={fechaAl} onChange={e => {setFechaAl(e.target.value); setPaginaActual(1)}} className="input-sgpc" />
          </fieldset>
          {esAdmin && (
            <SelectSGPCFieldset label="Supervisor" value={filtroSupervisor} onChange={(val:any) => {setFiltroSupervisor(val); setPaginaActual(1)}} options={[{value: "", label: "Todos"},...supervisores.map(s=>({value:s.idpersona, label:`${s.apellidos}, ${s.nombres}`}))]} />
          )}
        </div>
        <div style={{display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap'}}>
          <div style={{ position: 'relative', flex: 1, minWidth: '20rem' }}>
            <Search size={18} style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
            <input className="input-sgpc" placeholder="Buscar por NRC, Docente, Curso, Estado..." value={search} onChange={e => {setSearch(e.target.value); setPaginaActual(1)}} style={{ paddingLeft: '4rem', height: "4.4rem", width: '100%' }} />
          </div>
          <button className="btn-secundario" onClick={limpiarFiltros} style={{height: '4.4rem'}}><Eraser size={16} />Limpiar</button>
          <button className="btn-primario" onClick={handleBuscar} style={{height: '4.4rem'}}><Search size={16} />Buscar</button>
          <button className="btn-primario" onClick={handleGenerarConsolidado} disabled={generando || supervisiones.length===0} style={{height: '4.4rem', background: '#16a34a'}}>
            <FileText size={16} />{generando? 'Generando...' : 'Generar Informe Consolidado WORD'}
          </button>
        </div>
        {supervisiones.length>0 && (
          <div style={{marginTop:'1.2rem', display:'flex', gap:'1rem', fontSize:'1.2rem'}}>
            <span>PROGRAMADO: {supervisiones.filter(s=>s.estado==='PROGRAMADO').length}</span>
            <span>SUPERVISADO: {supervisiones.filter(s=>s.estado==='SUPERVISADO').length}</span>
            <span style={{color:'red'}}>INCIDENCIA: {supervisiones.filter(s=>s.estado==='INCIDENCIA').length}</span>
            <span>PENDIENTE: {supervisiones.filter(s=>s.estado==='PENDIENTE').length}</span>
            <span>TOTAL: {supervisiones.length}</span>
          </div>
        )}
      </div>

      <div className="card-sgpc" style={{ overflowX: 'auto' }}>
        <div style={{display:'flex', justifyContent:'space-between', padding:'1rem'}}>
          <p>{seleccionados.length} seleccionados</p>
          <button className="btn-secundario" onClick={handleGenerarLote}><Download size={18} /> Generar {seleccionados.length} Individuales (antiguo)</button>
        </div>
        <table className='tabla-sgpc'>
          <thead>
            <tr>
              <th style={{width: '5rem'}}><input type="checkbox" checked={seleccionados.length === datosPaginados.length && datosPaginados.length > 0} onChange={toggleAll} /></th>
              <th>#</th>
              <th>FECHA</th>
              <th>NRC</th>
              <th>SUPERVISOR</th>
              <th>DOCENTE</th>
              <th>CURSO</th>
              <th>ESTADO</th>
              <th>% DOC</th>
              <th>% ALUM</th>
              <th>RESULTADO</th>
            </tr>
          </thead>
          <tbody>
            {datosPaginados.map((s, i) => (
              <tr key={`${s.idsvs}-${s.fecha}-${i}-${s.idvisitas}`}>
                <td><input type="checkbox" checked={seleccionados.includes(s.idsvs)} onChange={() => toggleCheck(s.idsvs)} /></td>
                <td>{indiceInicio + i + 1}</td>
                <td>{s.fecha? new Date(s.fecha).toLocaleDateString() : 'N/A'}</td>
                <td>{s.nrc}</td>
                <td>{s.supervisor.apellidos}, {s.supervisor.nombres}</td>
                <td>{s.docente.apellidos}, {s.docente.nombres}</td>
                <td>{s.curso.nombre}</td>
                <td><span className={s.estado==='SUPERVISADO'?'badge-ok': s.estado==='INCIDENCIA'?'badge-error':'badge-warning'}>{s.estado}</span></td>
                <td>{s.porcentaje_docente}%</td>
                <td>{s.porcentaje_alumno}%</td>
                <td><span className="badge-ok">{s.resultado_baremo_general}</span></td>
              </tr>
            ))}
            {datosPaginados.length===0 &&!loading && (
              <tr><td colSpan={11} style={{textAlign:'center', padding:'2rem'}}>Sin resultados. Seleccione periodo y haga click en Buscar.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPaginas > 1 && (
        <div className="paginacion-footer">
          <p className="paginacion-info">Mostrando {indiceInicio + 1} al {Math.min(indiceInicio + registrosPorPagina, datosFiltrados.length)} de {datosFiltrados.length} registros</p>
          <div className="paginacion-controles">
            <button className="btn-pag" onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1}><ChevronLeft size={16} /> Anterior</button>
            <span className="paginacion-pagina">Pág {paginaActual} de {totalPaginas}</span>
            <button className="btn-pag btn-pag-primario" onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas}>Siguiente <ChevronRight size={16} /></button>
          </div>
        </div>
      )}
      </>
      )}

      {tab === 'historial' && (
        <div className="card-sgpc" style={{ padding: '2rem' }}>
          <h3 style={{marginBottom:'1.6rem'}}><FileClock size={20}/> Historial de Informes Generados</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className='tabla-sgpc'>
              <thead>
                <tr>
                  <th>#</th>
                  <th>N° Informe</th>
                  <th>Supervisor</th>
                  <th>Periodo</th>
                  <th>Fecha Emisión</th>
                  <th>Estado</th>
                  <th>Estadísticas</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {historialInformes.map((inf:any, i:number) => (
                  <tr key={inf.idinformes}>
                    <td>{i+1}</td>
                    <td>{inf.numero_informe}</td>
                    <td>{inf.idpersona_supervisor}</td>
                    <td>{inf.fecha_periodo_inicio} al {inf.fecha_periodo_fin}</td>
                    <td>{inf.fecha_emision}</td>
                    <td><span className="badge-ok">{inf.estado}</span></td>
                    <td style={{fontSize:'1.1rem'}}>{JSON.stringify(inf.estadisticas || {})}</td>
                    <td>
                      <div style={{display:'flex', gap:'0.5rem'}}>
                        <button className="btn-secundario" onClick={async()=>{
                          const { data } = await supabase.storage.from('informes').createSignedUrl(inf.rutaarchivo, 60)
                          if(data?.signedUrl) window.open(data.signedUrl, '_blank')
                        }}><Eye size={14}/> Word</button>
                        <button className="btn-secundario" onClick={()=>{
                          const concl = prompt('Conclusiones:', inf.conclusiones || '')
                          if(concl!==null) {
                            const recom = prompt('Recomendaciones:', inf.recomendaciones || '')
                            supabase.from('informesupervision').update({conclusiones: concl, recomendaciones: recom || '', estado: 'FINALIZADO'}).eq('idinformes', inf.idinformes).then(()=>{toast.success('Guardado'); fetchHistorial()})
                          }
                        }}><Edit size={14}/> Editar</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {historialInformes.length===0 && (
                  <tr><td colSpan={8} style={{textAlign:'center', padding:'2rem'}}>No hay informes generados aún. Vaya a Buscar Visitas y genere uno.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
    </>
  )
}