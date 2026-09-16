import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, HeadingLevel, TextRun, AlignmentType, BorderStyle, ShadingType, VerticalAlign } from 'docx'
import { supabase } from './supabase'

// --- ESTILOS MAESTRO COMO TU MODELO ---
const solid = { style: BorderStyle.SINGLE, size: 6, color: "000000" }
const dashed = { style: BorderStyle.DASHED, size: 4, color: "888888" }
const bordersDesign = { top: solid, bottom: solid, left: solid, right: solid, insideH: dashed, insideV: dashed }
const fontArial = "Arial"

const getIniciales = (apellidos: string, nombres: string) => {
  const full = `${apellidos||''} ${nombres||''}`.trim().split(/\s+/).filter(Boolean)
  return full.map(p=>p[0].toUpperCase()).join('').slice(0,4) || 'XXXX'
}

const txt = (t: string, opts: { bold?: boolean, size?: number, color?: string } = {}) => new TextRun({
  text: t || ' ',
  bold: opts.bold || false,
  size: opts.size || 20,
  font: "Arial",
  color: opts.color || "000000" // FORZADO NEGRO MAESTRO
})

const cellP = (t: string, opts: { bold?: boolean, center?: boolean, size?: number, color?: string } = {}) => {
  return new Paragraph({
    alignment: opts.center? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: { before: 40, after: 40 },
    children: [txt(t, { bold: opts.bold, size: opts.size || 16, color: opts.color || "000000" })]
  })
}

const headerCell = (text: string) => new TableCell({
  shading: { type: ShadingType.SOLID, color: "2F5496", fill: "2F5496" },
  verticalAlign: VerticalAlign.CENTER,
  borders: bordersDesign,
  children: [new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [txt(text, { bold: true, size: 16, color: "FFFFFF" })] // SOLO HEADER BLANCO
  })]
})

const normalCell = (text: string, center=false) => new TableCell({
  verticalAlign: VerticalAlign.CENTER,
  borders: bordersDesign,
  children: [cellP(text, { center, size: 16, color: "000000" })]
})

// const lightCell = (text: string) => new TableCell({
//   shading: { type: ShadingType.SOLID, color: "D9E2F3", fill: "D9E2F3" },
//   verticalAlign: VerticalAlign.CENTER,
//   borders: bordersDesign,
//   children: [cellP(text, { bold: true, size: 16, color: "000000" })] // NRC con fondo claro pero letra NEGRA
// })

