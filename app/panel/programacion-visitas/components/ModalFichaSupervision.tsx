'use client'
import React, { useEffect, useState, useMemo } from 'react'
import { X, Check, Camera, Trash2, Eraser, BookOpen } from 'lucide-react'
import { createClient } from '@/lib/client'
import moment from 'moment'
import toast, { Toaster } from 'react-hot-toast'

export default function ModalFichaSupervision({ show, onClose, visita }: any) {
  
  const RatingEstrellas = ({ valor, onChange, disabled = false }: any) => {
  return (
    <div style={{ display: 'flex', gap: '0.4rem' }}>
      {[1, 2, 3, 4, 5].map((estrella) => (
        <button
          key={estrella}
          type="button"
          disabled={disabled}
          onClick={() => onChange(estrella)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: disabled ? 'default' : 'pointer',
            color: estrella <= valor ? '#F59E0B' : '#CBD5E1', // Amarillo / Gris
            transition: 'transform 0.1s ease'
          }}
          onMouseEnter={e => !disabled && (e.currentTarget.style.transform = 'scale(1.2)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
    </div>
    )
  }
  
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [headerData, setHeaderData] = useState<any>(null)
  const [preguntasDocente, setPreguntasDocente] = useState<any[]>([])
  const [preguntasAlumno, setPreguntasAlumno] = useState<any[]>([])
  const [alumnos, setAlumnos] = useState<any[]>([])
  const [respuestas, setRespuestas] = useState<any>({})
  const [fotos, setFotos] = useState<File[]>([])
  const [fotosGuardadas, setFotosGuardadas] = useState<any[]>([])
  const [observacion, setObservacion] = useState(visita?.observaciones || '')

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
    const toInsert: any[] = []

    // 1. BORRAR RESPUESTAS ANTERIORES DE ESTA VISITA
    const { error: errDelete } = await supabase.from('fichasupervision').delete().eq('idvisitas', idvisitas)
    if(errDelete) return toast.error("Error al limpiar respuestas: " + errDelete.message)

    // 2. Armar respuestas docente
    preguntasDocente.forEach(p => {
      const key = `doc-${iddocente}-${p.idficha}`
      if(respuestas[key] > 0){ // Solo si marcó algo
        toInsert.push({
          idvisitas,
          idficha: p.idficha,
          iddocente,
          idestudiante: null, // CLAVE: null para docente
          respuestaitem: respuestas[key]
        })
      }
    })

    // 3. Armar respuestas alumnos
    alumnos.forEach(a => {
      preguntasAlumno.forEach(p => {
        const key = `alu-${a.idestudiante}-${p.idficha}`
        if(respuestas[key] > 0){ // Solo si marcó algo
          toInsert.push({
            idvisitas,
            idficha: p.idficha,
            iddocente: null, // CLAVE: null para alumno
            idestudiante: a.idestudiante,
            respuestaitem: respuestas[key]
          })
        }
      })
    })

    // 4. INSERTAR TODO LO NUEVO
    if(toInsert.length > 0){
      const { error: errInsert } = await supabase.from('fichasupervision').insert(toInsert)
      if(errInsert) return toast.error("Error al guardar ficha: " + errInsert.message)
    } else {
      return toast.error("Debe calificar al menos 1 item")
    }

    // 5. ACTUALIZAR ESTADO DE LA VISITA - ESTO HACE QUE CAMBIE EL COLOR
    const totalPreguntas = preguntasDocente.length + (preguntasAlumno.length * alumnos.length)
    const totalRespondidas = toInsert.length

    let nuevoEstado = 'EN_PROCESO'
    if(totalRespondidas >= totalPreguntas && totalPreguntas > 0) nuevoEstado = 'SUPERVISADO'

    const { error: errVisita } = await supabase.from('visitasupervision').update({
      condicion: nuevoEstado,
      observaciones: observacion
    }).eq('idvisitas', idvisitas)

    if(errVisita) return toast.error("Error al actualizar visita: " + errVisita.message)

  
    // 6. Subir fotos - NO CORTA LA FUNCION SI FALLA 1 FOTO
if(fotos.length > 0){
  for(let i = 0; i < fotos.length; i++){
    const file = fotos[i]
    const filePath = `${idvisitas}/${file.name}`

    const { error: errUpload } = await supabase.storage.from('evidenciasSigpacuc').upload(filePath, file, {
      upsert: true
    })

    if(errUpload) {
      console.log("ERROR UPLOAD:", errUpload)
      toast.error(`Error al subir ${file.name}: ${errUpload.message}`)
      // NO ponemos return aquí para que siga con las demás
    } else {
      // Solo si se subió bien, guardamos en BD
      const { error: errDB } = await supabase.from('archivoevidencia').insert({
        idvisitas,
        nombrearchivo: file.name,
        rutaarchivo: filePath,
        tipoarchivo: 'IMAGEN'
      })
      if(errDB) {
        console.log("ERROR DB FOTO:", errDB)
        toast.error(`Error al guardar BD ${file.name}: ${errDB.message}`)
      }
    }
  }
}

    toast.success(`Ficha guardada. Estado: ${nuevoEstado}`)
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
  
   // 1. GENERAR NOMBRE AUTOMÁTICO - USANDO headerData
  const generarNombreFoto = () => {
  if (!headerData) return `SIN_DATOS_${Date.now()}.jpg`

  const idpa = headerData?.campoclinico?.idpa || '0'
  const idcargaacad = headerData?.idcargaacad || '0'
  const nrc = headerData?.nrc || '0'
  const idsupervisor = visita?.asignacionsupervision?.idsupervisor || '0' // este sí viene de visita

  const ahora = new Date()
  const fecha = ahora.toISOString().slice(0,10).replace(/-/g,'') // 20250901
  const hora = ahora.toTimeString().slice(0,8).replace(/:/g,'') // 093045

  return `${idpa}_${idcargaacad}_${nrc}_${idsupervisor}_${fecha}_${hora}.jpg`
}

 // 2. CAPTURAR FOTO CON CÁMARA
  const handleTomarFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (!file) return

  const nombreUnico = generarNombreFoto()
  const nuevoFile = new File([file], nombreUnico, { type: file.type }) // Renombramos el file

  setFotos(prev => [...prev, nuevoFile].slice(0, 5))
  toast.success(`Foto agregada`)
  e.target.value = '' // limpiar input
}

  const limpiarFotos = () => setFotos([])

  const carga = headerData
  const cc = carga?.campoclinico

  return (
    <div className="modal-overlay" onClick={onClose} style={{zIndex: 1000}}>
      <Toaster position="top-center" />
      <div className="modal-content card-sgpc" style={{maxWidth: '95vw', width: '120rem', maxHeight: '90vh', overflowY: 'auto', padding: '1rem 1rem'}} onClick={e => e.stopPropagation()}>
        
        <div className="modal-header" style={{background: 'var(--color-primario)', color: '#fff', padding: '0rem 0rem'}}>
          <h2 style={{marginRight: "0.8rem", color:'#fff'}}><BookOpen size={20} style={{marginRight: "0.8rem", color:'#fff'}}/>Ficha de Supervisión N° {idvisitas}</h2>
          <button onClick={onClose} className="btn-cerrar"><X size={20} /></button>
        </div>

        <div style={{marginRight: "0.8rem", padding: '0rem 0rem'}} className="modal-body">
          {loading? <p>Cargando...</p> : <>
            {/* DATOS GENERALES - 3 CARDS */}
            <div className="grid-3" style={{marginBottom: '0rem'}}>
              <div className="card-info"><b>Periodo:</b> {cc?.periodoacademico?.nombre}</div>
              <div className="card-info"><b>Filial:</b> {cc?.filial?.nombrefilial}</div>
              <div className="card-info"><b>Carrera:</b> {carga?.asignatura?.carrera?.nombrecarrera}</div>
              <div className="card-info"><b>EPS:</b> {cc?.eps?.razonsocial}</div>
              <div className="card-info"><b>Asignatura:</b> {carga?.asignatura?.nombre}</div>
              <div className="card-info"><b>NRC:</b> {carga?.nrc}</div>
            </div>

            {/* TABLA DOCENTE */}
            <h4 style={{color: 'var(--color-primario)', margin: '0rem', paddingLeft:'0.5rem'}}>Ficha Docente: {cc?.docente?.persona?.dni} - {cc?.docente?.persona?.apellidos}, {cc?.docente?.persona?.nombres}</h4>
            <div className="card-sgpc" style={{overflowX: 'auto', marginBottom: '0rem', padding:'0rem'}}>
              <table className="tabla-sgpc">
                <thead><tr><th>ITEM</th><th style={{width: '20rem', textAlign:'center'}}>PUNTAJE 1-5</th></tr></thead>
                <tbody>
                  {preguntasDocente.map(p => (
                    <tr key={p.idficha}>
                      <td className="col-item-docente" style={{fontSize:'1.1rem'}} >{p.item}</td>
                      <td  className="col-puntaje">                         
                            <RatingEstrellas 
                              valor={respuestas[`doc-${cc?.docente?.iddocente}-${p.idficha}`] || 0} 
                              onChange={(val) => handleRespuesta(`doc-${cc?.docente?.iddocente}-${p.idficha}`, val)} 
                            />                         
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* TABLA ALUMNOS */}
            <h4 style={{color: 'var(--color-primario)', margin: '0rem', paddingLeft:'0.5rem'}}>Ficha Estudiantes NRC: {carga?.nrc}</h4>
            <div className="card-sgpc" style={{overflowX: 'auto', marginBottom: '0rem', padding:'0rem'}}>
              <table className="tabla-sgpc">
                <thead style={{alignSelf:'center'}} ><tr><th className="col-dni">DNI</th><th className="col-alumno" >ESTUDIANTE</th>{preguntasAlumno.map(p => <th style={{fontSize: '1rem', textAlign:'center'}} key={p.idficha} className="col-item">{p.item}</th>)}</tr></thead>
                <tbody style={{fontSize: '1.1rem'}}>
                  {alumnos.map(a => (
                    <tr key={a.idestudiante}>
                      <td className="col-dni">{a.persona.dni}</td>
                      <td className="col-alumno">
  <div style={{fontWeight: 600, fontSize: '1.1rem', paddingLeft: '0.5rem'}}>{a.persona.apellidos}</div>
  <div style={{fontSize: '1rem', color: '#64748b',paddingLeft: '0.5rem'}}>{a.persona.nombres}</div>
</td>
                      {preguntasAlumno.map(p => (
                        <td className="col-item" key={p.idficha}  >
                          <div style={{display: 'flex', justifyContent: 'center'}}>                        
                          <RatingEstrellas 
  valor={respuestas[`alu-${a.idestudiante}-${p.idficha}`] || 0} 
  onChange={(val) => handleRespuesta(`alu-${a.idestudiante}-${p.idficha}`, val)} 
/>
</div> 
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* EVIDENCIAS */}
            <h4 style={{color: 'var(--color-primario)', margin: '0rem'}}>Evidencias Fotográficas {fotosGuardadas.length + fotos.length}/5</h4>
            <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
         {fotosGuardadas.map(f => {
  const { data } = supabase.storage.from('evidenciasSigpacuc').getPublicUrl(f.rutaarchivo) // <-- bucket nuevo
  return <img key={f.idarchivoe} src={data.publicUrl} style={{width: '10rem', height: '10rem', objectFit: 'cover', borderRadius: '0.6rem'}}/>
})}
              {fotos.map((f, i) => <img key={i} src={URL.createObjectURL(f)} style={{width: '10rem', height: '10rem', objectFit: 'cover', borderRadius: '0.6rem'}}/>)}
            </div>
          </>}
        </div>

      
<div className="modal-footer" style={{margin: '0rem'}}>
  <input 
    type="file" 
    accept="image/*" 
    capture="environment" // <-- ESTO ABRE LA CAMARA
    onChange={handleTomarFoto} // <-- USAMOS NUESTRA FUNCION
    id="uploadFoto" 
    style={{display: 'none'}} 
    disabled={fotosGuardadas.length + fotos.length >= 5}
  />
  
  <label htmlFor="uploadFoto" className="btn btn-outline" style={{opacity: fotosGuardadas.length + fotos.length >= 5? 0.5 : 1}}>
    <Camera size={16}/> Tomar fotografía
  </label>
  
  <button className="btn btn-outline" onClick={limpiarFotos}> {/* <-- USAMOS limpiarFotos */}
    <Eraser size={16}/> Limpiar Fotos
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
    padding: 1.5rem; border-bottom: 1px solid #e2e8f0;
    background: var(--color-primario); flex-shrink: 0;
  }
  .modal-header h2 { font-size: 1.6rem; font-weight: 700; display: flex; align-items: center; color: #fff; }
  .btn-cerrar { background: rgba(255,255,255,0.2); border: none; border-radius: 0.8rem; padding: 0.8rem; cursor: pointer; color: #fff; display: flex; }
  .modal-body { padding: 1.5rem; overflow-y: auto; flex: 1; min-height: 0; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; margin-bottom: 1.5rem; }
  .card-info { background: #f8fafc; padding: 0.8rem 1rem; border-radius: 0.6rem; font-size: 1.1rem; }
  .card-info b { color: var(--color-primario); }

  .tabla-sgpc { 
    width: 100%; 
    border-collapse: collapse !important; /* VOLVEMOS A COLLAPSE */
    border-spacing: 0 !important;
    font-size: 1.2rem; table-layout: fixed; min-width: 100rem;
  }
  
  .tabla-sgpc th { 
    background: #f8fafc; padding: 1rem; text-align: left; 
    font-weight: 600; color: #475569; position: sticky; top: 0; z-index: 3;
    border: none !important; /* QUITAR BORDE */
  }
  .tabla-sgpc td { 
    padding: 1rem; 
    outline: 1px solid #f1f5f9; /* USAR OUTLINE EN VEZ DE BORDER */
    outline-offset: -1px; /* Que no empuje */
    vertical-align: top; 
  }

  /* ANCHOS */
  .col-dni { width: 10rem; white-space: nowrap; font-weight: 600; }
  .col-alumno { width: 12rem; line-height: 1.4; }
  .col-item { width: 20rem; white-space: normal; word-wrap: break-word; text-align: center; }

  /* AGREGA ESTO DEBAJO DE .col-item */
.col-item-docente { 
  width: 35rem; 
  white-space: normal; 
  word-wrap: break-word; 
  text-align: left; /* mejor left para textos largos */
  padding-right: 2rem;
}

  /* COLUMNAS FIJAS */
  .tabla-sgpc .col-dni {
    position: sticky; left: 0; background: #fff; z-index: 2; isolation: isolate;
    width: 10rem; padding-right: 0;
  }
  .tabla-sgpc .col-alumno {
    position: sticky; left: 10rem; background: #fff; z-index: 2; isolation: isolate;
    width: 12rem; padding-left: 0;
    box-shadow: 4px 0 8px rgba(0,0,0,0.12); /* Sombra mas fuerte */
  }
  .tabla-sgpc thead .col-dni {
    position: sticky; left: 0; background: #f8fafc; z-index: 4; top: 0;
  }
  .tabla-sgpc thead .col-alumno {
    position: sticky; left: 10rem; background: #f8fafc; z-index: 4; top: 0;
  }

  .modal-footer {
    display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.8rem; 
    padding: 1.2rem 1.5rem; border-top: 1px solid #e2e8f0;
    background: #f8fafc; flex-shrink: 0;
  }
  .btn {
    display: flex; align-items: center; justify-content: center; gap: 0.8rem;
    width: 100%; height: 4.8rem; padding: 0 2rem; border-radius: 0.8rem;
    font-size: 1.4rem; font-weight: 600; cursor: pointer; border: 1.5px solid;
    box-sizing: border-box; white-space: nowrap;
  }
  .btn-outline { background: var(--color-blanco); color: var(--color-secundario); border-color: var(--color-secundario); }
  .btn-primario { background: var(--color-primario); color: var(--color-blanco); border-color: var(--color-primario); }

  .tabla-sgpc .col-puntaje {
    text-align: center !important;
    vertical-align: middle !important;
    width: 20rem; /* achica la columna de puntaje */
  }

/* MOBILE */
@media (max-width: 768px) {
  .modal-content { height: 95vh; border-radius: 1rem; }
  .modal-header, .modal-body, .modal-footer { padding: 1.2rem; }
  .grid-3 { grid-template-columns: 1fr 1fr; }
  .modal-footer { grid-template-columns: 1fr; }
  .tabla-sgpc { table-layout: auto; min-width: 90rem; }
  
  .col-dni { width: 8.5rem; }
  .col-alumno { width: 14rem; }

  
  
  /* ESTAS 3 LINEAS NUEVAS MATAN EL FANTASMA EN CELULAR */
  .tabla-sgpc .col-dni { 
    width: 8.5rem !important; 
    transform: translateX(-1px); /* EMPUJA 1PX A LA DERECHA */
  }
  .tabla-sgpc .col-alumno { 
    left: 8.5rem !important; 
    width: 14rem !important; 
    transform: translateX(-12px); /* JALA 1PX A LA IZQUIERDA */
  }
  .tabla-sgpc thead .col-alumno { left: 8.5rem !important; transform: translateX(-12px); }
}
`}</style>

    </div>
  )
}