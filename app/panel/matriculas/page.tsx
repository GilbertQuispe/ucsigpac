'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/client'
import { Edit, X, Search, Upload, GraduationCap, ChevronLeft, ChevronRight, Eraser, Check, Save, Download, Users, Calendar, UserX } from 'lucide-react'
import Select from 'react-select'
import * as XLSX from 'xlsx'

type Persona = { idpersona: number; dni: string; apellidos: string; nombres: string }
type Estudiante = { idestudiante: number; idpersona: number; persona?: Persona }
type Periodo = { idpa: number; codigo: string; nombre: string; fecha_inicio: string; fecha_fin: string; estado: string }
type Matricula = {
  idmatricula: number; idestudiante: number; idpa: number; fecha_matricula: string; estado: string;
  estudiante?: Estudiante; periodoacademico?: Periodo;
}

const SelectSGPCFieldset = ({label, value, onChange, options}:any) => {
  const selectedOption = options.find((o:any) => o.value === value) || null
  return (
    <fieldset className="fieldset-sgpc">
      <legend>{label}</legend>
      <Select options={options} value={selectedOption} onChange={(opt:any) => onChange(opt?.value || null)} placeholder="Seleccione..." isSearchable maxMenuHeight={200} classNamePrefix="react-select" styles={{ control: (base, state) => ({...base, height: '4.4rem', minHeight: '4.4rem', borderRadius: '0.6rem', border: '1px solid #cbd5e1', background: '#fff', boxShadow: state.isFocused? '0 0 0 1px var(--color-primario)' : 'none', marginTop: '0.4rem', cursor: 'pointer' }), valueContainer: (base) => ({...base, padding: '0 1.2rem', height: '4.4rem' }), input: (base) => ({...base, margin: 0, padding: 0 }), indicatorsContainer: (base) => ({...base, height: '4.4rem' }), option: (base, state) => ({...base, backgroundColor: state.isSelected? 'var(--color-primario)' : state.isFocused? 'var(--color-acento)' : '#fff', color: state.isSelected? '#fff' : 'var(--color-texto)', padding: '1rem 1.2rem' }), menu: (base) => ({...base, zIndex: 9999, marginTop: '0.4rem' }) }} />
    </fieldset>
  )
}

export default function MatriculasPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<'disponibles' | 'matriculados'>('disponibles')
  const [matriculas, setMatriculas] = useState<Matricula[]>([])
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([])
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroPeriodoTabla, setFiltroPeriodoTabla] = useState<number | ''>('')
  const [filtroEstado, setFiltroEstado] = useState('')

  const [paginaActual, setPaginaActual] = useState(1)
  const registrosPorPagina = 10
  const [seleccionados, setSeleccionados] = useState<number[]>([])
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null)
  const [showModalMasivo, setShowModalMasivo] = useState(false)
  const [periodoParaMatricular, setPeriodoParaMatricular] = useState<number | null>(null)
  const [showModalEdit, setShowModalEdit] = useState(false)
  const [matriculaEdit, setMatriculaEdit] = useState<Matricula | null>(null)
  const [formEdit, setFormEdit] = useState({idpa: null as number | null, estado: 'MATRICULADO'})

  // ===== NUEVOS STATES PARA IMPORT =====
  const [previewErroresMat, setPreviewErroresMat] = useState<any[]>([])
  const [showPreviewModalMat, setShowPreviewModalMat] = useState(false)
  // =====================================

  const showToast = (msg: string, type: 'error' | 'success' = 'error') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }
  const toUpperCase = (str: string) => str?.toUpperCase() || ''
