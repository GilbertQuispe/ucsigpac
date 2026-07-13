'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/client'
import { Bar, Pie, Line, Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement } from 'chart.js'
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement)

export default function PanelPage() {
  const [kpis, setKpis] = useState<any>({})
  const [periodo, setPeriodo] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: p } = await supabase.from('periodoacademico').order('codigo', { ascending: false }).limit(1).single()
      if(p) setPeriodo(p.codigo)

      const [est, doc, sup, campos, prog, ejec, incid, informes] = await Promise.all([
        supabase.from('estudiante').select('*', { count: 'exact', head: true }).eq('periodo', p?.codigo),
        supabase.from('docente').select('*', { count: 'exact', head: true }),
        supabase.from('supervisor').select('*', { count: 'exact', head: true }),
        supabase.from('campo_clinico').select('*', { count: 'exact', head: true }).eq('estado', 'Activo'),
        supabase.from('supervision').select('*', { count: 'exact', head: true }).eq('estado', 'Programada'),
        supabase.from('supervision').select('*', { count: 'exact', head: true }).eq('estado', 'Ejecutada'),
        supabase.from('incidencia').select('*', { count: 'exact', head: true }),
        supabase.from('informe_supervision').select('*', { count: 'exact', head: true })
      ])
      setKpis({ est: est.count, doc: doc.count, sup: sup.count, campos: campos.count, prog: prog.count, ejec: ejec.count, incid: incid.count, informes: informes.count })
    }
    load()
  }, [supabase])

  return (
    <div>
      <h2>Dashboard Ejecutivo - Periodo {periodo}</h2>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(22rem, 1fr))', gap:'2rem', margin:'2.4rem 0' }}>
        <KpiCard title="Estudiantes Matriculados" value={kpis.est} />
        <KpiCard title="Docentes" value={kpis.doc} />
        <KpiCard title="Supervisores" value={kpis.sup} />
        <KpiCard title="Campos Clínicos Activos" value={kpis.campos} />
        <KpiCard title="Supervisiones Programadas" value={kpis.prog} />
        <KpiCard title="Supervisiones Ejecutadas" value={kpis.ejec} />
        <KpiCard title="Incidencias Registradas" value={kpis.incid} />
        <KpiCard title="Informes Emitidos" value={kpis.informes} />
      </div>

      {/* Alertas */}
      <div style={{ backgroundColor:'#fef3c7', borderLeft:'0.4rem solid var(--color-acento)', padding:'1.6rem', borderRadius:'0.8rem', marginBottom:'3rem', fontSize:'var(--text-base)' }}>
        <strong>⚠ Alertas:</strong> 12 supervisiones pendientes | 3 campos clínicos sin docente | 8 incidencias críticas
      </div>

      {/* Gráficos */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(35rem, 1fr))', gap:'2rem' }}>
        <div className="card-sgpc">
          <h3 style={{ marginBottom:'1.6rem' }}>Supervisiones por Tipo</h3>
          <Pie data={{ labels:['MINSA','ESSALUD','OTROS'], datasets:[{data:[30,20,10], backgroundColor:['var(--color-primario)','var(--color-secundario)','var(--color-acento)']}] }} />
        </div>
        <div className="card-sgpc">
          <h3 style={{ marginBottom:'1.6rem' }}>Incidencias por Mes</h3>
          <Line data={{ labels:['Ene','Feb','Mar','Abr'], datasets:[{label:'Incidencias', data:[5,8,3,6], borderColor:'var(--color-primario)', backgroundColor:'var(--color-primario)'}] }} />
        </div>
      </div>
    </div>
  )
}

function KpiCard({ title, value }: { title:string, value:any }) {
  return (
    <div className="card-sgpc" style={{ transition:'transform 0.2s', cursor:'default' }}
      onMouseEnter={e => e.currentTarget.style.transform='translateY(-0.4rem)'}
      onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}
    >
      <h3 style={{ fontSize:'var(--text-sm)', color:'var(--color-texto)', opacity:0.7, margin:0 }}>{title}</h3>
      <p style={{ fontSize:'var(--text-4xl)', fontWeight:700, margin:'0.8rem 0 0' }}>{value?? '...'}</p>
    </div>
  )
}