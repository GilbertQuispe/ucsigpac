'use client'
import React, { useEffect, useState, useMemo } from 'react'
import { X, Check, Camera, Trash2, Eraser, BookOpen, Save, Funnel, House, Award, Warehouse,Newspaper, HatGlasses} from 'lucide-react'
import { createClient } from '@/lib/client'
import moment from 'moment'
import toast, { Toaster } from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth' // <-- AGREGA ESTO 17-09

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
   const { user } = useAuth() // <-- AGREGA ESTO, aquí ya tienes user.id 17-09
  const [loading, setLoading] = useState(true)
  const [headerData, setHeaderData] = useState<any>(null)
  const [preguntasDocente, setPreguntasDocente] = useState<any[]>([])
  const [preguntasAlumno, setPreguntasAlumno] = useState<any[]>([])
  const [alumnos, setAlumnos] = useState<any[]>([])
  const [respuestas, setRespuestas] = useState<any>({})
  const [fotos, setFotos] = useState<File[]>([])
  const [fotosGuardadas, setFotosGuardadas] = useState<any[]>([])
  //17-09const [observacion, setObservacion] = useState(visita?.observaciones || '')
    const [observacion, setObservacion] = useState(visita?.observaciones || '')
  const [asistencia, setAsistencia] = useState<any>({}) // { idestudiante: { presente, motivo_ausencia, tiene_permiso } }

  const idvisitas = visita?.idvisitas
  const esSoloLectura = visita?.condicion === 'SUPERVISADO' // <-- AGREGA ESTA LINEA

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
    
    const idcargaacad = (v as any)?.asignacionsupervision?.asignacion_nrc_supervisor?.cargaacademica?.idcargaacad
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

    //Cambio segun Vercel- const idpa = carga?.campoclinico?.idpa
    //cambio solucionando erro 09-09- const idpa = (carga as any)?.campoclinico?.[0]?.idpa
    const idpa = (carga as any)?.campoclinico?.idpa
    //Camnbio segun Vercel- const iddocente = carga?.campoclinico?.docente?.iddocente
    //Cabio solucionando error 09-09- const iddocente = (carga as any)?.campoclinico?.[0]?.docente?.[0]?.iddocente
    const iddocente = (carga as any)?.campoclinico?.docente?.iddocente

    // 3. PREGUNTAS DE FICHA SOLO ACTIVOS
    const { data: preguntas } = await supabase
     .from('ficha')
     .select('*')
     .eq('idpa', idpa)
     .eq('estado', 'ACTIVO') // <-- SOLO ACTIVOS
     .order('idficha')

    setPreguntasDocente(preguntas?.filter((p: any) => p.tipoactor === 'Docente') || []) // <-- CAMBIO: Docente
    setPreguntasAlumno(preguntas?.filter((p: any) => p.tipoactor === 'Estudiante') || []) // <-- CAMBIO: Estudiante

        // 4. ALUMNOS DEL NRC
    const { data: alumnosData } = await supabase
    .from('horario')
    .select(`matricula!inner(estudiante!inner(idestudiante, persona(dni, apellidos, nombres)))`)
    .eq('idcargaacad', idcargaacad)

    const alumnosList = alumnosData?.map((h: any) => h.matricula?.estudiante) || []
    setAlumnos(alumnosList)

    // Cargar asistencia existente - QUERY CORREGIDA
    const { data: asisData } = await supabase
     .from('asistencia_visita')
     .select('*')
     .eq('idvisitas', idvisitas)
     .eq('tipo_actor','ALUMNO')

    const asisObj: any = {}
    alumnosList.forEach((alu: any) => {
      const reg = asisData?.find((x: any) => x.idestudiante === alu.idestudiante)
      asisObj[alu.idestudiante] = reg? {
        presente: reg.presente,
        motivo_ausencia: reg.motivo_ausencia || reg.observacion || '',
        tiene_permiso: reg.tiene_permiso || false,
        observacion_personal: reg.observacion || '' // <-- ESTO TE FALTA, por eso sale null
      } : { presente: true, motivo_ausencia: '', tiene_permiso: false }
    })
    setAsistencia(asisObj)

    // 5. RESPUESTAS Y FOTOS
    const { data: respData } = await supabase.from('fichasupervision').select('*').eq('idvisitas', idvisitas)
    const respObj: any = {}
    respData?.forEach((r: any) => {
      const key = r.iddocente? `doc-${r.iddocente}-${r.idficha}` : `alu-${r.idestudiante}-${r.idficha}`
      respObj[key] = r.respuestaitem
    })
    setRespuestas(respObj)

    const { data: fotosData } = await supabase.from('archivoevidencia').select('*').eq('idvisitas', idvisitas)
    setFotosGuardadas(fotosData || [])

    setLoading(false)
  }

    /// este cambuio muere aqui

  const handleRespuesta = (key: string, valor: number) => {
    setRespuestas({...respuestas, [key]: valor})
  }

 //Para porcentajes
  const getValoracion = (porcentaje: number) => {
    if (porcentaje >= 80) return 'Satisfactorio';
    if (porcentaje >= 60) return 'En Observación';
    return 'Requiere Intervención';
  }

  const getGeneral = (valDoc: string, valAlu: string) => {
    if (valDoc === 'Requiere Intervención' || valAlu === 'Requiere Intervención') return 'Requiere Intervención';
    if (valDoc === 'En Observación' || valAlu === 'En Observación') return 'En Observación';
    return 'Satisfactorio';
  }



 const handleGuardar = async () => {
  if(esSoloLectura) return toast.error("Esta ficha ya está supervisada. Solo lectura")

    const iddocente = headerData?.campoclinico?.docente?.iddocente
    const toInsert: any[] = []

    // 1. BORRAR RESPUESTAS ANTERIORES
    const { error: errDelete } = await supabase.from('fichasupervision').delete().eq('idvisitas', idvisitas)
    if(errDelete) return toast.error("Error al limpiar respuestas: " + errDelete.message)

    // 2. Armar respuestas docente
    preguntasDocente.forEach(p => {
      const key = `doc-${iddocente}-${p.idficha}`
      if(respuestas[key] > 0){
        toInsert.push({ idvisitas, idficha: p.idficha, iddocente, idestudiante: null, respuestaitem: respuestas[key] })
      }
    })

    // 3. Armar respuestas alumnos SOLO PRESENTES
    const alumnosPresentes = alumnos.filter(a => asistencia[a.idestudiante]?.presente!== false)
    alumnosPresentes.forEach(a => {
      preguntasAlumno.forEach(p => {
        const key = `alu-${a.idestudiante}-${p.idficha}`
        if(respuestas[key] > 0){
          toInsert.push({ idvisitas, idficha: p.idficha, iddocente: null, idestudiante: a.idestudiante, respuestaitem: respuestas[key] })
        }
      })
    })

    if(toInsert.length === 0) return toast.error("Debe calificar al menos 1 item")

    // 4. INSERTAR RESPUESTAS
    const { error: errInsert } = await supabase.from('fichasupervision').insert(toInsert)
    if(errInsert) return toast.error("Error al guardar ficha: " + errInsert.message)

    // 5. GUARDAR ASISTENCIA EN TABLA NUEVA
      // 5. GUARDAR ASISTENCIA EN TABLA REAL
    // const idcargaacad_actual = headerData?.idcargaacad || null
    // const { error: errDelAsis } = await supabase.from('asistencia_visita').delete().eq('idvisitas', idvisitas).eq('tipo_actor','ALUMNO')
    // if(errDelAsis) console.log("Warn delete asis:", errDelAsis.message)

    // const asisToInsert = alumnos.map(a => ({
    //     idvisitas,
    //     idestudiante: a.idestudiante,
    //     iddocente: null,
    //     tipo_actor: 'ALUMNO',
    //     presente: asistencia[a.idestudiante]?.presente?? true,
    //     motivo_ausencia: asistencia[a.idestudiante]?.motivo_ausencia || null,
    //     tiene_permiso: asistencia[a.idestudiante]?.tiene_permiso || false,
    //     idcargaacad: idcargaacad_actual,
    //     observacion: asistencia[a.idestudiante]?.motivo_ausencia || null,
    //     puntaje: null
    // }))
    // const { error: errAsis } = await supabase.from('asistencia_visita').insert(asisToInsert)
    // if(errAsis) return toast.error("Error guardando asistencia: " + errAsis.message)

        // 5. GUARDAR ASISTENCIA - BAREMO INDIVIDUAL 0-100% (OPCION A)
    // const idcargaacad_actual = headerData?.idcargaacad || null
    // const { error: errDelAsis } = await supabase.from('asistencia_visita').delete().eq('idvisitas', idvisitas).eq('tipo_actor','ALUMNO')
    // if(errDelAsis) console.log("warn delete asis:", errDelAsis.message)

    // const asisToInsert = alumnos.map(a => {
    //   const asis = asistencia[a.idestudiante] || {}
    //   const estaPresente = asis.presente?? true
    //   let porcentaje = null as number | null

    //   if(estaPresente){
    //     const totalPosible = preguntasAlumno.length * 5
    //     let totalObtenido = 0
    //     preguntasAlumno.forEach(p => {
    //       const key = `alu-${a.idestudiante}-${p.idficha}`
    //       totalObtenido += Number(respuestas[key] || 0)
    //     })
    //     if(totalPosible > 0){
    //       porcentaje = Math.round((totalObtenido / totalPosible) * 100) // 0-100 igual que visitasupervision
    //     }
    //   }

    //   return {
    //     idvisitas,
    //     idestudiante: a.idestudiante,
    //     iddocente: null,
    //     tipo_actor: 'ALUMNO',
    //     presente: estaPresente,
    //     motivo_ausencia: asis.motivo_ausencia || null,
    //     tiene_permiso: asis.tiene_permiso || false,
    //     idcargaacad: idcargaacad_actual,
    //     puntaje: porcentaje, // <-- aquí tu baremo individual 0-100
    //     observacion: asis.observacion_personal || asis.motivo_ausencia || null
    //   }
    // })

    // const { error: errAsis } = await supabase.from('asistencia_visita').insert(asisToInsert)
    // if(errAsis) return toast.error("Error guardando asistencia: " + errAsis.message)

        // 5. GUARDAR ASISTENCIA - BAREMO INDIVIDUAL 0-100% (OPCION A) - FIX
        // 5. GUARDAR ASISTENCIA - BAREMO INDIVIDUAL 0-100% (OPCION A) - FINAL SIN ERRORES
    const idcargaacad_actual = (headerData as any)?.idcargaacad || null
    await supabase.from('asistencia_visita').delete().eq('idvisitas', idvisitas).eq('tipo_actor','ALUMNO')

    const asisToInsert = alumnos.map((a: any) => {
      const asis = (asistencia as any)[a.idestudiante] || {}
      const estaPresente = asis.presente?? true
      let porcentaje: number | null = null

      if(estaPresente){
        const totalPosible = (preguntasAlumno as any[]).length * 5
        let totalObtenido = 0
        ;(preguntasAlumno as any[]).forEach((p: any) => {
          const key = `alu-${a.idestudiante}-${p.idficha}`
          totalObtenido += Number((respuestas as any)[key] || 0)
        })
        porcentaje = totalPosible > 0? Math.round((totalObtenido / totalPosible) * 100) : 0
      }

       // Calcula valoración individual
      let valoracionIndividual: string | null = null
      if(estaPresente && porcentaje !== null){
        valoracionIndividual = getValoracion(porcentaje)
      } else if(!estaPresente){
        valoracionIndividual = asis.tiene_permiso? 'Ausente con permiso' : 'Ausente sin permiso'
      }

      return {
        idvisitas,
        idestudiante: a.idestudiante,
        iddocente: null,
        tipo_actor: 'ALUMNO',
        presente: estaPresente,
        motivo_ausencia: asis.motivo_ausencia || null,
        tiene_permiso: asis.tiene_permiso || false,
        idcargaacad: idcargaacad_actual,
        puntaje: porcentaje,
        observacion: valoracionIndividual
      }
    })

    const { error: errAsis } = await supabase.from('asistencia_visita').insert(asisToInsert)
    if(errAsis) return toast.error("Error guardando asistencia: " + errAsis.message)


    // 6. CALCULO BAREMO - SOLO PRESENTES
    let porcentajeDocente = 0, porcentajeAlumno = 0
    let valoracionDocente = 'N/A', valoracionAlumno = 'N/A', resultadoGeneral = 'N/A'

    if(preguntasDocente.length > 0){
      const respuestasDoc = toInsert.filter(r => r.iddocente!== null)
      const totalPosibleDoc = preguntasDocente.length * 5
      const totalObtenidoDoc = respuestasDoc.reduce((sum, r) => sum + r.respuestaitem, 0)
      porcentajeDocente = totalPosibleDoc > 0? (totalObtenidoDoc / totalPosibleDoc) * 100 : 0
      valoracionDocente = respuestasDoc.length > 0? getValoracion(porcentajeDocente) : 'N/A'
    }
    if(preguntasAlumno.length > 0 && alumnosPresentes.length > 0){
      const respuestasAlu = toInsert.filter(r => r.idestudiante!== null)
      const totalPosibleAlu = preguntasAlumno.length * alumnosPresentes.length * 5
      const totalObtenidoAlu = respuestasAlu.reduce((sum, r) => sum + r.respuestaitem, 0)
      porcentajeAlumno = totalPosibleAlu > 0? (totalObtenidoAlu / totalPosibleAlu) * 100 : 0
      valoracionAlumno = respuestasAlu.length > 0? getValoracion(porcentajeAlumno) : 'N/A'
    }
    if(valoracionDocente!== 'N/A' || valoracionAlumno!== 'N/A'){
      resultadoGeneral = getGeneral(valoracionDocente, valoracionAlumno)
    }

    // 7. FOTOS
    let fotosSubidasOK = 0
    if(fotos.length > 0){
      for(let i = 0; i < fotos.length; i++){
        const file = fotos[i]
        const filePath = `${idvisitas}/${file.name}`
        const { error: errUpload } = await supabase.storage.from('evidenciasSigpacuc').upload(filePath, file, { upsert: true })
        if(!errUpload){
          fotosSubidasOK++
          await supabase.from('archivoevidencia').insert({ idvisitas, nombrearchivo: file.name, rutaarchivo: filePath, tipoarchivo: 'IMAGEN' })
        }
      }
    }

    // 8. ESTADO - SOLO EXIGE PRESENTES
    const totalPreguntas = preguntasDocente.length + (preguntasAlumno.length * alumnosPresentes.length)
    const totalRespondidas = toInsert.length
    let nuevoEstado = 'EN_PROCESO'
    if(totalRespondidas >= totalPreguntas && totalPreguntas > 0 && (fotosSubidasOK > 0 || fotosGuardadas.length > 0)) {
      nuevoEstado = 'SUPERVISADO'
    }

    const { error: errVisita } = await supabase.from('visitasupervision').update({
      condicion: nuevoEstado,
      observaciones: observacion,
      valoracion_docente: valoracionDocente,
      porcentaje_docente: parseFloat(porcentajeDocente.toFixed(2)),
      valoracion_alumno: valoracionAlumno,
      porcentaje_alumno: parseFloat(porcentajeAlumno.toFixed(2)),
      resultado_baremo_general: resultadoGeneral,
      id_logeado: user?.id || null,
      created_at: new Date().toLocaleString("sv-SE", { timeZone: "America/Lima", hour12: false }).replace(" ", "T") + "-05:00"
    }).eq('idvisitas', idvisitas)
    if(errVisita) return toast.error("Error al actualizar visita: " + errVisita.message)

    toast.success(`Ficha guardada. Estado: ${nuevoEstado} | Presentes: ${alumnosPresentes.length}/${alumnos.length}`, { duration: 3000, position: 'top-center' })
    setFotos([])
    await fetchData()
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

  // const limpiarFotos = () => setFotos([])

  const limpiarFotos = () => {
  if(esSoloLectura) return toast.error("No se puede limpiar en modo solo lectura") // <-- AGREGAR ESTO
  setFotos([])
  toast("Fotos nuevas limpiadas")
}

  const carga = headerData
  //Cambio segun Vercel- const cc = carga?.campoclinico
  //error 09-09- const cc = (carga as any)?.campoclinico?.[0] // <- con [0] porque es array
  //error 09-09- const iddocente = cc?.docente?.[0]?.iddocente // <- y docente también es array
const cc = carga?.campoclinico
const iddocente = cc?.docente?.iddocente
  return (
    <div className="modal-overlay" style={{zIndex: 1000}}>
      {/* <Toaster position="top-center" /> */}
       <Toaster 
        position="top-right" 
        toastOptions={{
          duration: 3000,
          style: {
            background: '#fff',
            color: '#1e293b',
            border: '1px solid #e2e8f0',
            borderRadius: '0.8rem',
            fontSize: '1.4rem',
            fontWeight: 600,
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } }
        }}
      />
      <div className="modal-content card-sgpc" style={{maxWidth: '95vw', width: '120rem', maxHeight: '90vh', overflowY: 'auto', padding: '0'}} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{color:'#fff', display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '1.6rem', margin: 0, fontWeight: 600}}><BookOpen size={20} />Ficha de Supervisión N° {idvisitas}</h2>
          <button onClick={onClose} className="btn-cerrar-modal"><X size={20} /></button>
        </div>

        <div className="modal-body" style={{marginRight: "1.5rem", marginLeft: "1.5rem",padding: '0rem 0rem'}}>
          {loading? <p>Cargando...</p> : <>
            {/* DATOS GENERALES - 3 CARDS */}
            {/* <div  style={{display:'flex', gap:'1rem', marginBottom: '0rem'}}> */}
              <div className='contenedor'>
                {/* <div className="card-info"><b>Periodo:</b> {cc?.periodoacademico?.nombre}</div> */}
                <div style={{display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.2rem', background: '#EFF6FF', borderRadius: '0.8rem', borderLeft: '4px solid #3B82F6'}}>
                  <Funnel size={20} color="#3B82F6"/>
                  <div>
                    <div style={{fontSize: '1.1rem', color: '#64748b'}}>Periodo</div>
                    <div style={{fontSize: '1.4rem', fontWeight: 700, color: '#1E293B'}}>{cc?.periodoacademico?.nombre}</div>
                  </div>
                </div>

                {/* <div className="card-info"><b>Filial:</b> {cc?.filial?.nombrefilial}</div> */}
                <div style={{display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.2rem', background: '#F0FDF4', borderRadius: '0.8rem', borderLeft: '4px solid #22C55E'}}>
                  <House size={20} color="#22C55E"/>
                  <div>
                    <div style={{fontSize: '1.1rem', color: '#64748b'}}>Filial</div>
                    <div style={{fontSize: '1.4rem', fontWeight: 700, color: '#1E293B'}}>{cc?.filial?.nombrefilial}</div>
                  </div>
                </div>

                {/* <div className="card-info"><b>Carrera:</b> {carga?.asignatura?.carrera?.nombrecarrera}</div> */}
                <div style={{display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.2rem', background: '#FFFBEB', borderRadius: '0.8rem', borderLeft: '4px solid #F59E0B'}}>
                  <Award size={20} color="#F59E0B"/>
                  <div>
                    <div style={{fontSize: '1.1rem', color: '#64748b'}}>Carrera</div>
                    <div style={{fontSize: '1.4rem', fontWeight: 700, color: '#1E293B'}}>{carga?.asignatura?.carrera?.nombrecarrera}</div>
                  </div>
                </div>


                {/* <div className="card-info"><b>EPS:</b> {cc?.eps?.razonsocial}</div> */}
                <div style={{display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.2rem', background: '#F8FAFC', borderRadius: '0.8rem', borderLeft: '4px solid #94A3B8'}}>
                  <Warehouse size={20} color="#64748b"/>
                  <div>
                    <div style={{fontSize: '1.1rem', color: '#64748b'}}>EPS</div>
                    <div style={{fontSize: '1.4rem', fontWeight: 700, color: '#1E293B'}}>{cc?.eps?.razonsocial}</div>
                  </div>
                </div>

                {/* <div className="card-info"><b>Asignatura:</b> {carga?.asignatura?.nombre}</div> */}
                <div style={{display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.2rem', background: 'hsl(340, 60%, 93%)', borderRadius: '0.8rem', borderLeft: '4px solid rgb(240, 37, 98)'}}>
                  <Newspaper size={20} color="rgb(240, 37, 98)"/>
                  <div>
                    <div style={{fontSize: '1.1rem', color: 'rgb(240, 37, 98)'}}>Asignatura</div>
                    <div style={{fontSize: '1.4rem', fontWeight: 700, color: '#1E293B'}}>{carga?.asignatura?.nombre}</div>
                  </div>
                </div>

                {/* <div className="card-info"><b>NRC:</b> {carga?.nrc}</div> */}
                <div style={{display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.2rem', background: '#f9f1fc', borderRadius: '0.8rem', borderLeft: '4px solid rgb(194, 17, 238)'}}>
                  <HatGlasses size={20} color="rgb(194, 17, 238)"/>
                  <div>
                    <div style={{fontSize: '1.1rem', color: '#64748b'}}>NRC</div>
                    <div style={{fontSize: '1.4rem', fontWeight: 700, color: '#1E293B'}}>{carga?.nrc}</div>
                  </div>
                </div>
            </div>

            {/* TABLA DOCENTE */}
            <h4 style={{display:'flex', alignItems:'center', color: 'white', background:'var(--color-primario)', borderRadius:'0.5rem', height:'3rem', margin: '0rem', paddingLeft:'0.5rem'}}>Ficha Docente: {cc?.docente?.persona?.dni} - {cc?.docente?.persona?.apellidos}, {cc?.docente?.persona?.nombres}</h4>
            <div className="card-sgpc" style={{overflowX: 'auto', marginBottom: '0rem', padding:'0rem'}}>
              <table className="tabla-sgpc">
                <thead><tr><th>ITEM</th><th style={{width: '20rem', textAlign:'center'}}>PUNTAJE 1-5</th></tr></thead>
                <tbody>
                  {/*Cambio segun Vercel-  {preguntasDocente.map(p => (
                    <tr key={p.idficha}>
                      <td className="col-item-docente" style={{fontSize:'1.1rem'}} >{p.item}</td>
                      <td  className="col-puntaje">
                            <RatingEstrellas
                              valor={respuestas[`doc-${cc?.docente?.iddocente}-${p.idficha}`] || 0}
                              onChange={(val) => handleRespuesta(`doc-${cc?.docente?.iddocente}-${p.idficha}`, val)}                            
                              disabled={esSoloLectura}
                            />
                      </td>
                    </tr>
                  ))} */}

                  {preguntasDocente
                  .filter(p => p.idficha!= null)
                  .map(p => {
                      const idDoc = iddocente?? 0
                      const idFicha = p.idficha!
                      const key = `doc-${idDoc}-${idFicha}` // <- SACAMOS LA KEY AFUERA

                      return (
                        <tr key={idFicha}>
                          <td className="col-item-docente" style={{fontSize:'1.1rem'}} >{p.item}</td>
                          <td className="col-puntaje">
                                <RatingEstrellas
                                  valor={respuestas[key] || 0}
                                  onChange={(val: number) => handleRespuesta(key, val)} // <- TIPEAMOS val: number
                                  disabled={esSoloLectura}
                                />
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>

            {/* TABLA ALUMNOS */}
            <h4 style={{display:'flex', alignItems:'center',color: 'white', background:'var(--color-primario)', borderRadius:'0.5rem',height:'3rem',  margin: '0rem', paddingLeft:'0.5rem'}}>Ficha Estudiantes NRC: {carga?.nrc}</h4>
            <div className="card-sgpc" style={{overflowX: 'auto', marginBottom: '0rem', padding:'0rem'}}>
              <table className="tabla-sgpc">
                {/* <thead style={{alignSelf:'center'}} ><tr><th className="col-dni">DNI</th><th className="col-alumno" >ESTUDIANTE</th>{preguntasAlumno.map(p => <th style={{fontSize: '1rem', textAlign:'center'}} key={p.idficha} className="col-item">{p.item}</th>)}</tr></thead> */}
                                <thead style={{alignSelf:'center'}} ><tr><th className="col-dni">DNI / ASIST</th><th className="col-alumno" >ESTUDIANTE</th>{preguntasAlumno.map(p => <th style={{fontSize: '1rem', textAlign:'center'}} key={p.idficha} className="col-item">{p.item}</th>)}</tr></thead>
                <tbody style={{fontSize: '1.1rem'}}>
                  {/* {alumnos.map(a => (
                    <tr key={a.idestudiante}>
                      <td className="col-dni">{a.persona.dni}</td>
                      <td className="col-alumno">
                        <div style={{fontWeight: 600, fontSize: '1.1rem', paddingLeft: '0.5rem'}}>{a.persona.apellidos}</div>
                        <div style={{fontSize: '1rem', color: '#64748b',paddingLeft: '0.5rem'}}>{a.persona.nombres}</div>
                      </td> */}

                  {alumnos.map(a => {
                    const asis = asistencia[a.idestudiante] || { presente: true, motivo_ausencia: '', tiene_permiso: false }
                    const estaPresente = asis.presente!== false
                    return (
                    <tr key={a.idestudiante} style={{opacity: estaPresente? 1 : 0.6, background: estaPresente? 'transparent' : '#FEF2F2'}}>
                      <td className="col-dni">
                        <div>{a.persona.dni}</div>
                        <label style={{display:'flex', alignItems:'center', gap:'0.3rem', marginTop:'0.4rem', cursor:'pointer', fontSize:'1rem'}}>
                          <input type="checkbox" checked={estaPresente} disabled={esSoloLectura}
                            onChange={e => setAsistencia({...asistencia, [a.idestudiante]: {...asis, presente: e.target.checked}})} />
                          {estaPresente? 'Presente' : 'Ausente'}
                        </label>
                      </td>
                      <td className="col-alumno">
                        <div style={{fontWeight: 600, fontSize: '1.1rem', paddingLeft: '0.5rem'}}>{a.persona.apellidos}</div>
                        <div style={{fontSize: '1rem', color: '#64748b',paddingLeft: '0.5rem'}}>{a.persona.nombres}</div>
                        {!estaPresente && (
                          <div style={{padding:'0.5rem'}}>
                            <input placeholder="Motivo ausencia" disabled={esSoloLectura} value={asis.motivo_ausencia}
                              onChange={e => setAsistencia({...asistencia, [a.idestudiante]: {...asis, motivo_ausencia: e.target.value}})}
                              style={{width:'100%', fontSize:'1rem', padding:'0.3rem', border:'1px solid #fca5a5', borderRadius:'0.3rem'}} />
                            <label style={{display:'flex', alignItems:'center', gap:'0.3rem', marginTop:'0.3rem', fontSize:'0.9rem'}}>
                              <input type="checkbox" checked={asis.tiene_permiso} disabled={esSoloLectura}
                                onChange={e => setAsistencia({...asistencia, [a.idestudiante]: {...asis, tiene_permiso: e.target.checked}})} />
                              Con permiso
                            </label>
                          </div>
                        )}
                      </td>
                      {/*Cambio segun Vercel- {preguntasAlumno.map(p => (
                        <td className="col-item" key={p.idficha}  >
                          <div style={{display: 'flex', justifyContent: 'center'}}>
                          <RatingEstrellas
                            valor={respuestas[`alu-${a.idestudiante}-${p.idficha}`] || 0}
                            onChange={(val) => handleRespuesta(`alu-${a.idestudiante}-${p.idficha}`, val)}
                            disabled={esSoloLectura}
                          />
                          </div>
                        </td>
                      ))} */}

                      {preguntasAlumno
                        .filter(p => p.idficha!= null) // <- MATAMOS NULL
                        .map(p => {
                            const idAlu = a.idestudiante?? 0 // <- ENCERRAMOS
                            const idFicha = p.idficha!
                            const key = `alu-${idAlu}-${idFicha}` // <- KEY AFUERA

                            return (
                              <td className="col-item" key={idFicha} >
                                <div style={{display: 'flex', justifyContent: 'center'}}>
                                <RatingEstrellas
                                  valor={respuestas[key] || 0}
                                  onChange={(val: number) => handleRespuesta(key, val)} // <- TIPEAMOS val
                                  disabled={esSoloLectura}
                                />
                                </div>
                              </td>
                            )
                          })}
                    </tr>)
                  })}
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

        <div className="modal-footer" style={{borderTop: '2px solid var(--color-primario)'}}>
          <input
            type="file"
            accept="image/*"
            capture="environment" // <-- ESTO ABRE LA CAMARA
            onChange={handleTomarFoto} // <-- USAMOS NUESTRA FUNCION
            id="uploadFoto"
            style={{display: 'none'}}
            disabled={esSoloLectura || fotosGuardadas.length + fotos.length >= 5}
          />

        <label htmlFor="uploadFoto" className="btn btn-outline" style={{opacity: esSoloLectura || fotosGuardadas.length + fotos.length >= 5? 0.5 : 1, pointerEvents: esSoloLectura ? 'none' : 'auto'}}>
          <Camera size={16}/> Tomar fotografía
        </label>

          <button className="btn btn-outline" onClick={limpiarFotos} style={{
            opacity: esSoloLectura ? 0.5 : 1, // solo visual
            cursor: esSoloLectura ? 'not-allowed' : 'pointer'
          }}>
            <Eraser size={16}/> Limpiar Fotos
          </button>


          {!esSoloLectura && ( // <-- SOLO MUESTRA EL BOTON SI NO ES SOLO LECTURA
          <button className="btn btn-primario" onClick={handleSalir}>
            <Check size={16}/> Guardar y Salir
          </button>
        )}
        </div>

      </div>
<style jsx>{`
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.5);
    display: flex; align-items: center; justify-content: center;
    z-index: 2000; padding: 1rem;
  }
  // .modal-header {
  //   display: flex; justify-content: space-between; align-items: center;
  //   padding: 1.5rem; border-bottom: 1px solid #e2e8f0;
  //    flex-shrink: 0;
  // }
  .modal-header { 
  background: var(--color-primario); 
  color: #fff; 
  padding: 2rem 2.4rem; 
  display: flex; 
  justify-content: space-between; 
  align-items: center;
  border-radius: 1.2rem 1.2rem 0 0;
}
  .btn-cerrar-modal { color: #fff; background: transparent; border: none; margin-top: -1.5rem; margin-right: -1.5rem;}
  .modal-header h2 { font-size: 1.8rem; font-weight: 700; display: flex; align-items: center; color: #fff; }
  .btn-cerrar { border: none; border-radius: 0.8rem; padding: 0.8rem; cursor: pointer; color: #fff; display: flex; transition: all 0.5s ease;  background: transparent; }
  .btn-cerrar:hover { /* 3. HOVER DEL BOTON X */
  background: #FEE2E2; /* fondo rojo clarito */
  color: #DC2626; /* X roja */
  transform: scale(1.1);
}
  .modal-body { padding: 1.5rem; overflow-y: auto; flex: 1; min-height: 0; padding:1rem;}
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
    display: flex;
    justify-content:center;
    gap: 0.8rem;
    padding: 1.2rem 1.5rem;
    border-top: 1px solid #e2e8f0;
    background: #f8fafc;
    flex-shrink: 0;
    flex-wrap: wrap;
  }
 

  .btn {
    display: flex;
    flex:1 1 18rem;
    
    align-items: center; justify-content: center; gap: 0.8rem;
   height: 4.8rem; padding: 0 2rem; border-radius: 0.8rem;
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
  
  /* COMENTARIO CORRECTO EN CSS ES CON /* */ */
  /* .modal-footer { grid-template-columns: 1fr; flex-wrap: wrap;} */
  
  .modal-footer { 
    flex-direction: column; /* 1 debajo de otro */
    gap: 1rem; /* espacio */
  }
  
  .btn { 
    flex: 1 1 100%; 
    max-width: 100%;  
    width: 100%;  
  }
  
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
  /* Mobile first: en móvil, 1 columna por defecto */
.contenedor {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px; /* espacio entre divs */
  width: 100%;  
}

/* Tablet: 2 columnas */
@media (min-width: 600px) {
  .contenedor {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Escritorio: 3 columnas por fila, los siguientes bajan a la otra fila */
@media (min-width: 900px) {
  .contenedor {
    grid-template-columns: repeat(3, 1fr);
  }
}


`}</style>

    </div>
  )

}