const toTitleCase = (str: string) =>
  str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase())

  const handleClickImportar = () => {
    showToast('Formato requerido: DNI | Apellidos y Nombres | Periodo', 'success')
    setTimeout(() => { document.getElementById('import-matricula')?.click() }, 1000)
  }

  useEffect(() => { fetchData() }, [])
  useEffect(() => { fetchMatriculas() }, [filtroPeriodoTabla, search, filtroEstado, tab])

  const fetchData = async () => {
    setLoading(true)
    const [{data: per}, {data: est}] = await Promise.all([
      supabase.from('periodoacademico').select('*').order('fecha_inicio', { ascending: false }),
      supabase.from('estudiante').select('*, persona!inner(*)').order('idestudiante')
    ])
    setPeriodos(per || [])
    setEstudiantes(est as Estudiante[] || [])
    setLoading(false)
  }

  const fetchMatriculas = async () => {
    setLoading(true)

    let query = supabase.from('matricula')
   .select(`
      idmatricula,
      idestudiante,
      idpa,
      fecha_matricula,
      estado,
      estudiante:matricula_idestudiante_fkey(*, persona:estudiante_idpersona_fkey(*)),
      periodoacademico:matricula_idpa_fkey(*)
    `)
   .order('idmatricula', { ascending: false })

    if(filtroPeriodoTabla!== '') query = query.eq('idpa', filtroPeriodoTabla)
    if(search) query = query.or(`estudiante.persona.dni.ilike.%${search}%,estudiante.persona.apellidos.ilike.%${search}%,estudiante.persona.nombres.ilike.%${search}%`)
    if(filtroEstado) query = query.eq('estado', filtroEstado)

    const {data, error} = await query

    setMatriculas(data as Matricula[] || [])
    setLoading(false)
    setSeleccionados([])
  }

  const estudiantesDisponibles = useMemo(() => {
    return estudiantes.filter(e =>
      e.persona?.dni.toLowerCase().includes(search.toLowerCase()) ||
      e.persona?.apellidos.toLowerCase().includes(search.toLowerCase()) ||
      e.persona?.nombres.toLowerCase().includes(search.toLowerCase())
    )
  }, [estudiantes, search])

  const datosFiltrados = tab === 'disponibles'? estudiantesDisponibles : matriculas
  const totalPaginas = Math.ceil(datosFiltrados.length / registrosPorPagina)
  const indiceInicio = (paginaActual - 1) * registrosPorPagina
  const indiceFin = indiceInicio + registrosPorPagina
  const datosPaginados = datosFiltrados.slice(indiceInicio, indiceFin)

  const toggleCheck = (id: number) => { setSeleccionados(prev => prev.includes(id)? prev.filter(i => i!== id) : [...prev, id]) }

  const handleAbrirModalMasivo = () => {
    if(seleccionados.length === 0) { showToast('Seleccione por lo menos un estudiante', 'error'); return }
    setPeriodoParaMatricular(null)
    setShowModalMasivo(true)
  }

  const handleGuardarMasivo = async () => {
    if(!periodoParaMatricular) { showToast('Seleccione un Periodo Académico', 'error'); return }

    const { data: yaMatriculados } = await supabase
     .from('matricula')
     .select('idestudiante')
     .eq('idpa', periodoParaMatricular)

    const idsYaMatriculados = new Set(yaMatriculados?.map(m => m.idestudiante) || [])

    const paraInsertar = seleccionados
     .filter(idest =>!idsYaMatriculados.has(idest))
     .map(idest => ({
        idestudiante: idest,
        idpa: periodoParaMatricular,
        fecha_matricula: new Date().toISOString().split('T')[0],
        estado: 'MATRICULADO'
      }))

    const duplicados = seleccionados.length - paraInsertar.length

    if(paraInsertar.length === 0) {
      showToast(`Los ${seleccionados.length} ya están matriculados en ese periodo`, 'error')
      return
    }

    const {error} = await supabase.from('matricula').insert(paraInsertar)

    if(error) showToast(error.message, 'error')
    else {
      let msg = `Se matriculó ${paraInsertar.length} estudiantes`
      if(duplicados > 0) msg += `. ${duplicados} ya estaban matriculados y se omitieron`
      showToast(msg, 'success')
      setShowModalMasivo(false);
      setSeleccionados([]);
      fetchMatriculas()
    }
  }

  // ===== FUNCION IMPORTAR ACTUALIZADA =====
  
