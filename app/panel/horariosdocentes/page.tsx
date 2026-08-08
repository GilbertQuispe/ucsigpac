'use client'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/client'
import { Search, Edit, Eraser, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import Select from 'react-select'
import AsyncSelect from 'react-select/async'
import ModalHorarioDocente from '../camposclinicos/components/ModalHorarioDocente'

type Option = { value: number | string; label: string }
type Periodo = { idpa: number; codigo: string; nombre: string }
type Filial = { idfilial: number; nombrefilial: string }
type Servicio = { idservicios: number; nombre: string }
type Departamento = { iddepartamento: number; nombred: string }
type Provincia = { idprovincia: number; nombrep: string; iddepartamento: number }
type Distrito = { iddistrito: number; nombredt: string; idprovincia: number }
type TipoEps = { idtipoeps: number; nombretipoeps: string }

type FilaHorario = {
  idcampocli: number;
  dni: string;
  docente: string;
  eps: string;
  servicio: string;
  filial: string;
  periodo: string;
  estado: string;
}

const selectStyles = { // <-- ESTILOS PRO
  control: (base: any, state: any) => ({
    ...base, 
    height: '4.4rem', 
    minHeight: '4.4rem', 
    borderRadius: '0.6rem', 
    border: '1px solid #cbd5e1', 
    background: '#fff', 
    boxShadow: state.isFocused? '0 0 0 2px var(--color-primario)' : 'none', 
    marginTop: '0.4rem', 
    cursor: 'pointer',
    '&:hover': { borderColor: 'var(--color-primario)' }
  }), 
  valueContainer: (base: any) => ({...base, padding: '0 1.2rem', height: '4.4rem' }), 
  input: (base: any) => ({...base, margin: 0, padding: 0 }), 
  indicatorsContainer: (base: any) => ({...base, height: '4.4rem' }), 
  option: (base: any, state: any) => ({
    ...base, 
    backgroundColor: state.isSelected? 'var(--color-primario)' : state.isFocused? 'var(--color-acento)' : '#fff', 
    color: state.isSelected? '#fff' : 'var(--color-texto)', 
    padding: '1rem 1.2rem'
  }), 
  menu: (base: any) => ({...base, zIndex: 9999, marginTop: '0.4rem' })
}

const SelectSGPCFieldset = ({label, value, onChange, options, isDisabled = false}:any) => {
  const selectedOption = options.find((o:any) => o.value === value) || null
  return (
    <fieldset className="fieldset-sgpc">
      <legend>{label}</legend>
      <Select options={options} value={selectedOption} onChange={(opt:any) => onChange(opt?.value || '')} isDisabled={isDisabled} placeholder="Seleccione..." isSearchable maxMenuHeight={200} classNamePrefix="react-select" styles={selectStyles} />
    </fieldset>
  )
}

export default function HorariosDocentesPage() {
  const supabase = createClient()
  const [data, setData] = useState<FilaHorario[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null)
  
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [filiales, setFiliales] = useState<Filial[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [provincias, setProvincias] = useState<Provincia[]>([])
  const [distritos, setDistritos] = useState<Distrito[]>([])
  const [tiposEps, setTiposEps] = useState<TipoEps[]>([])

  const [search, setSearch] = useState('')
  const [filtroPeriodo, setFiltroPeriodo] = useState<number | ''>('')
  const [filtroServicio, setFiltroServicio] = useState<number | ''>('')
  const [filtroFilial, setFiltroFilial] = useState<number | ''>('')
  const [filtroEps, setFiltroEps] = useState<number | null>(null)

  const [idDeptoSel, setIdDeptoSel] = useState<number | ''>('')
  const [idProvSel, setIdProvSel] = useState<number | ''>('')
  const [idDistSel, setIdDistSel] = useState<number | ''>('')
  const [idTipoEpsSel, setIdTipoEpsSel] = useState<number | ''>('')
  const [epsOptions, setEpsOptions] = useState<Option[]>([])
  const [loadingEps, setLoadingEps] = useState(false)

  const [paginaActual, setPaginaActual] = useState(1)
  const registrosPorPagina = 10
  const [totalRegistros, setTotalRegistros] = useState(0)

  const [showModalHorario, setShowModalHorario] = useState(false)
  const [dataParaHorario, setDataParaHorario] = useState<any>(null)

  const showToast = (msg: string, type: 'error' | 'success' = 'error') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  const provinciasFiltradas = useMemo(() => idDeptoSel ? provincias.filter(p => p.iddepartamento === idDeptoSel) : [], [idDeptoSel, provincias])
  const distritosFiltrados = useMemo(() => idProvSel ? distritos.filter(d => d.idprovincia === idProvSel) : [], [idProvSel, distritos])

  useEffect(() => { fetchMaestros() }, [])
  useEffect(() => { fetchData() }, [filtroPeriodo, filtroServicio, filtroFilial, filtroEps, search, paginaActual, idDeptoSel, idProvSel, idDistSel, idTipoEpsSel]) // <-- AGREGUE LOS FILTROS NUEVOS
  useEffect(() => { const timer = setTimeout(() => setPaginaActual(1), 300); return () => clearTimeout(timer) }, [search, filtroPeriodo, filtroServicio, filtroFilial, filtroEps, idDeptoSel, idProvSel, idDistSel, idTipoEpsSel])

  const fetchMaestros = async () => {
    const [tipoRes, perRes, filRes, servRes, deptoRes, provRes, distRes] = await Promise.all([
      supabase.from("tipoeps").select("*").order("nombretipoeps"),
      supabase.from('periodoacademico').select('*').order('fecha_inicio', {ascending: false}),
      supabase.from('filial').select('*'),
      supabase.from('serviciosalud').select('*'),
      supabase.from("departamento").select("iddepartamento, nombred").eq("estado", "ACTIVO").order("nombred"),
      supabase.from("provincia").select("idprovincia, nombrep, iddepartamento").eq("estado", "ACTIVO").order("nombrep"),
      supabase.from("distrito").select("iddistrito, nombredt, idprovincia").eq("estado", "ACTIVO").order("nombredt"),
    ])
    setTiposEps(tipoRes.data || [])
    setPeriodos(perRes.data || []); setFiliales(filRes.data || []); setServicios(servRes.data || [])
    setDepartamentos(deptoRes.data || []); setProvincias(provRes.data || []); setDistritos(distRes.data || [])
  }

  const loadEpsOptions = useCallback(async (inputValue: string) => {
    setLoadingEps(true)
    let query = supabase.from('eps').select('ideps, razonsocial, ruc').eq('estado','ACTIVO').limit(50).order('razonsocial')
    if(inputValue) query = query.ilike('razonsocial', `%${inputValue}%`)
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
    if(idTipoEpsSel !== '' && idTipoEpsSel !== null) query = query.eq('idtipoeps', Number(idTipoEpsSel))

    const {data} = await query
    const options = data?.map(e => ({value: e.ideps, label: `${e.razonsocial} - ${e.ruc || 'S/RUC'}`})) || []
    setEpsOptions(options)
    setLoadingEps(false)
    return options
  }, [idDeptoSel, idProvSel, idDistSel, idTipoEpsSel, provincias, distritos, supabase])

const fetchData = async () => {
    setLoading(true)
    try {
      // 1. BUSCADOR
      let idsDocentes: number[] | null = null
      if(search) {
        const { data: personasMatch } = await supabase.from('persona').select('idpersona').or(`dni.ilike.%${search}%,apellidos.ilike.%${search}%,nombres.ilike.%${search}%`)
        const idsPersona = personasMatch?.map(p => p.idpersona) || []
        if(idsPersona.length > 0) {
          const { data: docentesPorPersona } = await supabase.from('docente').select('iddocente').in('idpersona', idsPersona)
          idsDocentes = docentesPorPersona?.map(d => d.iddocente) || []
        }
      }

      // 2. DECIDIR SI USAMOS INNER O LEFT
      const tieneFiltroEps = idTipoEpsSel !== '' || idDistSel || idProvSel || idDeptoSel || filtroEps !== null
      const joinEps = tieneFiltroEps ? 'eps!inner' : 'eps!left' // CLAVE AQUI

      // 3. CONSTRUIR QUERY BASE
      let query = supabase.from('campoclinico')
        .select(`
          idcampocli, estado, iddocente, ideps,
          periodoacademico!left(codigo),
          serviciosalud!left(nombre),
          ${joinEps}(razonsocial, idtipoeps, iddistrito),
          filial!left(nombrefilial),
          docente!left(persona!left(dni, apellidos, nombres))
        `, { count: 'exact' })
        .eq('estado', 'ACTIVO')

      // 4. APLICAR FILTROS
      if(filtroPeriodo !== '') query = query.eq('idpa', filtroPeriodo)
      if(filtroServicio !== '') query = query.eq('idservicios', filtroServicio)
      if(filtroFilial !== '') query = query.eq('idfilial', filtroFilial)
      if(filtroEps !== null) query = query.eq('ideps', filtroEps)
      
      if(idTipoEpsSel !== '' && idTipoEpsSel !== null) query = query.eq('eps.idtipoeps', Number(idTipoEpsSel))
      if(idDistSel) query = query.eq('eps.iddistrito', idDistSel)
      if(idProvSel) {
        const idsDistDeProv = distritos.filter(d => d.idprovincia === idProvSel).map(d => d.iddistrito)
        if(idsDistDeProv.length > 0) query = query.in('eps.iddistrito', idsDistDeProv)
      }
      if(idDeptoSel) {
        const idsProvDepto = provincias.filter(p => p.iddepartamento === idDeptoSel).map(p => p.idprovincia)
        const idsDistDepto = distritos.filter(d => idsProvDepto.includes(d.idprovincia)).map(d => d.iddistrito)
        if(idsDistDepto.length > 0) query = query.in('eps.iddistrito', idsDistDepto)
      }

      if(search) {
        if(idsDocentes && idsDocentes.length > 0) {
          query = query.in('iddocente', idsDocentes)
        } else {
          query = query.ilike('eps.razonsocial', `%${search}%`)
        }
      }

      // 5. EJECUTAR
      const { count } = await query
      setTotalRegistros(count || 0)

      const {data: camposDB} = await query.order('idcampocli', {ascending: false}).range((paginaActual-1)*registrosPorPagina, paginaActual*registrosPorPagina - 1)

      const formateado: FilaHorario[] = camposDB?.map((c: any) => ({
        idcampocli: c.idcampocli,
        dni: c.docente?.persona?.dni || '-',
        docente: `${c.docente?.persona?.apellidos || ''}, ${c.docente?.persona?.nombres || ''}`,
        eps: c.eps?.razonsocial || '-',
        servicio: c.serviciosalud?.nombre || '-',
        filial: c.filial?.nombrefilial || '-',
        periodo: c.periodoacademico?.codigo || '-',
        estado: c.estado || '-',
      })) || []
      
      setData(formateado)
    } catch (error: any) {
      showToast(error.message, 'error')
    }
    setLoading(false)
  }

  const handleEditar = (fila: FilaHorario) => {
    setDataParaHorario(fila)
    setShowModalHorario(true)
  }

  const limpiarFiltros = () => { 
    setSearch(""); setFiltroPeriodo(""); setFiltroServicio(""); setFiltroFilial(""); setFiltroEps(null);
    setIdDeptoSel(''); setIdProvSel(''); setIdDistSel(''); setIdTipoEpsSel(''); setEpsOptions([]);
    setPaginaActual(1) 
  }

  const totalPaginas = Math.ceil(totalRegistros / registrosPorPagina)
  
  return (
    <div className="main-content campos-clinicos-page">
      {toast && <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 99999, background: toast.type === 'error'? '#EF4444' : '#22C55E', color: '#fff', padding: '1.2rem 2.4rem', borderRadius: '0.8rem', fontWeight: 600, fontSize: '1.4rem' }}>{toast.msg}</div>}

      <div className="header-responsive">
        <div><h1><Clock size={24} style={{marginRight: '0.8rem'}}/>Gestión de Horarios Docentes</h1><p>Total: {totalRegistros} docentes con campo clínico</p></div>
      </div>

      <div className="card-sgpc" style={{ marginBottom: '2.4rem', padding: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(20rem, 1fr))', gap: '1.2rem', marginBottom: '1.6rem' }}>
          <SelectSGPCFieldset label="Filtrar por Periodo" value={filtroPeriodo} onChange={setFiltroPeriodo} options={[{value: '', label: 'TODOS'},...periodos.map(p=>({value:p.idpa, label:`${p.codigo} - ${p.nombre}`}))]} />
          <SelectSGPCFieldset label="Filtrar por Servicio" value={filtroServicio} onChange={setFiltroServicio} options={[{value: '', label: 'TODOS'},...servicios.map(s=>({value:s.idservicios, label:s.nombre}))]} />
          <SelectSGPCFieldset label="Filtrar por Filial" value={filtroFilial} onChange={setFiltroFilial} options={[{value: '', label: 'TODAS'},...filiales.map(f=>({value:f.idfilial, label:f.nombrefilial}))]} />
        </div>
        
          <fieldset className="fieldset-sgpc">
            <legend>Filtrar por EPS</legend>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(20rem, 1fr))', gap: '0.8rem', marginTop: '0.4rem'}}>
              <SelectSGPCFieldset label="Depto" value={idDeptoSel} onChange={(v:any)=>{setIdDeptoSel(v); setIdProvSel(''); setIdDistSel(''); setFiltroEps(null)}} options={[{value: '', label: 'Todos'},...departamentos.map(d=>({value:d.iddepartamento, label:d.nombred}))]} />
              <SelectSGPCFieldset label="Prov" value={idProvSel} onChange={(v:any)=>{setIdProvSel(v); setIdDistSel(''); setFiltroEps(null)}} options={[{value: '', label: 'Todos'},...provinciasFiltradas.map(p=>({value:p.idprovincia, label:p.nombrep}))]} isDisabled={!idDeptoSel} />
              <SelectSGPCFieldset label="Dist" value={idDistSel} onChange={(v:any)=>{setIdDistSel(v); setFiltroEps(null)}} options={[{value: '', label: 'Todos'},...distritosFiltrados.map(d=>({value:d.iddistrito, label:d.nombredt}))]} isDisabled={!idProvSel} />
              <SelectSGPCFieldset label="Tipo" value={idTipoEpsSel} onChange={(v:any)=>{setIdTipoEpsSel(v); setFiltroEps(null)}} options={[{value: '', label: 'Todos'},...tiposEps.map(t=>({value:t.idtipoeps, label:t.nombretipoeps}))]} />
            </div>
            <AsyncSelect key={`${idDeptoSel}-${idProvSel}-${idDistSel}-${idTipoEpsSel}`} cacheOptions defaultOptions loadOptions={loadEpsOptions} value={epsOptions.find(o => o.value === filtroEps) || null} onChange={(opt:any) => setFiltroEps(opt?.value || null)} placeholder="Buscar EPS..." isLoading={loadingEps} isSearchable classNamePrefix="react-select" styles={selectStyles} />
          </fieldset>
        
        <div style={{display: 'flex', gap: '1rem', alignItems: 'flex-end', marginTop:'1.6rem'}}>
          <div style={{ position: 'relative', flex: 1 }}><Search size={18} style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} /><input className="input-sgpc" placeholder="Buscar por DNI, EPS, Docente..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '4rem', height: "4.4rem", width: '100%' }} /></div>
          <button className="btn-secundario btn-limpiar" onClick={limpiarFiltros} style={{height: '4.4rem'}}><Eraser size={16} />Limpiar</button>
        </div>
      </div>

      <div className="card-sgpc" style={{ overflowX: 'auto' }}>
        <table className='tabla-sgpc'>
          <thead>
            <tr>
              <th>Nro.</th><th>DNI</th><th>Docente</th><th>EPS</th><th>Servicio Salud</th><th>Filial</th><th>Periodo Academico</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading? <tr><td colSpan={8} style={{textAlign: 'center', padding: '2rem'}}>Cargando...</td></tr> : 
            data.length === 0? <tr><td colSpan={8} style={{textAlign: 'center', padding: '2rem'}}>No se encontraron registros</td></tr> :
            data.map((h,i) => (
              <tr key={h.idcampocli}>
                <td>{(paginaActual-1)*registrosPorPagina + i + 1}</td>
                <td>{h.dni}</td>
                <td>{h.docente}</td>
                <td>{h.eps}</td>
                <td>{h.servicio}</td>
                <td>{h.filial}</td>
                <td>{h.periodo}</td>
                <td style={{display: 'flex', gap: '0.8rem', justifyContent: 'center'}}>
                  <button onClick={() => handleEditar(h)} className="btn-icon btn-icon-editar" title="Gestionar Horarios"><Edit size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPaginas >= 1 && (
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

      <ModalHorarioDocente
        show={showModalHorario}
        onClose={() => setShowModalHorario(false)}
        idcampocli={dataParaHorario?.idcampocli}
        dataHeader={dataParaHorario}
      />
    </div>
  )
}