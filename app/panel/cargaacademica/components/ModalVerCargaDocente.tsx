'use client'
import { useState, useEffect } from 'react'
import { X, Users, Clock, Printer, ArrowLeftRight, Plus, BookOpen, Hospital, MapPin } from 'lucide-react'
import { createClient } from '@/lib/client'
import ModalReasignarDocente from './ModalReasignarDocente' // <-- AGREGA ESTO

const supabase = createClient()

const ModalVerCargaDocente = ({ show, onClose, carga, onAbrirAgregarEstudiante, setDataWizard2 }: any) => {
  const [loading, setLoading] = useState(false)
  const [horarios, setHorarios] = useState<any[]>([])
  const [estudiantes, setEstudiantes] = useState<any[]>([])
  const [epsCompleta, setEpsCompleta] = useState<any>(null) // <-- CAMBIO 1: NUEVO STATE
  const [especialidadDoc, setEspecialidadDoc] = useState<string>('S/ESPECIALIDAD')
  const [showReasignarDoc, setShowReasignarDoc] = useState(false) // <-- AGREGA ESTO

  useEffect(() => {
  const cargar = async () => {
    if(!show ||!carga) return
    setLoading(true)

    const { data: horData } = await supabase
     .from('horario')
     .select(`idhorario, detallehorario(*)`)
     .eq('idcargaacad', carga.idcargaacad)
     .eq('estado', 'ACTIVO')
     .limit(1)
     .single()
    
    setHorarios(horData?.detallehorario || [])

    const { data: estData } = await supabase
     .from('horario')
     .select(`*, matricula!inner(idmatricula, estado, idestudiante, estudiante!inner(idpersona, persona!inner(dni, apellidos, nombres)))`)
     .eq('idcargaacad', carga.idcargaacad)
     .eq('estado', 'ACTIVO')
     .eq('matricula.estado', 'MATRICULADO')
    
    setEstudiantes(estData || [])
    setLoading(false)
  }
  cargar()
}, [show, carga])

// <-- CAMBIO 1: NUEVO USEEFFECT PARA TRAER DIRECCION COMPLETA
useEffect(() => {
  const cargarEps = async () => {
    if(!carga?.horariodocente?.campoclinico?.ideps) return
    const { data } = await supabase
    .from('eps')
    .select(`
        direccion,
        distrito(
          nombredt, 
          provincia(nombrep, departamento(nombred))
        )
      `)
    .eq('ideps', carga.horariodocente.campoclinico.ideps)
    .single()
    setEpsCompleta(data)
  }
  cargarEps()
}, [carga])

useEffect(() => {
  const cargarEspecialidad = async () => {
    const iddocente = carga?.horariodocente?.campoclinico?.docente?.iddocente
    if(!iddocente) return
    
    const { data } = await supabase
    .from('docente')
    .select(`
        especialidad(especialidad),
        profesion(profesion)
      `)
    .eq('iddocente', iddocente)
    .single()
    
    setEspecialidadDoc(data?.especialidad?.especialidad || data?.profesion?.profesion || 'S/ESPECIALIDAD')
  }
  cargarEspecialidad()
}, [carga])

  if(!show) return null

  const handleImprimir = () => window.print()

  const handleAgregarEstudiante = async () => {
  setLoading(true)
  const { data: otraCarga } = await supabase
   .from('cargaacademica')
   .select(`
      idcargaacad,
      horariodocente!inner(
        idhorariod,
        campoclinico!inner(idpa, docente:iddocente)
      )
    `)
   .eq('nrc', carga.nrc)
   .eq('idasignatura', carga.idasignatura)
   .eq('estado', 'ACTIVO')
   .neq('idcargaacad', carga.idcargaacad)
   .eq('horariodocente.campoclinico.idpa', carga.horariodocente?.campoclinico?.idpa)
   .limit(1)
   .single()

  const dataWizard = {
    idcargaacad: carga.idcargaacad,
    idcargaacad_referencia: otraCarga?.idcargaacad || null,
    nrc: carga.nrc,
    idhorariod: carga.idhorariod,
    iddocente: carga.horariodocente?.campoclinico?.docente?.iddocente,
    idpa: carga.horariodocente?.campoclinico?.idpa,
    idasignatura: carga.idasignatura,
    docente: `${carga.horariodocente?.campoclinico?.docente?.persona?.apellidos}, ${carga.horariodocente?.campoclinico?.docente?.persona?.nombres}`,
    dni: carga.horariodocente?.campoclinico?.docente?.persona?.dni,
    asignatura: `${carga.asignatura?.codigo} - ${carga.asignatura?.nombre}`,
    esSoloLectura:!!otraCarga
  }
  setDataWizard2(dataWizard)
  setLoading(false)
  onAbrirAgregarEstudiante()
}

  // <-- CAMBIO 2: DATOS ACTUALIZADOS
  const datos = {
    periodo: carga?.horariodocente?.campoclinico?.periodoacademico?.nombre,
    dni: carga?.horariodocente?.campoclinico?.docente?.persona?.dni,
    docente: `${carga?.horariodocente?.campoclinico?.docente?.persona?.apellidos}, ${carga?.horariodocente?.campoclinico?.docente?.persona?.nombres}`,
    //especialidad: carga?.horariodocente?.campoclinico?.docente?.especialidad?.especialidad || carga?.horariodocente?.campoclinico?.docente?.profesion?.profesion || 'S/ESPECIALIDAD',
    especialidad: especialidadDoc,
    asignatura: `${carga?.asignatura?.codigo} - ${carga?.asignatura?.nombre}`,
    plan: carga?.asignatura?.planasignatura?.nombre,
    campo: carga?.horariodocente?.campoclinico?.eps?.razonsocial,
    direccion: epsCompleta?.direccion,
    distrito: epsCompleta?.distrito?.nombredt,
    provincia: epsCompleta?.distrito?.provincia?.nombrep,
    departamento: epsCompleta?.distrito?.provincia?.departamento?.nombred,
  }

  return (
    <div className="modal-overlay" >
      <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{maxWidth: '95rem', maxHeight: '90vh', display: 'flex', flexDirection: 'column'}}>
        
        <div className="modal-header">
          <h2 style={{display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--color-primario)', fontSize: '1.8rem'}}>
            <Users size={22} /> Carga Docente - NRC: {carga?.nrc}
          </h2>
          <button onClick={onClose} className="btn-cerrar-modal"><X size={18} /></button>
        </div>

        <div className="modal-body" style={{overflowY: 'auto', padding: '2rem'}}>
          
          <fieldset className="fieldset-sgpc-section">
            <legend>Información General</legend>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.2rem', fontSize: '1.3rem'}}>
              <div><b>Periodo Académico:</b> {datos.periodo}</div>
              <div><b>DNI + Docente:</b> {datos.dni} - {datos.docente}</div>
              <div><b>Especialidad:</b> {datos.especialidad}</div>
              <div><b>Asignatura:</b> {datos.asignatura} - {datos.plan}</div>
              
              {/* <-- CAMBIO 3: 2 LINEAS SEPARADAS */}
              <div style={{gridColumn: '1 / 3'}}><b>Campo Clínico:</b> <Hospital size={14}/> {datos.campo}</div>
              <div style={{gridColumn: '1 / 3', paddingLeft: '2rem', color: 'var(--color-texto-secundario)'}}><b>Dirección:</b> <MapPin size={14}/> {datos.direccion || 'S/DIRECCION'}, {datos.distrito} - {datos.provincia} - {datos.departamento}</div>
            </div>
          </fieldset>

          <fieldset className="fieldset-sgpc-section">
            <legend className="legend-sgpc-titulo"><Clock size={16}/> Horario Académico</legend>
            <div className="table-responsive">
              <table className='tabla-sgpc'>
                <thead><tr><th>Nro</th><th>Día</th><th>Hora Inicio</th><th>Hora Fin</th><th>Total Horas</th></tr></thead>
                <tbody>
                  {loading? <tr><td colSpan={5}>Cargando...</td></tr> :
                   horarios.length === 0? <tr><td colSpan={5}>No hay horario registrado</td></tr> :
                   horarios.map((h,i) => (
                    <tr key={h.iddh}>
                      <td>{i+1}</td>
                      <td>{h.dia_semana}</td>
                      <td>{h.hora_inicio}</td>
                      <td>{h.hora_fin}</td>
                      <td>{( (new Date(`1970-01-01T${h.hora_fin}`)).getHours() - (new Date(`1970-01-01T${h.hora_inicio}`)).getHours() ).toFixed(1)}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </fieldset>

          <fieldset className="fieldset-sgpc-section">
            <legend className="legend-sgpc-titulo"><Users size={16}/> Relación de Estudiantes</legend>
            <div className="table-responsive">
              <table className='tabla-sgpc'>
                <thead><tr><th>Nro</th><th>DNI</th><th>Estudiante</th></tr></thead>
                <tbody>
                  {loading? <tr><td colSpan={3}>Cargando...</td></tr> :
                   estudiantes.length === 0? <tr><td colSpan={3}>No hay estudiantes</td></tr> :
                   estudiantes.map((h,i) => (
                    <tr key={h.idhorario}>
                      <td>{i+1}</td>
                      <td>{h.matricula?.estudiante?.persona?.dni}</td>
                      <td>{h.matricula?.estudiante?.persona?.apellidos}, {h.matricula?.estudiante?.persona?.nombres}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </fieldset>
        </div>

        <div className="modal-footer" style={{justifyContent: 'center', gap: '1.6rem'}}>
          <button className="btn-secundario" onClick={handleAgregarEstudiante}><Plus size={16}/>Agregar Estudiante</button>
          <button className="btn-secundario" onClick={() => setShowReasignarDoc(true)}><ArrowLeftRight size={16}/>Reasignar a otro Docente</button>
          <button className="btn-primario" onClick={handleImprimir}><Printer size={16}/>Imprimir</button>
        </div>
        <ModalReasignarDocente 
  show={showReasignarDoc} 
  onClose={() => setShowReasignarDoc(false)} 
  carga={carga} 
  onReasignado={() => {
    onClose() // cierra este modal
    setTimeout(() => window.location.reload(), 500) // recarga para ver los cambios
  }} 
/>
      </div>
    </div>
  )
}
export default ModalVerCargaDocente