'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/client'
import { Plus, Edit, X, Search, Upload, Users, ChevronLeft, ChevronRight, Eraser, Check, UserX, UserCheck, GraduationCap, Save, Download } from 'lucide-react'
import Select from 'react-select'
import * as XLSX from 'xlsx' // <-- AGREGADO

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

const handleClickImportar = () => {
  showToast('Formato requerido: DNI | Apellidos y Nombres | Carrera | Filial', 'success')
  // Después de 1 segundo le damos click automático al input
  setTimeout(() => {
    document.getElementById('import-estudiante')?.click()
  }, 1000)
}

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
  const indiceFin = indiceInicio + registrosPorPagina
  const datosPaginados = datosFiltrados.slice(indiceInicio, indiceFin)

  const toggleCheck = (id: number) => { setSeleccionados(prev => prev.includes(id)? prev.filter(i => i!== id) : [...prev, id]) }

  const handleAbrirModalConvertir = () => {
    if(seleccionados.length === 0) { showToast('Seleccione por lo menos un registro de personas con rol de estudiante', 'error'); return }
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
      showToast(`Se convirtió ${paraInsertar.length} seleccionado a estudiantes`, 'success')
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

  // ===== INICIO: CODIGO IMPORTAR EXCEL ACTUALIZADO =====
 // ===== INICIO: CODIGO IMPORTAR EXCEL MEJORADO =====
const handleImportEstudiante = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (!file) return

  // 1. MENSAJE DE FORMATO ANTES DE LEER
  showToast('Formato: DNI | Apellidos y Nombres | Carrera | Filial', 'success')

  const reader = new FileReader()
  reader.onload = async (evt) => {
    setLoading(true)
    const bstr = evt.target?.result
    const wb = XLSX.read(bstr, { type: 'binary' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

    const headerIndex = data.findIndex(row => row.includes('CODIGOALUM'))
    if(headerIndex === -1){ showToast('El Excel debe tener la cabecera CODIGOALUM', 'error'); setLoading(false); return }
    const filas = data.slice(headerIndex + 1)

    const { data: personasRolEst } = await supabase
     .from('persona')
     .select('idpersona, dni, apellidos, nombres')
     .eq('estado', 'ACTIVO')
     .eq('idrol', idRolEstudiante)

    const mapPersonas = new Map(personasRolEst?.map(p => [p.dni, p]))
    const dnisYaEstudiantes = new Set(estudiantes.map(e => e.persona?.dni))

    const preview: any[] = []

    filas.forEach((row, index) => {
      if(!row[0]) return // fila vacia
      let dni = row[0]?.toString().replace(/\D/g, '') || ''
      dni = dni.padStart(8, '0')

      const alumnoCompleto = row[1]?.toString().trim() || ''
      const [apellidosRaw, nombresRaw] = alumnoCompleto.split(',')
      const apellidos = apellidosRaw?.trim().toUpperCase() || ''
      const nombres = toTitleCase(nombresRaw?.trim() || '')

      // 2. MEJORA 3: BUSCAR POR NOMBRE EN VEZ DE ID
      const nombreCarreraExcel = row[2]?.toString().trim().toUpperCase() || ''
      const nombreFilialExcel = row[3]?.toString().trim().toUpperCase() || ''

      const carreraEncontrada = carreras.find(c => c.nombrecarrera.toUpperCase() === nombreCarreraExcel)
      const filialEncontrada = filiales.find(f => f.nombrefilial.toUpperCase() === nombreFilialExcel)

      const idcarrera = carreraEncontrada?.idcarrera || null
      const idfilial = filialEncontrada?.idfilial || null

      const persona = mapPersonas.get(dni)
      let motivo = ''
      let estado: 'ok' | 'error' = 'ok'

      if (!dni || dni.length!== 8) {
        motivo = 'DNI inválido'
        estado = 'error'
      } else if (!persona) {
        motivo = 'No existe como Persona con Rol Estudiante'
        estado = 'error'
      } else if (dnisYaEstudiantes.has(dni)) {
        motivo = 'Ya está registrado como Estudiante' // Este lo vamos a excluir del export
        estado = 'error'
      } else if (!idcarrera) {
        motivo = `Carrera "${nombreCarreraExcel}" no existe`
        estado = 'error'
      } else if (!idfilial) {
        motivo = `Filial "${nombreFilialExcel}" no existe`
        estado = 'error'
      }

      preview.push({
        fila: index + 1, // 1. MEJORA 1: NUMERACION DESDE 1
        dni, apellidos, nombres,
        idcarrera, idfilial,
        nombrecarrera: carreraEncontrada?.nombrecarrera || nombreCarreraExcel,
        nombrefilial: filialEncontrada?.nombrefilial || nombreFilialExcel,
        estadoRegistro: 'ACTIVO',
        motivo, estado
      })
    })

    setPreviewDataEst(preview)
    setShowPreviewModalEst(true)
    setLoading(false)
  }
  reader.readAsBinaryString(file)
  e.target.value = ''
}

const handleExportarRechazados = () => {
  // 2. MEJORA 2: EXCLUIR "Ya está registrado"
  const rechazados = previewDataEst.filter(p => p.estado === 'error' &&!p.motivo.includes('Ya está registrado'))

  if(rechazados.length === 0) {
    showToast('No hay registros rechazados para exportar', 'error')
    return
  }

  const dataToExport = rechazados.map(p => ({
    FILA: p.fila,
    DNI: p.dni,
    APELLIDOS: p.apellidos,
    NOMBRES: p.nombres,
    CARRERA: p.nombrecarrera,
    FILIAL: p.nombrefilial,
    OBSERVACION: p.motivo
  }))

  const ws = XLSX.utils.json_to_sheet(dataToExport)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Rechazados')
  XLSX.writeFile(wb, `Estudiantes_Rechazados_${new Date().toISOString().split('T')[0]}.xlsx`)
  showToast(`${rechazados.length} rechazados exportados`, 'success')
}

const toTitleCase = (str: string) =>
  str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase())
// ===== FIN: CODIGO IMPORTAR EXCEL MEJORADO =====

  const handleConfirmImportEst = async () => {
    const paraGrabar = previewDataEst
   .filter(p => p.estado === 'ok')
   .map(p => ({
        idpersona: personas.find(per => per.dni === p.dni)?.idpersona,
        idcarrera: p.idcarrera,
        idfilial: p.idfilial,
        estado: 'ACTIVO'
      })).filter(p => p.idpersona)

    if (paraGrabar.length === 0) {
      showToast('No hay registros válidos para importar', 'error')
      return
    }

    setLoading(true)
    const { error } = await supabase.from('estudiante').insert(paraGrabar)
    setLoading(false)

    if (error) {
      showToast('Error al importar: ' + error.message, 'error')
      console.error(error)
    } else {
      const rechazados = previewDataEst.filter(p => p.estado === 'error').length
      showToast(`Se importaron ${paraGrabar.length} estudiantes. ${rechazados} fueron rechazados`, 'success')
      fetchData()
    }
    setShowPreviewModalEst(false)
    setPreviewDataEst([])
  }

  // ===== FIN: CODIGO IMPORTAR EXCEL ACTUALIZADO =====

  const limpiarFiltros = () => { setSearch(""); setFiltroEstado(""); setFiltroCarrera(""); setFiltroFacultad(""); setFiltroFilial(""); setPaginaActual(1) }

  return (
    <div className="main-content">
      {toast && (
        <div style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 99999,
          background: toast.type === 'error'? '#EF4444' : '#22C55E', color: '#fff', padding: '1.2rem 2.4rem',
          borderRadius: '0.8rem', fontWeight: 600, fontSize: '1.4rem', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.2)',
          animation: 'fadeInOut 3s ease-in-out', whiteSpace: 'nowrap'
        }}>
          {toast.msg}
        </div>
      )}

      <div className="header-responsive">
        <div><h1><GraduationCap size={24} style={{marginRight: '0.8rem'}}/>Gestión de Estudiantes</h1><p>Total: {datosFiltrados.length} registros</p></div>
        <div style={{ display: 'flex', gap: '1.2rem' }}>
          <button className="btn-secundario" onClick={handleClickImportar} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
  <Upload size={18} /> Importar Excel
