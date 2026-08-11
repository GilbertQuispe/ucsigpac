'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/client'
import { Plus, Edit, X, Trash2, BookOpen, Eraser, Save } from 'lucide-react'
import AsyncSelect from 'react-select/async' 
import Select from 'react-select'


type CargaAcademica = any

const SelectSGPCFieldset = ({label, value, onChange, options, isDisabled = false, isAsync = false, loadOptions}:any) => {
  const Component = isAsync ? AsyncSelect : Select // <-- NUEVO
  const selectedOption = isAsync ? value : options.find((o:any) => o.value === value?.value) || value || null // <-- CORREGIDO

  return (
    <fieldset className="fieldset-sgpc">
      <legend>{label}</legend>
      <Component 
        options={isAsync ? undefined : options} 
        loadOptions={isAsync ? loadOptions : undefined} 
        defaultOptions={isAsync}
        value={selectedOption} 
        onChange={onChange} // <-- Ahora pasa el objeto directo
        isDisabled={isDisabled} placeholder="Seleccione..." isSearchable maxMenuHeight={200} 
        classNamePrefix="react-select" getOptionValue={(e:any) => e.value} getOptionLabel={(e:any) => e.label}
        styles={{ control: (base, state) => ({...base, height: '4.4rem', minHeight: '4.4rem', borderRadius: '0.6rem', border: '1px solid #cbd5e1', background: '#fff', boxShadow: state.isFocused? '0 0 0 1px var(--color-primario)' : 'none', marginTop: '0.4rem', cursor: 'pointer', opacity: isDisabled? 0.6 : 1 }), valueContainer: (base) => ({...base, padding: '0 1.2rem', height: '4.4rem' }), input: (base) => ({...base, margin: 0, padding: 0 }), indicatorsContainer: (base) => ({...base, height: '4.4rem' }), option: (base, state) => ({...base, backgroundColor: state.isSelected? 'var(--color-primario)' : state.isFocused? 'var(--color-acento)' : '#fff', color: state.isSelected? '#fff' : 'var(--color-texto)', padding: '1rem 1.2rem' }), menu: (base) => ({...base, zIndex: 9999, marginTop: '0.4rem' }) }} 
      />
    </fieldset>
  )
}

