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
  supervisor: { nombres: string, apellidos: string }
  idpersona_supervisor: number // <- AGREGADO
  docente: { nombres: string, apellidos: string }
  curso: { nombre: string }
  porcentaje_docente: number
  porcentaje_alumno: number
  resultado_baremo_general: string
  estado: string
}

type VUsuarioCompleto = {
  id: string
  idpersona: number
  idrol: number
  nombres: string
  apellidos: string
  nombrerol: string
  email: string
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

  const [idPersonaUsuario, setIdPersonaUsuario] = useState<number | null>(null)
  const [idRolUsuario, setIdRolUsuario] = useState<number | null>(null)

  const [paginaActual, setPaginaActual] = useState(1)
  const registrosPorPagina = 10

  useEffect(() => { 
    if(user) {
      obtenerRolUsuario()
    }
    fetchSupervisores()
  }, [user])

  const obtenerRolUsuario = async () => {
    const { data: usuario, error } = await supabase
  .from('v_usuario_completo')
  .select('id, idpersona, idrol, nombres, apellidos, nombrerol')
  .eq('id', user.id)
  .maybeSingle()

    if(usuario) {
      const u = usuario as VUsuarioCompleto
      setIdRolUsuario(u.idrol)
      setIdPersonaUsuario(u.idpersona)
      setEsAdmin(u.idrol === 1 || u.idrol === 2)
    }
  }

  const fetchSupervisores = async () => {
    const { data } = await supabase
  .from('supervisor')
  .select(`
     idsupervisor,
     persona!inner(idpersona, nombres, apellidos)
   `)
  .eq('persona.estado', 'ACTIVO')

    // const supervisoresMapeados = (data || []).map((s: any) => ({
    //   idpersona: s.persona.idpersona,
    //   nombres: s.persona.nombres,
    //   apellidos: s.persona.apellidos
    // }))
    
   const supervisoresMapeados = (data || []).map((s: any) => ({
      idpersona: s.idsupervisor, // <- BIEN: para que el filtro funcione
      nombres: s.persona.nombres,
      apellidos: s.persona.apellidos
    }))
    setSupervisores(supervisoresMapeados)
  }

  const handleBuscar = async () => {
    if(!fechaDel ||!fechaAl) { toast.error('Seleccione rango de fechas'); return }
    setLoading(true)

    const { data: dataVisitas, error } = await supabase
  .from('visitasupervision')
  .select('idvisitas, condicion, idasignacions, iddh, fechavisita, porcentaje_docente, porcentaje_alumno, resultado_baremo_general')
  .eq('condicion', 'SUPERVISADO')
  .gte('fechavisita', fechaDel)
  .lte('fechavisita', fechaAl)

    if(error) { toast.error(error.message); setLoading(false); return }

    const dataCompleta = await Promise.all((dataVisitas || []).map(async (visita: any) => {

      if(!visita.idasignacions || !visita.iddh) return null

      // 2. Traer supervisor
      const { data: asignacion } = await supabase
    .from('asignacionsupervision')
    .select('idsupervisor')
    .eq('idasignacions', visita.idasignacions)
    .maybeSingle()

      const { data: sup } = await supabase
    .from('supervisor')
    .select('persona!inner(nombres, apellidos)')
    .eq('idsupervisor', asignacion?.idsupervisor)
    .maybeSingle()

      // 3. Traer NRC, Curso y idcampocli
      const { data: detalle } = await supabase.from('detallehorario').select('idhorario').eq('iddh', visita.iddh).maybeSingle()
      const { data: horario } = await supabase.from('horario').select('idcargaacad').eq('idhorario', detalle?.idhorario).maybeSingle()
      const { data: carga } = await supabase.from('cargaacademica').select('nrc, idcampocli, asignatura!inner(nombre)').eq('idcargaacad', horario?.idcargaacad).maybeSingle()

      // 4. Traer Docente desde campoclinico -> docente
      const { data: campo } = await supabase.from('campoclinico').select('iddocente').eq('idcampocli', carga?.idcampocli).maybeSingle()
      const { data: doc } = await supabase.from('docente').select('persona!inner(nombres, apellidos)').eq('iddocente', campo?.iddocente).maybeSingle()

      // 5. Traer idsvs
      const { data: svs } = await supabase.from('seleccionvisitasupervision').select('idsvs').eq('idvisitas', visita.idvisitas).maybeSingle()

      return {
        idsvs: svs?.idsvs || 0,
        fecha: visita.fechavisita,
        nrc: carga?.nrc || 'N/A',
        supervisor: sup?.persona || {nombres: 'N/A', apellidos: ''},
        idpersona_supervisor: asignacion?.idsupervisor || 0,
        docente: doc?.persona || {nombres: 'N/A', apellidos: ''}, // <- YA JALA EL DOCENTE
        curso: carga?.asignatura || {nombre: 'N/A'},
        porcentaje_docente: visita.porcentaje_docente || 0,
        porcentaje_alumno: visita.porcentaje_alumno || 0,
        resultado_baremo_general: visita.resultado_baremo_general || 'N/A',
        estado: visita.condicion
      }
    }))

    setSupervisiones(dataCompleta.filter(Boolean) as Supervision[])
    setLoading(false)
    setSeleccionados([])
    setPaginaActual(1)
  }

  
  // TODOS LOS FILTROS VAN AQUÍ EN EL useMemo
  const datosFiltrados = useMemo(() => {
    let final = [...supervisiones]

    // 1. Filtro por fecha
    if(fechaDel && fechaAl) {
      final = final.filter(s => s.fecha >= fechaDel && s.fecha <= fechaAl)
    }

    // 2. Filtro por rol: Supervisor solo ve las suyas
    if(idRolUsuario === 5 && idPersonaUsuario) {
      final = final.filter(s => s.idpersona_supervisor === idPersonaUsuario)
    } else if(filtroSupervisor) { // 3. Filtro por supervisor seleccionado por Admin
      final = final.filter(s => s.idpersona_supervisor === Number(filtroSupervisor))
    }

    // 4. Filtro por search
    final = final.filter((s) => {
      const matchSearch =
        s.nrc.toLowerCase().includes(search.toLowerCase()) ||
        `${s.docente.nombres} ${s.docente.apellidos}`.toLowerCase().includes(search.toLowerCase()) ||
        s.curso.nombre.toLowerCase().includes(search.toLowerCase())
      return matchSearch
    })

    return final
  }, [supervisiones, search, fechaDel, fechaAl, idRolUsuario, idPersonaUsuario, filtroSupervisor])

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
      if(visita) await generarInforme(visita, [])
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
    {/* QUITA ESTE DEBUG CUANDO YA FUNCIONE */}
    <div style={{background:'red', color:'white', padding:'1rem', fontSize:'1.2rem'}}>
    DEBUG: id={user?.id} | idRol={idRolUsuario} | idPersona={idPersonaUsuario} | esAdmin={String(esAdmin)}
  </div>
    <Toaster position="top-right" />
    <div className="main-content">
      <div className="header-responsive">
        <div><h1><FileText size={24} style={{marginRight: '0.8rem'}}/>Gestión de Informes de Supervisión</h1><p>Total: {datosFiltrados.length} supervisiones</p></div>
        <div style={{ display: 'flex', gap: '1.2rem' }}>
          <button className="btn-secundario" onClick={handleGenerarLote}><Download size={18} /> Generar {seleccionados.length} Seleccionados</button>
        </div>
      </div>

      <div className="card-sgpc" style={{ marginBottom: '2.4rem', padding: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(20rem, 1fr))', gap: '1.2rem', marginBottom: '1.6rem' }}>
          <fieldset className="fieldset-sgpc">
            <legend><Calendar size={14}/> Del</legend>
            <input type="date" value={fechaDel} onChange={e => {setFechaDel(e.target.value); setPaginaActual(1)}} className="input-sgpc" />
          </fieldset>
          <fieldset className="fieldset-sgpc">
            <legend><Calendar size={14}/> Al</legend>
            <input type="date" value={fechaAl} onChange={e => {setFechaAl(e.target.value); setPaginaActual(1)}} className="input-sgpc" />
          </fieldset>
          {esAdmin && (
            <SelectSGPCFieldset label="Supervisor" value={filtroSupervisor} onChange={(val:any) => {setFiltroSupervisor(val); setPaginaActual(1)}} options={[{value: "", label: "Todos"},...supervisores.map(s=>({value:s.idpersona, label:`${s.apellidos}, ${s.nombres}`}))]} />
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

      <div className="card-sgpc" style={{ overflowX: 'auto' }}>
        <table className='tabla-sgpc'>
          <thead>
            <tr>
              <th style={{width: '5rem'}}><input type="checkbox" checked={seleccionados.length === datosPaginados.length && datosPaginados.length > 0} onChange={toggleAll} /></th>
              <th>#</th>
              <th>FECHA</th>
              <th>NRC</th>
              <th>SUPERVISOR</th>
              <th>DOCENTE</th>
              <th>CURSO</th>
              <th>% DOC</th>
              <th>% ALUM</th>
              <th>RESULTADO</th>
            </tr>
          </thead>
          <tbody>
            
            {datosPaginados.map((s, i) => (
              <tr key={`${s.idsvs}-${s.fecha}-${i}`}>
                <td><input type="checkbox" checked={seleccionados.includes(s.idsvs)} onChange={() => toggleCheck(s.idsvs)} /></td>
                <td>{indiceInicio + i + 1}</td>
                <td>{s.fecha? new Date(s.fecha).toLocaleDateString() : 'N/A'}</td>
                <td>{s.nrc}</td>
                <td>{s.supervisor.apellidos}, {s.supervisor.nombres}</td>
                <td>{s.docente.apellidos}, {s.docente.nombres}</td>
                <td>{s.curso.nombre}</td>
                <td>{s.porcentaje_docente}%</td>
                <td>{s.porcentaje_alumno}%</td>
                <td><span className="badge-ok">{s.resultado_baremo_general}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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