'use client'
import React, { useEffect, useState, useMemo } from 'react'
import { X, Check, Camera, Trash2, Eraser, BookOpen } from 'lucide-react'
import { createClient } from '@/lib/client'
import moment from 'moment'
import toast, { Toaster } from 'react-hot-toast'

export default function FichaSupervisionModal({ show, onClose, visita }: any) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [headerData, setHeaderData] = useState<any>(null)
  const [preguntasDocente, setPreguntasDocente] = useState<any[]>([])
  const [preguntasAlumno, setPreguntasAlumno] = useState<any[]>([])
  const [alumnos, setAlumnos] = useState<any[]>([])
  const [respuestas, setRespuestas] = useState<any>({})
  const [fotos, setFotos] = useState<File[]>([])
  const [fotosGuardadas, setFotosGuardadas] = useState<any[]>([])

  const idvisitas = visita?.idvisitas

  useEffect(() => {
    if(show && idvisitas) fetchData()
  }, [show, idvisitas])

const fetchData = async () => {
    setLoading(true)

    // 1. SACAMOS LA VISITA CON EL IDCARGAACAD
    const { data: v, error: err1 } = await supabase
    .from('visitasupervision')
    .select(`
        idvisitas,
        asignacionsupervision!inner(
          asignacion_nrc_supervisor!inner(
            cargaacademica!inner(idcargaacad, nrc, idasignatura)
          )
        )
      `)
    .eq('idvisitas', idvisitas)
    .single()

    if(err1){ toast.error("Error cargando visita: " + err1.message); setLoading(false); return }

    const idcargaacad = v?.asignacionsupervision?.asignacion_nrc_supervisor?.cargaacademica?.idcargaacad

    // 2. SACAMOS TODO EL HEADER
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
    
    if(err2){ toast.error("Error cargando datos: " + err2.message); setLoading(false); return }
    setHeaderData(carga)

    const idpa = carga?.campoclinico?.idpa
    const iddocente = carga?.campoclinico?.docente?.iddocente

    // 3. PREGUNTAS DE FICHA SOLO ACTIVOS
    const { data: preguntas } = await supabase
     .from('ficha')
     .select('*')
     .eq('idpa', idpa)
     .eq('estado', 'ACTIVO') // <-- SOLO ACTIVOS
     .order('idficha')
    
    setPreguntasDocente(preguntas?.filter(p => p.tipoactor === 'Docente') || []) // <-- CAMBIO: Docente
    setPreguntasAlumno(preguntas?.filter(p => p.tipoactor === 'Estudiante') || []) // <-- CAMBIO: Estudiante

    // 4. ALUMNOS DEL NRC
    const { data: alumnosData } = await supabase
     .from('horario')
     .select(`
        matricula!inner(estudiante!inner(idestudiante, persona(dni, apellidos, nombres)))
      `)
     .eq('idcargaacad', idcargaacad)
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
    const iddocente = headerData?.campoclinico?.docente?.iddocente
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
      if(errUpload) return toast.error("Error al subir foto: " + errUpload.message)
      await supabase.from('archivoevidencia').insert({ idvisitas, nombrearchivo: file.name, rutaarchivo: filePath, tipoarchivo: 'IMAGEN' })
    }

    toast.success("Ficha y evidencias guardadas")
    fetchData()
    setFotos([])
  }

  const handleSalir = async () => {
    if(fotosGuardadas.length + fotos.length === 0) return toast.error("Debe tomar mínimo 1 fotografía para salir")
    await handleGuardar()
    onClose()
  }

  const limpiarTodo = () => {
    setRespuestas({}); 
    setFotos([])
    toast("Formulario limpiado")
  }

  if(!show) return null
  
  const carga = headerData
  const cc = carga?.campoclinico

  return (
    <div className="modal-overlay" onClick={onClose} style={{zIndex: 1000}}>
      <Toaster position="top-center" />
      <div className="modal-content card-sgpc" style={{maxWidth: '95vw', width: '120rem', maxHeight: '90vh', overflowY: 'auto'}} onClick={e => e.stopPropagation()}>
        
        <div className="modal-header" style={{background: 'var(--color-primario)', color: '#fff'}}>
          <h2 style={{marginRight: "0.8rem", color:'#fff'}}><BookOpen size={20} style={{marginRight: "0.8rem", color:'#fff'}}/>Ficha de Supervisión N° {idvisitas}</h2>
          <button onClick={onClose} className="btn-cerrar"><X size={20} /></button>
        </div>

        <div className="modal-body">
          {loading? <p>Cargando...</p> : <>
            {/* DATOS GENERALES - 3 CARDS */}
            <div className="grid-3" style={{marginBottom: '2rem'}}>
              <div className="card-info"><b>Periodo:</b> {cc?.periodoacademico?.nombre}</div>
              <div className="card-info"><b>Filial:</b> {cc?.filial?.nombrefilial}</div>
              <div className="card-info"><b>Carrera:</b> {carga?.asignatura?.carrera?.nombrecarrera}</div>
              <div className="card-info"><b>EPS:</b> {cc?.eps?.razonsocial}</div>
              <div className="card-info"><b>Asignatura:</b> {carga?.asignatura?.nombre}</div>
              <div className="card-info"><b>NRC:</b> {carga?.nrc}</div>
            </div>

            {/* TABLA DOCENTE */}
            <h3 style={{color: 'var(--color-primario)', marginBottom: '1rem'}}>Ficha Docente: {cc?.docente?.persona?.dni} - {cc?.docente?.persona?.apellidos}, {cc?.docente?.persona?.nombres}</h3>
            <div className="card-sgpc" style={{overflowX: 'auto', marginBottom: '2rem'}}>
              <table className="tabla-sgpc">
                <thead><tr><th>ITEM</th><th style={{width: '12rem'}}>PUNTAJE 1-5</th></tr></thead>
                <tbody>
                  {preguntasDocente.map(p => (
                    <tr key={p.idficha}>
                      <td>{p.item}</td>
                      <td><input type="number" min="1" max="5" className="input-sgpc-floating" value={respuestas[`doc-${cc?.docente?.iddocente}-${p.idficha}`] || ''} onChange={e => handleRespuesta(`doc-${cc?.docente?.iddocente}-${p.idficha}`, Number(e.target.value))} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* TABLA ALUMNOS */}
            <h3 style={{color: 'var(--color-primario)', marginBottom: '1rem'}}>Ficha Alumnos NRC: {carga?.nrc}</h3>
            <div className="card-sgpc" style={{overflowX: 'auto'}}>
              <table className="tabla-sgpc">
                <thead><tr><th>DNI</th><th>ALUMNO</th>{preguntasAlumno.map(p => <th key={p.idficha} className="col-item">{p.item}</th>)}</tr></thead>
                <tbody>
                  {alumnos.map(a => (
                    <tr key={a.idestudiante}>
                      <td className="col-dni">{a.persona.dni}</td>
                      <td className="col-alumno">{a.persona.apellidos}, {a.persona.nombres}</td>
                      {preguntasAlumno.map(p => (
                        <td className="col-item" key={p.idficha} ><input type="number" min="1" max="5" className="input-sgpc-floating" value={respuestas[`alu-${a.idestudiante}-${p.idficha}`] || ''} onChange={e => handleRespuesta(`alu-${a.idestudiante}-${p.idficha}`, Number(e.target.value))} /></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* EVIDENCIAS */}
            <h3 style={{color: 'var(--color-primario)', marginTop: '2rem'}}>Evidencias Fotográficas {fotosGuardadas.length + fotos.length}/5</h3>
            <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
              {fotosGuardadas.map(f => <img key={f.idarchivoe} src={supabase.storage.from('evidencias').getPublicUrl(f.rutaarchivo).data.publicUrl} style={{width: '10rem', height: '10rem', objectFit: 'cover', borderRadius: '0.6rem'}}/>)}
              {fotos.map((f, i) => <img key={i} src={URL.createObjectURL(f)} style={{width: '10rem', height: '10rem', objectFit: 'cover', borderRadius: '0.6rem'}}/>)}
            </div>
          </>}
        </div>

        {/* <div className="modal-footer">
          <input type="file" accept="image/*" capture="environment" multiple onChange={e => setFotos([...fotos,...Array.from(e.target.files || [])].slice(0, 5))} id="uploadFoto" style={{display: 'none'}} disabled={fotosGuardadas.length + fotos.length >= 5}/>
          <label htmlFor="uploadFoto" className="btn-secundario" style={{cursor: 'pointer'}}><Camera size={16}/> Tomar fotografía</label>
          <button className="btn-secundario" onClick={limpiarTodo}><Eraser size={16}/> Limpiar</button>
          <button className="btn-primario" onClick={handleSalir}><Check size={16}/> Guardar y Salir</button>
        </div> */}
        <div className="modal-footer">
  <input type="file" accept="image/*" capture="environment" multiple onChange={e => setFotos([...fotos,...Array.from(e.target.files || [])].slice(0, 5))} id="uploadFoto" style={{display: 'none'}} disabled={fotosGuardadas.length + fotos.length >= 5}/>
  
  <label htmlFor="uploadFoto" className="btn btn-outline">
    <Camera size={16}/> Tomar fotografía
  </label>
  
  <button className="btn btn-outline" onClick={limpiarTodo}>
    <Eraser size={16}/> Limpiar
  </button>
  
  <button className="btn btn-primario" onClick={handleSalir}>
    <Check size={16}/> Guardar y Salir
  </button>
</div>
      </div>
       <style jsx>{`
  .modal-overlay { 
    position: fixed; inset: 0; background: rgba(0,0,0,0.5); 
    display: flex; align-items: center; justify-content: center; 
    z-index: 2000; padding: 1rem; 
  }

    
  .modal-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 2rem 3.2rem; border-bottom: 1px solid #e2e8f0;
    background: var(--color-blanco);
    flex-shrink: 0; /* 2. HEADER FIJO - NO SE ENCOGE */
  }
  .modal-header h2 { 
    font-size: 2rem; font-weight: 700; display: flex; align-items: center;
    color: var(--color-primario);
  }
  
  .btn-cerrar { 
    background: #f1f5f9; border: none; border-radius: 0.8rem; 
    padding: 0.8rem; cursor: pointer; color: #64748b; 
    display: flex; align-items: center; justify-content: center; 
    transition: all 0.2s ease; 
  }
  .btn-cerrar:hover { 
    background: #fee2e2; color: #ef4444; transform: rotate(90deg);
  }

   /* 3. AQUI VA EL SCROLL VERTICAL */
  .modal-body { 
    padding: 2rem 3.2rem; 
    overflow-y: auto; /* SCROLL VERTICAL */
    flex: 1; /* OCUPA TODO EL ESPACIO RESTANTE */
    min-height: 0; /* CLAVE PARA QUE FUNCIONE EL SCROLL EN FLEX */
  }

    .modal-footer {
    display: flex; justify-content: flex-end; gap: 1rem; 
    padding: 1.5rem 3.2rem; border-top: 1px solid #e2e8f0;
    background: #f8fafc; 
    flex-shrink: 0; /* 4. FOOTER FIJO - NO SE ENCOGE */
  }

    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.2rem; }
  .card-info { background: #f8fafc; padding: 1.2rem; border-radius: 0.8rem; font-size: 1.3rem; }
  .titulo-seccion { color: var(--color-primario); margin: 2rem 0 1rem 0; font-size: 1.6rem; font-weight: 700; }

   .tabla-responsive { overflow-x: auto; margin-bottom: 2rem; } /* SCROLL HORIZONTAL PARA TABLAS */
 .tabla-sgpc { width: 100%; border-collapse: collapse; font-size: 1.3rem; table-layout: fixed; }
 
 .tabla-sgpc th { 
    background: #f8fafc; padding: 1.2rem; text-align: left; 
    font-weight: 600; color: #475569; white-space: nowrap;
    position: sticky; top: 0; z-index: 1; /* HEADER DE TABLA FIJO */
  }

 .tabla-sgpc td { padding: 1.2rem; border-bottom: 1px solid #f1f5f9; }

 .input-sgpc-floating { 
    width: 8rem; padding: 0.6rem; border: 1px solid #e2e8f0; 
    border-radius: 0.6rem; text-align: center;
  }

/* NUEVO: ANCHOS DE TABLA */
  .tabla-sgpc { 
    width: 100%; 
    border-collapse: collapse; 
    font-size: 1.3rem; 
    table-layout: fixed; /* CLAVE: respeta los anchos */
  }
  
  .tabla-sgpc th, .tabla-sgpc td { 
    padding: 1.2rem; 
    border-bottom: 1px solid #f1f5f9; 
    vertical-align: top;
  }

  /* Anchos fijos */
  .col-dni { width: 5rem; }
  .col-alumno { width: 20rem; }
  .col-item { width: 20rem; } /* Cada pregunta */
  .col-puntaje { width: 12rem; text-align: center;}

  /* Para que el texto largo haga wrap */
  .col-item {
    white-space: normal !important; 
    word-wrap: break-word !important; 
    line-height: 1.6rem !important;
  }

  /* EL HEADER NO DEBE TENER NOWRAP */
  .tabla-sgpc th.col-item {
    white-space: normal !important;
  }
  /* Input centrado */
  .input-sgpc-floating { 
    width: 100%; /* Ocupa el 100% de la celda */
    max-width: 8rem; 
    padding: 0.6rem; 
    border: 1px solid #e2e8f0; 
    border-radius: 0.6rem; 
    text-align: center;
    margin: 0 auto;
    display: block;
  }
  .modal-footer {
    display: grid; /* GRID DE 3 COLUMNAS IGUALES */
    grid-template-columns: 1fr 1fr 1fr; 
    gap: 1.2rem; 
    padding: 1.8rem 3.2rem; 
    border-top: 1px solid #e2e8f0;
    background: #f8fafc; 
    flex-shrink: 0;
  }

  /* CLASE BASE PARA TODOS */
  .btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.8rem;
    width: 100%; /* OCUPAR TODO EL GRID */
    height: 4.8rem; /* ALTURA EXACTA FIJA */
    padding: 0 2rem; /* SIN PADDING VERTICAL */
    border-radius: 0.8rem;
    font-size: 1.4rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1.5px solid;
    box-sizing: border-box; /* CLAVE: el border no suma al alto */
    white-space: nowrap;
  }

  .btn-outline {
    background: var(--color-blanco);
    color: var(--color-secundario);
    border-color: var(--color-secundario);
  }
  .btn-outline:hover {
    background: #e6f0ff;
  }

  .btn-primario {
    background: var(--color-primario);
    color: var(--color-blanco);
    border-color: var(--color-primario);
  }
  .btn-primario:hover {
    background: #003A8C;
  }

  @media (max-width: 768px) {
    .modal-content { height: 95vh; border-radius: 1rem; }
    .modal-header, .modal-body, .modal-footer { padding: 1.5rem; }
    .modal-header h2 { font-size: 1.6rem; }
    .grid-3 { grid-template-columns: 1fr; }
    .modal-footer { flex-direction: column; }
    .modal-footer button, .modal-footer label { width: 100%; justify-content: center; }
    .tabla-sgpc { table-layout: auto; min-width: 80rem; }
     .modal-footer { 
      flex-direction: column; 
       grid-template-columns: 1fr;
      padding: 1.5rem;
    }
    .btn { 
      width: 100%; 
      flex: none;
    }
  }
  }
`}</style>

    </div>
  )
}