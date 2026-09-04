'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/client'
import { Plus, Edit, X, Search, UserCog, ChevronLeft, ChevronRight, Eraser, Users, Check, UserX, UserCheck, GraduationCap } from 'lucide-react'
import Select from 'react-select'

type Persona = { idpersona: number; dni: string; apellidos: string; nombres: string; telefono: string | null; sexo: 'M' | 'F' | null }
type Supervisor = { idsupervisor: number; idpersona: number; idprofesion: number | null; estado: string | null; persona?: Persona; profesion?: { profesion: string } }
type Profesion = { idprofesion: number; profesion: string }

const SelectSGPCFieldset = ({label, value, onChange, options}:any) => {
  const selectedOption = options.find((o:any) => o.value === value) || null
  return (
    <fieldset className="fieldset-sgpc">
      <legend>{label}</legend>
      <Select 
        options={options} 
        value={selectedOption} 
        onChange={(opt:any) => onChange(opt?.value || null)} 
        placeholder="Seleccione..."
        isSearchable 
        maxMenuHeight={200}
        classNamePrefix="react-select" 
        styles={{ 
          control: (base, state) => ({ 
           ...base, 
            height: '4.4rem',
            minHeight: '4.4rem',
            borderRadius: '0.6rem', 
            border: '1px solid #cbd5e1',
            background: '#fff',
            boxShadow: state.isFocused ? '0 0 0 1px var(--color-primario)' : 'none',
            marginTop: '0.4rem',
            cursor: 'pointer'
          }),
          valueContainer: (base) => ({ ...base, padding: '0 1.2rem', height: '4.4rem' }),
          input: (base) => ({ ...base, margin: 0, padding: 0 }),
          indicatorsContainer: (base) => ({ ...base, height: '4.4rem' }),
          option: (base, state) => ({
           ...base,
            backgroundColor: state.isSelected ? 'var(--color-primario)' : state.isFocused ? 'var(--color-acento)' : '#fff',
            color: state.isSelected? '#fff' : 'var(--color-texto)',
            padding: '1rem 1.2rem'
          }),
          menu: (base) => ({...base, zIndex: 9999, marginTop: '0.4rem' })
        }}
      />
    </fieldset>
  )
}

