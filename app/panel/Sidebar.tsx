'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/client'
import {
  Shield, Users, Building2, GraduationCap, ClipboardCheck,
  TrendingUp, BarChart3, Settings, FileText, MapPin,
  UserCog, UserCheck, BookOpen, Calendar, AlertTriangle,
  LayoutDashboard, Stethoscope, HeartPulse, ChevronDown, Menu, X, LogOut
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

export default function Sidebar({ user }: { user: any }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  /* useEffect(() => {
    const activeModule = MENU_COMPLETO.find(mod => mod.items.some(item => pathname.startsWith(item.href)))
    if(activeModule) setOpenMenu(activeModule.title)
    setIsMobileOpen(false)
  }, [pathname]) */
  useEffect(() => {
  const activeModule = MENU_COMPLETO.find(mod => mod.items.some(item => pathname.startsWith(item.href)))
  if(activeModule) setOpenMenu(activeModule.title)

  // SOLO cerrar el menu hamburguesa en mobile
  if (typeof window!== 'undefined' && window.innerWidth < 1024) {
    setIsMobileOpen(false)
  }
}, [pathname])

  const toggleMenu = (title: string) => setOpenMenu(openMenu === title? null : title)
  const logout = async () => { await supabase.auth.signOut(); router.push('/login') }
  const iniciales = `${user.nombres?.[0] || ''}${user.apellidos?.[0] || ''}`.toUpperCase()

  return (
    <>
      <button onClick={() => setIsMobileOpen(!isMobileOpen)} className="btn-mobile-menu">
        {isMobileOpen? <X size={24} /> : <Menu size={24} />}
      </button>
      {isMobileOpen && <div onClick={() => setIsMobileOpen(false)} className="sidebar-overlay" />}

      <aside className={`sidebar-wrapper ${isMobileOpen? 'sidebar-mobile-open' : ''}`}>
        <div className="sidebar-profile">
          <div className="avatar-circle">
            {user.avatar_url? <img src={user.avatar_url} alt="avatar" /> : <span>{iniciales}</span>}
          </div>
          <h3 className="user-name">{user.nombres} {user.apellidos}</h3>
          <p className="user-email">{user.email}</p>
          {user.nombrerol && <span className="user-rol">{user.nombrerol}</span>}
        </div>

        <nav className="sidebar-nav">
          {MENU_COMPLETO.map(mod => {
            const ModuleIcon = mod.icon
            const isOpen = openMenu === mod.title
            const hasActiveChild = mod.items.some(item => pathname.startsWith(item.href))
            return (
              <div key={mod.title} className="menu-module">
                <button onClick={() => toggleMenu(mod.title)} className={`menu-button ${hasActiveChild? 'active':''}`}>
                  <ModuleIcon size={20} /><span>{mod.title}</span>
                  {/* <ChevronDown size={18} className={`chevron ${isOpen? 'open':''}`} /> */}
                  <ChevronDown 
  size={18} 
  className="chevron" 
  style={{ 
    marginLeft: 'auto',
    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
    transition: 'transform 0.3s ease'
  }} 
/>
                </button>
                <div className={`submenu-wrapper ${isOpen? 'open' : ''}`}>
                  <div className="submenu">
                    {mod.items.map(item => {
                      const ItemIcon = item.icon
                      const isActive = pathname === item.href
                      return (
                        <Link key={item.href} href={item.href} className={`submenu-item ${isActive? 'active':''}`}>
                          <ItemIcon size={17} /><span>{item.name}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <button onClick={logout} className="btn-logout"><LogOut size={18} /> Cerrar Sesión</button>
        </div>
      </aside>

      <style jsx>{`
.sidebar-wrapper {
    width: var(--sidebar-width);
    
    background:var(--color-primario);
    color:var(--color-blanco);
    display:flex;
    flex-direction:column;
    height:100vh;
    position: sticky;
    top: 0;
    overflow-y: auto;
    transition: transform 0.3s ease;
    flex-shrink:0;
  }
.sidebar-profile { padding:2.4rem; text-align:center; border-bottom:1px solid rgba(255,255,255,0.15); flex-shrink:0; }
.sidebar-nav { flex:1; overflow-y:auto; padding:1.6rem; padding-bottom:2rem; }
.menu-button { width:100%; display:flex; align-items:center; gap:1.2rem; padding:1.3rem 1.6rem; font-size:var(--text-base); background:transparent; color:var(--color-blanco); border:none; cursor:pointer; font-weight:600; text-align:left; font-family:var(--font-titulos); border-radius:0.8rem; transition:0.2s; }
.menu-button span{flex:1;}
.menu-button:hover,.menu-button.active { background:var(--color-borde); }

.submenu-wrapper { max-height:0; overflow:hidden; transition:max-height 0.3s ease; }
.submenu-wrapper.open { max-height:800px; }
.submenu { padding-left:3rem; margin-top:0.6rem; display:flex; flex-direction:column; gap:0.2rem; }
.submenu-item { display:flex; align-items:center; gap:1rem; padding:1rem 1.4rem; font-size:var(--text-sm); color:var(--color-blanco); text-decoration:none; border-radius:0.6rem; font-weight:500; font-family:var(--font-principal); transition:0.2s; }
.submenu-item:hover,.submenu-item.active { background:rgba(255,255,255,0.15); font-weight:600; }
.sidebar-footer { padding:1.6rem; border-top:1px solid rgba(255,255,255,0.15); flex-shrink:0; background:var(--color-primario); }
.btn-logout { width:100%; display:flex; align-items:center; justify-content:center; gap:0.8rem; padding:1.2rem; background:var(--color-acento); color:var(--color-texto); border:none; border-radius:0.8rem; font-weight:700; font-size:var(--text-base); cursor:pointer; transition:0.2s; }
.btn-logout:hover { opacity:0.9; }
.avatar-circle { width:8rem; height:8rem; border-radius:50%; background:var(--color-secundario); margin:0 auto 1.2rem; display:flex; align-items:center; justify-content:center; font-size:3rem; font-weight:700; font-family:var(--font-titulos); overflow:hidden; border:3px solid var(--color-acento); }
.avatar-circle img { width:100%; height:100%; object-fit:cover; }
.user-name { font-size:var(--text-lg); margin:0; font-family:var(--font-titulos); font-weight:700; }
.user-email { font-size:var(--text-xs); margin:0.4rem 0 0.8rem; opacity:0.8; }
.user-rol { font-size:var(--text-sm); background:var(--color-acento); color:var(--color-texto); padding:0.4rem 1.2rem; border-radius:2rem; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; }
.btn-mobile-menu { position:fixed; top:1.6rem; left:1.6rem; z-index:1002; background:var(--color-primario); color:var(--color-blanco); border:none; padding:1rem; border-radius:0.8rem; display:none; cursor:pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
.sidebar-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:999; }

  @media (max-width: 1023px) {
 .btn-mobile-menu { display:block; }
 .sidebar-wrapper { 
     position:fixed;
     left:0; top:0; z-index:1001; 
     transform:translateX(-100%);
     height:100dvh;
   }
 .sidebar-mobile-open { transform:translateX(0); box-shadow:0 0 3rem rgba(0,0,0,0.3); }
  }
  @media (min-width: 1024px) {.sidebar-overlay { display:none; }}
 .sidebar-nav::-webkit-scrollbar { width: 6px; }
 .sidebar-nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.3); border-radius: 10px; }
`}</style>
    </>
  )
}