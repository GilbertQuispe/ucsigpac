'use client'
import { useState, useMemo, useEffect } from 'react'
import { X, Save, Eraser, Clock, BookOpen, Plus, Users, AlertCircle, Lock } from 'lucide-react'
import { createClient } from '@/lib/client'
import AsyncSelect from 'react-select/async'
import Select from 'react-select'

const supabase = createClient()
const DIAS_SEMANA = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO']

const calcularHoras = (ini: string, fin: string) => {
  const [h1, m1] = ini.split(':').map(Number)
  const [h2, m2] = fin.split(':').map(Number)
  return Math.max(0, (h2 + m2/60) - (h1 + m1/60))
}

const SelectSGPCFieldset = ({label, value, onChange, options, isDisabled = false, isAsync = false, loadOptions}:any) => {
  const Component = isAsync? AsyncSelect : Select
  const selectedOption = isAsync? value : options.find((o:any) => o.value === value?.value) || value || null
  return (
    <fieldset className="fieldset-sgpc">
      <legend>{label}</legend>
      <Component options={isAsync? undefined : options} loadOptions={isAsync? loadOptions : undefined} defaultOptions={isAsync} value={selectedOption} onChange={onChange} isDisabled={isDisabled} placeholder="Seleccione..." isSearchable maxMenuHeight={200} classNamePrefix="react-select" getOptionValue={(e:any) => e.value} getOptionLabel={(e:any) => e.label} styles={{ control: (base, state) => ({...base, height: '3.8rem', minHeight: '3.8rem', borderRadius: '0.6rem', border: '1px solid #cbd5e1', background: '#fff', boxShadow: state.isFocused? '0 0 0 1px var(--color-primario)' : 'none', marginTop: '0.4rem', cursor: 'pointer', opacity: isDisabled? 0.6 : 1, fontSize: '1.3rem' }), valueContainer: (base) => ({...base, padding: '0 1rem', height: '3.8rem' }), input: (base) => ({...base, margin: 0, padding: 0 }), indicatorsContainer: (base) => ({...base, height: '3.8rem' }), option: (base, state) => ({...base, backgroundColor: state.isSelected? 'var(--color-primario)' : state.isFocused? 'var(--color-acento)' : '#fff', color: state.isSelected? '#fff' : 'var(--color-texto)', padding: '0.8rem 1rem', fontSize: '1.3rem' }), menu: (base) => ({...base, zIndex: 9999, marginTop: '0.4rem' }) }} />
    </fieldset>
  )
}

