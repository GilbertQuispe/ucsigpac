import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, HeadingLevel, TextRun, AlignmentType, BorderStyle, ShadingType, VerticalAlign, ImageRun  } from 'docx'
import { supabase } from './supabase'

const solid = { style: BorderStyle.SINGLE, size: 6, color: "000000" }
const dashed = { style: BorderStyle.DASHED, size: 4, color: "888888" }
const bordersDesign = { top: solid, bottom: solid, left: solid, right: solid, insideH: dashed, insideV: dashed }

const getIniciales = (apellidos: string, nombres: string) => {
  const full = `${apellidos||''} ${nombres||''}`.trim().split(/\s+/).filter(Boolean)
  return full.map(p=>p[0].toUpperCase()).join('').slice(0,4) || 'XXXX'
}
const txt = (t: string, opts: { bold?: boolean, size?: number, color?: string } = {}) => new TextRun({ text: t || ' ', bold: opts.bold || false, size: opts.size || 20, font: "Arial", color: opts.color || "000000" })
const cellP = (t: string, opts: { bold?: boolean, center?: boolean, size?: number, color?: string } = {}) => new Paragraph({ alignment: opts.center? AlignmentType.CENTER : AlignmentType.LEFT, spacing: { before: 40, after: 40 }, children: [txt(t, { bold: opts.bold, size: opts.size || 16, color: opts.color || "000000" })] })
const headerCell = (text: string) => new TableCell({ shading: { type: ShadingType.SOLID, color: "2F5496", fill: "2F5496" }, verticalAlign: VerticalAlign.CENTER, borders: bordersDesign, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [txt(text, { bold: true, size: 16, color: "FFFFFF" })] })] })
const normalCell = (text: string, center=false) => new TableCell({ verticalAlign: VerticalAlign.CENTER, borders: bordersDesign, children: [cellP(text, { center, size: 16, color: "000000" })] })

