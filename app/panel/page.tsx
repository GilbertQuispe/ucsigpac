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
  const [pieData, setPieData] = useState<any>({ labels: [], datasets: [] })
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        //1. OBTENER EL PERIODO ACTIVO: idpa para filtrar, codigo para mostrar
        const { data: p } = await supabase
         .from('periodoacademico')
         .select('idpa, codigo, fecha_inicio, fecha_fin')
         .eq('estado', 'ACTIVO')
         .order('idpa', { ascending: false })
         .limit(1)
         .maybeSingle()
        const idpaActual = p?.idpa // 1, 2, 3... para filtrar en tablas
        const codigoActual = p?.codigo || '202620' // 202620 para mostrar arriba

      //   const idpaActual = 1 // <- FORZADO PARA PRUEBA
      // const codigoActual = '202610' // <- PARA QUE SE VEA BONITO ARRIBA
      //   setPeriodo(codigoActual)

        // 2. KPIs PRINCIPALES FILTRADOS POR idpa
        const [est, doc, sup, campos] = await Promise.all([
          // Estudiantes del periodo
          supabase.from('matricula').select('*', { count: 'exact', head: true }).eq('idpa', idpaActual),
          
          // Docentes activos
          supabase.from('docente').select('*', { count: 'exact', head: true }).eq('estado', 'ACTIVO'),
          
          // Supervisores
          supabase.from('supervisor').select('*', { count: 'exact', head: true }),
          
          // Campos clinicos del periodo
          supabase.from('campoclinico').select('*', { count: 'exact', head: true }).eq('estado', 'ACTIVO').eq('idpa', idpaActual)
        ])

        // // 3. SUPERVISIONES: Jalar todo y filtrar por idpa porque el join directo falla
        // const { data: svsData } = await supabase
        //  .from('seleccionvisitasupervision')
        //  .select('estado, idvisitas(idasignacions(asignacion_nrc_supervisor(idcargaacad(campoclinico(idpa)))))')
        
        // const svsDelPeriodo = svsData?.filter(s => 
        //   s.idvisitas?.idasignacions?.asignacion_nrc_supervisor?.some(
        //     a => a.idcargaacad?.campoclinico?.idpa === idpaActual
        //   )
        // ) || []

        // const prog = svsDelPeriodo.filter(s => s.estado === 'Programada').length
        // const ejec = svsDelPeriodo.filter(s => s.estado === 'Ejecutada').length

        // // 4. INCIDENCIAS E INFORMES: Igual, filtrar después
        // const { data: incidData } = await supabase
        //  .from('incidencia')
        //  .select('idvisitas(idasignacions(asignacion_nrc_supervisor(idcargaacad(campoclinico(idpa)))))')
        // const incidDelPeriodo = incidData?.filter(i => 
        //   i.idvisitas?.idasignacions?.asignacion_nrc_supervisor?.some(
        //     a => a.idcargaacad?.campoclinico?.idpa === idpaActual
        //   )
        // ) || []

        // const { data: informesData } = await supabase
        //  .from('informesupervision')
        //  .select('idsvs(idvisitas(idasignacions(asignacion_nrc_supervisor(idcargaacad(campoclinico(idpa))))))')
        // 3. SUPERVISIONES DEL PERIODO
const { data: asignData } = await supabase
.from('asignacion_nrc_supervisor')
.select('idasignacion_nrc, idcargaacad(campoclinico(idpa))')
.eq('idcargaacad.campoclinico.idpa', idpaActual)

const idsAsignacion = asignData?.map(a => a.idasignacion_nrc) || []

// Paso 2: Buscar supervisiones de esas asignaciones
const { data: svsData } = await supabase
.from('seleccionvisitasupervision')
.select('estado, idvisitas')
.in('idvisitas', idsAsignacion.length > 0? idsAsignacion : [0])

const prog = svsData?.filter(s => s.estado === 'PROGRAMADA').length || 0 // MAYUSCULAS
const ejec = svsData?.filter(s => s.estado === 'EJECUTADA').length || 0 // MAYUSCULAS

