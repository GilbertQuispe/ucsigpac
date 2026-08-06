'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/client'
import { Plus, Edit, X, Search, Trash2, Hospital, BookOpen, User, Building, Calendar, Eraser, Save, ChevronLeft, ChevronRight, MapPin } from 'lucide-react'
import Select from 'react-select'

type Persona = { idpersona: number; dni: string; apellidos: string; nombres: string }
type Profesion = { idprofesion: number; profesion: string }
type Especialidad = { idespecialidad: number; especialidad: string }
type Docente = { iddocente: number; persona?: Persona; profesion?: Profesion; especialidad?: Especialidad }
type Periodo = { idpa: number; codigo: string; nombre: string }
type Filial = { idfilial: number; nombrefilial: string }
type Servicio = { idservicios: number; nombre: string }
type Departamento = { iddepartamento: number; nombred: string }
type Provincia = { idprovincia: number; nombrep: string; iddepartamento: number }
type Distrito = { iddistrito: number; nombredt: string; idprovincia: number }
type TipoEps = { idtipoeps: number; nombretipoeps: string }

type Eps = {
  ideps: number;
  razonsocial: string;
  iddistrito: number;
  idtipoeps: number | null;
  ruc: string | null;
  distrito?: Distrito & {
    provincia?: Provincia & {
      departamento?: Departamento
    }
  }
}

type CampoClinico = {
  idcampocli: number; estado: string; ideps: number; idservicios: number;
  iddocente: number; idpa: number; idfilial: number | null;
  eps?: Eps; serviciosalud?: Servicio; docente?: Docente; periodoacademico?: Periodo; filial?: Filial;
}

const SelectSGPCFieldset = ({label, value, onChange, options, isDisabled = false}:any) => {
  const selectedOption = options.find((o:any) => o.value === value) || null
  return (
    <fieldset className="fieldset-sgpc">
      <legend>{label}</legend>
      <Select options={options} value={selectedOption} onChange={(opt:any) => onChange(opt?.value || null)} isDisabled={isDisabled} placeholder="Seleccione..." isSearchable maxMenuHeight={200} classNamePrefix="react-select" styles={{ control: (base, state) => ({...base, height: '4.4rem', minHeight: '4.4rem', borderRadius: '0.6rem', border: '1px solid #cbd5e1', background: '#fff', boxShadow: state.isFocused? '0 0 0 1px var(--color-primario)' : 'none', marginTop: '0.4rem', cursor: 'pointer', opacity: isDisabled? 0.6 : 1 }), valueContainer: (base) => ({...base, padding: '0 1.2rem', height: '4.4rem' }), input: (base) => ({...base, margin: 0, padding: 0 }), indicatorsContainer: (base) => ({...base, height: '4.4rem' }), option: (base, state) => ({...base, backgroundColor: state.isSelected? 'var(--color-primario)' : state.isFocused? 'var(--color-acento)' : '#fff', color: state.isSelected? '#fff' : 'var(--color-texto)', padding: '1rem 1.2rem' }), menu: (base) => ({...base, zIndex: 9999, marginTop: '0.4rem' }) }} />
    </fieldset>
    
  )
}