</button>
<input id="import-estudiante" type="file" accept=".xlsx,.xls" onChange={handleImportEstudiante} style={{ display: 'none' }} />
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
            <p className="paginacion-info">Mostrando {indiceInicio + 1} al {Math.min(indiceFin, datosFiltrados.length)} de {datosFiltrados.length} registros</p>
            <div className="paginacion-controles">
              <button className="btn-pag" onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1}><ChevronLeft size={16} /> Anterior</button>
              <span className="paginacion-pagina">Pág {paginaActual} de {totalPaginas}</span>
              <button className="btn-pag btn-pag-primario" onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas}>Siguiente <ChevronRight size={16} /></button>
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

      {/* ===== INICIO: MODAL VISTA PREVIA IMPORTAR EXCEL ===== */}
      {showPreviewModalEst && (
        <div className="modal-overlay" onClick={() => setShowPreviewModalEst(false)}>
          <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '95rem', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header" style={{padding: '2rem 2.4rem', borderBottom: '1px solid #e2e8f0', flexShrink: 0}}>
              <h2><Upload size={20} style={{marginRight: "0.8rem"}}/>Vista Previa Importación Estudiantes</h2>
              <button onClick={() => setShowPreviewModalEst(false)} className="btn-cerrar-modal"><X size={20} /></button>
            </div>

            <div className="modal-body" style={{overflowY: 'auto', flex: 1, padding: '1.6rem 2.4rem'}}>
              <p style={{fontSize: 'var(--text-sm)', marginBottom: '1.2rem', fontWeight: 500}}>
                Total: {previewDataEst.length} |
                <span style={{color: '#22C55E'}}> Se grabarán: {previewDataEst.filter(p=>p.estado==='ok').length}</span> |
                <span style={{color: '#EF4444'}}> Rechazados: {previewDataEst.filter(p=>p.estado==='error').length}</span>
              </p>

              <div style={{overflowX: 'auto'}}>
                <table className="tabla-sgpc">
                  <thead>
                    <tr>
                      <th>FILA</th><th>DNI</th><th>APELLIDOS</th><th>NOMBRES</th>
                      <th>CARRERA</th><th>FILIAL</th><th>ESTADO</th><th>OBSERVACIÓN</th>
                    </tr>
                  </thead>
                 <tbody>
  {previewDataEst.map((p, i) => {
    const esOk = p.estado === 'ok'
    return (
      <tr key={i}>
        <td>{p.fila}</td>
        <td>{p.dni}</td>
        <td>{p.apellidos}</td>
        <td>{p.nombres}</td>
        <td>{p.nombrecarrera}</td>
        <td>{p.nombrefilial}</td>
        
        {/* ESTADO: solo el icono en color */}
        <td style={{textAlign: 'center'}}>
          {esOk 
            ? <Check size={18} color="#22C55E" strokeWidth={3}/> 
            : <X size={18} color="#EF4444" strokeWidth={3}/>
          }
        </td>

        {/* OBSERVACION: solo el texto en color */}
        <td style={{fontWeight: 600, color: esOk ? '#22C55E' : '#EF4444'}}>
          {p.motivo || 'Correcto'}
        </td>
      </tr>
    )
  })}
</tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer" style={{padding: '1.6rem 2.4rem', borderTop: '1px solid #e2e8f0', flexShrink: 0, justifyContent: 'space-between'}}>
  <button className="btn-secundario-outline" onClick={handleExportarRechazados} style={{minWidth: '15rem'}}>
    <Download size={18} /> Exportar Rechazados
  </button>
  <div style={{display: 'flex', gap: '1rem'}}>
    <button className="btn-secundario" onClick={() => setShowPreviewModalEst(false)} style={{minWidth: '12rem'}}>Cancelar</button>
    <button
      className="btn-primario"
      onClick={handleConfirmImportEst}
      disabled={previewDataEst.filter(p=>p.estado==='ok').length === 0}
      style={{minWidth: '15rem'}}
    >
      <Check size={18} /> Grabar {previewDataEst.filter(p=>p.estado==='ok').length}
    </button>
  </div>
</div>
          </div>
        </div>
      )}
      {/* ===== FIN: MODAL VISTA PREVIA IMPORTAR EXCEL ===== */}

      <style jsx>{`
   .paginacion-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 1.6rem;
      padding: 1.6rem;
      background: var(--color-blanco);
      border-radius: 1.2rem;
      gap: 1.6rem;
    }
   .paginacion-info {
      font-size: var(--text-sm);
      color: var(--color-texto-sec);
    }
   .paginacion-controles {
      display: flex;
      gap: 0.8rem;
      align-items: center;
    }
   .btn-pag {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.8rem 1.2rem;
      border-radius: 0.8rem;
      font-size: var(--text-sm);
      font-weight: 600;
      border: 1px solid var(--color-borde);
      background: var(--color-blanco);
      color: var(--color-primario);
      cursor: pointer;
      transition: all 0.2s ease;
    }
   .btn-pag:hover:not(:disabled) { 
      background: #eff6ff; /* celeste clarito como en personas */
      border-color: var(--color-primario);
    }
   .btn-pag:disabled { opacity: 0.5; cursor: not-allowed; }
   
   .btn-pag-primario {
      background: var(--color-primario);
      color: var(--color-blanco);
      border: 1px solid var(--color-primario);
    }
   .btn-pag-primario:hover:not(:disabled) { 
      background: #1e40af; /* azul más oscuro */
      border-color: #1e40af;
    }
   .paginacion-pagina {
      padding: 0.8rem 1.2rem;
      font-weight: 600;
      font-size: var(--text-sm);
      white-space: nowrap;
      color: var(--color-texto);
    }
    @media (max-width: 768px) {
     .paginacion-footer { flex-direction: column; padding: 1.2rem; }
     .paginacion-controles { width: 100%; justify-content: space-between; }
     .btn-pag { padding: 0.6rem 1rem; font-size: 1.2rem; flex: 1; justify-content: center; }
     .paginacion-pagina { padding: 0.6rem 0.8rem; font-size: 1.2rem; }
     .paginacion-info { text-align: center; width: 100%; }
    }
  `}</style>
    </div>
  )
}