export const generarInformeConsolidado = async (supervisor: any, fechaDel: string, fechaAl: string, visitasPeriodo: any[]) => {
  // 1. Numero correlativo + iniciales
  const { count } = await supabase.from('informesupervision').select('*', { count: 'exact', head: true }).eq('idsupervisor', supervisor.idsupervisor)
  const correlativo = String((count||0)+1).padStart(4,'0')
  const iniciales = getIniciales(supervisor.apellidos || supervisor.persona?.apellidos, supervisor.nombres || supervisor.persona?.nombres)
  const numeroInforme = `${correlativo}-2026-${iniciales}-SC-UC`

  // // 2. Data Antecedentes con direccion completa
  // const { data: asigNRC } = await supabase.from('asignacion_nrc_supervisor').select(`
  //   idcargaacad,
  //   cargaacademica!inner(
  //     nrc,
  //     asignatura!inner(nombre, carrera!inner(nombrecarrera)),
  //     campoclinico!inner(
  //       filial!inner(nombrefilial),
  //       eps!inner(razonsocial, direccion, distrito!inner(nombredt, provincia!inner(nombrep, departamento!inner(nombred))),
  //       docente!inner(persona!inner(dni, nombres, apellidos))
  //     )
  //   )
  // `).eq('idsupervisor', supervisor.idsupervisor)

  // // 3. Detalle horario para DIA y HORARIO
  // const idsAsignacions = visitasPeriodo.map((v:any)=>v.idasignacions).filter(Boolean)
  // const { data: asigsDet } = await supabase.from('asignacionsupervision').select('idasignacions, iddh').in('idasignacions', idsAsignacions.length?idsAsignacions:[0])
  // const mapAsigToDDH = Object.fromEntries((asigsDet||[]).map((a:any)=>[a.idasignacions, a.iddh]))
  // const idsDDH = [...new Set([...Object.values(mapAsigToDDH),...visitasPeriodo.map((v:any)=>v.iddh)].filter(Boolean) as number[])]
  // const { data: dets } = await supabase.from('detallehorario').select('iddh, dia_semana, hora_inicio, hora_fin').in('iddh', idsDDH.length?idsDDH:[0])
  // const mapDet = Object.fromEntries((dets||[]).map((d:any)=>[d.iddh, d]))
  // const mapCarga = Object.fromEntries((asigNRC||[]).map((a:any)=>[a.cargaacademica.nrc, a.cargaacademica]))

    // 2. Data Antecedentes - FIX RLS + agrupa por EPS/NRC
  let asigNRC:any[] = []
  try{
    const { data } = await supabase.from('asignacion_nrc_supervisor').select(`
      idcargaacad,
      cargaacademica(
        nrc, idcargaacad,
        asignatura(nombre, carrera(nombrecarrera)),
        campoclinico(
          filial(nombrefilial),
          eps(razonsocial, direccion, distrito(nombredt, provincia(nombrep, departamento(nombred))),
          docente(persona(dni, nombres, apellidos))
        )
      )
    `).eq('idsupervisor', supervisor.idsupervisor)
    asigNRC = data||[]
  }catch(e){ console.warn("asigNRC inner fallo", e) }

  // Fallback maestro: si viene vacio, jala directo de cargaacademica por NRCs del periodo
  const nrcsUnicos = [...new Set(visitasPeriodo.map((v:any)=>v.nrc).filter(Boolean))]
  let datosAnt:any[] = asigNRC||[]
  let cargaDirecta:any[] = []
  if(datosAnt.length===0 && nrcsUnicos.length>0){
    const { data: cargaFallback } = await supabase.from('cargaacademica').select(`
      nrc, idcargaacad,
      asignatura(nombre, carrera(nombrecarrera)),
      campoclinico(filial(nombrefilial), eps(razonsocial, direccion, distrito(nombredt, provincia(nombrep, departamento(nombred))), docente(persona(dni, nombres, apellidos)))
    `).in('nrc', nrcsUnicos)
    cargaDirecta = cargaFallback||[]
    datosAnt = cargaDirecta.map((c:any)=>({ cargaacademica: c, idcargaacad: c.idcargaacad }))
  }

  // MAPA NRC -> cargaacademica (para que III y IV si jalen ASIGNATURA y DOCENTE)
  const mapCarga = Object.fromEntries([
   ...(asigNRC||[]).map((a:any)=>[a.cargaacademica?.nrc, a.cargaacademica]),
   ...cargaDirecta.map((c:any)=>[c.nrc, c])
  ].filter(([k,v])=>k && v))

  // 3. Detalle horario para DIA y HORARIO
  const idsAsignacions = visitasPeriodo.map((v:any)=>v.idasignacions).filter(Boolean)
  const { data: asigsDet } = await supabase.from('asignacionsupervision').select('idasignacions, iddh').in('idasignacions', idsAsignacions.length?idsAsignacions:[0])
  const mapAsigToDDH = Object.fromEntries((asigsDet||[]).map((a:any)=>[a.idasignacions, a.iddh]))
  const idsDDH = [...new Set([...Object.values(mapAsigToDDH),...visitasPeriodo.map((v:any)=>v.iddh)].filter(Boolean) as number[])]
  const { data: dets } = await supabase.from('detallehorario').select('iddh, dia_semana, hora_inicio, hora_fin').in('iddh', idsDDH.length?idsDDH:[0])
  const mapDet = Object.fromEntries((dets||[]).map((d:any)=>[d.iddh, d]))

  // 4. Total asistidos por idvisitas
  const idsVisitas = visitasPeriodo.map((v:any)=>v.idvisitas).filter(Boolean)
  const { data: fichas } = await supabase.from('fichasupervision').select('idvisitas, idestudiante').in('idvisitas', idsVisitas.length?idsVisitas:[0])
  const mapAsistidos = fichas?.reduce((acc:any,f:any)=>{ acc[f.idvisitas]=(acc[f.idvisitas]||0)+1; return acc; },{}) || {}

  // --- TABLA I ANTECEDENTES ---
  // const tablaAntRows = [
  //   new TableRow({ children: [headerCell("EPS"), headerCell("NRC"), headerCell("Asignatura"), headerCell("Docente"), headerCell("Total Estudiantes")] }),
  //  ...(await Promise.all((asigNRC||[]).map(async (a:any)=>{
  //     const c = a.cargaacademica; const eps = c.campoclinico.eps
  //     const dir = `${eps.razonsocial}\nDirección: ${eps.direccion||''}, ${eps.distrito?.nombredt||''} - ${eps.distrito?.provincia?.nombrep||''} - ${eps.distrito?.provincia?.departamento?.nombred||''}`
  //     const per = c.campoclinico.docente.persona
  //     const { count: tot } = await supabase.from('horario').select('*', { count: 'exact', head: true }).eq('idcargaacad', a.idcargaacad)
  //     return new TableRow({ children: [normalCell(dir), normalCell(c.nrc, true), normalCell(c.asignatura.nombre), normalCell(`${per.dni} - ${per.apellidos}, ${per.nombres}`), normalCell(String(tot||0), true)] })
  //   })))
  // ]
  // FIX ANTECEDENTES AGRUPADO POR EPS
// const nrcsUnicos = [...new Set(visitasPeriodo.map((v:any)=>v.nrc).filter(Boolean))]
// let datosAnt:any[] = asigNRC||[]
// if(datosAnt.length===0 && nrcsUnicos.length>0){
//   // fallback si el inner no trae por RLS, jala directo de cargaacademica
//   const { data: cargaFallback } = await supabase.from('cargaacademica').select(`
//     nrc, idcargaacad,
//     asignatura!inner(nombre, carrera!inner(nombrecarrera)),
//     campoclinico!inner(filial!inner(nombrefilial), eps!inner(razonsocial, direccion, distrito!inner(nombredt, provincia!inner(nombrep, departamento!inner(nombred))), docente!inner(persona!inner(dni, nombres, apellidos)))
//   `).in('nrc', nrcsUnicos)
//   datosAnt = (cargaFallback||[]).map((c:any)=>({ cargaacademica: c, idcargaacad: c.idcargaacad }))
// }

// const tablaAntRows = [
//   new TableRow({ children: [headerCell("EPS"), headerCell("NRC"), headerCell("Asignatura"), headerCell("Docente"), headerCell("Total Estudiantes")] }),
//  ...(await Promise.all(datosAnt.map(async (a:any)=>{
//       const c = a.cargaacademica
//       const eps = c.campoclinico.eps
//       const dirFull = `${eps.razonsocial} - ${eps.direccion||''} ${eps.distrito?.nombredt||''}`
//       const per = c.campoclinico.docente.persona
//       const { count: tot } = await supabase.from('horario').select('*', { count: 'exact', head: true }).eq('idcargaacad', a.idcargaacad || c.idcargaacad)
//       return new TableRow({ children: [
//         normalCell(dirFull), 
//         normalCell(c.nrc, true), 
//         normalCell(c.asignatura.nombre), 
//         normalCell(`${per.dni} - ${per.apellidos}, ${per.nombres}`), 
//         normalCell(String(tot||0), true)
//       ]})
//     })))
// ]

const tablaAntRows = [
  new TableRow({ children: [headerCell("EPS"), headerCell("NRC"), headerCell("Asignatura"), headerCell("Docente"), headerCell("Total Estudiantes")] }),
 ...(await Promise.all(datosAnt.map(async (a:any)=>{
    const c = a.cargaacademica
    const eps = c.campoclinico?.eps
    const dirFull = `${eps?.razonsocial||''} - ${eps?.direccion||''} ${eps?.distrito?.nombredt||''}`.trim()
    const per = c.campoclinico?.docente?.persona
    const idCarga = a.idcargaacad || c.idcargaacad
    let tot = 0
    if(idCarga){
      const { count } = await supabase.from('horario').select('*', { count: 'exact', head: true }).eq('idcargaacad', idCarga)
      tot = count||0
    }
    return new TableRow({ children: [
      normalCell(dirFull),
      normalCell(c.nrc, true),
      normalCell(c.asignatura?.nombre||''),
      normalCell(`${per?.dni||''} - ${per?.apellidos||''}, ${per?.nombres||''}`),
      normalCell(String(tot), true)
    ]})
  })))
]

  // --- TABLA II RESUMEN ---
  const conteo:any = visitasPeriodo.reduce((a:any,v:any)=>{a[v.estado]=(a[v.estado]||0)+1;return a;},{})
  const total = visitasPeriodo.length||1
  const tablaResRows = [
    new TableRow({ children: [headerCell("Estado"), headerCell("Cantidad"), headerCell("% del Total Programado")] }),
   ...Object.entries(conteo).map(([k,v]:any)=> new TableRow({ children: [normalCell(k), normalCell(String(v), true), normalCell(`${((v as number/total)*100).toFixed(1)}%`, true)] })),
    new TableRow({ children: [normalCell("TOTAL PROGRAMADO", true), normalCell(String(total), true), normalCell("100%", true)] })
  ]

  const children:any[] = [
    new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after: 100 }, children: [txt(`INFORME N° ${numeroInforme}`, { bold: true, size: 24, color: "2F5496" })] }),
    new Paragraph({ children: [txt("A\t:\t", { bold: true, size: 20 }), txt("Coordinación Académica\n\t\tCarrera de Medicina Humana\n\t\tUniversidad Continental", { size: 20 })] }),
    new Paragraph({ children: [txt(`\t\t${mapCarga[Object.keys(mapCarga)[0]]?.asignatura?.carrera?.nombrecarrera || 'Medicina Humana'}`, { size: 20 })] }),
    new Paragraph({ children: [txt("Asunto\t:\t", { bold: true, size: 20 }), txt(`Supervisión de Prácticas Clínicas con corte al periodo ${fechaDel}, ${fechaAl}`, { size: 20 })] }),
    new Paragraph({ children: [txt("Fecha\t:\t", { bold: true, size: 20 }), txt(`${mapCarga[Object.keys(mapCarga)[0]]?.campoclinico?.filial?.nombrefilial || 'SEDE HUANCAYO'}, ${new Date().toLocaleDateString('es-PE')}`, { size: 20 })] }),
    new Paragraph({ spacing: { before: 200, after: 200 }, children: [txt(`Es grato dirigirme a usted, para informar la supervisión realizada a las prácticas clínicas correspondientes al periodo de corte ${fechaDel} - ${fechaAl}, el cual es el siguiente detalle:`, { size: 20 })] }),

    new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 }, children: [txt("I. ANTECEDENTES", { bold: true, size: 24, color: "2F5496" })] }),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: bordersDesign, rows: tablaAntRows }),

    new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 }, children: [txt("II. RESUMEN EJECUTIVO - MÉTRICAS POR ESTADO", { bold: true, size: 24, color: "2F5496" })] }),
    new Table({ width: { size: 70, type: WidthType.PERCENTAGE }, borders: bordersDesign, rows: tablaResRows }),
    new Paragraph({ spacing: { after: 100 }, children: [txt("Gráfico de barras: Cumplimiento vs Incidencias (Pendiente implementar con chart)", { bold: true, size: 16, color: "FF0000" })] }),

    new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 }, children: [txt("III. DETALLE DE LA SUPERVISIÓN POR NRC", { bold: true, size: 24, color: "2F5496" })] }),
  ]

  let n=1
  for(const v of visitasPeriodo.filter((x:any)=>x.estado==='SUPERVISADO')){
    const c = mapCarga[v.nrc]; const iddhReal = v.iddh || mapAsigToDDH[v.idasignacions]; const det = mapDet[iddhReal]||{}
    const docenteTxt = `${c?.campoclinico?.docente?.persona?.dni||''} - ${c?.campoclinico?.docente?.persona?.apellidos||''}, ${c?.campoclinico?.docente?.persona?.nombres||''}`
    const fechaHora = v.created_at? new Date(v.created_at).toLocaleString('es-PE') : `${v.fecha||''} ${v.horavisita||''}`
    const asistidos = mapAsistidos[v.idvisitas] || 0

    const t = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE }, borders: bordersDesign,
      rows: [
        //new TableRow({ children: [headerCell("N°"), headerCell("NRC:"), new TableCell({ columnSpan: 3, shading: { type: ShadingType.SOLID, color: "D9E2F3", fill: "D9E2F3" }, verticalAlign: VerticalAlign.CENTER, borders: bordersDesign, children: [lightCell(v.nrc)] })] }),
        new TableRow({ 
  children: [
    headerCell("N°"), 
    headerCell("NRC:"), 
    new TableCell({ 
      columnSpan: 3, 
      shading: { type: ShadingType.SOLID, color: "D9E2F3", fill: "D9E2F3" }, 
      verticalAlign: VerticalAlign.CENTER, 
      borders: bordersDesign, 
      children: [cellP(v.nrc, { bold: true, size: 16, color: "000000" })] 
    })
  ] 
}),
        new TableRow({ children: [normalCell(String(n).padStart(2,'0')), normalCell("EPS"), new TableCell({ columnSpan: 3, verticalAlign: VerticalAlign.CENTER, borders: bordersDesign, children: [cellP(c?.campoclinico?.eps?.razonsocial||v.eps||'', { size: 16 })] })] }),
        new TableRow({ children: [normalCell(""), normalCell("FILIAL"), new TableCell({ columnSpan: 3, verticalAlign: VerticalAlign.CENTER, borders: bordersDesign, children: [cellP(c?.campoclinico?.filial?.nombrefilial||'SEDE HUANCAYO', { size: 16 })] })] }),
        new TableRow({ children: [normalCell(""), normalCell("CARRERA"), new TableCell({ columnSpan: 3, verticalAlign: VerticalAlign.CENTER, borders: bordersDesign, children: [cellP(c?.asignatura?.carrera?.nombrecarrera||'Medicina Humana', { size: 16 })] })] }),
        new TableRow({ children: [normalCell(""), normalCell("ASIGNATURA"), new TableCell({ columnSpan: 3, verticalAlign: VerticalAlign.CENTER, borders: bordersDesign, children: [cellP(c?.asignatura?.nombre||'', { size: 16 })] })] }),
        new TableRow({ children: [normalCell(""), normalCell("DOCENTE"), new TableCell({ columnSpan: 3, verticalAlign: VerticalAlign.CENTER, borders: bordersDesign, children: [cellP(docenteTxt, { size: 16 })] })] }),
        new TableRow({ children: [normalCell(""), new TableCell({ columnSpan: 4, shading: { type: ShadingType.SOLID, color: "E7E6E6", fill: "E7E6E6" }, verticalAlign: VerticalAlign.CENTER, borders: bordersDesign, children: [cellP("Programación", { bold: true, size: 16 })] })] }),
        new TableRow({ children: [normalCell(""), headerCell("Día"), headerCell("Fecha"), headerCell("Horario"), headerCell("Total Estudiantes")] }),
        new TableRow({ children: [normalCell(""), normalCell(det.dia_semana||'LUNES', true), normalCell(v.fechavisita||v.fecha||'', true), normalCell(`${det.hora_inicio||''} - ${det.hora_fin||''}`, true), normalCell(String(v.totalEstudiantes||5), true)] }),
        new TableRow({ children: [normalCell(""), new TableCell({ columnSpan: 4, shading: { type: ShadingType.SOLID, color: "E7E6E6", fill: "E7E6E6" }, verticalAlign: VerticalAlign.CENTER, borders: bordersDesign, children: [cellP("Supervisión", { bold: true, size: 16 })] })] }),
        new TableRow({ children: [normalCell(""), headerCell("Fecha y hora"), headerCell("Estado"), headerCell("Valoración Docente"), headerCell("Valoración Estudiante")] }),
        new TableRow({ children: [normalCell(""), normalCell(fechaHora, true), normalCell(v.estado||'', true), normalCell(`${v.porcentaje_docente||0}% - ${v.valoracion_docente||''}`, true), normalCell(`${v.porcentaje_alumno||0}% - ${v.valoracion_alumno||''}`, true)] }),
        new TableRow({ children: [normalCell(""), normalCell(""), normalCell(""), headerCell("Total Estudiantes asistidos"), normalCell(String(asistidos), true)] }),
      ]
    })
    children.push(t)

    const { data: evs } = await supabase.from('archivoevidencia').select('nombrearchivo, rutaarchivo').eq('idvisitas', v.idvisitas)
    evs?.forEach((f:any, i:number)=>{
      const fotoT = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE }, borders: bordersDesign,
        rows: [new TableRow({ children: [normalCell(`Foto ${i+1}.`), new TableCell({ columnSpan: 4, verticalAlign: VerticalAlign.CENTER, borders: bordersDesign, children: [cellP(f.nombrearchivo || f.rutaarchivo, { size: 14 })] })] })]
      })
      children.push(fotoT)
    })
    n++
  }

  children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 }, children: [txt("IV. ANÁLISIS CRÍTICO DE INCIDENCIAS", { bold: true, size: 24, color: "2F5496" })] }))
  let n2=1
  for(const v of visitasPeriodo.filter((x:any)=>['INCIDENCIA','PENDIENTE','PERMISO','EN PROCESO'].includes(x.estado))){
    const c = mapCarga[v.nrc]; const iddhReal = v.iddh || mapAsigToDDH[v.idasignacions]; const det = mapDet[iddhReal]||{}
    const fechaHora = v.created_at? new Date(v.created_at).toLocaleString('es-PE') : `${v.fecha||''} ${v.horavisita||''}`
    const t = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE }, borders: bordersDesign,
      rows: [
        new TableRow({ children: [headerCell("N°"), headerCell("NRC:"), new TableCell({ columnSpan: 3, shading: { type: ShadingType.SOLID, color: "D9E2F3", fill: "D9E2F3" }, verticalAlign: VerticalAlign.CENTER, borders: bordersDesign, children: [cellP(v.nrc, { bold: true })] })] }),
        new TableRow({ children: [normalCell(String(n2).padStart(2,'0')), normalCell("EPS"), new TableCell({ columnSpan: 3, verticalAlign: VerticalAlign.CENTER, borders: bordersDesign, children: [cellP(c?.campoclinico?.eps?.razonsocial||'', { size: 16 })] })] }),
        new TableRow({ children: [normalCell(""), normalCell("FILIAL"), new TableCell({ columnSpan: 3, verticalAlign: VerticalAlign.CENTER, borders: bordersDesign, children: [cellP(c?.campoclinico?.filial?.nombrefilial||'SEDE HUANCAYO')] })] }),
        new TableRow({ children: [normalCell(""), normalCell("CARRERA"), new TableCell({ columnSpan: 3, verticalAlign: VerticalAlign.CENTER, borders: bordersDesign, children: [cellP(c?.asignatura?.carrera?.nombrecarrera||'')] })] }),
        new TableRow({ children: [normalCell(""), normalCell("ASIGNATURA"), new TableCell({ columnSpan: 3, verticalAlign: VerticalAlign.CENTER, borders: bordersDesign, children: [cellP(c?.asignatura?.nombre||'')] })] }),
        new TableRow({ children: [normalCell(""), normalCell("DOCENTE"), new TableCell({ columnSpan: 3, verticalAlign: VerticalAlign.CENTER, borders: bordersDesign, children: [cellP(`${c?.campoclinico?.docente?.persona?.dni||''} - ${c?.campoclinico?.docente?.persona?.apellidos||''}`)] })] }),
        new TableRow({ children: [normalCell(""), new TableCell({ columnSpan: 4, shading: { type: ShadingType.SOLID, color: "E7E6E6", fill: "E7E6E6" }, verticalAlign: VerticalAlign.CENTER, borders: bordersDesign, children: [cellP("Programación", { bold: true })] })] }),
        new TableRow({ children: [normalCell(""), headerCell("Día"), headerCell("Fecha"), headerCell("Horario"), headerCell("Total Estudiantes")] }),
        new TableRow({ children: [normalCell(""), normalCell(det.dia_semana||'', true), normalCell(v.fechavisita||v.fecha||'', true), normalCell(`${det.hora_inicio||''} - ${det.hora_fin||''}`, true), normalCell("5", true)] }),
        new TableRow({ children: [normalCell(""), new TableCell({ columnSpan: 4, shading: { type: ShadingType.SOLID, color: "E7E6E6", fill: "E7E6E6" }, verticalAlign: VerticalAlign.CENTER, borders: bordersDesign, children: [cellP("Supervisión", { bold: true })] })] }),
        new TableRow({ children: [normalCell(""), headerCell("Fecha y hora"), headerCell("Estado"), new TableCell({ columnSpan: 2, shading: { type: ShadingType.SOLID, color: "2F5496", fill: "2F5496" }, verticalAlign: VerticalAlign.CENTER, borders: bordersDesign, children: [cellP("Descripción de la incidencia", { bold: true, center: true, color: "FFFFFF" })] })] }),
        new TableRow({ children: [normalCell(""), normalCell(fechaHora, true), normalCell(v.estado||'', true), new TableCell({ columnSpan: 2, verticalAlign: VerticalAlign.CENTER, borders: bordersDesign, children: [cellP("(Describe el supervisor)", { size: 16 })] })] }),
      ]
    })
    children.push(t); n2++
  }

  children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 }, children: [txt("V. CONCLUSIONES Y RECOMENDACIONES", { bold: true, size: 24, color: "2F5496" })] }))
  children.push(new Paragraph({ spacing: { before: 200 }, children: [txt(`Atentamente,`, { size: 20 })] }))
  children.push(new Paragraph({ spacing: { before: 400 }, children: [txt(`${supervisor.apellidos||''}, ${supervisor.nombres||''}`, { bold: true, size: 20 })] }))
  children.push(new Paragraph({ children: [txt(`DNI: ${supervisor.dni || supervisor.persona?.dni || 'XXXXXXXX'}`, { size: 20, color: "FF0000" })] }))
  children.push(new Paragraph({ children: [txt(`Supervisor/a`, { size: 20 })] }))

  const doc = new Document({ sections: [{ properties: {}, children }] })
  const blob = await Packer.toBlob(doc)
  const fileName = `Informe_${numeroInforme}_${fechaDel}_${fechaAl}.docx`
  const ab = await blob.arrayBuffer()

  let rutaFinal = `informes/${fileName}`
  try{
    const { data, error } = await supabase.storage.from('evidenciasSigpacuc').upload(rutaFinal, ab, { contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', upsert: true })
    if(error) throw error
    rutaFinal = data.path
  }catch(e:any){ console.warn("Storage warn:", e.message) }

  const { data: ins, error } = await supabase.from('informesupervision').insert({
    idsupervisor: supervisor.idsupervisor,
    idpersona_supervisor: supervisor.idpersona || supervisor.persona?.idpersona,
    fecha_periodo_inicio: fechaDel,
    fecha_periodo_fin: fechaAl,
    numero_informe: numeroInforme,
    estadisticas: conteo,
    nombrearchivo: fileName,
    rutaarchivo: rutaFinal,
    fecha_emision: new Date().toISOString().split('T')[0],
    estado: 'GENERADO',
    conclusiones: '',
    recomendaciones: ''
  }).select()

  if(error){ console.error("Insert error:", error); alert(error.message) }
  else console.log("Guardado OK", ins)

  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=fileName; a.click(); URL.revokeObjectURL(url)
}