'use client'
import { useState, useMemo, useEffect } from 'react'
import { X, Save, Eraser, Clock, BookOpen, Plus, Users, AlertCircle } from 'lucide-react'
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
      <Component options={isAsync? undefined : options} loadOptions={isAsync? loadOptions : undefined} defaultOptions={isAsync} value={selectedOption} onChange={onChange} isDisabled={isDisabled} placeholder="Seleccione..." isSearchable maxMenuHeight={200} classNamePrefix="react-select" getOptionValue={(e:any) => e.value} getOptionLabel={(e:any) => e.label} styles={{ control: (base, state) => ({...base, height: '4.4rem', minHeight: '4.4rem', borderRadius: '0.6rem', border: '1px solid #cbd5e1', background: '#fff', boxShadow: state.isFocused? '0 0 0 1px var(--color-primario)' : 'none', marginTop: '0.4rem', cursor: 'pointer', opacity: isDisabled? 0.6 : 1 }), valueContainer: (base) => ({...base, padding: '0 1.2rem', height: '4.4rem' }), input: (base) => ({...base, margin: 0, padding: 0 }), indicatorsContainer: (base) => ({...base, height: '4.4rem' }), option: (base, state) => ({...base, backgroundColor: state.isSelected? 'var(--color-primario)' : state.isFocused? 'var(--color-acento)' : '#fff', color: state.isSelected? '#fff' : 'var(--color-texto)', padding: '1rem 1.2rem' }), menu: (base) => ({...base, zIndex: 9999, marginTop: '0.4rem' }) }} />
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

  const [horarioAcad, setHorarioAcad] = useState(DIAS_SEMANA.map(d => ({ dia: d, sel: false, horaInicio: '08:00', horaFin: '10:00' })))
  const showToast = (msg: string, type: 'error' | 'success' = 'error') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }
  const diaEstaEnLaboral = (dia: string) => horarioLaboralDoc.some(h => h.dia_semana === dia)
  const getHorasLaboralesDia = (dia: string) => { const reg = horarioLaboralDoc.find(h => h.dia_semana === dia); return reg ? { inicio: reg.hora_inicio, fin: reg.hora_fin } : null }

  useEffect(() => {
    const cargar = async () => {
      if(!show || !dataWizard1?.idpa) { setEstudiantes([]); setHorarioLaboralDoc([]); setTotalMatriculados(0); return }
      const { data: mat } = await supabase.from('matricula').select('idmatricula, idestudiante').eq('idpa', Number(dataWizard1.idpa)).eq('estado', 'MATRICULADO')
      if(mat && mat.length > 0) {
        const ids = mat.map(m => m.idestudiante)
        const { data: est } = await supabase.from('estudiante').select('idestudiante, idpersona').in('idestudiante', ids)
        const idsPer = est?.map(e => e.idpersona) || []
        const { data: pers } = await supabase.from('persona').select('idpersona, dni, apellidos, nombres').in('idpersona', idsPer)
        const lista = mat.map(m => { const e = est?.find(x => x.idestudiante === m.idestudiante); const p = pers?.find(x => x.idpersona === e?.idpersona); return p ? { value: m.idmatricula, label: `${p.dni} - ${p.apellidos}, ${p.nombres}` } : null }).filter(Boolean)
        setEstudiantes(lista)
      } else { setEstudiantes([]) }
      const { data: horLab } = await supabase.from('horariodocente').select('*').eq('idcampocli', dataWizard1.idhorariod)
      setHorarioLaboralDoc(horLab || [])
      const { count } = await supabase.from('horario').select('idhorario, cargaacademica!inner(nrc)', { count: 'exact', head: true }).eq('cargaacademica.nrc', dataWizard1.nrc)
      setTotalMatriculados(count || 0)
    }
    cargar()
  }, [show, dataWizard1])

  useEffect(() => {
    if(!showConfirm && show && dataWizard1?.nrc) {
      const recargarCount = async () => {
        const { count } = await supabase.from('horario').select('idhorario, cargaacademica!inner(nrc)', { count: 'exact', head: true }).eq('cargaacademica.nrc', dataWizard1.nrc)
        setTotalMatriculados(count || 0)
      }
      recargarCount()
    }
  }, [showConfirm, show, dataWizard1])

  const totalSemanal = useMemo(() => horarioAcad.reduce((acc, h) => acc + (h.sel ? calcularHoras(h.horaInicio, h.horaFin) : 0), 0), [horarioAcad])

  const handleGrabar = async () => {
    if(!idMatriculaSel) { showToast('Seleccione un estudiante', 'error'); return }
    const diasSel = horarioAcad.filter(h => h.sel)
    if(diasSel.length === 0) { showToast('Seleccione al menos 1 día', 'error'); return }
    setLoadingW2(true)
    const { data: horInsert, error: errHor } = await supabase.from('horario').insert({ idcargaacad: dataWizard1.idcargaacad, idmatricula: idMatriculaSel, estado: 'ACTIVO' }).select().single()
    if(errHor) { showToast(errHor.message, 'error'); setLoadingW2(false); return }
    const detalleToInsert = diasSel.map(d => ({ idhorario: horInsert.idhorario, dia_semana: d.dia, hora_inicio: d.horaInicio, hora_fin: d.horaFin, estado: 'ACTIVO' }))
     const { error: errDet } = await supabase.from('detallehorario').insert(detalleToInsert)

    if(errDet) showToast(errDet.message, 'error')
    else {
      showToast('Carga académica registrada', 'success')
      setTimeout(() => setShowConfirm(true), 1000)
    }
    setLoadingW2(false)
  }

  if(!show) return null

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        {toast && <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 99999, background: toast.type === 'error'? '#EF4444' : '#22C55E', color: '#fff', padding: '1.2rem 2.4rem', borderRadius: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.8rem' }}><AlertCircle size={18}/>{toast.msg}</div>}
        <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{maxWidth: '90rem'}}>
          <div className="modal-header">
            {/* TITULO PRINCIPAL: NEGRITA Y MAS GRANDE */}
            <p className="titulo-principal"><BookOpen size={24} /> Registro de Horario Académico</p>
            <button onClick={onClose} className="btn-cerrar-modal"><X size={18} /></button>
          </div>
          <div className="modal-body">
            {/* DATOS DE LA CARGA */}
            <fieldset className="fieldset-sgpc-section">
  <legend className="legend-sgpc-titulo">Datos de la Carga</legend>
  <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', alignItems: 'stretch'}}>
    {/* COLUMNA IZQUIERDA */}
    <div>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem'}}>
        <div><label className="label-sgpc">Docente</label><p className="text-bold">{dataWizard1?.docente}</p></div>
        <div><label className="label-sgpc">DNI</label><p className="text-bold">{dataWizard1?.dni}</p></div>
        <div style={{gridColumn: '1 / 3'}}><label className="label-sgpc">Asignatura</label><p className="text-bold">{dataWizard1?.asignatura}</p></div>
      </div>
    </div>

    {/* COLUMNA DERECHA: CARD CON NRC + BADGE */}
    <div className="card-nrc-badge">
      <div style={{textAlign: 'center'}}>
        <label className="label-sgpc">NRC</label>
        <div className="nrc-box">{dataWizard1?.nrc}</div>
      </div>
      <span className="badge-sgpc-primario">Estudiantes Matriculados: {totalMatriculados}</span>
    </div>
  </div>
