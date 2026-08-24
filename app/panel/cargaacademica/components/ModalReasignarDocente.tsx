'use client'
import { useState, useEffect } from 'react'
import { X, Save, RefreshCw, ArrowRight, UserCheck } from 'lucide-react'
import { createClient } from '@/lib/client'
import Select from 'react-select'

const supabase = createClient()

const ModalReasignarDocente = ({ show, onClose, carga, onReasignado }: any) => {
  const [loading, setLoading] = useState(false)
  const [docentesDisponibles, setDocentesDisponibles] = useState<any[]>([])
  const [docenteSeleccionado, setDocenteSeleccionado] = useState<any>(null)
  const [motivo, setMotivo] = useState('')
  const [dataActual, setDataActual] = useState<any>(null)
  const [errorValidacion, setErrorValidacion] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null)
  const showToast = (msg: string, type: 'error' | 'success' = 'error') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

useEffect(() => {
  const cargarTodo = async () => {
    if(!show ||!carga?.idcargaacad) return
    setDocenteSeleccionado(null); setMotivo(''); setDocentesDisponibles([]); setErrorValidacion(''); setLoading(true)

    // 1. Traer datos de la carga actual completa
    const { data: ca } = await supabase.from('cargaacademica')
     .select(`
        idcargaacad, nrc, idasignatura, idcampocli,
        asignatura(nombre, idcarrera),
        campoclinico!inner(idcampocli, ideps, idfilial, idpa, iddocente, periodoacademico!inner(codigo, nombre),
          docente!inner(iddocente, idespecialidad, persona(apellidos, nombres)),
          eps(razonsocial)
        ),
        horariodocente!inner(idhorariod, dia_semana, hora_inicio, hora_fin)
      `)
     .eq('idcargaacad', carga.idcargaacad)
     .single()

    if(!ca) {setLoading(false); return}

    // 2. Contar estudiantes actuales
    const { count } = await supabase.from('horario')
     .select('idhorario', {count: 'exact', head: true})
     .eq('idcargaacad', ca.idcargaacad)
     .eq('estado', 'ACTIVO')

    setDataActual({...ca, total_estudiantes: count || 0})

    // 3. Traer docentes de la misma especialidad y periodo
    const { data: docentes } = await supabase.from('docente')
     .select(`
        iddocente, idespecialidad,
        persona(apellidos, nombres),
        campoclinico!inner(idcampocli, idpa, ideps, idfilial)
      `)
     .eq('estado', 'ACTIVO')
     .eq('idespecialidad', ca.campoclinico.docente.idespecialidad)
     .eq('campoclinico.idpa', ca.campoclinico.idpa)
     .neq('iddocente', ca.campoclinico.iddocente)

    const opciones = docentes?.map(d => ({
      value: d.iddocente,
      label: `Dr(a). ${d.persona.apellidos}, ${d.persona.nombres}`,
      data: d
    })) || []

    setDocentesDisponibles(opciones)
    setLoading(false)
  }
  cargarTodo()
}, [show, carga])

// VALIDACION AL SELECCIONAR DOCENTE
useEffect(() => {
  const validar = async () => {
    if(!docenteSeleccionado ||!dataActual) return
    setErrorValidacion(''); setLoading(true)

    const iddocenteNuevo = docenteSeleccionado.value

    // VALIDACION 1: ¿Tiene el mismo horario?
    const { data: horDocNuevo } = await supabase.from('horariodocente')
     .select('dia_semana, hora_inicio, hora_fin')
     .eq('idcampocli', docenteSeleccionado.data.campoclinico[0].idcampocli)

    const horarioActual = dataActual.horariodocente
    const horarioCoincide = horDocNuevo?.some(h =>
      h.dia_semana === horarioActual.dia_semana &&
      h.hora_inicio === horarioActual.hora_inicio &&
      h.hora_fin === horarioActual.hora_fin
    )

    if(!horarioCoincide){
      setErrorValidacion('El docente seleccionado no tiene el mismo horario académico')
      setLoading(false); return
    }

    // VALIDACION 2: ¿No excede 5 estudiantes?
    const { data: cargasDestino } = await supabase.from('cargaacademica')
     .select('idcargaacad')
     .eq('idcampocli', docenteSeleccionado.data.campoclinico[0].idcampocli)
     .eq('idasignatura', dataActual.idasignatura)
     .eq('estado', 'ACTIVO')

    let totalEstDestino = 0
    if(cargasDestino && cargasDestino.length > 0){
      const { count } = await supabase.from('horario')
       .select('idhorario', {count: 'exact', head: true})
       .in('idcargaacad', cargasDestino.map(c => c.idcargaacad))
       .eq('estado', 'ACTIVO')
      totalEstDestino = count || 0
    }

    const totalFinal = totalEstDestino + dataActual.total_estudiantes
    if(totalFinal > 5){
      setErrorValidacion(`No se puede reasignar. El docente destino tendría ${totalFinal} estudiantes. Máximo permitido: 5`)
      setLoading(false); return
    }

    setLoading(false)
  }
  validar()
}, [docenteSeleccionado, dataActual])

