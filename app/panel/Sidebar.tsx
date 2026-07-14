'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  Shield, Users, Building2, GraduationCap, ClipboardCheck,
  TrendingUp, BarChart3, Settings, FileText, MapPin,
  UserCog, UserCheck, BookOpen, Calendar, AlertTriangle,
  LayoutDashboard, Stethoscope, HeartPulse, ChevronDown, Menu, X
} from 'lucide-react'

const MENU_COMPLETO = [
  { title:'Administración y Seguridad', icon: Shield, items:[ {name:'1.1 Roles', href:'/panel/roles', icon: UserCog}, {name:'1.2 Permisos', href:'/panel/permisos', icon: Shield}, {name:'1.3 Usuarios', href:'/panel/usuarios', icon: Users}, {name:'1.4 Asignación de Roles', href:'/panel/asignacion', icon: UserCheck}, {name:'1.5 Gestión de Personas', href:'/panel/personas', icon: Users} ]},
  { title:'Personas', icon: Users, items:[ {name:'2.1 Personas', href:'/panel/personas', icon: Users}, {name:'2.2 Estudiantes', href:'/panel/estudiantes', icon: GraduationCap}, {name:'2.3 Docentes', href:'/panel/docentes', icon: BookOpen}, {name:'2.4 Supervisores', href:'/panel/supervisores', icon: UserCheck} ]},
  { title:'Gestión de Instituciones de Salud', icon: Building2, items:[ {name:'3.1 Ubigeo', href:'/panel/ubigeo', icon: MapPin}, {name:'3.2 Niveles de Atención', href:'/panel/niveles', icon: Stethoscope}, {name:'3.3 Servicios de Salud', href:'/panel/servicios', icon: HeartPulse}, {name:'3.4 EPS', href:'/panel/eps', icon: Building2}, {name:'3.5 Campos Clínicos', href:'/panel/campos', icon: Building2}, {name:'3.6 Asignación Docente', href:'/panel/asignacion-docente', icon: UserCheck} ]},
  { title:'Gestión Académica', icon: GraduationCap, items:[ {name:'4.1 Matrículas', href:'/panel/matriculas', icon: FileText}, {name:'4.2 Carga Académica', href:'/panel/carga', icon: BookOpen}, {name:'4.3 Grupos de Práctica', href:'/panel/grupos', icon: Users}, {name:'4.4 Horarios Académicos', href:'/panel/horarios', icon: Calendar} ]},
  { title:'Supervisión Clínica', icon: ClipboardCheck, items:[ {name:'5.1 Asignación Supervisores', href:'/panel/asig-supervisores', icon: UserCheck}, {name:'5.2 Programación Visitas', href:'/panel/programacion', icon: Calendar}, {name:'5.3 Registro Supervisiones', href:'/panel/supervisiones', icon: ClipboardCheck}, {name:'5.4 Evaluaciones', href:'/panel/evaluaciones', icon: TrendingUp}, {name:'5.5 Incidencias', href:'/panel/incidencias', icon: AlertTriangle}, {name:'5.6 Informe de Supervisión', href:'/panel/informes', icon: FileText} ]},
  { title:'Planes de Mejora', icon: TrendingUp, items:[ {name:'6.1 Plan de Mejora', href:'/panel/planes', icon: TrendingUp}, {name:'6.2 Seguimiento', href:'/panel/seguimiento', icon: BarChart3} ]},
  { title:'Gestión de Indicadores', icon: BarChart3, items:[ {name:'7.1 Indicadores de Calidad', href:'/panel/indicadores', icon: BarChart3} ]},
  { title:'Reportes', icon: BarChart3, items:[ {name:'8.1 Dashboard Ejecutivo', href:'/panel', icon: LayoutDashboard}, {name:'8.2 Reportes', href:'/panel/reportes', icon: FileText} ]},
  { title:'Configuración', icon: Settings, items:[ {name:'9.1 Periodo Académico', href:'/panel/periodo', icon: Calendar}, {name:'9.2 Parámetros del Sistema', href:'/panel/parametros', icon: Settings} ]},
]

