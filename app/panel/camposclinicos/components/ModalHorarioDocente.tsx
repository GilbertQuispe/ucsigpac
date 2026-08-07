'use client'
import { useState, useMemo, useEffect } from 'react'
import { X, Save, Eraser, Clock } from 'lucide-react'
import { createClient } from '@/lib/client'

type DiaHorario = {
  dia: string
  activo: boolean
  hora_inicio: string
  hora_fin: string
}

const DIAS_SEMANA = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO']

const calcularHoras = (inicio: string, fin: string) => {
  if(!inicio ||!fin) return 0
  const [h1, m1] = inicio.split(':').map(Number)
  const [h2, m2] = fin.split(':').map(Number)
  const diff = (h2 * 60 + m2) - (h1 * 60 + m1)
  return diff > 0? diff / 60 : 0
}

export default function ModalHorarioDocente({
  show,
  onClose,
  idcampocli,
  dataHeader
}: any) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null)

  const [horarios, setHorarios] = useState<DiaHorario[]>(
    DIAS_SEMANA.map(d => ({ dia: d, activo: false, hora_inicio: '08:00', hora_fin: '13:00' }))
  )

  const showToast = (msg: string, type: 'error' | 'success' = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    if(show){
      setHorarios(DIAS_SEMANA.map(d => ({ dia: d, activo: false, hora_inicio: '08:00', hora_fin: '13:00' })))
    }
  }, [show])

  const totalSemanal = useMemo(() =>
    horarios.reduce((acc, h) => acc + (h.activo? calcularHoras(h.hora_inicio, h.hora_fin) : 0), 0)
, [horarios])

  const handleToggleDia = (index: number) => {
    const newHorarios = [...horarios]
    newHorarios[index].activo =!newHorarios[index].activo
    setHorarios(newHorarios)
  }

  const handleChangeHora = (index: number, field: 'hora_inicio' | 'hora_fin', value: string) => {
    const newHorarios = [...horarios]
    newHorarios[index][field] = value
    setHorarios(newHorarios)
  }

  const handleLimpiar = () => {
    setHorarios(DIAS_SEMANA.map(d => ({ dia: d, activo: false, hora_inicio: '08:00', hora_fin: '13:00' })))
  }

  const handleGuardar = async () => {
    const horariosAGuardar = horarios.filter(h => h.activo)

    if(horariosAGuardar.length === 0) {
      showToast('Seleccione al menos 1 día', 'error')
      return
    }

    for(const h of horariosAGuardar) {
      if(!h.hora_inicio ||!h.hora_fin) {
        showToast(`Complete las horas de ${h.dia}`, 'error')
        return
      }
      if(calcularHoras(h.hora_inicio, h.hora_fin) <= 0) {
        showToast(`La hora fin debe ser mayor en ${h.dia}`, 'error')
        return
      }
    }

    setLoading(true)
    const dataToInsert = horariosAGuardar.map(h => ({
      idcampocli: idcampocli,
      dia_semana: h.dia,
      hora_inicio: h.hora_inicio,
      hora_fin: h.hora_fin
    }))

    const {error} = await supabase.from('horariodocente').insert(dataToInsert)

    if(error) showToast(error.message, 'error')
    else {
      showToast('Horario registrado correctamente', 'success')
      setTimeout(() => onClose(), 1000)
    }
    setLoading(false)
  }

  if(!show) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      {toast && <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 99999, background: toast.type === 'error'? '#EF4444' : '#22C55E', color: '#fff', padding: '1.2rem 2.4rem', borderRadius: '0.8rem', fontWeight: 600, fontSize: '1.4rem' }}>{toast.msg}</div>}

      <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{maxWidth: '80rem'}}>
        <div className="modal-header" style={{borderBottom: '2px solid #e5e7eb'}}>
          <div>
            <h1 style={{display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--color-primario)', fontSize: '1.6rem'}}>
              <Clock size={20} /> Registrar Horario Laboral
            </h1>
            <p style={{fontSize: '1.8rem', marginTop: '0.4rem'}}>
              <b>Docente:</b> {dataHeader?.docente} - DNI: {dataHeader?.dni}
            </p>
            <p style={{fontSize: '1.2rem'}}>
              <b>EPS:</b> {dataHeader?.eps} <br/> <b>Servicio:</b> {dataHeader?.servicio} - <b>Periodo:</b> {dataHeader?.periodo}
            </p>
          </div>
          <button onClick={onClose} className="btn-cerrar-modal"><X size={18} /></button>
        </div>

        <div className="modal-body" style={{padding: '1.6rem'}}>
          <p style={{fontSize: '1.2rem', opacity: 0.8, marginBottom: '1.2rem'}}>Marque los días y coloque el horario. Solo se guardarán los días marcados.</p>

          {/* TABLA */}
          <div style={{border: '2px solid #93C5FD', borderRadius: '0.8rem', overflow: 'hidden'}}>
            {/* HEADER */}
            <div style={{display: 'grid', gridTemplateColumns: '6rem 12rem 1fr 1fr 1fr 12rem', background: '#93C5FD', padding: '1rem', fontWeight: 700, color: '#1E3A8A', fontSize: '1.2rem'}}>
              <span>SEL</span>
              <span>DIA</span>
              <span style={{textAlign: 'center'}}>HORA INICIO</span>
              <span style={{textAlign: 'center'}}></span>
              <span style={{textAlign: 'center'}}>HORA FINAL</span>
              <span style={{textAlign: 'right'}}>TOTAL HORAS</span>
            </div>

            {/* BODY */}
            {horarios.map((h, i) => (
              <div key={h.dia} style={{
                display: 'grid', 
                gridTemplateColumns: '6rem 12rem 1fr 1fr 1fr 12rem', 
                alignItems: 'center', 
                padding: '1rem', 
                borderTop: '1px solid #e5e7eb',
                background: h.activo? '#DBEAFE' : '#fff'
              }}>
                <input type="checkbox" checked={h.activo} onChange={() => handleToggleDia(i)} style={{width: '1.8rem', height: '1.8rem', cursor: 'pointer'}} />
                <span style={{fontWeight: 600, color: '#1E3A8A'}}>{h.dia}</span>
                
                <div style={{display: 'flex', justifyContent: 'center'}}>
                  <input type="time" value={h.hora_inicio} onChange={e => handleChangeHora(i, 'hora_inicio', e.target.value)} disabled={!h.activo} className="input-sgpc" style={{width: '12rem'}} />
                </div>
                
                <span style={{textAlign: 'center', fontWeight: 600}}>a</span>

                <div style={{display: 'flex', justifyContent: 'center'}}>
                  <input type="time" value={h.hora_fin} onChange={e => handleChangeHora(i, 'hora_fin', e.target.value)} disabled={!h.activo} className="input-sgpc" style={{width: '12rem'}} />
                </div>

                <span style={{textAlign: 'right', fontWeight: 600, color: '#1E3A8A'}}>
                  {h.activo? `${calcularHoras(h.hora_inicio, h.hora_fin).toFixed(2)} hrs` : '0.00 hrs'}
                </span>
              </div>
            ))}

            {/* FOOTER TOTAL */}
            <div style={{display: 'flex', justifyContent: 'flex-end', padding: '1rem', borderTop: '2px solid #93C5FD', background: '#f9fafb'}}>
              <div style={{border: '1px solid #93C5FD', padding: '0.6rem 1.2rem', borderRadius: '0.4rem', fontWeight: 700, fontSize: '1.3rem'}}>
                Total Semanal: {totalSemanal.toFixed(2)} Horas
              </div>
            </div>
          </div>

        </div>

        <div className="modal-footer" style={{justifyContent: 'space-between', padding: '1.6rem'}}>
          <button className="btn-secundario" onClick={handleLimpiar} disabled={loading} style={{minWidth: '20rem', background: '#fff', color: '#0EA5E9', border: '2px solid #0EA5E9'}}>
            <Eraser size={16} /> Limpiar
          </button>
          <button className="btn-primario" onClick={handleGuardar} disabled={loading} style={{minWidth: '20rem', background: '#2563EB'}}>
            <Save size={16} /> {loading? 'Guardando...' : 'Guardar Horario'}
          </button>
        </div>
      </div>
    </div>
  )
}