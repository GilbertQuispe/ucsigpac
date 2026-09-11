'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/client'
import { Users, UserCheck, X, Save, Search, Eraser, ChevronLeft, ChevronRight } from 'lucide-react'
import Select from '@/components/ui/SelectClient'
import { Toaster, toast } from 'react-hot-toast'

const SelectSGPCFieldset = ({label, value, onChange, options}:any) => {
  const selectedOption = options.find((o:any) => o.value === value) || null
  return (
    <fieldset className="fieldset-sgpc">
      <legend>{label}</legend>
      <Select options={options} value={selectedOption} onChange={(opt:any) => onChange(opt?.value || null)} placeholder="Seleccione..." isSearchable maxMenuHeight={200} classNamePrefix="react-select" menuPortalTarget={typeof window !== 'undefined' ? document.body : null} menuPosition="fixed" styles={{ control: (base, state) => ({...base, height: '4.4rem', minHeight: '4.4rem', borderRadius: '0.6rem', border: '1px solid #cbd5e1', background: '#fff', boxShadow: state.isFocused? '0 0 0 1px var(--color-primario)' : 'none', marginTop: '0.4rem', cursor: 'pointer' }), valueContainer: (base) => ({...base, padding: '0 1.2rem', height: '4.4rem' }), input: (base) => ({...base, margin: 0, padding: 0 }), indicatorsContainer: (base) => ({...base, height: '4.4rem' }), option: (base, state) => ({...base, backgroundColor: state.isSelected? 'var(--color-primario)' : state.isFocused? 'var(--color-acento)' : '#fff', color: state.isSelected? '#fff' : 'var(--color-texto)', padding: '1rem 1.2rem' }), menu: (base) => ({...base, zIndex: 9999, marginTop: '0.4rem' }) }} />
    </fieldset>
  )
}

