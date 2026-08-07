'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/client'
import { Plus, Edit, X, Search, Trash2, Hospital, BookOpen, User, Building, Calendar, Eraser, Save, ChevronLeft, ChevronRight, MapPin } from 'lucide-react'
import Select from 'react-select'
import AsyncSelect from 'react-select/async' // <-- NUEVO 1
import ModalHorarioDocente from './components/ModalHorarioDocente'

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
  const [eps, setEps] = useState<Eps[]>([]) // <-- Se mantiene pero ya no se llena con 6000
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

// estate para paginacion real
const [totalRegistros, setTotalRegistros] = useState(0)

// NUEVO 2: STATES PARA ASYNC EPS
const [epsOptions, setEpsOptions] = useState<any[]>([])
const [loadingEps, setLoadingEps] = useState(false)

// NUEVO PARA EL COMPONENTE  MODALHORARIODOCENTE
const [showModalHorario, setShowModalHorario] = useState(false)
const [dataParaHorario, setDataParaHorario] = useState<any>(null)

  // 1. CASCADAS PRIMERO
  const provinciasFiltradas = useMemo(() =>
    idDeptoSel? provincias.filter(p => p.iddepartamento === idDeptoSel) : []
, [idDeptoSel, provincias])

  const distritosFiltrados = useMemo(() =>
    idProvSel? distritos.filter(d => d.idprovincia === idProvSel) : []
, [idProvSel, distritos])

  // 2. EPS FILTRADAS POR CASCADA. YA NO SE USA PARA EL SELECT
 const epsFiltradas = useMemo(() => {
  let data = eps
  if(idDeptoSel) {
    const idsProvDeDepto = provincias.filter(p => p.iddepartamento === idDeptoSel).map(p => p.idprovincia)
    const idsDistDepto = distritos.filter(d => idsProvDeDepto.includes(d.idprovincia)).map(d => d.iddistrito)
    data = data.filter(e => idsDistDepto.includes(e.iddistrito))
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

  // NUEVO 3: FUNCION PARA CARGAR EPS ON DEMAND
  const loadEpsOptions = async (inputValue: string) => {
    setLoadingEps(true)
    let query = supabase
      .from('eps')
      .select('ideps, razonsocial, ruc, iddistrito, idtipoeps')
      .eq('estado','ACTIVO')
      .limit(50)
      .order('razonsocial')

    if(inputValue) {
      query = query.ilike('razonsocial', `%${inputValue}%`)
    }

    // FILTROS EN CASCADA - AHORA SI FUNCIONAN
    if(idDeptoSel) {
      const idsProvDepto = provincias.filter(p => p.iddepartamento === idDeptoSel).map(p => p.idprovincia)
      const idsDistDepto = distritos.filter(d => idsProvDepto.includes(d.idprovincia)).map(d => d.iddistrito)
      if(idsDistDepto.length > 0) query = query.in('iddistrito', idsDistDepto)
    }
    if(idProvSel) {
      const idsDistDeProv = distritos.filter(d => d.idprovincia === idProvSel).map(d => d.iddistrito)
      if(idsDistDeProv.length > 0) query = query.in('iddistrito', idsDistDeProv)
    }
    if(idDistSel) query = query.eq('iddistrito', idDistSel)
    if(idTipoEpsSel) query = query.eq('idtipoeps', idTipoEpsSel)

    const {data} = await query
    const options = data?.map(e => ({value: e.ideps, label: `${e.razonsocial} - ${e.ruc || 'S/RUC'}`})) || []
    setEpsOptions(options)
    setLoadingEps(false)
    return options
  }

  // 3. DOCENTES SIN FILTRO
  const docentesFiltrados = docentes

  const showToast = (msg: string, type: 'error' | 'success' = 'error') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  useEffect(() => { fetchData() }, [filtroPeriodo, filtroFilialTabla, search, paginaActual])

  useEffect(() => {
    if(showModal){
      setIdDeptoSel(null); setIdProvSel(null); setIdDistSel(null); setIdTipoEpsSel(null);
      setProfesionSel(''); setEspecialidadSel('');
      setEpsOptions([]) // NUEVO 4: limpiar opciones al abrir
    }
  }, [showModal])

  useEffect(() => {
    if(campoEdit?.docente){
      setProfesionSel(campoEdit.docente.profesion?.profesion || '')
      setEspecialidadSel(campoEdit.docente.especialidad?.especialidad || '')
    }
  }, [campoEdit])

  useEffect(() => { 
  const timer = setTimeout(() => { setPaginaActual(1) }, 300) 
  return () => clearTimeout(timer) 
}, [search, filtroPeriodo, filtroFilialTabla])

  const fetchData = async () => {
    setLoading(true)
    try {
      // 1. Cargar maestros
      const [tipoRes, perRes, filRes, servRes, docRes, deptoRes, provRes, distRes] = await Promise.all([
        supabase.from("tipoeps").select("*").order("nombretipoeps"),
        supabase.from('periodoacademico').select('*').order('fecha_inicio', {ascending: false}),
        supabase.from('filial').select('*'),
        supabase.from('serviciosalud').select('*'),
        supabase.from('docente').select('*, persona(*), profesion(*), especialidad(*)').eq('estado','ACTIVO'),
        supabase.from("departamento").select("iddepartamento, nombred").eq("estado", "ACTIVO").order("nombred"),
        supabase.from("provincia").select("idprovincia, nombrep, iddepartamento").eq("estado", "ACTIVO").order("nombrep"),
        supabase.from("distrito").select("iddistrito, nombredt, idprovincia").eq("estado", "ACTIVO").order("nombredt"),
      ])

      setTiposEps(tipoRes.data || [])
      setPeriodos(perRes.data || []); setFiliales(filRes.data || []); setServicios(servRes.data || [])
      setDocentes(docRes.data || []); 
      setDepartamentos(deptoRes.data || []); setProvincias(provRes.data || []); setDistritos(distRes.data || [])

      // 2. ARMAR FILTRO DE IDs
      let idsFinales: number[] | null = null

      if(search.trim() !== '') {
        const esDni = /^\d+$/.test(search.trim())
        const idsSet = new Set<number>()

        if(esDni) {
  // BUSCAR POR DNI PARCIAL: persona -> docente -> campoclinico
  const {data: personas} = await supabase.from('persona').select('idpersona').ilike('dni', `${search.trim()}%`)
  const idsPersona = personas?.map(p => p.idpersona) || []
  if(idsPersona.length > 0) {
    const {data: docentes} = await supabase.from('docente').select('iddocente').in('idpersona', idsPersona)
    const idsDoc = docentes?.map(d => d.iddocente) || []
    if(idsDoc.length > 0) {
      let q = supabase.from('campoclinico').select('idcampocli').in('iddocente', idsDoc)
      if(filtroPeriodo!== '') q = q.eq('idpa', filtroPeriodo)
      if(filtroFilialTabla!== '') q = q.eq('idfilial', filtroFilialTabla)
      const {data: campos} = await q
      campos?.forEach(c => idsSet.add(c.idcampocli))
    }
  }
}else {
          // BUSCAR POR EPS
          const {data: epsData} = await supabase.from('eps').select('ideps').ilike('razonsocial', `%${search}%`)
          const idsEps = epsData?.map(e => e.ideps) || []
          if(idsEps.length > 0) {
            let q = supabase.from('campoclinico').select('idcampocli').in('ideps', idsEps)
            if(filtroPeriodo!== '') q = q.eq('idpa', filtroPeriodo)
            if(filtroFilialTabla!== '') q = q.eq('idfilial', filtroFilialTabla)
            const {data: campos} = await q
            campos?.forEach(c => idsSet.add(c.idcampocli))
          }

          // BUSCAR POR SERVICIO
          const {data: servData} = await supabase.from('serviciosalud').select('idservicios').ilike('nombre', `%${search}%`)
          const idsServ = servData?.map(s => s.idservicios) || []
          if(idsServ.length > 0) {
            let q = supabase.from('campoclinico').select('idcampocli').in('idservicios', idsServ)
            if(filtroPeriodo!== '') q = q.eq('idpa', filtroPeriodo)
            if(filtroFilialTabla!== '') q = q.eq('idfilial', filtroFilialTabla)
            const {data: campos} = await q
            campos?.forEach(c => idsSet.add(c.idcampocli))
          }

          // BUSCAR POR DOCENTE: persona -> docente -> campoclinico
          const {data: personas} = await supabase.from('persona').select('idpersona').or(`apellidos.ilike.%${search}%,nombres.ilike.%${search}%`)
          const idsPersona = personas?.map(p => p.idpersona) || []
          if(idsPersona.length > 0) {
            const {data: docentes} = await supabase.from('docente').select('iddocente').in('idpersona', idsPersona)
            const idsDoc = docentes?.map(d => d.iddocente) || []
            if(idsDoc.length > 0) {
              let q = supabase.from('campoclinico').select('idcampocli').in('iddocente', idsDoc)
              if(filtroPeriodo!== '') q = q.eq('idpa', filtroPeriodo)
              if(filtroFilialTabla!== '') q = q.eq('idfilial', filtroFilialTabla)
              const {data: campos} = await q
              campos?.forEach(c => idsSet.add(c.idcampocli))
            }
          }
        }
        idsFinales = Array.from(idsSet)
      }

      // 3. CONTEO TOTAL
      let countQuery = supabase.from('campoclinico').select('*', { count: 'exact', head: true })
      if(filtroPeriodo!== '') countQuery = countQuery.eq('idpa', filtroPeriodo)
      if(filtroFilialTabla!== '') countQuery = countQuery.eq('idfilial', filtroFilialTabla)
      if(idsFinales !== null) {
        if(idsFinales.length > 0) countQuery = countQuery.in('idcampocli', idsFinales)
        else countQuery = countQuery.eq('idcampocli', -1)
      }
      const { count } = await countQuery
      setTotalRegistros(count || 0)

      // 4. DATOS DE LA PAGINA
      let dataQuery = supabase.from('campoclinico')
        .select('*, eps(*, distrito(*, provincia(*, departamento(*)))), serviciosalud(*), docente(*, persona(*), profesion(*), especialidad(*)), periodoacademico(*), filial(*)')
        .order('idcampocli', {ascending: false})
        .range((paginaActual-1)*registrosPorPagina, paginaActual*registrosPorPagina - 1)

      if(filtroPeriodo!== '') dataQuery = dataQuery.eq('idpa', filtroPeriodo)
      if(filtroFilialTabla!== '') dataQuery = dataQuery.eq('idfilial', filtroFilialTabla)
      if(idsFinales !== null) {
        if(idsFinales.length > 0) dataQuery = dataQuery.in('idcampocli', idsFinales)
        else dataQuery = dataQuery.eq('idcampocli', -1)
      }

      const {data: camposDB} = await dataQuery
      setCampos(camposDB as CampoClinico[] || [])
      
    } catch (error: any) {
      console.error("ERROR FETCH:", error)
      showToast(error.message, 'error')
    }
    setLoading(false)
  }

  const openModal = (campo: CampoClinico | null = null) => {
    setCampoEdit(campo)
    setForm(campo? {...campo} : {estado: 'ACTIVO', ideps: null, idservicios: null, iddocente: null, idpa: null, idfilial: null})
    
    // NUEVO 5: Si es edicion, precargar la EPS actual
    if(campo?.eps) {
      setEpsOptions([{value: campo.eps.ideps, label: `${campo.eps.razonsocial} - ${campo.eps.ruc || 'S/RUC'}`}])
    }
    
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

    const {data, error} = campoEdit
     ? await supabase.from('campoclinico').update(dataToSave).eq('idcampocli', campoEdit.idcampocli).select().single()
      : await supabase.from('campoclinico').insert(dataToSave).select().single() // <-- AQUI ESTA EL CAMBIO

    if(error) showToast(error.message, 'error')
    else {
      showToast(campoEdit? 'Campo actualizado' : 'Campo registrado', 'success')
      setShowModal(false); // Cierra modal 1

      // NUEVO: SI ES REGISTRO NUEVO, ABRIMOS MODAL 2
      if(!campoEdit && data) {
        const docenteSel = docentes.find(d => d.iddocente === data.iddocente)
        const epsSel = epsOptions.find(e => e.value === data.ideps)
        const servSel = servicios.find(s => s.idservicios === data.idservicios)
        const paSel = periodos.find(p => p.idpa === data.idpa)

        setDataParaHorario({
          idcampocli: data.idcampocli,
          docente: `${docenteSel?.persona?.apellidos}, ${docenteSel?.persona?.nombres}`,
          dni: docenteSel?.persona?.dni,
          eps: epsSel?.label.split(' - ')[0],
          servicio: servSel?.nombre,
          periodo: paSel?.codigo
        })
        setTimeout(() => setShowModalHorario(true), 500) // Abre modal 2
      }

      fetchData()
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
useEffect(() => { setPaginaActual(1) }, [search, filtroPeriodo, filtroFilialTabla])
  const totalPaginas = Math.ceil(totalRegistros / registrosPorPagina) // <-- CAMBIO: usar totalRegistros
  
  return (
    <div className="main-content campos-clinicos-page">
      {toast && <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 99999, background: toast.type === 'error'? '#EF4444' : '#22C55E', color: '#fff', padding: '1.2rem 2.4rem', borderRadius: '0.8rem', fontWeight: 600, fontSize: '1.4rem' }}>{toast.msg}</div>}

      <div className="header-responsive">
        <div><h1><Hospital size={24} style={{marginRight: '0.8rem'}}/>Gestión de Campos Clínicos</h1><p>Total: {totalRegistros} registros</p></div> {/* <-- CAMBIO: usar totalRegistros */}
        <button className="btn-primario" onClick={() => openModal()}><Plus size={18} />Nuevo Campo Clínico</button>
      </div>

      <div className="card-sgpc" style={{ marginBottom: '2.4rem', padding: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(20rem, 1fr))', gap: '1.2rem', marginBottom: '1.6rem' }}>
          <SelectSGPCFieldset label="Filtrar por Periodo" value={filtroPeriodo} onChange={(val:any) => setFiltroPeriodo(val)} options={[{value: '', label: 'TODOS'},...periodos.map(p=>({value:p.idpa, label:`${p.codigo} - ${p.nombre}`}))]} />
          <SelectSGPCFieldset label="Filtrar por Filial" value={filtroFilialTabla} onChange={(val:any) => setFiltroFilialTabla(val)} options={[{value: '', label: 'TODAS'},...filiales.map(f=>({value:f.idfilial, label:f.nombrefilial}))]} />
        </div>
        <div style={{display: 'flex', gap: '1rem', alignItems: 'flex-end'}}>
          <div style={{ position: 'relative', flex: 1 }}><Search size={18} style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} /><input className="input-sgpc" placeholder="Buscar por DNI, EPS, Servicio, Docente..." value={search} onChange={e => {
  setSearch(e.target.value)
  setPaginaActual(1) // Para que vuelva a pag 1 al buscar
}} style={{ paddingLeft: '4rem', height: "4.4rem", width: '100%' }} /></div>
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
            {loading? <tr><td colSpan={8} style={{textAlign: 'center', padding: '2rem'}}>Cargando...</td></tr> : campos.map((c,i) => (
              <tr key={c.idcampocli}>
                <td>{(paginaActual-1)*registrosPorPagina + i + 1}</td>
                <td>{c.eps?.razonsocial} <br/><span style={{fontSize: '1.1rem', opacity: 0.7}}>{c.eps?.distrito?.nombredt} - {c.eps?.distrito?.provincia?.nombrep}</span></td>
                <td>{c.serviciosalud?.nombre}</td>
                <td>
  <div style={{fontWeight: 600}}>{c.docente?.persona?.dni}</div>
  <div>{c.docente?.persona?.apellidos}, {c.docente?.persona?.nombres}</div>
  <span style={{fontSize: '1.1rem', opacity: 0.7}}>
    {c.docente?.profesion?.profesion} / {c.docente?.especialidad?.especialidad}
  </span>
</td>
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
        {totalPaginas >= 1 && ( // <-- CAMBIO: >= 1 para que siempre se vea
          <div className="paginacion-footer">
            <p className="paginacion-info">Mostrando {(paginaActual-1)*registrosPorPagina + 1} al {Math.min(paginaActual*registrosPorPagina, totalRegistros)} de {totalRegistros}</p>
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
      <SelectSGPCFieldset label="Departamento" value={idDeptoSel} onChange={(val:any) => {
  setIdDeptoSel(val); 
  setIdProvSel(null); 
  setIdDistSel(null); 
  setIdTipoEpsSel(null); 
  setForm({...form, ideps: null}); // <-- NUEVO
  setEpsOptions([]) // <-- NUEVO
}} options={[{value: null, label: 'Todos'},...departamentos.map(d=>({value:d.iddepartamento, label:d.nombred}))]} />

<SelectSGPCFieldset label="Provincia" value={idProvSel} onChange={(val:any) => {
  setIdProvSel(val); 
  setIdDistSel(null); 
  setForm({...form, ideps: null}); // <-- NUEVO
  setEpsOptions([]) // <-- NUEVO
}} options={[{value: null, label: 'Todos'},...provinciasFiltradas.map(p=>({value:p.idprovincia, label:p.nombrep}))]} isDisabled={!idDeptoSel} />

<SelectSGPCFieldset label="Distrito" value={idDistSel} onChange={(val:any) => {
  setIdDistSel(val); 
  setForm({...form, ideps: null}); // <-- NUEVO
  setEpsOptions([]) // <-- NUEVO
}} options={[{value: null, label: 'Todos'},...distritosFiltrados.map(d=>({value:d.iddistrito, label:d.nombredt}))]} isDisabled={!idProvSel} />
    </div>

    {/* LINEA 2: Tipo EPS + EPS - EPS es mas ancha */}
    <div className="grid-2-1">
      <SelectSGPCFieldset label="Tipo EPS" value={idTipoEpsSel} onChange={(val:any) => {
  setIdTipoEpsSel(val); 
  setForm({...form, ideps: null}); // <-- NUEVO
  setEpsOptions([]) // <-- NUEVO
}} options={[{value: null, label: 'Todos'},...tiposEps.map(t=>({value:t.idtipoeps, label:t.nombretipoeps}))]} />
      
      {/* NUEVO 6: CAMBIO SELECT NORMAL POR ASYNCSELECT */}
      <fieldset className="fieldset-sgpc">
        <legend>EPS/Clinica *</legend>
        <AsyncSelect 
        key={`${idDeptoSel}-${idProvSel}-${idDistSel}-${idTipoEpsSel}`}
          cacheOptions
          defaultOptions
          loadOptions={loadEpsOptions}
          value={epsOptions.find(o => o.value === form.ideps) || null}
          onChange={(opt:any) => setForm({...form, ideps: opt?.value || null})}
          placeholder="Escriba para buscar EPS..."
          isLoading={loadingEps}
          isSearchable
          maxMenuHeight={200}
          classNamePrefix="react-select"
          styles={{ control: (base, state) => ({...base, height: '4.4rem', minHeight: '4.4rem', borderRadius: '0.6rem', border: '1px solid #cbd5e1', background: '#fff', boxShadow: state.isFocused? '0 0 0 1px var(--color-primario)' : 'none', marginTop: '0.4rem', cursor: 'pointer' }), valueContainer: (base) => ({...base, padding: '0 1.2rem', height: '4.4rem' }), input: (base) => ({...base, margin: 0, padding: 0 }), indicatorsContainer: (base) => ({...base, height: '4.4rem' }), option: (base, state) => ({...base, backgroundColor: state.isSelected? 'var(--color-primario)' : state.isFocused? 'var(--color-acento)' : '#fff', color: state.isSelected? '#fff' : 'var(--color-texto)', padding: '1rem 1.2rem' }), menu: (base) => ({...base, zIndex: 9999, marginTop: '0.4rem' }) }}
        />
      </fieldset>
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
      <fieldset className="fieldset-sgpc"><legend>Profesion</legend><input className="input-sgpc" value={profesionSel} readOnly disabled style={{marginTop: '0.4rem'}} /></fieldset>
      <fieldset className="fieldset-sgpc"><legend>Especialidad</legend><input className="input-sgpc" value={especialidadSel} readOnly disabled style={{marginTop: '0.4rem'}} /></fieldset>
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

      <ModalHorarioDocente
  show={showModalHorario}
  onClose={() => setShowModalHorario(false)}
  idcampocli={dataParaHorario?.idcampocli}
  dataHeader={dataParaHorario}
/>

    </div>
  )
}