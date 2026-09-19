'use client'
import { useState } from 'react'
import { Building2, MapPin, GraduationCap, ClipboardCheck, BarChart3, UserCheck, Hospital, ArrowLeft, BookOpen, Users, CalendarDays, FileCheck, Clock, TrendingUp, ShieldCheck, Sparkles } from 'lucide-react'
import ReporteCampoClinico from './components/ReporteCampoClinico'
import ReporteCargaAcademica from './components/ReporteCargaAcademica'
import ReporteAsignacionSupervisores from './components/ReporteAsignacionSupervisores'

type Categoria = 'clinica' | 'academica' | 'supervision' | 'indicadores' | null
type SubReporte = string | null

export default function ReportesHubPage() {
  const [categoriaActiva, setCategoriaActiva] = useState<Categoria>(null)
  const [subReporteActivo, setSubReporteActivo] = useState<SubReporte>(null)

  const handleBack = () => {
    if(subReporteActivo){ setSubReporteActivo(null); return }
    setCategoriaActiva(null)
  }

  if(subReporteActivo === 'campo-clinico'){
    return (
      <div className="main-content">
        <div style={{display:'flex', alignItems:'center', gap:'1.2rem', marginBottom:'1.6rem'}}>
          <button onClick={handleBack} className="btn-secundario"><ArrowLeft size={16}/> Volver</button>
          <div style={{height:'2.4rem', width:'1px', background:'#e2e8f0'}}></div>
          <div style={{display:'flex', alignItems:'center', gap:'0.8rem', fontSize:'1.3rem'}}><span style={{opacity:0.6}}>Gestión Clínica</span><span>/</span><span style={{fontWeight:700}}>Campo Clínico</span></div>
        </div>
        <ReporteCampoClinico />
      </div>
    )
  }
  if(subReporteActivo === 'carga-academica'){
    return (
      <div className="main-content">
        <div style={{display:'flex', alignItems:'center', gap:'1.2rem', marginBottom:'1.6rem'}}>
          <button onClick={handleBack} className="btn-secundario"><ArrowLeft size={16}/> Volver</button>
          <div style={{height:'2.4rem', width:'1px', background:'#e2e8f0'}}></div>
          <div style={{display:'flex', alignItems:'center', gap:'0.8rem', fontSize:'1.3rem'}}><span style={{opacity:0.6}}>Gestión Académica</span><span>/</span><span style={{fontWeight:700}}>Carga Académica</span></div>
        </div>
        <ReporteCargaAcademica />
      </div>
    )
  }
  // if(subReporteActivo === 'asignacion-supervision'){
  //   return (
  //     <div className="main-content">
  //       <div style={{display:'flex', alignItems:'center', gap:'1.2rem', marginBottom:'1.6rem'}}>
  //         <button onClick={handleBack} className="btn-secundario"><ArrowLeft size={16}/> Volver</button>
  //         <div style={{height:'2.4rem', width:'1px', background:'#e2e8f0'}}></div>
  //         <div style={{display:'flex', alignItems:'center', gap:'0.8rem', fontSize:'1.3rem'}}><span style={{opacity:0.6}}>Supervisión Clínica</span><span>/</span><span style={{fontWeight:700}}>Asignacion Supervision</span></div>
  //       </div>
  //       <ReporteCargaAcademica />
  //     </div>
  //   )
  // }

  //--- AGREGA ESTE BLOQUE - CORREGIDO ---
  if(subReporteActivo === 'asignacion-supervision'){
    return (
      <div className="main-content">
        <div style={{display:'flex', alignItems:'center', gap:'1.2rem', marginBottom:'1.6rem'}}>
          <button onClick={handleBack} className="btn-secundario"><ArrowLeft size={16}/> Volver</button>
          <div style={{height:'2.4rem', width:'1px', background:'#e2e8f0'}}></div>
          <div style={{display:'flex', alignItems:'center', gap:'0.8rem', fontSize:'1.3rem'}}><span style={{opacity:0.6}}>Supervisión Clínica</span><span>/</span><span style={{fontWeight:700}}>Asignación Supervisores - NRC</span></div>
        </div>
        <ReporteAsignacionSupervisores />
      </div>
    )
  }

  return (
    <div className="main-content">
      {/* HEADER EJECUTIVO */}
      {/* <div style={{background:'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1e40af 100%)', borderRadius:'1.6rem', padding:'2.8rem', color:'#fff', marginBottom:'2.4rem', position:'relative', overflow:'hidden'}}>
        <div style={{position:'absolute', right:'-5%', top:'-50%', width:'50rem', height:'50rem', background:'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)'}}></div> */}
             <div style={{background:'linear-gradient(135deg, var(--color-primario, #1e4da1) 0%, #2a5db8 60%, #3b6fd1 100%)', borderRadius:'1.6rem', padding:'2.8rem', color:'#fff', marginBottom:'2.4rem', position:'relative', overflow:'hidden', boxShadow:'0 10px 30px -10px rgba(30,77,161,0.5)'}}>
        <div style={{position:'absolute', right:'-5%', top:'-50%', width:'50rem', height:'50rem', background:'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)'}}></div> 
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', position:'relative', zIndex:1}}>
          <div>
            <div style={{display:'flex', alignItems:'center', gap:'1rem', marginBottom:'0.8rem'}}><div style={{background:'rgba(255,255,255,0.15)', padding:'0.8rem', borderRadius:'0.8rem'}}><BarChart3 size={22}/></div><span style={{fontSize:'1.2rem', letterSpacing:'0.1em', opacity:0.8, textTransform:'uppercase'}}>SGPC • Módulo de Inteligencia</span></div>
            <h1 style={{fontSize:'2.8rem', fontWeight:800, lineHeight:1.1, marginBottom:'0.8rem'}}>Centro de Reportes</h1>
            <p style={{fontSize:'1.4rem', opacity:0.85, maxWidth:'55rem'}}>Consolidado operativo de Campo Clínico, Carga Académica y Supervisión. Exportación ejecutiva en Excel.</p>
            {categoriaActiva && <button onClick={handleBack} className="btn-secundario" style={{marginTop:'1.6rem', background:'#fff', color:'#0f172a'}}><ArrowLeft size={16}/> Volver al Hub</button>}
          </div>
          <div style={{display:'flex', gap:'1.2rem'}}>
            <div style={{background:'rgba(255,255,255,0.1)', backdropFilter:'blur(10px)', borderRadius:'1rem', padding:'1.2rem 1.6rem', textAlign:'center', minWidth:'10rem'}}><div style={{fontSize:'2.2rem', fontWeight:800}}>8</div><div style={{fontSize:'1.1rem', opacity:0.8}}>Reportes Totales</div></div>
            <div style={{background:'rgba(34,197,94,0.2)', backdropFilter:'blur(10px)', borderRadius:'1rem', padding:'1.2rem 1.6rem', textAlign:'center', minWidth:'10rem', border:'1px solid rgba(34,197,94,0.3)'}}><div style={{fontSize:'2.2rem', fontWeight:800, color:'#86efac'}}>2</div><div style={{fontSize:'1.1rem', opacity:0.9}}>Activos</div></div>
          </div>
        </div>
      </div>

      {!categoriaActiva && (
        <>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(30rem, 1fr))', gap:'2rem', marginBottom:'2.4rem'}}>
            {/* CARD CLINICA */}
            <div className="card-sgpc card-hover" onClick={()=>setCategoriaActiva('clinica')} style={{padding:'0', cursor:'pointer', overflow:'hidden', border:'1px solid #e2e8f0'}}>
              <div style={{height:'0.5rem', background:'linear-gradient(90deg, #22c55e, #16a34a)'}}></div>
              <div style={{padding:'2.4rem'}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'1.6rem'}}>
                  <div style={{background:'#F0FDF4', width:'4.8rem', height:'4.8rem', borderRadius:'1.2rem', display:'flex', alignItems:'center', justifyContent:'center', color:'#22c55e'}}><Building2 size={24}/></div>
                  <span style={{background:'#F0FDF4', color:'#15803d', padding:'0.4rem 1.2rem', borderRadius:'999px', fontSize:'1.1rem', fontWeight:700, height:'fit-content'}}>3 REPORTES • 1 ACTIVO</span>
                </div>
                <h3 style={{fontSize:'1.8rem', fontWeight:800, marginBottom:'0.6rem'}}>Gestión Clínica</h3>
                <p style={{fontSize:'1.3rem', color:'#64748b', lineHeight:1.5, marginBottom:'1.6rem'}}>Campo Clínico, EPS, Asignación Docente, Horario Docente. Control de ubigeo y estados.</p>
                <div style={{display:'flex', gap:'0.8rem', flexWrap:'wrap'}}><span className="badge-exe" style={{background:'#f1f5f9'}}><Hospital size={12}/> EPS</span><span className="badge-exe" style={{background:'#f1f5f9'}}><MapPin size={12}/> Ubigeo</span><span className="badge-exe" style={{background:'#f1f5f9'}}><ShieldCheck size={12}/> ACTIVO</span></div>
              </div>
            </div>

            {/* CARD ACADEMICA */}
            <div className="card-sgpc card-hover" onClick={()=>setCategoriaActiva('academica')} style={{padding:'0', cursor:'pointer', overflow:'hidden', border:'1px solid #e2e8f0'}}>
              <div style={{height:'0.5rem', background:'linear-gradient(90deg, #3b82f6, #1d4ed8)'}}></div>
              <div style={{padding:'2.4rem'}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'1.6rem'}}>
                  <div style={{background:'#EFF6FF', width:'4.8rem', height:'4.8rem', borderRadius:'1.2rem', display:'flex', alignItems:'center', justifyContent:'center', color:'#3b82f6'}}><GraduationCap size={24}/></div>
                  <span style={{background:'#EFF6FF', color:'#1e40af', padding:'0.4rem 1.2rem', borderRadius:'999px', fontSize:'1.1rem', fontWeight:700, height:'fit-content'}}>3 REPORTES • 1 ACTIVO</span>
                </div>
                <h3 style={{fontSize:'1.8rem', fontWeight:800, marginBottom:'0.6rem'}}>Gestión Académica</h3>
                <p style={{fontSize:'1.3rem', color:'#64748b', lineHeight:1.5, marginBottom:'1.6rem'}}>Carga Académica por NRC, Horarios Alumnos, Distribución por carrera y filial.</p>
                <div style={{display:'flex', gap:'0.8rem', flexWrap:'wrap'}}><span className="badge-exe" style={{background:'#f1f5f9'}}><BookOpen size={12}/> NRC</span><span className="badge-exe" style={{background:'#f1f5f9'}}><Users size={12}/> Estudiantes</span><span className="badge-exe" style={{background:'#f1f5f9'}}><Clock size={12}/> Horarios</span></div>
              </div>
            </div>

            {/* CARD SUPERVISION */}
            <div className="card-sgpc card-hover" onClick={()=>setCategoriaActiva('supervision')} style={{padding:'0', cursor:'pointer', overflow:'hidden', border:'1px solid #e2e8f0'}}>
              <div style={{height:'0.5rem', background:'linear-gradient(90deg, #f59e0b, #d97706)'}}></div>
              <div style={{padding:'2.4rem'}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'1.6rem'}}>
                  <div style={{background:'#FFFBEB', width:'4.8rem', height:'4.8rem', borderRadius:'1.2rem', display:'flex', alignItems:'center', justifyContent:'center', color:'#f59e0b'}}><ClipboardCheck size={24}/></div>
                  <span style={{background:'#FFFBEB', color:'#92400e', padding:'0.4rem 1.2rem', borderRadius:'999px', fontSize:'1.1rem', fontWeight:700, height:'fit-content'}}>5 REPORTES • EN CURSO</span>
                </div>
                <h3 style={{fontSize:'1.8rem', fontWeight:800, marginBottom:'0.6rem'}}>Supervisión Clínica</h3>
                <p style={{fontSize:'1.3rem', color:'#64748b', lineHeight:1.5, marginBottom:'1.6rem'}}>Asignación, Programación, Visitas, Incidencias, Informe I, III, IV. Rango 01/07-31/07.</p>
                <div style={{display:'flex', gap:'0.8rem'}}><span className="badge-exe" style={{background:'#f1f5f9'}}><FileCheck size={12}/> Informes</span><span className="badge-exe" style={{background:'#f1f5f9'}}><CalendarDays size={12}/> Programación</span></div>
              </div>
            </div>

            {/* CARD INDICADORES */}
            <div className="card-sgpc" style={{padding:'0', overflow:'hidden', border:'1px dashed #cbd5e1', background:'#fafafa'}}>
              <div style={{height:'0.5rem', background:'linear-gradient(90deg, #8b5cf6, #6d28d9)'}}></div>
              <div style={{padding:'2.4rem', opacity:0.7}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'1.6rem'}}>
                  <div style={{background:'#F5F3FF', width:'4.8rem', height:'4.8rem', borderRadius:'1.2rem', display:'flex', alignItems:'center', justifyContent:'center', color:'#8b5cf6'}}><BarChart3 size={24}/></div>
                  <span style={{background:'#F5F3FF', color:'#6d28d9', padding:'0.4rem 1.2rem', borderRadius:'999px', fontSize:'1.1rem', fontWeight:700}}>PRÓXIMAMENTE</span>
                </div>
                <h3 style={{fontSize:'1.8rem', fontWeight:800, marginBottom:'0.6rem'}}>Indicadores</h3>
                <p style={{fontSize:'1.3rem', color:'#64748b'}}>Dashboard Ejecutivo con KPIs de ocupación, cumplimiento y aforo.</p>
                <div style={{marginTop:'1.6rem', display:'flex', alignItems:'center', gap:'0.6rem', fontSize:'1.2rem', color:'#8b5cf6'}}><TrendingUp size={14}/> Roadmap Q4 2025</div>
              </div>
            </div>
          </div>

          <div style={{background:'#fff', border:'1px solid #e2e8f0', borderRadius:'1.2rem', padding:'1.6rem 2rem', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div style={{display:'flex', gap:'2.4rem', fontSize:'1.2rem', color:'#64748b'}}><span style={{display:'flex', gap:'0.6rem', alignItems:'center'}}><div style={{width:'0.8rem', height:'0.8rem', background:'#22c55e', borderRadius:'50%'}}></div> 2 Activos</span><span style={{display:'flex', gap:'0.6rem', alignItems:'center'}}><div style={{width:'0.8rem', height:'0.8rem', background:'#f59e0b', borderRadius:'50%'}}></div> 6 En desarrollo</span><span style={{display:'flex', gap:'0.6rem', alignItems:'center'}}><div style={{width:'0.8rem', height:'0.8rem', background:'#8b5cf6', borderRadius:'50%'}}></div> 1 Roadmap</span></div>
            <div style={{fontSize:'1.1rem', color:'#94a3b8', display:'flex', gap:'0.6rem', alignItems:'center'}}><Sparkles size={12}/> Actualizado hoy • SGPC v2.1</div>
          </div>
        </>
      )}

      {categoriaActiva === 'clinica' && !subReporteActivo && (
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(32rem, 1fr))', gap:'2rem'}}>
          <div className="card-sgpc card-hover" style={{padding:'2.4rem', cursor:'pointer', borderLeft:'4px solid #22c55e'}} onClick={()=>setSubReporteActivo('campo-clinico')}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'1.2rem'}}><div style={{background:'#F0FDF4', padding:'0.8rem', borderRadius:'0.8rem'}}><Hospital size={20} color="#22c55e"/></div><span style={{background:'#22c55e', color:'#fff', padding:'0.3rem 0.8rem', borderRadius:'999px', fontSize:'1rem', fontWeight:700}}>ACTIVO</span></div>
            <h3 style={{fontSize:'1.6rem', fontWeight:700, marginBottom:'0.6rem'}}>Reporte Campo Clínico</h3>
            <p style={{fontSize:'1.3rem', color:'#64748b', lineHeight:1.5, marginBottom:'1.6rem'}}>Listado completo por EPS, ubigeo, docente, periodo y horario laboral. Filtros avanzados con exportación ejecutiva.</p>
            <div style={{display:'flex', gap:'0.6rem', marginBottom:'1.6rem'}}><span className="badge-exe">Excel</span><span className="badge-exe">PDF</span><span className="badge-exe">Filtros Ubigeo</span></div>
            <button className="btn-primario" style={{width:'100%', justifyContent:'center'}}>Abrir Reporte →</button>
          </div>
          <div className="card-sgpc" style={{padding:'2.4rem', opacity:0.5, border:'1px dashed #cbd5e1'}}><h3>Reporte EPS</h3><p style={{fontSize:'1.2rem', marginTop:'0.8rem'}}>Próximo • Catálogo de clínicas y convenios</p></div>
          <div className="card-sgpc" style={{padding:'2.4rem', opacity:0.5, border:'1px dashed #cbd5e1'}}><h3>Reporte Asignación Docente</h3><p style={{fontSize:'1.2rem', marginTop:'0.8rem'}}>Próximo • Carga por docente y aforo</p></div>
        </div>
      )}

      {categoriaActiva === 'academica' && !subReporteActivo && (
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(32rem, 1fr))', gap:'2rem'}}>
          <div className="card-sgpc card-hover" style={{padding:'2.4rem', cursor:'pointer', borderLeft:'4px solid #3b82f6'}} onClick={()=>setSubReporteActivo('carga-academica')}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'1.2rem'}}><div style={{background:'#EFF6FF', padding:'0.8rem', borderRadius:'0.8rem'}}><BookOpen size={20} color="#3b82f6"/></div><span style={{background:'#3b82f6', color:'#fff', padding:'0.3rem 0.8rem', borderRadius:'999px', fontSize:'1rem', fontWeight:700}}>ACTIVO</span></div>
            <h3 style={{fontSize:'1.6rem', fontWeight:700, marginBottom:'0.6rem'}}>Reporte Carga Académica</h3>
            <p style={{fontSize:'1.3rem', color:'#64748b', lineHeight:1.5, marginBottom:'1.6rem'}}>Por Periodo, Filial, Carrera, EPS, Docente, Asignatura y NRC. Incluye total estudiantes y horario académico detallado.</p>
            <div style={{display:'flex', gap:'0.6rem', marginBottom:'1.6rem'}}><span className="badge-exe">NRC</span><span className="badge-exe">Excel Detallado</span><span className="badge-exe">Estudiantes</span></div>
            <button className="btn-primario" style={{width:'100%', justifyContent:'center'}}>Abrir Reporte →</button>
          </div>
          <div className="card-sgpc" style={{padding:'2.4rem', opacity:0.5, border:'1px dashed #cbd5e1'}}><h3 style={{display:'flex', gap:'1rem'}}><Users size={18}/> Horarios Alumnos</h3><p style={{fontSize:'1.2rem', marginTop:'0.8rem'}}>Próximo • Por estudiante, NRC y días</p></div>
          <div className="card-sgpc" style={{padding:'2.4rem', opacity:0.5, border:'1px dashed #cbd5e1'}}><h3 style={{display:'flex', gap:'1rem'}}><CalendarDays size={18}/> Estudiantes con NRC</h3><p style={{fontSize:'1.2rem', marginTop:'0.8rem'}}>Próximo • Matrícula y asignación</p></div>
        </div>
      )}

      {/* {categoriaActiva === 'supervision' && !subReporteActivo &&(
        <div className="card-sgpc" style={{padding:'4rem', textAlign:'center', border:'1px dashed #f59e0b', background:'#FFFBEB'}}>
          <ClipboardCheck size={32} color="#f59e0b" style={{marginBottom:'1.2rem'}}/>
          <h3 style={{fontSize:'1.8rem', fontWeight:700}}>Supervisión Clínica</h3>
          <p style={{marginTop:'0.8rem', color:'#92400e'}}>Aquí irá tu Visita Supervisión con I, III, IV por fechas 01/07 al 31/07. Próximo sprint.</p>
          <button className="btn-secundario" style={{marginTop:'1.6rem'}} onClick={()=>setCategoriaActiva(null)}>Volver al Hub</button>
        </div>
      )} */}

       {categoriaActiva === 'supervision' && !subReporteActivo &&(
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(32rem, 1fr))', gap:'2rem'}}>
          {/* CARD ACTIVO - ASIGNACION */}
          <div className="card-sgpc card-hover" style={{padding:'2.4rem', cursor:'pointer', borderLeft:'4px solid #f59e0b'}} onClick={()=>setSubReporteActivo('asignacion-supervision')}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'1.2rem'}}><div style={{background:'#FFFBEB', padding:'0.8rem', borderRadius:'0.8rem'}}><UserCheck size={20} color="#f59e0b"/></div><span style={{background:'#f59e0b', color:'#fff', padding:'0.3rem 0.8rem', borderRadius:'999px', fontSize:'1rem', fontWeight:700}}>ACTIVO • NUEVO</span></div>
            <h3 style={{fontSize:'1.6rem', fontWeight:700, marginBottom:'0.6rem'}}>Asignación Supervisores - NRC</h3>
            <p style={{fontSize:'1.3rem', color:'#64748b', lineHeight:1.5, marginBottom:'1.6rem'}}>1 fila por NRC asignado. Ver detalle completo: EPS + Dirección + Ubigeo + Horario + Estudiantes. Export Excel.</p>
            <div style={{display:'flex', gap:'0.6rem', marginBottom:'1.6rem'}}><span className="badge-exe">NRC</span><span className="badge-exe">Drawer Detalle</span><span className="badge-exe">Excel</span></div>
            <button className="btn-primario" style={{width:'100%', justifyContent:'center', background:'#f59e0b', borderColor:'#f59e0b'}}>Abrir Reporte →</button>
          </div>
          {/* CARDS PROXIMOS */}
          <div className="card-sgpc" style={{padding:'2.4rem', opacity:0.5, border:'1px dashed #cbd5e1'}}><h3 style={{display:'flex', gap:'1rem'}}><ClipboardCheck size={18}/> Visita Supervisión I, III, IV</h3><p style={{fontSize:'1.2rem', marginTop:'0.8rem'}}>Próximo • Rango 01/07-31/07</p></div>
          <div className="card-sgpc" style={{padding:'2.4rem', opacity:0.5, border:'1px dashed #cbd5e1'}}><h3 style={{display:'flex', gap:'1rem'}}><CalendarDays size={18}/> Programación Visitas</h3><p style={{fontSize:'1.2rem', marginTop:'0.8rem'}}>Próximo • Estado PROGRAMADO / SUPERVISADO</p></div>
        </div>
      )}

      <style>{`
        .card-hover{ transition: all 0.2s ease; }
        .card-hover:hover{ transform: translateY(-4px); box-shadow: 0 12px 24px -6px rgba(0,0,0,0.12); border-color: #cbd5e1 !important; }
        .badge-exe{ font-size:1rem; padding:0.3rem 0.8rem; border-radius:999px; background:#f1f5f9; color:#475569; font-weight:600; display:inline-flex; align-items:center; gap:0.3rem; }
      `}</style>
    </div>
  )
}