const handleImportMatricula = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if(!file) return
    setLoading(true)

    const toTitleCase = (str: string) =>
      str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase())

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const filas: any[] = XLSX.utils.sheet_to_json(worksheet)

      const [{data: estudiantesFull}, {data: periodosDB}, {data: matriculasDB}] = await Promise.all([
        supabase.from('estudiante').select('idestudiante, idpersona, persona!inner(dni, apellidos, nombres)'),
        supabase.from('periodoacademico').select('idpa, codigo'),
        supabase.from('matricula').select('idestudiante, idpa')
      ])

      const mapaDni = new Map(estudiantesFull?.map(e => [e.persona.dni, e.idestudiante]))
      const mapaPeriodo = new Map(periodosDB?.map(p => [p.codigo.toUpperCase().trim(), p.idpa]))
      const matriculadosKey = new Set(matriculasDB?.map(m => `${m.idestudiante}-${m.idpa}`))

      const paraInsertar: any[] = []
      const errores: any[] = []

      filas.forEach((row, i) => {
        const dni = String(row.dni || '').trim().padStart(8, '0')
        const codigoPeriodo = String(row.periodo || '').toUpperCase().trim()
        const filaNum = i + 2

        // DESGLOSAR "APELLIDOS, Nombres"
        const alumnoCompleto = String(row['apellidos y nombres'] || '').trim()
        const [apellidosRaw, nombresRaw] = alumnoCompleto.split(',')
        const apellidos = apellidosRaw?.trim().toUpperCase() || ''
        const nombres = toTitleCase(nombresRaw?.trim() || '') // <-- YA FUNCIONA

        const idest = mapaDni.get(dni)
        const idpa = mapaPeriodo.get(codigoPeriodo)

        if(!idest) {
          errores.push({fila: filaNum, dni, apellidos, nombres, motivo: `DNI no existe como Estudiante`})
          return
        }
        if(!idpa) {
          errores.push({fila: filaNum, dni, apellidos, nombres, motivo: `Periodo "${codigoPeriodo}" no existe`})
          return
        }
        if(matriculadosKey.has(`${idest}-${idpa}`)) {
          errores.push({fila: filaNum, dni, apellidos, nombres, motivo: `Ya está matriculado en ${codigoPeriodo}`})
          return
        }

        paraInsertar.push({ idestudiante: idest, idpa: idpa, fecha_matricula: new Date().toISOString().split('T')[0], estado: 'MATRICULADO' })
      })

      if(errores.length > 0){
        setPreviewErroresMat(errores)
        setShowPreviewModalMat(true)
        showToast(`${errores.length} filas con error. Revisa el reporte`, 'warning')
      }

      if(paraInsertar.length > 0){
        const {error} = await supabase.from('matricula').insert(paraInsertar)
        if(error) showToast(error.message, 'error')
        else {
          showToast(`Se matricularon ${paraInsertar.length} estudiantes`, 'success')
          fetchMatriculas()
        }
      }

    } catch (e: any) {
      showToast('Error: ' + e.message, 'error')
    }

    setLoading(false)
    e.target.value = ''
  }
  // ===== EXPORTAR RECHAZADOS =====
  const handleExportarRechazadosMat = () => {
    if(previewErroresMat.length === 0) {
      showToast('No hay registros rechazados', 'error')
      return
    }
    const dataToExport = previewErroresMat.map(p => ({
      FILA: p.fila,
      DNI: p.dni,
      OBSERVACION: p.motivo
    }))
    const ws = XLSX.utils.json_to_sheet(dataToExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Rechazados')
    XLSX.writeFile(wb, `Matriculas_Rechazadas_${new Date().toISOString().split('T')[0]}.xlsx`)
    showToast(`${previewErroresMat.length} rechazados exportados`, 'success')
  }

  const openEditModal = (d: Matricula) => { setMatriculaEdit(d); setFormEdit({idpa: d.idpa, estado: d.estado}); setShowModalEdit(true) }
  const handleGuardarEdit = async () => {
    if(!matriculaEdit) return
    const {error} = await supabase.from('matricula').update(formEdit).eq('idmatricula', matriculaEdit.idmatricula)
    if(error) showToast(error.message, 'error')
    else { showToast('Matrícula actualizada', 'success'); setShowModalEdit(false); fetchMatriculas() }
  }
  const handleDesmatricular = async (idmatricula: number) => {
    if(!confirm('¿Seguro de desmatricular a este estudiante?')) return
    const {error} = await supabase.from('matricula').delete().eq('idmatricula', idmatricula)
    if(error) showToast(error.message, 'error')
    else { showToast('Estudiante desmatriculado', 'success'); fetchMatriculas() }
  }

  const limpiarFiltros = () => { setSearch(""); setFiltroEstado(""); setFiltroPeriodoTabla(""); setPaginaActual(1) }

  return (
    <div className="main-content">
      {toast && <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 99999, background: toast.type === 'error'? '#EF4444' : '#22C55E', color: '#fff', padding: '1.2rem 2.4rem', borderRadius: '0.8rem', fontWeight: 600, fontSize: '1.4rem' }}>{toast.msg}</div>}

      <div className="header-responsive">
        <div><h1><Calendar size={24} style={{marginRight: '0.8rem'}}/>Gestión de Matrículas</h1><p>Total: {datosFiltrados.length} registros</p></div>
        <div style={{ display: 'flex', gap: '1.2rem' }}>
          {tab === 'disponibles' && <button className="btn-primario" onClick={handleAbrirModalMasivo}><Check size={18} /> Matricular {seleccionados.length} Seleccionados</button>}
          {tab === 'matriculados' && <button className="btn-secundario" onClick={handleClickImportar}><Upload size={18} /> Importar Excel</button>}
          <input id="import-matricula" type="file" accept=".xlsx,.xls" onChange={handleImportMatricula} style={{ display: 'none' }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', margin: '2rem 0' }}>
        <button onClick={() => {setTab('disponibles'); setPaginaActual(1)}} className={tab==='disponibles'? 'btn-primario' : 'btn-secundario'} style={{display: 'flex', alignItems: 'center', gap: '0.8rem'}}><Users size={16}/> Estudiantes Disponibles</button>
        <button onClick={() => {setTab('matriculados'); setPaginaActual(1)}} className={tab==='matriculados'? 'btn-primario' : 'btn-secundario'} style={{display: 'flex', alignItems: 'center', gap: '0.8rem'}}><GraduationCap size={16}/> Matriculados</button>
      </div>

      <div className="card-sgpc" style={{ marginBottom: '2.4rem', padding: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(20rem, 1fr))', gap: '1.2rem', marginBottom: '1.6rem' }}>
          {tab === 'matriculados' && <SelectSGPCFieldset label="Filtrar por Periodo" value={filtroPeriodoTabla} onChange={(val:any) => {setFiltroPeriodoTabla(val); setPaginaActual(1)}} options={[{value: '', label: 'TODOS'},...periodos.map(p=>({value:p.idpa, label:`${p.codigo}`}))]} />}
          {tab === 'matriculados' && <SelectSGPCFieldset label="Estado" value={filtroEstado} onChange={(val:any) => {setFiltroEstado(val); setPaginaActual(1)}} options={[{value: "", label: "Todos"}, {value: "MATRICULADO", label: "MATRICULADO"}, {value: "RETIRADO", label: "RETIRADO"}, {value: "ANULADO", label: "ANULADO"}]} />}
        </div>
        <div style={{display: 'flex', gap: '1rem', alignItems: 'flex-end'}}>
          <div style={{ position: 'relative', flex: 1 }}><Search size={18} style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} /><input className="input-sgpc" placeholder="Buscar por DNI, Nombres, Apellidos..." value={search} onChange={e => {setSearch(e.target.value); setPaginaActual(1)}} style={{ paddingLeft: '4rem', height: "4.4rem", width: '100%' }} /></div>
          <button className="btn-secundario btn-limpiar" onClick={limpiarFiltros} style={{height: '4.4rem'}}><Eraser size={16} />Limpiar</button>
        </div>
      </div>

      <div className="card-sgpc" style={{ overflowX: 'auto' }}>
        <table className='tabla-sgpc'>
          <thead>
            <tr>
              {tab === 'disponibles' && <th style={{width: '5rem'}}>SEL</th>}
              <th>#</th>
              <th>DNI</th>
              <th className="col-nombre">APELLIDOS Y NOMBRES</th>
              {tab === 'matriculados' && <><th>PERIODO</th><th>FECHA MAT.</th><th>ESTADO</th><th>ACCIONES</th></>}
            </tr>
          </thead>
          <tbody>
            {datosPaginados.map((d:any, i) => {
              const persona = tab === 'disponibles'? d.persona : d.estudiante?.persona
              const idCheck = tab === 'disponibles'? d.idestudiante : d.idestudiante
              return (
                <tr key={tab === 'disponibles'? d.idestudiante : d.idmatricula}>
                  {tab === 'disponibles' && ( // <-- SOLO MUESTRA EL CHECK SI ES DISPONIBLES
                    <td>
                      <input 
                        type="checkbox" 
                        checked={seleccionados.includes(idCheck)} 
                        onChange={() => toggleCheck(idCheck)} 
                      />
                    </td>
                  )}
                  <td>{indiceInicio + i + 1}</td>
                  <td>{persona?.dni}</td>
                  <td className="col-nombre">{toUpperCase(persona?.apellidos)}, {(persona?.nombres)}</td>
                  {tab === 'matriculados' && (
                    <>
                      <td>{d.periodoacademico?.codigo} - {d.periodoacademico?.nombre}</td>
                      <td>{d.fecha_matricula}</td>
                      <td><span style={{padding: '0.4rem 0.8rem', borderRadius: '999px', fontSize: '1.2rem', fontWeight: 600, background: d.estado === 'MATRICULADO'? '#F0FDF4' : '#FEF2F2', color: d.estado === 'MATRICULADO'? '#22C55E' : '#EF4444'}}>{d.estado}</span></td>
                      <td style={{display: 'flex', gap: '0.8rem'}}>
                        <button onClick={() => openEditModal(d)} className="btn-icon btn-icon-editar" title="Actualizar"><Edit size={15} /></button>
                        <button onClick={() => handleDesmatricular(d.idmatricula)} className="btn-icon btn-icon-eliminar" title="Desmatricular"><UserX size={15} color="#fff" /></button>
                      </td>
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
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

      {/* MODALES */}
      {showModalMasivo && (
        <div className="modal-overlay"><div className="modal-content"><div className="modal-header">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
            <h3 style={{display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '1.8rem', color: '#1E3A8A'}}>
              <GraduationCap size={22} /> Matricular {seleccionados.length} Estudiantes
            </h3>
            <button onClick={() => setShowModalMasivo(false)} className="btn-cerrar-modal"><X size={18} /></button>
          </div>
        </div><div className="modal-body">
          <SelectSGPCFieldset label="Seleccione Periodo Académico *" value={periodoParaMatricular} onChange={setPeriodoParaMatricular} options={periodos.map(p=>({value:p.idpa, label:`${p.codigo} - ${p.nombre}`}))} />
        </div><div className="modal-footer">
          <button className="btn-secundario" onClick={() => setShowModalMasivo(false)}>Cancelar</button>
          <button className="btn-primario" onClick={handleGuardarMasivo}><Save size={16} />Confirmar Matrícula</button>
        </div></div></div>
      )}

      {showModalEdit && (
        <div className="modal-overlay" onClick={() => setShowModalEdit(false)}>
          <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{maxWidth: '70rem'}}>
            <div className="modal-header" style={{borderBottom: '2px solid var(--color-primario)', paddingBottom: '1.2rem'}}>
              <div><div style={{display: 'flex', alignItems: 'center', gap: '0.8rem'}}><Users size={18} color="var(--color-primario)" /><h2>Actualizar Matrícula</h2></div>{matriculaEdit && (<p style={{fontSize: 'var(--text-sm)', color: 'var(--color-texto-secundario)', marginTop: '0.4rem', fontWeight: 400}}>{matriculaEdit.estudiante?.persona?.apellidos}, {matriculaEdit.estudiante?.persona?.nombres} - DNI: {matriculaEdit.estudiante?.persona?.dni}</p>)}</div>
              <button onClick={() => setShowModalEdit(false)} className="btn-cerrar-modal"><X size={18} /></button>
            </div>
            <div className="modal-body">
              <SelectSGPCFieldset label="Periodo Académico *" value={formEdit.idpa} onChange={(val:any) => setFormEdit({...formEdit, idpa: val})} options={periodos.map(p=>({value:p.idpa, label:`${p.codigo} - ${p.nombre}`}))} />
              <SelectSGPCFieldset label="Estado *" value={formEdit.estado} onChange={(val:any) => setFormEdit({...formEdit, estado: val})} options={[{value: "MATRICULADO", label: "MATRICULADO"}, {value: "RETIRADO", label: "RETIRADO"}, {value: "ANULADO", label: "ANULADO"}]} />
            </div>
            <div className="modal-footer" style={{borderTop: '2px solid var(--color-primario)'}}>
              <button className="btn-secundario-outline" onClick={() => setFormEdit({idpa: null, estado: 'MATRICULADO'})}><Eraser size={18} /> Limpiar</button>
              <button className="btn-primario" onClick={handleGuardarEdit}><Check size={18} /> Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL REPORTE IMPORTAR ===== */}
      {showPreviewModalMat && (
  <div className="modal-overlay" onClick={() => setShowPreviewModalMat(false)}>
    <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90rem', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
      <div className="modal-header">
        <h2><Upload size={20} style={{marginRight: "0.8rem"}}/>Reporte de Importación Matrículas</h2>
        <button onClick={() => setShowPreviewModalMat(false)} className="btn-cerrar-modal"><X size={20} /></button>
      </div>
      <div className="modal-body" style={{overflowY: 'auto', flex: 1}}>
        <p style={{fontSize: 'var(--text-sm)', marginBottom: '1.2rem', fontWeight: 500, color: '#EF4444'}}>
          Se omitieron {previewErroresMat.length} registros
        </p>
        <div style={{overflowX: 'auto'}}>
          <table className="tabla-sgpc">
            <thead>
              <tr>
                <th>FILA</th>
                <th>DNI</th>
                <th>APELLIDOS</th>
                <th>NOMBRES</th>
                <th>OBSERVACIÓN</th>
              </tr>
            </thead>
            <tbody>
              {previewErroresMat.map((p, i) => (
                <tr key={i}>
                  <td>{p.fila}</td>
                  <td>{p.dni}</td>
                  <td>{p.apellidos}</td>
                  <td>{p.nombres}</td>
                  <td style={{color: '#EF4444', fontWeight: 600}}>{p.motivo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="modal-footer" style={{justifyContent: 'space-between'}}>
        <button className="btn-secundario-outline" onClick={handleExportarRechazadosMat}>
          <Download size={18} /> Exportar Rechazados
        </button>
        <button className="btn-secundario" onClick={() => setShowPreviewModalMat(false)}>Cerrar</button>
      </div>
    </div>
  </div>
)}

      <style jsx>{`
     .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999; }
     .modal-content { background: var(--color-blanco); border-radius: 1.2rem; width: 90%; max-width: 50rem; padding: 2.4rem; }
     .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
     .modal-header h3 { font-size: var(--text-lg); font-weight: 700; }
     .modal-body { margin-bottom: 2rem; }
     .modal-footer { display: flex; justify-content: flex-end; gap: 1.2rem; }
     .paginacion-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 1.6rem; padding: 1.6rem; background: var(--color-blanco); border-radius: 1.2rem; gap: 1.6rem; }
     .paginacion-info { font-size: var(--text-sm); color: var(--color-texto-sec); }
     .paginacion-controles { display: flex; gap: 0.8rem; align-items: center; }
     .btn-pag { display: flex; align-items: center; gap: 0.4rem; padding: 0.8rem 1.2rem; border-radius: 0.8rem; font-size: var(--text-sm); font-weight: 600; border: 1px solid var(--color-borde); background: var(--color-blanco); color: var(--color-primario); cursor: pointer; }
     .btn-pag:hover:not(:disabled) { background: #eff6ff; border-color: var(--color-primario); }
     .btn-pag:disabled { opacity: 0.5; cursor: not-allowed; }
     .btn-pag-primario { background: var(--color-primario); color: var(--color-blanco); border: 1px solid var(--color-primario); }
     .paginacion-pagina { padding: 0.8rem 1.2rem; font-weight: 600; font-size: var(--text-sm); }
      `}</style>
    </div>
  )
}