'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/client'
import { Search, Eraser, FileSpreadsheet, BookOpen, Users, Clock, ChevronLeft, ChevronRight, Building2, MapPin, Filter, X, SlidersHorizontal, ChevronDown, Layers, GraduationCap, Hash, Eye, FileCheck, User } from 'lucide-react'
import Select from '@/components/ui/SelectClient'
import AsyncSelect from 'react-select/async'
import { Toaster, toast } from 'react-hot-toast'
import * as XLSX from 'xlsx'

const SelectSGPCFieldset = ({label, value, onChange, options, isDisabled = false, compact=false}:any) => {
  const selected = options.find((o:any) => o.value === value) || null
  return (
    <fieldset className="fieldset-sgpc" style={{margin:0}}><legend style={{fontSize: compact? '1.05rem' : '1.15rem'}}>{label}</legend>
      <Select options={options} value={selected} onChange={(opt:any)=>onChange(opt?.value||null)} isDisabled={isDisabled} placeholder="Todos" isSearchable maxMenuHeight={200} classNamePrefix="react-select" menuPortalTarget={typeof window!=='undefined'?document.body:null} menuPosition="fixed"
      styles={{
        control:(b:any,s:any)=>({...b, height: compact? '3.8rem' : '4rem', minHeight: compact? '3.8rem' : '4rem', borderRadius:'0.8rem', borderColor: s.isFocused? 'var(--color-primario)' : '#e2e8f0', boxShadow:'none', marginTop:'0.3rem', background:'#fff', fontSize:'1.25rem'}),
        valueContainer:(b:any)=>({...b, padding:'0 1rem'}),
        menu:(b:any)=>({...b, zIndex:9999, borderRadius:'0.8rem'}),
        option:(b:any,s:any)=>({...b, backgroundColor: s.isSelected? 'var(--color-primario)' : s.isFocused? '#eff6ff' : '#fff', color: s.isSelected? '#fff' : '#1e293b', fontSize:'1.25rem'})
      }} />
    </fieldset>
  )
}

