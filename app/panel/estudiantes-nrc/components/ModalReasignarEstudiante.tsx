'use client'
import { useState, useEffect } from 'react'
import { X, Save, RefreshCw, AlertTriangle, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/client'
import Select from 'react-select'

const supabase = createClient()

const ModalReasignarEstudiante = ({ show, onClose, dataEstudiante, onReasignado }: any) => {
  const [loading, setLoading] = useState(false)
  const [nrcsDisponibles, setNrcsDisponibles] = useState<any[]>([])
  const [nrcSeleccionado, setNrcSeleccionado] = useState<any>(null)
  const [motivo, setMotivo] = useState('')
  const [actual, setActual] = useState<any>(null) // datos actuales
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null)
  const showToast = (msg: string, type: 'error' | 'success' = 'error') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }


useEffect(() => {
  const cargarTodo = async () => {
    if(!show || !dataEstudiante?.idhorario) return
    setNrcSeleccionado(null); setMotivo(''); setNrcsDisponibles([])

    // QUERY 1: Traer datos del horario actual
    const { data: h } = await supabase.from('horario')
      .select(`idhorario, idcargaacad, idmatricula`)
      .eq('idhorario', dataEstudiante.idhorario)
      .single()
    
    if(!h) return

    // QUERY 2: Traer cargaacademica + asignatura + docente
    const { data: ca } = await supabase.from('cargaacademica')
      .select(`
        idcargaacad, nrc, idasignatura,
        asignatura: idasignatura(nombre),
        horariodocente: idhorariod(
          campoclinico: idcampocli(
            idpa,
            docente: iddocente(persona: idpersona(apellidos, nombres))
          )
        )
      `)
      .eq('idcargaacad', h.idcargaacad)
      .single()

    // QUERY 3: Traer estudiante
    const { data: mat } = await supabase.from('matricula')
      .select(`idestudiante, estudiante: idestudiante(persona: idpersona(apellidos, nombres))`)
      .eq('idmatricula', h.idmatricula)
      .single()

    setActual({ ...h, ...ca, matricula: mat })

    // QUERY 4: Traer NRCs destino
    const { data: cas } = await supabase.from('cargaacademica')
      .select(`
        idcargaacad, nrc,
        horariodocente: idhorariod(
          campoclinico: idcampocli(
            docente: iddocente(persona: idpersona(apellidos, nombres))
          )
        )
      `)
      .eq('estado', 'ACTIVO')
      .eq('idasignatura', ca?.idasignatura)
      
    const filtrados = cas?.filter(c => c.idcargaacad !== h?.idcargaacad) || []
    
    setNrcsDisponibles(filtrados.map(c => ({
      value: c.idcargaacad,
      label: `NRC: ${c.nrc} - ${c.horariodocente?.campoclinico?.docente?.persona?.apellidos}, ${c.horariodocente?.campoclinico?.docente?.persona?.nombres}`,
      nrc: c.nrc
    })))
  }
  cargarTodo()
}, [show, dataEstudiante])

  const handleReasignar = async () => {
    if(!nrcSeleccionado) { showToast('Seleccione un nuevo NRC', 'error'); return }
    if(!motivo.trim()) { showToast('Ingrese el motivo', 'error'); return }
    setLoading(true)

    const { data: horNRCNuevo } = await supabase.from('horario')
      .select('idhorario, detallehorario(*)')
      .eq('idcargaacad', nrcSeleccionado.value)
      .eq('estado', 'ACTIVO')
      .limit(1)
      .single()

    if(!horNRCNuevo) { showToast('El NRC destino no tiene horario', 'error'); setLoading(false); return }

    await supabase.from('horario').update({ idcargaacad: nrcSeleccionado.value }).eq('idhorario', dataEstudiante.idhorario)
    await supabase.from('detallehorario').delete().eq('idhorario', dataEstudiante.idhorario)
    
    const detalleParaInsertar = horNRCNuevo.detallehorario.map((d:any) => ({
      idhorario: dataEstudiante.idhorario, dia_semana: d.dia_semana, hora_inicio: d.hora_inicio, hora_fin: d.hora_fin, estado: 'ACTIVO'
    }))
    await supabase.from('detallehorario').insert(detalleParaInsertar)

    await supabase.from('historialreasignacionnrcestudiantes').insert({
      idhorario: dataEstudiante.idhorario,
      idmatricula: actual?.idmatricula,
      idcargaacad_anterior: actual?.idcargaacad,
      idcargaacad_nuevo: nrcSeleccionado.value,
      motivo, fecha_reasignacion: new Date().toISOString(), idusuario: 1
    })

    showToast('Reasignado correctamente', 'success')
    setLoading(false)
    onReasignado()
    onClose()
  }

  if(!show) return null

  // const nombreEst = actual?.matricula?.estudiante?.persona?.apellidos + ' ' + actual?.matricula?.estudiante?.persona?.nombres
     const nombreEst = actual?.matricula?.estudiante?.persona?.apellidos + ' ' + actual?.matricula?.estudiante?.persona?.nombres
  // const docenteActual = actual?.cargaacademica?.horariodocente?.campoclinico?.docente?.persona?.apellidos + ', ' + actual?.cargaacademica?.horariodocente?.campoclinico?.docente?.persona?.nombres
  
