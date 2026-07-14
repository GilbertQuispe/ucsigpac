'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/client'
import { GraduationCap, BookOpen, UserCheck, Building2, ClipboardList, TrendingUp, AlertTriangle, FileText } from 'lucide-react'
import { Pie, Line } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, LineElement, PointElement, Filler } from 'chart.js'
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, LineElement, PointElement, Filler)

export default function PanelPage() {
  const [kpis, setKpis] = useState<any>({})
  const [periodo, setPeriodo] = useState('2026-1')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data: p } = await supabase
        .from('periodoacademico')
        .select('codigo')
        .order('codigo', { ascending: false })
        .limit(1)
        .maybeSingle()

        const periodoActual = p?.codigo || '2026-1'
        setPeriodo(periodoActual)

        const [est, doc, sup, campos, prog, ejec, incid, informes] = await Promise.all([
          supabase.from('estudiante').select('*', { count: 'exact', head: true }).eq('periodo', periodoActual),
          supabase.from('docente').select('*', { count: 'exact', head: true }),
          supabase.from('supervisor').select('*', { count: 'exact', head: true }),
          supabase.from('campoclinico').select('*', { count: 'exact', head: true }).eq('estado', 'Activo'),
          supabase.from('seleccionvisitasupervision').select('*', { count: 'exact', head: true }).eq('estado', 'Programada'),
          supabase.from('seleccionvisitasupervision').select('*', { count: 'exact', head: true }).eq('estado', 'Ejecutada'),
          supabase.from('incidencia').select('*', { count: 'exact', head: true }),
          supabase.from('informesupervision').select('*', { count: 'exact', head: true })
        ])

        setKpis({
          est: est.count || 0, doc: doc.count || 0, sup: sup.count || 0, campos: campos.count || 0,
          prog: prog.count || 0, ejec: ejec.count || 0, incid: incid.count || 0, informes: informes.count || 0
        })
      } catch (err) {
        console.error('Error cargando dashboard:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [supabase])

  const kpiData = [
    { title: "Estudiantes", value: kpis.est, icon: GraduationCap, color: "var(--color-primario)" },
    { title: "Docentes", value: kpis.doc, icon: BookOpen, color: "var(--color-secundario)" },
    { title: "Supervisores", value: kpis.sup, icon: UserCheck, color: "#10b981" },
    { title: "Campos Clínicos", value: kpis.campos, icon: Building2, color: "var(--color-acento)" },
    { title: "Sup. Programadas", value: kpis.prog, icon: ClipboardList, color: "#f59e0b" },
    { title: "Sup. Ejecutadas", value: kpis.ejec, icon: TrendingUp, color: "#10b981" },
    { title: "Incidencias", value: kpis.incid, icon: AlertTriangle, color: "#ef4444" },
    { title: "Informes", value: kpis.informes, icon: FileText, color: "#6366f1" },
  ]

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'3.2rem' }}>
        <div>
          <h2 style={{ fontSize:'var(--text-4xl)', margin:0 }}>Dashboard Ejecutivo</h2>
          <p style={{ color:'var(--color-texto)', opacity:0.7, margin:'0.4rem 0 0', fontSize:'var(--text-base)' }}>Periodo Académico: {periodo}</p>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(24rem, 1fr))', gap:'2rem', marginBottom:'3.2rem' }}>
        {kpiData.map((kpi, i) => <KpiCard key={i} {...kpi} loading={loading} />)}
      </div>

      {kpis.incid > 0 && (
        <div style={{ background:'linear-gradient(90deg, #fef2f2, #fff)', borderLeft:'0.4rem solid #ef4444', padding:'1.6rem', borderRadius:'0.8rem', marginBottom:'3rem', display:'flex', gap:'1.2rem', alignItems:'center' }}>
          <AlertTriangle size={24} color="#ef4444" />
          <div style={{ fontSize:'var(--text-base)' }}><strong>Alertas:</strong> {kpis.prog} supervisiones pendientes | {kpis.incid} incidencias registradas</div>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(40rem, 1fr))', gap:'2rem' }}>
        <div className="card-sgpc">
          <h3 style={{ marginBottom:'1.6rem' }}>Supervisiones por Tipo</h3>
          <Pie data={{ labels:['MINSA','ESSALUD','OTROS'], datasets:[{data:[30,20,10], backgroundColor:['var(--color-primario)','var(--color-secundario)','var(--color-acento)'], borderWidth:0}] }} options={{ plugins:{ legend:{ position:'bottom', labels:{ font:{ size:14 }}}}}}/>
        </div>
        <div className="card-sgpc">
          <h3 style={{ marginBottom:'1.6rem' }}>Incidencias por Mes</h3>
          <Line data={{ labels:['Ene','Feb','Mar','Abr'], datasets:[{label:'Incidencias', data:[5,8,3,6], borderColor:'var(--color-primario)', backgroundColor:'rgba(48,102,190,0.1)', fill:true, tension:0.4}] }} />
        </div>
      </div>
    </div>
  )
}

function KpiCard({ title, value, icon: Icon, color, loading }: any) {
  return (
    <div className="card-sgpc" style={{ borderTop:`0.4rem solid ${color}`, transition:'all 0.3s' }}
      onMouseEnter={e => { e.currentTarget.style.transform='translateY(-0.4rem)'; e.currentTarget.style.boxShadow='0 0.8rem 2rem rgba(0,0,0,0.12)' }}
      onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 0.4rem 1.2rem rgba(0,0,0,0.08)' }}
    >
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h3 style={{ fontSize:'var(--text-sm)', color:'var(--color-texto)', opacity:0.7, margin:0 }}>{title}</h3>
          <p style={{ fontSize:'var(--text-4xl)', fontWeight:700, margin:'0.8rem 0 0', color:color }}>{loading? '...' : value}</p>
        </div>
        <div style={{ backgroundColor:`${color}20`, padding:'1.2rem', borderRadius:'1.2rem' }}>
          <Icon size={28} color={color} />
        </div>
      </div>
    </div>
  )
}