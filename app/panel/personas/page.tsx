'use client'
import { useEffect, useState, useMemo, useRef } from 'react'
import { createClient } from '@/lib/client'
import { Plus, Edit, Trash2, X, Search, Upload, Phone, User, IdCard, Users, Shield, AlertTriangle, Check, Ban, ChevronLeft, ChevronRight, Eraser, Save } from 'lucide-react' // <- Agregue 2 iconos
import * as XLSX from 'xlsx'
import Select from 'react-select'
import toast, { Toaster } from 'react-hot-toast' // NUEVO

type Persona = {
  idpersona: number
  dni: string
  apellidos: string
  nombres: string
  telefono: string | null
  sexo: 'M' | 'F' | null
  created_at: string
  idrol: number | null
  estado: string
  rol?: { nombrerol: string }
}

type Rol = {
  idrol: number
  nombrerol: string
}

const SelectSGPCFieldset = ({label, value, onChange, options}:any) => {
  const selectedOption = options.find((o:any) => o.value === value) || null
  return (
    <fieldset className="fieldset-sgpc">
      <legend>{label}</legend>
      <Select options={options} value={selectedOption} onChange={(opt:any) => onChange(opt?.value || null)} placeholder="Seleccione..." isSearchable maxMenuHeight={200} classNamePrefix="react-select" menuPortalTarget={typeof window !== 'undefined' ? document.body : null} menuPosition="fixed" styles={{ control: (base, state) => ({...base, height: '4.4rem', minHeight: '4.4rem', borderRadius: '0.6rem', border: '1px solid #cbd5e1', background: '#fff', boxShadow: state.isFocused? '0 0 0 1px var(--color-primario)' : 'none', marginTop: '0.4rem', cursor: 'pointer' }), valueContainer: (base) => ({...base, padding: '0 1.2rem', height: '4.4rem' }), input: (base) => ({...base, margin: 0, padding: 0 }), indicatorsContainer: (base) => ({...base, height: '4.4rem' }), option: (base, state) => ({...base, backgroundColor: state.isSelected? 'var(--color-primario)' : state.isFocused? 'var(--color-acento)' : '#fff', color: state.isSelected? '#fff' : 'var(--color-texto)', padding: '1rem 1.2rem' }), menu: (base) => ({...base, zIndex: 9999, marginTop: '0.4rem' }) }} />
    </fieldset>
  )
}

// const SelectSGPCFieldset = ({label, value, onChange, options, isAsync = false, loadOptions, isDisabled = false}:any) => {
//   const Component = isAsync? AsyncSelect : Select
//   return (
//     <fieldset className="fieldset-sgpc">
//       <legend>{label}</legend>
//       <Component
//         options={isAsync? undefined : options}
//         loadOptions={isAsync? loadOptions : undefined}
//         defaultOptions={isAsync}
//         cacheOptions={isAsync}
//         value={value}
//         onChange={onChange}
//         isDisabled={isDisabled}
//         placeholder="Seleccione..." isSearchable maxMenuHeight={200}
//         classNamePrefix="react-select"
//         menuPortalTarget={typeof document !== 'undefined' ? document.body : null} // <-- ESTO ES CLAVE
//         menuPosition="fixed"
//         styles={{ 
//           //control: (base, state) => ({...base, height: '4.4rem', minHeight: '4.4rem', borderRadius: '0.6rem', border: '1px solid #cbd5e1', background: '#fff', boxShadow: state.isFocused? '0 0 0 1px var(--color-primario)' : 'none', marginTop: '0.4rem' }), 
//           control: (base, state) => ({...base, height: '4.4rem', minHeight: '4.4rem', borderRadius: '0.6rem', border: '1px solid #cbd5e1', background: '#fff', boxShadow: state.isFocused? '0 0 0 1px var(--color-primario)' : 'none', marginTop: '0.4rem', cursor: 'pointer' }), valueContainer: (base) => ({...base, padding: '0 1.2rem', height: '4.4rem' }), input: (base) => ({...base, margin: 0, padding: 0 }), indicatorsContainer: (base) => ({...base, height: '4.4rem' }), option: (base, state) => ({...base, backgroundColor: state.isSelected? 'var(--color-primario)' : state.isFocused? 'var(--color-acento)' : '#fff', color: state.isSelected? '#fff' : 'var(--color-texto)', padding: '1rem 1.2rem' }),
//           menuPortal: (base) => ({...base, zIndex: 99999 }), // <-- ESTO ES CLAVE
//           menu: (base) => ({...base, zIndex: 9999 }) 
//         }}
//       />
//     </fieldset>
//   )
// }

