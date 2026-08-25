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
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null)
  const showToast = (msg: string, type: 'error' | 'success' = 'error') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  const normalizarHora = (h: string) => h?.slice(0,5) || ''

useEffect(() => {
  const cargarTodo = async () => {
    if(!show ||!carga?.nrc) return
    setLoading(true); setDocentesDisponibles([]); setDocenteSeleccionado(null)

    // 1. DATOS ACTUALES + HORARIOS ORIGEN
    const { data: ca } = await supabase.from('cargaacademica')
   .select(`
        idcargaacad, nrc, idasignatura, idcampocli,
        asignatura(nombre),
        campoclinico!inner(
          idcampocli, ideps, idfilial, idpa, iddocente,
          periodoacademico(codigo,nombre), docente!inner(persona(apellidos,nombres)),
          eps(razonsocial)
        )
      `)
   .eq('nrc', carga.nrc).single()
    
    const { data: horariosOrigen } = await supabase.from('horariodocente').select('dia_semana, hora_inicio, hora_fin').eq('idcampocli', ca.idcampocli)
    const { count: totalOrigen } = await supabase.from('horario').select('idhorario', {count: 'exact', head: true}).eq('idcargaacad', ca.idcargaacad).eq('estado', 'ACTIVO')
    setDataActual({...ca, total_estudiantes: totalOrigen || 0, horarios: horariosOrigen || []})

    // 2. ARRAY ORIGEN PARA COMPARAR = TU "datos_arellano"
    const horariosRequeridos = (horariosOrigen || []).map((h:any) => `${h.dia_semana}|${normalizarHora(h.hora_inicio)}|${normalizarHora(h.hora_fin)}`).sort()

    // 3. TRAER TODOS LOS DOCENTES DEL MISMO EPS/PA/FILIAL
    const { data: docentes } = await supabase.from('docente')
   .select('iddocente, persona(dni, apellidos, nombres)')
   .eq('estado', 'ACTIVO')
   .neq('iddocente', ca.campoclinico.iddocente)

    // 4. VALIDAR 1 POR 1 = TU "datos_aliaga" + EXCEPT
    const resultados = await Promise.all(
      docentes.map(async (d: any) => {
        // 4.1 ¿Tiene campoclinico en ese EPS?
        //const { data: cc } = await supabase.from('campoclinico').select('idcampocli').eq('iddocente', d.iddocente).eq('idpa', ca.campoclinico.idpa).eq('ideps', ca.campoclinico.ideps).eq('idfilial', ca.campoclinico.idfilial).eq('estado','ACTIVO').single()
        const { data: cc } = await supabase.from('campoclinico')
  .select('idcampocli')
  .eq('iddocente', d.iddocente)
  .eq('idpa', ca.campoclinico.idpa)
  .eq('ideps', ca.campoclinico.ideps)
  .eq('idfilial', ca.campoclinico.idfilial)
  .eq('estado','ACTIVO') // <-- AGREGA ESTO
  .single()
        if(!cc) return null

        // 4.2 ¿Tiene los mismos horarios? = TU EXCEPT
        const { data: horariosDest } = await supabase.from('horariodocente').select('dia_semana, hora_inicio, hora_fin').eq('idcampocli', cc.idcampocli)
        const horariosDestino = (horariosDest || []).map((h:any) => `${h.dia_semana}|${normalizarHora(h.hora_inicio)}|${normalizarHora(h.hora_fin)}`).sort()
        
        const sonIguales = JSON.stringify(horariosRequeridos) === JSON.stringify(horariosDestino)
        if(!sonIguales) return null // NO PROCEDE

        // 4.3 ¿Pasa de 5 estudiantes? = REGLA 2
        const { data: cargasDest } = await supabase.from('cargaacademica').select('idcargaacad').eq('idcampocli', cc.idcampocli).eq('idasignatura', ca.idasignatura).eq('estado','ACTIVO')
        let totalDest = 0
        if(cargasDest?.length > 0){
          const { count } = await supabase.from('horario').select('idhorario', {count: 'exact', head: true}).in('idcargaacad', cargasDest.map(c=>c.idcargaacad)).eq('estado','ACTIVO')
          totalDest = count || 0
        }
        if((totalDest + (totalOrigen || 0)) > 5) return null // NO PROCEDE

        // SI PROCEDE
        return { value: d.iddocente, label: `${d.persona.dni} - ${d.persona.apellidos}, ${d.persona.nombres} | ${totalDest} estudiantes` }
      })
    )
    
    setDocentesDisponibles(resultados.filter(Boolean))
    setLoading(false)
  }
  cargarTodo()
}, [show, carga])

