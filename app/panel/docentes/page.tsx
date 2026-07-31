'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/client'
import { Plus, Edit, X, Search, Upload, GraduationCap, ChevronLeft, ChevronRight, Eraser, Users, Check } from 'lucide-react'
import Select from 'react-select'

type Persona = { idpersona: number; dni: string; apellidos: string; nombres: string; telefono: string | null; sexo: 'M' | 'F' | null }
type Docente = { iddocente: number; idpersona: number; condicion: string | null; tipodocente: string | null; idprofesion: number | null; idespecialidad: number | null; persona?: Persona; profesion?: { profesion: string }; especialidad?: { especialidad: string } }
type Profesion = { idprofesion: number; profesion: string }
type Especialidad = { idespecialidad: number; especialidad: string }

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
            minHeight: '4.2rem', 
            borderRadius: '0.6rem', 
            border: 'none',
            background: 'transparent',
            boxShadow: 'none',
            marginTop: '0.4rem'
          }),
          option: (base, state) => ({
            ...base,
            backgroundColor: state.isSelected 
              ? 'var(--color-primario)' 
              : state.isFocused 
                ? 'var(--color-acento)' 
                : '#fff',
            color: state.isSelected ? '#fff' : 'var(--color-texto)',
            padding: '1rem 1.2rem'
          }),
          menu: (base) => ({...base, zIndex: 9999, marginTop: '0.4rem' })
        }}
      />
    </fieldset>
  )
}

