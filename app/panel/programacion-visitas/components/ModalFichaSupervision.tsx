'use client'
import React, { useEffect, useState, useMemo } from 'react'
import { X, Check, Camera, Trash2, Upload } from 'lucide-react'
import { createClient } from '@/lib/client'
import moment from 'moment'
import toast from 'react-hot-toast'

export default function FichaSupervisionModal({ show, onClose, visita }: any) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [headerData, setHeaderData] = useState<any>(null)
  const [preguntasDocente, setPreguntasDocente] = useState<any[]>([])
  const [preguntasAlumno, setPreguntasAlumno] = useState<any[]>([])
  const [alumnos, setAlumnos] = useState<any[]>([])
  const [respuestas, setRespuestas] = useState<any>({}) // { "doc-10-1": 5, "alu-200-1": 4 }
  const [fotos, setFotos] = useState<File[]>([])
  const [fotosGuardadas, setFotosGuardadas] = useState<any[]>([])

  const idvisitas = visita?.idvisitas

  useEffect(() => {
    if(show && idvisitas) fetchData()
  }, [show, idvisitas])

const fetchData = async () => {
    setLoading(true)
    console.log("ID VISITA:", idvisitas)

    // 1. PRIMERO SACAMOS LA VISITA CON TODOS LOS ID
    const { data: v, error: err1 } = await supabase
     .from('visitasupervision')
     .select(`
        idvisitas,
        asignacionsupervision!inner(
          asignacion_nrc_supervisor!inner(
            idcargaacad: cargaacademica!inner(idcargaacad, nrc, idasignatura),
            idsupervisor
          )
        )
      `)
     .eq('idvisitas', idvisitas)
     .single()

    if(err1){ console.log("ERROR 1:", err1); setLoading(false); return }

    const idcargaacad = v?.asignacionsupervision?.asignacion_nrc_supervisor?.idcargaacad

    // 2. SEGUNDO SACAMOS TODO EL HEADER CON JOINS
    const { data: carga, error: err2 } = await supabase
     .from('cargaacademica')
     .select(`
        idcargaacad, nrc,
        asignatura!inner(
          nombre,
          planasignatura(nombre),
          carrera!inner(nombrecarrera)
        ),
        campoclinico!inner(
          idpa,
          periodoacademico!inner(nombre),
          filial!inner(nombrefilial),
          eps!inner(razonsocial, direccion),
          docente!inner(iddocente, persona(dni, apellidos, nombres))
        )
      `)
     .eq('idcargaacad', idcargaacad)
     .single()
    
    if(err2){ console.log("ERROR 2:", err2); setLoading(false); return }
    setHeaderData({carga})

    const idpa = carga?.campoclinico?.idpa
    const iddocente = carga?.campoclinico?.docente?.iddocente

    // 3. PREGUNTAS DE FICHA
    const { data: preguntas } = await supabase.from('ficha').select('*').eq('idpa', idpa)
    setPreguntasDocente(preguntas?.filter(p => p.tipoactor === 'DOCENTE') || [])
    setPreguntasAlumno(preguntas?.filter(p => p.tipoactor === 'ALUMNO') || [])

    // 4. ALUMNOS DEL NRC
    const { data: alumnosData } = await supabase.from('horario').select(`
      matricula!inner(estudiante!inner(idestudiante, persona(dni, apellidos, nombres)))
    `).eq('idcargaacad', idcargaacad)
    setAlumnos(alumnosData?.map(h => h.matricula.estudiante) || [])

    // 5. RESPUESTAS Y FOTOS
    const { data: respData } = await supabase.from('fichasupervision').select('*').eq('idvisitas', idvisitas)
    const respObj: any = {}
    respData?.forEach(r => {
      const key = r.iddocente? `doc-${r.iddocente}-${r.idficha}` : `alu-${r.idestudiante}-${r.idficha}`
      respObj[key] = r.respuestaitem
    })
    setRespuestas(respObj)

    const { data: fotosData } = await supabase.from('archivoevidencia').select('*').eq('idvisitas', idvisitas)
    setFotosGuardadas(fotosData || [])

    setLoading(false)
  }

  const handleRespuesta = (key: string, valor: number) => {
    setRespuestas({...respuestas, [key]: valor})
  }

  const handleGuardar = async () => {
    const iddocente = headerData?.asignacionsupervision?.asignacion_nrc_supervisor?.cargaacademica?.campoclinico?.docente?.iddocente
    const toUpsert: any[] = []

    // Armar respuestas docente
    preguntasDocente.forEach(p => {
      const key = `doc-${iddocente}-${p.idficha}`
      if(respuestas[key]!== undefined){
        toUpsert.push({ idvisitas, idficha: p.idficha, iddocente, respuestaitem: respuestas[key] })
      }
    })
    // Armar respuestas alumnos
    alumnos.forEach(a => {
      preguntasAlumno.forEach(p => {
        const key = `alu-${a.idestudiante}-${p.idficha}`
        if(respuestas[key]!== undefined){
          toUpsert.push({ idvisitas, idficha: p.idficha, idestudiante: a.idestudiante, respuestaitem: respuestas[key] })
        }
      })
    })

    if(toUpsert.length > 0){
      const { error } = await supabase.from('fichasupervision').upsert(toUpsert, { onConflict: 'idvisitas,idficha,iddocente,idestudiante' })
      if(error) return toast.error("Error al guardar ficha: " + error.message)
    }

    // Subir fotos
    for(let i = 0; i < fotos.length; i++){
      const file = fotos[i]
      const filePath = `${idvisitas}/${Date.now()}_${file.name}`
      const { error: errUpload } = await supabase.storage.from('evidencias').upload(filePath, file)
      if(errUpload) return toast.error("Error al subir foto")
      await supabase.from('archivoevidencia').insert({ idvisitas, nombrearchivo: file.name, rutaarchivo: filePath, tipoarchivo: 'IMAGEN' })
    }

    toast.success("Ficha y evidencias guardadas")
    fetchData() // refrescar
    setFotos([])
  }

  const handleSalir = async () => {
    if(fotosGuardadas.length + fotos.length === 0) return toast.error("Debe tomar mínimo 1 fotografía para salir")
    await handleGuardar()
    onClose()
  }

  if(!show) return null
