'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/client'
import { Search, Eraser, FileSpreadsheet, Hospital, ChevronLeft, ChevronRight, MapPin, Building2, Filter, Clock, X, SlidersHorizontal, ChevronDown, Layers, UserCheck } from 'lucide-react'
import Select from '@/components/ui/SelectClient'
import AsyncSelect from 'react-select/async'
import { Toaster, toast } from 'react-hot-toast'
import * as XLSX from 'xlsx'

const SelectSGPCFieldset = ({label, value, onChange, options, isDisabled = false, compact=false}:any) => {
  const selected = options.find((o:any) => o.value === value) || null
  return (
    <fieldset className="fieldset-sgpc" style={{margin:0}}>
      <legend style={{fontSize: compact ? '1.05rem' : '1.15rem'}}>{label}</legend>
      <Select options={options} value={selected} onChange={(opt:any)=>onChange(opt?.value||null)} isDisabled={isDisabled} placeholder="Todos" isSearchable maxMenuHeight={200} classNamePrefix="react-select" menuPortalTarget={typeof window!=='undefined'?document.body:null} menuPosition="fixed" 
      styles={{ 
        control:(b:any, s:any)=>({...b, height: compact ? '3.8rem' : '4rem', minHeight: compact ? '3.8rem' : '4rem', borderRadius:'0.8rem', borderColor: s.isFocused ? 'var(--color-primario)' : '#e2e8f0', boxShadow: 'none', marginTop:'0.3rem', background:'#fff', fontSize:'1.25rem'}), 
        valueContainer:(b:any)=>({...b, padding:'0 1rem'}), 
        menu:(b:any)=>({...b, zIndex:9999, borderRadius:'0.8rem'}),
        option:(b:any, s:any)=>({...b, backgroundColor: s.isSelected ? 'var(--color-primario)' : s.isFocused ? '#eff6ff' : '#fff', color: s.isSelected ? '#fff' : '#1e293b', fontSize:'1.25rem'})
      }} />
    </fieldset>
  )
}