export default function PersonasPage() {
  const supabase = createClient()
  const [personas, setPersonas] = useState<Persona[]>([])
  const [roles, setRoles] = useState<Rol[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [idAEliminar, setIdAEliminar] = useState<number | null>(null)
  const [editing, setEditing] = useState<Persona | null>(null)
  const [form, setForm] = useState<Partial<Persona>>({})
  const [search, setSearch] = useState('')
  const [filtroRol, setFiltroRol] = useState<number | null>(null) // NUEVO
  const [filtroSexo, setFiltroSexo] = useState('')
  const [totalRegistros, setTotalRegistros] = useState(0)
  const [dniInputBloqueado, setDniInputBloqueado] = useState(true)
  const [camposBloqueados, setCamposBloqueados] = useState(true)
  //const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null)
  const dniInputRef = useRef<HTMLInputElement>(null)
  const apellidosInputRef = useRef<HTMLInputElement>(null)

  const [previewData, setPreviewData] = useState<any[]>([])
  const [showPreviewModal, setShowPreviewModal] = useState(false)

  const [filtroEstado, setFiltroEstado] = useState<string>('ACTIVO') // NUEVO: ACTIVO, ANULADO, TODOS
  // 1. NUEVOS ESTADOS PARA PAGINACION
  const [paginaActual, setPaginaActual] = useState(1)
  const registrosPorPagina = 10

  // const showToast = (msg: string, type: 'error' | 'success' = 'error') => {
  //   setToast({ msg, type })
  //   setTimeout(() => setToast(null), 3000)
  // }

const SelectSGPC = ({label, value, onChange, options, placeholder, isDisabled = false}:any) => {
  const selectedOption = options.find((o:any) => o.value === value) || null
  
  return (
    <div className="input-wrapper">
      <label className="input-label">{label}</label>
      <Select
        options={options}
        value={selectedOption}
        onChange={(opt:any) => onChange(opt?.value || null)}
        placeholder=""
        isDisabled={isDisabled}
        isSearchable={true}
        menuPortalTarget={typeof document!== 'undefined'? document.body : null}
        classNamePrefix="react-select"
        noOptionsMessage={() => "No se encontraron resultados"}
        styles={{
          control: (base, state) => ({
            ...base,
            minHeight: '5.2rem',
            height: '5.2rem',
            borderRadius: '0.8rem',
            border: state.isFocused ? '2px solid var(--color-primario)' : '1px solid #cbd5e1',
            boxShadow: 'none',
            fontSize: '1.4rem',
            fontFamily: 'var(--font-principal)',
            background: isDisabled ? '#f3f4f6' : 'white',
            marginTop: '0.8rem', // CLAVE: MISMO MARGEN QUE EL INPUT
          }),
          valueContainer: (base) => ({
            ...base,
            padding: '0.8rem 1.4rem 1rem 1.4rem', // SIN ESPACIO ARRIBA
          }),
          singleValue: (base) => ({
            ...base, 
            color: 'var(--color-texto)',
            margin: 0,
          }),
          placeholder: (base) => ({ display: 'none' }),
          menuPortal: (base) => ({...base, zIndex: 99999 }),
          indicatorsContainer: (base) => ({ height: '5.2rem' })
        }}
      />
    </div>
  )
}

  const toTitleCase = (str: string) =>
    str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase())


const fetchPersonas = async () => {
  setLoading(true)
  const desde = (paginaActual - 1) * registrosPorPagina
  const hasta = desde + registrosPorPagina - 1

  // 1. Traer solo la página + contar total
  let query = supabase
    .from('persona')
    .select('*, rol(nombrerol)', { count: 'exact' }) // <-- JOIN directo
    //.eq('estado', 'ACTIVO')
      if(filtroEstado !== 'TODOS') {
        query = query.eq('estado', filtroEstado)
      }

  if(search) {
    query = query.or(`dni.ilike.%${search}%,nombres.ilike.%${search}%,apellidos.ilike.%${search}%`)
  }
  if(filtroSexo) query = query.eq('sexo', filtroSexo)
  if(filtroRol) query = query.eq('idrol', filtroRol)

  const { data, count, error } = await query
    .order('idpersona', { ascending: false }) // <-- Mas nuevo primero
    .range(desde, hasta)

  if(error) {
    toast.error(error.message)
    console.error(error)
  } else {
    setPersonas(data as Persona[] || []) // ya viene con rol
    setTotalRegistros(count || 0) // <-- NUEVO ESTADO
  }
  
  const { data: rolesData } = await supabase.from('rol').select('idrol, nombrerol')
  setRoles(rolesData || [])
  setLoading(false)
}
  //useEffect(() => { fetchPersonas() }, [])
  useEffect(() => { fetchPersonas() }, [paginaActual, search, filtroSexo, filtroRol, filtroEstado])
  //useEffect(() => { fetchPersonas() }, [paginaActual, search, filtroSexo, filtroRol, filtroEstado]) // <-- AGREGAR filtroEstado

  const validarDNI = async (dniValue: string) => {
    if (!dniValue || dniValue.length!== 8) return

    setLoading(true)
    const { data } = await supabase.from('persona').select('idpersona, estado').eq('dni', dniValue).maybeSingle()
    setLoading(false)

    if (data) {
      if(data.estado === 'ANULADO'){
        toast.error('Este DNI está ANULADO. Reactívelo primero')
      } else {
        toast.error('Este Nro. De DNI ya está registrado')
      }
      setDniInputBloqueado(false)
      setCamposBloqueados(true)
      setTimeout(() => {
        setForm(prev => ({...prev, dni: '', apellidos: '', nombres: '', telefono: '', sexo: '' }))
        dniInputRef.current?.focus()
      }, 1500)
    } else {
      toast.success('Nro. De DNI Nuevo')
      setDniInputBloqueado(true)
      setCamposBloqueados(false)
      setTimeout(() => {
        apellidosInputRef.current?.focus()
      }, 50)
    }
  }

  const handleDniChange = (dni: string) => {
    const soloNumeros = dni.replace(/\D/g, '')
    const dniLimitado = soloNumeros.slice(0, 8)
    setForm({...form, dni: dniLimitado })

    if (dniLimitado.length < 8) {
      setDniInputBloqueado(false)
      setCamposBloqueados(true)
    }

    if (dniLimitado.length === 8) {
      validarDNI(dniLimitado)
    }
  }

  const handleDniKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      validarDNI(form.dni || '')
    }
  }

  const puedeGuardar = useMemo(() => {
    return!camposBloqueados
      && form.dni?.length === 8
      && form.nombres?.trim()
      && form.apellidos?.trim()
      && (form.sexo === 'M' || form.sexo === 'F')
  }, [camposBloqueados, form])

  // 2. LOGICA DE PAGINACION
  //const totalPaginas = Math.ceil(personasFiltradas.length / registrosPorPagina)
  const indiceInicio = (paginaActual - 1) * registrosPorPagina
  const totalPaginas = Math.ceil(totalRegistros / registrosPorPagina)
  const indiceFin = indiceInicio + registrosPorPagina
  //const indiceFin = indiceInicio + registrosPorPagina
  //const personasPaginadas = personasFiltradas.slice(indiceInicio, indiceFin)

  useEffect(() => { // Reinicia pag al buscar/filtrar
  setPaginaActual(1)
  }, [search, filtroSexo, filtroRol, filtroEstado]) // AGREGUE filtroRol

  const handleSave = async () => {
    if (!puedeGuardar) return;

    try {
      let mensaje = '';

      if (editing) {
        const { error } = await supabase
      .from('persona')
      .update({
            dni: form.dni,
            nombres: form.nombres,
            apellidos: form.apellidos,
            telefono: form.telefono || null,
            sexo: form.sexo || null,
            idrol: form.idrol
          })
      .eq('idpersona', editing.idpersona);

        if (error) throw error;
        mensaje = 'Datos actualizados correctamente';
      } else {
        const { error } = await supabase
      .from('persona')
      .insert({
            dni: form.dni,
            nombres: form.nombres,
            apellidos: form.apellidos,
            telefono: form.telefono || null,
            sexo: form.sexo || null,
            idrol: form.idrol,
            estado: 'ACTIVO'
          });

        if (error) throw error;
        mensaje = 'Persona registrada correctamente';
      }

      toast.success(mensaje);
      await fetchPersonas();
      closeModal();

    } catch (err: any) {
      toast.error(err.message || 'Error al guardar');
    }
  }

  const handleDelete = (id: number) => {
    setIdAEliminar(id)
    setShowConfirm(true)
  }

  const confirmarEliminar = async () => {
    if (!idAEliminar) return

    const { error } = await supabase
    .from('persona')
    .update({ estado: 'ANULADO' })
    .eq('idpersona', idAEliminar)

    if (error) {
      toast.error('Error al anular: ' + error.message)
    } else {
      toast.success('Registro anulado correctamente')
      fetchPersonas()
    }
    setShowConfirm(false)
    setIdAEliminar(null)
  }

  const handleRestaurar = async (id: number) => {
  const { error } = await supabase
    .from('persona')
    .update({ estado: 'ACTIVO' })
    .eq('idpersona', id)

  if (error) {
    toast.error('Error al restaurar: ' + error.message)
  } else {
    toast.success('Persona restaurada correctamente')
    fetchPersonas()
  }
}

    const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    const reader = new FileReader()
    reader.onload = async (evt) => {
      
      const bstr = evt.target?.result
      const wb = XLSX.read(bstr, { type: 'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      const filas = data.slice(1)

      const { data: personasExistentes } = await supabase.from('persona').select('dni, estado')
      const dnisExistentes = new Set(personasExistentes?.filter(p=>p.estado==='ACTIVO').map(p => p.dni))

      const preview: any[] = []

      filas.forEach((row, index) => {
        let dni = row[0]?.toString().replace(/\D/g, '') || ''
        dni = dni.padStart(8, '0')

        const apellidosRaw = row[1]?.toString().trim() || ''
        const nombresRaw = row[2]?.toString().trim() || ''
        const telefono = row[3]?.toString().trim() || ''
        const sexoRaw = row[4]?.toString().trim().toUpperCase() || ''
        const idrol = Number(row[5]) || 4

        const apellidos = apellidosRaw.toUpperCase()
        const nombres = toTitleCase(nombresRaw)

        let motivo = ''
        let estado: 'ok' | 'error' = 'ok'

        if (!dni || dni.length!== 8) {
          motivo = 'DNI inválido'
          estado = 'error'
        } else if (!nombres ||!apellidos) {
          motivo = 'Faltan Nombres o Apellidos'
          estado = 'error'
        } else if (dnisExistentes.has(dni)) {
          motivo = 'DNI ya registrado'
          estado = 'error'
        }

        preview.push({
          fila: index + 1,
          dni,
          apellidos,
          nombres,
          telefono,
          sexo: ['M','F'].includes(sexoRaw)? sexoRaw : '',
          idrol,
          estadoRegistro: 'ACTIVO',
          motivo,
          estado
        })
      })

      setPreviewData(preview)
      setShowPreviewModal(true)
      setLoading(false)
    }
    
    reader.readAsBinaryString(file)
    e.target.value = ''
  }

  const handleConfirmImport = async () => {
    const paraGrabar = previewData
    .filter(p => p.estado === 'ok')
    .map(p => ({
        dni: p.dni,
        apellidos: p.apellidos,
        nombres: p.nombres,
        telefono: p.telefono || null,
        sexo: p.sexo || null,
        idrol: p.idrol,
        estado: 'ACTIVO'
      }))

    if (paraGrabar.length === 0) {
      toast.error('No hay registros válidos para importar')
      return
    }

    setLoading(true)
    const { error } = await supabase.from('persona').insert(paraGrabar)
    setLoading(false)

    if (error) {
      toast.error('Error al importar: ' + error.message)
      console.error(error)
    } else {
      toast.success(`Se importaron ${paraGrabar.length} personas correctamente`)
      fetchPersonas()
    }
    setShowPreviewModal(false)
    setPreviewData([])
  }

  const handleExportarErrores = () => {
  const errores = previewData.filter(p => p.estado === 'error')
  
  if(errores.length === 0) {
    toast.success('No hay registros con error para exportar')
    return
  }

  const ws = XLSX.utils.json_to_sheet(errores.map(e => ({
    FILA: e.fila,
    DNI: e.dni,
    APELLIDOS: e.apellidos,
    NOMBRES: e.nombres,
    SEXO: e.sexo,
    ROL: roles.find(r=>r.idrol===e.idrol)?.nombrerol || 'Sin Rol',
    MOTIVO: e.motivo
  })))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Errores")
  XLSX.writeFile(wb, "Errores_Importacion_Personas.xlsx")
  
  toast.success(`Se exportaron ${errores.length} registros con error`)
}

  const openModal = (persona?: Persona) => {
    if (persona) {
      setEditing(persona);
      setForm({
        dni: persona.dni,
        nombres: persona.nombres,
        apellidos: persona.apellidos,
        telefono: persona.telefono,
        sexo: persona.sexo || '',
        idrol: persona.idrol
      });
      setDniInputBloqueado(true)
      setCamposBloqueados(false)
    } else {
      setEditing(null);
      setForm({ dni: '', nombres: '', apellidos: '', telefono: '', sexo: '', idrol: 4 });
      setDniInputBloqueado(false)
      setCamposBloqueados(true)
      setTimeout(() => dniInputRef.current?.focus(), 100)
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false);
    setForm({});
    setEditing(null);
    setDniInputBloqueado(true);
    setCamposBloqueados(true);
  }

  
  return (
     <>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
    <div>
      <div className="header-responsive">
        <div>
          <h1> <Users size={24} /> Registro de Personas</h1>
          {/* <p>Total: {totalRegistros} registros ACTIVOS</p> */}
          <p>Total: {totalRegistros} registros {filtroEstado === 'TODOS' ? '' : filtroEstado}</p>
        </div>
        <div style={{ display: 'flex', gap: '1.2rem' }}>
          {/* <label htmlFor="import-excel" className="btn-secundario" style={{ cursor: 'pointer' }}>
            <Upload size={18} />
            Importar Excel
          </label> */}
          <button
  type="button"
  className="btn-secundario"
  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.8rem' }}
  onClick={() => {
    toast('Estructura del excel: DNI | APELLIDOS | NOMBRES | TELEFONO | SEXO | ROL',
      { icon: 'ℹ️', duration: 6000 }
    )
    setTimeout(() => document.getElementById('import-excel')?.click(), 100)
  }}
>
  <Upload size={18} />
  Importar Excel
</button>
          <input
            id="import-excel"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImportExcel}
            style={{ display: 'none' }}
          />
          <button className="btn-primario" onClick={() => openModal()}>
            <Plus size={18} />
            Nueva Persona
          </button>
        </div>
      </div>

    <div className="card-sgpc" style={{ marginBottom: '2.4rem', padding: '2rem' }}>
  <div className="grid-filtros-personas">
    
    <SelectSGPCFieldset 
      label="Sexo"
      value={filtroSexo || ""}
      onChange={(val:any) => setFiltroSexo(val)}
      placeholder="Todos"
      options={[
        {value: "M", label: "Masculino"},
        {value: "F", label: "Femenino"}
      ]}
    />

    <SelectSGPCFieldset 
      label="Rol"
      value={filtroRol || ""}
      onChange={(val:any) => setFiltroRol(val)}
      placeholder="Todos"
      options={roles.map(r => ({value: r.idrol, label: r.nombrerol}))}
    />
    <SelectSGPCFieldset 
  label="Estado"
  value={filtroEstado || "ACTIVO"}
  onChange={(val:any) => setFiltroEstado(val)}
  options={[
    {value: "ACTIVO", label: "ACTIVOS"},
    {value: "ANULADO", label: "ANULADOS"},
    {value: "TODOS", label: "Todos"}
  ]}
/>

    <div style={{ position: 'relative', width: "100%" }}>
      <Search size={18} style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, zIndex: 1 }} />
      <input 
        className="input-sgpc" 
        placeholder="Buscar por DNI, Nombres, Apellidos..." 
        value={search} 
        onChange={e => setSearch(e.target.value)} 
        style={{ paddingLeft: '4rem', height: "4.4rem", width: "100%" }} 
      />
    </div>

    <button 
      className="btn-secundario btn-limpiar" 
      // onClick={() => {setSearch(""); setFiltroSexo(null); setFiltroRol(null)}}
      onClick={() => {setSearch(""); setFiltroSexo(""); setFiltroRol(null); setFiltroEstado("ACTIVO")}}
    >
      <Eraser size={16} />Limpiar
    </button>
  </div>
