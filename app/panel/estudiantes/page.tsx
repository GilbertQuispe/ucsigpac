'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/client'
import { Plus, Edit, X, Search, Upload, Users, ChevronLeft, ChevronRight, Eraser, Check, UserX, UserCheck, GraduationCap, Save } from 'lucide-react'
import Select from 'react-select'

type Persona = { idpersona: number; dni: string; apellidos: string; nombres: string; telefono: string | null; sexo: 'M' | 'F' | null }
type Estudiante = { idestudiante: number; idpersona: number; idcarrera: number | null; idfilial: number | null; estado: string | null; persona?: Persona; carrera?: { idcarrera: number; nombrecarrera: string; idfacultad: number | null; facultad?: {nombrefacultad: string} }; filial?: { idfilial: number; nombrefilial: string } }
type Carrera = { idcarrera: number; nombrecarrera: string; idfacultad: number | null; facultad?: {nombrefacultad: string} }
type Facultad = { idfacultad: number; nombrefacultad: string }
type Filial = { idfilial: number; nombrefilial: string }

const SelectSGPCFieldset = ({label, value, onChange, options}:any) => {
  const selectedOption = options.find((o:any) => o.value === value) || null
  return (
    <fieldset className="fieldset-sgpc">
      <legend>{label}</legend>
      <Select options={options} value={selectedOption} onChange={(opt:any) => onChange(opt?.value || null)} placeholder="Seleccione..." isSearchable maxMenuHeight={200} classNamePrefix="react-select" styles={{ control: (base, state) => ({...base, height: '4.4rem', minHeight: '4.4rem', borderRadius: '0.6rem', border: '1px solid #cbd5e1', background: '#fff', boxShadow: state.isFocused? '0 0 0 1px var(--color-primario)' : 'none', marginTop: '0.4rem', cursor: 'pointer' }), valueContainer: (base) => ({...base, padding: '0 1.2rem', height: '4.4rem' }), input: (base) => ({...base, margin: 0, padding: 0 }), indicatorsContainer: (base) => ({...base, height: '4.4rem' }), option: (base, state) => ({...base, backgroundColor: state.isSelected? 'var(--color-primario)' : state.isFocused? 'var(--color-acento)' : '#fff', color: state.isSelected? '#fff' : 'var(--color-texto)', padding: '1rem 1.2rem' }), menu: (base) => ({...base, zIndex: 9999, marginTop: '0.4rem' }) }} />
    </fieldset>
  )
}