// 4. INCIDENCIAS E INFORMES DEL PERIODO
// Ya vienen filtrados por idpa con el.in(idsAsignacion)
const { data: incidData } = await supabase
.from('incidencia')
.select('id')
.in('idvisitas', idsAsignacion.length > 0? idsAsignacion : [0])

const { data: informesData } = await supabase
.from('informesupervision')
.select('id')
.in('idsvs', idsAsignacion.length > 0? idsAsignacion : [0])

// BORRA EL.filter DE ABAJO. YA NO SIRVE
// const informesDelPeriodo = informesData?.filter... <- BORRA ESTO

// // 5. DATOS PARA GRAFICO DE TORTA: USANDO idpes
// const { data: camposData } = await supabase
//   .from('campoclinico')
//   .select('idpes') // <- ERA idtipoeps
//   .eq('estado', 'ACTIVO').eq('idpa', idpaActual)

// const { data: tiposData } = await supabase
//   .from('tipoeps') // <- Tu tabla de tipos debe llamarse así
//   .select('idpes, nombretipoeps') // <- Y aquí también idpes

// console.log('CAMPOS:', camposData)
// console.log('TIPOS:', tiposData)

// const conteoEPS: any = { MINSA: 0, ESSALUD: 0, OTROS: 0 }

// camposData?.forEach(c => {
//   const id = c.idpes // <- ERA idtipoeps
//   const tipoObj = tiposData?.find(t => t.idpes === id) 
//   const nombreEPS = tipoObj?.nombretipoeps || 'OTROS'
//   const tipo = nombreEPS.toUpperCase()
  
//   if (tipo.includes('MINSA')) conteoEPS.MINSA++
//   else if (tipo.includes('ESSALUD')) conteoEPS.ESSALUD++
//   else conteoEPS.OTROS++
// })

// setPieData({
//   labels: ['MINSA','ESSALUD','OTROS'],
//   datasets: [{
//     label: 'Campos por EPS',
//     data: [conteoEPS.MINSA, conteoEPS.ESSALUD, conteoEPS.OTROS],
//     backgroundColor: ['#3b82f6','#10b981','#f59e0b'],
//     borderWidth: 2
//   }]
// })

// 5. DATOS PARA GRAFICO DE TORTA: USANDO ideps -> eps -> tipoeps

// 1. Jalar campoclinico con el ideps
const { data: camposData, error: errorCampos } = await supabase
  .from('campoclinico')
  .select('ideps') // <- Ahora es ideps, no idpes ni idtipoeps
  .eq('estado', 'ACTIVO')
  .eq('idpa', idpaActual)

if(errorCampos) console.error(errorCampos)

// 2. Jalar la tabla eps para mapear ideps -> idtipoeps
const { data: epsData, error: errorEps } = await supabase
  .from('eps')
  .select('ideps, idtipoeps')

if(errorEps) console.error(errorEps)

// 3. Jalar los nombres de tipoeps
const { data: tiposData, error: errorTipos } = await supabase
  .from('tipoeps')
  .select('idtipoeps, nombretipoeps')

if(errorTipos) console.error(errorTipos)

console.log('CAMPOS:', camposData)
console.log('EPS:', epsData)
console.log('TIPOS:', tiposData)

const conteoEPS = { MINSA: 0, ESSALUD: 0, OTROS: 0 }

camposData?.forEach(c => {
  const ideps = c.ideps // <- el id del establecimiento
  
  // Buscamos a que tipoeps pertenece ese ideps
  const epsObj = epsData?.find(e => e.ideps === ideps)
  const idtipoeps = epsObj?.idtipoeps
  
  // Buscamos el nombre del tipo
  const tipoObj = tiposData?.find(t => t.idtipoeps === idtipoeps)
  const nombreEPS = tipoObj?.nombretipoeps || 'OTROS'
  const tipo = nombreEPS.toUpperCase()
  
  if (tipo.includes('MINSA')) conteoEPS.MINSA++
  else if (tipo.includes('ESSALUD')) conteoEPS.ESSALUD++
  else conteoEPS.OTROS++
})