</div>

      <div className="card-sgpc" style={{ overflowX: 'auto' }}>
        {loading? <p>Cargando...</p> : (
          <table className='tabla-sgpc'>
            <thead>
              <tr style={{ borderBottom: '0.2rem solid var(--color-borde)', textAlign: 'left' }}>
                <th style={{ padding: '1rem', width: '6rem' }}>Nro.</th> 
                <th style={{ padding: '1rem' }}>DNI</th>
                <th style={{ padding: '1rem' }}>Apellidos</th>
                <th style={{ padding: '1rem' }}>Nombres</th>
                <th style={{ padding: '1rem' }}>Teléfono</th>
                <th style={{ padding: '1rem' }}>Sexo</th>
                <th style={{ padding: '1rem' }}>Rol</th>
                <th style={{ padding: '1rem' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <>{personas.map((p, index) => (<tr key={p.idpersona} style={{ borderBottom: '1px solid var(--color-borde)' }}><td style={{ padding: '1rem', fontWeight: 600 }}>{indiceInicio + index + 1}</td><td style={{ padding: '1rem' }}>{p.dni}</td><td style={{ padding: '1rem' }}>{p.apellidos}</td><td style={{ padding: '1rem' }}>{p.nombres}</td><td style={{ padding: '1rem' }}>{p.telefono || '-'}</td><td style={{ padding: '1rem' }}>{p.sexo === 'M'? 'Masculino' : p.sexo === 'F'? 'Femenino' : '-'}</td><td style={{ padding: '1rem', fontWeight: 600 }}>{p.rol?.nombrerol || 'Sin Rol'}</td>
              {/* <td style={{ padding: '1rem', display: 'flex', gap: '0.8rem' }}><button className="btn-icon btn-icon-editar" onClick={() => openModal(p)}><Edit size={15} /></button><button className="btn-icon btn-icon-eliminar" onClick={() => handleDelete(p.idpersona)}><Trash2 size={15} /></button></td> */}
              <td style={{ padding: '1rem', display: 'flex', gap: '0.8rem' }}>
  {p.estado === 'ACTIVO' ? (
    <>
      <button className="btn-icon btn-icon-editar" onClick={() => openModal(p)}><Edit size={15} /></button>
      <button className="btn-icon btn-icon-eliminar" onClick={() => handleDelete(p.idpersona)}><Trash2 size={15} /></button>
    </>
  ) : (
    <>
      <button className="btn-icon" style={{background: '#10b981', color: '#fff'}} onClick={() => handleRestaurar(p.idpersona)}><Check size={15} /></button>
    </>
  )}
</td>
              </tr>))}</>
            </tbody>
          </table>
        )}
      </div>

      {/* 3. FOOTER DE PAGINACION NUEVO */}
      {totalPaginas > 1 && (
        <div className="paginacion-footer">
          {/* <p className="paginacion-info">
            Mostrando {indiceInicio + 1} al {Math.min(indiceFin, personasFiltradas.length)} de {personasFiltradas.length} registros
          </p> */}
          <p className="paginacion-info">
  Mostrando {indiceInicio + 1} al {Math.min(indiceFin, totalRegistros)} de {totalRegistros} registros
</p>
{/* <span className="paginacion-pagina">
  Pág {paginaActual} de {totalPaginas}
</span> */}
          <div className="paginacion-controles">
            <button
              className="btn-pag"
              onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
              disabled={paginaActual === 1}
            >
              <ChevronLeft size={16} /> Anterior
            </button>
            <span className="paginacion-pagina">
              Pág {paginaActual} de {totalPaginas}
            </span>
            <button
              className="btn-pag btn-pag-primario"
              onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
              disabled={paginaActual === totalPaginas}
            >
              Siguiente <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

{showModal && (
  <div className="modal-overlay" >
    <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{maxWidth: '55rem', padding: '0', borderRadius: '1.2rem', overflow: 'hidden'}}>
      
      {/* HEADER AZUL EJECUTIVO */}
      <div className="modal-header" style={{background: 'var(--color-primario)', color: '#fff', padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h2 style={{color:'#fff', display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '1.6rem', margin: 0, fontWeight: 600}}>
          <User size={22}/>{editing ? 'Editar Persona' : 'Nueva Persona'}
        </h2>
        <button onClick={closeModal} className="btn-cerrar-modal" style={{background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.8rem', borderRadius: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'}}>
          <X size={20} />
        </button>
      </div>

      {/* BODY CON CARDS */}
      <div className="modal-body" style={{padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem'}}>
        
        {/* CARD DNI */}
        <div className="card-info-ejecutiva" style={{borderLeft: '4px solid #3B82F6', background: '#EFF6FF'}}>
          <IdCard size={20} color="#3B82F6"/>
          <div style={{flex: 1}}>
            <div className="card-info-label">DNI *</div>
            <input 
              ref={dniInputRef} 
              className="input-sin-borde"
              placeholder="12345678" 
              type="text" 
              inputMode="numeric" 
              value={form.dni || ''} 
              onChange={e => handleDniChange(e.target.value)} 
              onKeyDown={handleDniKeyDown} 
              onBlur={() => validarDNI(form.dni || '')} 
              maxLength={8} 
              disabled={dniInputBloqueado} 
            />
          </div>
        </div>

        {/* CARD APELLIDOS */}
        <div className="card-info-ejecutiva" style={{borderLeft: '4px solid #10B981', background: '#ECFDF5'}}>
          <User size={20} color="#10B981"/>
          <div style={{flex: 1}}>
            <div className="card-info-label">Apellidos *</div>
            <input 
              ref={apellidosInputRef} 
              className="input-sin-borde"
              placeholder="Pérez García" 
              value={form.apellidos || ''} 
              onChange={e => setForm({...form, apellidos: e.target.value })} 
              disabled={camposBloqueados} 
              maxLength={200}
            />
          </div>
        </div>

        {/* CARD NOMBRES */}
        <div className="card-info-ejecutiva" style={{borderLeft: '4px solid #F59E0B', background: '#FFFBEB'}}>
          <User size={20} color="#F59E0B"/>
          <div style={{flex: 1}}>
            <div className="card-info-label">Nombres *</div>
            <input 
              className="input-sin-borde"
              placeholder="Juan Carlos" 
              value={form.nombres || ''} 
              onChange={e => setForm({...form, nombres: e.target.value })} 
              disabled={camposBloqueados}
              maxLength={200}
            />
          </div>
        </div>

        {/* CARD TELEFONO */}
        <div className="card-info-ejecutiva" style={{borderLeft: '4px solid #6366F1', background: '#EEF2FF'}}>
          <Phone size={20} color="#6366F1"/>
          <div style={{flex: 1}}>
            <div className="card-info-label">Teléfono</div>
            <input 
              className="input-sin-borde"
              placeholder="987654321" 
              value={form.telefono || ''} 
              onChange={e => setForm({...form, telefono: e.target.value })} 
              disabled={camposBloqueados}
              maxLength={20}
            />
          </div>
        </div>

        {/* FIELDSET ROL Y SEXO */}
        
          
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
            <SelectSGPCFieldset
              label="Sexo *"
              value={form.sexo || ""}
              onChange={(val:any) => setForm({...form, sexo: val })}
              options={[{value: "M", label: "Masculino"},{value: "F", label: "Femenino"}]}
            />
            <SelectSGPCFieldset
              label="Rol"
              value={form.idrol || ""}
              onChange={(val:any) => setForm({...form, idrol: val })}
              options={roles.map(r => ({value: r.idrol, label: r.nombrerol}))}
            />
            {/* <SelectSGPCFieldset 
              label="Estado"
              value={filtroEstado || "ACTIVO"}
              onChange={(val:any) => setFiltroEstado(val)}
              options={[
                {value: "ACTIVO", label: "Activos"},
                {value: "ANULADO", label: "Inactivos/Anulados"},
                {value: "TODOS", label: "Todos"}
              ]}
            /> */}
          </div>
        
      </div>

      {/* FOOTER BOTONES */}
      <div className='modal-footer' style={{borderTop: '2px solid var(--color-primario)'}}>
        <button className="btn-secundario" style={{flex:1, height: '4.8rem'}} onClick={() => {
          setForm({ dni: '', nombres: '', apellidos: '', telefono: '', sexo: '', idrol: 4 });
          setDniInputBloqueado(false);
          setCamposBloqueados(true);
          setTimeout(() => dniInputRef.current?.focus(), 100);
        }}>
          <Eraser size={16} />Limpiar
        </button>
        <button className="btn-primario" style={{flex:1, height: '4.8rem'}} onClick={handleSave} disabled={!puedeGuardar}> 
          <Save size={16} /> Guardar
        </button>
      </div>
    </div>
  </div>
)}

{showConfirm && (
  <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
    <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '45rem', padding: '0', borderRadius: '1.2rem', overflow: 'hidden' }}>
      
      {/* 1. HEADER AZUL */}
      <div className="modal-header" style={{background: 'var(--color-primario)', color: '#fff', padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h2 style={{color:'#fff', display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '1.6rem', margin: 0, fontWeight: 600}}>
          <AlertTriangle size={22}/>Confirmar Anulación
        </h2>
        <button onClick={() => setShowConfirm(false)} className="btn-cerrar-modal" style={{background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.8rem', borderRadius: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'}}>
          <X size={20} />
        </button>
      </div>

      {/* 2. BODY SIN CARD - SOLO TEXTO */}
      <div className="modal-body" style={{padding: '3rem 2rem', textAlign: 'center'}}>
        <p style={{fontSize: '1.6rem', fontWeight: 600, color: 'var(--color-texto)', margin: '0 0 0.8rem 0'}}>
          ¿Está seguro de ANULAR este registro?
        </p>
        <p style={{fontSize: '1.4rem', color: 'var(--color-texto-secundario)', margin: 0, lineHeight: 1.5}}>
          El registro no se borrará, solo se ocultará de la lista.
        </p>
      </div>

      {/* 3. FOOTER BOTONES IGUALES */}
      <div className="modal-footer" style={{display: 'flex', padding: '1.5rem 2rem', background: 'var(--color-fondo-card)', borderTop: '1px solid var(--color-borde)', gap: '1rem'}}>
        <button className="btn-secundario" style={{flex:1, height: '4.8rem'}} onClick={() => setShowConfirm(false)}>
          <X size={16} />Cancelar
        </button>
        <button className="btn-primario" style={{flex:1, height: '4.8rem', background: '#ef4444'}} onClick={confirmarEliminar}> 
          <Trash2 size={16} /> Anular
        </button>
      </div>
    </div>
  </div>
)}

{showPreviewModal && (
  <div className="modal-overlay" onClick={() => setShowPreviewModal(false)}>
    <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '95rem', maxHeight: '90vh', padding: '0', borderRadius: '1.2rem', overflow: 'hidden' }}>
      
      {/* HEADER AZUL EJECUTIVO */}
      <div className="modal-header" style={{background: 'var(--color-primario)', color: '#fff', padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h2 style={{color:'#fff', display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '1.6rem', margin: 0, fontWeight: 600}}>
          <Upload size={22}/>Vista Previa de Importación
        </h2>
        <button onClick={() => setShowPreviewModal(false)} className="btn-cerrar-modal" style={{background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.8rem', borderRadius: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'}}>
          <X size={20} />
        </button>
      </div>
      
      {/* BODY */}
      <div className="modal-body" style={{overflowY: 'auto', padding: '2rem'}}>
        <p style={{fontSize: 'var(--text-sm)', marginBottom: '1.2rem'}}>
          Total: {previewData.length} registros. 
          <span style={{color: '#22C55E', fontWeight: 600}}> {previewData.filter(p=>p.estado==='ok').length} Correctos</span> / 
          <span style={{color: '#EF4444', fontWeight: 600}}> {previewData.filter(p=>p.estado==='error').length} Con Error</span>
        </p>
        
        <div style={{overflowX: 'auto'}}>
          <table className="tabla-preview">
            {/* Tu tabla igual */}
            <thead>
              <tr>
                <th>FILA</th><th>DNI</th><th>APELLIDOS</th><th>NOMBRES</th>
                <th>SEXO</th><th>ROL</th><th>ESTADO</th><th>OBSERVACIÓN</th>
              </tr>
            </thead>
            <tbody>
              {previewData.map((p, i) => (
                <tr key={i}>
                  <td>{p.fila}</td><td>{p.dni}</td><td>{p.apellidos}</td><td>{p.nombres}</td>
                  <td>{p.sexo}</td><td>{roles.find(r=>r.idrol===p.idrol)?.nombrerol || 'Sin Rol'}</td>
                  <td className={p.estado}>{p.estado === 'ok' ? <Check size={16}/> : <X size={16}/>}</td>
                  <td className={p.estado}>{p.motivo || 'Correcto'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FOOTER: EXPORTAR + GRABAR */}
      <div className="modal-footer" style={{display: 'flex', padding: '1.5rem 2rem', background: 'var(--color-fondo-card)', borderTop: '1px solid var(--color-borde)', gap: '1rem'}}>
        <button 
          className="btn-secundario" 
          style={{flex:1, height: '4.8rem'}} 
          onClick={handleExportarErrores}
          disabled={previewData.filter(p=>p.estado==='error').length === 0}
        >
          <Upload size={16} />Exportar Errores
        </button>
        <button 
          className="btn-primario" 
          style={{flex:1, height: '4.8rem'}}
          onClick={handleConfirmImport}
          disabled={previewData.filter(p=>p.estado==='ok').length === 0}
        >
          <Save size={18} /> Grabar {previewData.filter(p=>p.estado==='ok').length} Registros
        </button>
      </div>
    </div>
  </div>
)}

      <style jsx>{`
 .modal-footer { 
  padding: 1.6rem 2.4rem; 
  border-top: 1px solid #e2e8f0; 
  display: flex; 
  justify-content: flex-end; 
  gap: 1.2rem;
  background: #f8fafc;
  border-radius: 0 0 1.2rem 1.2rem;
}
 .btn-danger { background: #ef4444; color: white; }
 .btn-primario:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
 .btn-cerrar {
          background: #f1f5f9;
          border: none;
          border-radius: 0.8rem;
          padding: 0.8rem;
          cursor: pointer;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
 .btn-cerrar:hover {
          background: #fee2e2;
          color: #ef4444;
          transform: rotate(90deg);
        }
 .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 2rem;
        }
 .modal-content {
          width: 100%;
          max-width: 50rem;
          background: var(--color-blanco);
          border-radius: 1.6rem;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          padding: 4rem 3.2rem 3.2rem 3.2rem;
          position: relative;
          display:flex;
          flex-direction:column;
          max-height:90vh;
        }

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 1.6rem; /* <-- Separación entre secciones */
  overflow-y: auto; /* <-- CLAVE PARA SCROLL EN CELULAR */
  padding-right: 0.4rem; /* para que no tape la barra */
}

 .input-wrapper { position: relative; width: 100%; display: flex; /* <-- fuerza que label+input ocupen todo */
  flex-direction: column;}
 .input-sgpc-floating {
          width: 100%;
          box-sizing: border-box;
          padding: 1.6rem 1.4rem 1rem 1.4rem;
          border: 1px solid var(--color-secundario);
          border-radius: 0.8rem;
          font-size: var(--text-base);
          font-family: var(--font-principal);
          background: var(--color-blanco);
          outline: none;
          transition: all 0.2s ease;
          color: var(--color-texto);
          height: 5.2rem;
          margin-top:0.8rem;
        }
 .input-sgpc-floating:focus {
          border: 2px solid var(--color-primario);
          padding: 1.5rem 1.3rem 0.9rem 1.3rem;
        }
 .input-sgpc-floating:disabled {
          background: #f3f4f6;
          cursor: not-allowed;
          opacity: 0.7;
        }
 .input-label {
          position: absolute;
          left: 1rem;
          top: 0rem;
          font-size: 1.2rem;
          color: var(--color-primario);
          font-weight: 600;
          background: var(--color-blanco);
          padding: 0 0.6rem;
          pointer-events: none;
          z-index: 10;
        }
          
 .input-icon-wrapper {
          position: absolute;
          right: 1.4rem;
          top: 0;
          bottom: 0;
          margin: auto;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          pointer-events: none;
          z-index: 2;
        }
 .toast-sgpc {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%,-50%);
          padding: 2rem 2rem;
          border-radius: 0.8rem;
          font-size: var(--text-sm);
          font-weight: 700;
          color: var(--color-blanco);
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          z-index: 9999;
          animation: fadeInScale 0.3s ease-out forwards;
          white-space: nowrap;
          text-align:center;
        }
    .toast-sgpc.error { background: #ef4444; }
    .toast-sgpc.success { background: #22c55e; }
        @keyframes fadeInScale { from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }

        /* ESTILOS NUEVOS DE PAGINACION */
       .paginacion-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 1.6rem;
          padding: 1.6rem;
          background: var(--color-blanco);
          border-radius: 1.2rem;
          gap: 1.6rem;
        }
       .paginacion-info {
          font-size: var(--text-sm);
          color: var(--color-texto-sec);
        }
       .paginacion-controles {
          display: flex;
          gap: 0.8rem;
          align-items: center;
        }
       .btn-pag {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.8rem 1.2rem;
          border-radius: 0.8rem;
          font-size: var(--text-sm);
          font-weight: 600;
          border: 1px solid var(--color-borde);
          background: var(--color-blanco);
          color: var(--color-primario);
          cursor: pointer;
          transition: all 0.2s ease;
        }
       .btn-pag:hover:not(:disabled) {
          background: #f8fafc;
        }
       .btn-pag:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
       .btn-pag-primario {
          background: var(--color-primario);
          color: var(--color-blanco);
          border: 1px solid var(--color-primario);
        }
       .btn-pag-primario:hover:not(:disabled) {
          opacity: 0.9;
        }
       .paginacion-pagina {
          padding: 0.8rem 1.2rem;
          font-weight: 600;
          font-size: var(--text-sm);
          white-space: nowrap;
        }

        /* RESPONSIVE PARA CELULAR */
        @media (max-width: 768px) {
         .paginacion-footer {
            flex-direction: column;
            padding: 1.2rem;
          }
         .paginacion-controles {
            width: 100%;
            justify-content: space-between;
          }
         .btn-pag {
            padding: 0.6rem 1rem;
            font-size: 1.2rem;
            flex: 1;
            justify-content: center;
          }
         .paginacion-pagina {
            padding: 0.6rem 0.8rem;
            font-size: 1.2rem;
          }
         .paginacion-info {
            text-align: center;
            width: 100%;
          }
        }


.grid-filtros-personas {
  display: grid;
  grid-template-columns: repeat(4, 1fr); /* 4 columnas iguales */
  gap: 1.6rem;
  align-items: end;
}

.btn-limpiar {
  height: 4.4rem;
  white-space: nowrap;
  justify-content: center;
}
.card-section {
  padding: 2rem;
  margin-top: 1.6rem;
  background: #f8fafc;
  border: 1px solid var(--color-borde);
  border-radius: 1.2rem;
}
.card-section-header {
  display: flex;
  align-items: center;
  justify-content: start;
  gap: 0.8rem;
  margin-bottom: 1.2rem;
  color: var(--color-primario);
  font-weight: 600;
  font-size: 1.6rem;
}
  
.modal-header {
  margin-bottom: 2.4rem; /* MAS ESPACIO DESPUES DEL TITULO */
}

.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.6rem; /* <-- ESTA ES LA CLAVE. Separa todos los inputs */
  align-items: end;
}

/* Para que en celular sea 1 columna */
@media (max-width: 768px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
}


.fieldset-sgpc {
  border: 2px solid var(--color-primario);
  border-radius: 1.2rem;
  padding: 2.4rem 1.6rem 1.6rem 1.6rem;
  margin-top: 2.4rem;
  position: relative;
}

.fieldset-sgpc legend {
  font-size: 1.4rem;
  font-weight: 600;
  color: var(--color-primario);
  padding: 0 0.8rem;
  margin-left: 0.8rem; /* para que no esté pegado al borde */
}

/* Para que el grid de adentro no tenga margin-top extra */
.fieldset-sgpc .grid-2 {
  margin-top: 0;
  gap: 1.6rem;
}

@media (max-width: 1024px) {
  .grid-filtros-personas {
    grid-template-columns: repeat(2, 1fr); /* 2x2 en tablet */
  }
}

/* FORZAR QUE REACT-SELECT SE VEA IGUAL QUE EL INPUT */
.react-select__control--is-disabled {
  background: #f3f4f6 !important;
  cursor: not-allowed !important;
}

@media (max-width: 640px) {
  .grid-filtros-personas {
    grid-template-columns: 1fr; /* 1 columna en cel */
  }
}

/* ANCHOS PARA TABLA PREVIEW */
.tabla-preview {
  table-layout: auto; /* CLAVE: que se adapte al contenido */
}
.tabla-preview th:nth-child(3) { width: 22rem; } /* APELLIDOS */
.tabla-preview th:nth-child(4) { width: 22rem; } /* NOMBRES */
.tabla-preview td:nth-child(3), 
.tabla-preview td:nth-child(4) {
  white-space: normal; /* Para que baje de línea si es muy largo */
  word-break: break-word;
}
  .grid-2-modal-ejecutivo {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  margin-bottom: 2rem;
}
.card-info-modal {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.2rem;
  border-radius: 0.8rem;
}
@media (min-width: 768px) {
  .grid-2-modal-ejecutivo {
    grid-template-columns: 1fr 1fr; /* 2 columnas en desktop */
  }
}
  .card-info-ejecutiva {
  display: flex;
  align-items: center;
  gap: 1.2rem;
  padding: 1.2rem 1.6rem;
  border-radius: 0.8rem;
}
.card-info-label {
  font-size: 1.2rem;
  color: #475569; /* Nombre oscuro */
  font-weight: 600;
  margin-bottom: 0.2rem;
}
.input-sin-borde {
  width: 100%;
  border: none;
  background: transparent;
  font-size: 1.5rem;
  font-weight: 700; /* Valor fuerte */
  color: #1e293b; /* Nombre oscuro */
  outline: none;
  padding: 0;
}
.input-sin-borde::placeholder {
  font-weight: 400; /* Placeholder finito */
  color: #94a3b8; /* Gris suave */
  opacity: 1;
}
.input-sin-borde:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.fieldset-ejecutivo {
  border: 2px solid var(--color-borde);
  border-radius: 0.8rem;
  padding: 1.6rem;
  margin-top: 0.5rem;
}
.fieldset-ejecutivo legend {
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--color-primario);
  padding: 0 0.8rem;
}
      `}</style>
    </div>
    </>
  )
}