</fieldset>
            <fieldset className="fieldset-sgpc-section">
              {/* LEYENDA: NEGRITA Y MAS GRANDE */}
              <legend className="legend-sgpc-titulo"><Clock size={18}/> Horario Laboral del Docente</legend>
              <div className="table-responsive">
                <table className='tabla-sgpc'>
                  <thead><tr><th>N°</th><th>Día</th><th>Hora Inicio</th><th>Hora Final</th></tr></thead>
                  <tbody>
                    {horarioLaboralDoc.length > 0 ? horarioLaboralDoc.map((h:any,i:number)=><tr key={i}><td>{i+1}</td><td>{h.dia_semana}</td><td>{h.hora_inicio}</td><td>{h.hora_fin}</td></tr>) : <tr><td colSpan={4} style={{textAlign: 'center', color: '#EF4444'}}>No se encontró horario laboral para el docente</td></tr>}
                  </tbody>
                </table>
              </div>
            </fieldset>
            <fieldset className="fieldset-sgpc-section">
              {/* LEYENDA: NEGRITA Y MAS GRANDE */}
              <legend className="legend-sgpc-titulo">Horario Académico de la Asignatura</legend>
              <p className="text-muted" style={{marginBottom: '1rem'}}>Marque los días y horas. Solo se habilitan días dentro del horario laboral.</p>
              <div style={{border: '1px solid #cbd5e1', borderRadius: '0.8rem', overflow: 'hidden'}}>
                <div style={{display: 'grid', gridTemplateColumns: '5rem 12rem 1fr 1fr 1fr 12rem', background: 'var(--color-primario)', padding: '1.2rem', color: '#fff', fontWeight: 600}}>
                  <span>Sel</span><span>Día</span><span>Hora Inicio</span><span></span><span>Hora Final</span><span style={{textAlign: 'center'}}>Total Día</span>
                </div>
                {horarioAcad.map((h,i) => {
                  const enLaboral = diaEstaEnLaboral(h.dia)
                  const horasLab = getHorasLaboralesDia(h.dia)
                  return (
                    <div key={h.dia} style={{ display: 'grid', gridTemplateColumns: '5rem 12rem 1fr 1fr 1fr 12rem', padding: '1rem', borderTop: '1px solid #e5e7eb', alignItems: 'center', background: !enLaboral ? '#f8fafc' : '#fff', opacity: !enLaboral ? 0.5 : 1 }}>
                      <input type="checkbox" disabled={!enLaboral} checked={h.sel} onChange={() => setHorarioAcad(prev => prev.map((p,idx)=> idx===i? {...p, sel: !p.sel} : p))} />
                      <span style={{fontWeight: 600}}>{h.dia} {!enLaboral && <span style={{color: '#EF4444', fontSize: '1.1rem'}}>(No labora)</span>}</span>
                      <input type="time" value={h.horaInicio} min={horasLab?.inicio} max={horasLab?.fin} disabled={!h.sel || !enLaboral} onChange={e => setHorarioAcad(prev => prev.map((p,idx)=> idx===i? {...p, horaInicio: e.target.value} : p))} className="input-sgpc" />
                      <span style={{textAlign: 'center'}}>a</span>
                      <input type="time" value={h.horaFin} min={horasLab?.inicio} max={horasLab?.fin} disabled={!h.sel || !enLaboral} onChange={e => setHorarioAcad(prev => prev.map((p,idx)=> idx===i? {...p, horaFin: e.target.value} : p))} className="input-sgpc" />
                      <span style={{fontWeight: 600, textAlign: 'center'}}>{h.sel ? `${calcularHoras(h.horaInicio, h.horaFin).toFixed(2)} hrs` : '0.00 hrs'}</span>
                    </div>
                  )
                })}
                <div style={{textAlign: 'right', padding: '1.2rem', fontWeight: 700, background: '#eff6ff', borderTop: '2px solid var(--color-primario)', fontSize: '1.6rem'}}>Total Semanal: {totalSemanal.toFixed(2)} Horas</div>
              </div>
            </fieldset>
            <fieldset className="fieldset-sgpc-section">
              {/* LEYENDA: NEGRITA Y MAS GRANDE */}
              <legend className="legend-sgpc-titulo"><Users size={18}/> Estudiante Matriculado</legend>
              <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                <div style={{flex: 1}}>
                  <SelectSGPCFieldset label="DNI + Estudiante *" value={idMatriculaSel} onChange={setIdMatriculaSel} options={estudiantes} />
                </div>
                <span className="badge-sgpc-info">En BD: {estudiantes.length}</span>
              </div>
              {estudiantes.length === 0 && <p style={{color: '#EF4444', marginTop: '0.8rem', fontSize: '1.3rem'}}>No hay estudiantes matriculados activos para el periodo</p>}
            </fieldset>
          </div>
          <div className="modal-footer" style={{justifyContent: 'center', gap: '1.6rem'}}>
            <button className="btn-secundario" onClick={() => setHorarioAcad(DIAS_SEMANA.map(d => ({ dia: d, sel: false, horaInicio: '08:00', horaFin: '10:00' })))}><Eraser size={16} />Limpiar</button>
            <button className="btn-primario" onClick={handleGrabar} disabled={loadingW2}><Save size={16} />{loadingW2 ? 'Grabando...' : 'Grabar Horario'}</button>
          </div>
        </div>
      </div>
      {showConfirm && (
        <div className="modal-overlay" style={{zIndex: 10000}}>
          <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{maxWidth: '45rem'}}>
            <div className="modal-header"><h2>¿Desea Registrar otro estudiante?</h2></div>
            <div className="modal-body"><p>La carga del estudiante anterior se guardó correctamente.</p></div>
            <div className="modal-footer" style={{justifyContent: 'center', gap: '1.6rem'}}>
              
              <button className="btn-secundario" onClick={() => { setIdMatriculaSel(null); setShowConfirm(false)}}> <Plus size={16} />Sí, Agregar Otro</button>
              <button className="btn-primario" onClick={() => { setShowConfirm(false); onClose() }}><X size={16} />Terminar</button>
            </div>
          </div>
        </div>
      )}
      {/* ESTILOS NUEVOS */}
      <style jsx>{`
  .titulo-principal { font-size: 2.4rem; font-weight: 800; color: var(--color-primario); display: flex; align-items: center; gap: 0.8rem; }
  .legend-sgpc-titulo { font-size: 1.8rem !important; font-weight: 700 !important; color: var(--color-texto); display: flex; align-items: center; gap: 0.6rem; }
  
  /* NUEVO: CARD PARA NRC Y BADGE */
  .card-nrc-badge {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 1.2rem;
    padding: 1.6rem;
    background: #FFF7ED; /* Fondo naranja clarito */
    border: 2px solid #FED7AA;
    border-radius: 1.2rem;
  }

  /* NUEVO: NRC DENTRO DE RECUADRO */
  .nrc-box {
    font-size: 2.6rem;
    font-weight: 800;
    color: #D97706; /* Naranja fuerte */
    background: #fff;
    border: 2px dashed #F59E0B;
    border-radius: 0.8rem;
    padding: 0.8rem 1.6rem;
    min-width: 14rem;
    text-align: center;
    letter-spacing: 1px;
  }

  .badge-sgpc-primario {
    background: var(--color-primario);
    color: #fff;
    padding: 1rem 0.5rem;
    border-radius: 10px;
    font-size: 1.5rem;
    font-weight: 700;
    text-align: center;
    box-shadow: 0 2px 4px -1px rgb(0 0 0 / 0.1);
    width: 100%;
  }
  .badge-sgpc-info { background: #dbeafe; color: #1e40af; padding: 0.6rem 1.2rem; border-radius: 20px; font-size: 1.3rem; font-weight: 600; white-space: nowrap; }
  .text-bold { font-weight: 600; font-size: 1.5rem; }
  .label-sgpc { font-size: 1.2rem; color: #64748b; margin-bottom: 0.4rem; display: block; font-weight: 500; }
`}</style>
    </>
  )
}
export default ModalHorarioAcademico