//   const carga = headerData?.asignacionsupervision?.asignacion_nrc_supervisor?.cargaacademica
//   const cc = carga?.campoclinico
const carga = headerData?.carga
const cc = carga?.campoclinico

  return (
    <div className="modal-overlay" style={{zIndex: 1000}}>
      <div className="modal-content card-sgpc" style={{maxWidth: '95vw', width: '120rem', maxHeight: '90vh', overflowY: 'auto'}} onClick={e => e.stopPropagation()}>
        {/* HEADER */}
        <div className="modal-header" style={{background: '#004AAD', color: '#fff', padding: '1.5rem', borderRadius: '0.8rem 0.8rem 0 0'}}>
          <h2>Ficha de Supervisión</h2>
          <button onClick={handleSalir} className="btn-cerrar-modal" style={{color: '#fff'}}><X/></button>
        </div>

        <div className="modal-body" style={{padding: '2rem'}}>
          {loading? <p>Cargando...</p> : <>
            {/* DATOS GENERALES */}
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(25rem, 1fr))', gap: '1rem', marginBottom: '2rem', fontSize: '1.3rem'}}>
             
              <p><b>Periodo:</b> {cc?.periodoacademico?.nombre}</p>
                <p><b>Filial:</b> {cc?.filial?.nombrefilial}</p>
                <p><b>Carrera:</b> {carga?.asignatura?.carrera?.nombrecarrera}</p>
                <p><b>EPS:</b> {cc?.eps?.razonsocial}</p>
                <p><b>Dirección EPS:</b> {cc?.eps?.direccion}</p>
                <p><b>NRC:</b> {carga?.nrc}</p>
                <p><b>Asignatura:</b> {carga?.asignatura?.nombre}</p>
                <p><b>Plan:</b> {carga?.asignatura?.planasignatura?.nombre}</p>
            </div>

            {/* TABLA DOCENTE */}
            {/* <h3 style={{color: '#004AAD', marginBottom: '1rem'}}>Ficha Docente: {cc?.docente?.persona?.dni} - {cc?.docente?.persona?.apellidos}, {cc?.docente?.persona?.nombres}</h3> */}
            <h3>Ficha Docente: {cc?.docente?.persona?.dni} - {cc?.docente?.persona?.apellidos}, {cc?.docente?.persona?.nombres}</h3>
            <table className="table-sgpc" style={{marginBottom: '2rem'}}>
              <thead><tr><th>Item</th><th>Puntaje 1-5</th></tr></thead>
              <tbody>
                {preguntasDocente.map(p => (
                  <tr key={p.idficha}>
                    <td>{p.item}</td>
                    <td><input type="number" min="1" max="5" value={respuestas[`doc-${cc?.docente?.iddocente}-${p.idficha}`] || ''} onChange={e => handleRespuesta(`doc-${cc?.docente?.iddocente}-${p.idficha}`, Number(e.target.value))} style={{width: '8rem'}}/></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* TABLA ALUMNOS */}
            <h3 style={{color: '#004AAD', marginBottom: '1rem'}}>Ficha Alumnos NRC: {carga?.nrc}</h3>
            <table className="table-sgpc">
              <thead><tr><th>DNI</th><th>Alumno</th>{preguntasAlumno.map(p => <th key={p.idficha}>{p.item}</th>)}</tr></thead>
              <tbody>
                {alumnos.map(a => (
                  <tr key={a.idestudiante}>
                    <td>{a.persona.dni}</td>
                    <td>{a.persona.apellidos}, {a.persona.nombres}</td>
                    {preguntasAlumno.map(p => (
                      <td key={p.idficha}><input type="number" min="1" max="5" value={respuestas[`alu-${a.idestudiante}-${p.idficha}`] || ''} onChange={e => handleRespuesta(`alu-${a.idestudiante}-${p.idficha}`, Number(e.target.value))} style={{width: '6rem'}}/></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* EVIDENCIAS */}
            <h3 style={{color: '#004AAD', marginTop: '2rem'}}>Evidencias Fotográficas {fotosGuardadas.length + fotos.length}/5</h3>
            <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
              {fotosGuardadas.map(f => <img key={f.idarchivoe} src={supabase.storage.from('evidencias').getPublicUrl(f.rutaarchivo).data.publicUrl} style={{width: '10rem', height: '10rem', objectFit: 'cover', borderRadius: '0.6rem'}}/>)}
              {fotos.map((f, i) => <img key={i} src={URL.createObjectURL(f)} style={{width: '10rem', height: '10rem', objectFit: 'cover', borderRadius: '0.6rem'}}/>)}
            </div>
          </>}
        </div>

        {/* FOOTER */}
        <div className="modal-footer" style={{display: 'flex', justifyContent: 'flex-end', gap: '1rem', padding: '1.5rem'}}>
          <input type="file" accept="image/*" capture="environment" multiple onChange={e => setFotos([...fotos,...Array.from(e.target.files || [])].slice(0, 5))} id="uploadFoto" style={{display: 'none'}} disabled={fotosGuardadas.length + fotos.length >= 5}/>
          <label htmlFor="uploadFoto" className="btn-secundario" style={{cursor: 'pointer'}}><Camera size={16}/> Tomar fotografía</label>
          <button className="btn-secundario" onClick={() => {setRespuestas({}); setFotos([])}}><Trash2 size={16}/> Limpiar</button>
          <button className="btn-primario" onClick={handleSalir}><Check size={16}/> Guardar y Salir</button>
        </div>
      </div>
    </div>
  )
}