const ModalHorarioAcademico = ({ show, onClose, dataWizard1 }: any) => {
  const [loadingW2, setLoadingW2] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null)
  const [estudiantes, setEstudiantes] = useState<any[]>([])
  const [idMatriculaSel, setIdMatriculaSel] = useState<number | null>(null)
  const [horarioLaboralDoc, setHorarioLaboralDoc] = useState<any[]>([])
  const [showConfirm, setShowConfirm] = useState(false)
  const [totalMatriculados, setTotalMatriculados] = useState(0)
  const [horariosRegistrados, setHorariosRegistrados] = useState<any[]>([])

  const [horarioAcad, setHorarioAcad] = useState(DIAS_SEMANA.map(d => ({ dia: d, sel: false, horaInicio: '08:00', horaFin: '10:00' })))
  const showToast = (msg: string, type: 'error' | 'success' = 'error') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }
  const diaEstaEnLaboral = (dia: string) => horarioLaboralDoc.some(h => h.dia_semana === dia)
  const getHorasLaboralesDia = (dia: string) => { const reg = horarioLaboralDoc.find(h => h.dia_semana === dia); return reg? { inicio: reg.hora_inicio, fin: reg.hora_fin } : null }

  const esSoloLectura = dataWizard1?.esSoloLectura || false

 useEffect(() => {
  const cargar = async () => {
    setIdMatriculaSel(null)
    if(!show ||!dataWizard1?.idpa ||!dataWizard1?.iddocente ||!dataWizard1?.nrc) {
      setEstudiantes([]); setHorarioLaboralDoc([]); setTotalMatriculados(0); setHorariosRegistrados([]);
      setHorarioAcad(DIAS_SEMANA.map(d => ({ dia: d, sel: false, horaInicio: '08:00', horaFin: '10:00' })))
      return
    }

    const { data: horLab } = await supabase.from('horariodocente').select(`*, campoclinico:idcampocli!inner(iddocente, idpa)`).eq('campoclinico.iddocente', dataWizard1.iddocente).eq('campoclinico.idpa', dataWizard1.idpa)
    setHorarioLaboralDoc(horLab || [])

    const { data: mat } = await supabase.from('matricula').select('idmatricula, idestudiante').eq('idpa', Number(dataWizard1.idpa)).eq('estado', 'MATRICULADO')
    if(mat && mat.length > 0) {
      const ids = mat.map(m => m.idestudiante)
      const { data: est } = await supabase.from('estudiante').select('idestudiante, idpersona').in('idestudiante', ids)
      const idsPer = est?.map(e => e.idpersona) || []
      const { data: pers } = await supabase.from('persona').select('idpersona, dni, apellidos, nombres').in('idpersona', idsPer)
      const lista = mat.map(m => { const e = est?.find(x => x.idestudiante === m.idestudiante); const p = pers?.find(x => x.idpersona === e?.idpersona); return p? { value: m.idmatricula, label: `${p.dni} - ${p.apellidos}, ${p.nombres}` } : null }).filter(Boolean)
      setEstudiantes(lista)
    } else { setEstudiantes([]) }

    const idParaBuscar = esSoloLectura? dataWizard1.idcargaacad_referencia : dataWizard1.idcargaacad

    const { data: horRegistrados } = await supabase.from('horario')
 .select(`*, matricula!inner(idmatricula, estudiante!inner(idpersona, persona!inner(dni, apellidos, nombres))), detallehorario(*)`)
 .eq('idcargaacad', idParaBuscar)
 .eq('estado', 'ACTIVO')

    setHorariosRegistrados(horRegistrados || [])
    setTotalMatriculados(horRegistrados?.length || 0)

    if(esSoloLectura && horRegistrados && horRegistrados.length > 0) {
      const primerHorario = horRegistrados[0]
      const detalle = primerHorario.detallehorario || []
      const nuevoHorario = DIAS_SEMANA.map(d => {
        const det = detalle.find((x:any) => x.dia_semana === d)
        return det? { dia: d, sel: true, horaInicio: det.hora_inicio, horaFin: det.hora_fin } : { dia: d, sel: false, horaInicio: '08:00', horaFin: '10:00' }
      })
      setHorarioAcad(nuevoHorario)
      showToast('Horario heredado del NRC. Solo puede agregar estudiantes.', 'success')
    } else {
      setHorarioAcad(DIAS_SEMANA.map(d => ({ dia: d, sel: false, horaInicio: '08:00', horaFin: '10:00' })))
    }

  }
  cargar()
}, [show, dataWizard1])

  const totalSemanal = useMemo(() => horarioAcad.reduce((acc, h) => acc + (h.sel? calcularHoras(h.horaInicio, h.horaFin) : 0), 0), [horarioAcad])

