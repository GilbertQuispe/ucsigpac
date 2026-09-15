'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/client'
import { Search, Eraser, Check, FileText, Download, Users, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import Select from '@/components/ui/SelectClient'
import toast from 'react-hot-toast'
import { Toaster } from 'react-hot-toast'
import { generarInforme } from '@/lib/generarInforme'
import { useAuth } from '@/hooks/useAuth'

type Supervision = {
  idsvs: number
  fecha: string
  nrc: string
  idpersona_supervisor: number
  docente: { nombres: string }
  curso: { curso: string }
  porcentaje_docente: number
  porcentaje_alumno: number
  resultado_baremo_general: string
  estado: string
}

type Persona = { idpersona: number; nombres: string; apellidos: string }

const SelectSGPCFieldset = ({label, value, onChange, options}:any) => {
  const selectedOption = options.find((o:any) => o.value === value) || null
  return (
    <fieldset className="fieldset-sgpc">
      <legend>{label}</legend>
      <Select options={options} value={selectedOption} onChange={(opt:any) => onChange(opt?.value || '')} placeholder="Seleccione..." isSearchable maxMenuHeight={200} classNamePrefix="react-select" styles={{ control: (base, state) => ({...base, height: '4.4rem', minHeight: '4.4rem', borderRadius: '0.6rem', border: '1px solid #cbd5e1', background: '#fff', boxShadow: state.isFocused? '0 0 0 1px var(--color-primario)' : 'none', marginTop: '0.4rem' }) }} />
    </fieldset>
  )
}

export default function InformeSupervisionPage() {
  const supabase = createClient()
  const { user } = useAuth()
  const [supervisiones, setSupervisiones] = useState<Supervision[]>([])
  const [supervisores, setSupervisores] = useState<Persona[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [seleccionados, setSeleccionados] = useState<number[]>([])

  const [fechaDel, setFechaDel] = useState('')
  const [fechaAl, setFechaAl] = useState('')
  const [filtroSupervisor, setFiltroSupervisor] = useState<number | ''>('')
  const [esAdmin, setEsAdmin] = useState(false)

  const [paginaActual, setPaginaActual] = useState(1)
  const registrosPorPagina = 10

  useEffect(() => { 
    // Validar si es admin/gestor
    setEsAdmin(user?.user_metadata?.rol === 'ADMIN' || user?.user_metadata?.rol === 'GESTOR')
    fetchSupervisores()
  }, [user])

  const fetchSupervisores = async () => {
    const { data } = await supabase.from('persona').select('idpersona, nombres, apellidos').eq('estado', 'ACTIVO')
    setSupervisores(data || [])
  }

  const handleBuscar = async () => {
    if(!fechaDel ||!fechaAl) { toast.error('Seleccione rango de fechas'); return }
    setLoading(true)
    let query = supabase
   .from('seleccionvisitasupervision')
   .select(`idsvs, fecha, nrc, idpersona_supervisor, docente:personas!idpersona_supervisor(nombres), curso:cargaacademica(curso), porcentaje_docente, porcentaje_alumno, resultado_baremo_general, estado`)
   .eq('estado', 'SUPERVISADO')
   .gte('fecha', fechaDel)
   .lte('fecha', fechaAl)

    if(!esAdmin) {
      query = query.eq('idpersona_supervisor', user.id) // solo las suyas
    } else if(filtroSupervisor) {
      query = query.eq('idpersona_supervisor', filtroSupervisor) // filtro admin
    }

    const { data, error } = await query.order('fecha', { ascending: false })
    if(error) toast.error(error.message)
    //setSupervisiones(data as Supervision[] || [])
const dataLimpia = (data || []).map((d: any) => ({
  ...d,
  docente: d.docente, // ya viene objeto por el !inner
  curso: d.curso
}))
setSupervisiones(dataLimpia)
    setLoading(false)
    setSeleccionados([])
  }

  const datosFiltrados = useMemo(() => {
    return supervisiones.filter((s) => {
      const matchSearch = s.nrc.toLowerCase().includes(search.toLowerCase()) || s.docente.nombres.toLowerCase().includes(search.toLowerCase()) || s.curso.curso.toLowerCase().includes(search.toLowerCase())
      return matchSearch
    })
  }, [supervisiones, search])

  const totalPaginas = Math.ceil(datosFiltrados.length / registrosPorPagina)
  const indiceInicio = (paginaActual - 1) * registrosPorPagina
  const datosPaginados = datosFiltrados.slice(indiceInicio, indiceInicio + registrosPorPagina)

  const toggleCheck = (id: number) => { setSeleccionados(prev => prev.includes(id)? prev.filter(i => i!== id) : [...prev, id]) }
  const toggleAll = () => { setSeleccionados(seleccionados.length === datosPaginados.length? [] : datosPaginados.map(d => d.idsvs)) }

  const handleGenerarLote = async () => {
    if(seleccionados.length === 0) { toast.error('Seleccione al menos 1 supervisión'); return }
    setLoading(true)
    for(const id of seleccionados) {
      const visita = supervisiones.find(s => s.idsvs === id)
      //if(visita) await generarInforme(visita, [], '', '') // aquí le metes fotos, conclusiones
      if(visita) await generarInforme(visita, []) // aquí le metes fotos, conclusiones
    }
    toast.success(`${seleccionados.length} informes generados`)
    setLoading(false)
  }

  const limpiarFiltros = () => { 
    setFechaDel(''); setFechaAl(''); setFiltroSupervisor(''); setSearch(''); 
    setSupervisiones([]); setPaginaActual(1) 
  }

  return (
    <>
    <Toaster position="top-right" />
    <div className="main-content"> 
      <div className="header-responsive">
        <div><h1><FileText size={24} style={{marginRight: '0.8rem'}}/>Gestión de Informes de Supervisión</h1><p>Total: {datosFiltrados.length} supervisiones</p></div>
        <div style={{ display: 'flex', gap: '1.2rem' }}>
          <button className="btn-secundario" onClick={handleGenerarLote}><Download size={18} /> Generar {seleccionados.length} Seleccionados</button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="card-sgpc" style={{ marginBottom: '2.4rem', padding: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(20rem, 1fr))', gap: '1.2rem', marginBottom: '1.6rem' }}>
          <fieldset className="fieldset-sgpc">
            <legend><Calendar size={14}/> Del</legend>
            <input type="date" value={fechaDel} onChange={e => setFechaDel(e.target.value)} className="input-sgpc" />
          </fieldset>
          <fieldset className="fieldset-sgpc">
            <legend><Calendar size={14}/> Al</legend>
            <input type="date" value={fechaAl} onChange={e => setFechaAl(e.target.value)} className="input-sgpc" />
          </fieldset>
          {esAdmin && (
            <SelectSGPCFieldset label="Supervisor" value={filtroSupervisor} onChange={(val:any) => setFiltroSupervisor(val)} options={[{value: "", label: "Todos"},...supervisores.map(s=>({value:s.idpersona, label:`${s.apellidos}, ${s.nombres}`}))]} />
          )}
        </div>
        <div style={{display: 'flex', gap: '1rem', alignItems: 'flex-end'}}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
            <input className="input-sgpc" placeholder="Buscar por NRC, Docente, Curso..." value={search} onChange={e => {setSearch(e.target.value); setPaginaActual(1)}} style={{ paddingLeft: '4rem', height: "4.4rem", width: '100%' }} />
          </div>
          <button className="btn-secundario" onClick={limpiarFiltros} style={{height: '4.4rem'}}><Eraser size={16} />Limpiar</button>
          <button className="btn-primario" onClick={handleBuscar} style={{height: '4.4rem'}}><Search size={16} />Buscar</button>
        </div>
      </div>

      {/* TABLA */}
      <div className="card-sgpc" style={{ overflowX: 'auto' }}>
        <table className='tabla-sgpc'>
          <thead>
            <tr>
              <th style={{width: '5rem'}}><input type="checkbox" checked={seleccionados.length === datosPaginados.length && datosPaginados.length > 0} onChange={toggleAll} /></th>
              <th>#</th><th>FECHA</th><th>NRC</th><th>DOCENTE</th><th>CURSO</th><th>% DOC</th><th>% ALUM</th><th>RESULTADO</th>
            </tr>
          </thead>
          <tbody>
            {datosPaginados.map((s, i) => (
              <tr key={s.idsvs}>
                <td><input type="checkbox" checked={seleccionados.includes(s.idsvs)} onChange={() => toggleCheck(s.idsvs)} /></td>
                <td>{indiceInicio + i + 1}</td>
                <td>{new Date(s.fecha).toLocaleDateString()}</td>
                <td>{s.nrc}</td>
                <td>{s.docente.nombres}</td>
                <td>{s.curso.curso}</td>
                <td>{s.porcentaje_docente}%</td>
                <td>{s.porcentaje_alumno}%</td>
                <td><span className="badge-ok">{s.resultado_baremo_general}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINACION */}
      {totalPaginas > 1 && (
        <div className="paginacion-footer">
          <p className="paginacion-info">Mostrando {indiceInicio + 1} al {Math.min(indiceInicio + registrosPorPagina, datosFiltrados.length)} de {datosFiltrados.length} registros</p>
          <div className="paginacion-controles">
            <button className="btn-pag" onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1}><ChevronLeft size={16} /> Anterior</button>
            <span className="paginacion-pagina">Pág {paginaActual} de {totalPaginas}</span>
            <button className="btn-pag btn-pag-primario" onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas}>Siguiente <ChevronRight size={16} /></button>
          </div>
        </div>
      )}
    </div>
    </>
  )
}