'use client'
import React, { useEffect, useState, useMemo } from 'react'
import moment from 'moment'
import 'moment/locale/es'
import { createClient } from '@/lib/client'
import { Check, X, CalendarDays, FileText } from 'lucide-react'
import Select from 'react-select'

moment.locale('es')
const ESTADO_COLORES: any = {
  'PROGRAMADO': { bg: '#3B82F6', border: '#2563EB', text: '#fff' },
  'EN_PROCESO': { bg: '#F59E0B', border: '#D97706', text: '#fff' },
  'SUPERVISADO': { bg: '#22C55E', border: '#16A34A', text: '#fff' }
}

// TU SELECT SGPC PARA QUE SEA SIMETRICO
const SelectSGPCFieldset = ({label, value, onChange, options}:any) => {
  const selectedOption = options.find((o:any) => o.value === value) || null
  return (
    <fieldset className="fieldset-sgpc">
      <legend>{label}</legend>
      <Select options={options} value={selectedOption} onChange={(opt:any) => onChange(opt?.value || '')} placeholder="Seleccione..." isSearchable maxMenuHeight={200} classNamePrefix="react-select" menuPortalTarget={typeof window !== 'undefined' ? document.body : null} menuPosition="fixed" styles={{ control: (base, state) => ({...base, height: '4.4rem', minHeight: '4.4rem', borderRadius: '0.6rem', border: '1px solid #cbd5e1', background: '#fff', boxShadow: state.isFocused? '0 0 0 1px var(--color-primario)' : 'none', marginTop: '0.4rem', cursor: 'pointer' }), valueContainer: (base) => ({...base, padding: '0 1.2rem', height: '4.4rem' }), input: (base) => ({...base, margin: 0, padding: 0 }), indicatorsContainer: (base) => ({...base, height: '4.4rem' }), option: (base, state) => ({...base, backgroundColor: state.isSelected? 'var(--color-primario)' : state.isFocused? 'var(--color-acento)' : '#fff', color: state.isSelected? '#fff' : 'var(--color-texto)', padding: '1rem 1.2rem' }), menu: (base) => ({...base, zIndex: 9999, marginTop: '0.4rem' }) }} />
    </fieldset>
  )
}
export default function ProgramacionVisitasPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [visitas, setVisitas] = useState<any[]>([])
  const [supervisores, setSupervisores] = useState<any[]>([])
  const [periodos, setPeriodos] = useState<any[]>([])

  const [filtroSupervisor, setFiltroSupervisor] = useState<number | ''>('')
  const [filtroPeriodo, setFiltroPeriodo] = useState<number | ''>('')
  const [showFichaModal, setShowFichaModal] = useState(false)
  const [visitaSeleccionada, setVisitaSeleccionada] = useState<any>(null)
  const [observacion, setObservacion] = useState('')

  useEffect(() => { fetchDataMaestra() }, [])

  const fetchDataMaestra = async () => {
    setLoading(true)
    const [sup, per] = await Promise.all([
      supabase.from('supervisor').select('*, persona(*)').eq('estado', 'ACTIVO'),
      supabase.from('periodoacademico').select('*').order('idpa', {ascending: false})
    ])
    setSupervisores(sup.data || [])
    setPeriodos(per.data || [])
    await fetchVisitas()
  }

  const fetchVisitas = async () => {
    setLoading(true)
    let query = supabase.from('visitasupervision').select(`
      idvisitas, fechavisita, horavisita, condicion, observaciones,
      asignacionsupervision!inner(
        idasignacions,
        asignacion_nrc_supervisor!inner(
          idcargaacad,
          supervisor(persona(apellidos, nombres)),
          cargaacademica(
            nrc,
            asignatura(nombre),
            campoclinico(
              idpa, idfilial, ideps,
              docente(persona(dni, apellidos, nombres)),
              eps(razonsocial),
              filial(nombrefilial)
            )
          )
        )
      )
    `)

    if(filtroSupervisor) query = query.eq('asignacionsupervision.asignacion_nrc_supervisor.supervisor.idsupervisor', filtroSupervisor)
    if(filtroPeriodo) query = query.eq('asignacionsupervision.asignacion_nrc_supervisor.cargaacademica.campoclinico.idpa', filtroPeriodo)

    const { data, error } = await query.order('fechavisita', {ascending: true})
    if(error) console.log(error)
    setVisitas(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchVisitas() }, [filtroSupervisor, filtroPeriodo])

  const opcionesSupervisor = useMemo(() =>
    supervisores.map(s=>({value:s.idsupervisor, label:`${s.persona?.dni} - ${s.persona?.apellidos}, ${s.persona?.nombres}`})), [supervisores])

  const opcionesPeriodo = useMemo(() =>
    [{value: '', label: 'Todos'},...periodos.map(p => ({value: p.idpa, label: p.codigo || p.nombre}))], [periodos])

  const visitasAgrupadas = useMemo(() => {
    const grupos: any = {}
    visitas.forEach(v => {
      const semana = moment(v.fechavisita).format('[Semana] W - YYYY')
      if(!grupos[semana]) grupos[semana] = []
      grupos[semana].push(v)
    })
    return grupos
  }, [visitas])

  const handleRegistrarVisita = (visita: any) => {
    setVisitaSeleccionada(visita)
    setObservacion(visita.observaciones || '')
    setShowFichaModal(true)
  }

  const handleGuardarFicha = async () => {
    const { error } = await supabase.from('visitasupervision').update({
      condicion: 'SUPERVISADO',
      observaciones: observacion
    }).eq('idvisitas', visitaSeleccionada.idvisitas)

    if(error) alert(error.message)
    else {
      setShowFichaModal(false)
      fetchVisitas()
    }
  }

  return (
    <div className="main-content">
      <h1 style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem'}}>
        <CalendarDays size={24}/>Programación de Visitas
      </h1>

      <div className="card-sgpc" style={{ padding: '2rem', marginBottom: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(22rem, 1fr))', gap: '1.2rem' }}>
        {/* <fieldset className="fieldset-sgpc"><legend>Supervisor</legend>
          <Select options={opcionesSupervisor} value={opcionesSupervisor.find(o=>o.value===filtroSupervisor)} onChange={(opt:any)=>setFiltroSupervisor(opt?.value||'')} placeholder="Todos"/>
        </fieldset>
        <fieldset className="fieldset-sgpc"><legend>Periodo</legend>
          <Select options={opcionesPeriodo} value={opcionesPeriodo.find(o=>o.value===filtroPeriodo)} onChange={(opt:any)=>setFiltroPeriodo(opt?.value||'')} placeholder="Todos"/>
        </fieldset> */}
        <SelectSGPCFieldset label="Supervisor" options={opcionesSupervisor} value={filtroSupervisor} onChange={setFiltroSupervisor} />
        <SelectSGPCFieldset label="Periodo Académico" options={opcionesPeriodo} value={filtroPeriodo} onChange={setFiltroPeriodo} />
      </div>

      {/* LEYENDA */}
      <div style={{display: 'flex', gap: '1.5rem', fontSize: '1.2rem', marginBottom: '1rem'}}>
        {Object.entries(ESTADO_COLORES).map(([key, val]) => (
          <div key={key} style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <div style={{width: '1.6rem', height: '1.6rem', background: val.bg, border: `1px solid ${val.border}`, borderRadius: '0.3rem'}}></div>
            <span>{key}</span>
          </div>
        ))}
      </div>

      {loading? <p>Cargando...</p> : Object.keys(visitasAgrupadas).map(semana => (
        <div key={semana} className="card-sgpc" style={{marginBottom: '2rem', padding: '1.5rem'}}>
          <h3 style={{color: '#004AAD', marginBottom: '1rem'}}>{semana}</h3>
          <div style={{overflowX: 'auto'}}>
            <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '1.3rem'}}>
              <thead style={{background: '#F8FAFC'}}>
                <tr>
                  <th style={{padding: '1rem', textAlign: 'left', border: '1px solid #e2e8f0'}}>Fecha</th>
                  <th style={{padding: '1rem', textAlign: 'left', border: '1px solid #e2e8f0'}}>Hora</th>
                  <th style={{padding: '1rem', textAlign: 'left', border: '1px solid #e2e8f0'}}>Asignatura - NRC</th>
                  <th style={{padding: '1rem', textAlign: 'left', border: '1px solid #e2e8f0'}}>Docente</th>
                  <th style={{padding: '1rem', textAlign: 'left', border: '1px solid #e2e8f0'}}>EPS</th>
                  <th style={{padding: '1rem', textAlign: 'center', border: '1px solid #e2e8f0'}}>Estado</th>
                  <th style={{padding: '1rem', textAlign: 'center', border: '1px solid #e2e8f0'}}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {visitasAgrupadas[semana].map((v:any) => {
                  const color = ESTADO_COLORES[v.condicion] || ESTADO_COLORES['PROGRAMADO']
                  const cabecera = v.asignacionsupervision.asignacion_nrc_supervisor
                  const carga = cabecera.cargaacademica
                  return (
                    <tr key={v.idvisitas}>
                      <td style={{padding: '1rem', border: '1px solid #e2e8f0'}}>{moment(v.fechavisita).format('DD/MM/YYYY - dddd')}</td>
                      <td style={{padding: '1rem', border: '1px solid #e2e8f0'}}>{v.horavisita}</td>
                      <td style={{padding: '1rem', border: '1px solid #e2e8f0'}}>{carga.asignatura.nombre} - {carga.nrc}</td>
                      <td style={{padding: '1rem', border: '1px solid #e2e8f0'}}>{carga.campoclinico.docente.persona.apellidos}</td>
                      <td style={{padding: '1rem', border: '1px solid #e2e8f0'}}>{carga.campoclinico.eps.razonsocial}</td>
                      <td style={{padding: '1rem', border: '1px solid #e2e8f0', textAlign: 'center'}}>
                        <span style={{background: color.bg, color: color.text, padding: '0.4rem 0.8rem', borderRadius: '0.4rem', fontWeight: 600}}>{v.condicion}</span>
                      </td>
                      <td style={{padding: '1rem', border: '1px solid #e2e8f0', textAlign: 'center'}}>
                        {v.condicion!== 'SUPERVISADO' &&
                          <button className="btn-primario" style={{padding: '0.6rem 1rem'}} onClick={()=>handleRegistrarVisita(v)}>
                            <FileText size={14}/> Registrar
                          </button>
                        }
                        {v.condicion === 'SUPERVISADO' && <Check color="#22C55E" />}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* MODAL FICHA */}
      {showFichaModal && (
        <div className="modal-overlay" onClick={() => setShowFichaModal(false)}>
          <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{maxWidth: '60rem'}}>
            <div className="modal-header"><h2><FileText size={20}/> Registrar Visita</h2><button onClick={()=>setShowFichaModal(false)} className="btn-cerrar-modal"><X/></button></div>
            <div className="modal-body">
              <p><b>Fecha:</b> {moment(visitaSeleccionada?.fechavisita).format('DD/MM/YYYY')}</p>
              <p><b>Docente:</b> {visitaSeleccionada?.asignacionsupervision?.asignacion_nrc_supervisor?.cargaacademica?.campoclinico?.docente?.persona?.apellidos}</p>
              <p><b>Asignatura:</b> {visitaSeleccionada?.asignacionsupervision?.asignacion_nrc_supervisor?.cargaacademica?.asignatura?.nombre}</p>
              <fieldset className="fieldset-sgpc">
                <legend>Observaciones de la Visita</legend>
                <textarea value={observacion} onChange={(e)=>setObservacion(e.target.value)} rows={4} style={{width: '100%', padding: '1rem', borderRadius: '0.6rem', border: '1px solid #cbd5e1'}}/>
              </fieldset>
            </div>
            <div className="modal-footer"><button className="btn-primario" onClick={handleGuardarFicha}><Check/> Marcar como Supervisado</button></div>
          </div>
        </div>
      )}
    </div>
  )
}