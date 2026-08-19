'use client'
import { useState, useEffect } from 'react'
import { X, Eye, Clock } from 'lucide-react'
import { createClient } from '@/lib/client'

const supabase = createClient()
const DIAS_SEMANA = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO']

const ModalVerHorarioSoloLectura = ({ show, onClose, idhorario }: any) => {
  const [detalle, setDetalle] = useState<any[]>([])
  const [info, setInfo] = useState<any>(null)

useEffect(() => {
  const cargar = async () => {
    if(!show ||!idhorario) return
    setInfo(null)
    setDetalle([])

    // 1 SOLA LLAMADA PARA TODO EL HEADER + 1 PARA EL DETALLE
    const [{data: h, error}, {data: det}] = await Promise.all([
      supabase.from('v_horario_completo').select('*').eq('idhorario', idhorario).single(),
      supabase.from('detallehorario').select('*').eq('idhorario', idhorario)
    ])

    if(error || !h){ console.error(error); return }
    setInfo(h)
    
    const detOrdenado = DIAS_SEMANA.map(dia => 
      det?.find((d:any) => d.dia_semana === dia)
    ).filter(Boolean)
    setDetalle(detOrdenado)
  }
  cargar()
}, [show, idhorario])

  if(!show) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{maxWidth: '70rem'}}>
        <div className="modal-header">
          <h2 style={{display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--color-primario)'}}><Eye size={22} /> Ver Horario</h2>
          <button onClick={onClose} className="btn-cerrar-modal"><X size={18} /></button>
        </div>
        <div className="modal-body">
          <fieldset className="fieldset-sgpc-section">
            <legend>Datos del Horario</legend>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem', fontSize: '1.4rem'}}>
              <p><b>Estudiante:</b> {info?.estudiante_apellidos} {info?.estudiante_nombres}</p>
<p><b>Asignatura:</b> {info?.asignatura_nombre}</p>
<p><b>NRC:</b> {info?.nrc}</p>
<p><b>Docente:</b> {info?.docente_apellidos}, {info?.docente_nombres}</p>
            </div>
          </fieldset>
          <fieldset className="fieldset-sgpc-section">
            <legend><Clock size={16}/> Horario Académico</legend>
            <table className='tabla-sgpc'>
              <thead><tr><th>Día</th><th>Hora Inicio</th><th>Hora Fin</th></tr></thead>
              <tbody>
                {detalle.length > 0 ? detalle.map((d:any,i:number) => 
                  <tr key={i}><td>{d.dia_semana}</td><td>{d.hora_inicio}</td><td>{d.hora_fin}</td></tr>
                ) : <tr><td colSpan={3} style={{textAlign: 'center'}}>Sin horario registrado</td></tr>}
              </tbody>
            </table>
          </fieldset>
        </div>
        <div className="modal-footer" style={{justifyContent: 'center'}}>
          <button className="btn-primario" onClick={onClose}><X size={16} />Cerrar</button>
        </div>
      </div>
    </div>
  )
}
export default ModalVerHorarioSoloLectura
