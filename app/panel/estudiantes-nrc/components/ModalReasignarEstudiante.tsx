'use client'
import { useState, useEffect } from 'react'
import { X, Save, RefreshCw, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/client'
import Select from 'react-select'

const supabase = createClient()

const ModalReasignarEstudiante = ({ show, onClose, dataEstudiante, onReasignado }: any) => {
  const [loading, setLoading] = useState(false)
  const [nrcsDisponibles, setNrcsDisponibles] = useState<any[]>([])
  const [nrcSeleccionado, setNrcSeleccionado] = useState<any>(null)
  const [motivo, setMotivo] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null)
  const showToast = (msg: string, type: 'error' | 'success' = 'error') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  useEffect(() => {
    const cargarNRCs = async () => {
      if(!show || !dataEstudiante) return
      setNrcSeleccionado(null)
      setMotivo('')

      // Traer todos los NRC del mismo periodo y asignatura, excluyendo el actual
      const { data } = await supabase.from('cargaacademica')
        .select(`idcargaacad, nrc, 
          horariodocente:idhorariod(
            idhorariod,
            campoclinico:idcampocli!inner(
              idpa,
              docente:iddocente!inner(persona:idpersona!inner(apellidos, nombres))
            )
          ),
          asignatura:idasignatura!inner(nombre)
        `)
        .eq('estado', 'ACTIVO')
        .eq('idasignatura', dataEstudiante.idasignatura)
        .eq('horariodocente.campoclinico.idpa', dataEstudiante.idpa)

      const filtrados = data?.filter(c => c.idcargaacad !== dataEstudiante.idcargaacad) || []
      
      setNrcsDisponibles(filtrados.map(c => ({
        value: c.idcargaacad,
        label: `NRC: ${c.nrc} - ${c.horariodocente.campoclinico.docente.persona.apellidos}, ${c.horariodocente.campoclinico.docente.persona.nombres}`,
        idhorariod: c.horariodocente.idhorariod,
        nrc: c.nrc
      })))
    }
    cargarNRCs()
  }, [show, dataEstudiante])

  const handleReasignar = async () => {
    if(!nrcSeleccionado) { showToast('Seleccione un nuevo NRC', 'error'); return }
    if(!motivo.trim()) { showToast('Ingrese el motivo de la reasignación', 'error'); return }
    setLoading(true)

    // 1. Obtener detallehorario del NRC nuevo para copiarlo
    const { data: detalleNuevo } = await supabase.from('detallehorario')
      .select('*')
      .eq('idhorario', dataEstudiante.idhorario) // esto fallará, necesitamos del NRC nuevo
    
    // Mejor: traemos detalle del primer estudiante del NRC nuevo
    const { data: horNRCNuevo } = await supabase.from('horario')
      .select('idhorario, detallehorario(*)')
      .eq('idcargaacad', nrcSeleccionado.value)
      .eq('estado', 'ACTIVO')
      .limit(1)
      .single()

    if(!horNRCNuevo) { showToast('El NRC destino no tiene horario registrado', 'error'); setLoading(false); return }

    // 2. Update horario
    const { error: errUpdate } = await supabase.from('horario')
      .update({ idcargaacad: nrcSeleccionado.value })
      .eq('idhorario', dataEstudiante.idhorario)

    if(errUpdate) { showToast(errUpdate.message, 'error'); setLoading(false); return }

    // 3. Borrar detalle viejo y copiar detalle nuevo
    await supabase.from('detallehorario').delete().eq('idhorario', dataEstudiante.idhorario)
    
    const detalleParaInsertar = horNRCNuevo.detallehorario.map((d:any) => ({
      idhorario: dataEstudiante.idhorario,
      dia_semana: d.dia_semana,
      hora_inicio: d.hora_inicio,
      hora_fin: d.hora_fin,
      estado: 'ACTIVO'
    }))
    await supabase.from('detallehorario').insert(detalleParaInsertar)

    // 4. Guardar historial
    await supabase.from('historialreasignacionnrcestudiantes').insert({
      idhorario: dataEstudiante.idhorario,
      idmatricula: dataEstudiante.idmatricula,
      idcargaacad_anterior: dataEstudiante.idcargaacad,
      idcargaacad_nuevo: nrcSeleccionado.value,
      motivo: motivo,
      idusuario: 1 // <-- Cambia por el id del usuario logueado
    })

    showToast('Estudiante reasignado correctamente', 'success')
    setLoading(false)
    onReasignado()
    onClose()
  }

  if(!show) return null

  return (
    <div className="modal-overlay">
      {toast && <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 99999, background: toast.type === 'error'? '#EF4444' : '#22C55E', color: '#fff', padding: '1rem 2rem', borderRadius: '0.8rem', fontWeight: 600 }}>{toast.msg}</div>}
      <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{maxWidth: '60rem'}}>
        <div className="modal-header">
          <h2 style={{display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--color-primario)'}}><RefreshCw size={22} /> Reasignar Estudiante</h2>
          <button onClick={onClose} className="btn-cerrar-modal"><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div style={{background: '#FEF2F2', border: '1px solid #FECACA', padding: '1.2rem', borderRadius: '0.8rem', marginBottom: '1.6rem', display: 'flex', gap: '0.8rem'}}>
            <AlertTriangle size={18} color='#EF4444' />
            <p style={{fontSize: '1.3rem'}}>Se moverá a <b>{dataEstudiante?.estudiante}</b> del NRC <b>{dataEstudiante?.nrc_actual}</b> al nuevo NRC. Se copiará el horario del docente destino.</p>
          </div>
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