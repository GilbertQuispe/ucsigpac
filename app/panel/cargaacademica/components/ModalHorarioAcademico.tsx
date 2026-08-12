'use client'
import { useState, useMemo, useEffect } from 'react'
import { X, Save, Eraser, Clock, BookOpen, Plus } from 'lucide-react'
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
      <Component
        options={isAsync? undefined : options}
        loadOptions={isAsync? loadOptions : undefined}
        defaultOptions={isAsync}
        value={selectedOption}
        onChange={onChange}
        isDisabled={isDisabled} 
        placeholder="Seleccione..." 
        isSearchable 
        maxMenuHeight={200}
        classNamePrefix="react-select" 
        getOptionValue={(e:any) => e.value} 
        getOptionLabel={(e:any) => e.label}
        styles={{ 
          control: (base, state) => ({...base, height: '4.4rem', minHeight: '4.4rem', borderRadius: '0.6rem', border: '1px solid #cbd5e1', background: '#fff', boxShadow: state.isFocused? '0 0 0 1px var(--color-primario)' : 'none', marginTop: '0.4rem', cursor: 'pointer', opacity: isDisabled? 0.6 : 1 }), 
          valueContainer: (base) => ({...base, padding: '0 1.2rem', height: '4.4rem' }), 
          input: (base) => ({...base, margin: 0, padding: 0 }), 
          indicatorsContainer: (base) => ({...base, height: '4.4rem' }), 
          option: (base, state) => ({...base, backgroundColor: state.isSelected? 'var(--color-primario)' : state.isFocused? 'var(--color-acento)' : '#fff', color: state.isSelected? '#fff' : 'var(--color-texto)', padding: '1rem 1.2rem' }), 
          menu: (base) => ({...base, zIndex: 9999, marginTop: '0.4rem' }) 
        }}
      />
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

  const [horarioAcad, setHorarioAcad] = useState(
    DIAS_SEMANA.map(d => ({ dia: d, sel: false, horaInicio: '08:00', horaFin: '10:00' }))
  )

  const showToast = (msg: string, type: 'error' | 'success' = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    const cargar = async () => {
      if(!show || !dataWizard1?.idpa) {
        setEstudiantes([])
        setHorarioLaboralDoc([])
        return
      }
      
      console.log("Buscando CON idpa:", dataWizard1.idpa)

      // SOLO ESTAS 2 COLUMNAS. NADA MAS
      const { data: mat, error: errMat } = await supabase
       .from('matricula')
       .select('idmatricula, idestudiante')
       .eq('idpa', Number(dataWizard1.idpa))
       .eq('estado', 'MATRICULADO')

      if(errMat){ 
        console.error("Error matricula:", errMat) 
        showToast("Error: " + errMat.message)
        return 
      }
      console.log("Matriculas encontradas:", mat)

      if(!mat || mat.length === 0){ 
        setEstudiantes([]); 
        return 
      }

      const ids = mat.map(m => m.idestudiante)
      const { data: est } = await supabase.from('estudiante').select('idestudiante, idpersona').in('idestudiante', ids)
      const idsPer = est?.map(e => e.idpersona) || []
      const { data: pers } = await supabase.from('persona').select('idpersona, dni, apellidos, nombres').in('idpersona', idsPer)

      const lista = mat.map(m => {
        const e = est?.find(x => x.idestudiante === m.idestudiante)
        const p = pers?.find(x => x.idpersona === e?.idpersona)
        return p ? { value: m.idmatricula, label: `${p.dni} - ${p.apellidos}, ${p.nombres}` } : null
      }).filter(Boolean)
      
      setEstudiantes(lista)

      // CARGAR HORARIO LABORAL
      const { data: horLab } = await supabase.from('horariodocente').select('*').eq('idcampocli', dataWizard1.idhorariod)
      setHorarioLaboralDoc(horLab || [])
    }
    cargar()
  }, [show, dataWizard1])

  const totalSemanal = useMemo(() =>
    horarioAcad.reduce((acc, h) => acc + (h.sel ? calcularHoras(h.horaInicio, h.horaFin) : 0), 0)
  , [horarioAcad])

  const handleGrabar = async () => {
    if(!idMatriculaSel) { showToast('Seleccione un estudiante', 'error'); return }
    const diasSel = horarioAcad.filter(h => h.sel)
    if(diasSel.length === 0) { showToast('Seleccione al menos 1 día', 'error'); return }

    setLoadingW2(true)

    const { data: horInsert, error: errHor } = await supabase
     .from('horario')
     .insert({ idcargaacad: dataWizard1.idcargaacad, idmatricula: idMatriculaSel, estado: 'ACTIVO' })
     .select().single()

    if(errHor) { showToast(errHor.message, 'error'); setLoadingW2(false); return }

    const detalleToInsert = diasSel.map(d => ({
      idhorario: horInsert.idhorario,
      dia_semana: d.dia,
      hora_inicio: d.horaInicio,
      hora_fin: d.horaFin,
      estado: 'ACTIVO'
    }))

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
        {toast && <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 99999, background: toast.type === 'error'? '#EF4444' : '#22C55E', color: '#fff', padding: '1.2rem 2.4rem', borderRadius: '0.8rem', fontWeight: 600 }}>{toast.msg}</div>}

        <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{maxWidth: '110rem'}}>
          <div className="modal-header">
            <h2 style={{display: 'flex', alignItems: 'center', gap: '0.8rem'}}><BookOpen size={22} /> Registro de Horario</h2>
            <button onClick={onClose} className="btn-cerrar-modal"><X size={18} /></button>
          </div>

          <div className="modal-body">
            <fieldset className="fieldset-sgpc-section">
              <legend>Datos de la Carga</legend>
              <p><b>Docente:</b> {dataWizard1?.docente} - DNI: {dataWizard1?.dni}</p>
              <p><b>Asignatura:</b> {dataWizard1?.asignatura} - <b>NRC:</b> {dataWizard1?.nrc} - <b>Grupo:</b> {dataWizard1?.grupo}</p>
            </fieldset>

            <fieldset className="fieldset-sgpc-section">
              <legend>Horario Laboral del Docente</legend>
              <table className='tabla-sgpc'>
                <thead><tr><th>N°</th><th>Día</th><th>Hora Inicio</th><th>Hora Final</th></tr></thead>
                <tbody>
                  {horarioLaboralDoc.length > 0 
                    ? horarioLaboralDoc.map((h:any,i:number)=><tr key={i}><td>{i+1}</td><td>{h.dia_semana}</td><td>{h.hora_inicio}</td><td>{h.hora_fin}</td></tr>)
                    : <tr><td colSpan={4} style={{textAlign: 'center', color: '#EF4444'}}>No se encontró horario laboral para el docente id: {dataWizard1?.idhorariod}</td></tr>
                  }
                </tbody>
              </table>
            </fieldset>

            <fieldset className="fieldset-sgpc-section">
              <legend>Horario Académico de la Asignatura</legend>
              <div style={{border: '1px solid #cbd5e1', borderRadius: '0.8rem'}}>
                <div style={{display: 'grid', gridTemplateColumns: '5rem 12rem 1fr 1fr 1fr 12rem', background: 'var(--color-primario)', padding: '1rem', color: '#fff', fontWeight: 600}}>
                  <span>Sel</span><span>Día</span><span>Hora Inicio</span><span></span><span>Hora Final</span><span>Total Día</span>
                </div>
                {horarioAcad.map((h,i) => (
                  <div key={h.dia} style={{display: 'grid', gridTemplateColumns: '5rem 12rem 1fr 1fr 1fr 12rem', padding: '0.8rem', borderTop: '1px solid #e5e7eb', alignItems: 'center'}}>
                    <input type="checkbox" checked={h.sel} onChange={() => setHorarioAcad(prev => prev.map((p,idx)=> idx===i? {...p, sel: !p.sel} : p))} />
                    <span>{h.dia}</span>
                    <input type="time" value={h.horaInicio} disabled={!h.sel} onChange={e => setHorarioAcad(prev => prev.map((p,idx)=> idx===i? {...p, horaInicio: e.target.value} : p))} className="input-sgpc" />
                    <span style={{textAlign: 'center'}}>a</span>
                    <input type="time" value={h.horaFin} disabled={!h.sel} onChange={e => setHorarioAcad(prev => prev.map((p,idx)=> idx===i? {...p, horaFin: e.target.value} : p))} className="input-sgpc" />
                    <span>{h.sel ? `${calcularHoras(h.horaInicio, h.horaFin).toFixed(2)} hrs` : '0.00 hrs'}</span>
                  </div>
                ))}
                <div style={{textAlign: 'right', padding: '1rem', fontWeight: 700}}>Total Semanal: {totalSemanal.toFixed(2)} Horas</div>
              </div>
            </fieldset>

            <fieldset className="fieldset-sgpc-section">
              <legend>Estudiante Matriculado</legend>
              <SelectSGPCFieldset
                label="DNI + Estudiante *"
                value={idMatriculaSel}
                onChange={setIdMatriculaSel}
                options={estudiantes}
              />
              {estudiantes.length === 0 && <p style={{color: '#EF4444', marginTop: '0.8rem', fontSize: '1.3rem'}}>No hay estudiantes matriculados activos para el periodo id: {dataWizard1?.idpa}</p>}
            </fieldset>
          </div>

          <div className="modal-footer" style={{justifyContent: 'center', gap: '1.6rem'}}>
            <button className="btn-secundario" onClick={() => setHorarioAcad(DIAS_SEMANA.map(d => ({ dia: d, sel: false, horaInicio: '08:00', horaFin: '10:00' })))}><Eraser size={16} />Limpiar</button>
            <button className="btn-primario" onClick={handleGrabar} disabled={loadingW2}><Save size={16} />{loadingW2 ? 'Grabando...' : 'Grabar'}</button>
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="modal-overlay" style={{zIndex: 10000}}>
          <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{maxWidth: '45rem'}}>
            <div className="modal-header"><h2>¿Desea Registrar otro estudiante?</h2></div>
            <div className="modal-body"><p>La carga del estudiante anterior se guardó correctamente.</p></div>
            <div className="modal-footer" style={{justifyContent: 'center', gap: '1.6rem'}}>
              <button className="btn-secundario" onClick={() => {
                setIdMatriculaSel(null)
                setHorarioAcad(DIAS_SEMANA.map(d => ({ dia: d, sel: false, horaInicio: '08:00', horaFin: '10:00' })))
                setShowConfirm(false)
              }}><Plus size={16} />Sí</button>
              <button className="btn-primario" onClick={() => { setShowConfirm(false); onClose() }}><X size={16} />Terminar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ModalHorarioAcademico