export default function UsuariosPage() {
  const supabase = createClient()
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [roles, setRoles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  
  // Estados del modal
  const [idrolSel, setIdrolSel] = useState<number | null>(null)

  // Estados de Filtros y Paginación
  const [search, setSearch] = useState('')
  const [filtroRol, setFiltroRol] = useState<number | null>(null)
  const [paginaActual, setPaginaActual] = useState(1)
  const [totalRegistros, setTotalRegistros] = useState(0)
  const registrosPorPagina = 10
  const totalPaginas = Math.ceil(totalRegistros / registrosPorPagina)
  const indiceInicio = (paginaActual - 1) * registrosPorPagina

  useEffect(() => { cargarDatos() }, [paginaActual, search, filtroRol])
  useEffect(() => { setPaginaActual(1) }, [search, filtroRol])

  const cargarDatos = async () => {
    setLoading(true)
    const desde = (paginaActual - 1) * registrosPorPagina
    const hasta = desde + registrosPorPagina - 1

    let query = supabase.from('v_usuario_completo').select('*', { count: 'exact' })
    if(search) query = query.or(`nombres.ilike.%${search}%,apellidos.ilike.%${search}%,email.ilike.%${search}%`)
    if(filtroRol) query = query.eq('idrol', filtroRol)

    const { data, count } = await query.order('id', { ascending: false }).range(desde, hasta)
    setUsuarios(data || [])
    setTotalRegistros(count || 0)
    
    const { data: rolesData } = await supabase.from('rol').select('idrol, nombrerol')
    setRoles((rolesData || []).map((r: any) => ({value: r.idrol, label: r.nombrerol})))
    setLoading(false)
  }

  const handleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if(e.target.checked) setSelectedIds(usuarios.map(u => u.id))
    else setSelectedIds([])
  }

  const handleAsignarRol = async () => {
    if(selectedIds.length === 0) return toast.error('Selecciona al menos 1 usuario')
    if(!idrolSel) return toast.error('Selecciona un Rol')
    
    const { error } = await supabase.from('persona').update({ idrol: idrolSel }).in('id', selectedIds)
    if(error) toast.error(error.message)
    else { 
      toast.success(`Rol asignado a ${selectedIds.length} usuarios`); 
      setShowModal(false);
      setIdrolSel(null);
      setSelectedIds([]);
      cargarDatos() 
    }
  }

  const usuariosSeleccionados = usuarios.filter(u => selectedIds.includes(u.id))

  return (
    <>
      <Toaster position="top-right" />
      <div>
        {/* 1. HEADER SIGPAC */}
        <div className="header-responsive">
          <div>
            <h1><Users size={24} /> Asignación de Usuario - Rol</h1>
            <p>Total: {totalRegistros} registros</p>
          </div>
          <div style={{ display: 'flex', gap: '1.2rem' }}>
            <button 
              className="btn-primario" 
              onClick={() => setShowModal(true)}
              disabled={selectedIds.length === 0}
            >
              <UserCheck size={18} /> Asignar Rol ({selectedIds.length})
            </button>
          </div>
        </div>

        {/* 2. FILTROS SIGPAC: 1 LÍNEA RESPONSIVE */}
        <div className="card-sgpc" style={{ marginBottom: '2.4rem', padding: '2rem' }}>
          <div className="grid-filtros-usuarios">
            <SelectSGPCFieldset 
              label="Filtrar por Rol"
              value={filtroRol || ""}
              onChange={setFiltroRol}
              options={roles}
            />
            <div style={{ position: 'relative', width: "100%" }}>
              <Search size={18} style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, zIndex: 1 }} />
              <input 
                className="input-sgpc" 
                placeholder="Buscar por Nombres, Apellidos, Email..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                style={{ paddingLeft: '4rem', height: "4.4rem", width: "100%" }} 
              />
            </div>
            <button className="btn-secundario btn-limpiar" onClick={() => {setSearch(""); setFiltroRol(null)}}>
              <Eraser size={16} />Limpiar
            </button>
          </div>
        </div>

        {/* 3. TABLA MAIN SIGPAC CON CHECK */}
        <div className="card-sgpc" style={{ overflowX: 'auto' }}>
          {loading? <p>Cargando...</p> : (
            <table className='tabla-sgpc'>
              <thead>
                <tr>
                  <th style={{ padding: '1rem', width: '4rem' }}>
                    <input type="checkbox" onChange={handleSelectAll} checked={selectedIds.length === usuarios.length && usuarios.length > 0} />
                  </th>
                  <th style={{ padding: '1rem', width: '6rem' }}>NRO.</th>
                  <th style={{ padding: '1rem' }}>NOMBRES</th>
                  <th style={{ padding: '1rem' }}>APELLIDOS</th>
                  <th style={{ padding: '1rem' }}>EMAIL</th>
                  <th style={{ padding: '1rem' }}>ROL ACTUAL</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u, index) => (
                  <tr key={u.id}>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <input type="checkbox" checked={selectedIds.includes(u.id)} onChange={() => handleSelect(u.id)} />
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{indiceInicio + index + 1}</td>
                    <td style={{ padding: '1rem' }}>{u.nombres}</td>
                    <td style={{ padding: '1rem' }}>{u.apellidos}</td>
                    <td style={{ padding: '1rem' }}>{u.email}</td>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{u.nombrerol || 'Sin Rol'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 4. FOOTER PAGINACION SIGPAC */}
        {totalPaginas > 1 && (
          <div className="paginacion-footer">          
            <p className="paginacion-info">Mostrando {indiceInicio + 1} al {Math.min(indiceInicio + registrosPorPagina, totalRegistros)} de {totalRegistros} registros</p>
            <div className="paginacion-controles">
              <button className="btn-pag" onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1}>
                <ChevronLeft size={16} /> Anterior
              </button>
              <span className="paginacion-pagina">Pág {paginaActual} de {totalPaginas}</span>
              <button className="btn-pag btn-pag-primario" onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas}>
                Siguiente <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* 5. MODAL ASIGNAR ROL MASIVO SIGPAC */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{maxWidth: '55rem'}}>
              <div className="modal-header">
                <h2><UserCheck size={22}/>Asignar Rol a {selectedIds.length} Usuario(s)</h2>
                <button onClick={() => setShowModal(false)} className="btn-cerrar"><X size={20} /></button>
              </div>
              <div className="modal-body">
                <p style={{fontSize: '1.4rem', marginBottom: '1.6rem'}}>Se cambiará el rol para:</p>
                <div style={{maxHeight: '15rem', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '0.8rem', padding: '1rem', marginBottom: '1.6rem'}}>
                  {usuariosSeleccionados.map(u => <p key={u.id} style={{fontSize: '1.4rem'}}>- {u.nombres} {u.apellidos}</p>)}
                </div>
                <SelectSGPCFieldset label="Nuevo Rol *" value={idrolSel} onChange={setIdrolSel} options={roles} />
              </div>
              <div className='modal-footer'>
                <button className="btn-secundario" onClick={() => setShowModal(false)}><X size={16} />Cancelar</button>
                <button className="btn-primario" onClick={handleAsignarRol} disabled={!idrolSel}><Save size={16} /> Asignar Rol</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .grid-filtros-usuarios {
          display: grid;
          grid-template-columns: 1fr; /* MOBILE FIRST */
          gap: 1.6rem;
          align-items: end;
        }
        .btn-limpiar {
          height: 4.4rem;
          white-space: nowrap;
          justify-content: center;
        }
        @media (min-width: 768px) {
          .grid-filtros-usuarios {
            grid-template-columns: 25rem 1fr auto; /* DESKTOP: Select | Buscar | Limpiar */
          }
        }
      `}</style>
    </>
  )
}