setPieData({
  labels: ['MINSA','ESSALUD','OTROS'],
  datasets: [{
    label: 'Campos por EPS',
    data: [conteoEPS.MINSA, conteoEPS.ESSALUD, conteoEPS.OTROS],
    backgroundColor: ['#3b82f6','#10b981','#f59e0b'], // Azul, Verde, Naranja
    borderWidth: 2
  }]
})
        // 6. SETEAR TODO
        setKpis({
          est: est.count || 0, doc: doc.count || 0, sup: sup.count || 0, campos: campos.count || 0,
          prog, ejec, incid: incidData?.length || 0, informes: informesData?.length || 0,
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
    { title: "Docentes Activos", value: kpis.doc, icon: BookOpen, color: "var(--color-secundario)" },
    { title: "Supervisores", value: kpis.sup, icon: UserCheck, color: "#10b981" },
    { title: "Campos Clínicos", value: kpis.campos, icon: Building2, color: "var(--color-acento)" },
    { title: "Sup. Programadas", value: kpis.prog, icon: ClipboardList, color: "#f59e0b" },
    { title: "Sup. Ejecutadas", value: kpis.ejec, icon: TrendingUp, color: "#10b981" },
    { title: "Incidencias", value: kpis.incid, icon: AlertTriangle, color: "#ef4444" },
    { title: "Informes", value: kpis.informes, icon: FileText, color: "#6366f1" },
  ]

  const lineData = {
    labels: ['Ene','Feb','Mar','Abr'],
    datasets: [{
      label: 'Incidencias',
      data: [kpis.incid || 0, 0, 0, 0], // Si no tienes por mes, ponemos solo el total
      borderColor: 'var(--color-primario)',
      backgroundColor: 'rgba(48,102,190,0.1)',
      fill: true,
      tension: 0.4
    }]
  }

  return (
    <div>
      {/* HEADER */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'3.2rem' }}>
        <div>
          <h2 style={{ fontSize:'var(--text-4xl)', margin:0, fontFamily: 'var(--font-titulos)' }}>Dashboard Ejecutivo</h2>
          <p style={{ color:'var(--color-texto)', opacity:0.7, margin:'0.4rem 0 0', fontSize:'var(--text-base)' }}>Periodo Académico: {periodo}</p>
        </div>
      </div>

      {/* GRID DE KPIs */}
      <div className="kpi-grid">
        {kpiData.map((kpi, i) => <KpiCard key={i} {...kpi} loading={loading} />)}
      </div>

      {/* ALERTA */}
      {kpis.incid > 0 && (
        <div style={{ background:'linear-gradient(90deg, #fef2f2, #fff)', borderLeft:'0.4rem solid #ef4444', padding:'1.6rem', borderRadius:'0.8rem', marginBottom:'3rem', display:'flex', gap:'1.2rem', alignItems:'center' }}>
          <AlertTriangle size={24} color="#ef4444" />
          <div style={{ fontSize:'var(--text-base)' }}><strong>Alertas:</strong> {kpis.prog} supervisiones pendientes | {kpis.incid} incidencias registradas</div>
        </div>
      )}

      {/* GRID DE GRAFICOS */}
      <div className="graficos-grid">
        <div className="card-sgpc" style={{ padding: '2.4rem' }}>
          <h3 style={{ marginBottom:'1.6rem', fontFamily: 'var(--font-titulos)' }}>Campos por Tipo EPS</h3>
          <div style={{ height: '30rem' }}>
            <Pie data={pieData} options={{ maintainAspectRatio: false, plugins:{ legend:{ position:'bottom', labels:{ font:{ size:14, family: 'var(--font-principal)' }}}}}}/>
          </div>
        </div>
        <div className="card-sgpc" style={{ padding: '2.4rem' }}>
          <h3 style={{ marginBottom:'1.6rem', fontFamily: 'var(--font-titulos)' }}>Incidencias del Periodo</h3>
          <div style={{ height: '30rem' }}>
            <Line data={lineData} options={{ maintainAspectRatio: false }} />
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ title, value, icon: Icon, color, loading }: any) {
  return (
    <div className="card-sgpc" style={{
      borderTop:`0.4rem solid ${color}`,
      transition:'all 0.3s',
      padding: '2rem'
    }}
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