const handleReasignar = async () => {
  if(!docenteSeleccionado) { showToast('Seleccione un docente', 'error'); return }
  if(!motivo.trim()) { showToast('Ingrese el motivo', 'error'); return }
  if(errorValidacion) { showToast(errorValidacion, 'error'); return }
  setLoading(true)

  try {
    // 1. CLONAR CAMPOC LINICO CON NUEVO DOCENTE
    const campocliActual = dataActual.campoclinico
    const { data: nuevoCampocli, error: errCampocli } = await supabase.from('campoclinico').insert({
      ideps: campocliActual.ideps,
      idfilial: campocliActual.idfilial,
      idpa: campocliActual.idpa,
      iddocente: docenteSeleccionado.value,
      nombre: campocliActual.eps.razonsocial,
      estado: 'ACTIVO'
    }).select().single()

    if(errCampocli) throw errCampocli

    // 2. ACTUALIZAR CARGA ACADEMICA
    const { error: errUpdate } = await supabase.from('cargaacademica')
     .update({ idcampocli: nuevoCampocli.idcampocli })
     .eq('idcargaacad', dataActual.idcargaacad)
    if(errUpdate) throw errUpdate

    // 3. INSERTAR HISTORIAL
    const { error: errHist } = await supabase.from('historialreasignacionnrcdocentes').insert({
      idcargaacad_anterior: dataActual.idcargaacad,
      idcampocli_anterior: campocliActual.idcampocli,
      idcampocli_nuevo: nuevoCampocli.idcampocli,
      iddocente_anterior: campocliActual.iddocente,
      iddocente_nuevo: docenteSeleccionado.value,
      motivo,
      idusuario: 1 // <-- Cambiar por usuario logueado
    })
    if(errHist) throw errHist

    showToast('Reasignación realizada correctamente', 'success')
    setLoading(false)
    onReasignado()
    setTimeout(() => onClose(), 1000)

  } catch (error: any) {
    showToast('Error: ' + error.message, 'error')
    setLoading(false)
  }
}

  if(!show) return null

  const docenteActual = dataActual?.campoclinico?.docente?.persona?.apellidos + ', ' + dataActual?.campoclinico?.docente?.persona?.nombres

  return (
    <div className="modal-overlay">
      {toast && <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 99999, background: toast.type === 'error'? '#EF4444' : '#22C55E', color: '#fff', padding: '1rem 2rem', borderRadius: '0.8rem', fontWeight: 600 }}>{toast.msg}</div>}
      <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{maxWidth: '75rem'}}>
        <div className="modal-header">
          <h2 style={{display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--color-primario)'}}><UserCheck size={22} /> Reasignar Docente - NRC: {dataActual?.nrc}</h2>
          <button onClick={onClose} className="btn-cerrar-modal"><X size={18} /></button>
        </div>
        <div className="modal-body">

          <fieldset className="fieldset-sgpc-section" style={{background: '#FEF2F2', borderColor: '#FECACA'}}>
            <legend>Situación Actual</legend>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', fontSize: '1.4rem'}}>
              {/* <p><b>Periodo:</b> {dataActual?.campoclinico?.idpa}</p> */}
              <p><b>Periodo:</b> {dataActual?.campoclinico?.periodoacademico?.codigo} - {dataActual?.campoclinico?.periodoacademico?.nombre}</p>
              <p><b>Asignatura:</b> {dataActual?.asignatura?.nombre}</p>
              <p><b>Docente Actual:</b> {docenteActual || 'Cargando...'}</p>
              <p><b>Total Estudiantes:</b> {dataActual?.total_estudiantes}</p>
              <p style={{gridColumn: '1 / 3'}}><b>Campo Clínico:</b> {dataActual?.campoclinico?.eps?.razonsocial}</p>
            </div>
          </fieldset>

          <div style={{textAlign: 'center', margin: '1rem 0'}}><ArrowRight size={24} color='var(--color-primario)' /></div>

          <fieldset className="fieldset-sgpc"><legend>Nuevo Docente *</legend>
            <Select
              options={docentesDisponibles}
              value={docenteSeleccionado}
              onChange={setDocenteSeleccionado}
              placeholder="Seleccione docente destino..."
              classNamePrefix="react-select"
              isLoading={loading}
              noOptionsMessage={() => 'No hay docentes disponibles'}
            />
            {errorValidacion && <p style={{color: '#EF4444', fontSize: '1.2rem', marginTop: '0.5rem'}}>{errorValidacion}</p>}
          </fieldset>
          <fieldset className="fieldset-sgpc"><legend>Motivo de Reasignación *</legend>
            <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={3} className="input-sgpc" placeholder="Ej: Incapacidad médica del docente" />
          </fieldset>
        </div>
        <div className="modal-footer" style={{justifyContent: 'center'}}>
          <button className="btn-secundario" onClick={onClose}><X size={16} />Cancelar</button>
          <button className="btn-primario" onClick={handleReasignar} disabled={loading ||!!errorValidacion}><Save size={16} />{loading? 'Reasignando...' : 'Confirmar Reasignación'}</button>
        </div>
      </div>
    </div>
  )
}
export default ModalReasignarDocente