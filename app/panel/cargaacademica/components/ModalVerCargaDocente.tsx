'use client'
import { useState, useEffect } from 'react'
// import { X, Users, Clock, Printer, UserSwitch, Plus, BookOpen, Hospital, MapPin } from 'lucide-react'
import { X, Users, Clock, Printer, ArrowLeftRight, Plus, BookOpen, Hospital, MapPin } from 'lucide-react'
import { createClient } from '@/lib/client'

const supabase = createClient()

const ModalVerCargaDocente = ({ show, onClose, carga, onAbrirAgregarEstudiante, setDataWizard2 }: any) => {
  const [loading, setLoading] = useState(false)
  const [horarios, setHorarios] = useState<any[]>([])
  const [estudiantes, setEstudiantes] = useState<any[]>([])

  useEffect(() => {
    const cargar = async () => {
      if(!show || !carga) return
      setLoading(true)

      // Tabla 1: Horario Académico
      const { data: horData } = await supabase
        .from('horario')
        .select(`idhorario, detallehorario(*)`)
        .eq('idcargaacad', carga.idcargaacad)
        .eq('estado', 'ACTIVO')
      
      const detalles = horData?.flatMap(h => h.detallehorario?.map((d:any) => ({...d, idhorario: h.idhorario})) ) || []
      setHorarios(detalles)

      // Tabla 2: Estudiantes
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

  if(!show) return null

  const handleImprimir = () => window.print()

  const handleAgregarEstudiante = () => {
    const dataWizard = {
      idcargaacad: carga.idcargaacad,
      nrc: carga.nrc,
      idhorariod: carga.idhorariod,
      iddocente: carga.horariodocente?.campoclinico?.docente?.iddocente,
      idpa: carga.horariodocente?.campoclinico?.idpa,
      idasignatura: carga.idasignatura,
      docente: `${carga.horariodocente?.campoclinico?.docente?.persona?.apellidos}, ${carga.horariodocente?.campoclinico?.docente?.persona?.nombres}`,
      dni: carga.horariodocente?.campoclinico?.docente?.persona?.dni,
      asignatura: `${carga.asignatura?.codigo} - ${carga.asignatura?.nombre}`,
      esSoloLectura: false
    }
    setDataWizard2(dataWizard)
    onAbrirAgregarEstudiante()
  }

  const datos = {
    periodo: carga?.horariodocente?.campoclinico?.periodoacademico?.nombre,
    dni: carga?.horariodocente?.campoclinico?.docente?.persona?.dni,
    docente: `${carga?.horariodocente?.campoclinico?.docente?.persona?.apellidos}, ${carga?.horariodocente?.campoclinico?.docente?.persona?.nombres}`,
    especialidad: carga?.horariodocente?.campoclinico?.docente?.especialidad?.especialidad,
    asignatura: `${carga?.asignatura?.codigo} - ${carga?.asignatura?.nombre}`,
    plan: carga?.asignatura?.planasignatura?.nombre,
    campo: carga?.horariodocente?.campoclinico?.eps?.razonsocial,
    direccion: carga?.horariodocente?.campoclinico?.eps?.direccion,
    distrito: carga?.horariodocente?.campoclinico?.eps?.distrito?.nombredt,
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{maxWidth: '95rem', maxHeight: '90vh', display: 'flex', flexDirection: 'column'}}>
        
        <div className="modal-header">
          <h2 style={{display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--color-primario)', fontSize: '1.8rem'}}>
            <Users size={22} /> Carga Docente - NRC: {carga?.nrc}
          </h2>
          <button onClick={onClose} className="btn-cerrar-modal"><X size={18} /></button>
        </div>

        <div className="modal-body" style={{overflowY: 'auto', padding: '2rem'}}>
          
          {/* HEADER INFO */}
          <fieldset className="fieldset-sgpc-section">
            <legend>Información General</legend>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.2rem', fontSize: '1.3rem'}}>
              <div><b>Periodo Académico:</b> {datos.periodo}</div>
              <div><b>DNI + Docente:</b> {datos.dni} - {datos.docente}</div>
              <div><b>Especialidad:</b> {datos.especialidad}</div>
              <div><b>Asignatura:</b> {datos.asignatura} - PLAN {datos.plan}</div>
              <div style={{gridColumn: '1 / 3'}}><b>Campo Clínico:</b> <Hospital size={14}/> {datos.campo} - <MapPin size={14}/> {datos.direccion} - {datos.distrito}</div>
            </div>
          </fieldset>

          {/* TABLA HORARIO */}
          <fieldset className="fieldset-sgpc-section">
            <legend className="legend-sgpc-titulo"><Clock size={16}/> Horario Académico</legend>
            <div className="table-responsive">
              <table className='tabla-sgpc'>
                <thead><tr><th>Nro</th><th>Día</th><th>Hora Inicio</th><th>Hora Fin</th><th>Total Horas</th></tr></thead>
                <tbody>
                  {loading ? <tr><td colSpan={5}>Cargando...</td></tr> :
                   horarios.length === 0 ? <tr><td colSpan={5}>No hay horario registrado</td></tr> :
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

          {/* TABLA ESTUDIANTES */}
          <fieldset className="fieldset-sgpc-section">
            <legend className="legend-sgpc-titulo"><Users size={16}/> Relación de Estudiantes</legend>
            <div className="table-responsive">
              <table className='tabla-sgpc'>
                <thead><tr><th>Nro</th><th>DNI</th><th>Estudiante</th></tr></thead>
                <tbody>
                  {loading ? <tr><td colSpan={3}>Cargando...</td></tr> :
                   estudiantes.length === 0 ? <tr><td colSpan={3}>No hay estudiantes</td></tr> :
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
          {/* <button className="btn-secundario" onClick={() => showToast('Pendiente: Reasignar Docente', 'error')}><UserSwitch size={16}/>Reasignar a otro Docente</button> */}
          <button className="btn-secundario" onClick={() => showToast('Pendiente: Reasignar Docente', 'error')}><ArrowLeftRight size={16}/>Reasignar a otro Docente</button>
          <button className="btn-primario" onClick={handleImprimir}><Printer size={16}/>Imprimir</button>
        </div>
      </div>
    </div>
  )
}
export default ModalVerCargaDocente