// const handleReasignar = async () => {
//   if(!docenteSeleccionado) { showToast('Seleccione un docente', 'error'); return }
//   if(!motivo.trim()) { showToast('Ingrese el motivo', 'error'); return }
//   setLoading(true)

//   try {
//     const campocliActual = dataActual.campoclinico
//     // ESCENARIO 2: USAR CAMPOC EXISTENTE DEL NUEVO DOCENTE
//     const { data: ccNuevo } = await supabase.from('campoclinico').select('idcampocli').eq('iddocente', docenteSeleccionado.value).eq('idpa', campocliActual.idpa).eq('ideps', campocliActual.ideps).eq('idfilial', campocliActual.idfilial).single()

//     // 1. MOVER LA CARGA
//     await supabase.from('cargaacademica').update({ idcampocli: ccNuevo.idcampocli }).eq('idcargaacad', dataActual.idcargaacad)

//     // 2. HISTORIAL
//     await supabase.from('historialreasignacionnrcdocentes').insert({
//       idcargaacad_anterior: dataActual.idcargaacad, idcampocli_anterior: campocliActual.idcampocli, idcampocli_nuevo: ccNuevo.idcampocli,
//       iddocente_anterior: campocliActual.iddocente, iddocente_nuevo: docenteSeleccionado.value, motivo, idusuario: 1
//     })

//     showToast('Reasignación realizada', 'success')
//     setLoading(false); onReasignado(); setTimeout(() => onClose(), 800)
//   } catch (error: any) {
//     showToast('Error: ' + error.message, 'error'); setLoading(false)
//   }
// }