export default function ReporteCampoClinicoPage() {
  const supabase = createClient()
  const [periodos, setPeriodos] = useState<any[]>([])
  const [filiales, setFiliales] = useState<any[]>([])
  const [servicios, setServicios] = useState<any[]>([])
  const [departamentos, setDepartamentos] = useState<any[]>([])
  const [provincias, setProvincias] = useState<any[]>([])
  const [distritos, setDistritos] = useState<any[]>([])
  const [tiposEps, setTiposEps] = useState<any[]>([])
  const [epsBase, setEpsBase] = useState<any[]>([])

  const [filtroPeriodo, setFiltroPeriodo] = useState<number|''>('')
  const [filtroFilial, setFiltroFilial] = useState<number|''>('')
  const [filtroEstado, setFiltroEstado] = useState('ACTIVO')
  const [filtroServicio, setFiltroServicio] = useState<number|''>('')
  const [searchDocente, setSearchDocente] = useState('')
  const [idDeptoSel, setIdDeptoSel] = useState<number|null>(null)
  const [idProvSel, setIdProvSel] = useState<number|null>(null)
  const [idDistSel, setIdDistSel] = useState<number|null>(null)
  const [idTipoEpsSel, setIdTipoEpsSel] = useState<number|null>(null)
  const [idEpsSel, setIdEpsSel] = useState<number|null>(null)

  const [datos, setDatos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [epsOptions, setEpsOptions] = useState<any[]>([])

  // Drawer & acordeon
  const [showFilters, setShowFilters] = useState(false)
  const [openGeneral, setOpenGeneral] = useState(true)
  const [openUbigeo, setOpenUbigeo] = useState(false)

  const departamentosConEps = useMemo(()=>{
    const idsDist=[...new Set(epsBase.map((e:any)=>e.iddistrito))]
    const idsProv=[...new Set(distritos.filter((d:any)=>idsDist.includes(d.iddistrito)).map((d:any)=>d.idprovincia))]
    const idsDepto=[...new Set(provincias.filter((p:any)=>idsProv.includes(p.idprovincia)).map((p:any)=>p.iddepartamento))]
    return departamentos.filter((d:any)=>idsDepto.includes(d.iddepartamento))
  },[epsBase, departamentos, provincias, distritos])

  const provinciasConEps = useMemo(()=>{
    const idsDist=[...new Set(epsBase.map((e:any)=>e.iddistrito))]
    return provincias.filter((p:any)=>distritos.some((d:any)=>d.idprovincia===p.idprovincia && idsDist.includes(d.iddistrito)))
  },[epsBase, provincias, distritos])

  const distritosConEps = useMemo(()=>{
    const idsDist=[...new Set(epsBase.map((e:any)=>e.iddistrito))]
    return distritos.filter((d:any)=>idsDist.includes(d.iddistrito))
  },[epsBase, distritos])

  const loadEpsOptions = async(input:string)=>{
    let q=supabase.from('eps').select('ideps, razonsocial, ruc, iddistrito, idtipoeps').eq('estado','ACTIVO').limit(50).order('razonsocial')
    if(input) q=q.ilike('razonsocial', `%${input}%`)
    if(idDeptoSel){
      const idsProv=provincias.filter((p:any)=>p.iddepartamento===idDeptoSel).map((p:any)=>p.idprovincia)
      const idsDist=distritos.filter((d:any)=>idsProv.includes(d.idprovincia)).map((d:any)=>d.iddistrito)
      if(idsDist.length) q=q.in('iddistrito', idsDist)
    }
    if(idProvSel){
      const idsDist=distritos.filter((d:any)=>d.idprovincia===idProvSel).map((d:any)=>d.iddistrito)
      if(idsDist.length) q=q.in('iddistrito', idsDist)
    }
    if(idDistSel) q=q.eq('iddistrito', idDistSel)
    if(idTipoEpsSel) q=q.eq('idtipoeps', idTipoEpsSel)
    const {data}=await q
    const opts=data?.map((e:any)=>({value:e.ideps, label:`${e.razonsocial} - ${e.ruc||'S/RUC'}`}))||[]
    setEpsOptions(opts); return opts
  }

  useEffect(()=>{ fetchMaestros() },[])
  useEffect(()=>{ handleBuscar() },[pagina, perPage])

  const fetchMaestros = async()=>{
    const [tipoRes, perRes, filRes, servRes, deptoRes, provRes, distRes, epsRes]=await Promise.all([
      supabase.from('tipoeps').select('*').order('nombretipoeps'),
      supabase.from('periodoacademico').select('*').order('fecha_inicio',{ascending:false}),
      supabase.from('filial').select('*'),
      supabase.from('serviciosalud').select('*'),
      supabase.from('departamento').select('iddepartamento, nombred').eq('estado','ACTIVO').order('nombred'),
      supabase.from('provincia').select('idprovincia, nombrep, iddepartamento').eq('estado','ACTIVO').order('nombrep'),
      supabase.from('distrito').select('iddistrito, nombredt, idprovincia').eq('estado','ACTIVO').order('nombredt'),
      supabase.from('eps').select('ideps, razonsocial, idtipoeps, ruc, iddistrito').eq('estado','ACTIVO'),
    ])
    setTiposEps(tipoRes.data||[]); setPeriodos(perRes.data||[]); setFiliales(filRes.data||[]); setServicios(servRes.data||[])
    setDepartamentos(deptoRes.data||[]); setProvincias(provRes.data||[]); setDistritos(distRes.data||[]); setEpsBase(epsRes.data||[])
    if(perRes.data?.[0]) { setFiltroPeriodo(perRes.data[0].idpa); }
  }
  
  // auto buscar al cargar periodo inicial
  useEffect(()=>{ if(filtroPeriodo) handleBuscar() },[filtroPeriodo])

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
      let idsDistUbigeo:number[]|null=null
      if(idDistSel) idsDistUbigeo=[idDistSel]
      else if(idProvSel) idsDistUbigeo=distritos.filter((d:any)=>d.idprovincia===idProvSel).map((d:any)=>d.iddistrito)
      else if(idDeptoSel){
        const idsProv=provincias.filter((p:any)=>p.iddepartamento===idDeptoSel).map((p:any)=>p.idprovincia)
        idsDistUbigeo=distritos.filter((d:any)=>idsProv.includes(d.idprovincia)).map((d:any)=>d.iddistrito)
      }
      let idsEpsPorUbigeo:number[]|null=null
      if(idsDistUbigeo && idsDistUbigeo.length){
        const {data:epsUb}=await supabase.from('eps').select('ideps').in('iddistrito', idsDistUbigeo)
        idsEpsPorUbigeo=epsUb?.map((e:any)=>e.ideps)||[-1]
      }
      let countQ:any=supabase.from('campoclinico').select('*', {count:'exact', head:true})
      if(filtroPeriodo) countQ=countQ.eq('idpa', filtroPeriodo)
      if(filtroFilial) countQ=countQ.eq('idfilial', filtroFilial)
      if(filtroEstado) countQ=countQ.eq('estado', filtroEstado)
      if(filtroServicio) countQ=countQ.eq('idservicios', filtroServicio)
      if(idEpsSel) countQ=countQ.eq('ideps', idEpsSel)
      if(idsDocente) countQ=countQ.in('iddocente', idsDocente)
      if(idsEpsPorUbigeo) countQ=countQ.in('ideps', idsEpsPorUbigeo)
      if(idTipoEpsSel){
        const {data:epsTipo}=await supabase.from('eps').select('ideps').eq('idtipoeps', idTipoEpsSel)
        const ids=epsTipo?.map((e:any)=>e.ideps)||[-1]
        countQ=countQ.in('ideps', ids)
      }
      const {count}=await countQ
      setTotal(count||0)

      let dataQ:any=supabase.from('campoclinico').select(`
        idcampocli, estado, ideps, idservicios, iddocente, idpa, idfilial,
        eps(*, distrito(*, provincia(*, departamento(*)))),
        serviciosalud(*),
        docente(*, persona(*), profesion(*), especialidad(*)),
        periodoacademico(*),
        filial(*),
        horariodocente(dia_semana, hora_inicio, hora_fin)
      `).order('idcampocli',{ascending:false}).range((pagina-1)*perPage, pagina*perPage-1)

      if(filtroPeriodo) dataQ=dataQ.eq('idpa', filtroPeriodo)
      if(filtroFilial) dataQ=dataQ.eq('idfilial', filtroFilial)
      if(filtroEstado) dataQ=dataQ.eq('estado', filtroEstado)
      if(filtroServicio) dataQ=dataQ.eq('idservicios', filtroServicio)
      if(idEpsSel) dataQ=dataQ.eq('ideps', idEpsSel)
      if(idsDocente) dataQ=dataQ.in('iddocente', idsDocente)
      if(idsEpsPorUbigeo) dataQ=dataQ.in('ideps', idsEpsPorUbigeo)
      if(idTipoEpsSel){
        const {data:epsTipo}=await supabase.from('eps').select('ideps').eq('idtipoeps', idTipoEpsSel)
        const ids=epsTipo?.map((e:any)=>e.ideps)||[-1]
        dataQ=dataQ.in('ideps', ids)
      }
      const {data, error}=await dataQ
      if(error) throw error
      setDatos(data||[])
      setShowFilters(false)
    }catch(e:any){ toast.error(e.message) }
    setLoading(false)
  }

  const handleExportExcel = async()=>{
    setLoading(true)
    try{
      let dataQ:any=supabase.from('campoclinico').select(`
        idcampocli, estado, eps(razonsocial, ruc, distrito(nombredt, provincia(nombrep, departamento(nombred)))),
        serviciosalud(nombre), docente(persona(dni, apellidos, nombres), profesion(profesion), especialidad(especialidad)),
        periodoacademico(codigo, nombre), filial(nombrefilial), horariodocente(dia_semana, hora_inicio, hora_fin)
      `).order('idcampocli',{ascending:false}).limit(5000)
      if(filtroPeriodo) dataQ=dataQ.eq('idpa', filtroPeriodo)
      if(filtroEstado) dataQ=dataQ.eq('estado', filtroEstado)
      const {data}=await dataQ
      const rows=(data||[]).map((c:any,i:number)=>({
        '#':i+1, 'EPS':c.eps?.razonsocial, 'RUC':c.eps?.ruc, 'Departamento':c.eps?.distrito?.provincia?.departamento?.nombred,
        'Provincia':c.eps?.distrito?.provincia?.nombrep, 'Distrito':c.eps?.distrito?.nombredt, 'Servicio':c.serviciosalud?.nombre,
        'DNI':c.docente?.persona?.dni, 'Docente':`${c.docente?.persona?.apellidos}, ${c.docente?.persona?.nombres}`,
        'Periodo':c.periodoacademico?.codigo, 'Filial':c.filial?.nombrefilial, 'Horario':(c.horariodocente||[]).map((h:any)=>`${h.dia_semana} ${h.hora_inicio}-${h.hora_fin}`).join(' | '), 'Estado':c.estado
      }))
      const ws=XLSX.utils.json_to_sheet(rows); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "CampoClinico")
      XLSX.writeFile(wb, `Reporte_CampoClinico_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success('Excel generado')
    }catch(e:any){ toast.error(e.message) }
    setLoading(false)
  }

  const limpiar = ()=>{ setFiltroFilial(''); setFiltroServicio(''); setFiltroEstado('ACTIVO'); setSearchDocente(''); setIdDeptoSel(null); setIdProvSel(null); setIdDistSel(null); setIdTipoEpsSel(null); setIdEpsSel(null); setEpsOptions([]); setPagina(1) }
  const totalPag = Math.ceil(total/perPage)
  const filtrosActivos = [filtroFilial, filtroServicio, idDeptoSel, idProvSel, idDistSel, idTipoEpsSel, idEpsSel, searchDocente, filtroEstado !== 'ACTIVO' ? filtroEstado : null].filter(Boolean).length

  return (
    <div style={{display:'flex', flexDirection:'column', height:'calc(100vh - 6rem)', gap:'0'}}>
      <Toaster position="top-right"/>
      
      {/* HEADER 64PX COMPACTO - STICKY */}
      <div style={{height:'6.4rem', minHeight:'6.4rem', background:'#fff', border:'1px solid #e2e8f0', borderRadius:'1.2rem', padding:'0 1.6rem', display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow:'0 1px 2px rgba(0,0,0,.06), 0 4px 12px rgba(0,0,0,.04)', position:'sticky', top:0, zIndex:20}}>
        <div style={{display:'flex', alignItems:'center', gap:'1.2rem'}}>
          <div style={{width:'3.6rem', height:'3.6rem', background:'var(--color-primario)', borderRadius:'0.8rem', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff'}}><Hospital size={18}/></div>
          <div>
            <div style={{display:'flex', alignItems:'center', gap:'0.8rem'}}>
              <h1 style={{fontSize:'1.5rem', fontWeight:800, color:'#0f172a', letterSpacing:'-0.01em'}}>Reporte Campo Clínico</h1>
              <span style={{background:'#f1f5f9', color:'#475569', fontSize:'1rem', padding:'0.2rem 0.6rem', borderRadius:'999px', fontWeight:600, border:'1px solid #e2e8f0'}}>PILOTO 1</span>
            </div>
            <div style={{fontSize:'1.15rem', color:'#64748b', marginTop:'0.1rem'}}>{total} registros • {filtrosActivos>0 ? `${filtrosActivos} filtro${filtrosActivos>1?'s':''} activo${filtrosActivos>1?'s':''}` : 'Sin filtros'}</div>
          </div>
        </div>
        <div style={{display:'flex', gap:'0.8rem', alignItems:'center'}}>
          <button onClick={()=>setShowFilters(true)} style={{height:'3.8rem', padding:'0 1.4rem', borderRadius:'0.8rem', border:'1px solid #e2e8f0', background:'#fff', display:'flex', alignItems:'center', gap:'0.6rem', fontSize:'1.25rem', fontWeight:600, color:'#334155', position:'relative'}}>
            <SlidersHorizontal size={16}/> Filtros {filtrosActivos>0 && <span style={{background:'var(--color-primario)', color:'#fff', fontSize:'1rem', minWidth:'1.8rem', height:'1.8rem', borderRadius:'999px', display:'flex', alignItems:'center', justifyContent:'center', padding:'0 0.4rem'}}>{filtrosActivos}</span>}
          </button>
          <button onClick={()=>{setPagina(1); handleBuscar()}} style={{height:'3.8rem', padding:'0 1.6rem', borderRadius:'0.8rem', border:'none', background:'var(--color-primario)', color:'#fff', fontWeight:700, fontSize:'1.25rem', display:'flex', alignItems:'center', gap:'0.6rem'}}><Search size={15}/> Generar</button>
          <button onClick={handleExportExcel} style={{height:'3.8rem', width:'3.8rem', borderRadius:'0.8rem', border:'1px solid #e2e8f0', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center'}} title="Exportar Excel"><FileSpreadsheet size={16} color="#334155"/></button>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL - TABLA PROTAGONISTA */}
      <div style={{flex:1, background:'#fff', border:'1px solid #e2e8f0', borderRadius:'1.2rem', marginTop:'1.2rem', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 1px 2px rgba(0,0,0,.06)'}}>
        {/* TOOLBAR TABLA */}
        <div style={{height:'4.8rem', minHeight:'4.8rem', borderBottom:'1px solid #f1f5f9', padding:'0 1.6rem', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fcfdff'}}>
          <div style={{fontSize:'1.25rem', color:'#475569', fontWeight:500, display:'flex', gap:'1.2rem', alignItems:'center'}}>
            <span>Mostrando <b style={{color:'#0f172a'}}>{datos.length ? (pagina-1)*perPage+1 : 0}–{Math.min(pagina*perPage,total)}</b> de <b style={{color:'#0f172a'}}>{total}</b></span>
            <span style={{width:'1px', height:'1.6rem', background:'#e2e8f0'}}></span>
            <select value={perPage} onChange={e=>{setPerPage(Number(e.target.value)); setPagina(1)}} style={{border:'1px solid #e2e8f0', borderRadius:'0.6rem', padding:'0.4rem 0.8rem', fontSize:'1.2rem', background:'#fff'}}>
              <option value={10}>10 / pág</option><option value={25}>25 / pág</option><option value={50}>50 / pág</option>
            </select>
          </div>
          <div style={{fontSize:'1.15rem', color:'#94a3b8', display:'flex', alignItems:'center', gap:'0.6rem'}}><Clock size={12}/> Actualizado ahora</div>
        </div>

        {/* TABLA CON SCROLL PROPIO + HEADER STICKY */}
        <div style={{flex:1, overflow:'auto'}}>
          <table style={{width:'100%', borderCollapse:'separate', borderSpacing:0}}>
            <thead style={{position:'sticky', top:0, zIndex:10, background:'#f8fafc'}}>
              <tr>
                <th style={{textAlign:'left', padding:'1rem 1.6rem', fontSize:'1.05rem', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:'1px solid #e2e8f0', whiteSpace:'nowrap'}}>#</th>
                <th style={{textAlign:'left', padding:'1rem 1.6rem', fontSize:'1.05rem', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:'1px solid #e2e8f0'}}>EPS / Ubigeo</th>
                <th style={{textAlign:'left', padding:'1rem 1.6rem', fontSize:'1.05rem', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:'1px solid #e2e8f0'}}>Servicio</th>
                <th style={{textAlign:'left', padding:'1rem 1.6rem', fontSize:'1.05rem', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:'1px solid #e2e8f0'}}>Docente</th>
                <th style={{textAlign:'left', padding:'1rem 1.6rem', fontSize:'1.05rem', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:'1px solid #e2e8f0'}}>Periodo / Filial</th>
                <th style={{textAlign:'left', padding:'1rem 1.6rem', fontSize:'1.05rem', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:'1px solid #e2e8f0'}}>Horario</th>
                <th style={{textAlign:'left', padding:'1rem 1.6rem', fontSize:'1.05rem', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:'1px solid #e2e8f0'}}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(8)].map((_,i)=><tr key={i}><td colSpan={7} style={{padding:'1.2rem 1.6rem'}}><div style={{height:'2rem', background:'#f1f5f9', borderRadius:'0.4rem', animation:'pulse 1.5s infinite'}}></div></td></tr>)
              ) : datos.length===0 ? (
                <tr><td colSpan={7} style={{padding:'6rem 2rem', textAlign:'center'}}><div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'1rem'}}><div style={{width:'4.8rem', height:'4.8rem', background:'#f1f5f9', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center'}}><Search size={20} color="#94a3b8"/></div><div style={{fontWeight:600, color:'#334155'}}>Sin resultados</div><div style={{fontSize:'1.25rem', color:'#64748b', maxWidth:'28rem'}}>No hay registros para los filtros actuales. Prueba ajustando los criterios.</div><button onClick={limpiar} style={{marginTop:'0.8rem', border:'1px solid #e2e8f0', background:'#fff', padding:'0.8rem 1.6rem', borderRadius:'0.8rem', fontSize:'1.25rem', fontWeight:600}}>Limpiar filtros</button></div></td></tr>
              ) : datos.map((c:any,i:number)=>(
                <tr key={c.idcampocli} style={{borderBottom:'1px solid #f8fafc'}} className="row-hover">
                  <td style={{padding:'1rem 1.6rem', fontSize:'1.25rem', color:'#94a3b8', fontWeight:500}}>{(pagina-1)*perPage+i+1}</td>
                  <td style={{padding:'1rem 1.6rem'}}>
                    <div style={{fontWeight:700, color:'#0f172a', fontSize:'1.3rem', lineHeight:1.3}}>{c.eps?.razonsocial}</div>
                    <div style={{fontSize:'1.15rem', color:'#64748b', display:'flex', gap:'0.3rem', marginTop:'0.2rem'}}><span>{c.eps?.distrito?.nombredt}</span><span>•</span><span>{c.eps?.distrito?.provincia?.nombrep}</span></div>
                  </td>
                  <td style={{padding:'1rem 1.6rem'}}><span style={{background:'#eff6ff', color:'#1e40af', padding:'0.3rem 0.8rem', borderRadius:'999px', fontSize:'1.15rem', fontWeight:600, whiteSpace:'nowrap'}}>{c.serviciosalud?.nombre || '—'}</span></td>
                  <td style={{padding:'1rem 1.6rem'}}>
                    <div style={{display:'flex', alignItems:'center', gap:'0.6rem'}}><span style={{fontSize:'1.1rem', background:'#f1f5f9', padding:'0.15rem 0.5rem', borderRadius:'0.4rem', fontWeight:700, color:'#334155'}}>{c.docente?.persona?.dni}</span><span style={{fontWeight:600, fontSize:'1.25rem', color:'#0f172a'}}>{c.docente?.persona?.apellidos}</span></div>
                    <div style={{fontSize:'1.2rem', color:'#475569', marginTop:'0.1rem'}}>{c.docente?.persona?.nombres}</div>
                  </td>
                  <td style={{padding:'1rem 1.6rem'}}>
                    <div style={{fontSize:'1.2rem', fontWeight:600, color:'#0f172a'}}>{c.periodoacademico?.codigo}</div>
                    <div style={{fontSize:'1.15rem', color:'#64748b'}}>{c.filial?.nombrefilial||'-'}</div>
                  </td>
                  <td style={{padding:'1rem 1.6rem'}}><div style={{display:'flex', flexWrap:'wrap', gap:'0.3rem', maxWidth:'20rem'}}>{(c.horariodocente||[]).slice(0,3).map((h:any, idx:number)=><span key={idx} style={{background:'#f8fafc', border:'1px solid #f1f5f9', padding:'0.2rem 0.5rem', borderRadius:'0.4rem', fontSize:'1.05rem'}}>{h.dia_semana?.slice(0,3)} {h.hora_inicio?.slice(0,5)}</span>)}{(c.horariodocente?.length>3) && <span style={{fontSize:'1.05rem', color:'#64748b'}}>+{c.horariodocente.length-3}</span>}{!c.horariodocente?.length && <span style={{color:'#94a3b8', fontSize:'1.15rem'}}>—</span>}</div></td>
                  <td style={{padding:'1rem 1.6rem'}}><span style={{padding:'0.35rem 0.8rem', borderRadius:'999px', fontSize:'1.05rem', fontWeight:700, background: c.estado==='ACTIVO'?'#f0fdf4':'#fef2f2', color: c.estado==='ACTIVO'?'#15803d':'#991b1b', border:`1px solid ${c.estado==='ACTIVO'?'#bbf7d0':'#fecaca'}`}}>{c.estado}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PAGINACION FOOTER STICKY */}
        <div style={{height:'5.2rem', minHeight:'5.2rem', borderTop:'1px solid #e2e8f0', padding:'0 1.6rem', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fff'}}>
          <div style={{fontSize:'1.2rem', color:'#64748b'}}>Página {pagina} de {totalPag || 1}</div>
          <div style={{display:'flex', gap:'0.6rem'}}>
            <button onClick={()=>setPagina(p=>Math.max(1,p-1))} disabled={pagina===1} style={{height:'3.6rem', padding:'0 1.2rem', borderRadius:'0.8rem', border:'1px solid #e2e8f0', background: pagina===1 ? '#f8fafc' : '#fff', color: pagina===1 ? '#94a3b8' : '#334155', display:'flex', alignItems:'center', gap:'0.4rem', fontSize:'1.25rem', fontWeight:600}}><ChevronLeft size={14}/> Ant</button>
            <div style={{height:'3.6rem', padding:'0 1.2rem', borderRadius:'0.8rem', border:'1px solid #e2e8f0', display:'flex', alignItems:'center', fontSize:'1.2rem', fontWeight:600, background:'#fff'}}>{pagina} / {totalPag || 1}</div>
            <button onClick={()=>setPagina(p=>Math.min(totalPag,p+1))} disabled={pagina===totalPag || totalPag===0} style={{height:'3.6rem', padding:'0 1.2rem', borderRadius:'0.8rem', border:'none', background: (pagina===totalPag || totalPag===0) ? '#f1f5f9' : 'var(--color-primario)', color: (pagina===totalPag || totalPag===0) ? '#94a3b8' : '#fff', display:'flex', alignItems:'center', gap:'0.4rem', fontSize:'1.25rem', fontWeight:600}}>Sig <ChevronRight size={14}/></button>
          </div>
        </div>
      </div>

      {/* DRAWER FILTROS */}
      {showFilters && (
        <div style={{position:'fixed', inset:0, zIndex:50, display:'flex', justifyContent:'flex-end'}}>
          <div onClick={()=>setShowFilters(false)} style={{flex:1, background:'rgba(15,23,42,0.45)', backdropFilter:'blur(4px)', animation:'fadeIn 200ms ease'}}></div>
          <div style={{width:'100%', maxWidth:'42rem', background:'#fff', height:'100vh', display:'flex', flexDirection:'column', boxShadow:'-8px 0 32px rgba(0,0,0,0.12)', animation:'slideIn 200ms ease'}}>
            {/* Drawer header */}
            <div style={{height:'6.4rem', minHeight:'6.4rem', padding:'0 2rem', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <div style={{display:'flex', alignItems:'center', gap:'1rem'}}><div style={{width:'3.2rem', height:'3.2rem', background:'#eff6ff', borderRadius:'0.8rem', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--color-primario)'}}><Filter size={16}/></div><div><div style={{fontWeight:800, fontSize:'1.4rem'}}>Filtros</div><div style={{fontSize:'1.15rem', color:'#64748b'}}>{filtrosActivos} aplicados • {total} resultados</div></div></div>
              <button onClick={()=>setShowFilters(false)} style={{width:'3.2rem', height:'3.2rem', borderRadius:'0.8rem', border:'1px solid #e2e8f0', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center'}}><X size={16}/></button>
            </div>

            <div style={{flex:1, overflow:'auto', padding:'1.6rem 2rem', display:'flex', flexDirection:'column', gap:'1.6rem'}}>
              {/* Busqueda rapida */}
              <div style={{background:'#f8fafc', padding:'1.2rem', borderRadius:'1rem', border:'1px solid #f1f5f9'}}>
                <div style={{fontSize:'1.1rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'#475569', marginBottom:'1rem', display:'flex', alignItems:'center', gap:'0.6rem'}}><Search size={12}/> Búsqueda Rápida</div>
                <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
                  <fieldset className="fieldset-sgpc" style={{margin:0}}><legend style={{fontSize:'1.05rem'}}>EPS / Clínica</legend><AsyncSelect cacheOptions defaultOptions loadOptions={loadEpsOptions} value={epsOptions.find(o=>o.value===idEpsSel)||null} onChange={(opt:any)=>setIdEpsSel(opt?.value||null)} placeholder="Escriba para buscar..." isClearable styles={{ control:(b:any)=>({...b, height:'3.8rem', marginTop:'0.3rem', borderRadius:'0.8rem'}), menu:(b:any)=>({...b, zIndex:9999})}} /></fieldset>
                  <fieldset className="fieldset-sgpc" style={{margin:0}}><legend style={{fontSize:'1.05rem'}}>Docente DNI / Apellidos</legend><div style={{position:'relative', marginTop:'0.3rem'}}><UserCheck size={14} style={{position:'absolute', left:'1rem', top:'50%', transform:'translateY(-50%)', color:'#94a3b8'}}/><input className="input-sgpc" placeholder="Ej: 12345678 o Quispe..." value={searchDocente} onChange={e=>setSearchDocente(e.target.value)} style={{height:'3.8rem', paddingLeft:'3rem', borderRadius:'0.8rem', fontSize:'1.25rem'}} /></div></fieldset>
                </div>
              </div>

              {/* GENERALES */}
              <div style={{border:'1px solid #e2e8f0', borderRadius:'1rem', overflow:'hidden'}}>
                <button onClick={()=>setOpenGeneral(!openGeneral)} style={{width:'100%', height:'4.4rem', padding:'0 1.4rem', display:'flex', justifyContent:'space-between', alignItems:'center', background: openGeneral ? '#fcfdff' : '#fff', border:'none', borderBottom: openGeneral ? '1px solid #f1f5f9' : 'none', cursor:'pointer'}}>
                  <span style={{display:'flex', alignItems:'center', gap:'0.8rem', fontWeight:700, fontSize:'1.25rem'}}><Building2 size={14} color="var(--color-primario)"/> Generales</span><ChevronDown size={16} style={{transform: openGeneral ? 'rotate(180deg)' : 'rotate(0)', transition:'transform 200ms'}}/>
                </button>
                {openGeneral && <div style={{padding:'1.2rem', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
                  <SelectSGPCFieldset compact label="Periodo *" value={filtroPeriodo} onChange={(v:any)=>setFiltroPeriodo(v)} options={periodos.map((p:any)=>({value:p.idpa, label:`${p.codigo}`}))} />
                  <SelectSGPCFieldset compact label="Filial" value={filtroFilial} onChange={(v:any)=>setFiltroFilial(v)} options={[{value:'', label:'Todas'},...filiales.map((f:any)=>({value:f.idfilial, label:f.nombrefilial}))]} />
                  <SelectSGPCFieldset compact label="Estado" value={filtroEstado} onChange={(v:any)=>setFiltroEstado(v)} options={[{value:'', label:'Todos'}, {value:'ACTIVO', label:'Activo'}, {value:'INACTIVO', label:'Inactivo'}]} />
                  <SelectSGPCFieldset compact label="Servicio" value={filtroServicio} onChange={(v:any)=>setFiltroServicio(v)} options={[{value:'', label:'Todos'},...servicios.map((s:any)=>({value:s.idservicios, label:s.nombre}))]} />
                </div>}
              </div>

              {/* UBIGEO - cerrado por defecto */}
              <div style={{border:'1px solid #e2e8f0', borderRadius:'1rem', overflow:'hidden'}}>
                <button onClick={()=>setOpenUbigeo(!openUbigeo)} style={{width:'100%', height:'4.4rem', padding:'0 1.4rem', display:'flex', justifyContent:'space-between', alignItems:'center', background: openUbigeo ? '#fcfdff' : '#fff', border:'none', borderBottom: openUbigeo ? '1px solid #f1f5f9' : 'none', cursor:'pointer'}}>
                  <span style={{display:'flex', alignItems:'center', gap:'0.8rem', fontWeight:700, fontSize:'1.25rem'}}><MapPin size={14} color="var(--color-primario)"/> Ubigeo EPS { (idDeptoSel||idProvSel||idDistSel) && <span style={{background:'var(--color-primario)', color:'#fff', fontSize:'1rem', padding:'0.1rem 0.6rem', borderRadius:'999px'}}>•</span>}</span><ChevronDown size={16} style={{transform: openUbigeo ? 'rotate(180deg)' : 'rotate(0)', transition:'transform 200ms'}}/>
                </button>
                {openUbigeo && <div style={{padding:'1.2rem', display:'flex', flexDirection:'column', gap:'1rem'}}>
                  <div style={{position:'relative', paddingLeft:'1.2rem', borderLeft:'2px solid #e2e8f0', display:'flex', flexDirection:'column', gap:'1rem'}}>
                    <SelectSGPCFieldset compact label="Departamento" value={idDeptoSel} onChange={(v:any)=>{setIdDeptoSel(v); setIdProvSel(null); setIdDistSel(null); setIdEpsSel(null); setEpsOptions([])}} options={[{value:null, label:'Todos'},...departamentosConEps.map((d:any)=>({value:d.iddepartamento, label:d.nombred}))]} />
                    <SelectSGPCFieldset compact label="Provincia" value={idProvSel} onChange={(v:any)=>{setIdProvSel(v); setIdDistSel(null); setIdEpsSel(null); setEpsOptions([])}} options={[{value:null, label:'Todos'},...provinciasConEps.filter((p:any)=>!idDeptoSel||p.iddepartamento===idDeptoSel).map((p:any)=>({value:p.idprovincia, label:p.nombrep}))]} isDisabled={!idDeptoSel} />
                    <SelectSGPCFieldset compact label="Distrito" value={idDistSel} onChange={(v:any)=>{setIdDistSel(v); setIdEpsSel(null); setEpsOptions([])}} options={[{value:null, label:'Todos'},...distritosConEps.filter((d:any)=>!idProvSel||d.idprovincia===idProvSel).map((d:any)=>({value:d.iddistrito, label:d.nombredt}))]} isDisabled={!idProvSel} />
                  </div>
                  <SelectSGPCFieldset compact label="Tipo EPS" value={idTipoEpsSel} onChange={(v:any)=>{setIdTipoEpsSel(v); setIdEpsSel(null); setEpsOptions([])}} options={[{value:null, label:'Todos'},...tiposEps.map((t:any)=>({value:t.idtipoeps, label:t.nombretipoeps}))]} />
                </div>}
              </div>
            </div>

            {/* FOOTER STICKY */}
            <div style={{padding:'1.4rem 2rem', borderTop:'1px solid #e2e8f0', display:'flex', gap:'1rem', background:'#fff'}}>
              <button onClick={limpiar} style={{flex:1, height:'4.2rem', borderRadius:'0.8rem', border:'1px solid #e2e8f0', background:'#fff', fontWeight:600, fontSize:'1.25rem', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.6rem'}}><Eraser size={14}/> Limpiar</button>
              <button onClick={()=>{setPagina(1); handleBuscar()}} style={{flex:1.5, height:'4.2rem', borderRadius:'0.8rem', border:'none', background:'var(--color-primario)', color:'#fff', fontWeight:700, fontSize:'1.25rem', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.6rem'}}><Filter size={14}/> Aplicar filtros</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .row-hover:hover{ background:#E8F0FE !important; }
        @keyframes slideIn{ from{ transform: translateX(100%); } to{ transform: translateX(0); } }
        @keyframes fadeIn{ from{ opacity:0; } to{ opacity:1; } }
        @keyframes pulse{ 0%,100%{ opacity:1 } 50%{ opacity:0.5 } }
        .fieldset-sgpc{ border:none; padding:0; }
        .fieldset-sgpc legend{ padding:0 0 0.3rem 0; font-weight:600; color:#334155; }
        .input-sgpc{ border:1px solid #e2e8f0; width:100%; }
        .input-sgpc:focus{ outline:none; border-color:var(--color-primario); box-shadow:0 0 0 2px rgba(30,77,161,0.12); }
        @media(max-width:768px){
          div[style*="height:calc(100vh"]{ height:auto !important; }
        }
      `}</style>
    </div>
  )
}