export default function EstudiantesPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<'personas' | 'estudiantes'>('personas')
  const [personas, setPersonas] = useState<Persona[]>([])
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([])
  const [carreras, setCarreras] = useState<Carrera[]>([])
  const [facultades, setFacultades] = useState<Facultad[]>([])
  const [filiales, setFiliales] = useState<Filial[]>([])
  const [idRolEstudiante, setIdRolEstudiante] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroCarrera, setFiltroCarrera] = useState<number | ''>('')
  const [filtroFacultad, setFiltroFacultad] = useState<number | ''>('')
  const [filtroFilial, setFiltroFilial] = useState<number | ''>('')

  const [paginaActual, setPaginaActual] = useState(1)
  const registrosPorPagina = 10
  const [seleccionados, setSeleccionados] = useState<number[]>([])
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null)

  const [showModal, setShowModal] = useState(false)
  const [showModalConvertir, setShowModalConvertir] = useState(false)
  const [formConvertirMasivo, setFormConvertirMasivo] = useState<any[]>([])
  const [estudianteEdit, setEstudianteEdit] = useState<Estudiante | null>(null)
  const [form, setForm] = useState({ idcarrera: null, idfilial: null, estado: 'ACTIVO' })

  const showToast = (msg: string, type: 'error' | 'success' = 'error') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }
  const [previewDataEst, setPreviewDataEst] = useState<any[]>([])
  const [showPreviewModalEst, setShowPreviewModalEst] = useState(false)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: rolData } = await supabase.from('rol').select('idrol').ilike('nombrerol', '%estudiante%').single()
    setIdRolEstudiante(rolData?.idrol || null)
    const [{data: car}, {data: fac}, {data: fil}] = await Promise.all([ supabase.from('carrera').select('*, facultad(*)').order('nombrecarrera'), supabase.from('facultad').select('*').order('nombrefacultad'), supabase.from('filial').select('*').order('nombrefilial') ])
    setCarreras(car || []); setFacultades(fac || []); setFiliales(fil || [])
    const {data: personasData} = await supabase.from('persona').select('*').eq('estado', 'ACTIVO').eq('idrol', rolData?.idrol)
    const {data: estudiantesData} = await supabase.from('estudiante').select('idpersona')
    const idsEstudiantes = estudiantesData?.map(d => d.idpersona) || []
    setPersonas((personasData || []).filter(p =>!idsEstudiantes.includes(p.idpersona)))
    const {data: estudiantesFull} = await supabase.from('estudiante').select(`*, persona!inner(*), carrera!left(*, facultad!left(*)), filial!left(*)`).order('idestudiante')
    setEstudiantes(estudiantesFull as Estudiante[] || [])
    setLoading(false)
    setSeleccionados([])
  }

 const datosFiltrados = useMemo(() => {
  const data = tab === 'personas'? personas : estudiantes
  return data.filter((d:any) => {
    const matchSearch = d.dni?.toLowerCase().includes(search.toLowerCase()) || d.persona?.dni.toLowerCase().includes(search.toLowerCase()) || d.apellidos?.toLowerCase().includes(search.toLowerCase()) || d.persona?.apellidos.toLowerCase().includes(search.toLowerCase()) || d.nombres?.toLowerCase().includes(search.toLowerCase()) || d.persona?.nombres.toLowerCase().includes(search.toLowerCase())
    if(tab === 'personas') return matchSearch
    const matchEstado =!filtroEstado || d.estado === filtroEstado
    const matchCarrera =!filtroCarrera || d.idcarrera === filtroCarrera
    const matchFacultad =!filtroFacultad || d.carrera?.idfacultad === filtroFacultad
    const matchFilial =!filtroFilial || d.idfilial === filtroFilial
    return matchSearch && matchEstado && matchCarrera && matchFacultad && matchFilial
  })
}, [personas, estudiantes, search, tab, filtroEstado, filtroCarrera, filtroFacultad, filtroFilial])

  const totalPaginas = Math.ceil(datosFiltrados.length / registrosPorPagina)
  const indiceInicio = (paginaActual - 1) * registrosPorPagina
  const datosPaginados = datosFiltrados.slice(indiceInicio, indiceInicio + registrosPorPagina)

  const toggleCheck = (id: number) => { setSeleccionados(prev => prev.includes(id)? prev.filter(i => i!== id) : [...prev, id]) }

  const handleAbrirModalConvertir = () => {
    if(seleccionados.length === 0) {
      showToast('Seleccione por lo menos un registro', 'error'); // MENSAJE NUEVO
      return
    }
    const personasSeleccionadas = personas.filter(p => seleccionados.includes(p.idpersona))
    const formInicial = personasSeleccionadas.map(p => ({...p, idcarrera: null, idfilial: null, estado: 'ACTIVO' }))
    setFormConvertirMasivo(formInicial)
    setShowModalConvertir(true)
  }

  const handleGuardarConvertirMasivo = async () => {
    const incompletos = formConvertirMasivo.filter(f =>!f.idcarrera ||!f.idfilial)
    if(incompletos.length > 0) { showToast('Complete Carrera y Filial para todos', 'error'); return }

    const paraInsertar = formConvertirMasivo.map(f => ({ idpersona: f.idpersona, idcarrera: f.idcarrera, idfilial: f.idfilial, estado: f.estado }))
    const {error} = await supabase.from('estudiante').insert(paraInsertar)
    if(error) showToast(error.message, 'error')
    else {
      showToast(`Se convirtió ${paraInsertar.length} seleccionado a estudiantes`, 'success') // MENSAJE NUEVO
      setShowModalConvertir(false)
      setSeleccionados([])
      fetchData()
    }
  }

  const handleCambiarEstadoEstudiante = async (idestudiante: number, estadoActual: string) => {
    const nuevoEstado = estadoActual === 'ACTIVO'? 'INACTIVO' : 'ACTIVO'
    const {error} = await supabase.from('estudiante').update({estado: nuevoEstado}).eq('idestudiante', idestudiante)
    if(error) showToast(error.message, 'error')
    else { showToast(`Estudiante ${nuevoEstado.toLowerCase()}`, 'success'); fetchData() }
  }

  const openEditModal = (d: Estudiante) => { setEstudianteEdit(d); setForm({ idcarrera: d.idcarrera, idfilial: d.idfilial, estado: d.estado || 'ACTIVO' }); setShowModal(true) }
  const handleGuardarEdit = async () => {
    if(!estudianteEdit) return
    const {error} = await supabase.from('estudiante').update(form).eq('idestudiante', estudianteEdit.idestudiante)
    if(error) showToast(error.message, 'error')
    else { showToast('Estudiante actualizado', 'success'); setShowModal(false); fetchData() }
  }

  const handleImportEstudiante = async (e: React.ChangeEvent<HTMLInputElement>) => { /*... igual que antes... */ }
  const handleConfirmImportEst = async () => { /*... igual que antes... */ }
  const limpiarFiltros = () => { setSearch(""); setFiltroEstado(""); setFiltroCarrera(""); setFiltroFacultad(""); setFiltroFilial(""); setPaginaActual(1) }

  return (
    <div className="main-content">
      {/* TOAST GLOBAL - FIX ZINDEX */}
      {toast && (
        <div style={{
          position: 'fixed', // CAMBIO: fixed para que flote sobre todo
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 99999, // CAMBIO: zIndex altisimo
          background: toast.type === 'error'? '#EF4444' : '#22C55E',
          color: '#fff',
          padding: '1.2rem 2.4rem',
          borderRadius: '0.8rem',
          fontWeight: 600,
          fontSize: '1.4rem',
          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.2)',
          animation: 'fadeInOut 3s ease-in-out',
          whiteSpace: 'nowrap'
        }}>
          {toast.msg}
        </div>
      )}

      <div className="header-responsive">
        <div><h1><GraduationCap size={24} style={{marginRight: '0.8rem'}}/>Gestión de Estudiantes</h1><p>Total: {datosFiltrados.length} registros</p></div>
        <div style={{ display: 'flex', gap: '1.2rem' }}>
          <label htmlFor="import-estudiante" className="btn-secundario" style={{ cursor: 'pointer' }}><Upload size={18} /> Importar Excel</label>
          <input id="import-estudiante" type="file" accept=".xlsx,.xls" onChange={handleImportEstudiante} style={{ display: 'none' }} />
          <button className="btn-primario" onClick={handleAbrirModalConvertir}><Check size={18} /> Convertir {seleccionados.length} Seleccionados</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', margin: '2rem 0' }}>
        <button onClick={() => {setTab('personas'); setPaginaActual(1)}} className={tab==='personas'? 'btn-primario' : 'btn-secundario'} style={{display: 'flex', alignItems: 'center', gap: '0.8rem'}}><Users size={16}/> Personas con Rol Estudiante</button>
        <button onClick={() => {setTab('estudiantes'); setPaginaActual(1)}} className={tab==='estudiantes'? 'btn-primario' : 'btn-secundario'} style={{display: 'flex', alignItems: 'center', gap: '0.8rem'}}><GraduationCap size={16}/> Estudiantes Registrados</button>
      </div>

      <div className="card-sgpc" style={{ marginBottom: '2.4rem', padding: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(20rem, 1fr))', gap: '1.2rem', marginBottom: '1.6rem' }}>
          <SelectSGPCFieldset label="Estado" value={filtroEstado} onChange={(val:any) => {setFiltroEstado(val); setPaginaActual(1)}} options={[{value: "", label: "Todos"}, {value: "ACTIVO", label: "ACTIVO"}, {value: "INACTIVO", label: "INACTIVO"}]} />
          <SelectSGPCFieldset label="Facultad" value={filtroFacultad} onChange={(val:any) => {setFiltroFacultad(val); setPaginaActual(1)}} options={[{value: "", label: "Todas"},...facultades.map(f=>({value:f.idfacultad, label:f.nombrefacultad}))]} />
          <SelectSGPCFieldset label="Carrera" value={filtroCarrera} onChange={(val:any) => {setFiltroCarrera(val); setPaginaActual(1)}} options={[{value: "", label: "Todas"},...carreras.map(c=>({value:c.idcarrera, label:c.nombrecarrera}))]} />
          <SelectSGPCFieldset label="Filial" value={filtroFilial} onChange={(val:any) => {setFiltroFilial(val); setPaginaActual(1)}} options={[{value: "", label: "Todas"},...filiales.map(f=>({value:f.idfilial, label:f.nombrefilial}))]} />
        </div>
        <div style={{display: 'flex', gap: '1rem', alignItems: 'flex-end'}}><div style={{ position: 'relative', flex: 1 }}><Search size={18} style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} /><input className="input-sgpc" placeholder="Buscar por DNI, Nombres, Apellidos..." value={search} onChange={e => {setSearch(e.target.value); setPaginaActual(1)}} style={{ paddingLeft: '4rem', height: "4.4rem", width: '100%' }} /></div><button className="btn-secundario btn-limpiar" onClick={limpiarFiltros} style={{height: '4.4rem'}}><Eraser size={16} />Limpiar</button></div>
      </div>

      <div className="card-sgpc" style={{ overflowX: 'auto' }}>
        <table className='tabla-sgpc'>
          <thead><tr>{tab==='personas' && <th style={{width: '5rem'}}>SEL</th>}<th>#</th><th>DNI</th><th>NOMBRES</th>{tab==='estudiantes' && <><th>CARRERA</th><th>FACULTAD</th><th>FILIAL</th><th>ESTADO</th></>}<th>ACCIONES</th></tr></thead>
          <tbody>{datosPaginados.map((d:any, i) => (<tr key={i}>{tab==='personas' && <td><input type="checkbox" checked={seleccionados.includes(d.idpersona)} onChange={() => toggleCheck(d.idpersona)} /></td>}<td>{indiceInicio + i + 1}</td><td>{d.dni || d.persona?.dni}</td><td>{d.apellidos || d.persona?.apellidos}, {d.nombres || d.persona?.nombres}</td>{tab==='estudiantes' && <><td>{d.carrera?.nombrecarrera}</td><td>{d.carrera?.facultad?.nombrefacultad}</td><td>{d.filial?.nombrefilial}</td><td><span style={{padding: '0.4rem 0.8rem', borderRadius: '999px', fontSize: '1.2rem', fontWeight: 600, background: d.estado === 'ACTIVO'? '#F0FDF4' : '#FEF2F2', color: d.estado === 'ACTIVO'? '#22C55E' : '#EF4444'}}>{d.estado || 'ACTIVO'}</span></td></>}<td style={{display: 'flex', gap: '0.8rem'}}>{tab==='estudiantes' && <><button onClick={() => openEditModal(d)} className="btn-icon btn-icon-editar" title="Editar"><Edit size={15} /></button><button onClick={() => handleCambiarEstadoEstudiante(d.idestudiante, d.estado || 'ACTIVO')} className={d.estado === 'ACTIVO'? "btn-icon btn-icon-eliminar" : "btn-icon btn-icon-activar"} title={d.estado === 'ACTIVO'? 'Inactivar' : 'Activar'}>{d.estado === 'ACTIVO'? <UserX size={15} color="#fff" /> : <UserCheck size={15} color="#fff" />}</button></>}</td></tr>))}</tbody>
        </table>

        {totalPaginas > 1 && (
          <div className="paginacion-footer">
            <p className="paginacion-info">Mostrando {indiceInicio + 1} al {Math.min(indiceInicio + registrosPorPagina, datosFiltrados.length)} de {datosFiltrados.length}</p>
            <div className="paginacion-controles">
              <button className="btn-pag" onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1}><ChevronLeft size={16} /> Anterior</button>
              <span className="paginacion-pagina">Pág {paginaActual} de {totalPaginas}</span>
              <button className="btn-pag" onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas}>Siguiente <ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL CONVERTIR MASIVO */}
      {showModalConvertir && (
        <div className="modal-overlay" onClick={() => setShowModalConvertir(false)}>
          <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '100rem', height: '85vh', display: 'flex', flexDirection: 'column', padding: 0 }}>
            <div className="modal-header" style={{padding: '2rem 2.4rem', borderBottom: '1px solid #e2e8f0', flexShrink: 0}}>
              <h2><Users size={20} style={{marginRight: "0.8rem"}}/>Completar Datos de {formConvertirMasivo.length} Estudiantes</h2>
              <button onClick={() => setShowModalConvertir(false)} className="btn-cerrar-modal"><X size={20} /></button>
            </div>
            <div style={{overflowY: 'auto', flex: 1, padding: '1.6rem 2.4rem'}}>
              <table className="tabla-sgpc">
                <thead><tr><th>#</th><th>DNI</th><th>NOMBRES</th><th>CARRERA *</th><th>FILIAL *</th><th>ESTADO</th></tr></thead>
                <tbody>
                  {formConvertirMasivo.map((f, i) => {
                    const carreraSeleccionada = carreras.find(c => c.idcarrera === f.idcarrera)? { value: f.idcarrera, label: carreras.find(c => c.idcarrera === f.idcarrera)?.nombrecarrera } : null;
                    const filialSeleccionada = filiales.find(fl => fl.idfilial === f.idfilial)? { value: f.idfilial, label: filiales.find(fl => fl.idfilial === f.idfilial)?.nombrefilial } : null;
                    const estadoSeleccionado = { value: f.estado, label: f.estado };
                    return (
                      <tr key={f.idpersona}>
                        <td>{i+1}</td><td>{f.dni}</td><td>{f.apellidos}, {f.nombres}</td>
                        <td style={{minWidth: '25rem'}}><Select options={carreras.map(c=>({value:c.idcarrera, label:c.nombrecarrera}))} value={carreraSeleccionada} onChange={(opt:any) => { const newForm = [...formConvertirMasivo]; newForm[i].idcarrera = opt?.value || null; setFormConvertirMasivo(newForm) }} placeholder="Seleccione" classNamePrefix="react-select" styles={{ menu: (base) => ({...base, zIndex: 9999}) }} /></td>
                        <td style={{minWidth: '20rem'}}><Select options={filiales.map(fl=>({value:fl.idfilial, label:fl.nombrefilial}))} value={filialSeleccionada} onChange={(opt:any) => { const newForm = [...formConvertirMasivo]; newForm[i].idfilial = opt?.value || null; setFormConvertirMasivo(newForm) }} placeholder="Seleccione" classNamePrefix="react-select" styles={{ menu: (base) => ({...base, zIndex: 9999}) }} /></td>
                        <td style={{minWidth: '12rem'}}><Select options={[{value: "ACTIVO", label: "ACTIVO"}, {value: "INACTIVO", label: "INACTIVO"}]} value={estadoSeleccionado} onChange={(opt:any) => { const newForm = [...formConvertirMasivo]; newForm[i].estado = opt?.value; setFormConvertirMasivo(newForm) }} classNamePrefix="react-select" styles={{ menu: (base) => ({...base, zIndex: 9999}) }} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="modal-footer" style={{padding: '1.6rem 2.4rem', borderTop: '1px solid #e2e8f0', flexShrink: 0, justifyContent: 'center'}}>
              <button className="btn-secundario" onClick={() => setShowModalConvertir(false)} style={{minWidth: '15rem'}}><X size={18} /> Cancelar</button>
              <button className="btn-primario" onClick={handleGuardarConvertirMasivo} style={{minWidth: '15rem'}}><Save size={18} /> Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{maxWidth: '70rem'}}>
            <div className="modal-header" style={{borderBottom: '2px solid var(--color-primario)', paddingBottom: '1.2rem'}}>
              <div><div style={{display: 'flex', alignItems: 'center', gap: '0.8rem'}}><Users size={18} color="var(--color-primario)" /><h2>Actualizar Datos del Estudiante</h2></div>{estudianteEdit && (<p style={{fontSize: 'var(--text-sm)', color: 'var(--color-texto-secundario)', marginTop: '0.4rem', fontWeight: 400}}>{estudianteEdit.persona?.apellidos}, {estudianteEdit.persona?.nombres} - DNI: {estudianteEdit.persona?.dni}</p>)}</div>
              <button onClick={() => setShowModal(false)} className="btn-cerrar-modal"><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="grid-2-modal">
                <SelectSGPCFieldset label="Carrera" value={form.idcarrera} onChange={(val:any) => setForm({...form, idcarrera: val})} options={carreras.map(c=>({value:c.idcarrera, label:c.nombrecarrera}))} />
                <SelectSGPCFieldset label="Filial" value={form.idfilial} onChange={(val:any) => setForm({...form, idfilial: val})} options={filiales.map(f=>({value:f.idfilial, label:f.nombrefilial}))} />
              </div>
              <SelectSGPCFieldset label="Estado *" value={form.estado} onChange={(val:any) => setForm({...form, estado: val})} options={[{value: "ACTIVO", label: "ACTIVO"}, {value: "INACTIVO", label: "INACTIVO"}]} />
            </div>
            <div className="modal-footer" style={{borderTop: '2px solid var(--color-primario)'}}>
              <button className="btn-secundario-outline" onClick={() => setForm({idcarrera: null, idfilial: null, estado: 'ACTIVO'})}><Eraser size={18} /> Limpiar</button>
              <button className="btn-primario" onClick={handleGuardarEdit}><Check size={18} /> Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}