export default function CamposClinicosPage() {
  const supabase = createClient()
  const [campos, setCampos] = useState<CampoClinico[]>([])
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [filiales, setFiliales] = useState<Filial[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [docentes, setDocentes] = useState<Docente[]>([])
  const [eps, setEps] = useState<Eps[]>([])
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [provincias, setProvincias] = useState<Provincia[]>([])
  const [distritos, setDistritos] = useState<Distrito[]>([])
  const [tiposEps, setTiposEps] = useState<TipoEps[]>([])

  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroPeriodo, setFiltroPeriodo] = useState<number | ''>('')
  const [filtroFilialTabla, setFiltroFilialTabla] = useState<number | ''>('')

  const [paginaActual, setPaginaActual] = useState(1)
  const registrosPorPagina = 10
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null)

  const [showModal, setShowModal] = useState(false)
  const [campoEdit, setCampoEdit] = useState<CampoClinico | null>(null)
  const [form, setForm] = useState<any>({estado: 'ACTIVO', ideps: null, idservicios: null, iddocente: null, idpa: null, idfilial: null})

  const [modalEliminar, setModalEliminar] = useState(false)
  const [campoAEliminar, setCampoAEliminar] = useState<CampoClinico | null>(null)

  // STATES PARA CASCADA EPS
  const [idDeptoSel, setIdDeptoSel] = useState<number | null>(null)
  const [idProvSel, setIdProvSel] = useState<number | null>(null)
  const [idDistSel, setIdDistSel] = useState<number | null>(null)
  const [idTipoEpsSel, setIdTipoEpsSel] = useState<number | null>(null)

  // STATES PARA PROF/ESP
  const [profesionSel, setProfesionSel] = useState('')
  const [especialidadSel, setEspecialidadSel] = useState('')

  // 1. CASCADAS PRIMERO
  const provinciasFiltradas = useMemo(() =>
    idDeptoSel? provincias.filter(p => p.iddepartamento === idDeptoSel) : []
, [idDeptoSel, provincias])

  const distritosFiltrados = useMemo(() =>
    idProvSel? distritos.filter(d => d.idprovincia === idProvSel) : []
, [idProvSel, distritos])

  // 2. EPS FILTRADAS POR CASCADA. SI NO HAY FILTRO = TODOS
 const epsFiltradas = useMemo(() => {
  let data = eps

  if(idDeptoSel) {
    const idsProvDeDepto = provincias.filter(p => p.iddepartamento === idDeptoSel).map(p => p.idprovincia)
    const idsDistDeDepto = distritos.filter(d => idsProvDeDepto.includes(d.idprovincia)).map(d => d.iddistrito) // <-- Nombre corregido
    data = data.filter(e => idsDistDeDepto.includes(e.iddistrito)) // <-- Usar el mismo nombre
  }

  if(idProvSel) {
    const idsDistDeProv = distritos.filter(d => d.idprovincia === idProvSel).map(d => d.iddistrito)
    data = data.filter(e => idsDistDeProv.includes(e.iddistrito))
  }

  if(idDistSel) {
    data = data.filter(e => e.iddistrito === idDistSel)
  }

  if(idTipoEpsSel) {
    data = data.filter(e => e.idtipoeps === idTipoEpsSel)
  }

  return data
}, [eps, idDeptoSel, idProvSel, idDistSel, idTipoEpsSel, distritos, provincias])


  // 3. DOCENTES SIN FILTRO
  const docentesFiltrados = docentes

  const showToast = (msg: string, type: 'error' | 'success' = 'error') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  useEffect(() => { fetchData() }, [filtroPeriodo, filtroFilialTabla, search])

  useEffect(() => {
    if(showModal){
      setIdDeptoSel(null); setIdProvSel(null); setIdDistSel(null); setIdTipoEpsSel(null);
      setProfesionSel(''); setEspecialidadSel('');
    }
  }, [showModal])

  useEffect(() => {
    if(campoEdit?.docente){
      setProfesionSel(campoEdit.docente.profesion?.profesion || '')
      setEspecialidadSel(campoEdit.docente.especialidad?.especialidad || '')
    }
  }, [campoEdit])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [{data: tipoData}, {data: camposDB}, {data: per}, {data: fil}, {data: serv}, {data: doc}, {data: deptoData}, {data: provData}, {data: distData}] = await Promise.all([
        supabase.from("tipoeps").select("*").order("nombretipoeps"),
        supabase.from('campoclinico').select('*, eps(*, distrito(*, provincia(*, departamento(*)))), serviciosalud(*), docente(*, persona(*), profesion(*), especialidad(*)), periodoacademico(*), filial(*)').order('idcampocli', {ascending: false}),
        supabase.from('periodoacademico').select('*').order('fecha_inicio', {ascending: false}),
        supabase.from('filial').select('*'),
        supabase.from('serviciosalud').select('*'),
        supabase.from('docente').select('*, persona(*), profesion(*), especialidad(*)').eq('estado','ACTIVO'),
        supabase.from("departamento").select("iddepartamento, nombred").eq("estado", "ACTIVO").order("nombred"),
        supabase.from("provincia").select("idprovincia, nombrep, iddepartamento").eq("estado", "ACTIVO").order("nombrep"),
        supabase.from("distrito").select("iddistrito, nombredt, idprovincia").eq("estado", "ACTIVO").order("nombredt"),
      ])

      // ===== CAMBIO CLAVE: CARGAR TODOS LOS EPS CON PAGINACION =====
      let allEps: any[] = []
      let from = 0
      const pageSize = 1000
      let hasMore = true

      while(hasMore) {
        const {data: epsPage, error: epsError} = await supabase
         .from('eps')
         .select('ideps, razonsocial, iddistrito, idtipoeps, ruc, estado, distrito(*, provincia(*, departamento(*)))')
         .eq('estado','ACTIVO')
         .range(from, from + pageSize - 1)
         .order('razonsocial')

        if(epsError) throw epsError
        if(epsPage) allEps = [...allEps,...epsPage]
        hasMore = epsPage && epsPage.length === pageSize
        from += pageSize
      }
      // ===== FIN CAMBIO =====

      let dataFiltrada = camposDB as CampoClinico[] || []
      if(filtroPeriodo!== '') dataFiltrada = dataFiltrada.filter(c => c.idpa === filtroPeriodo)
      if(filtroFilialTabla!== '') dataFiltrada = dataFiltrada.filter(c => c.idfilial === filtroFilialTabla)
      if(search) {
        const termino = search.toLowerCase()
        dataFiltrada = dataFiltrada.filter(c =>
          c.eps?.razonsocial.toLowerCase().includes(termino) ||
          c.serviciosalud?.nombre.toLowerCase().includes(termino) ||
          c.docente?.persona?.apellidos.toLowerCase().includes(termino)
        )
      }

      setCampos(dataFiltrada)
      setTiposEps(tipoData || [])
      setPeriodos(per || []); setFiliales(fil || []); setServicios(serv || [])
      setDocentes(doc || []); setEps(allEps) // <-- AQUI USAMOS allEps
      setDepartamentos(deptoData || []); setProvincias(provData || []); setDistritos(distData || [])
      setLoading(false); setPaginaActual(1)
    } catch (error: any) {
      console.error(error)
      showToast(error.message, 'error')
      setLoading(false)
    }
  }

  const openModal = (campo: CampoClinico | null = null) => {
    setCampoEdit(campo)
    setForm(campo? {...campo} : {estado: 'ACTIVO', ideps: null, idservicios: null, iddocente: null, idpa: null, idfilial: null})
    setShowModal(true)
  }

  const puedeGuardar = useMemo(() =>
    form.idpa && form.ideps && form.idservicios && form.iddocente
, [form])

  const handleGuardar = async () => {
    if(!puedeGuardar) { showToast('Complete todos los campos obligatorios *', 'error'); return }
    setLoading(true)

    const dataToSave = {
      idpa: form.idpa,
      ideps: form.ideps,
      idservicios: form.idservicios,
      iddocente: form.iddocente,
      idfilial: form.idfilial,
      estado: form.estado
    }

    const {error} = campoEdit
  ? await supabase.from('campoclinico').update(dataToSave).eq('idcampocli', campoEdit.idcampocli)
      : await supabase.from('campoclinico').insert(dataToSave)

    if(error) showToast(error.message, 'error')
    else {
      showToast(campoEdit? 'Campo actualizado' : 'Campo registrado', 'success')
      setShowModal(false); fetchData()
    }
    setLoading(false)
  }

  const abrirModalEliminar = (campo: CampoClinico) => { setCampoAEliminar(campo); setModalEliminar(true) }
  const confirmarEliminar = async () => {
    if(!campoAEliminar) return
    const {error} = await supabase.from('campoclinico').update({estado: 'INACTIVO'}).eq('idcampocli', campoAEliminar.idcampocli)
    if(error) showToast(error.message, 'error')
    else { showToast('Campo inactivado', 'success'); fetchData() }
    setModalEliminar(false); setCampoAEliminar(null)
  }

  const limpiarFiltros = () => { setSearch(""); setFiltroPeriodo(""); setFiltroFilialTabla(""); setPaginaActual(1) }
  const totalPaginas = Math.ceil(campos.length / registrosPorPagina)
  const datosPaginados = campos.slice((paginaActual-1)*registrosPorPagina, paginaActual*registrosPorPagina)

  return (
    <div className="main-content">
      {toast && <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 99999, background: toast.type === 'error'? '#EF4444' : '#22C55E', color: '#fff', padding: '1.2rem 2.4rem', borderRadius: '0.8rem', fontWeight: 600, fontSize: '1.4rem' }}>{toast.msg}</div>}

      <div className="header-responsive">
        <div><h1><Hospital size={24} style={{marginRight: '0.8rem'}}/>Gestión de Campos Clínicos</h1><p>Total: {campos.length} registros</p></div>
        <button className="btn-primario" onClick={() => openModal()}><Plus size={18} />Nuevo Campo Clínico</button>
      </div>

      <div className="card-sgpc" style={{ marginBottom: '2.4rem', padding: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(20rem, 1fr))', gap: '1.2rem', marginBottom: '1.6rem' }}>
          <SelectSGPCFieldset label="Filtrar por Periodo" value={filtroPeriodo} onChange={(val:any) => setFiltroPeriodo(val)} options={[{value: '', label: 'TODOS'},...periodos.map(p=>({value:p.idpa, label:`${p.codigo} - ${p.nombre}`}))]} />
          <SelectSGPCFieldset label="Filtrar por Filial" value={filtroFilialTabla} onChange={(val:any) => setFiltroFilialTabla(val)} options={[{value: '', label: 'TODAS'},...filiales.map(f=>({value:f.idfilial, label:f.nombrefilial}))]} />
        </div>
        <div style={{display: 'flex', gap: '1rem', alignItems: 'flex-end'}}>
          <div style={{ position: 'relative', flex: 1 }}><Search size={18} style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} /><input className="input-sgpc" placeholder="Buscar por EPS, Servicio, Docente..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '4rem', height: "4.4rem", width: '100%' }} /></div>
          <button className="btn-secundario btn-limpiar" onClick={limpiarFiltros} style={{height: '4.4rem'}}><Eraser size={16} />Limpiar</button>
        </div>
      </div>

      <div className="card-sgpc" style={{ overflowX: 'auto' }}>
        <table className='tabla-sgpc'>
          <thead>
            <tr>
              <th>#</th><th>EPS / CLÍNICA</th><th>SERVICIO</th><th>DOCENTE RESPONSABLE</th><th>PERIODO</th><th>FILIAL</th><th>ESTADO</th><th>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {loading? <tr><td colSpan={8} style={{textAlign: 'center', padding: '2rem'}}>Cargando...</td></tr> : datosPaginados.map((c,i) => (
              <tr key={c.idcampocli}>
                <td>{(paginaActual-1)*registrosPorPagina + i + 1}</td>
                <td>{c.eps?.razonsocial} <br/><span style={{fontSize: '1.1rem', opacity: 0.7}}>{c.eps?.distrito?.nombredt} - {c.eps?.distrito?.provincia?.nombrep}</span></td>
                <td>{c.serviciosalud?.nombre}</td>
                <td>{c.docente?.persona?.apellidos}, {c.docente?.persona?.nombres} <br/><span style={{fontSize: '1.1rem', opacity: 0.7}}>{c.docente?.profesion?.profesion} / {c.docente?.especialidad?.especialidad}</span></td>
                <td>{c.periodoacademico?.codigo}</td>
                <td>{c.filial?.nombrefilial || '-'}</td>
                <td><span style={{padding: '0.4rem 0.8rem', borderRadius: '999px', fontSize: '1.2rem', fontWeight: 600, background: c.estado === 'ACTIVO'? '#F0FDF4' : '#FEF2F2', color: c.estado === 'ACTIVO'? '#22C55E' : '#EF4444'}}>{c.estado}</span></td>
                <td style={{display: 'flex', gap: '0.8rem'}}>
                  <button onClick={() => openModal(c)} className="btn-icon btn-icon-editar" title="Editar"><Edit size={15} /></button>
                  <button onClick={() => abrirModalEliminar(c)} className="btn-icon btn-icon-eliminar" title="Inactivar"><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPaginas > 1 && (
          <div className="paginacion-footer">
            <p className="paginacion-info">Mostrando {(paginaActual-1)*registrosPorPagina + 1} al {Math.min(paginaActual*registrosPorPagina, campos.length)} de {campos.length}</p>
            <div className="paginacion-controles">
              <button className="btn-pag" onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1}><ChevronLeft size={16} /> Anterior</button>
              <span className="paginacion-pagina">Pág {paginaActual} de {totalPaginas}</span>
              <button className="btn-pag btn-pag-primario" onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas}>Siguiente <ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL REGISTRO/EDICION */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{maxWidth: '95rem'}}>
            <div className="modal-header">
              <h2 style={{display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--color-primario)'}}>
                <Hospital size={22} /> {campoEdit? 'Editar' : 'Nuevo'} Campo Clínico
              </h2>
              <button onClick={() => setShowModal(false)} className="btn-cerrar-modal"><X size={18} /></button>
            </div>

            <div className="modal-body" style={{gap: '2.4rem'}}>

  {/* SECCION 1: ESTABLECIMIENTO DE SALUD EPS */}
  <fieldset className="fieldset-sgpc-section">
    <legend>Establecimiento de Salud EPS</legend>

    {/* LINEA 1: Depto + Prov + Dist */}
    <div className="grid-3" style={{marginBottom: '1.6rem'}}>
      <SelectSGPCFieldset label="Departamento" value={idDeptoSel} onChange={(val:any) => {setIdDeptoSel(val); setIdProvSel(null); setIdDistSel(null); setIdTipoEpsSel(null); setForm({...form, ideps: null})}} options={[{value: null, label: 'Todos'},...departamentos.map(d=>({value:d.iddepartamento, label:d.nombred}))]} />
      <SelectSGPCFieldset label="Provincia" value={idProvSel} onChange={(val:any) => {setIdProvSel(val); setIdDistSel(null); setForm({...form, ideps: null})}} options={[{value: null, label: 'Todos'},...provinciasFiltradas.map(p=>({value:p.idprovincia, label:p.nombrep}))]} isDisabled={!idDeptoSel} />
      <SelectSGPCFieldset label="Distrito" value={idDistSel} onChange={(val:any) => {setIdDistSel(val); setForm({...form, ideps: null})}} options={[{value: null, label: 'Todos'},...distritosFiltrados.map(d=>({value:d.iddistrito, label:d.nombredt}))]} isDisabled={!idProvSel} />
    </div>

    {/* LINEA 2: Tipo EPS + EPS - EPS es mas ancha */}
    <div className="grid-2-1">
      <SelectSGPCFieldset label="Tipo EPS" value={idTipoEpsSel} onChange={(val:any) => {setIdTipoEpsSel(val); setForm({...form, ideps: null})}} options={[{value: null, label: 'Todos'},...tiposEps.map(t=>({value:t.idtipoeps, label:t.nombretipoeps}))]} />
      <SelectSGPCFieldset label="EPS/Clinica *" value={form.ideps} onChange={(val:any) => setForm({...form, ideps: val})} options={epsFiltradas.map(e=>({value:e.ideps, label:`${e.razonsocial} - ${e.ruc || 'S/RUC'}`}))} />
    </div>

    {/* LINEA 3: Servicio */}
    <div style={{marginTop: '1.6rem'}}>
      <SelectSGPCFieldset label="Servicio de Salud *" value={form.idservicios} onChange={(val:any) => setForm({...form, idservicios: val})} options={servicios.map(s=>({value:s.idservicios, label:s.nombre}))} />
    </div>
  </fieldset>

  {/* SECCION 2: DOCENTE - TODO EN 1 LINEA */}
  <fieldset className="fieldset-sgpc-section">
    <legend>Docente</legend>
    <div className="grid-3">
      <SelectSGPCFieldset
        label="Docente Responsable *"
        value={form.iddocente}
        onChange={(val:any) => {
          const docSel = docentes.find(d => d.iddocente === val)
          setForm({...form, iddocente: val})
          setProfesionSel(docSel?.profesion?.profesion || '')
          setEspecialidadSel(docSel?.especialidad?.especialidad || '')
        }}
        options={docentesFiltrados.map(d=>({value:d.iddocente, label:`${d.persona?.dni} - ${d.persona?.apellidos}, ${d.persona?.nombres}`}))}
      />
      <fieldset className="fieldset-sgpc"><legend>Profesion</legend><input className="input-sgpc" value={profesionSel} readOnly style={{marginTop: '0.4rem', background: '#f8fafc'}} /></fieldset>
      <fieldset className="fieldset-sgpc"><legend>Especialidad</legend><input className="input-sgpc" value={especialidadSel} readOnly style={{marginTop: '0.4rem', background: '#f8fafc'}} /></fieldset>
    </div>
  </fieldset>

  {/* SECCION 3: OTROS DATOS - TODO EN 1 LINEA */}
  <fieldset className="fieldset-sgpc-section">
    <legend>Otros Datos</legend>
    <div className="grid-3">
      <SelectSGPCFieldset label="Periodo Académico *" value={form.idpa} onChange={(val:any) => setForm({...form, idpa: val})} options={periodos.map(p=>({value:p.idpa, label:`${p.codigo} - ${p.nombre}`}))} />
      <SelectSGPCFieldset label="Filial" value={form.idfilial} onChange={(val:any) => setForm({...form, idfilial: val})} options={[{value: null, label: 'NINGUNA'},...filiales.map(f=>({value:f.idfilial, label:f.nombrefilial}))]} />
      <SelectSGPCFieldset label="Estado *" value={form.estado} onChange={(val:any) => setForm({...form, estado: val})} options={[{value: "ACTIVO", label: "ACTIVO"}, {value: "INACTIVO", label: "INACTIVO"}]} />
    </div>
  </fieldset>

</div>

            <div className="modal-footer" style={{justifyContent: 'center', gap: '1.6rem'}}>
              <button className="btn-secundario btn-outline-azul" onClick={() => setShowModal(false)} style={{minWidth: '18rem'}}>Cancelar</button>
              <button className="btn-primario btn-azul-solido" onClick={handleGuardar} disabled={!puedeGuardar} style={{minWidth: '18rem'}}><Save size={16} />Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ELIMINAR */}
      {modalEliminar && (
        <div className="modal-overlay" onClick={() => setModalEliminar(false)}>
          <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h2>Confirmar Inactivación</h2><button className="btn-cerrar-modal" onClick={() => setModalEliminar(false)}><X size={18}/></button></div>
            <div className="modal-body">
              <p>¿Seguro de inactivar este campo clínico?</p>
              <p style={{fontWeight: 600, color: 'var(--color-primario)'}}>{campoAEliminar?.eps?.razonsocial} - {campoAEliminar?.serviciosalud?.nombre}</p>
            </div>
            <div className="modal-footer">
              <button className="btn-secundario" onClick={() => setModalEliminar(false)}>Cancelar</button>
              <button className="btn-terciario" onClick={confirmarEliminar}>Inactivar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}