export const generarInformeConsolidado = async (supervisor: any, fechaDel: string, fechaAl: string, visitasPeriodo: any[]) => {
  const { count } = await supabase.from('informesupervision').select('*', { count: 'exact', head: true }).eq('idsupervisor', supervisor.idsupervisor)
  const correlativo = String((count||0)+1).padStart(4,'0')
  const iniciales = getIniciales(supervisor.apellidos || supervisor.persona?.apellidos, supervisor.nombres || supervisor.persona?.nombres)
  const numeroInforme = `${correlativo}-2026-${iniciales}-SC-UC`

  const nrcsUnicos = [...new Set(visitasPeriodo.map((v:any)=> String(v.nrc||'').trim()).filter(Boolean))] as string[]

  // 1. CARGA - FIX idcampocli
  let cargaData:any[] = []
  try{
    const { data, error } = await supabase.from('cargaacademica').select('*').in('nrc', nrcsUnicos)
    if(error) throw error
    cargaData = data||[]
  }catch(e){ console.warn("cargaData fallo", e) }

  // 2. CAMPOS CLINICOS - PUNTO DE PARTIDA REAL con idcampocli
  const idsCamp = [...new Set(cargaData.map((c:any)=>c.idcampocli).filter(Boolean))]
  let mapCamp:any={}
  let mapEps:any={}, mapEpsFull:any={}, mapFilial:any={}
  let mapDistrito:any={}, mapProv:any={}, mapDep:any={}
  let mapDoc:any={}

  try{
    if(idsCamp.length){
      const { data: camps } = await supabase.from('campoclinico').select('*').in('idcampocli', idsCamp)
      for(const c of camps||[]) mapCamp[c.idcampocli]=c
    }
    const idsEps = [...new Set(Object.values(mapCamp).map((c:any)=>c.ideps).filter(Boolean))] as any[]
    const idsDocCamp = [...new Set(Object.values(mapCamp).map((c:any)=>c.iddocente).filter(Boolean))] as any[]
    const idsFil = [...new Set(Object.values(mapCamp).map((c:any)=>c.idfilial).filter(Boolean))] as any[]

    if(idsEps.length){
      const { data: epss } = await supabase.from('eps').select('*').in('ideps', idsEps)
      for(const e of epss||[]) mapEps[e.ideps]=e
      const idsDist = [...new Set((epss||[]).map((e:any)=>e.iddistrito).filter(Boolean))]
      if(idsDist.length){
        const { data: dists } = await supabase.from('distrito').select('*').in('iddistrito', idsDist)
        for(const d of dists||[]) mapDistrito[d.iddistrito]=d
        const idsProv = [...new Set((dists||[]).map((d:any)=>d.idprovincia).filter(Boolean))]
        if(idsProv.length){
          const { data: provs } = await supabase.from('provincia').select('*').in('idprovincia', idsProv)
          for(const p of provs||[]) mapProv[p.idprovincia]=p
          const idsDep = [...new Set((provs||[]).map((p:any)=>p.iddepartamento).filter(Boolean))]
          if(idsDep.length){
            const { data: deps } = await supabase.from('departamento').select('*').in('iddepartamento', idsDep)
            for(const d of deps||[]) mapDep[d.iddepartamento]=d
          }
        }
      }
      for(const ideps of idsEps){
        const e = mapEps[ideps]
        if(!e) continue
        const dist = mapDistrito[e.iddistrito]
        const prov = dist? mapProv[dist.idprovincia] : null
        const dep = prov? mapDep[prov.iddepartamento] : null
        mapEpsFull[ideps] = {
        ...e,
          fullDireccion: `${e.razonsocial||''} - ${e.direccion||''} ${dist?.nombredt||''} ${prov?.nombrep||''} ${dep?.nombred||''}`.trim(),
          simple: `${e.razonsocial||''}`
        }
      }
    }

    if(idsDocCamp.length){
      const { data: docs } = await supabase.from('docente').select('*').in('iddocente', idsDocCamp)
      const idsPer = [...new Set((docs||[]).map((d:any)=>d.idpersona).filter(Boolean))]
      let pers:any[]=[]
      if(idsPer.length){
        const { data } = await supabase.from('persona').select('*').in('idpersona', idsPer)
        pers=data||[]
      }
      for(const d of docs||[]){
        const p = pers.find((x:any)=>x.idpersona===d.idpersona)
        mapDoc[d.iddocente]={...d, persona:p}
      }
    }

    if(idsFil.length){
      const { data: fils } = await supabase.from('filial').select('*').in('idfilial', idsFil)
      for(const f of fils||[]) mapFilial[f.idfilial]=f
    }
  }catch(e){ console.warn("maps camp error", e) }

  // ASIGNATURA
  const idsAsig = [...new Set(cargaData.map((c:any)=>c.idasignatura).filter(Boolean))]
  let mapAsig:any={}
  try{
    if(idsAsig.length){
      const { data } = await supabase.from('asignatura').select('idasignatura, nombre, idcarrera').in('idasignatura', idsAsig)
      for(const a of data||[]) mapAsig[a.idasignatura]=a
      const idsCarr = [...new Set((data||[]).map((a:any)=>a.idcarrera).filter(Boolean))]
      if(idsCarr.length){
        const { data: cars } = await supabase.from('carrera').select('idcarrera, nombrecarrera').in('idcarrera', idsCarr)
        for(const c of cars||[]) (mapAsig as any)[`carrera_${c.idcarrera}`]=c
      }
    }
  }catch{}

  // FIX: mapCarga por idcargaacad para soportar 2 cargas por mismo NRC (25411=2, 25413=2)
  const mapCarga:any = {}
  for(const carga of cargaData){
    const vEj = visitasPeriodo.find((v:any)=> String(v.nrc).trim() === String(carga.nrc).trim())
    const camp = mapCamp[carga.idcampocli] // FIX idcampocli
    const epsFull = camp? mapEpsFull[camp.ideps] : null
    const doc = camp? mapDoc[camp.iddocente] : null
    const asig = mapAsig[carga.idasignatura]
    const filial = camp? mapFilial[camp.idfilial] : null
    mapCarga[carga.idcargaacad] = {
      nrc: carga.nrc,
      idcargaacad: carga.idcargaacad,
      _docenteStr: vEj?.docente||'',
      _cursoStr: vEj?.curso||'',
      _raw: carga,
      asignatura: asig? { nombre: asig.nombre, carrera: mapAsig[`carrera_${asig.idcarrera}`]||{ nombrecarrera: 'MEDICINA HUMANA' } } : { nombre: vEj?.curso||'CLÍNICA QUIRÚRGICA 1', carrera:{ nombrecarrera:'MEDICINA HUMANA'} },
      docente: doc,
      campoclinico: {
        eps: epsFull? { razonsocial: epsFull.simple, direccion: epsFull.fullDireccion, full: epsFull.fullDireccion } : { razonsocial: 'EPS NO REGISTRADA', direccion: '', full: 'EPS NO REGISTRADA' },
        filial: filial||{ nombrefilial:'SEDE HUANCAYO'},
        raw: camp
      }
    }
  }

  let supPersona = supervisor.persona
  if(!supPersona?.dni && supervisor.idpersona){
    const { data } = await supabase.from('persona').select('dni, nombres, apellidos').eq('idpersona', supervisor.idpersona).single()
    supPersona = data||supPersona
  }
  supervisor = {...supervisor, persona: supPersona}

  const idsVisitas = visitasPeriodo.map((v:any)=>v.idvisitas).filter(Boolean)
  let mapVisitaSup:any={}
  let mapDet:any={}
  try{
    if(idsVisitas.length){
      const { data: visSup } = await supabase.from('visitasupervision').select('idvisitas, iddh, fechavisita, horavisita').in('idvisitas', idsVisitas)
      for(const vs of visSup||[]) mapVisitaSup[vs.idvisitas]=vs
    }
    const idsDDHVis = [...new Set(Object.values(mapVisitaSup).map((v:any)=>v.iddh).filter(Boolean))] as any[]
    const idsCarga = [...new Set(cargaData.map((c:any)=>c.idcargaacad).filter(Boolean))]
    let idsHorario:any[]=[]
    if(idsCarga.length){
      const { data: hors } = await supabase.from('horario').select('idhorario, idcargaacad').in('idcargaacad', idsCarga)
      idsHorario = (hors||[]).map((h:any)=>h.idhorario)
    }
    if(idsHorario.length){
      const { data: detHor } = await supabase.from('detallehorario').select('*').in('idhorario', idsHorario)
      for(const d of detHor||[]) mapDet[d.iddh]=d
    }
    if(idsDDHVis.length){
      const { data: dets } = await supabase.from('detallehorario').select('*').in('iddh', [...new Set(idsDDHVis)])
      for(const d of dets||[]) mapDet[d.iddh]=d
    }
  }catch(e){ console.warn("horario error", e) }

  let mapTotalEst:any={}
  try{
    const idsCarga = [...new Set(cargaData.map((c:any)=>c.idcargaacad).filter(Boolean))]
    for(const idc of idsCarga){
      const { count } = await supabase.from('horario').select('*', { count: 'exact', head: true }).eq('idcargaacad', idc)
      mapTotalEst[idc]=count||5
    }
  }catch{}

  const { data: fichas } = await supabase.from('fichasupervision').select('idvisitas, idestudiante').in('idvisitas', idsVisitas.length?idsVisitas:[0])
  const mapAsistidos = fichas?.reduce((acc:any,f:any)=>{ acc[f.idvisitas]=(acc[f.idvisitas]||0)+1; return acc; },{}) || {}

  // TABLA I - AHORA POR idcargaacad (4 filas para 25411 y 25413)
  const tablaAntRows = [
    new TableRow({ children: [headerCell("EPS"), headerCell("NRC"), headerCell("Asignatura"), headerCell("Docente"), headerCell("Total Estudiantes")] }),
 ...Object.values(mapCarga).map((c:any)=>{
      const per = c.docente?.persona
      const epsFull = c.campoclinico?.eps?.full || c.campoclinico?.eps?.razonsocial
      const tot = mapTotalEst[c.idcargaacad]||5
      return new TableRow({ children: [
        normalCell(epsFull||'EPS NO REGISTRADA'),
        normalCell(String(c.nrc), true),
        normalCell(c.asignatura?.nombre||c._cursoStr||''),
        normalCell(per? `${per?.dni||''} - ${per?.apellidos||''}, ${per?.nombres||''}` : c._docenteStr||''),
        normalCell(String(tot), true)
      ]})
    })
  ]

  const conteo:any = visitasPeriodo.reduce((a:any,v:any)=>{a[v.estado]=(a[v.estado]||0)+1;return a;},{})
  const total = visitasPeriodo.length||1

  
  const tablaResRows = [
    new TableRow({ children: [headerCell("Estado"), headerCell("Cantidad"), headerCell("% del Total Programado")] }),
 ...Object.entries(conteo).map(([k,v]:any)=> new TableRow({ children: [normalCell(k), normalCell(String(v), true), normalCell(`${((v as number/total)*100).toFixed(1)}%`, true)] })),
    new TableRow({ children: [normalCell("TOTAL PROGRAMADO", true), normalCell(String(total), true), normalCell("100%", true)] })
  ]

  const firstCarga = Object.values(mapCarga)[0] as any
  const children:any[] = [
    new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after: 100 }, children: [txt(`INFORME N° ${numeroInforme}`, { bold: true, size: 24, color: "2F5496" })] }),
    new Paragraph({ children: [txt("A\t:\t", { bold: true, size: 20 }), txt("Coordinación Académica\n\t\tCarrera de Medicina Humana\n\t\tUniversidad Continental", { size: 20 })] }),
    new Paragraph({ children: [txt(`\t\t${firstCarga?.asignatura?.carrera?.nombrecarrera || 'Medicina Humana'}`, { size: 20 })] }),
    new Paragraph({ children: [txt("Asunto\t:\t", { bold: true, size: 20 }), txt(`Supervisión de Prácticas Clínicas con corte al periodo ${fechaDel}, ${fechaAl}`, { size: 20 })] }),
    new Paragraph({ children: [txt("Fecha\t:\t", { bold: true, size: 20 }), txt(`${firstCarga?.campoclinico?.filial?.nombrefilial || 'SEDE HUANCAYO'}, ${new Date().toLocaleDateString('es-PE')}`, { size: 20 })] }),
    new Paragraph({ spacing: { before: 200, after: 200 }, children: [txt(`Es grato dirigirme a usted, para informar la supervisión realizada a las prácticas clínicas correspondientes al periodo de corte ${fechaDel} - ${fechaAl}, el cual es el siguiente detalle:`, { size: 20 })] }),
    new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 }, children: [txt("I. ANTECEDENTES", { bold: true, size: 24, color: "2F5496" })] }),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: bordersDesign, rows: tablaAntRows }),
    new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 }, children: [txt("II. RESUMEN EJECUTIVO - MÉTRICAS POR ESTADO", { bold: true, size: 24, color: "2F5496" })] }),
    new Table({ width: { size: 70, type: WidthType.PERCENTAGE }, borders: bordersDesign, rows: tablaResRows }),
    new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 }, children: [txt("III. DETALLE DE LA SUPERVISIÓN POR NRC", { bold: true, size: 24, color: "2F5496" })] }),
  ]

  const visitasSupervisadoUnicas = visitasPeriodo.filter((x:any)=>x.estado==='SUPERVISADO')

  let n=1
  for(const v of visitasSupervisadoUnicas){
    
    const cargaMatch = v.idcargaacad? cargaData.find((c:any)=> c.idcargaacad===v.idcargaacad) : cargaData.find((c:any)=> String(c.nrc).trim()===String(v.nrc).trim())
    const c = cargaMatch? mapCarga[cargaMatch.idcargaacad] : Object.values(mapCarga).find((x:any)=>String(x.nrc)===String(v.nrc)) as any
    const vs = mapVisitaSup[v.idvisitas]
    const det = vs?.iddh? mapDet[vs.iddh] : Object.values(mapDet)[0] as any
    const perDoc = c?.docente?.persona
    const docenteTxt = perDoc? `${perDoc?.dni||''} - ${perDoc?.apellidos||''}, ${perDoc?.nombres||''}` : (c?._docenteStr||v.docente||'')
    const fechaHora = vs? `${vs.fechavisita||v.fecha||''} ${vs.horavisita||''}` : `${v.fecha||''}`
    const asistidos = mapAsistidos[v.idvisitas] || v.totalEstudiantes || 5
    const totEst = c?.idcargaacad? (mapTotalEst[c.idcargaacad]||5) : 5
    const t = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE }, borders: bordersDesign,
      rows: [
        new TableRow({ children: [headerCell("N°"), headerCell("NRC:"), new TableCell({ columnSpan: 3, shading: { type: ShadingType.SOLID, color: "D9E2F3", fill: "D9E2F3" }, verticalAlign: VerticalAlign.CENTER, borders: bordersDesign, children: [cellP(String(v.nrc||''), { bold: true, size: 16, color: "000000" })] })] }),
        new TableRow({ children: [normalCell(String(n).padStart(2,'0')), normalCell("EPS"), new TableCell({ columnSpan: 3, verticalAlign: VerticalAlign.CENTER, borders: bordersDesign, children: [cellP(c?.campoclinico?.eps?.full||c?.campoclinico?.eps?.razonsocial||'', { size: 16 })] })] }),
        new TableRow({ children: [normalCell(""), normalCell("FILIAL"), new TableCell({ columnSpan: 3, verticalAlign: VerticalAlign.CENTER, borders: bordersDesign, children: [cellP(c?.campoclinico?.filial?.nombrefilial||'SEDE HUANCAYO', { size: 16 })] })] }),
        new TableRow({ children: [normalCell(""), normalCell("CARRERA"), new TableCell({ columnSpan: 3, verticalAlign: VerticalAlign.CENTER, borders: bordersDesign, children: [cellP(c?.asignatura?.carrera?.nombrecarrera||'MEDICINA HUMANA', { size: 16 })] })] }),
        new TableRow({ children: [normalCell(""), normalCell("ASIGNATURA"), new TableCell({ columnSpan: 3, verticalAlign: VerticalAlign.CENTER, borders: bordersDesign, children: [cellP(c?.asignatura?.nombre||v.curso||'', { size: 16 })] })] }),
        new TableRow({ children: [normalCell(""), normalCell("DOCENTE"), new TableCell({ columnSpan: 3, verticalAlign: VerticalAlign.CENTER, borders: bordersDesign, children: [cellP(docenteTxt, { size: 16 })] })] }),
        new TableRow({ children: [normalCell(""), new TableCell({ columnSpan: 4, shading: { type: ShadingType.SOLID, color: "E7E6E6", fill: "E7E6E6" }, verticalAlign: VerticalAlign.CENTER, borders: bordersDesign, children: [cellP("Programación", { bold: true, size: 16 })] })] }),
        new TableRow({ children: [normalCell(""), headerCell("Día"), headerCell("Fecha"), headerCell("Horario"), headerCell("Total Estudiantes")] }),
        new TableRow({ children: [normalCell(""), normalCell(det?.dia_semana||'LUNES', true), normalCell(vs?.fechavisita||v.fecha||'', true), normalCell(det?.hora_inicio? `${det.hora_inicio} - ${det.hora_fin}` : '', true), normalCell(String(totEst), true)] }),
        new TableRow({ children: [normalCell(""), new TableCell({ columnSpan: 4, shading: { type: ShadingType.SOLID, color: "E7E6E6", fill: "E7E6E6" }, verticalAlign: VerticalAlign.CENTER, borders: bordersDesign, children: [cellP("Supervisión", { bold: true, size: 16 })] })] }),
        new TableRow({ children: [normalCell(""), headerCell("Fecha y hora"), headerCell("Estado"), headerCell("Valoración Docente"), headerCell("Valoración Estudiante")] }),
        new TableRow({ children: [normalCell(""), normalCell(fechaHora, true), normalCell(v.estado||'', true), normalCell(`${v.porcentaje_docente||0}% - ${v.valoracion_docente||v.resultado_baremo_general||'N/A'}`, true), normalCell(`${v.porcentaje_alumno||0}% - ${v.valoracion_alumno||'N/A'}`, true)] }),
        new TableRow({ children: [normalCell(""), normalCell(""), normalCell(""), headerCell("Total Estudiantes asistidos"), normalCell(String(asistidos), true)] }),
      ]
    })
    children.push(t)
    // const { data: evs } = await supabase.from('archivoevidencia').select('nombrearchivo, rutaarchivo').eq('idvisitas', v.idvisitas)
    // evs?.forEach((f:any, i:number)=>{
    //   const fotoT = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: bordersDesign, rows: [new TableRow({ children: [normalCell(`Foto ${i+1}.`), new TableCell({ columnSpan: 4, verticalAlign: VerticalAlign.CENTER, borders: bordersDesign, children: [cellP(f.nombrearchivo || f.rutaarchivo, { size: 14 })] })] })] })
    //   children.push(fotoT)
    // })
        // FIX DEFINITIVO FOTO - incrusta imagen real
    const { data: evs } = await supabase.from('archivoevidencia').select('nombrearchivo, rutaarchivo').eq('idvisitas', v.idvisitas)
    if(evs && evs.length){
      children.push(new Paragraph({ spacing: { before: 200 }, children: [txt(`Evidencias (${evs.length} fotos):`, { bold: true, size: 18 })] }))
      for(let i=0;i<evs.length;i++){
        const f:any = evs[i]
        try{
          const { data: fileBlob, error } = await supabase.storage.from('evidenciasSigpacuc').download(f.rutaarchivo)
          if(error) throw error
          if(fileBlob){
            const ab = await fileBlob.arrayBuffer()
            const tablaFoto = new Table({
              width: { size: 100, type: WidthType.PERCENTAGE }, borders: bordersDesign,
              rows: [
                new TableRow({ children: [new TableCell({ columnSpan: 5, borders: bordersDesign, shading: { type: ShadingType.SOLID, color: "E7E6E6", fill: "E7E6E6" }, children: [cellP(`Foto ${i+1}: ${f.nombrearchivo}`, { bold: true, size: 14 })] })] }),
                new TableRow({ children: [new TableCell({ columnSpan: 5, borders: bordersDesign, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 }, children: [new ImageRun({ data: new Uint8Array(ab) as any, transformation: { width: 450, height: 300 } as any } as any)] })] })] }),
              ]
            })
            children.push(tablaFoto)
          }
        }catch(e){
          // fallback si la ruta no existe tal cual, solo muestra nombre
          const fotoT = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: bordersDesign, rows: [new TableRow({ children: [normalCell(`Foto ${i+1}.`), new TableCell({ columnSpan: 4, verticalAlign: VerticalAlign.CENTER, borders: bordersDesign, children: [cellP(f.nombrearchivo || f.rutaarchivo, { size: 14 })] })] })] })
          children.push(fotoT)
        }
      }
    }
    n++
  }

  children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 }, children: [txt("IV. ANÁLISIS CRÍTICO DE INCIDENCIAS", { bold: true, size: 24, color: "2F5496" })] }))
  let n2=1
  for(const v of visitasPeriodo.filter((x:any)=>['INCIDENCIA','PENDIENTE','PERMISO','EN PROCESO'].includes(x.estado))){
    const cargaMatch = cargaData.find((c:any)=> String(c.nrc).trim()===String(v.nrc).trim())
    const c = cargaMatch? mapCarga[cargaMatch.idcargaacad] : Object.values(mapCarga).find((x:any)=>String(x.nrc)===String(v.nrc)) as any
    const vs = mapVisitaSup[v.idvisitas]
    const det = vs?.iddh? mapDet[vs.iddh] : Object.values(mapDet)[0] as any
    const perDoc = c?.docente?.persona
    const fechaHora = vs? `${vs.fechavisita||''} ${vs.horavisita||''}` : `${v.fecha||''}`
    const totEst = c?.idcargaacad? (mapTotalEst[c.idcargaacad]||5) : 5
    const t = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE }, borders: bordersDesign,
      rows: [
        new TableRow({ children: [headerCell("N°"), headerCell("NRC:"), new TableCell({ columnSpan: 3, shading: { type: ShadingType.SOLID, color: "D9E2F3", fill: "D9E2F3" }, verticalAlign: VerticalAlign.CENTER, borders: bordersDesign, children: [cellP(String(v.nrc||''), { bold: true })] })] }),
        new TableRow({ children: [normalCell(String(n2).padStart(2,'0')), normalCell("EPS"), new TableCell({ columnSpan: 3, verticalAlign: VerticalAlign.CENTER, borders: bordersDesign, children: [cellP(c?.campoclinico?.eps?.full||'', { size: 16 })] })] }),
        new TableRow({ children: [normalCell(""), normalCell("FILIAL"), new TableCell({ columnSpan: 3, verticalAlign: VerticalAlign.CENTER, borders: bordersDesign, children: [cellP(c?.campoclinico?.filial?.nombrefilial||'SEDE HUANCAYO')] })] }),
        new TableRow({ children: [normalCell(""), normalCell("CARRERA"), new TableCell({ columnSpan: 3, verticalAlign: VerticalAlign.CENTER, borders: bordersDesign, children: [cellP(c?.asignatura?.carrera?.nombrecarrera||'MEDICINA HUMANA')] })] }),
        new TableRow({ children: [normalCell(""), normalCell("ASIGNATURA"), new TableCell({ columnSpan: 3, verticalAlign: VerticalAlign.CENTER, borders: bordersDesign, children: [cellP(c?.asignatura?.nombre||v.curso||'')] })] }),
        new TableRow({ children: [normalCell(""), normalCell("DOCENTE"), new TableCell({ columnSpan: 3, verticalAlign: VerticalAlign.CENTER, borders: bordersDesign, children: [cellP(perDoc? `${perDoc?.dni||''} - ${perDoc?.apellidos||''}, ${perDoc?.nombres||''}` : c?._docenteStr||'')] })] }),
        new TableRow({ children: [normalCell(""), new TableCell({ columnSpan: 4, shading: { type: ShadingType.SOLID, color: "E7E6E6", fill: "E7E6E6" }, verticalAlign: VerticalAlign.CENTER, borders: bordersDesign, children: [cellP("Programación", { bold: true })] })] }),
        new TableRow({ children: [normalCell(""), headerCell("Día"), headerCell("Fecha"), headerCell("Horario"), headerCell("Total Estudiantes")] }),
        new TableRow({ children: [normalCell(""), normalCell(det?.dia_semana||'LUNES', true), normalCell(vs?.fechavisita||v.fecha||'', true), normalCell(det?.hora_inicio? `${det.hora_inicio} - ${det.hora_fin}` : '', true), normalCell(String(totEst), true)] }),
        new TableRow({ children: [normalCell(""), new TableCell({ columnSpan: 4, shading: { type: ShadingType.SOLID, color: "E7E6E6", fill: "E7E6E6" }, verticalAlign: VerticalAlign.CENTER, borders: bordersDesign, children: [cellP("Supervisión", { bold: true })] })] }),
        new TableRow({ children: [normalCell(""), headerCell("Fecha y hora"), headerCell("Estado"), new TableCell({ columnSpan: 2, shading: { type: ShadingType.SOLID, color: "2F5496", fill: "2F5496" }, verticalAlign: VerticalAlign.CENTER, borders: bordersDesign, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [txt("Descripción de la incidencia", { bold: true, size: 16, color: "FFFFFF" })] })] })] }),
        new TableRow({ children: [normalCell(""), normalCell(fechaHora, true), normalCell(v.estado||'', true), new TableCell({ columnSpan: 2, verticalAlign: VerticalAlign.CENTER, borders: bordersDesign, children: [cellP(v.descripcion_incidencia||v.observaciones||"(Describe el supervisor)", { size: 16 })] })] }),
      ]
    })
    children.push(t); n2++
  }

  children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 }, children: [txt("V. CONCLUSIONES Y RECOMENDACIONES", { bold: true, size: 24, color: "2F5496" })] }))
  children.push(new Paragraph({ spacing: { before: 200 }, children: [txt(`Atentamente,`, { size: 20 })] }))
  children.push(new Paragraph({ spacing: { before: 400 }, children: [txt(`${supervisor.persona?.apellidos||supervisor.apellidos||''}, ${supervisor.persona?.nombres||supervisor.nombres||''}`, { bold: true, size: 20 })] }))
  children.push(new Paragraph({ children: [txt(`DNI: ${supervisor.persona?.dni || supervisor.dni || 'XXXXXXXX'}`, { size: 20, color: "000000" })] }))
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