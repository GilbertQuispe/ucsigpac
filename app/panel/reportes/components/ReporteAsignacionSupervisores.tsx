'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/client'
import { Search, FileCheck, Eraser, FileSpreadsheet, Hospital, Users, Clock, ChevronLeft, ChevronRight, Building2, MapPin, Filter, X, SlidersHorizontal, ChevronDown, GraduationCap, UserCheck, User, Layers, Eye, BookOpen } from 'lucide-react'
import Select from '@/components/ui/SelectClient'
import AsyncSelect from 'react-select/async'
import { Toaster, toast } from 'react-hot-toast'
import * as XLSX from 'xlsx'

const SelectSGPCFieldset = ({label, value, onChange, options, isDisabled=false, compact=false}:any)=>{
  const sel = options.find((o:any)=>o.value===value)||null
  return <fieldset className="fieldset-sgpc" style={{margin:0}}><legend style={{fontSize: compact? '1.05rem':'1.15rem'}}>{label}</legend>
  <Select options={options} value={sel} onChange={(opt:any)=>onChange(opt?.value??'')} isDisabled={isDisabled} placeholder="Todos" isSearchable maxMenuHeight={200} classNamePrefix="react-select" menuPortalTarget={typeof window!=='undefined'?document.body:null} menuPosition="fixed"
  styles={{control:(b:any,s:any)=>({...b, height: compact? '3.8rem':'4rem', minHeight: compact? '3.8rem':'4rem', borderRadius:'0.8rem', borderColor: s.isFocused? 'var(--color-primario)':'#e2e8f0', boxShadow:'none', marginTop:'0.3rem', background:'#fff', fontSize:'1.25rem'}), valueContainer:(b:any)=>({...b, padding:'0 1rem'}), menu:(b:any)=>({...b, zIndex:9999}), option:(b:any,s:any)=>({...b, backgroundColor: s.isSelected? 'var(--color-primario)': s.isFocused? '#eff6ff':'#fff', color: s.isSelected? '#fff':'#1e293b'})}} />
  </fieldset>
}