export default function ReporteCargaAcademica(){
  const supabase = createClient()
  const [periodos, setPeriodos] = useState<any[]>([])
  const [filiales, setFiliales] = useState<any[]>([])
  const [carreras, setCarreras] = useState<any[]>([])
  const [datos, setDatos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(1)
  const [perPage, setPerPage] = useState(10)

  const [filtroPeriodo, setFiltroPeriodo] = useState<number|''>('')
  const [filtroFilial, setFiltroFilial] = useState<number|''>('')
  const [filtroCarrera, setFiltroCarrera] = useState<number|''>('')
  const [filtroNRC, setFiltroNRC] = useState('')
  const [searchDocente, setSearchDocente] = useState('')
  const [searchAsignatura, setSearchAsignatura] = useState('')
  const [idEpsSel, setIdEpsSel] = useState<number|null>(null)
  const [epsOptions, setEpsOptions] = useState<any[]>([])

  const [showFilters, setShowFilters] = useState(false)
  const [openAcad, setOpenAcad] = useState(true)
  const [openBusq, setOpenBusq] = useState(true)

  // --- NUEVO: DETALLE NRC 52rem ---
  const [showDetalle, setShowDetalle] = useState(false)
  const [detalleNRC, setDetalleNRC] = useState<any>(null)
  const [detalleHorario, setDetalleHorario] = useState<any[]>([])
  const [detalleEstudiantes, setDetalleEstudiantes] = useState<any[]>([])
  const [detalleEPSFull, setDetalleEPSFull] = useState<any>(null)

  useEffect(()=>{ fetchMaestros() },[])
  useEffect(()=>{ handleBuscar() },[pagina, perPage])

  const fetchMaestros = async()=>{
    const [perRes, filRes, carRes] = await Promise.all([
      supabase.from('periodoacademico').select('*').order('fecha_inicio',{ascending:false}),
      supabase.from('filial').select('*'),
      supabase.from('carrera').select('idcarrera, nombrecarrera').eq('estado','ACTIVO')
    ])
    setPeriodos(perRes.data||[]); setFiliales(filRes.data||[]); setCarreras(carRes.data||[])
    if(perRes.data?.[0]) setFiltroPeriodo(perRes.data[0].idpa)
  }
  useEffect(()=>{ if(filtroPeriodo) handleBuscar() },[filtroPeriodo])

  const loadEpsOptions = async(input:string)=>{
    let q = supabase.from('eps').select('ideps, razonsocial, ruc').eq('estado','ACTIVO').limit(50).order('razonsocial')
    if(input) q = q.ilike('razonsocial', `%${input}%`)
    const {data} = await q
    const opts = data?.map((e:any)=>({value:e.ideps, label:`${e.razonsocial} - ${e.ruc||'S/RUC'}` }))||[]
    setEpsOptions(opts); return opts
  }

  const handleBuscar = async()=>{
    setLoading(true)
    try{
      let idsDocente:number[]|null=null
      if(searchDocente.trim()){
        const esDni=/^\d+$/.test(searchDocente.trim())
        let persQ = supabase.from('persona').select('idpersona')
        if(esDni) persQ = persQ.ilike('dni', `${searchDocente.trim()}%`) as any
        else persQ = persQ.or(`apellidos.ilike.%${searchDocente}%,nombres.ilike.%${searchDocente}%`) as any
        const {data:pers}=await persQ
        const idsPer=pers?.map((p:any)=>p.idpersona)||[]
        if(idsPer.length){
          const {data:docs}=await supabase.from('docente').select('iddocente').in('idpersona', idsPer)
          idsDocente=docs?.map((d:any)=>d.iddocente)||[-1]
        } else idsDocente=[-1]
      }
      let idsAsignatura:number[]|null=null
      if(filtroCarrera || searchAsignatura.trim()){
        let asigQ = supabase.from('asignatura').select('idasignatura')
        if(filtroCarrera) asigQ = asigQ.eq('idcarrera', filtroCarrera) as any
        if(searchAsignatura.trim()) asigQ = asigQ.or(`codigo.ilike.%${searchAsignatura}%,nombre.ilike.%${searchAsignatura}%`) as any
        const {data:asigs}=await asigQ.limit(200)
        idsAsignatura=asigs?.map((a:any)=>a.idasignatura)||[-1]
      }
      let dataQ:any = supabase.from('cargaacademica').select(`
        idcargaacad, nrc, estado, idasignatura, idhorariod,
        asignatura:idasignatura!inner(idasignatura, codigo, nombre, idcarrera, carrera:idcarrera(nombrecarrera), planasignatura:idplan(nombre)),
        horariodocente:idhorariod!inner(
          idhorariod,
          campoclinico:idcampocli!inner(
            idcampocli, idpa, idfilial, ideps, iddocente,
            periodoacademico:idpa(codigo, nombre),
            filial:idfilial(nombrefilial),
            eps:ideps!inner(ideps, razonsocial, direccion, distrito:iddistrito(iddistrito, nombredt, provincia:idprovincia(nombrep, departamento:iddepartamento(nombred)))),
            docente:iddocente!inner(iddocente, persona:idpersona(dni, apellidos, nombres), profesion(profesion), especialidad(especialidad))
          )
        ),
        horario(idhorario, detallehorario(dia_semana, hora_inicio, hora_fin), matricula(idmatricula, estudiante:estudiante(idestudiante, persona(dni, apellidos, nombres))))
      `, {count:'exact'}).eq('estado','ACTIVO').order('idcargaacad',{ascending:false}).range((pagina-1)*perPage, pagina*perPage-1)

      if(filtroPeriodo) dataQ = dataQ.eq('horariodocente.campoclinico.idpa', filtroPeriodo)
      if(filtroFilial) dataQ = dataQ.eq('horariodocente.campoclinico.idfilial', filtroFilial)
      if(idEpsSel) dataQ = dataQ.eq('horariodocente.campoclinico.ideps', idEpsSel)
      if(idsDocente) dataQ = dataQ.in('horariodocente.campoclinico.iddocente', idsDocente)
      if(idsAsignatura) dataQ = dataQ.in('idasignatura', idsAsignatura)
      if(filtroNRC) dataQ = dataQ.ilike('nrc', `%${filtroNRC}%`)

      const {data, error, count}=await dataQ
      if(error) throw error
      setDatos(data||[]); setTotal(count||0)
      setShowFilters(false)
    }catch(e:any){ toast.error(e.message) }
    setLoading(false)
  }

  // --- NUEVO: VER DETALLE ---
  const handleVerDetalle = async(c:any)=>{
    setDetalleNRC(c)
    setDetalleEPSFull(c.horariodocente?.campoclinico?.eps || null)
    // Horario: juntar todos los detallehorario de todos los horarios del NRC
    const todosDetalle = (c.horario||[]).flatMap((h:any)=> h.detallehorario||[])
    const unicos = todosDetalle.filter((v:any,i:number,a:any[])=> a.findIndex((t:any)=> t.dia_semana===v.dia_semana && t.hora_inicio===v.hora_inicio)===i)
    setDetalleHorario(unicos)
    // Estudiantes unicos por dni
    const ests = (c.horario||[]).map((h:any)=>h.matricula?.estudiante).filter(Boolean)
    const estsUnicos = ests.filter((v:any,i:number,a:any[])=> a.findIndex((t:any)=> t.idestudiante===v.idestudiante)===i)
    setDetalleEstudiantes(estsUnicos)
    setShowDetalle(true)
  }

  const handlePrintDetalle = () => {
    if(!detalleNRC) return
    const win = window.open('', '_blank')
    if(!win) return
    win.document.write(`
      <html><head><title>Detalle NRC ${detalleNRC.nrc}</title>
      <style>body{font-family:Arial;padding:2rem;font-size:12px} h1{color:#1e4da1}.box{border:1px solid #e2e8f0;padding:12px;border-radius:8px;margin-bottom:12px}.badge{background:#1e4da1;color:#fff;padding:2px 8px;border-radius:4px}</style>
      </head><body>
        <h1>Detalle NRC <span class="badge">${detalleNRC.nrc}</span> - ${detalleNRC.asignatura?.nombre||''}</h1>
        <div class="box"><b>Periodo:</b> ${detalleNRC.horariodocente?.campoclinico?.periodoacademico?.codigo} | <b>Filial:</b> ${detalleNRC.horariodocente?.campoclinico?.filial?.nombrefilial} | <b>Carrera:</b> ${detalleNRC.asignatura?.carrera?.nombrecarrera}</div>
        <div class="box"><b>Asignatura:</b> ${detalleNRC.asignatura?.codigo} - ${detalleNRC.asignatura?.nombre} | <b>NRC:</b> ${detalleNRC.nrc}</div>
        <div class="box"><b>Docente:</b> ${detalleNRC.horariodocente?.campoclinico?.docente?.persona?.dni} - ${detalleNRC.horariodocente?.campoclinico?.docente?.persona?.apellidos}, ${detalleNRC.horariodocente?.campoclinico?.docente?.persona?.nombres}</div>
        <div class="box"><b>EPS:</b> ${detalleEPSFull?.razonsocial||''}<br/><b>Dirección:</b> ${detalleEPSFull?.direccion||'S/D'}<br/><b>Distrito:</b> ${detalleEPSFull?.distrito?.nombredt||''} | <b>Provincia:</b> ${detalleEPSFull?.distrito?.provincia?.nombrep||''} | <b>Departamento:</b> ${detalleEPSFull?.distrito?.provincia?.departamento?.nombred||''}</div>
        <div class="box"><b>Horario:</b> ${detalleHorario.map((d:any)=>`${d.dia_semana} ${d.hora_inicio?.slice(0,5)}-${d.hora_fin?.slice(0,5)}`).join(' | ')}</div>
        <div class="box"><b>Estudiantes (${detalleEstudiantes.length}):</b><br/>${detalleEstudiantes.map((e:any)=>`${e.persona?.dni} - ${e.persona?.apellidos}, ${e.persona?.nombres}`).join('<br/>')}</div>
        <script>window.print()</script>
      </body></html>
    `)
    win.document.close()
  }

  const handleExportDetalle = () => {
    if(!detalleNRC) return
    const rows = [
      { Campo: 'NRC', Valor: detalleNRC.nrc },
      { Campo: 'Periodo', Valor: detalleNRC.horariodocente?.campoclinico?.periodoacademico?.codigo },
      { Campo: 'Filial', Valor: detalleNRC.horariodocente?.campoclinico?.filial?.nombrefilial },
      { Campo: 'Carrera', Valor: detalleNRC.asignatura?.carrera?.nombrecarrera },
      { Campo: 'Asignatura', Valor: `${detalleNRC.asignatura?.codigo} - ${detalleNRC.asignatura?.nombre}` },
      { Campo: 'Docente DNI', Valor: detalleNRC.horariodocente?.campoclinico?.docente?.persona?.dni },
      { Campo: 'Docente', Valor: `${detalleNRC.horariodocente?.campoclinico?.docente?.persona?.apellidos}, ${detalleNRC.horariodocente?.campoclinico?.docente?.persona?.nombres}` },
      { Campo: 'EPS Razon Social', Valor: detalleEPSFull?.razonsocial },
      { Campo: 'Dirección EPS', Valor: detalleEPSFull?.direccion },
      { Campo: 'Distrito', Valor: detalleEPSFull?.distrito?.nombredt },
      { Campo: 'Provincia', Valor: detalleEPSFull?.distrito?.provincia?.nombrep },
      { Campo: 'Departamento', Valor: detalleEPSFull?.distrito?.provincia?.departamento?.nombred },
      { Campo: 'Horario', Valor: detalleHorario.map((d:any)=>`${d.dia_semana} ${d.hora_inicio?.slice(0,5)}-${d.hora_fin?.slice(0,5)}`).join(' | ') },
     ...detalleEstudiantes.map((e:any)=>({ Campo: 'Estudiante', Valor: `${e.persona?.dni} - ${e.persona?.apellidos}, ${e.persona?.nombres}` }))
    ]
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `Detalle_${detalleNRC.nrc}`)
    XLSX.writeFile(wb, `Detalle_NRC_${detalleNRC.nrc}_${new Date().toISOString().split('T')[0]}.xlsx`)
    toast.success('Detalle exportado')
  }

  const handleExport = async()=>{
    setLoading(true)
    try{
      let q:any = supabase.from('cargaacademica').select(`
        nrc, estado,
        asignatura:idasignatura(codigo, nombre, carrera:idcarrera(nombrecarrera), planasignatura:idplan(nombre)),
        horariodocente:idhorariod(campoclinico:idcampocli(periodoacademico:idpa(codigo), filial:idfilial(nombrefilial), eps:ideps(razonsocial, distrito(nombredt)), docente:iddocente(persona(dni, apellidos, nombres), profesion(profesion), especialidad(especialidad)))),
        horario(detallehorario(dia_semana, hora_inicio, hora_fin), matricula(estudiante:estudiante(persona(dni, apellidos, nombres))))
      `).eq('estado','ACTIVO').limit(2000)
      if(filtroPeriodo) q=q.eq('horariodocente.campoclinico.idpa', filtroPeriodo)
      const {data}=await q
      const rows = (data||[]).flatMap((c:any)=>{
        const estudiantes = c.horario||[]
        if(estudiantes.length===0) return [{
          'Periodo': c.horariodocente?.campoclinico?.periodoacademico?.codigo,
          'Filial': c.horariodocente?.campoclinico?.filial?.nombrefilial,
          'Carrera': c.asignatura?.carrera?.nombrecarrera,
          'NRC': c.nrc,
          'Asignatura': `${c.asignatura?.codigo} - ${c.asignatura?.nombre}`,
          'Docente': `${c.horariodocente?.campoclinico?.docente?.persona?.apellidos}, ${c.horariodocente?.campoclinico?.docente?.persona?.nombres}`,
          'EPS': c.horariodocente?.campoclinico?.eps?.razonsocial,
          'Total Estudiantes': 0
        }]
        return estudiantes.map((h:any)=>({
          'Periodo': c.horariodocente?.campoclinico?.periodoacademico?.codigo,
          'Filial': c.horariodocente?.campoclinico?.filial?.nombrefilial,
          'Carrera': c.asignatura?.carrera?.nombrecarrera,
          'NRC': c.nrc,
          'Asignatura': `${c.asignatura?.codigo} - ${c.asignatura?.nombre}`,
          'Docente': `${c.horariodocente?.campoclinico?.docente?.persona?.apellidos}, ${c.horariodocente?.campoclinico?.docente?.persona?.nombres}`,
          'EPS': c.horariodocente?.campoclinico?.eps?.razonsocial,
          'Horario': (h.detallehorario||[]).map((d:any)=>`${d.dia_semana} ${d.hora_inicio?.slice(0,5)}-${d.hora_fin?.slice(0,5)}`).join(' | '),
          'Estudiante': `${h.matricula?.estudiante?.persona?.apellidos}, ${h.matricula?.estudiante?.persona?.nombres}`,
        }))
      })
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "CargaAcademica")
      XLSX.writeFile(wb, `Reporte_CargaAcademica_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success('Excel generado')
    }catch(e:any){ toast.error(e.message) }
    setLoading(false)
  }

  const limpiar = ()=>{ setFiltroFilial(''); setFiltroCarrera(''); setFiltroNRC(''); setSearchDocente(''); setSearchAsignatura(''); setIdEpsSel(null); setEpsOptions([]); setPagina(1) }
  const totalPag = Math.ceil(total/perPage)
  const filtrosActivos = [filtroFilial, filtroCarrera, filtroNRC, searchDocente, searchAsignatura, idEpsSel].filter(v=>v!=='' && v!==null && v!==undefined).length

  return (
    <div style={{display:'flex', flexDirection:'column', height:'calc(100vh - 6rem)', gap:'0'}}>
      <Toaster position="top-right"/>

      {/* HEADER 64PX - ORIGINAL CONSERVADO */}
      <div style={{height:'6.4rem', minHeight:'6.4rem', background:'#fff', border:'1px solid #e2e8f0', borderRadius:'1.2rem', padding:'0 1.6rem', display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow:'0 1px 2px rgba(0,0,0,.06), 0 4px 12px rgba(0,0,0,.04)', position:'sticky', top:0, zIndex:20}}>
        <div style={{display:'flex', alignItems:'center', gap:'1.2rem'}}>
          <div style={{width:'3.6rem', height:'3.6rem', background:'var(--color-primario)', borderRadius:'0.8rem', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff'}}><BookOpen size={18}/></div>
          <div>
            <div style={{display:'flex', alignItems:'center', gap:'0.8rem'}}>
              <h1 style={{fontSize:'1.5rem', fontWeight:800, color:'#0f172a'}}>Reporte Carga Académica</h1>
              <span style={{background:'#eff6ff', color:'var(--color-primario)', fontSize:'1rem', padding:'0.2rem 0.6rem', borderRadius:'999px', fontWeight:700, border:'1px solid #dbeafe'}}>NRC</span>
            </div>
            <div style={{fontSize:'1.15rem', color:'#64748b', marginTop:'0.1rem', display:'flex', gap:'1rem'}}><span>{total} cargas</span><span>•</span><span>{filtrosActivos>0? `${filtrosActivos} filtro${filtrosActivos>1?'s':''}` : 'Sin filtros'}</span></div>
          </div>
        </div>
        <div style={{display:'flex', gap:'0.8rem', alignItems:'center'}}>
          <button onClick={()=>setShowFilters(true)} style={{height:'3.8rem', padding:'0 1.4rem', borderRadius:'0.8rem', border:'1px solid #e2e8f0', background:'#fff', display:'flex', alignItems:'center', gap:'0.6rem', fontSize:'1.25rem', fontWeight:600, color:'#334155'}}>
            <SlidersHorizontal size={16}/> Filtros {filtrosActivos>0 && <span style={{background:'var(--color-primario)', color:'#fff', fontSize:'1rem', minWidth:'1.8rem', height:'1.8rem', borderRadius:'999px', display:'flex', alignItems:'center', justifyContent:'center'}}>{filtrosActivos}</span>}
          </button>
          <button onClick={()=>{setPagina(1); handleBuscar()}} style={{height:'3.8rem', padding:'0 1.6rem', borderRadius:'0.8rem', border:'none', background:'var(--color-primario)', color:'#fff', fontWeight:700, fontSize:'1.25rem', display:'flex', alignItems:'center', gap:'0.6rem'}}><Search size={15}/> Generar</button>
          <button onClick={handleExport} style={{height:'3.8rem', width:'3.8rem', borderRadius:'0.8rem', border:'1px solid #e2e8f0', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center'}}><FileSpreadsheet size={16}/></button>
        </div>
      </div>

      {/* TABLA PROTAGONISTA - ORIGINAL + COLUMNA VER NUEVA */}
      <div style={{flex:1, background:'#fff', border:'1px solid #e2e8f0', borderRadius:'1.2rem', marginTop:'1.2rem', display:'flex', flexDirection:'column', overflow:'hidden'}}>
        <div style={{height:'4.8rem', minHeight:'4.8rem', borderBottom:'1px solid #f1f5f9', padding:'0 1.6rem', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fcfdff'}}>
          <div style={{fontSize:'1.25rem', color:'#475569', display:'flex', gap:'1.2rem', alignItems:'center'}}>
            <span>Mostrando <b style={{color:'#0f172a'}}>{datos.length? (pagina-1)*perPage+1 : 0}–{Math.min(pagina*perPage,total)}</b> de <b style={{color:'#0f172a'}}>{total}</b></span>
            <select value={perPage} onChange={e=>{setPerPage(Number(e.target.value)); setPagina(1)}} style={{border:'1px solid #e2e8f0', borderRadius:'0.6rem', padding:'0.4rem 0.8rem', fontSize:'1.2rem', background:'#fff'}}>
              <option value={10}>10 / pág</option><option value={25}>25 / pág</option><option value={50}>50 / pág</option>
            </select>
          </div>
          <div style={{fontSize:'1.15rem', color:'#94a3b8', display:'flex', gap:'0.6rem', alignItems:'center'}}><Layers size={12}/> NRC • Estudiantes • Horario • Detalle</div>
        </div>

        <div style={{flex:1, overflow:'auto'}}>
          <table style={{width:'100%', borderCollapse:'separate', borderSpacing:0}}>
            <thead style={{position:'sticky', top:0, zIndex:10, background:'#f8fafc'}}>
              <tr>
                <th style={{textAlign:'left', padding:'1rem 1.2rem', fontSize:'1.05rem', fontWeight:700, color:'#64748b', borderBottom:'1px solid #e2e8f0'}}>#</th>
                <th style={{textAlign:'left', padding:'1rem 1.2rem', fontSize:'1.05rem', fontWeight:700, color:'#64748b', borderBottom:'1px solid #e2e8f0'}}>PERIODO / FILIAL</th>
                <th style={{textAlign:'left', padding:'1rem 1.2rem', fontSize:'1.05rem', fontWeight:700, color:'#64748b', borderBottom:'1px solid #e2e8f0'}}>CARRERA / NRC</th>
                <th style={{textAlign:'left', padding:'1rem 1.2rem', fontSize:'1.05rem', fontWeight:700, color:'#64748b', borderBottom:'1px solid #e2e8f0'}}>ASIGNATURA</th>
                <th style={{textAlign:'left', padding:'1rem 1.2rem', fontSize:'1.05rem', fontWeight:700, color:'#64748b', borderBottom:'1px solid #e2e8f0'}}>DOCENTE</th>
                <th style={{textAlign:'left', padding:'1rem 1.2rem', fontSize:'1.05rem', fontWeight:700, color:'#64748b', borderBottom:'1px solid #e2e8f0'}}>EPS</th>
                <th style={{textAlign:'center', padding:'1rem 1.2rem', fontSize:'1.05rem', fontWeight:700, color:'#64748b', borderBottom:'1px solid #e2e8f0'}}><Users size={12}/></th>
                <th style={{textAlign:'left', padding:'1rem 1.2rem', fontSize:'1.05rem', fontWeight:700, color:'#64748b', borderBottom:'1px solid #e2e8f0'}}><Clock size={12}/> HORARIO</th>
                {/* NUEVO */}
                <th style={{textAlign:'center', padding:'1rem 1.2rem', fontSize:'1.05rem', fontWeight:700, color:'#64748b', borderBottom:'1px solid #e2e8f0'}}>VER</th>
              </tr>
            </thead>
            <tbody>
              {loading? [...Array(8)].map((_,i)=><tr key={i}><td colSpan={9} style={{padding:'1.2rem'}}><div style={{height:'2rem', background:'#f1f5f9', borderRadius:'0.4rem', animation:'pulse 1.5s infinite'}}></div></td></tr>)
              : datos.length===0? <tr><td colSpan={9} style={{padding:'6rem 2rem', textAlign:'center'}}><div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'1rem'}}><div style={{width:'4.8rem', height:'4.8rem', background:'#f1f5f9', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center'}}><Search size={20} color="#94a3b8"/></div><div style={{fontWeight:600}}>Sin cargas académicas</div><div style={{fontSize:'1.25rem', color:'#64748b'}}>Ajuste periodo o filtros y genere nuevamente</div><button onClick={limpiar} style={{marginTop:'0.8rem', border:'1px solid #e2e8f0', background:'#fff', padding:'0.8rem 1.6rem', borderRadius:'0.8rem', fontWeight:600}}>Limpiar filtros</button></div></td></tr>
              : datos.map((c:any,i:number)=>(
                <tr key={c.idcargaacad} className="row-hover" style={{borderBottom:'1px solid #f8fafc'}}>
                  <td style={{padding:'1rem 1.2rem', fontSize:'1.2rem', color:'#94a3b8'}}>{(pagina-1)*perPage+i+1}</td>
                  <td style={{padding:'1rem 1.2rem'}}><div style={{fontWeight:700, fontSize:'1.2rem', color:'#0f172a'}}>{c.horariodocente?.campoclinico?.periodoacademico?.codigo}</div><div style={{fontSize:'1.15rem', color:'#64748b'}}>{c.horariodocente?.campoclinico?.filial?.nombrefilial}</div></td>
                  <td style={{padding:'1rem 1.2rem'}}><div style={{fontSize:'1.15rem', color:'#475569', maxWidth:'16rem', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{c.asignatura?.carrera?.nombrecarrera}</div><div style={{marginTop:'0.2rem'}}><span style={{background:'var(--color-primario)', color:'#fff', fontSize:'1.05rem', fontWeight:700, padding:'0.2rem 0.6rem', borderRadius:'0.4rem'}}>{c.nrc}</span></div></td>
                  <td style={{padding:'1rem 1.2rem'}}><div style={{fontWeight:600, fontSize:'1.25rem', color:'#0f172a'}}>{c.asignatura?.codigo}</div><div style={{fontSize:'1.15rem', color:'#475569', maxWidth:'18rem'}}>{c.asignatura?.nombre}</div></td>
                  <td style={{padding:'1rem 1.2rem'}}><div style={{display:'flex', gap:'0.4rem', alignItems:'center'}}><span style={{background:'#f1f5f9', fontSize:'1.05rem', padding:'0.15rem 0.5rem', borderRadius:'0.4rem', fontWeight:700}}>{c.horariodocente?.campoclinico?.docente?.persona?.dni}</span></div><div style={{fontSize:'1.2rem', fontWeight:500, marginTop:'0.2rem'}}>{c.horariodocente?.campoclinico?.docente?.persona?.apellidos}</div></td>
                  <td style={{padding:'1rem 1.2rem', fontSize:'1.15rem', color:'#475569', maxWidth:'14rem', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{c.horariodocente?.campoclinico?.eps?.razonsocial}</td>
                  <td style={{padding:'1rem 1.2rem', textAlign:'center'}}><span style={{background:'#f0fdf4', color:'#15803d', border:'1px solid #bbf7d0', padding:'0.3rem 0.7rem', borderRadius:'999px', fontSize:'1.15rem', fontWeight:700}}>{c.horario?.length||0}</span></td>
                  <td style={{padding:'1rem 1.2rem', fontSize:'1.1rem'}}>{(c.horario?.[0]?.detallehorario||[]).slice(0,2).map((d:any)=>`${d.dia_semana.slice(0,3)} ${d.hora_inicio?.slice(0,5)}`).join(', ')}{ (c.horario?.[0]?.detallehorario?.length>2) && ` +${c.horario[0].detallehorario.length-2}`}</td>
                  {/* NUEVO - BOTON VER */}
                  <td style={{padding:'1rem 1.2rem', textAlign:'center'}}>
                    <button onClick={()=>handleVerDetalle(c)} style={{width:'3.2rem', height:'3.2rem', borderRadius:'0.8rem', border:'1px solid #e2e8f0', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'}}>
                      <Eye size={14}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{height:'5.2rem', minHeight:'5.2rem', borderTop:'1px solid #e2e8f0', padding:'0 1.6rem', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fff'}}>
          <div style={{fontSize:'1.2rem', color:'#64748b'}}>Página {pagina} de {totalPag || 1}</div>
          <div style={{display:'flex', gap:'0.6rem'}}>
            <button onClick={()=>setPagina(p=>Math.max(1,p-1))} disabled={pagina===1} style={{height:'3.6rem', padding:'0 1.2rem', borderRadius:'0.8rem', border:'1px solid #e2e8f0', background: pagina===1? '#f8fafc' : '#fff', color: pagina===1? '#94a3b8' : '#334155', fontWeight:600}}><ChevronLeft size={14}/> Ant</button>
            <div style={{height:'3.6rem', padding:'0 1.2rem', borderRadius:'0.8rem', border:'1px solid #e2e8f0', display:'flex', alignItems:'center', fontSize:'1.2rem', fontWeight:600, background:'#fff'}}>{pagina} / {totalPag || 1}</div>
            <button onClick={()=>setPagina(p=>Math.min(totalPag,p+1))} disabled={pagina===totalPag || totalPag===0} style={{height:'3.6rem', padding:'0 1.2rem', borderRadius:'0.8rem', border:'none', background: (pagina===totalPag || totalPag===0)? '#f1f5f9' : 'var(--color-primario)', color: (pagina===totalPag || totalPag===0)? '#94a3b8' : '#fff', fontWeight:600}}>Sig <ChevronRight size={14}/></button>
          </div>
        </div>
      </div>

      {/* DRAWER FILTROS - ORIGINAL CONSERVADO TAL CUAL */}
      {showFilters && (
        <div style={{position:'fixed', inset:0, zIndex:50, display:'flex', justifyContent:'flex-end'}}>
          <div onClick={()=>setShowFilters(false)} style={{flex:1, background:'rgba(15,23,42,0.45)', backdropFilter:'blur(4px)'}}></div>
          <div style={{width:'100%', maxWidth:'42rem', background:'#fff', height:'100vh', display:'flex', flexDirection:'column', boxShadow:'-8px 0 32px rgba(0,0,0,0.12)', animation:'slideIn 200ms ease'}}>
            <div style={{height:'6.4rem', minHeight:'6.4rem', padding:'0 2rem', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <div style={{display:'flex', alignItems:'center', gap:'1rem'}}><div style={{width:'3.2rem', height:'3.2rem', background:'#eff6ff', borderRadius:'0.8rem', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--color-primario)'}}><Filter size={16}/></div><div><div style={{fontWeight:800, fontSize:'1.4rem'}}>Filtros Carga Académica</div><div style={{fontSize:'1.15rem', color:'#64748b'}}>{filtrosActivos} aplicados • {total} cargas</div></div></div>
              <button onClick={()=>setShowFilters(false)} style={{width:'3.2rem', height:'3.2rem', borderRadius:'0.8rem', border:'1px solid #e2e8f0', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center'}}><X size={16}/></button>
            </div>

            <div style={{flex:1, overflow:'auto', padding:'1.6rem 2rem', display:'flex', flexDirection:'column', gap:'1.6rem'}}>
              <div style={{border:'1px solid #e2e8f0', borderRadius:'1rem', overflow:'hidden'}}>
                <button onClick={()=>setOpenAcad(!openAcad)} style={{width:'100%', height:'4.4rem', padding:'0 1.4rem', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fcfdff', border:'none', borderBottom: openAcad? '1px solid #f1f5f9' : 'none', cursor:'pointer'}}>
                  <span style={{display:'flex', alignItems:'center', gap:'0.8rem', fontWeight:700, fontSize:'1.25rem'}}><Building2 size={14} color="var(--color-primario)"/> Académico</span><ChevronDown size={16} style={{transform: openAcad? 'rotate(180deg)' : 'rotate(0)', transition:'transform 200ms'}}/>
                </button>
                {openAcad && <div style={{padding:'1.2rem', display:'flex', flexDirection:'column', gap:'1rem'}}>
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
                    <SelectSGPCFieldset compact label="Periodo *" value={filtroPeriodo} onChange={(v:any)=>setFiltroPeriodo(v)} options={periodos.map(p=>({value:p.idpa, label:`${p.codigo}`}))} />
                    <SelectSGPCFieldset compact label="Filial" value={filtroFilial} onChange={(v:any)=>setFiltroFilial(v)} options={[{value:'', label:'Todas'},...filiales.map(f=>({value:f.idfilial, label:f.nombrefilial}))]} />
                  </div>
                  <SelectSGPCFieldset compact label="Carrera" value={filtroCarrera} onChange={(v:any)=>setFiltroCarrera(v)} options={[{value:'', label:'Todas'},...carreras.map(c=>({value:c.idcarrera, label:c.nombrecarrera}))]} />
                  <fieldset className="fieldset-sgpc" style={{margin:0}}><legend style={{fontSize:'1.05rem'}}>EPS</legend><AsyncSelect cacheOptions defaultOptions loadOptions={loadEpsOptions} value={epsOptions.find(o=>o.value===idEpsSel)||null} onChange={(o:any)=>setIdEpsSel(o?.value||null)} placeholder="Buscar EPS..." isClearable styles={{control:(b:any)=>({...b, height:'3.8rem', marginTop:'0.3rem', borderRadius:'0.8rem'})}} /></fieldset>
                </div>}
              </div>

              <div style={{border:'1px solid #e2e8f0', borderRadius:'1rem', overflow:'hidden'}}>
                <button onClick={()=>setOpenBusq(!openBusq)} style={{width:'100%', height:'4.4rem', padding:'0 1.4rem', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fcfdff', border:'none', borderBottom: openBusq? '1px solid #f1f5f9' : 'none', cursor:'pointer'}}>
                  <span style={{display:'flex', alignItems:'center', gap:'0.8rem', fontWeight:700, fontSize:'1.25rem'}}><Hash size={14} color="var(--color-primario)"/> Búsqueda Rápida</span><ChevronDown size={16} style={{transform: openBusq? 'rotate(180deg)' : 'rotate(0)', transition:'transform 200ms'}}/>
                </button>
                {openBusq && <div style={{padding:'1.2rem', display:'flex', flexDirection:'column', gap:'1rem'}}>
                  <fieldset className="fieldset-sgpc" style={{margin:0}}><legend style={{fontSize:'1.05rem'}}>Docente DNI / Apellidos</legend><input className="input-sgpc" placeholder="DNI o apellidos..." value={searchDocente} onChange={e=>setSearchDocente(e.target.value)} style={{height:'3.8rem', borderRadius:'0.8rem', marginTop:'0.3rem', fontSize:'1.25rem'}} /></fieldset>
                  <fieldset className="fieldset-sgpc" style={{margin:0}}><legend style={{fontSize:'1.05rem'}}>Asignatura Código / Nombre</legend><input className="input-sgpc" placeholder="Ej: ENF101..." value={searchAsignatura} onChange={e=>setSearchAsignatura(e.target.value)} style={{height:'3.8rem', borderRadius:'0.8rem', marginTop:'0.3rem', fontSize:'1.25rem'}} /></fieldset>
                  <fieldset className="fieldset-sgpc" style={{margin:0}}><legend style={{fontSize:'1.05rem'}}>NRC</legend><input className="input-sgpc" placeholder="Ej: 1234..." value={filtroNRC} onChange={e=>setFiltroNRC(e.target.value)} style={{height:'3.8rem', borderRadius:'0.8rem', marginTop:'0.3rem', fontSize:'1.25rem'}} /></fieldset>
                </div>}
              </div>
            </div>

            <div style={{padding:'1.4rem 2rem', borderTop:'1px solid #e2e8f0', display:'flex', gap:'1rem', background:'#fff'}}>
              <button onClick={limpiar} style={{flex:1, height:'4.2rem', borderRadius:'0.8rem', border:'1px solid #e2e8f0', background:'#fff', fontWeight:600, fontSize:'1.25rem', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.6rem'}}><Eraser size={14}/> Limpiar</button>
              <button onClick={()=>{setPagina(1); handleBuscar()}} style={{flex:1.5, height:'4.2rem', borderRadius:'0.8rem', border:'none', background:'var(--color-primario)', color:'#fff', fontWeight:700, fontSize:'1.25rem', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.6rem'}}><Filter size={14}/> Aplicar filtros</button>
            </div>
          </div>
        </div>
      )}

      {/* --- NUEVO: DRAWER DERECHO 52rem DETALLE NRC --- */}
      {showDetalle && detalleNRC && (
        <div style={{position:'fixed', inset:0, zIndex:60, display:'flex', justifyContent:'flex-end'}}>
          <div onClick={()=>setShowDetalle(false)} style={{flex:1, background:'rgba(15,23,42,0.45)', backdropFilter:'blur(4px)'}}></div>
          <div style={{width:'100%', maxWidth:'52rem', background:'#fff', height:'100vh', display:'flex', flexDirection:'column', boxShadow:'-8px 0 32px rgba(0,0,0,0.18)', animation:'slideIn 200ms ease'}}>
            <div style={{height:'6.4rem', minHeight:'6.4rem', padding:'0 2rem', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--color-primario)', color:'#fff'}}>
              <div><div style={{fontWeight:800, fontSize:'1.4rem', display:'flex', gap:'0.8rem', alignItems:'center'}}><BookOpen size={18}/> Detalle NRC {detalleNRC.nrc}</div><div style={{fontSize:'1.15rem', opacity:0.9, marginTop:'0.2rem'}}>{detalleNRC.asignatura?.codigo} - {detalleNRC.asignatura?.nombre}</div></div>
              <button onClick={()=>setShowDetalle(false)} style={{width:'3.2rem', height:'3.2rem', borderRadius:'0.8rem', border:'none', background:'rgba(255,255,255,0.2)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center'}}><X size={16}/></button>
            </div>

            <div style={{flex:1, overflow:'auto', padding:'2rem', display:'flex', flexDirection:'column', gap:'1.6rem'}}>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
                <div style={{background:'#f8fafc', padding:'1.2rem', borderRadius:'0.8rem', border:'1px solid #e2e8f0'}}>
                  <div style={{fontSize:'1.05rem', color:'#64748b', fontWeight:700, textTransform:'uppercase'}}>PERIODO / FILIAL / CARRERA</div>
                  <div style={{fontWeight:700, marginTop:'0.4rem', fontSize:'1.2rem'}}>{detalleNRC.horariodocente?.campoclinico?.periodoacademico?.codigo} - {detalleNRC.horariodocente?.campoclinico?.filial?.nombrefilial}</div>
                  <div style={{fontSize:'1.2rem', color:'#475569', marginTop:'0.2rem'}}>{detalleNRC.asignatura?.carrera?.nombrecarrera}</div>
                  <div style={{marginTop:'0.8rem'}}><span style={{background:'var(--color-primario)', color:'#fff', padding:'0.3rem 0.8rem', borderRadius:'0.4rem', fontWeight:700, fontSize:'1.2rem'}}>NRC: {detalleNRC.nrc}</span></div>
                </div>
                <div style={{background:'#eff6ff', padding:'1.2rem', borderRadius:'0.8rem', border:'1px solid #dbeafe'}}>
                  <div style={{fontSize:'1.05rem', color:'#64748b', fontWeight:700, textTransform:'uppercase'}}>DOCENTE</div>
                  <div style={{display:'flex', gap:'0.6rem', alignItems:'center', marginTop:'0.6rem'}}><span style={{background:'#fff', border:'1px solid #dbeafe', padding:'0.2rem 0.6rem', borderRadius:'0.4rem', fontWeight:700}}>{detalleNRC.horariodocente?.campoclinico?.docente?.persona?.dni}</span></div>
                  <div style={{fontWeight:600, marginTop:'0.4rem', fontSize:'1.25rem'}}>{detalleNRC.horariodocente?.campoclinico?.docente?.persona?.apellidos}, {detalleNRC.horariodocente?.campoclinico?.docente?.persona?.nombres}</div>
                </div>
              </div>

              <div style={{border:'1px solid #e2e8f0', borderRadius:'0.8rem', padding:'1.2rem'}}>
                <div style={{fontWeight:700, fontSize:'1.15rem', display:'flex', gap:'0.6rem', alignItems:'center', color:'#0f172a'}}><Building2 size={14}/> EPS - RAZÓN SOCIAL + DIRECCIÓN + UBIGEO COMPLETO</div>
                <div style={{marginTop:'0.8rem'}}>
                  <div style={{fontWeight:700, fontSize:'1.3rem'}}>{detalleEPSFull?.razonsocial}</div>
                  <div style={{fontSize:'1.2rem', color:'#475569', marginTop:'0.4rem', display:'flex', gap:'0.4rem'}}><MapPin size={12}/> {detalleEPSFull?.direccion||'S/Dirección'}</div>
                  <div style={{fontSize:'1.15rem', color:'#334155', marginTop:'0.8rem', background:'#f8fafc', padding:'0.8rem', borderRadius:'0.6rem', border:'1px dashed #cbd5e1'}}>
                    <div><b>Distrito:</b> {detalleEPSFull?.distrito?.nombredt||'-'}</div>
                    <div><b>Provincia:</b> {detalleEPSFull?.distrito?.provincia?.nombrep||'-'}</div>
                    <div><b>Departamento:</b> {detalleEPSFull?.distrito?.provincia?.departamento?.nombred||'-'}</div>
                  </div>
                </div>
              </div>

              <div style={{border:'1px solid #e2e8f0', borderRadius:'0.8rem', padding:'1.2rem'}}>
                <div style={{fontWeight:700, fontSize:'1.15rem', display:'flex', gap:'0.6rem'}}><Clock size={14}/> DÍAS (Lunes, Martes...) + HORARIO (10:00-12:00)</div>
                <div style={{marginTop:'0.8rem', display:'flex', flexWrap:'wrap', gap:'0.6rem'}}>
                  {detalleHorario.length>0? detalleHorario.map((d:any,i:number)=><span key={i} style={{background:'#eff6ff', color:'#1e40af', padding:'0.5rem 0.9rem', borderRadius:'999px', fontWeight:600, fontSize:'1.15rem', border:'1px solid #dbeafe'}}>{d.dia_semana} {d.hora_inicio?.slice(0,5)} - {d.hora_fin?.slice(0,5)}</span>) : <span style={{color:'#94a3b8'}}>Sin horario</span>}
                </div>
              </div>

              <div style={{border:'1px solid #e2e8f0', borderRadius:'0.8rem', padding:'1.2rem'}}>
                <div style={{fontWeight:700, fontSize:'1.15rem', display:'flex', gap:'0.6rem'}}><Users size={14}/> ESTUDIANTES - DNI + Apellidos + Nombres ({detalleEstudiantes.length})</div>
                <div style={{marginTop:'0.8rem', maxHeight:'24rem', overflow:'auto', display:'flex', flexDirection:'column', gap:'0.4rem'}}>
                  {detalleEstudiantes.map((est:any,i:number)=><div key={i} style={{display:'flex', justifyContent:'space-between', padding:'0.6rem 0.8rem', background:'#f8fafc', borderRadius:'0.6rem', fontSize:'1.2rem', border:'1px solid #f1f5f9'}}><span style={{fontWeight:700}}>{est.persona?.dni}</span><span style={{color:'#334155'}}>{est.persona?.apellidos}, {est.persona?.nombres}</span></div>)}
                  {detalleEstudiantes.length===0 && <span style={{color:'#94a3b8', fontSize:'1.2rem'}}>Sin estudiantes matriculados</span>}
                </div>
              </div>
            </div>

            <div style={{padding:'1.4rem 2rem', borderTop:'1px solid #e2e8f0', background:'#fcfdff', display:'flex', justifyContent:'space-between', alignItems:'center', gap:'1rem'}}>
              <div style={{display:'flex', gap:'0.8rem'}}>
                <button onClick={handlePrintDetalle} style={{height:'4.2rem', padding:'0 1.4rem', borderRadius:'0.8rem', border:'1px solid #e2e8f0', background:'#fff', fontWeight:600, display:'flex', alignItems:'center', gap:'0.6rem'}}><FileCheck size={16}/> Imprimir</button>
                <button onClick={handleExportDetalle} style={{height:'4.2rem', padding:'0 1.4rem', borderRadius:'0.8rem', border:'none', background:'#0f172a', color:'#fff', fontWeight:700, display:'flex', alignItems:'center', gap:'0.6rem'}}><FileSpreadsheet size={16}/> Exportar Detalle</button>
              </div>
              <button onClick={()=>setShowDetalle(false)} style={{height:'4.2rem', padding:'0 1.6rem', borderRadius:'0.8rem', border:'1px solid #e2e8f0', background:'#fff', fontWeight:600}}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
      .row-hover:hover{ background:#E8F0FE!important; }
        @keyframes slideIn{ from{ transform: translateX(100%); } to{ transform: translateX(0); } }
        @keyframes pulse{ 0%,100%{ opacity:1 } 50%{ opacity:0.5 } }
      .fieldset-sgpc{ border:none; padding:0; }
      .fieldset-sgpc legend{ padding:0 0 0.3rem 0; font-weight:600; color:#334155; }
      .input-sgpc{ border:1px solid #e2e8f0; width:100%; padding:0 1rem; }
      .input-sgpc:focus{ outline:none; border-color:var(--color-primario); box-shadow:0 0 0 2px rgba(30,77,161,0.12); }
      `}</style>
    </div>
  )
}