export default function DocentesPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<'personas' | 'docentes'>('personas')
  const [personas, setPersonas] = useState<Persona[]>([])
  const [docentes, setDocentes] = useState<Docente[]>([])
  const [profesiones, setProfesiones] = useState<Profesion[]>([])
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([])
  const [idRolDocente, setIdRolDocente] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [paginaActual, setPaginaActual] = useState(1)
  const registrosPorPagina = 10
  const [seleccionados, setSeleccionados] = useState<number[]>([])
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null)

  const [showModal, setShowModal] = useState(false)
  const [docenteEdit, setDocenteEdit] = useState<Docente | null>(null)
  const [form, setForm] = useState({ idprofesion: null, idespecialidad: null, condicion: 'CONTRATADO', tipodocente: 'P' })

  const showToast = (msg: string, type: 'error' | 'success' = 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const [previewDataDoc, setPreviewDataDoc] = useState<any[]>([])
  const [showPreviewModalDoc, setShowPreviewModalDoc] = useState(false)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: rolData } = await supabase.from('rol').select('idrol').ilike('nombrerol', '%docente%').single()
    setIdRolDocente(rolData?.idrol || null)
    const [{data: prof}, {data: esp}] = await Promise.all([
      supabase.from('profesion').select('*').order('profesion'),
      supabase.from('especialidad').select('*').order('especialidad')
    ])
    setProfesiones(prof || []); setEspecialidades(esp || [])

    const {data: personasData} = await supabase.from('persona').select('*').eq('estado', 'ACTIVO').eq('idrol', rolData?.idrol)
    const {data: docentesData} = await supabase.from('docente').select('idpersona')
    const idsDocentes = docentesData?.map(d => d.idpersona) || []
    setPersonas((personasData || []).filter(p => !idsDocentes.includes(p.idpersona)))

    const {data: docentesFull} = await supabase.from('docente').select(`*, persona!inner(*), profesion(*), especialidad(*)`).order('idpersona')
    setDocentes(docentesFull as Docente[] || [])
    setLoading(false)
    setSeleccionados([])
  }

  const datosFiltrados = useMemo(() => {
    const data = tab === 'personas' ? personas : docentes
    return data.filter((d:any) => 
      d.dni?.toLowerCase().includes(search.toLowerCase()) ||
      d.persona?.dni.toLowerCase().includes(search.toLowerCase()) ||
      d.apellidos?.toLowerCase().includes(search.toLowerCase()) ||
      d.persona?.apellidos.toLowerCase().includes(search.toLowerCase())
    )
  }, [personas, docentes, search, tab])

  const totalPaginas = Math.ceil(datosFiltrados.length / registrosPorPagina)
  const indiceInicio = (paginaActual - 1) * registrosPorPagina
  const datosPaginados = datosFiltrados.slice(indiceInicio, indiceInicio + registrosPorPagina)

  const toggleCheck = (id: number) => {
    setSeleccionados(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const handleConvertirMasivo = async () => {
    if(seleccionados.length === 0) {
      showToast('Seleccione un registro', 'error')
      return
    }
    const paraInsertar = seleccionados.map(id => ({ idpersona: id, condicion: 'CONTRATADO', tipodocente: 'P' }))
    const {error} = await supabase.from('docente').insert(paraInsertar)
    if(error) showToast(error.message, 'error')
    else { 
      showToast(`${seleccionados.length} docentes registrados`, 'success')
      fetchData() 
    }
  }

  const openEditModal = (d: Docente) => {
    setDocenteEdit(d)
    setForm({ idprofesion: d.idprofesion, idespecialidad: d.idespecialidad, condicion: d.condicion || 'CONTRATADO', tipodocente: d.tipodocente || 'P' })
    setShowModal(true)
  }

  const handleGuardarEdit = async () => {
    if(!docenteEdit) return
    const {error} = await supabase.from('docente').update(form).eq('iddocente', docenteEdit.iddocente)
    if(error) showToast(error.message, 'error')
    else { 
      showToast('Docente actualizado', 'success')
      setShowModal(false); fetchData() 
    }
  }

  const handleImportDocente = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    try {
      const XLSX = await import('xlsx') // IMPORT DINAMICO
      const data = await file.arrayBuffer()
      const wb = XLSX.read(data, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const jsonData: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      
      const filas = jsonData.slice(1).filter(row => row[0]?.toString().trim()!== '')
      if(filas.length === 0){ showToast('El Excel no tiene datos válidos', 'error'); return }

      const {data: todasPersonas} = await supabase.from('persona').select('idpersona, dni, apellidos, nombres').eq('estado', 'ACTIVO')
      const mapaPersonas = new Map(todasPersonas?.map(p => [p.dni, p]))
      const {data: docentesExistentes} = await supabase.from('docente').select('idpersona')
      const idsDocentes = new Set(docentesExistentes?.map(d => d.idpersona))

      const preview = filas.map((row, index) => {
        let dni = row[0]?.toString().replace(/\D/g, '').padStart(8, '0') || ''
        const apellidosExcel = row[1]?.toString().trim().toUpperCase() || ''
        const nombresExcel = row[2]?.toString().trim() // <- AHORA. Respeta como viene del Excel
   .split(' ')
   .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
   .join(' ') || ''
        const personaEncontrada = mapaPersonas.get(dni)
        let estado = 'ok', motivo = 'Correcto'
        if (!dni || dni.length!== 8) { estado = 'error'; motivo = 'DNI inválido' }
        else if (!personaEncontrada) { estado = 'error'; motivo = 'DNI no existe en Personas' }
        else if (idsDocentes.has(personaEncontrada.idpersona)) { estado = 'error'; motivo = 'Ya es Docente' }
        return { fila: index + 1, dni, apellidos: apellidosExcel || personaEncontrada?.apellidos || '', nombres: nombresExcel || personaEncontrada?.nombres || '', idpersona: personaEncontrada?.idpersona || null, estado, motivo }
      })

      setPreviewDataDoc(preview)
      setShowPreviewModalDoc(true)

    } catch (err: any) {
      console.error("ERROR COMPLETO:", err)
      showToast('ERROR: ' + err.message, 'error')
    } finally {
      setLoading(false)
      e.target.value = ''
    }
  }

  const handleConfirmImportDoc = async () => {
    const validos = previewDataDoc.filter(p => p.estado === 'ok')
    if(validos.length === 0) {
      showToast('No hay registros válidos para importar', 'error')
      return
    }

    const paraInsertar = validos.map(v => ({
      idpersona: v.idpersona,
      condicion: 'CONTRATADO',
      tipodocente: 'P'
    }))

    const {error} = await supabase.from('docente').insert(paraInsertar)
    if(error) showToast(error.message, 'error')
    else {
      showToast(`${paraInsertar.length} docentes importados correctamente`, 'success')
      setShowPreviewModalDoc(false)
      fetchData()
    }
  }

  return (
    <div className="main-content">

      <div className="header-responsive">
        <div>
          <h1><GraduationCap size={24} style={{marginRight: '0.8rem'}}/>Gestión de Docentes</h1>
          <p>Total: {datosFiltrados.length} registros</p>
        </div>
        <div style={{ display: 'flex', gap: '1.2rem' }}>
          <label htmlFor="import-docente" className="btn-secundario" style={{ cursor: 'pointer' }}>
            <Upload size={18} /> Importar Excel
          </label>
          <input
            id="import-docente"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImportDocente}
            style={{ display: 'none' }}
          />
          
          <button className="btn-primario" onClick={handleConvertirMasivo}>
            <Check size={18} /> Convertir {seleccionados.length} Seleccionados
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', margin: '2rem 0' }}>
        <button onClick={() => {setTab('personas'); setPaginaActual(1)}} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '4.4rem', gap: '0.8rem', padding: '0 2rem', borderRadius: '0.8rem', border: tab==='personas' ? '1px solid var(--color-primario)' : '1px solid #cbd5e1', background: tab==='personas' ? 'var(--color-primario)' : '#fff', color: tab==='personas' ? '#fff' : 'var(--color-texto-secundario)', fontWeight: 600, fontSize: '1.4rem', cursor: 'pointer', transition: 'all 0.2s' }}>
          <Users size={16}/> Personas con Rol Docente
        </button>
        <button onClick={() => {setTab('docentes'); setPaginaActual(1)}} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '4.4rem', gap: '0.8rem', padding: '0 2rem', borderRadius: '0.8rem', border: tab==='docentes' ? '1px solid var(--color-primario)' : '1px solid #cbd5e1', background: tab==='docentes' ? 'var(--color-primario)' : '#fff', color: tab==='docentes' ? '#fff' : 'var(--color-texto-secundario)', fontWeight: 600, fontSize: '1.4rem', cursor: 'pointer', transition: 'all 0.2s' }}>
          <GraduationCap size={16}/> Docentes Registrados
        </button>
      </div>

      <div className="card-sgpc" style={{ marginBottom: '2.4rem', padding: '2rem' }}>
        <div style={{display: 'flex', gap: '1rem', alignItems: 'flex-end'}}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
            <input className="input-sgpc" placeholder="Buscar por DNI, Nombres, Apellidos..." value={search} onChange={e => {setSearch(e.target.value); setPaginaActual(1)}} style={{ paddingLeft: '4rem', height: "4.4rem", width: '100%' }} />
          </div>
          <button className="btn-secundario btn-limpiar" onClick={() => setSearch("")} style={{height: '4.4rem'}}><Eraser size={16} />Limpiar</button>
        </div>
      </div>

      <div className="card-sgpc" style={{ overflowX: 'auto', position: 'relative', minHeight: '20rem' }}>
        {toast && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10, background: toast.type === 'error' ? '#EF4444' : '#22C55E', color: '#fff', padding: '0.9rem 2rem', borderRadius: '0.8rem', fontWeight: 600, fontSize: '1.4rem', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', animation: 'fadeInOut 3s ease-in-out', whiteSpace: 'nowrap' }}>
            {toast.msg}
          </div>
        )}

        {loading? <p style={{padding: '2rem', textAlign: 'center'}}>Cargando...</p> : (
          <table className='tabla-sgpc'>
            <thead><tr>
              {tab==='personas' && <th style={{width: '5rem'}}>SEL</th>}
              <th>#</th><th>DNI</th><th>NOMBRES</th>
              {tab==='docentes' && <><th>PROFESIÓN</th><th>ESPECIALIDAD</th><th>CONDICIÓN</th><th>TIPO</th></>}
              <th>ACCIONES</th>
            </tr></thead>
            <tbody>
              {datosPaginados.map((d:any, i) => (
                <tr key={i}>
                  {tab==='personas' && <td><input type="checkbox" checked={seleccionados.includes(d.idpersona)} onChange={() => toggleCheck(d.idpersona)} /></td>}
                  <td>{indiceInicio + i + 1}</td>
                  <td>{d.dni || d.persona?.dni}</td>
                  <td>{d.apellidos || d.persona?.apellidos}, {d.nombres || d.persona?.nombres}</td>
                  {tab==='docentes' && <><td>{d.profesion?.profesion}</td><td>{d.especialidad?.especialidad}</td><td>{d.condicion}</td><td>{d.tipodocente}</td></>}
                  <td>{tab==='docentes' && <button onClick={() => openEditModal(d)} className="btn-icon btn-icon-editar"><Edit size={15} /></button>}</td>
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

      {/* MODAL ACTUALIZAR DOCENTE */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{maxWidth: '70rem'}}>
            <div className="modal-header" style={{borderBottom: '2px solid var(--color-primario)', paddingBottom: '1.2rem'}}>
              <div>
                <div style={{display: 'flex', alignItems: 'center', gap: '0.8rem'}}>
                  <Users size={18} color="var(--color-primario)" />
                  <h2>Actualizar Datos complementario del Docente</h2>
                </div>
                {docenteEdit && (
                  <p style={{fontSize: 'var(--text-sm)', color: 'var(--color-texto-secundario)', marginTop: '0.4rem', fontWeight: 400}}>
                    {docenteEdit.persona?.apellidos}, {docenteEdit.persona?.nombres} - DNI: {docenteEdit.persona?.dni}
                  </p>
                )}
              </div>
              <button onClick={() => setShowModal(false)} className="btn-cerrar-modal">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="grid-2-modal">
                <SelectSGPCFieldset 
                  label="Profesión" 
                  value={form.idprofesion} 
                  onChange={(val:any) => setForm({...form, idprofesion: val})} 
                  options={profesiones.map(p=>({value:p.idprofesion, label:p.profesion}))}
                />
                <SelectSGPCFieldset 
                  label="Especialidad" 
                  value={form.idespecialidad} 
                  onChange={(val:any) => setForm({...form, idespecialidad: val})} 
                  options={especialidades.map(e=>({value:e.idespecialidad, label:e.especialidad}))}
                />
              </div>

              <div className="grid-2-modal">
                <SelectSGPCFieldset 
                  label="Condición *" 
                  value={form.condicion} 
                  onChange={(val:any) => setForm({...form, condicion: val})} 
                  options={[{value: "NOMBRADO", label: "NOMBRADO"}, {value: "CONTRATADO", label: "CONTRATADO"}]}
                />
                <SelectSGPCFieldset 
                  label="Tipo Docente *" 
                  value={form.tipodocente} 
                  onChange={(val:any) => setForm({...form, tipodocente: val})} 
                  options={[{value: "P", label: "Principal"}, {value: "A", label: "Asociado"}, {value: "X", label: "Auxiliar"}]}
                />
              </div>
            </div>

            <div className="modal-footer" style={{borderTop: '2px solid var(--color-primario)'}}>
              <button className="btn-secundario-outline" onClick={() => setForm({idprofesion: null, idespecialidad: null, condicion: 'NOMBRADO', tipodocente: 'P'})}>
                <Eraser size={18} /> Limpiar
              </button>
              <button className="btn-primario" onClick={handleGuardarEdit} disabled={!form.idprofesion || !form.idespecialidad}>
                <Check size={18} /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL VISTA PREVIA DOCENTES - SCROLL CORREGIDO */}
      {showPreviewModalDoc && (
        <div className="modal-overlay" onClick={() => setShowPreviewModalDoc(false)}>
          <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90rem', height: '80vh', display: 'flex', flexDirection: 'column', padding: 0 }}>
            
            <div className="modal-header" style={{padding: '2rem 2.4rem', borderBottom: '1px solid #e2e8f0', flexShrink: 0}}>
              <h2><Upload size={20} style={{marginRight: "0.8rem"}}/>Vista Previa Importar Docentes</h2>
              <button onClick={() => setShowPreviewModalDoc(false)} className="btn-cerrar-modal"><X size={20} /></button>
            </div>

            <div style={{padding: '1.6rem 2.4rem 0 2.4rem', flexShrink: 0}}>
              <p style={{fontSize: 'var(--text-sm)', marginBottom: '1.2rem'}}>
                Total: {previewDataDoc.length} |
                <span style={{color: '#22C55E', fontWeight: 600}}> {previewDataDoc.filter(p=>p.estado==='ok').length} Correctos</span> /
                <span style={{color: '#EF4444', fontWeight: 600}}> {previewDataDoc.filter(p=>p.estado==='error').length} Con Error</span>
              </p>
            </div>

            <div style={{overflowY: 'auto', flex: 1, padding: '0 2.4rem'}}>
              <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)'}}>
                <thead style={{position: 'sticky', top: 0, zIndex: 2, background: 'var(--color-primario)', color: '#fff'}}>
                  <tr>
                    <th style={{padding: '1.2rem 1rem', textAlign: 'left'}}>FILA</th>
                    <th style={{padding: '1.2rem 1rem', textAlign: 'left'}}>DNI</th>
                    <th style={{padding: '1.2rem 1rem', textAlign: 'left'}}>APELLIDOS</th>
                    <th style={{padding: '1.2rem 1rem', textAlign: 'left'}}>NOMBRES</th>
                    <th style={{padding: '1.2rem 1rem', textAlign: 'left'}}>ESTADO</th>
                    <th style={{padding: '1.2rem 1rem', textAlign: 'left'}}>OBSERVACIÓN</th>
                  </tr>
                </thead>
              <tbody>
  {previewDataDoc.map((p, i) => (
    <tr key={i} style={{background: '#fff'}}>
      <td style={{padding: '1.2rem 1rem', borderBottom: '1px solid #e2e8f0'}}>{p.fila}</td>
      <td style={{padding: '1.2rem 1rem', borderBottom: '1px solid #e2e8f0'}}>{p.dni}</td>
      <td style={{padding: '1.2rem 1rem', borderBottom: '1px solid #e2e8f0'}}>{p.apellidos}</td>
      <td style={{padding: '1.2rem 1rem', borderBottom: '1px solid #e2e8f0'}}>{p.nombres}</td>
      <td style={{padding: '1.2rem 1rem', borderBottom: '1px solid #e2e8f0', color: p.estado === 'ok'? '#22C55E' : '#EF4444', fontWeight: 600}}>
        {p.estado === 'ok'? <Check size={16}/> : <X size={16}/>}
      </td>
      <td style={{padding: '1.2rem 1rem', borderBottom: '1px solid #e2e8f0', color: p.estado === 'ok'? '#22C55E' : '#EF4444', fontWeight: 600}}>
        {p.motivo}
      </td>
    </tr>
  ))}
</tbody>
              </table>
            </div>

            <div className="modal-footer" style={{padding: '1.6rem 2.4rem', borderTop: '1px solid #e2e8f0', flexShrink: 0}}>
              <button className="btn-secundario" onClick={() => setShowPreviewModalDoc(false)}>Cancelar</button>
              <button
                className="btn-primario"
                onClick={handleConfirmImportDoc}
                disabled={previewDataDoc.filter(p=>p.estado==='ok').length === 0}
              >
                <Check size={18} /> Grabar {previewDataDoc.filter(p=>p.estado==='ok').length} Válidos
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  )
}