const docenteActual = actual?.horariodocente?.campoclinico?.docente?.persona?.apellidos + ', ' + actual?.horariodocente?.campoclinico?.docente?.persona?.nombres

  return (
    <div className="modal-overlay">
      {toast && <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 99999, background: toast.type === 'error'? '#EF4444' : '#22C55E', color: '#fff', padding: '1rem 2rem', borderRadius: '0.8rem', fontWeight: 600 }}>{toast.msg}</div>}
      <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{maxWidth: '70rem'}}>
        <div className="modal-header">
          <h2 style={{display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--color-primario)'}}><RefreshCw size={22} /> Reasignar Estudiante</h2>
          <button onClick={onClose} className="btn-cerrar-modal"><X size={18} /></button>
        </div>
        <div className="modal-body">
          
          {/* CARD ACTUAL */}
         <fieldset className="fieldset-sgpc-section" style={{background: '#FEF2F2', borderColor: '#FECACA'}}>
    <legend>Situación Actual</legend>
    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', fontSize: '1.4rem'}}>
      <p><b>Periodo:</b> {actual?.horariodocente?.campoclinico?.idpa}</p>
      <p><b>Estudiante:</b> {nombreEst || 'Cargando...'}</p>
      <p><b>Asignatura:</b> {actual?.asignatura?.nombre || 'Cargando...'}</p>
      <p><b>NRC Actual:</b> {actual?.nrc || 'Cargando...'}</p>
      <p><b>Docente Actual:</b> {docenteActual || 'Cargando...'}</p>
    </div>
  </fieldset>

          <div style={{textAlign: 'center', margin: '1rem 0'}}><ArrowRight size={24} color='var(--color-primario)' /></div>

          <fieldset className="fieldset-sgpc"><legend>Nuevo NRC / Docente *</legend>
            <Select options={nrcsDisponibles} value={nrcSeleccionado} onChange={setNrcSeleccionado} placeholder="Seleccione NRC destino..." classNamePrefix="react-select" />
          </fieldset>
          <fieldset className="fieldset-sgpc"><legend>Motivo de Reasignación *</legend>
            <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={3} className="input-sgpc" placeholder="Ej: Cambio por cruce de horarios" />
          </fieldset>
        </div>
        <div className="modal-footer" style={{justifyContent: 'center'}}>
          <button className="btn-secundario" onClick={onClose}><X size={16} />Cancelar</button>
          <button className="btn-primario" onClick={handleReasignar} disabled={loading}><Save size={16} />{loading? 'Reasignando...' : 'Confirmar Reasignación'}</button>
        </div>
      </div>
    </div>
  )
}
export default ModalReasignarEstudiante