'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/client'
import { Plus, Edit, Trash2, X, Search, MapPin, Building, Globe, ChevronLeft, ChevronRight, Eraser } from 'lucide-react' // <-- 1. Agregue iconos
import Select from 'react-select'

type Departamento = { iddepartamento: number, nombred: string }
type Provincia = { idprovincia: number, iddepartamento: number, nombrep: string }

type UbigeoFull = {
  iddistrito: number,
  nombredt: string,
  idprovincia: number,
  provincia: { idprovincia: number, nombrep: string, iddepartamento: number, departamento: { iddepartamento: number, nombred: string } }
}

export default function UbigeoPage() {

  const supabase = createClient()
  const [ubigeos, setUbigeos] = useState<UbigeoFull[]>([])
  const [filtro, setFiltro] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [idDistritoEdit, setIdDistritoEdit] = useState<number | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null)

  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [provincias, setProvincias] = useState<Provincia[]>([])
  const [idDeptoSel, setIdDeptoSel] = useState<number | ''>('')
  const [idProvSel, setIdProvSel] = useState<number | ''>('')
  const [nombreDist, setNombreDist] = useState('')

  const [filtroDptoId, setFiltroDptoId] = useState<number | ''>('')
  const [filtroProvId, setFiltroProvId] = useState<number | ''>('')
  const [provsFiltro, setProvsFiltro] = useState<{id:number, nombre:string}[]>([])

  // 2. NUEVOS ESTADOS PARA PAGINACION
  const [paginaActual, setPaginaActual] = useState(1)
  const registrosPorPagina = 10

  const showToast = (msg: string, type: 'error' | 'success' = 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }


  const SelectSGPC = ({label, value, onChange, options, placeholder, isDisabled = false}:any) => {
  const selectedOption = options.find((o:any) => o.value === value) || null
  return (
    <div className="input-wrapper">
      <label className="input-label">{label}</label>
      <Select
        options={options}
        value={selectedOption}
        onChange={(opt:any) => onChange(opt?.value || null)}
        placeholder={placeholder}
        isDisabled={isDisabled}
        isSearchable={true}
        menuPortalTarget={typeof document!== 'undefined'? document.body : null}
        classNamePrefix="react-select"
        noOptionsMessage={() => "No se encontraron resultados"}
        styles={{
          control: (base) => ({
            ...base, minHeight: '4.4rem', height: '4.4rem', borderRadius: '0.8rem',
            borderColor: '#e2e8f0', boxShadow: 'none', fontSize: '1.4rem', fontFamily: 'var(--font-principal)',
            '&:hover': { borderColor: 'var(--color-primario)' }
          }),
          menuPortal: (base) => ({...base, zIndex: 99999 }),
          menu: (base) => ({...base, fontSize: '1.4rem' }),
          singleValue: (base) => ({...base, color: 'var(--color-texto)' }),
          option: (base, state) => ({
            ...base, backgroundColor: state.isSelected? 'var(--color-primario)' : state.isFocused? '#f1f5f9' : 'white',
            color: state.isSelected? 'white' : '#1e293b'
          }),
          input: (base) => ({...base, color: 'var(--color-texto)'})
        }}
      />
    </div>
  )
}

  useEffect(() => { fetchTodo() }, [])

 const fetchTodo = async () => {
  const { data: deptos } = await supabase.from('departamento').select('*').eq('estado', 'ACTIVO').order('nombred')
  setDepartamentos(deptos || [])
  const { data: provs } = await supabase.from('provincia').select('*').eq('estado', 'ACTIVO')

  let allDistritos: any[] = []
  let from = 0
  const pageSize = 1000

  while(true) {
    const { data: distritosBatch } = await supabase.from('distrito').select('*').eq('estado', 'ACTIVO').order('nombredt').range(from, from + pageSize - 1)
    if(!distritosBatch || distritosBatch.length === 0) break
    allDistritos = [...allDistritos,...distritosBatch]
    from += pageSize
    if(distritosBatch.length < pageSize) break
  }

  const dataCompleta = allDistritos.map(d => {
    const prov = (provs || []).find(p => p.idprovincia === d.idprovincia)
    const depto = (deptos || []).find(dp => dp.iddepartamento === prov?.iddepartamento)
    return {...d, provincia: {...prov, departamento: depto }}
  })

  setUbigeos(dataCompleta as any)
  setPaginaActual(1) // <- Reinicia a pag 1 cuando recargas
}

  useEffect(() => {
    if(idDeptoSel === '') { setProvincias([]); return }
    supabase.from('provincia').select('*').eq('iddepartamento', idDeptoSel).eq('estado', 'ACTIVO').order('nombrep').then(({data}) => setProvincias(data || []))
  }, [idDeptoSel])

  useEffect(() => {
    if(filtroDptoId === '') {
      const map = new Map<number, string>()
      ubigeos.forEach(u => map.set(u.provincia.idprovincia, u.provincia.nombrep))
      setProvsFiltro([...map.entries()].map(([id, nombre]) => ({id, nombre})).sort((a,b) => a.nombre.localeCompare(b.nombre)))
      return
    }
    const lista = ubigeos.filter(u => u.provincia.departamento.iddepartamento === filtroDptoId)
    const map = new Map<number, string>()
    lista.forEach(u => map.set(u.provincia.idprovincia, u.provincia.nombrep))
    setProvsFiltro([...map.entries()].map(([id, nombre]) => ({id, nombre})).sort((a,b) => a.nombre.localeCompare(b.nombre)))
  }, [ubigeos, filtroDptoId])

  const dptosFiltro = useMemo(() => {
    const map = new Map<number, string>()
    ubigeos.forEach(u => map.set(u.provincia.departamento.iddepartamento, u.provincia.departamento.nombred))
    return [...map.entries()].map(([id, nombre]) => ({id, nombre})).sort((a,b) => a.nombre.localeCompare(b.nombre))
  }, [ubigeos])

  const handleFiltroDptoChange = (val: string) => {
    setFiltroDptoId(val === ''? '' : Number(val))
    setFiltroProvId('')
    setPaginaActual(1) // <- Reinicia pag al filtrar
  }

  const ubigeosFiltrados = ubigeos.filter(u => {
    const matchSearch = u.nombredt.toLowerCase().includes(filtro.toLowerCase()) || u.provincia.nombrep.toLowerCase().includes(filtro.toLowerCase()) || u.provincia.departamento.nombred.toLowerCase().includes(filtro.toLowerCase())
    const matchDpto = filtroDptoId? u.provincia.departamento.iddepartamento === filtroDptoId : true
    const matchProv = filtroProvId? u.provincia.idprovincia === filtroProvId : true
    return matchSearch && matchDpto && matchProv
  })

  // 3. LOGICA DE PAGINACION
  const totalPaginas = Math.ceil(ubigeosFiltrados.length / registrosPorPagina)
  const indiceInicio = (paginaActual - 1) * registrosPorPagina
  const indiceFin = indiceInicio + registrosPorPagina
  const ubigeosPaginados = ubigeosFiltrados.slice(indiceInicio, indiceFin)

  useEffect(() => { // Reinicia pag al buscar
    setPaginaActual(1)
  }, [filtro, filtroProvId])

  const puedeGuardar = useMemo(() => {
    return idProvSel!== '' && nombreDist.trim()!== ''
  }, [idProvSel, nombreDist])

  const openModal = (u?: UbigeoFull) => {
    if(u) {
      setIsEditing(true)
      setIdDistritoEdit(u.iddistrito)
      setIdDeptoSel(u.provincia.departamento.iddepartamento)
      setIdProvSel(u.provincia.idprovincia)
      setNombreDist(u.nombredt)
    } else {
      setIsEditing(false)
      setIdDistritoEdit(null)
      setIdDeptoSel('')
      setIdProvSel('')
      setNombreDist('')
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setIsEditing(false)
    setIdDistritoEdit(null)
    setIdDeptoSel('')
    setIdProvSel('')
    setNombreDist('')
  }

  const handleCancelar = () => {
    setIdDeptoSel('')
    setIdProvSel('')
    setNombreDist('')
    setProvincias([])
    showToast('Formulario limpiado', 'success')
  }

  const handleGuardar = async () => {
    if(!puedeGuardar) return showToast('Complete todos los campos obligatorios', 'error')
    const payload = { idprovincia: idProvSel, nombredt: nombreDist.trim() }

    try {
      if(isEditing) {
        const { error } = await supabase.from('distrito').update(payload).eq('iddistrito', idDistritoEdit)
        if(error) throw error
        showToast('Cambio actualizado', 'success')
      } else {
        const { error } = await supabase.from('distrito').insert({...payload, estado: 'ACTIVO'})
        if(error) throw error
        showToast('Distrito registrado correctamente', 'success')
      }

      await fetchTodo()
      setTimeout(() => { closeModal() }, 3000)

    } catch (error: any) {
      showToast(error.message, 'error')
    }
  }

  const handleAnular = async (id: number) => {
    if(!confirm('¿Anular este distrito?')) return
    await supabase.from('distrito').update({estado: 'ANULADO'}).eq('iddistrito', id)
    showToast('Distrito anulado correctamente', 'success')
    fetchTodo()
  }

  return (
    <div>
      <div className="header-responsive">
        <div>
          <h1>Gestión de Ubigeo</h1>
          <p>Total: {ubigeosFiltrados.length} registros ACTIVOS</p>
        </div>
        <button onClick={() => openModal()} className="btn-primario">
          <Plus size={18} /> Nuevo Distrito
        </button>
      </div>

      <div className="content-area">
        <div className="card-sgpc" style={{ marginBottom: "2.4rem", padding: "2rem" }}>
  
  <div className="grid-filtros-ubigeo">
    <SelectSGPC 
      label="Departamento" 
      value={filtroDptoId || ""} 
      onChange={(val:any) => handleFiltroDptoChange(val)} 
      placeholder="Todos" 
      options={dptosFiltro.map(d => ({value: d.id, label: d.nombre}))} 
    />
    <SelectSGPC 
      label="Provincia" 
      value={filtroProvId || ""} 
      onChange={(val:any) => {setFiltroProvId(val); setPaginaActual(1)}} 
      placeholder="Todos" 
      options={provsFiltro.map(p => ({value: p.id, label: p.nombre}))} 
      isDisabled={!filtroDptoId} 
    />
    
    <div style={{ position: "relative", width: "100%" }}>
      <Search size={18} style={{ position: "absolute", left: "1.2rem", top: "50%", transform: "translateY(-50%)", opacity: 0.5, zIndex: 1 }} />
      <input 
        className="input-sgpc" 
        placeholder="Buscar por Departamento, Provincia o Distrito..." 
        value={filtro} 
        onChange={e => setFiltro(e.target.value)} 
        style={{ paddingLeft: "4rem", height: "4.4rem", width: "100%" }} 
      />
    </div>

    <button className="btn-secundario btn-limpiar" onClick={() => {setFiltro(""); setFiltroDptoId(""); setFiltroProvId(""); setProvsFiltro([])}}>
      <Eraser size={16} />Limpiar
    </button>
  </div>

</div>

        <div className="card-sgpc" style={{overflowX: 'auto'}}>
          <table className='tabla-sgpc'>
            <thead>
              <tr style={{ borderBottom: '0.2rem solid var(--color-borde)', textAlign: 'left' }}>
                <th style={{padding: '1.2rem'}}>Nro.</th>
                <th style={{padding: '1.2rem'}}>DEPARTAMENTO</th>
                <th style={{padding: '1.2rem'}}>PROVINCIA</th>
                <th style={{padding: '1.2rem'}}>DISTRITO</th>
                <th style={{padding: '1.2rem'}}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {ubigeosPaginados.map((u, index) => (
                  <tr key={u.iddistrito} style={{borderBottom: '1px solid var(--color-borde)'}}>
                    <td style={{padding: '1rem', fontWeight: 600}}>
                      {indiceInicio + index + 1} 
                    </td>
                    <td style={{padding: '1rem'}}>{u.provincia.departamento.nombred}</td>
                    <td style={{padding: '1rem'}}>{u.provincia.nombrep}</td>
                    <td style={{padding: '1rem'}}>{u.nombredt}</td>
                    <td style={{padding: '1rem', display: 'flex', gap: '0.8rem'}}>
                      <button className="btn-icon btn-icon-editar" onClick={() => openModal(u)}><Edit size={15} /></button>
                      <button className="btn-icon btn-icon-eliminar" onClick={() => handleAnular(u.iddistrito)}><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* 4. FOOTER DE PAGINACION NUEVO */}
        {totalPaginas > 1 && (
  <div className="paginacion-footer">
    <p className="paginacion-info">
      Mostrando {indiceInicio + 1} al {Math.min(indiceFin, ubigeosFiltrados.length)} de {ubigeosFiltrados.length} registros
    </p>
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
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content card-sgpc" style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            {toast && (<div className={`toast-sgpc ${toast.type}`}>{toast.msg}</div>)}
            <div className="modal-header">
              <h2 style={{display: 'flex', alignItems: 'center', gap: '0.8rem'}}>
    <MapPin size={22} strokeWidth={2} /> 
    {isEditing? 'Editar Distrito' : 'Nuevo Distrito'}
  </h2>
              <button onClick={closeModal} className="btn-cerrar"><X size={20} /></button>
            </div>
   <div className="modal-body">

  <div className="grid-2">
    <div className="input-wrapper">
      <SelectSGPC
        label="Departamento *"
        value={idDeptoSel || ""}
        onChange={(val:any) => setIdDeptoSel(val)}
        options={departamentos.map(d => ({value: d.iddepartamento, label: d.nombred}))}
        isDisabled={isEditing}
      />
      
    </div>

    <div className="input-wrapper">
      <SelectSGPC
        label="Provincia *"
        value={idProvSel || ""}
        onChange={(val:any) => setIdProvSel(val)}
        options={provincias.map(p => ({value: p.idprovincia, label: p.nombrep}))}
        isDisabled={!idDeptoSel || isEditing}
      />
      
    </div>
  </div>

  <div className="input-wrapper">
    <label className="input-label">Nombre del Distrito *</label>
    <input 
      className="input-sgpc-floating" 
      placeholder="Ej: Huancayo" 
      value={nombreDist} 
      onChange={e => setNombreDist(e.target.value)} 
    />
    <div className="input-icon-wrapper"><MapPin size={18} strokeWidth={1.5} /></div>
  </div>

</div>

<div className="modal-footer">
  <button className="btn-secundario" onClick={handleCancelar}>
    <Eraser size={16} /> Limpiar
  </button>
  <button className="btn-primario" onClick={handleGuardar} disabled={!puedeGuardar}>
    Guardar
  </button>
</div>         
          </div>
        </div>
      )}

      <style jsx>{`
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
          padding: 3.2rem;
          position: relative;
          display:flex;
          flex-direction:column;
          max-height:90vh;
        }
    .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2.4rem;
          border-bottom: 1px solid var(--color-borde);
          padding-bottom: 1.6rem;
        }
    .modal-header h2 {
          font-size: var(--text-xl);
          color: var(--color-primario);
          font-weight: 700;
        }
    .modal-body {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          margin-bottom: 2.4rem;
        }

        .grid-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.6rem;
  align-items: end; /* para que select e input queden a la misma altura */
}

    .input-wrapper { position: relative; width: 100%; }
    .input-sgpc-floating {
  width: 100%;
  box-sizing: border-box;
  padding: 1.6rem 4.2rem 1rem 1.4rem; /* padding-right para el icono */
  border: 1px solid #cbd5e1;
  border-radius: 0.8rem;
  font-size: 1.4rem;
  height: 5.2rem;
  margin-top: 0.8rem;
  background: var(--color-blanco);
}
.input-sgpc-floating:focus {
  border: 2px solid var(--color-primario);
  padding: 1.5rem 4.1rem 0.9rem 1.3rem;
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
  z-index: 10;
}

.input-icon-wrapper {
  position: absolute;
  right: 1.4rem;
  top: 2.6rem; /* centrado con el height 5.2rem */
  color: #64748b;
  pointer-events: none;
  z-index: 2;
}
    .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 1.2rem;
          border-top: 1px solid var(--color-borde);
          padding-top: 1.6rem;
        }
    .btn-primario:disabled,.btn-secundario:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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
  .grid-filtros-ubigeo {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.6rem;
  align-items: end;
}

.btn-limpiar {
  height: 4.4rem;
  white-space: nowrap;
}

/* RESPONSIVE: Tablet y Celular */
@media (max-width: 1024px) {
  .grid-filtros-ubigeo {
    grid-template-columns: repeat(2, 1fr); /* 2 columnas */
  }
}

@media (max-width: 640px) {
  .grid-filtros-ubigeo {
    grid-template-columns: 1fr; /* 1 columna en cel muy chico */
  }
}
      `}</style>
    </div>
  )
}