export default function Sidebar({ rol }: { rol: string }) {
  const pathname = usePathname()
  const [openMenu, setOpenMenu] = useState<string | null>('REPORTES')
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // Cierra el menú mobile al cambiar de ruta
  useEffect(() => { setIsMobileOpen(false) }, [pathname])

  const toggleMenu = (title: string) => {
    setOpenMenu(openMenu === title? null : title)
  }

  return (
    <>
      {/* BOTON HAMBURGUESA SOLO EN MOBILE */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        style={{
          position:'fixed', top:'1.6rem', left:'1.6rem', zIndex:1001,
          background:'var(--color-primario)', color:'var(--color-blanco)', border:'none',
          padding:'1rem', borderRadius:'0.8rem', display:'none', cursor:'pointer'
        }}
        className="btn-mobile-menu"
      >
        {isMobileOpen? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* OVERLAY PARA CERRAR EN MOBILE */}
      {isMobileOpen && <div onClick={() => setIsMobileOpen(false)} style={{
        position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:999
      }} className="sidebar-overlay" />}

      <aside style={{
        width:'var(--sidebar-width)', backgroundColor:'var(--color-primario)', color:'var(--color-blanco)',
        padding:'2rem 0', overflowY:'auto', flexShrink:0, height:'100vh',
        transition:'transform 0.3s ease', zIndex:1000
      }}
      className={isMobileOpen? 'sidebar-mobile-open' : 'sidebar-desktop'}
      >
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:'1.2rem', padding:'0 2.4rem 2.4rem', borderBottom:'1px solid rgba(255,255,255,0.15)', marginBottom:'2rem' }}>
          <div style={{ width:'4rem', height:'4rem', backgroundImage:'var(--logo-ucs-url)', backgroundSize:'contain' }} />
          <div>
            <h2 style={{ fontSize:'var(--text-xl)', margin:0, fontFamily:'var(--font-titulos)' }}>SIGPAC</h2>
            <p style={{ fontSize:'var(--text-xs)', margin:0, opacity:0.8, textTransform:'uppercase', letterSpacing:'0.5px' }}>{rol}</p>
          </div>
        </div>

        <nav style={{ padding:'0 1.6rem' }}>
          {MENU_COMPLETO.map(mod => {
            const ModuleIcon = mod.icon
            const isOpen = openMenu === mod.title
            const hasActiveChild = mod.items.some(item => pathname === item.href)

            return (
              <div key={mod.title} style={{ marginBottom:'0.6rem' }}>
                <button
                  onClick={() => toggleMenu(mod.title)}
                  style={{
                    width:'100%', display:'flex', alignItems:'center', gap:'1.2rem',padding:'1.3rem 1.6rem', fontSize:'var(--text-base)',
                    background: hasActiveChild? 'var(--color-borde)' : 'transparent',
                    color:'var(--color-blanco)', textDecoration:'none', transition:'0.2s', borderRadius:'0.8rem',
                    border:'none', cursor:'pointer', fontWeight:400, textAlign:'left', fontFamily:'var(--font-titulos)'
                  }}
                  onMouseEnter={e => { if(!hasActiveChild) e.currentTarget.style.backgroundColor='rgba(255,255,255,0.1)' }}
                  onMouseLeave={e => { if(!hasActiveChild) e.currentTarget.style.backgroundColor='transparent' }}
                >
                  <ModuleIcon size={20} />
                  <span style={{ flex:1 }}>{mod.title}</span>
                  <ChevronDown size={18} style={{ transform: isOpen? 'rotate(180deg)' : 'rotate(0deg)', transition:'0.2s' }} />
                </button>

                {isOpen && (
                  <div style={{ paddingLeft:'3rem', marginTop:'0.6rem', display:'flex', flexDirection:'column', gap:'0.2rem' }}>
                    {mod.items.map(item => {
                      const ItemIcon = item.icon
                      const isActive = pathname === item.href
                      return (
                        <Link key={item.href} href={item.href} style={{
                          display:'flex', alignItems:'center', gap:'1rem', padding:'1rem 1.4rem', fontSize:'var(--text-sm)',
                          background: isActive? 'rgba(255,255,255,0.15)' : 'transparent',
                          color:'var(--color-blanco)', textDecoration:'none', transition:'0.2s', borderRadius:'0.6rem',
                          fontWeight: isActive? 600 : 500, fontFamily:'var(--font-principal)'
                        }}
                        onMouseEnter={e => { if(!isActive) e.currentTarget.style.backgroundColor='rgba(255,255,255,0.08)' }}
                        onMouseLeave={e => { if(!isActive) e.currentTarget.style.backgroundColor='transparent' }}
                        >
                          <ItemIcon size={17} />
                          <span>{item.name}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </aside>

      {/* CSS RESPONSIVE INJECTADO */}
      <style jsx global>{`
        @media (max-width: 1024px) {
         .btn-mobile-menu { display: block!important; }
         .sidebar-desktop { transform: translateX(-100%); position: fixed; }
         .sidebar-mobile-open { transform: translateX(0); position: fixed; box-shadow: 0 0 3rem rgba(0,0,0,0.3); }
        }
        @media (min-width: 1025px) {
         .sidebar-overlay { display: none!important; }
        }
      `}</style>
    </>
  )
}