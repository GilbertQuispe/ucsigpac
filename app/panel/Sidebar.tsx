'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const MENU_COMPLETO = [
  { title:'ADMINISTRACIÓN Y SEGURIDAD', items:[
    {name:'1.1 Roles', href:'/panel/roles'}, {name:'1.2 Permisos', href:'/panel/permisos'},
    {name:'1.3 Usuarios', href:'/panel/usuarios'}, {name:'1.4 Asignación de Roles', href:'/panel/asignacion'},
    {name:'1.5 Gestión de Personas', href:'/panel/personas'}
  ]},
  { title:'PERSONAS', items:[
    {name:'2.1 Personas', href:'/panel/personas'}, {name:'2.2 Estudiantes', href:'/panel/estudiantes'},
    {name:'2.3 Docentes', href:'/panel/docentes'}, {name:'2.4 Supervisores', href:'/panel/supervisores'}
  ]},
  { title:'GESTIÓN DE INSTITUCIONES DE SALUD', items:[
    {name:'3.1 Ubigeo', href:'/panel/ubigeo'}, {name:'3.2 Niveles de Atención', href:'/panel/niveles'},
    {name:'3.3 Servicios de Salud', href:'/panel/servicios'}, {name:'3.4 EPS', href:'/panel/eps'},
    {name:'3.5 Campos Clínicos', href:'/panel/campos'}, {name:'3.6 Asignación Docente', href:'/panel/asignacion-docente'}
  ]},
  { title:'GESTIÓN ACADÉMICA', items:[
    {name:'4.1 Matrículas', href:'/panel/matriculas'}, {name:'4.2 Carga Académica', href:'/panel/carga'},
    {name:'4.3 Grupos de Práctica', href:'/panel/grupos'}, {name:'4.4 Horarios Académicos', href:'/panel/horarios'}
  ]},
  { title:'SUPERVISIÓN CLÍNICA', items:[
    {name:'5.1 Asignación Supervisores', href:'/panel/asig-supervisores'}, {name:'5.2 Programación Visitas', href:'/panel/programacion'},
    {name:'5.3 Registro Supervisiones', href:'/panel/supervisiones'}, {name:'5.4 Evaluaciones', href:'/panel/evaluaciones'},
    {name:'5.5 Incidencias', href:'/panel/incidencias'}, {name:'5.6 Informe de Supervisión', href:'/panel/informes'}
  ]},
  { title:'PLANES DE MEJORA', items:[
    {name:'6.1 Plan de Mejora', href:'/panel/planes'}, {name:'6.2 Seguimiento', href:'/panel/seguimiento'}
  ]},
  { title:'GESTIÓN DE INDICADORES', items:[
    {name:'7.1 Indicadores de Calidad', href:'/panel/indicadores'}
  ]},
  { title:'REPORTES', items:[
    {name:'8.1 Dashboard Ejecutivo', href:'/panel'}, {name:'8.2 Reportes', href:'/panel/reportes'}
  ]},
  { title:'CONFIGURACIÓN', items:[
    {name:'9.1 Periodo Académico', href:'/panel/periodo'}, {name:'9.2 Parámetros del Sistema', href:'/panel/parametros'}
  ]},
]

export default function Sidebar({ rol }: { rol: string }) {
  const pathname = usePathname()
  // Por ahora mostramos todo. Luego filtramos por rol
  const MENU = MENU_COMPLETO

  return (
    <aside style={{
      width:'26rem', backgroundColor:'var(--color-primario)', color:'var(--color-blanco)',
      padding:'1.6rem 0', overflowY:'auto', flexShrink:0
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:'1rem', padding:'0 2rem 2rem' }}>
        <div style={{ width:'3.2rem', height:'3.2rem', backgroundImage:'var(--logo-ucs-url)', backgroundSize:'contain' }} />
        <h2 style={{ fontSize:'var(--text-lg)', margin:0 }}>SIGPAC</h2>
      </div>
      <nav>
        {MENU.map(mod => (
          <div key={mod.title} style={{ marginBottom:'1.6rem' }}>
            <p style={{ padding:'0 2rem', fontSize:'var(--text-xs)', opacity:0.7, textTransform:'uppercase', marginBottom:'0.8rem', fontWeight:600 }}>{mod.title}</p>
            {mod.items.map(item => (
              <Link key={item.href} href={item.href} style={{
                display:'block', padding:'1rem 2rem', fontSize:'var(--text-base)',
                background: pathname === item.href? 'var(--color-borde)' : 'transparent',
                color:'var(--color-blanco)', textDecoration:'none', transition:'0.2s'
              }}>
                {item.name}
              </Link>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  )
}