export default function CargaAcademicaPage() {
  const supabase = createClient()
  const [cargas, setCargas] = useState<CargaAcademica[]>([])
  const [periodos, setPeriodos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [filtroPeriodo, setFiltroPeriodo] = useState<any>({value: '', label: 'TODOS'}) // <- era number
  const [docenteSel, setDocenteSel] = useState<any>(null)
  const [asignaturaSel, setAsignaturaSel] = useState<any>(null)

  const [paginaActual, setPaginaActual] = useState(1)
  const registrosPorPagina = 10
  const [totalRegistros, setTotalRegistros] = useState(0)
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null)

  const [showModal, setShowModal] = useState(false)
  const [cargaEdit, setCargaEdit] = useState<CargaAcademica | null>(null)
  
  const [form, setForm] = useState<any>({idpa: null,  idhorariod: null, idasignatura: null, nrc: '', grupo: '', docenteData: null, planacademico: '',  carrera: '' })

  const showToast = (msg: string, type: 'error' | 'success' = 'error') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  const loadAsignaturas = async (inputValue: string) => {
    const {data, error} = await supabase.from('asignatura').select(`idasignatura, codigo, nombre, carrera:idcarrera(nombrecarrera), planasignatura:idplan(nombre)`).ilike('nombre', `%${inputValue}%`).limit(50)
    return data?.map(a => ({value: a.idasignatura, label: `${a.codigo} - ${a.nombre}`, carrera: a.carrera?.nombrecarrera, planacademico:a.planasignatura?.nombre})) || []
  }
  
const loadDocentesPorPeriodo = async (inputValue: string) => {
  if(!form.idpa) return []
  
  const {data, error} = await supabase
    .from('campoclinico')
    .select(`
      idcampocli,
      iddocente,
      idpa,
      idservicios,
      ideps,
      serviciosalud:idservicios!inner(nombre),
      eps:ideps!inner(
        razonsocial,
        distrito:iddistrito!inner(nombredt)
      ),
      docente:iddocente!inner(
        iddocente,
        persona:idpersona!inner(dni, apellidos, nombres)
      )
    `)
    .eq('idpa', form.idpa.value) 
    .eq('estado', 'ACTIVO')
    .limit(100) // subí el limit porque ahora filtramos en front

  if(error) {
    console.error("ERROR CARGANDO DOCENTES:", error)
    return []
  }
  
  const registros = data || []
  const texto = inputValue.toLowerCase().trim()

  // Si escribió, filtra por dni, apellidos, nombres o servicio
  const filtrados = registros.filter(c => {
    const dni = c.docente?.persona?.dni?.toLowerCase() || ''
    const apellidos = c.docente?.persona?.apellidos?.toLowerCase() || ''
    const nombres = c.docente?.persona?.nombres?.toLowerCase() || ''
    const servicio = c.serviciosalud?.nombre?.toLowerCase() || ''
    return dni.includes(texto) || apellidos.includes(texto) || nombres.includes(texto) || servicio.includes(texto)
  })

  const listaFinal = texto ? filtrados : registros // si no escribió, muestra todo

  return listaFinal.map(c => ({
    value: c.idcampocli, 
    label: `${c.docente?.persona?.dni} - ${c.docente?.persona?.apellidos}, ${c.docente?.persona?.nombres} | ${c.serviciosalud?.nombre}`,
    iddocente: c.iddocente,
    idcampocli: c.idcampocli,
    servicio: c.serviciosalud?.nombre,
    eps: c.eps?.razonsocial,
    distrito: c.eps?.distrito?.nombredt
  }))
}



 const fetchData = async () => {
    setLoading(true)
    const [perRes] = await Promise.all([
      supabase.from('periodoacademico').select('*').order('fecha_inicio', {ascending: false}),
    ])
    setPeriodos(perRes.data || [])

    let query = supabase.from('cargaacademica')
    .select(`*, asignatura:idasignatura(*, carrera:idcarrera(*)), horariodocente:idhorariod(*, campoclinico:idcampocli(*, periodoacademico:idpa(*), filial:idfilial(*), docente:iddocente(*, persona:idpersona(*))))`, { count: 'exact' })
    .eq('estado', 'ACTIVO')
    .order('idcargaacad', {ascending: false})
    .range((paginaActual-1)*registrosPorPagina, paginaActual*registrosPorPagina - 1)

    if(filtroPeriodo?.value) query = query.eq('horariodocente.campoclinico.idpa', filtroPeriodo.value) // <-.value
    if(docenteSel?.value) query = query.eq('horariodocente.idhorariod', docenteSel.value) // <-.value y era idhorariod no iddocente
    if(asignaturaSel?.value) query = query.eq('idasignatura', asignaturaSel.value) // <-.value
    if(search) query = query.or(`nrc.ilike.%${search}%,grupo.ilike.%${search}%`)

    const {data, count, error} = await query
    if(error) showToast(error.message, 'error')
    else { setCargas(data as any || []); setTotalRegistros(count || 0) }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [paginaActual, filtroPeriodo, docenteSel, asignaturaSel, search])
  
  useEffect(() => {
  if(showModal){
    setForm({idpa: null, idhorariod: null, idasignatura: null, nrc: '', grupo: ''})
  }
}, [showModal])

  const puedeGuardar = useMemo(() => form.idpa && form.idhorariod && form.idasignatura && form.nrc, [form])

  const handleGuardar = async () => {
    if(!puedeGuardar) { showToast('Complete Periodo, Docente, Asignatura y NRC *', 'error'); return }
    
    const dataToSave = {
      idasignatura: form.idasignatura.value,
      idhorariod: form.idhorariod.value,
      nrc: form.nrc,
      grupo: form.grupo,
      estado: 'ACTIVO'
    }
    const {error} = cargaEdit
     ? await supabase.from('cargaacademica').update(dataToSave).eq('idcargaacad', cargaEdit.idcargaacad)
      : await supabase.from('cargaacademica').insert(dataToSave)

    if(error) showToast(error.message, 'error')
    else { showToast(cargaEdit? 'Carga actualizada' : 'Carga registrada', 'success'); setShowModal(false); fetchData() }
  }

  return (
    <div className="main-content">
      {toast && <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 99999, background: toast.type === 'error'? '#EF4444' : '#22C55E', color: '#fff', padding: '1.2rem 2.4rem', borderRadius: '0.8rem', fontWeight: 600, fontSize: '1.4rem' }}>{toast.msg}</div>}

      <div className="header-responsive">
        <div><h1><BookOpen size={24} style={{marginRight: '0.8rem'}}/>Gestión de Carga Académica</h1><p>Total: {totalRegistros} registros</p></div>
        <button className="btn-primario" onClick={() => setShowModal(true)}><Plus size={18} />Nueva Carga</button>
      </div>

      <div className="card-sgpc" style={{ marginBottom: '2.4rem', padding: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.2rem', marginBottom: '1.6rem' }}>
          <SelectSGPCFieldset label="Filtrar por Periodo" value={filtroPeriodo} onChange={setFiltroPeriodo} options={[{value: '', label: 'TODOS'},...periodos.map(p=>({value:p.idpa, label:`${p.codigo} - ${p.nombre}`}))]} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr', gap: '1.2rem', alignItems: 'flex-end' }}>
          <div><legend>Docente</legend><AsyncSelect
  key={form.idpa?.value} // fuerza recarga al cambiar periodo
  cacheOptions
  defaultOptions // <-- ESTA ES LA CLAVE: carga todos al abrir
  loadOptions={loadDocentesPorPeriodo}
  value={docenteSel}
  /*onChange={(e) => setForm({...form, idhorariod: e.value, iddocente: e.iddocente})}*/
  onChange={setDocenteSel}
  placeholder="Seleccione..."
  
  noOptionsMessage={() => "No hay docentes"}
  isDisabled={!filtroPeriodo?.value}
/></div>
          <div><legend>Asignatura</legend><AsyncSelect cacheOptions loadOptions={loadAsignaturas} value={asignaturaSel} onChange={setAsignaturaSel} placeholder="Buscar asignatura..." /></div>
          <div><legend>Buscar NRC/Grupo</legend><input className="input-sgpc" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} style={{height: "4.4rem", width: '100%' }} /></div>
          <button className="btn-secundario btn-limpiar" onClick={() => {setSearch(""); setFiltroPeriodo(""); setDocenteSel(null); setAsignaturaSel(null); setPaginaActual(1)}} style={{height: '4.4rem'}}><Eraser size={16} />Limpiar</button>
        </div>
      </div>

      <div className="card-sgpc" style={{ overflowX: 'auto' }}>
        <table className='tabla-sgpc'>
          <thead><tr>
            <th>#</th><th>PERIODO</th><th>FILIAL</th><th>CARRERA</th><th>DNI</th><th>DOCENTE</th><th>ASIGNATURA</th><th>NRC</th><th>GRUPO</th><th>ESTADO</th><th>ACCIONES</th>
          </tr></thead>
          <tbody>
            {loading? <tr><td colSpan={11} style={{textAlign: 'center', padding: '2rem'}}>Cargando...</td></tr> : 
            cargas.length === 0 ? <tr><td colSpan={11} style={{textAlign: 'center', padding: '2rem'}}>No hay registros. Registre una nueva carga.</td></tr> :
            cargas.map((c,i) => (
              <tr key={c.idcargaacad}>
                <td>{(paginaActual-1)*registrosPorPagina + i + 1}</td>
                <td>{c.horariodocente?.campoclinico?.periodoacademico?.codigo}</td>
                <td>{c.horariodocente?.campoclinico?.filial?.nombrefilial}</td>
                <td>{c.asignatura?.carrera?.nombrecarrera}</td>
                <td>{c.horariodocente?.campoclinico?.docente?.persona?.dni}</td>
                <td>{c.horariodocente?.campoclinico?.docente?.persona?.apellidos}, {c.horariodocente?.campoclinico?.docente?.persona?.nombres}</td>
                <td>{c.asignatura?.nombre}</td>
                <td>{c.nrc}</td>
                <td>{c.grupo}</td>
                <td><span style={{padding: '0.4rem 0.8rem', borderRadius: '999px', fontSize: '1.2rem', fontWeight: 600, background: c.estado === 'ACTIVO'? '#F0FDF4' : '#FEF2F2', color: c.estado === 'ACTIVO'? '#22C55E' : '#EF4444'}}>{c.estado}</span></td>
                <td style={{display: 'flex', gap: '0.8rem'}}>
                  <button className="btn-icon btn-icon-editar" title="Editar"><Edit size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{maxWidth: '90rem'}}>
            <div className="modal-header">
              <h2 style={{display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--color-primario)'}}><BookOpen size={22} /> Nueva Carga Académica</h2>
              <button onClick={() => setShowModal(false)} className="btn-cerrar-modal"><X size={18} /></button>
            </div>
            <div className="modal-body" style={{gap: '2.4rem'}}>
                <fieldset className="fieldset-sgpc-section">
  <legend>Datos Generales</legend>
  <div className="grid-2">
    
      <SelectSGPCFieldset
       label="Periodo Académico *" 
        options={periodos.map(p=>({value:p.idpa, label:`${p.codigo} - ${p.nombre}`}))} 
        value={form.idpa} 
        onChange={(opt:any) => setForm({...form, idpa: opt, idhorariod: null, docenteData: null})} // <- limpia docenteData
        placeholder="Seleccione..." 
        isSearchable 
        styles={{ control: (base, state) => ({...base, height: '4.4rem', minHeight: '4.4rem', borderRadius: '0.6rem', border: '1px solid #cbd5e1', marginTop: '0.4rem' }), menu: (base) => ({...base, zIndex: 9999 }) }} 
      />
    

    <SelectSGPCFieldset 
      label="DNI + Docente *" 
      value={form.idhorariod} 
      onChange={(opt:any) => setForm({
        ...form, 
        idhorariod: opt, // guarda el objeto completo
        docenteData: opt // <- guarda los datos para los inputs
      })} 
      isAsync 
      loadOptions={loadDocentesPorPeriodo} 
      isDisabled={!form.idpa} 
      key={form.idpa?.value}
    />

    <fieldset className="fieldset-sgpc">
      <legend>Servicio de Salud</legend>
      <input 
        className="input-sgpc" 
        value={form.docenteData?.servicio || ''} 
        readOnly 
        style={{marginTop: '0.4rem', paddingLeft:'1rem', background: '#F1F5F9'}} 
      />
    </fieldset>

    <fieldset className="fieldset-sgpc">
      <legend>EPS + Distrito</legend>
      <input 
        className="input-sgpc" 
        value={form.docenteData ? `${form.docenteData.eps || ''} - ${form.docenteData.distrito || ''}` : ''} 
        readOnly 
        style={{marginTop: '0.4rem', paddingLeft:'1rem', background: '#F1F5F9'}} 
      />
    </fieldset>

  </div>
</fieldset>                               
                <fieldset className="fieldset-sgpc-section">
                  <legend>Asignatura</legend>
                  <div className="grid-3">
                      <SelectSGPCFieldset label="Asignatura *" value={form.idasignatura} onChange={(opt:any) => setForm({...form, idasignatura: opt, planacademico: opt?.planacademico || '', carrera: opt?.carrera || ''})} isAsync loadOptions={loadAsignaturas} />
  <fieldset className="fieldset-sgpc">
  <legend>Plan Académico</legend>
  <input 
    type="text" 
    value={form.planacademico || ''} 
    readOnly 
    disabled 
    className="input-sgpc"
    style={{marginTop: '0.4rem', paddingLeft:'1rem', background: '#F1F5F9'}} 
  />
</fieldset>

<fieldset className="fieldset-sgpc">
  <legend>Carrera</legend>
  <input 
    type="text" 
    value={form.carrera || ''} 
    readOnly 
    disabled 
    className="input-sgpc"
    style={{marginTop: '0.4rem', paddingLeft:'1rem', background: '#F1F5F9'}} 
  />
</fieldset>
                        
                      <fieldset className="fieldset-sgpc"><legend>NRC *</legend><input className="input-sgpc" value={form.nrc} onChange={e => setForm({...form, nrc: e.target.value})} style={{marginTop: '0.4rem'}} /></fieldset>
                      <fieldset className="fieldset-sgpc"><legend>Grupo</legend><input className="input-sgpc" value={form.grupo} onChange={e => setForm({...form, grupo: e.target.value})} style={{marginTop: '0.4rem'}} /></fieldset>
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

 <style jsx>{`
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 2fr; 
      /* 4 columnas iguales */
  gap: 1.6rem;
}

.grid-2 .sgpc-fieldset {
  margin: 0; /* quita el margin que mete fieldset por defecto */
  padding-left:0;
}
  @media (max-width: 1024px) {
  .grid-2 {
    grid-template-columns: repeat(1, 1fr); /* 2 columnas */
  }
}

@media (max-width: 600px) {
  .grid-4 {
    grid-template-columns: 1fr; /* 1 columna */
  }
}

      `}</style>

    </div>
  )
}