export default function ReporteAsignacionSupervisores(){
  const supabase = createClient()
  const [periodos,setPeriodos]=useState<any[]>([])
  const [filiales,setFiliales]=useState<any[]>([])
  const [supervisores,setSupervisores]=useState<any[]>([])
  const [datos,setDatos]=useState<any[]>([])
  const [loading,setLoading]=useState(false)
  const [total,setTotal]=useState(0)
  const [pagina,setPagina]=useState(1)
  const [perPage,setPerPage]=useState(10)
  const [showFilters,setShowFilters]=useState(false)
  const [openGeneral,setOpenGeneral]=useState(true)

  const [filtroPeriodo,setFiltroPeriodo]=useState<number|''>('')
  const [filtroFilial,setFiltroFilial]=useState<number|''>('')
  const [filtroSupervisor,setFiltroSupervisor]=useState<number|''>('')
  const [searchDocente,setSearchDocente]=useState('')
  const [idEpsSel,setIdEpsSel]=useState<number|null>(null)
  const [epsOptions,setEpsOptions]=useState<any[]>([])

  const [showDetalle,setShowDetalle]=useState(false)
  const [detalleNRC,setDetalleNRC]=useState<any>(null)
  const [detalleHorario,setDetalleHorario]=useState<any[]>([])
  const [detalleEstudiantes,setDetalleEstudiantes]=useState<any[]>([])

  useEffect(()=>{ fetchMaestros() },[])
  useEffect(()=>{ handleBuscar() },[pagina, perPage])
  useEffect(()=>{ if(filtroPeriodo) {setPagina(1); handleBuscar()} },[filtroPeriodo])

  const fetchMaestros = async()=>{
    const [perRes, filRes, supRes] = await Promise.all([
      supabase.from('periodoacademico').select('*').order('fecha_inicio',{ascending:false}),
      supabase.from('filial').select('*'),
      supabase.from('supervisor').select('*, persona(*)').eq('estado','ACTIVO')
    ])
    setPeriodos(perRes.data||[]); setFiliales(filRes.data||[]); setSupervisores(supRes.data||[])
    if(perRes.data?.[0]) setFiltroPeriodo(perRes.data[0].idpa)
  }

  const loadEpsOptions = async(input:string)=>{
    let q=supabase.from('eps').select('ideps, razonsocial, ruc').eq('estado','ACTIVO').limit(50).order('razonsocial')
    if(input) q=q.ilike('razonsocial', `%${input}%`)
    const {data}=await q
    const opts=data?.map((e:any)=>({value:e.ideps, label:`${e.razonsocial} - ${e.ruc||'S/RUC'}` }))||[]
    setEpsOptions(opts); return opts
  }

  const handleBuscar = async()=>{
    setLoading(true)
    try{
      let idsDocente:number[]|null=null
      if(searchDocente.trim()){
        const esDni=/^\d+$/.test(searchDocente.trim())
        let persQ=supabase.from('persona').select('idpersona')
        if(esDni) persQ=persQ.ilike('dni', `${searchDocente.trim()}%`) as any
        else persQ=persQ.or(`apellidos.ilike.%${searchDocente}%,nombres.ilike.%${searchDocente}%`) as any
        const {data:pers}=await persQ
        const idsPer=pers?.map((p:any)=>p.idpersona)||[]
        if(idsPer.length){
          const {data:docs}=await supabase.from('docente').select('iddocente').in('idpersona', idsPer)
          idsDocente=docs?.map((d:any)=>d.iddocente)||[-1]
        } else idsDocente=[-1]
      }

      // FIX DEFINITIVO: NO EMBEBER SUPERVISOR EN EL SELECT PRINCIPAL PARA EVITAR "more than one relationship"
      let q:any = supabase.from('asignacion_nrc_supervisor').select(`
        idasignacion_nrc,
        idcargaacad,
        idsupervisor,
        idsupervisor_reemplazo,
        fechaasignacion,
        estado,
        cargaacademica:cargaacademica!fk_cargaacad(
          idcargaacad,
          nrc,
          idasignatura,
          idhorariod,
          asignatura:idasignatura(
            idasignatura,
            codigo,
            nombre,
            carrera:carrera(nombrecarrera)
          ),
          horariodocente:horariodocente!inner(
            idhorariod,
            campoclinico:campoclinico!inner(
              idcampocli,
              idpa,
              idfilial,
              ideps,
              iddocente,
              periodoacademico:periodoacademico(idpa, codigo, nombre),
              filial:filial(idfilial, nombrefilial),
              eps:eps(
                ideps,
                razonsocial,
                direccion,
                distrito:distrito(
                  iddistrito,
                  nombredt,
                  provincia:provincia(
                    idprovincia,
                    nombrep,
                    departamento:departamento(iddepartamento, nombred)
                  )
                )
              ),
              docente:docente(
                iddocente,
                persona:persona(dni, apellidos, nombres)
              )
            )
          ),
          horario(
            idhorario,
            detallehorario(dia_semana, hora_inicio, hora_fin),
            matricula(
              idmatricula,
              estudiante:estudiante(
                idestudiante,
                persona(dni, apellidos, nombres)
              )
            )
          )
        )
      `, {count:'exact'}).order('idasignacion_nrc',{ascending:false}).range((pagina-1)*perPage, pagina*perPage-1)

      if(filtroPeriodo) q=q.eq('cargaacademica.horariodocente.campoclinico.idpa', filtroPeriodo)
      if(filtroFilial) q=q.eq('cargaacademica.horariodocente.campoclinico.idfilial', filtroFilial)
      if(filtroSupervisor) q=q.eq('idsupervisor', filtroSupervisor)
      if(idEpsSel) q=q.eq('cargaacademica.horariodocente.campoclinico.ideps', idEpsSel)
      if(idsDocente) q=q.in('cargaacademica.horariodocente.campoclinico.iddocente', idsDocente)

      const {data, error, count}=await q
      if(error) throw error

      // TRAER SUPERVISORES POR SEPARADO - EVITA EL ERROR DE EMBED
      const supIds = [...new Set((data||[]).flatMap((r:any)=>[r.idsupervisor, r.idsupervisor_reemplazo]).filter(Boolean))]
      let mapSup:any={}
      if(supIds.length){
        const {data: supData}=await supabase.from('supervisor').select('idsupervisor, persona(dni, apellidos, nombres)').in('idsupervisor', supIds)
        mapSup = Object.fromEntries((supData||[]).map((s:any)=>[s.idsupervisor, s]))
      }

      const enriched = await Promise.all((data||[]).map(async (row:any)=>{
        const {count: cHor}=await supabase.from('asignacionsupervision').select('*',{count:'exact', head:true}).eq('idasignacion_nrc', row.idasignacion_nrc)
        const {data: asups}=await supabase.from('asignacionsupervision').select(`idasignacions, iddh, detallehorario:iddh(dia_semana, hora_inicio, hora_fin)`).eq('idasignacion_nrc', row.idasignacion_nrc)
        const ids = asups?.map((a:any)=>a.idasignacions)||[]
        let totalVis=0
        if(ids.length){
          const {count}=await supabase.from('visitasupervision').select('*',{count:'exact', head:true}).in('idasignacions', ids)
          totalVis = count||0
        }
        return {
         ...row,
          supervisor: mapSup[row.idsupervisor]||null,
          supervisor_reemplazo: mapSup[row.idsupervisor_reemplazo]||null,
          _totalHorarios: cHor||0,
          _totalVisitas: totalVis
        }
      }))

      setDatos(enriched); setTotal(count||0); setShowFilters(false)
    }catch(e:any){ toast.error(e.message); console.log(e) }
    setLoading(false)
  }

  const handleVerDetalle = async(row:any)=>{
    setDetalleNRC(row)
    setShowDetalle(true)
    const {data: asups}=await supabase.from('asignacionsupervision').select(`idasignacions, iddh, detallehorario:iddh(dia_semana, hora_inicio, hora_fin)`).eq('idasignacion_nrc', row.idasignacion_nrc)
    setDetalleHorario(asups||[])
    const {data: hor}=await supabase.from('horario').select('idhorario, matricula(idmatricula, estudiante(idestudiante, persona(dni, apellidos, nombres)))').eq('idcargaacad', row.cargaacademica.idcargaacad).limit(50)
    const ests = (hor||[]).flatMap((h:any)=> h.matricula? [h.matricula.estudiante] : []).filter((v:any,i:number,a:any[])=> a.findIndex((t:any)=>t.idestudiante===v.idestudiante)===i)
    setDetalleEstudiantes(ests)
  }

  const handlePrintDetalle = ()=>{
    if(!detalleNRC) return
    const win=window.open('','_blank'); if(!win) return
    win.document.write(`<html><head><title>Detalle NRC ${detalleNRC.cargaacademica.nrc}</title><style>body{font-family:Arial;padding:2rem;font-size:12px}h1{color:#1e4da1}.box{border:1px solid #e2e8f0;padding:12px;border-radius:8px;margin-bottom:12px}</style></head><body>
    <h1>NRC ${detalleNRC.cargaacademica.nrc} - ${detalleNRC.cargaacademica.asignatura.nombre}</h1>
    <div class="box"><b>Periodo:</b> ${detalleNRC.cargaacademica.horariodocente.campoclinico.periodoacademico.codigo} | <b>Filial:</b> ${detalleNRC.cargaacademica.horariodocente.campoclinico.filial.nombrefilial}</div>
    <div class="box"><b>Supervisor:</b> ${detalleNRC.supervisor?.persona?.dni||''} - ${detalleNRC.supervisor?.persona?.apellidos||''}, ${detalleNRC.supervisor?.persona?.nombres||''}</div>
    <div class="box"><b>Docente:</b> ${detalleNRC.cargaacademica.horariodocente.campoclinico.docente.persona.dni} - ${detalleNRC.cargaacademica.horariodocente.campoclinico.docente.persona.apellidos}</div>
    <div class="box"><b>EPS:</b> ${detalleNRC.cargaacademica.horariodocente.campoclinico.eps.razonsocial}<br/><b>Dir:</b> ${detalleNRC.cargaacademica.horariodocente.campoclinico.eps.direccion}<br/>${detalleNRC.cargaacademica.horariodocente.campoclinico.eps.distrito.nombredt} - ${detalleNRC.cargaacademica.horariodocente.campoclinico.eps.distrito.provincia.nombrep} - ${detalleNRC.cargaacademica.horariodocente.campoclinico.eps.distrito.provincia.departamento.nombred}</div>
    <div class="box"><b>Horario:</b> ${detalleHorario.map((h:any)=>`${h.detallehorario?.dia_semana} ${h.detallehorario?.hora_inicio?.slice(0,5)}-${h.detallehorario?.hora_fin?.slice(0,5)}`).join(' | ')}</div>
    <div class="box"><b>Estudiantes (${detalleEstudiantes.length}):</b><br/>${detalleEstudiantes.map((e:any)=>`${e.persona.dni} - ${e.persona.apellidos}, ${e.persona.nombres}`).join('<br/>')}</div>
    <script>window.print()</script></body></html>`); win.document.close()
  }

  const handleExportDetalle = ()=>{
    if(!detalleNRC) return
    const rows=[
      {Campo:'NRC', Valor:detalleNRC.cargaacademica.nrc},
      {Campo:'Periodo', Valor:detalleNRC.cargaacademica.horariodocente.campoclinico.periodoacademico.codigo},
      {Campo:'Filial', Valor:detalleNRC.cargaacademica.horariodocente.campoclinico.filial.nombrefilial},
      {Campo:'Carrera', Valor:detalleNRC.cargaacademica.asignatura.carrera?.nombrecarrera},
      {Campo:'Asignatura', Valor:`${detalleNRC.cargaacademica.asignatura.codigo} - ${detalleNRC.cargaacademica.asignatura.nombre}`},
      {Campo:'Docente DNI', Valor:detalleNRC.cargaacademica.horariodocente.campoclinico.docente.persona.dni},
      {Campo:'Docente', Valor:`${detalleNRC.cargaacademica.horariodocente.campoclinico.docente.persona.apellidos}, ${detalleNRC.cargaacademica.horariodocente.campoclinico.docente.persona.nombres}`},
      {Campo:'Supervisor DNI', Valor:detalleNRC.supervisor?.persona?.dni||''},
      {Campo:'Supervisor', Valor:`${detalleNRC.supervisor?.persona?.apellidos||''}, ${detalleNRC.supervisor?.persona?.nombres||''}`},
      {Campo:'Reemplazo', Valor: detalleNRC.supervisor_reemplazo?.persona? `${detalleNRC.supervisor_reemplazo.persona.apellidos}, ${detalleNRC.supervisor_reemplazo.persona.nombres}`: ''},
      {Campo:'EPS Razon Social', Valor:detalleNRC.cargaacademica.horariodocente.campoclinico.eps.razonsocial},
      {Campo:'Direccion EPS', Valor:detalleNRC.cargaacademica.horariodocente.campoclinico.eps.direccion},
      {Campo:'Distrito', Valor:detalleNRC.cargaacademica.horariodocente.campoclinico.eps.distrito.nombredt},
      {Campo:'Provincia', Valor:detalleNRC.cargaacademica.horariodocente.campoclinico.eps.distrito.provincia.nombrep},
      {Campo:'Departamento', Valor:detalleNRC.cargaacademica.horariodocente.campoclinico.eps.distrito.provincia.departamento.nombred},
      {Campo:'Horario', Valor:detalleHorario.map((h:any)=>`${h.detallehorario?.dia_semana} ${h.detallehorario?.hora_inicio?.slice(0,5)}-${h.detallehorario?.hora_fin?.slice(0,5)}`).join(' | ')},
    ...detalleEstudiantes.map((e:any)=>({Campo:'Estudiante', Valor:`${e.persona.dni} - ${e.persona.apellidos}, ${e.persona.nombres}`}))
    ]
    const ws=XLSX.utils.json_to_sheet(rows); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, `Detalle_${detalleNRC.cargaacademica.nrc}`); XLSX.writeFile(wb, `Detalle_NRC_${detalleNRC.cargaacademica.nrc}_${new Date().toISOString().split('T')[0]}.xlsx`); toast.success('Detalle exportado')
  }

  const handleExport = async()=>{
    const rows = datos.map((r:any)=>({
      'NRC': r.cargaacademica.nrc,
      'Periodo': r.cargaacademica.horariodocente.campoclinico.periodoacademico.codigo,
      'Filial': r.cargaacademica.horariodocente.campoclinico.filial.nombrefilial,
      'Carrera': r.cargaacademica.asignatura.carrera?.nombrecarrera,
      'Asignatura': `${r.cargaacademica.asignatura.codigo} - ${r.cargaacademica.asignatura.nombre}`,
      'DNI Docente': r.cargaacademica.horariodocente.campoclinico.docente.persona.dni,
      'Docente': `${r.cargaacademica.horariodocente.campoclinico.docente.persona.apellidos}, ${r.cargaacademica.horariodocente.campoclinico.docente.persona.nombres}`,
      'EPS': r.cargaacademica.horariodocente.campoclinico.eps.razonsocial,
      'Dirección EPS': r.cargaacademica.horariodocente.campoclinico.eps.direccion,
      'Ubigeo': `${r.cargaacademica.horariodocente.campoclinico.eps.distrito.nombredt} - ${r.cargaacademica.horariodocente.campoclinico.eps.distrito.provincia.nombrep} - ${r.cargaacademica.horariodocente.campoclinico.eps.distrito.provincia.departamento.nombred}`,
      'DNI Supervisor': r.supervisor?.persona?.dni||'',
      'Supervisor': `${r.supervisor?.persona?.apellidos||''}, ${r.supervisor?.persona?.nombres||''}`,
      'Reemplazo': r.supervisor_reemplazo?.persona? `${r.supervisor_reemplazo.persona.apellidos}, ${r.supervisor_reemplazo.persona.nombres}` : '',
      'Total Horarios': r._totalHorarios,
      'Total Visitas': r._totalVisitas,
      'Estado': r.estado,
      'Fecha Asignación': r.fechaasignacion
    }))
    const ws=XLSX.utils.json_to_sheet(rows); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Asignacion_NRC"); XLSX.writeFile(wb, `Reporte_Asignacion_NRC_${new Date().toISOString().split('T')[0]}.xlsx`); toast.success('Excel generado')
  }

  const limpiar=()=>{ setFiltroFilial(''); setFiltroSupervisor(''); setSearchDocente(''); setIdEpsSel(null); setEpsOptions([]); setPagina(1) }
  const totalPag=Math.ceil(total/perPage)
  const filtrosActivos=[filtroFilial, filtroSupervisor, searchDocente, idEpsSel].filter(Boolean).length

  return (
    <div style={{display:'flex', flexDirection:'column', height:'calc(100vh - 6rem)'}}>
      <Toaster position="top-right"/>
      <div style={{height:'6.4rem', minHeight:'6.4rem', background:'#fff', border:'1px solid #e2e8f0', borderRadius:'1.2rem', padding:'0 1.6rem', display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow:'0 1px 2px rgba(0,0,0,.06)'}}>
        <div style={{display:'flex', gap:'1.2rem', alignItems:'center'}}><div style={{width:'3.6rem', height:'3.6rem', background:'var(--color-primario)', borderRadius:'0.8rem', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff'}}><UserCheck size={18}/></div>
        <div><div style={{display:'flex', gap:'0.8rem', alignItems:'center'}}><h1 style={{fontSize:'1.5rem', fontWeight:800}}>Reporte Asignación Supervisores</h1><span style={{background:'#eff6ff', color:'var(--color-primario)', fontSize:'1rem', padding:'0.2rem 0.6rem', borderRadius:'999px', fontWeight:700}}>NRC</span></div><div style={{fontSize:'1.15rem', color:'#64748b'}}>{total} NRC asignados • {filtrosActivos} filtros</div></div></div>
        <div style={{display:'flex', gap:'0.8rem'}}><button onClick={()=>setShowFilters(true)} style={{height:'3.8rem', padding:'0 1.4rem', borderRadius:'0.8rem', border:'1px solid #e2e8f0', background:'#fff', display:'flex', gap:'0.6rem', alignItems:'center', fontWeight:600}}><SlidersHorizontal size={16}/> Filtros {filtrosActivos>0 && <span style={{background:'var(--color-primario)', color:'#fff', fontSize:'1rem', minWidth:'1.8rem', height:'1.8rem', borderRadius:'999px', display:'flex', alignItems:'center', justifyContent:'center'}}>{filtrosActivos}</span>}</button><button onClick={()=>{setPagina(1); handleBuscar()}} style={{height:'3.8rem', padding:'0 1.6rem', borderRadius:'0.8rem', border:'none', background:'var(--color-primario)', color:'#fff', fontWeight:700, display:'flex', gap:'0.6rem', alignItems:'center'}}><Search size={15}/> Generar</button><button onClick={handleExport} style={{height:'3.8rem', width:'3.8rem', borderRadius:'0.8rem', border:'1px solid #e2e8f0', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center'}}><FileSpreadsheet size={16}/></button></div>
      </div>

      <div style={{flex:1, background:'#fff', border:'1px solid #e2e8f0', borderRadius:'1.2rem', marginTop:'1.2rem', display:'flex', flexDirection:'column', overflow:'hidden'}}>
        <div style={{height:'4.8rem', minHeight:'4.8rem', borderBottom:'1px solid #f1f5f9', padding:'0 1.6rem', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fcfdff'}}><div style={{fontSize:'1.25rem', color:'#475569'}}>Mostrando <b>{datos.length? (pagina-1)*perPage+1:0}–{Math.min(pagina*perPage,total)}</b> de <b>{total}</b></div><select value={perPage} onChange={e=>{setPerPage(Number(e.target.value)); setPagina(1)}} style={{border:'1px solid #e2e8f0', borderRadius:'0.6rem', padding:'0.4rem 0.8rem', fontSize:'1.2rem'}}><option value={10}>10 / pág</option><option value={25}>25 / pág</option><option value={50}>50 / pág</option></select></div>
        <div style={{flex:1, overflow:'auto'}}><table style={{width:'100%', borderCollapse:'separate', borderSpacing:0}}><thead style={{position:'sticky', top:0, zIndex:10, background:'#f8fafc'}}><tr><th style={{padding:'1rem 1.2rem', fontSize:'1.05rem', color:'#64748b', textAlign:'left', borderBottom:'1px solid #e2e8f0'}}>#</th><th style={{padding:'1rem 1.2rem', fontSize:'1.05rem', color:'#64748b', textAlign:'left', borderBottom:'1px solid #e2e8f0'}}>PERIODO / FILIAL</th><th style={{padding:'1rem 1.2rem', fontSize:'1.05rem', color:'#64748b', textAlign:'left', borderBottom:'1px solid #e2e8f0'}}>CARRERA / NRC</th><th style={{padding:'1rem 1.2rem', fontSize:'1.05rem', color:'#64748b', textAlign:'left', borderBottom:'1px solid #e2e8f0'}}>ASIGNATURA / DOCENTE</th><th style={{padding:'1rem 1.2rem', fontSize:'1.05rem', color:'#64748b', textAlign:'left', borderBottom:'1px solid #e2e8f0'}}>EPS</th><th style={{padding:'1rem 1.2rem', fontSize:'1.05rem', color:'#64748b', textAlign:'left', borderBottom:'1px solid #e2e8f0'}}>SUPERVISOR</th><th style={{padding:'1rem 1.2rem', fontSize:'1.05rem', color:'#64748b', textAlign:'center', borderBottom:'1px solid #e2e8f0'}}>HOR / VIS</th><th style={{padding:'1rem 1.2rem', fontSize:'1.05rem', color:'#64748b', textAlign:'left', borderBottom:'1px solid #e2e8f0'}}>ESTADO</th><th style={{padding:'1rem 1.2rem', fontSize:'1.05rem', color:'#64748b', textAlign:'center', borderBottom:'1px solid #e2e8f0'}}>VER</th></tr></thead><tbody>
          {loading? [...Array(8)].map((_,i)=><tr key={i}><td colSpan={9} style={{padding:'1.2rem'}}><div style={{height:'2rem', background:'#f1f5f9', borderRadius:'0.4rem'}}></div></td></tr>)
          : datos.length===0? <tr><td colSpan={9} style={{padding:'6rem', textAlign:'center', color:'#64748b'}}>Sin asignaciones</td></tr>
          : datos.map((r:any,i:number)=><tr key={r.idasignacion_nrc} className="row-hover" style={{borderBottom:'1px solid #f8fafc'}}><td style={{padding:'1rem 1.2rem', color:'#94a3b8'}}>{(pagina-1)*perPage+i+1}</td>
            <td style={{padding:'1rem 1.2rem'}}><div style={{fontWeight:700}}>{r.cargaacademica.horariodocente.campoclinico.periodoacademico.codigo}</div><div style={{fontSize:'1.15rem', color:'#64748b'}}>{r.cargaacademica.horariodocente.campoclinico.filial.nombrefilial}</div></td>
            <td style={{padding:'1rem 1.2rem'}}><div style={{fontSize:'1.1rem', color:'#475569', maxWidth:'16rem', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{r.cargaacademica.asignatura.carrera?.nombrecarrera}</div><span style={{background:'var(--color-primario)', color:'#fff', fontSize:'1.05rem', fontWeight:700, padding:'0.2rem 0.6rem', borderRadius:'0.4rem'}}>{r.cargaacademica.nrc}</span></td>
            <td style={{padding:'1rem 1.2rem'}}><div style={{fontWeight:600, fontSize:'1.25rem'}}>{r.cargaacademica.asignatura.codigo}</div><div style={{fontSize:'1.15rem', color:'#475569', maxWidth:'18rem'}}>{r.cargaacademica.asignatura.nombre}</div><div style={{fontSize:'1.1rem', color:'#64748b'}}>{r.cargaacademica.horariodocente.campoclinico.docente.persona.dni} - {r.cargaacademica.horariodocente.campoclinico.docente.persona.apellidos}</div></td>
            <td style={{padding:'1rem 1.2rem', fontSize:'1.15rem', maxWidth:'14rem', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{r.cargaacademica.horariodocente.campoclinico.eps.razonsocial}</td>
            <td style={{padding:'1rem 1.2rem'}}><div style={{fontWeight:600, fontSize:'1.2rem'}}>{r.supervisor?.persona?.apellidos||'-'}</div><div style={{fontSize:'1.1rem', color:'#64748b'}}>{r.supervisor?.persona?.dni||''}</div>{r.supervisor_reemplazo?.persona && <div style={{fontSize:'1rem', color:'#b45309', background:'#fef3c7', padding:'0.1rem 0.4rem', borderRadius:'0.3rem', marginTop:'0.2rem'}}>Reemp: {r.supervisor_reemplazo.persona.apellidos}</div>}</td>
            <td style={{padding:'1rem 1.2rem', textAlign:'center'}}><span style={{background:'#eff6ff', color:'#1e40af', padding:'0.2rem 0.6rem', borderRadius:'999px', fontSize:'1.05rem', fontWeight:700}}>{r._totalHorarios}h / {r._totalVisitas}v</span></td>
            <td style={{padding:'1rem 1.2rem'}}><span style={{padding:'0.3rem 0.7rem', borderRadius:'999px', fontSize:'1.05rem', fontWeight:700, background: r.estado==='PROGRAMADO'? '#f0fdf4':'#f8fafc', color: r.estado==='PROGRAMADO'? '#15803d':'#475569', border:'1px solid #bbf7d0'}}>{r.estado}</span></td>
            <td style={{padding:'1rem 1.2rem', textAlign:'center'}}><button onClick={()=>handleVerDetalle(r)} style={{width:'3.2rem', height:'3.2rem', borderRadius:'0.8rem', border:'1px solid #e2e8f0', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center'}}><Eye size={14}/></button></td>
          </tr>)}
        </tbody></table></div>
        <div style={{height:'5.2rem', minHeight:'5.2rem', borderTop:'1px solid #e2e8f0', padding:'0 1.6rem', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fff'}}><div style={{fontSize:'1.2rem', color:'#64748b'}}>Pág {pagina} de {totalPag||1}</div><div style={{display:'flex', gap:'0.6rem'}}><button onClick={()=>setPagina(p=>Math.max(1,p-1))} disabled={pagina===1} style={{height:'3.6rem', padding:'0 1.2rem', borderRadius:'0.8rem', border:'1px solid #e2e8f0', background:'#fff'}}>Ant</button><div style={{height:'3.6rem', padding:'0 1.2rem', borderRadius:'0.8rem', border:'1px solid #e2e8f0', display:'flex', alignItems:'center'}}>{pagina}/{totalPag||1}</div><button onClick={()=>setPagina(p=>Math.min(totalPag,p+1))} disabled={pagina===totalPag||totalPag===0} style={{height:'3.6rem', padding:'0 1.2rem', borderRadius:'0.8rem', border:'none', background: (pagina===totalPag||totalPag===0)? '#f1f5f9':'var(--color-primario)', color: (pagina===totalPag||totalPag===0)? '#94a3b8':'#fff'}}>Sig</button></div></div>
      </div>

      {showFilters && <div style={{position:'fixed', inset:0, zIndex:50, display:'flex', justifyContent:'flex-end'}}><div onClick={()=>setShowFilters(false)} style={{flex:1, background:'rgba(15,23,42,0.45)', backdropFilter:'blur(4px)'}}></div><div style={{width:'100%', maxWidth:'42rem', background:'#fff', height:'100vh', display:'flex', flexDirection:'column', animation:'slideIn 200ms ease'}}><div style={{height:'6.4rem', padding:'0 2rem', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center'}}><div style={{fontWeight:800}}>Filtros Asignación</div><button onClick={()=>setShowFilters(false)} style={{width:'3.2rem', height:'3.2rem', borderRadius:'0.8rem', border:'1px solid #e2e8f0', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center'}}><X size={16}/></button></div>
      <div style={{flex:1, overflow:'auto', padding:'1.6rem 2rem', display:'flex', flexDirection:'column', gap:'1.2rem'}}><SelectSGPCFieldset compact label="Periodo *" value={filtroPeriodo} onChange={(v:any)=>setFiltroPeriodo(v)} options={periodos.map(p=>({value:p.idpa, label:p.codigo}))} /><SelectSGPCFieldset compact label="Filial" value={filtroFilial} onChange={(v:any)=>setFiltroFilial(v)} options={[{value:'', label:'Todas'},...filiales.map(f=>({value:f.idfilial, label:f.nombrefilial}))]} /><SelectSGPCFieldset compact label="Supervisor" value={filtroSupervisor} onChange={(v:any)=>setFiltroSupervisor(v)} options={[{value:'', label:'Todos'},...supervisores.map(s=>({value:s.idsupervisor, label:`${s.persona?.dni} - ${s.persona?.apellidos}`}))]} /><fieldset className="fieldset-sgpc"><legend>EPS</legend><AsyncSelect cacheOptions defaultOptions loadOptions={loadEpsOptions} value={epsOptions.find(o=>o.value===idEpsSel)||null} onChange={(o:any)=>setIdEpsSel(o?.value||null)} placeholder="Buscar EPS..." isClearable styles={{control:(b:any)=>({...b, height:'3.8rem', marginTop:'0.3rem', borderRadius:'0.8rem'})}} /></fieldset><fieldset className="fieldset-sgpc"><legend>Docente DNI/Nombre</legend><input className="input-sgpc" placeholder="DNI o apellidos..." value={searchDocente} onChange={e=>setSearchDocente(e.target.value)} style={{height:'3.8rem', borderRadius:'0.8rem', marginTop:'0.3rem'}} /></fieldset></div><div style={{padding:'1.4rem 2rem', borderTop:'1px solid #e2e8f0', display:'flex', gap:'1rem'}}><button onClick={limpiar} style={{flex:1, height:'4.2rem', borderRadius:'0.8rem', border:'1px solid #e2e8f0', background:'#fff', fontWeight:600}}><Eraser size={14}/> Limpiar</button><button onClick={()=>{setPagina(1); handleBuscar()}} style={{flex:1.5, height:'4.2rem', borderRadius:'0.8rem', border:'none', background:'var(--color-primario)', color:'#fff', fontWeight:700}}>Aplicar</button></div></div></div>}

      {showDetalle && detalleNRC && <div style={{position:'fixed', inset:0, zIndex:60, display:'flex', justifyContent:'flex-end'}}><div onClick={()=>setShowDetalle(false)} style={{flex:1, background:'rgba(15,23,42,0.45)', backdropFilter:'blur(4px)'}}></div><div style={{width:'100%', maxWidth:'52rem', background:'#fff', height:'100vh', display:'flex', flexDirection:'column', animation:'slideIn 200ms ease'}}>
        <div style={{height:'6.4rem', minHeight:'6.4rem', padding:'0 2rem', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--color-primario)', color:'#fff'}}><div><div style={{fontWeight:800, display:'flex', gap:'0.8rem', alignItems:'center'}}><BookOpen size={18}/> Detalle NRC {detalleNRC.cargaacademica.nrc}</div><div style={{fontSize:'1.15rem', opacity:0.9}}>{detalleNRC.cargaacademica.asignatura.nombre}</div></div><button onClick={()=>setShowDetalle(false)} style={{width:'3.2rem', height:'3.2rem', borderRadius:'0.8rem', border:'none', background:'rgba(255,255,255,0.2)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center'}}><X size={16}/></button></div>
        <div style={{flex:1, overflow:'auto', padding:'2rem', display:'flex', flexDirection:'column', gap:'1.6rem'}}>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
            <div style={{background:'#f8fafc', padding:'1.2rem', borderRadius:'0.8rem'}}><div style={{fontSize:'1.05rem', color:'#64748b', fontWeight:600}}>PERIODO / FILIAL / CARRERA</div><div style={{fontWeight:700, marginTop:'0.4rem'}}>{detalleNRC.cargaacademica.horariodocente.campoclinico.periodoacademico.codigo} - {detalleNRC.cargaacademica.horariodocente.campoclinico.filial.nombrefilial}</div><div style={{fontSize:'1.2rem', color:'#475569'}}>{detalleNRC.cargaacademica.asignatura.carrera?.nombrecarrera}</div></div>
            <div style={{background:'#f0fdf4', padding:'1.2rem', borderRadius:'0.8rem'}}><div style={{fontSize:'1.05rem', color:'#64748b', fontWeight:600}}>SUPERVISOR ASIGNADO</div><div style={{fontWeight:700, marginTop:'0.4rem'}}>{detalleNRC.supervisor?.persona?.apellidos||''}, {detalleNRC.supervisor?.persona?.nombres||''}</div><div style={{fontSize:'1.2rem', color:'#475569'}}>{detalleNRC.supervisor?.persona?.dni||''}</div>{detalleNRC.supervisor_reemplazo?.persona && <div style={{fontSize:'1rem', background:'#fef3c7', padding:'0.2rem 0.5rem', borderRadius:'0.4rem', marginTop:'0.4rem'}}>Reemp: {detalleNRC.supervisor_reemplazo.persona.apellidos}</div>}</div>
          </div>
          <div style={{border:'1px solid #e2e8f0', borderRadius:'0.8rem', padding:'1.2rem'}}><div style={{fontSize:'1.1rem', fontWeight:700, textTransform:'uppercase', color:'#334155', display:'flex', gap:'0.6rem', alignItems:'center'}}><Building2 size={14}/> EPS - Razón Social / Dirección / Ubigeo</div><div style={{marginTop:'0.8rem'}}><div style={{fontWeight:700}}>{detalleNRC.cargaacademica.horariodocente.campoclinico.eps.razonsocial}</div><div style={{fontSize:'1.2rem', color:'#475569'}}>{detalleNRC.cargaacademica.horariodocente.campoclinico.eps.direccion||'S/D'}</div><div style={{fontSize:'1.15rem', color:'#64748b', marginTop:'0.4rem', display:'flex', gap:'0.4rem', alignItems:'center'}}><MapPin size={12}/> {detalleNRC.cargaacademica.horariodocente.campoclinico.eps.distrito.nombredt} - {detalleNRC.cargaacademica.horariodocente.campoclinico.eps.distrito.provincia.nombrep} - {detalleNRC.cargaacademica.horariodocente.campoclinico.eps.distrito.provincia.departamento.nombred}</div></div></div>
          <div style={{border:'1px solid #e2e8f0', borderRadius:'0.8rem', padding:'1.2rem'}}><div style={{fontSize:'1.1rem', fontWeight:700, textTransform:'uppercase', color:'#334155', display:'flex', gap:'0.6rem', alignItems:'center'}}><User size={14}/> Docente</div><div style={{marginTop:'0.6rem', display:'flex', gap:'0.8rem', alignItems:'center'}}><span style={{background:'#f1f5f9', padding:'0.2rem 0.6rem', borderRadius:'0.4rem', fontWeight:700}}>{detalleNRC.cargaacademica.horariodocente.campoclinico.docente.persona.dni}</span><span style={{fontWeight:600}}>{detalleNRC.cargaacademica.horariodocente.campoclinico.docente.persona.apellidos}, {detalleNRC.cargaacademica.horariodocente.campoclinico.docente.persona.nombres}</span></div></div>
          <div style={{border:'1px solid #e2e8f0', borderRadius:'0.8rem', padding:'1.2rem'}}><div style={{fontSize:'1.1rem', fontWeight:700, textTransform:'uppercase', color:'#334155', display:'flex', gap:'0.6rem'}}><Clock size={14}/> Horario Asignado - Días y Horas</div><div style={{marginTop:'0.8rem', display:'flex', flexWrap:'wrap', gap:'0.6rem'}}>{detalleHorario.map((h:any,i:number)=><span key={i} style={{background:'#eff6ff', color:'#1e40af', padding:'0.4rem 0.8rem', borderRadius:'999px', fontSize:'1.15rem', fontWeight:600}}>{h.detallehorario?.dia_semana} {h.detallehorario?.hora_inicio?.slice(0,5)} - {h.detallehorario?.hora_fin?.slice(0,5)}</span>)}{detalleHorario.length===0 && <span style={{color:'#94a3b8'}}>Sin horarios</span>}</div></div>
          <div style={{border:'1px solid #e2e8f0', borderRadius:'0.8rem', padding:'1.2rem'}}><div style={{fontSize:'1.1rem', fontWeight:700, textTransform:'uppercase', color:'#334155', display:'flex', gap:'0.6rem'}}><Users size={14}/> Estudiantes Matriculados en el NRC ({detalleEstudiantes.length})</div><div style={{marginTop:'0.8rem', maxHeight:'20rem', overflow:'auto', display:'flex', flexDirection:'column', gap:'0.4rem'}}>{detalleEstudiantes.map((est:any)=><div key={est.idestudiante} style={{display:'flex', justifyContent:'space-between', padding:'0.6rem 0.8rem', background:'#f8fafc', borderRadius:'0.6rem', fontSize:'1.2rem'}}><span style={{fontWeight:600}}>{est.persona.dni}</span><span>{est.persona.apellidos}, {est.persona.nombres}</span></div>)}{detalleEstudiantes.length===0 && <span style={{color:'#94a3b8'}}>Sin estudiantes</span>}</div></div>
        </div>
        <div style={{padding:'1.4rem 2rem', borderTop:'1px solid #e2e8f0', background:'#fcfdff', display:'flex', justifyContent:'space-between', alignItems:'center', gap:'1rem'}}>
          <div style={{display:'flex', gap:'0.8rem'}}>
            <button onClick={handlePrintDetalle} style={{height:'4.2rem', padding:'0 1.4rem', borderRadius:'0.8rem', border:'1px solid #e2e8f0', background:'#fff', fontWeight:600, display:'flex', alignItems:'center', gap:'0.6rem'}}><FileCheck size={16}/> Imprimir</button>
            <button onClick={handleExportDetalle} style={{height:'4.2rem', padding:'0 1.4rem', borderRadius:'0.8rem', border:'none', background:'#0f172a', color:'#fff', fontWeight:700, display:'flex', alignItems:'center', gap:'0.6rem'}}><FileSpreadsheet size={16}/> Exportar Detalle</button>
          </div>
          <button onClick={()=>setShowDetalle(false)} style={{height:'4.2rem', padding:'0 1.6rem', borderRadius:'0.8rem', border:'1px solid #e2e8f0', background:'#fff', fontWeight:600}}>Cerrar</button>
        </div>
      </div></div>}

      <style>{`.row-hover:hover{ background:#E8F0FE!important; } @keyframes slideIn{ from{ transform: translateX(100%); } to{ transform: translateX(0); } }.fieldset-sgpc{ border:none; padding:0; }.fieldset-sgpc legend{ padding:0 0 0.3rem 0; font-weight:600; color:#334155; }.input-sgpc{ border:1px solid #e2e8f0; width:100%; padding:0 1rem; }.input-sgpc:focus{ outline:none; border-color:var(--color-primario); }`}</style>
    </div>
  )
}