const handleReasignar = async () => {
  
    // 1. PREGUNTARLE A SUPABASE QUIÉN ESTÁ LOGUEADO
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) return toast.error('No hay sesión activa')

  // 2. BUSCAR EN TU TABLA usuario EL idusuario QUE CORRESPONDE A ESE UUID
  const { data: usuarioBD, error: errUser } = await supabase
    .from('usuario')
    .select('idusuario')
    .eq('id', user.id) // user.id = e8e1dfe9-b4bb-439f-aff1-116b...
    .single()

  if (errUser || !usuarioBD) return toast.error('Usuario no registrado en BD')

  const idUsuarioLogueado = usuarioBD.idusuario // Aquí te va a dar 2 porque eres gquispe
  
  
  if(!docenteSeleccionado) { showToast('Seleccione un docente', 'error'); return }
  if(!motivo.trim()) { showToast('Ingrese el motivo', 'error'); return }
  setLoading(true)

  try {
    const campocliActual = dataActual.campoclinico
    
    // 1. Buscar el campoclinico del nuevo docente en ese EPS/PA/FILIAL
    const { data: ccNuevo, error: errCc } = await supabase.from('campoclinico')
      .select('idcampocli, iddocente')
      .eq('iddocente', docenteSeleccionado.value)
      .eq('idpa', campocliActual.idpa)
      .eq('ideps', campocliActual.ideps)
      .eq('idfilial', campocliActual.idfilial)
      .eq('estado', 'ACTIVO')
      .single()
    if(errCc) throw errCc

    // 2. CLAVE: Buscar el idhorariod LABORAL de ese nuevo docente en ese campoclinico
    const { data: horLabNuevo, error: errHor } = await supabase.from('horariodocente')
      .select('idhorariod')
      .eq('idcampocli', ccNuevo.idcampocli)
      .limit(1)
      .single()
    if(errHor) throw new Error('El docente destino no tiene horario laboral registrado en ese campo')

    // 3. MOVER LA CARGA: Actualizar AMBOS campos
    const { error: errUpdate } = await supabase.from('cargaacademica').update({ 
      idcampocli: ccNuevo.idcampocli,
      idhorariod: horLabNuevo.idhorariod // <-- ESTA ES LA LINEA QUE FALTABA
    }).eq('idcargaacad', dataActual.idcargaacad)
    if(errUpdate) throw errUpdate

    // 4. GUARDAR HISTORIAL
    // const { error: errHist } = await supabase.from('historialreasignacionnrcdocentes').insert({
    //   idcargaacad_anterior: dataActual.idcargaacad, 
    //   idcampocli_anterior: campocliActual.idcampocli, 
    //   idcampocli_nuevo: ccNuevo.idcampocli,
    //   iddocente_anterior: campocliActual.iddocente, 
    //   iddocente_nuevo: docenteSeleccionado.value, 
    //   motivo, 
    //   idusuario: 1,
    //   //fecha: new Date().toISOString() // <-- Para que no falle por NOT NULL
    // })
    // 4. GUARDAR HISTORIAL - CON idcargaacad_nuevo
    const { error: errHist } = await supabase.from('historialreasignacionnrcdocentes').insert({
      idcargaacad_anterior: dataActual.idcargaacad, 
      idcargaacad_nuevo: dataActual.idcargaacad, // <-- AGREGA ESTA LINEA. Es la misma carga, solo cambió de docente
      idcampocli_anterior: campocliActual.idcampocli, 
      idcampocli_nuevo: ccNuevo.idcampocli,
      iddocente_anterior: campocliActual.iddocente, 
      iddocente_nuevo: docenteSeleccionado.value, 
      motivo, 
      idusuario: idUsuarioLogueado
    })

    if(errHist) { console.error("ERROR HISTORIAL:", errHist); throw errHist }

    showToast('Reasignación realizada correctamente', 'success')
    setLoading(false); 
    onReasignado(); // Esto refresca tu tabla
    setTimeout(() => onClose(), 800)
    
  } catch (error: any) {
    showToast('Error: ' + error.message, 'error'); 
    setLoading(false)
  }
}

  if(!show) return null
  const p = dataActual?.campoclinico?.docente?.persona
  const docenteActual = p ? `${p.apellidos}, ${p.nombres}` : ''
  const horariosTexto = (dataActual?.horarios || []).map((h:any)=> `${h.dia_semana} ${normalizarHora(h.hora_inicio)}-${normalizarHora(h.hora_fin)}`).join(', ')

  return (
    <div className="modal-overlay">
      {toast && <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 99999, background: toast.type === 'error'? '#EF4444' : '#22C55E', color: '#fff', padding: '1rem 2rem', borderRadius: '0.8rem', fontWeight: 600 }}>{toast.msg}</div>}
      <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{maxWidth: '75rem'}}>
        <div className="modal-header"><h2 style={{display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--color-primario)'}}><UserCheck size={22} /> Reasignar Docente - NRC: {dataActual?.nrc}</h2><button onClick={onClose} className="btn-cerrar-modal"><X size={18} /></button></div>
        <div className="modal-body">
          <fieldset className="fieldset-sgpc-section" style={{background: '#FEF2F2', borderColor: '#FECACA'}}>
            <legend>Situación Actual</legend>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', fontSize: '1.4rem'}}>
              <p><b>Periodo:</b> {dataActual?.campoclinico?.periodoacademico?.codigo}</p><p><b>Asignatura:</b> {dataActual?.asignatura?.nombre}</p>
              <p><b>Docente Actual:</b> {docenteActual}</p><p><b>Total Estudiantes:</b> {dataActual?.total_estudiantes}</p>
              <p style={{gridColumn: '1 / 3'}}><b>Campo Clínico:</b> {dataActual?.campoclinico?.eps?.razonsocial}</p>
              <p style={{gridColumn: '1 / 3'}}><b>Horarios:</b> {horariosTexto}</p>
            </div>
          </fieldset>
          <div style={{textAlign: 'center', margin: '1rem 0'}}><ArrowRight size={24} color='var(--color-primario)' /></div>
          <fieldset className="fieldset-sgpc"><legend>Nuevo Docente *</legend><Select options={docentesDisponibles} value={docenteSeleccionado} onChange={setDocenteSeleccionado} placeholder="Seleccione docente destino..." classNamePrefix="react-select" isLoading={loading} noOptionsMessage={() => 'No hay docentes disponibles con ese horario y EPS'} /></fieldset>
          <fieldset className="fieldset-sgpc"><legend>Motivo de Reasignación *</legend><textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={3} className="input-sgpc" placeholder="Ej: Incapacidad médica del docente" /></fieldset>
        </div>
        <div className="modal-footer" style={{justifyContent: 'center'}}><button className="btn-secundario" onClick={onClose}><X size={16} />Cancelar</button><button className="btn-primario" onClick={handleReasignar} disabled={loading}><Save size={16} />{loading? 'Reasignando...' : 'Confirmar Reasignación'}</button></div>
      </div>
    </div>
  )
}
export default ModalReasignarDocente