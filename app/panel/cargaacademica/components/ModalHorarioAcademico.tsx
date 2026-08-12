const ModalHorarioAcademico = ({ show, onClose, dataWizard1 }: any) => {
  const supabase = createClient()
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
      if(show && dataWizard1){
        console.log("Datos que llegan a W2:", dataWizard1)

        // 1. CARGAR ESTUDIANTES
        const { data: mat, error: errMat } = await supabase
         .from('matricula')
         .select('idmatricula, persona!inner(dni, apellidos, nombres)')
         .eq('idpa', dataWizard1.idpa)
         .eq('estado', 'ACTIVO')
        
        if(errMat) console.error("Error cargando matricula:", errMat)
        setEstudiantes(mat?.map((m:any) => ({
          value: m.idmatricula,
          label: `${m.persona.dni} - ${m.persona.apellidos}, ${m.persona.nombres}`
        })) || [])

        // 2. CARGAR HORARIO LABORAL
        const { data: horLab, error: errHor } = await supabase
         .from('horariodocente')
         .select('*')
         .eq('idhorariod', dataWizard1.idhorariod)

        if(errHor) console.error("Error cargando horario docente:", errHor)
        setHorarioLaboralDoc(horLab || [])
      } else {
        setIdMatriculaSel(null)
        setEstudiantes([])
        setHorarioLaboralDoc([])
        setHorarioAcad(DIAS_SEMANA.map(d => ({ dia: d, sel: false, horaInicio: '08:00', horaFin: '10:00' })))
      }
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
      <div className="modal-overlay">
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