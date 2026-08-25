'use client'
import { useState, useEffect } from 'react'
import { X, Save, ArrowRight, UserCheck } from 'lucide-react'
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
    if(!show ||!carga?.nrc) return
    setDocenteSeleccionado(null); setMotivo(''); setDocentesDisponibles([]); setErrorValidacion(''); setLoading(true)

    // 1. Traer datos de la carga actual completa USANDO NRC
    const { data: ca } = await supabase.from('cargaacademica')
   .select(`
        idcargaacad, nrc, idasignatura, idcampocli,
        asignatura(nombre, idcarrera),
        campoclinico!inner(idcampocli, ideps, idfilial, idpa, iddocente, periodoacademico!inner(codigo, nombre),
          docente!inner(iddocente, idespecialidad, persona(dni, apellidos, nombres)),
          eps(razonsocial)
        ),
        horariodocente!inner(idhorariod, dia_semana, hora_inicio, hora_fin)
      `)
   .eq('nrc', carga.nrc)
   .single()

    if(!ca) {setLoading(false); return}

    // 2. Contar estudiantes actuales
    const { count } = await supabase.from('horario')
   .select('idhorario', {count: 'exact', head: true})
   .eq('idcargaacad', ca.idcargaacad)
   .eq('estado', 'ACTIVO')

    setDataActual({...ca, total_estudiantes: count || 0})

    // 3. Traer docentes del mismo periodo + eps + filial
    const horarioActual = ca.horariodocente
    const { data: docentes } = await supabase.from('docente')
   .select(`
        iddocente, idespecialidad,
        persona(dni, apellidos, nombres),
        campoclinico!inner(
          idcampocli, idpa, ideps, idfilial,
          horariodocente(idhorariod, dia_semana, hora_inicio, hora_fin)
        )
      `)
   .eq('estado', 'ACTIVO')
   .eq('campoclinico.idpa', ca.campoclinico.idpa)
   .eq('campoclinico.ideps', ca.campoclinico.ideps)
   .eq('campoclinico.idfilial', ca.campoclinico.idfilial)
   .neq('iddocente', ca.campoclinico.iddocente)

    if(!docentes) { setLoading(false); return }

    // 4. Filtrar los que SÍ tienen ese horario exacto + contar estudiantes
    const docentesConteo = await Promise.all(
      docentes.map(async (d: any) => {
        const idcampocli = d.campoclinico[0].idcampocli;
        const horariosDocente = d.campoclinico[0].horariodocente;

        // VALIDACION HORARIO: ¿Tiene al menos el mismo dia y hora?
        const tieneHorario = horariosDocente.some((h: any) => 
          h.dia_semana === horarioActual.dia_semana &&
          h.hora_inicio === horarioActual.hora_inicio &&
          h.hora_fin === horarioActual.hora_fin
        )
        if(!tieneHorario) return null; // Si no tiene ese horario, lo descarto

        // Contar estudiantes
        const { data: cargasDestino } = await supabase.from('cargaacademica')
       .select('idcargaacad')
       .eq('idcampocli', idcampocli)
       .eq('idasignatura', ca.idasignatura)
       .eq('estado', 'ACTIVO')

        let totalEstDestino = 0
        if(cargasDestino && cargasDestino.length > 0){
          const { count } = await supabase.from('horario')
         .select('idhorario', {count: 'exact', head: true})
         .in('idcargaacad', cargasDestino.map(c => c.idcargaacad))
         .eq('estado', 'ACTIVO')
          totalEstDestino = count || 0
        }

        const totalFinal = totalEstDestino + (count || 0)
        if(totalFinal > 5) return null; // Si se pasa de 5, lo descarto

        return {
          value: d.iddocente,
          label: `${d.persona.dni} - ${d.persona.apellidos}, ${d.persona.nombres} | ${totalEstDestino} estudiantes`, // CAMBIO: DNI + DOCENTE + TOTAL
          data: d,
          total_estudiantes: totalEstDestino
        }
      })
    );

    setDocentesDisponibles(docentesConteo.filter(Boolean))
    setLoading(false)
  }
  cargarTodo()
}, [show, carga])

const handleReasignar = async () => {
  if(!docenteSeleccionado) { showToast('Seleccione un docente', 'error'); return }
  if(!motivo.trim()) { showToast('Ingrese el motivo', 'error'); return }
  setLoading(true)

  try {
    const campocliActual = dataActual.campoclinico
    // 1. CLONAR CAMPOC LINICO CON NUEVO DOCENTE
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

    // 3. CLONAR HORARIO DOCENTE AL NUEVO CAMPOC LINICO
    const { error: errHor } = await supabase.from('horariodocente').insert({
      idcampocli: nuevoCampocli.idcampocli,
      dia_semana: dataActual.horariodocente.dia_semana,
      hora_inicio: dataActual.horariodocente.hora_inicio,
      hora_fin: dataActual.horariodocente.hora_fin
    })
    if(errHor) throw errHor

    // 4. INSERTAR HISTORIAL
    await supabase.from('historialreasignacionnrcdocentes').insert({
      idcargaacad_anterior: dataActual.idcargaacad,
      idcampocli_anterior: campocliActual.idcampocli,
      idcampocli_nuevo: nuevoCampocli.idcampocli,
      iddocente_anterior: campocliActual.iddocente,
      iddocente_nuevo: docenteSeleccionado.value,
      motivo,
      idusuario: 1
    })

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
              <p><b>Periodo:</b> {dataActual?.campoclinico?.periodoacademico?.codigo} - {dataActual?.campoclinico?.periodoacademico?.nombre}</p>
              <p><b>Asignatura:</b> {dataActual?.asignatura?.nombre}</p>
              <p><b>Docente Actual:</b> {docenteActual || 'Cargando...'}</p>
              <p><b>Total Estudiantes:</b> {dataActual?.total_estudiantes}</p>
              <p style={{gridColumn: '1 / 3'}}><b>Campo Clínico:</b> {dataActual?.campoclinico?.eps?.razonsocial}</p>
              <p style={{gridColumn: '1 / 3'}}><b>Horario:</b> {dataActual?.horariodocente?.dia_semana} {dataActual?.horariodocente?.hora_inicio} - {dataActual?.horariodocente?.hora_fin}</p>
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
              noOptionsMessage={() => 'No hay docentes disponibles con ese horario'}
            />
            {errorValidacion && <p style={{color: '#EF4444', fontSize: '1.2rem', marginTop: '0.5rem'}}>{errorValidacion}</p>}
          </fieldset>
          <fieldset className="fieldset-sgpc"><legend>Motivo de Reasignación *</legend>
            <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={3} className="input-sgpc" placeholder="Ej: Incapacidad médica del docente" />
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
export default ModalReasignarDocente