const SelectSGPCSinLegend = ({value, onChange, options}:any) => {
  const selectedOption = options.find((o:any) => o.value === value) || null
  return (
    <Select 
      options={options} 
      value={selectedOption} 
      onChange={(opt:any) => onChange(opt?.value || null)} 
      placeholder="Seleccione..." 
      isSearchable 
      classNamePrefix="react-select"
      menuPortalTarget={typeof document !== 'undefined' ? document.body : null} // <-- CLAVE PARA MOBIL
      menuPosition="fixed"
      styles={{ 
        control: (base) => ({...base, height: '4.4rem', border: '1px solid #cbd5e1', boxShadow: 'none', fontSize: '1.4rem' }), 
        menuPortal: (base) => ({...base, zIndex: 99999 }) // <-- Para que no se corte
      }} 
    />
  )
}
export default function SupervisoresPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<'personas' | 'supervisores'>('personas')
  const [personas, setPersonas] = useState<Persona[]>([])
  const [supervisores, setSupervisores] = useState<Supervisor[]>([])
  const [profesiones, setProfesiones] = useState<Profesion[]>([])
  const [idRolSupervisor, setIdRolSupervisor] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroProfesion, setFiltroProfesion] = useState<number | ''>('')

  const [paginaActual, setPaginaActual] = useState(1)
  const registrosPorPagina = 10
  const [seleccionados, setSeleccionados] = useState<number[]>([])
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null)

  const [showModal, setShowModal] = useState(false)
  const [supervisorEdit, setSupervisorEdit] = useState<Supervisor | null>(null)
  const [form, setForm] = useState({ idprofesion: null as number | null })

  const showToast = (msg: string, type: 'error' | 'success' = 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: rolData } = await supabase.from('rol').select('idrol').ilike('nombrerol', '%supervisor%').single()
    setIdRolSupervisor(rolData?.idrol || null)

    const {data: prof} = await supabase.from('profesion').select('*').order('profesion')
    setProfesiones(prof || [])

    const {data: personasData} = await supabase.from('persona').select('*').eq('estado', 'ACTIVO').eq('idrol', rolData?.idrol)
    const {data: supervisoresData} = await supabase.from('supervisor').select('idpersona')
    const idsSupervisores = supervisoresData?.map(s => s.idpersona) || []
    setPersonas((personasData || []).filter(p =>!idsSupervisores.includes(p.idpersona)))

    const {data: supervisoresFull} = await supabase.from('supervisor').select(`*, persona!inner(*), profesion(*)`).order('idsupervisor')
    setSupervisores(supervisoresFull as Supervisor[] || [])
    setLoading(false)
    setSeleccionados([])
  }

  const datosFiltrados = useMemo(() => {
    const data = tab === 'personas'? personas : supervisores
    return data.filter((d:any) => {
      const matchSearch = 
        d.dni?.toLowerCase().includes(search.toLowerCase()) ||
        d.persona?.dni.toLowerCase().includes(search.toLowerCase()) ||
        d.apellidos?.toLowerCase().includes(search.toLowerCase()) ||
        d.persona?.apellidos.toLowerCase().includes(search.toLowerCase())

      if(tab === 'personas') return matchSearch

      const matchEstado = !filtroEstado || d.estado === filtroEstado
      const matchProfesion = !filtroProfesion || d.idprofesion === filtroProfesion

      return matchSearch && matchEstado && matchProfesion
    })
  }, [personas, supervisores, search, tab, filtroEstado, filtroProfesion])

  const totalPaginas = Math.ceil(datosFiltrados.length / registrosPorPagina)
  const indiceInicio = (paginaActual - 1) * registrosPorPagina
  const datosPaginados = datosFiltrados.slice(indiceInicio, indiceInicio + registrosPorPagina)

  const toggleCheck = (id: number) => {
    setSeleccionados(prev => prev.includes(id)? prev.filter(i => i!== id) : [...prev, id])
  }

  const handleConvertirMasivo = async () => {
    if(seleccionados.length === 0) {
      showToast('Seleccione un registro', 'error')
      return
    }
    const paraInsertar = seleccionados.map(id => ({ idpersona: id, estado: 'ACTIVO' }))
    const {error} = await supabase.from('supervisor').insert(paraInsertar)
    if(error) showToast(error.message, 'error')
    else {
      showToast(`${seleccionados.length} supervisores registrados`, 'success')
      fetchData()
    }
  }

  const handleCambiarEstadoSupervisor = async (idsupervisor: number, estadoActual: string) => {
    const nuevoEstado = estadoActual === 'ACTIVO'? 'INACTIVO' : 'ACTIVO'
    const {error} = await supabase.from('supervisor').update({estado: nuevoEstado}).eq('idsupervisor', idsupervisor)
    if(error) showToast(error.message, 'error')
    else {
      showToast(`Supervisor ${nuevoEstado.toLowerCase()}`, 'success')
      fetchData()
    }
  }

  const openEditModal = (s: Supervisor) => {
    setSupervisorEdit(s)
    setForm({ idprofesion: s.idprofesion })
    setShowModal(true)
  }

  const handleGuardarEdit = async () => {
    if(!supervisorEdit) return
    const {error} = await supabase.from('supervisor').update(form).eq('idsupervisor', supervisorEdit.idsupervisor)
    if(error) showToast(error.message, 'error')
    else {
      showToast('Supervisor actualizado', 'success')
      setShowModal(false); fetchData()
    }
  }

  const limpiarFiltros = () => {
    setSearch("")
    setFiltroEstado("")
    setFiltroProfesion("")
    setPaginaActual(1)
  }

  return (
    <div className="main-content">
      <div className="header-responsive">
        <div>
          <h1><UserCog size={24} style={{marginRight: '0.8rem'}}/>Gestión de Supervisores</h1>
          <p>Total: {datosFiltrados.length} registros</p>
        </div>
        <div style={{ display: 'flex', gap: '1.2rem' }}>
          <button className="btn-primario" onClick={handleConvertirMasivo}>
            <Check size={18} /> Convertir {seleccionados.length} Seleccionados
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', margin: '2rem 0' }}>
        <button onClick={() => {setTab('personas'); setPaginaActual(1)}} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '4.4rem', gap: '0.8rem', padding: '0 2rem', borderRadius: '0.8rem', border: tab==='personas'? '1px solid var(--color-primario)' : '1px solid #cbd5e1', background: tab==='personas'? 'var(--color-primario)' : '#fff', color: tab==='personas'? '#fff' : 'var(--color-texto-secundario)', fontWeight: 600, fontSize: '1.4rem', cursor: 'pointer', transition: 'all 0.2s' }}>
          <Users size={16}/> Personas con Rol Supervisor
        </button>
        <button onClick={() => {setTab('supervisores'); setPaginaActual(1)}} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '4.4rem', gap: '0.8rem', padding: '0 2rem', borderRadius: '0.8rem', border: tab==='supervisores'? '1px solid var(--color-primario)' : '1px solid #cbd5e1', background: tab==='supervisores'? 'var(--color-primario)' : '#fff', color: tab==='supervisores'? '#fff' : 'var(--color-texto-secundario)', fontWeight: 600, fontSize: '1.4rem', cursor: 'pointer', transition: 'all 0.2s' }}>
          <UserCog size={16}/> Supervisores Registrados
        </button>
      </div>

      <div className="card-sgpc" style={{ marginBottom: '2.4rem', padding: '2rem', overflow: 'visible' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(20rem, 1fr))', gap: '1.2rem', marginBottom: '1.6rem' }}>
          <SelectSGPCFieldset 
            label="Estado" 
            value={filtroEstado} 
            onChange={(val:any) => {setFiltroEstado(val); setPaginaActual(1)}} 
            options={[{value: "", label: "Todos"}, {value: "ACTIVO", label: "ACTIVO"}, {value: "INACTIVO", label: "INACTIVO"}]}
          />
          <SelectSGPCFieldset 
            label="Profesión" 
            value={filtroProfesion} 
            onChange={(val:any) => {setFiltroProfesion(val); setPaginaActual(1)}} 
            options={[{value: "", label: "Todas"}, ...profesiones.map(p=>({value:p.idprofesion, label:p.profesion}))]}
          />
        </div>

        <div style={{display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap'}}>
          <div style={{ position: 'relative', flex: 1, minWidth: '25rem' }}>
            <Search size={18} style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
            <input className="input-sgpc" placeholder="Buscar por DNI, Nombres, Apellidos..." value={search} onChange={e => {setSearch(e.target.value); setPaginaActual(1)}} style={{ paddingLeft: '4rem', height: "4.4rem", width: '100%' }} />
          </div>
          <button className="btn-secundario btn-limpiar" onClick={limpiarFiltros} style={{height: '4.4rem'}}><Eraser size={16} />Limpiar</button>
        </div>
      </div>

      <div className="card-sgpc" style={{ overflowX: 'auto', position: 'relative', minHeight: '20rem' }}>
        {toast && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10, background: toast.type === 'error'? '#EF4444' : '#22C55E', color: '#fff', padding: '0.9rem 2rem', borderRadius: '0.8rem', fontWeight: 600, fontSize: '1.4rem', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', animation: 'fadeInOut 3s ease-in-out', whiteSpace: 'nowrap' }}>
            {toast.msg}
          </div>
        )}

        {loading? <p style={{padding: '2rem', textAlign: 'center'}}>Cargando...</p> : (
          <table className='tabla-sgpc'>
            <thead><tr>
              {tab==='personas' && <th style={{width: '5rem'}}>SEL</th>}
              <th>#</th><th>DNI</th><th>NOMBRES</th>
              {tab==='supervisores' && <><th>PROFESIÓN</th><th>ESTADO</th></>}
              <th>ACCIONES</th>
            </tr></thead>
            <tbody>
              {datosPaginados.map((d:any, i) => (
                <tr key={i}>
                  {tab==='personas' && <td><input type="checkbox" checked={seleccionados.includes(d.idpersona)} onChange={() => toggleCheck(d.idpersona)} /></td>}
                  <td>{indiceInicio + i + 1}</td>
                  <td>{d.dni || d.persona?.dni}</td>
                  <td>{d.apellidos || d.persona?.apellidos}, {d.nombres || d.persona?.nombres}</td>
                  {tab==='supervisores' && <>
                    <td>{d.profesion?.profesion || 'S/PROFESION'}</td>
                    <td>
                      <span style={{ padding: '0.4rem 0.8rem', borderRadius: '999px', fontSize: '1.2rem', fontWeight: 600, background: d.estado === 'ACTIVO'? '#F0FDF4' : '#FEF2F2', color: d.estado === 'ACTIVO'? '#22C55E' : '#EF4444' }}>
                        {d.estado || 'ACTIVO'}
                      </span>
                    </td>
                  </>}
                  <td style={{display: 'flex', gap: '0.8rem'}}>
                    {tab==='supervisores' && <>
                      <button onClick={() => openEditModal(d)} className="btn-icon btn-icon-editar" title="Editar"><Edit size={15} /></button>
                      <button onClick={() => handleCambiarEstadoSupervisor(d.idsupervisor, d.estado || 'ACTIVO')} className={d.estado === 'ACTIVO'? "btn-icon btn-icon-eliminar" : "btn-icon btn-icon-activar"} title={d.estado === 'ACTIVO'? 'Inactivar' : 'Activar'}>
                        {d.estado === 'ACTIVO'? <UserX size={15} color="#fff" /> : <UserCheck size={15} color="#fff" />}
                      </button>
                    </>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPaginas > 1 && (
        <div className="paginacion-footer">
          <p>Mostrando {indiceInicio + 1} al {Math.min(indiceInicio + registrosPorPagina, datosFiltrados.length)} de {datosFiltrados.length}</p>
          <div className="paginacion-controles">
            <button className="btn-pag" onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1}><ChevronLeft size={16} /> Anterior</button>
            <span>Pág {paginaActual} de {totalPaginas}</span>
            <button className="btn-pag" onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas}>Siguiente <ChevronRight size={16} /></button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{maxWidth: '50rem'}}>
            <div className="modal-header">
              <div>
                <div style={{display: 'flex', alignItems: 'center', gap: '0.8rem'}}>
                  
                  <h2 style={{color: 'var(--color-texto-secundario)'}}> <Users size={18} style={{color: 'var(--color-texto-secundario)'}}/> Actualizar Datos del Supervisor</h2>
                </div>
                {supervisorEdit && (
                  <p style={{fontSize: 'var(--text-sm)', color: 'var(--color-texto-secundario)', marginTop: '0.4rem', fontWeight: 400}}>
                    {supervisorEdit.persona?.apellidos}, {supervisorEdit.persona?.nombres} - DNI: {supervisorEdit.persona?.dni}
                  </p>
                )}
              </div>
              <button onClick={() => setShowModal(false)} className="btn-cerrar-modal"><X size={18} /></button>
            </div>

            <div className="modal-body">
              <fieldset className="fieldset-sgpc" style={{background: '#F0FDF4', borderLeft: '4px solid #22C55E'}}>
                  <legend><GraduationCap size={14}/> Profesion *</legend>
              <SelectSGPCSinLegend                
                value={form.idprofesion}
                onChange={(val:any) => setForm({...form, idprofesion: val})}
                options={profesiones.map(p=>({value:p.idprofesion, label:p.profesion}))}
              />
              </fieldset>
            </div>

            <div className="modal-footer" style={{borderTop: '2px solid var(--color-primario)'}}>
              <button className="btn-secundario" onClick={() => setForm({idprofesion: null})}><Eraser size={18} /> Limpiar</button>
              <button className="btn-primario" onClick={handleGuardarEdit}><Check size={18} /> Guardar</button>
            </div>
          </div>
        </div>
      )}
            <style jsx>{`

.modal-header { 
  background: var(--color-primario); 
  color: #fff; 
  padding: 2rem 2.4rem; 
  display: flex; 
  justify-content: space-between; 
  align-items: center;
  border-radius: 1.2rem 1.2rem 0 0;
}

    .modal-content {
  background: #f8fafc; /* gris clarito de fondo */
  padding: 0;
  border-radius: 1.2rem;
  overflow: hidden; /* para que el header azul no se salga */
}
.modal-body {
  background: #fff; /* blanco para los campos */
  padding: 2.4rem;
}
  .modal-footer { 
  padding: 1.6rem 2.4rem; 
  border-top: 1px solid #e2e8f0; 
  display: flex; 
  justify-content: flex-end; 
  gap: 1.2rem;
  background: #f8fafc;
  border-radius: 0 0 1.2rem 1.2rem;
}
.btn-cerrar-modal { color: #fff; background: transparent; border: none; }
    .grid-2-modal {
        display: grid;
        grid-template-columns: 1fr; /* mobil first: 1 columna */
        gap: 1.6rem;
      }
      @media (min-width: 768px) {
        .grid-2-modal {
          grid-template-columns: 1fr 1fr; /* tablet/desktop: 2 columnas */
        }
      }
  `}</style>
    </div>
  )
}