const handleGrabar = async () => {
    if(!idMatriculaSel) { showToast('Seleccione un estudiante', 'error'); return }
    const diasSel = horarioAcad.filter(h => h.sel)
    if(!esSoloLectura && diasSel.length === 0) {
      showToast('Seleccione al menos 1 día', 'error');
      return
    }
    setLoadingW2(true)

    const { data: existeEnNrc } = await supabase.from('horario').select('idhorario').eq('idmatricula', idMatriculaSel).eq('idcargaacad', dataWizard1.idcargaacad).eq('estado', 'ACTIVO').maybeSingle()
    if(existeEnNrc) {
      showToast('Este estudiante ya está registrado en este NRC para el periodo', 'error')
      setIdMatriculaSel(null)
      setLoadingW2(false)
      return
    }

    const { data: existeEnAsignatura } = await supabase.from('horario').select(`idhorario, cargaacademica!inner(idasignatura, horariodocente!inner(campoclinico!inner(idpa)))`).eq('idmatricula', idMatriculaSel).eq('cargaacademica.idasignatura', dataWizard1.idasignatura).eq('cargaacademica.horariodocente.campoclinico.idpa', dataWizard1.idpa).eq('estado', 'ACTIVO').maybeSingle()
    if(existeEnAsignatura) {
      showToast('Este estudiante ya está matriculado en esta Asignatura para el periodo', 'error')
      setIdMatriculaSel(null)
      setLoadingW2(false)
      return
    }

    const { data: horInsert, error: errHor } = await supabase.from('horario').insert({ idcargaacad: dataWizard1.idcargaacad, idmatricula: idMatriculaSel, estado: 'ACTIVO' }).select().single()
    if(errHor) { showToast(errHor.message, 'error'); setLoadingW2(false); return }

    if(!esSoloLectura) {
      const detalleToInsert = diasSel.map(d => ({ idhorario: horInsert.idhorario, dia_semana: d.dia, hora_inicio: d.horaInicio, hora_fin: d.horaFin, estado: 'ACTIVO' }))
      const { error: errDet } = await supabase.from('detallehorario').insert(detalleToInsert)
      if(errDet) { showToast(errDet.message, 'error'); setLoadingW2(false); return }
    }

    setTotalMatriculados(prev => prev + 1)
    const idParaBuscar = esSoloLectura? dataWizard1.idcargaacad_referencia : dataWizard1.idcargaacad
    const { data: horRecarga } = await supabase.from('horario').select(`*, matricula!inner(idmatricula, estudiante!inner(idpersona, persona!inner(dni, apellidos, nombres)))`).eq('idcargaacad', idParaBuscar).eq('estado', 'ACTIVO')
    setHorariosRegistrados(horRecarga || [])

    showToast('Estudiante agregado al NRC', 'success')    
    setIdMatriculaSel(null)
    setShowConfirm(true)
    setLoadingW2(false)
  }

  if(!show) return null

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        {toast && <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 99999, background: toast.type === 'error'? '#EF4444' : '#22C55E', color: '#fff', padding: '1rem 2rem', borderRadius: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '1.4rem' }}><AlertCircle size={16}/>{toast.msg}</div>}
        <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{maxWidth: '75rem', maxHeight: '90vh', display: 'flex', flexDirection: 'column'}}>
          
          {/* HEADER MAS COMPACTO */}
          <div className="modal-header" style={{padding: '1.2rem 2rem'}}> 
            <p className="titulo-principal"><BookOpen size={18} /> Registro de Horario Académico</p>
            <button onClick={onClose} className="btn-cerrar-modal"><X size={16} /></button>
          </div>

          {/* DATOS DE LA CARGA DENTRO DEL SCROLL Y MAS COMPACTO */}
          <div className="modal-body" style={{overflowY: 'auto', padding: '1.2rem 2rem'}}> 
           
            <fieldset className="fieldset-sgpc-section" style={{marginBottom: '1.2rem'}}>
              <legend className="legend-sgpc-titulo">Datos de la Carga</legend>
              <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.2rem', alignItems: 'center'}}>
                <div>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.8rem'}}>
                    <div><label className="label-sgpc">Docente</label><p className="text-bold">{dataWizard1?.docente}</p></div>
                    <div><label className="label-sgpc">DNI</label><p className="text-bold">{dataWizard1?.dni}</p></div>
                    <div style={{gridColumn: '1 / 3'}}><label className="label-sgpc">Asignatura</label><p className="text-bold">{dataWizard1?.asignatura}</p></div>
                  </div>
                </div>
                {/* CARD NRC MAS PEQUEÑO */}
                <div className="card-nrc-badge">
                  <div style={{textAlign: 'center'}}><label className="label-sgpc" style={{fontSize: '1rem'}}>NRC</label><div className="nrc-box">{dataWizard1?.nrc}</div></div>
                  <span className="badge-sgpc-primario">Est: {totalMatriculados}</span>
                </div>
              </div>
            </fieldset>

            {horariosRegistrados.length > 0 && (
              <fieldset className="fieldset-sgpc-section">
                <legend className="legend-sgpc-titulo"><Users size={16}/> Estudiantes ya registrados en este NRC</legend>
                <div className="table-responsive">
                  <table className='tabla-sgpc'>
                    <thead><tr><th>#</th><th>DNI</th><th>Estudiante</th></tr></thead>
                    <tbody>
                      {horariosRegistrados.map((h:any,i:number)=>
                        <tr key={h.idhorario}>
                          <td>{i+1}</td>
                          <td>{h.matricula?.estudiante?.persona?.dni}</td>
                          <td>{h.matricula?.estudiante?.persona?.apellidos}, {h.matricula?.estudiante?.persona?.nombres}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </fieldset>
            )}

            <fieldset className="fieldset-sgpc-section">
              <legend className="legend-sgpc-titulo"><Clock size={16}/> Horario Laboral del Docente</legend>
              <div className="table-responsive">
                <table className='tabla-sgpc'>
                  <thead><tr><th>N°</th><th>Día</th><th>Inicio</th><th>Final</th></tr></thead>
                  <tbody>
                    {horarioLaboralDoc.length > 0 ? horarioLaboralDoc.map((h:any,i:number)=><tr key={i}><td>{i+1}</td><td>{h.dia_semana}</td><td>{h.hora_inicio}</td><td>{h.hora_fin}</td></tr>) : <tr><td colSpan={4} style={{textAlign: 'center', color: '#EF4444'}}>No se encontró horario laboral</td></tr>}
                  </tbody>
                </table>
              </div>
            </fieldset>

            <fieldset className="fieldset-sgpc-section">
              <legend className="legend-sgpc-titulo">Horario Académico {esSoloLectura && <span style={{fontSize: '1.2rem', color: '#64748b'}}>- Heredado <Lock size={12}/></span>}</legend>
              <p className="text-muted" style={{marginBottom: '0.8rem', fontSize: '1.2rem'}}>Marque días y horas. Solo días dentro del horario laboral.</p>
              <div style={{border: '1px solid #cbd5e1', borderRadius: '0.8rem', overflow: 'hidden'}}>
                <div style={{display: 'grid', gridTemplateColumns: '4rem 18rem 9rem 4rem 9rem 10rem', background: 'var(--color-primario)', padding: '0.8rem', color: '#fff', fontWeight: 500, fontSize: '1.2rem'}}>
                  <span>Sel</span><span>Día</span><span>Inicio</span><span></span><span>Final</span><span style={{textAlign: 'center'}}>Total</span>
                </div>
                {horarioAcad.map((h,i) => {
                  const enLaboral = diaEstaEnLaboral(h.dia)
                  const horasLab = getHorasLaboralesDia(h.dia)
                  return (
                    <div key={h.dia} style={{ display: 'grid', gridTemplateColumns: '4rem 18rem 9rem 4rem 9rem 10rem', padding: '0.6rem', borderTop: '1px solid #e5e7eb', alignItems: 'center', background: !enLaboral ? '#f8fafc' : '#fff', opacity: !enLaboral || esSoloLectura ? 0.5 : 1, fontSize: '1.3rem' }}>
                      <input type="checkbox" disabled={!enLaboral || esSoloLectura} checked={h.sel} onChange={() => setHorarioAcad(prev => prev.map((p,idx)=> idx===i? {...p, sel: !p.sel} : p))} />
                      <span style={{fontWeight: 400}}>{h.dia} {!enLaboral && <span style={{color: '#EF4444', fontSize: '1rem'}}>(No labora)</span>}</span>
                      <input type="time" value={h.horaInicio} min={horasLab?.inicio} max={horasLab?.fin} disabled={!h.sel || !enLaboral || esSoloLectura} onChange={e => setHorarioAcad(prev => prev.map((p,idx)=> idx===i? {...p, horaInicio: e.target.value} : p))} className="input-sgpc" style={{height: '3.2rem', fontSize: '1.2rem'}} />
                      <span style={{textAlign: 'center'}}>a</span>
                      <input type="time" value={h.horaFin} min={horasLab?.inicio} max={horasLab?.fin} disabled={!h.sel || !enLaboral || esSoloLectura} onChange={e => setHorarioAcad(prev => prev.map((p,idx)=> idx===i? {...p, horaFin: e.target.value} : p))} className="input-sgpc" style={{height: '3.2rem', fontSize: '1.2rem'}} />
                      <span style={{fontWeight: 400, textAlign: 'center'}}>{h.sel ? `${calcularHoras(h.horaInicio, h.horaFin).toFixed(1)}h` : '0.0h'}</span>
                    </div>
                  )
                })}
                <div style={{textAlign: 'right', padding: '1rem', fontWeight: 600, background: '#eff6ff', borderTop: '2px solid var(--color-primario)', fontSize: '1.3rem'}}>Total: {totalSemanal.toFixed(2)} Horas</div>
              </div>
            </fieldset>

            <fieldset className="fieldset-sgpc-section">
              <legend className="legend-sgpc-titulo"><Users size={16}/> Agregar Estudiante</legend>
              <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                <div style={{flex: 1}}>
                  <SelectSGPCFieldset label="DNI + Estudiante *" value={estudiantes.find(e => e.value === idMatriculaSel) || null} onChange={(opt:any) => setIdMatriculaSel(opt?.value || null)} options={estudiantes} isDisabled={false} />
                </div>
                <span className="badge-sgpc-info">Matriculados: {estudiantes.length}</span>
              </div>
              {estudiantes.length === 0 && <p style={{color: '#EF4444', marginTop: '0.8rem', fontSize: '1.2rem'}}>No hay estudiantes matriculados</p>}
            </fieldset>
          </div>
          <div className="modal-footer" style={{justifyContent: 'center', gap: '1.2rem', padding: '1.2rem 2rem'}}>
            <button className="btn-secundario" onClick={() => { setHorarioAcad(DIAS_SEMANA.map(d => ({ dia: d, sel: false, horaInicio: '08:00', horaFin: '10:00' }))); setIdMatriculaSel(null); }} disabled={false}><Eraser size={14} />Limpiar</button>
            <button className="btn-primario" onClick={handleGrabar} disabled={loadingW2}><Save size={14} />{loadingW2 ? 'Grabando...' : 'Grabar Horario'}</button>
          </div>
        </div>
      </div>
      {showConfirm && (
        <div className="modal-overlay" style={{zIndex: 10000}}>
          <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{maxWidth: '40rem'}}>
            <div className="modal-header"><h2 style={{fontSize: '1.8rem'}}>¿Desea Registrar otro estudiante?</h2></div>
            <div className="modal-body"><p style={{fontSize: '1.4rem'}}>El horario se guardó correctamente.</p></div>
            <div className="modal-footer" style={{justifyContent: 'center', gap: '1.2rem'}}>
              <button className="btn-secundario" onClick={() => { setIdMatriculaSel(null); setShowConfirm(false)}}> <Plus size={14} />Sí, Agregar Otro</button>
              <button className="btn-primario" onClick={() => { setShowConfirm(false); onClose() }}><X size={14} />Terminar</button>
            </div>
          </div>
        </div>
      )}
       <style jsx>{`
        .titulo-principal { font-size: 1.8rem; font-weight: 700; color: var(--color-primario); display: flex; align-items: center; gap: 0.8rem; }
        .legend-sgpc-titulo { font-size: 1.5rem !important; font-weight: 700 !important; color: var(--color-texto); display: flex; align-items: center; gap: 0.6rem; }
        .card-nrc-badge { display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 0.6rem; padding: 0.8rem; background: #FFF7ED; border: 2px solid #FED7AA; border-radius: 0.8rem; }
        .nrc-box { font-size: 1.8rem; font-weight: 800; color: #D97706; background: #fff; border: 2px dashed #F59E0B; border-radius: 0.6rem; padding: 0.4rem 1rem; min-width: 10rem; text-align: center; letter-spacing: 1px; }
        .badge-sgpc-primario { background: var(--color-primario); color: #fff; padding: 0.6rem 0.5rem; border-radius: 8px; font-size: 1.2rem; font-weight: 700; text-align: center; box-shadow: 0 2px 4px -1px rgb(0 0 0 / 0.1); width: 100%; }
        .badge-sgpc-info { background: #dbeafe; color: #1e40af; padding: 0.5rem 1rem; border-radius: 20px; font-size: 1.2rem; font-weight: 600; white-space: nowrap; }
        .text-bold { font-weight: 600; font-size: 1.3rem; }
        .label-sgpc { font-size: 1.1rem; color: #64748b; margin-bottom: 0.3rem; display: block; font-weight: 500; }
        .input-sgpc { height: 3.2rem !important; padding: 0 0.8rem !important; font-size: 1.2rem !important; }
        .fieldset-sgpc-section { border: 1px solid #e5e7eb; border-radius: 0.8rem; padding: 1.2rem; margin-bottom: 1.2rem; }
        @media (max-width: 768px) {
          .modal-content { maxWidth: 95vw !important; }
        }
      `}</style>
    </>
  )
}
export default ModalHorarioAcademico