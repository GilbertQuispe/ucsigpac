'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/client'
import { Plus, Edit, Trash2, X, Search } from 'lucide-react'

type Departamento = { iddepartamento: number, nombred: string }
type Provincia = { idprovincia: number, iddepartamento: number, nombrep: string }

type UbigeoFull = {
  iddistrito: number,
  codigodt: string,
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

  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [provincias, setProvincias] = useState<Provincia[]>([])
  const [idDeptoSel, setIdDeptoSel] = useState<number | ''>('')
  const [idProvSel, setIdProvSel] = useState<number | ''>('')
  const [nombreDist, setNombreDist] = useState('')
  const [codigoDist, setCodigoDist] = useState('')

  // FILTROS DE TABLA
  const [filtroDptoId, setFiltroDptoId] = useState<number | ''>('')
  const [filtroProvId, setFiltroProvId] = useState<number | ''>('')
  const [provsFiltro, setProvsFiltro] = useState<{id:number, nombre:string}[]>([])

  useEffect(() => { fetchTodo() }, [])

 const fetchTodo = async () => {
  // 1. Departamentos
  const { data: deptos } = await supabase
   .from('departamento')
   .select('*')
   .eq('estado', 'ACTIVO')
   .order('nombred')
  setDepartamentos(deptos || [])

  // 2. Provincias
  const { data: provs } = await supabase
   .from('provincia')
   .select('*')
   .eq('estado', 'ACTIVO')

  // 3. Distritos - TRAER EN LOTES DE 1000
  let allDistritos: any[] = []
  let from = 0
  const pageSize = 1000
  
  while(true) {
    const { data: distritosBatch } = await supabase
     .from('distrito')
     .select('*')
     .eq('estado', 'ACTIVO')
     .order('nombredt')
     .range(from, from + pageSize - 1)
    
    if(!distritosBatch || distritosBatch.length === 0) break
    
    allDistritos = [...allDistritos, ...distritosBatch]
    from += pageSize
    
    if(distritosBatch.length < pageSize) break // ya terminamos
  }

  // 4. JUNTAR TODO EN MEMORIA
  const dataCompleta = allDistritos.map(d => {
    const prov = (provs || []).find(p => p.idprovincia === d.idprovincia)
    const depto = (deptos || []).find(dp => dp.iddepartamento === prov?.iddepartamento)
    return {
      ...d,
      provincia: {
        ...prov,
        departamento: depto
      }
    }
  })

  console.log('TOTAL REAL CARGADO:', dataCompleta.length)
  setUbigeos(dataCompleta as any)
}

  // Debug: para ver cuantos trae
  useEffect(() => {
    console.log('Total distritos cargados:', ubigeos.length)
    console.log('Distritos Tayacaja id 84:', ubigeos.filter(u => u.provincia.idprovincia === 84).length)
  }, [ubigeos])

  // Provincias para el modal
  useEffect(() => {
    if(idDeptoSel === '') { setProvincias([]); return }
    supabase
     .from('provincia')
     .select('*')
     .eq('iddepartamento', idDeptoSel)
     .eq('estado', 'ACTIVO')
     .order('nombrep')
     .then(({data}) => setProvincias(data || []))
  }, [idDeptoSel])

  // Provincias para el FILTRO en cascada
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

  // Departamentos para el FILTRO
  const dptosFiltro = useMemo(() => {
    const map = new Map<number, string>()
    ubigeos.forEach(u => map.set(u.provincia.departamento.iddepartamento, u.provincia.departamento.nombred))
    return [...map.entries()].map(([id, nombre]) => ({id, nombre})).sort((a,b) => a.nombre.localeCompare(b.nombre))
  }, [ubigeos])

  const handleFiltroDptoChange = (val: string) => {
    setFiltroDptoId(val === ''? '' : Number(val))
    setFiltroProvId('') // resetea provincia al cambiar dpto
  }

  const ubigeosFiltrados = ubigeos.filter(u => {
    const matchSearch =
      u.nombredt.toLowerCase().includes(filtro.toLowerCase()) ||
      u.provincia.nombrep.toLowerCase().includes(filtro.toLowerCase()) ||
      u.provincia.departamento.nombred.toLowerCase().includes(filtro.toLowerCase())

    const matchDpto = filtroDptoId? u.provincia.departamento.iddepartamento === filtroDptoId : true
    const matchProv = filtroProvId? u.provincia.idprovincia === filtroProvId : true

    return matchSearch && matchDpto && matchProv
  })

  const openModal = (u?: UbigeoFull) => {
    if(u) {
      setIsEditing(true)
      setIdDistritoEdit(u.iddistrito)
      setIdDeptoSel(u.provincia.departamento.iddepartamento)
      setIdProvSel(u.provincia.idprovincia)
      setNombreDist(u.nombredt)
      setCodigoDist(u.codigodt)
    } else {
      setIsEditing(false)
      setIdDistritoEdit(null)
      setIdDeptoSel('')
      setIdProvSel('')
      setNombreDist('')
      setCodigoDist('')
    }
    setShowModal(true)
  }

  const handleGuardar = async () => {
    if(!idProvSel ||!nombreDist) return alert('Complete Provincia y Nombre Distrito')
    const payload = { idprovincia: idProvSel, nombredt: nombreDist, codigodt: codigoDist }

    if(isEditing) {
      await supabase.from('distrito').update(payload).eq('iddistrito', idDistritoEdit)
    } else {
      await supabase.from('distrito').insert(payload)
    }
    setShowModal(false)
    fetchTodo()
  }

  const handleAnular = async (id: number) => {
    if(!confirm('¿Anular este distrito?')) return
    await supabase.from('distrito').update({estado: 'ANULADO'}).eq('iddistrito', id)
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
        {/* FILTROS */}
        <div className="card-sgpc" style={{marginBottom: '2.4rem', display: 'flex', gap: '1.6rem', flexWrap: 'wrap', alignItems: 'center'}}>
          <div style={{ position: 'relative', flex: 1, minWidth: '25rem' }}>
            <Search size={18} style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
            <input
              type="text"
              placeholder="Buscar por Departamento, Provincia o Distrito..."
              className="input-sgpc"
              value={filtro}
              onChange={e => setFiltro(e.target.value)}
              style={{ paddingLeft: '4rem' }}
            />
          </div>

          <select className="input-sgpc" value={filtroDptoId} onChange={e => handleFiltroDptoChange(e.target.value)} style={{ width: '20rem' }}>
            <option value="">Todos los Departamentos</option>
            {dptosFiltro.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
          </select>

          <select className="input-sgpc" value={filtroProvId} onChange={e => setFiltroProvId(e.target.value === ''? '' : Number(e.target.value))} style={{ width: '20rem' }} disabled={!filtroDptoId}>
            <option value="">Todas las Provincias</option>
            {provsFiltro.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>

        <div className="card-sgpc" style={{overflowX: 'auto'}}>
          <table className='tabla-sgpc'>
            <thead>
              <tr style={{textAlign: 'left', borderBottom: '2px solid var(--color-borde)'}}>
                <th style={{padding: '1.2rem'}}>ID</th>
                <th style={{padding: '1.2rem'}}>DEPARTAMENTO</th>
                <th style={{padding: '1.2rem'}}>PROVINCIA</th>
                <th style={{padding: '1.2rem'}}>DISTRITO</th>
                <th style={{padding: '1.2rem'}}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {ubigeosFiltrados.map(u => (
                <tr key={u.iddistrito} style={{borderBottom: '1px solid var(--color-borde)'}}>
                  <td style={{padding: '1rem', fontWeight: 600}}>{u.iddistrito}</td>
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
      </div>

      {showModal && (
        <div style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100}}>
          <div className="card-sgpc" style={{width: '90%', maxWidth: '60rem'}}>
            <div className="modal-header">
              <h2>{isEditing? 'Editar Distrito' : 'Nuevo Distrito'}</h2>
              <button onClick={() => setShowModal(false)}><X /></button>
            </div>
            <div className="modal-body">
              <select className="input-sgpc" value={idDeptoSel} onChange={e => setIdDeptoSel(Number(e.target.value))}>
                <option value="">Seleccione Departamento</option>
                {departamentos.map(d => <option key={d.iddepartamento} value={d.iddepartamento}>{d.nombred}</option>)}
              </select>
              <select className="input-sgpc" value={idProvSel} onChange={e => setIdProvSel(Number(e.target.value))} disabled={!idDeptoSel}>
                <option value="">Seleccione Provincia</option>
                {provincias.map(p => <option key={p.idprovincia} value={p.idprovincia}>{p.nombrep}</option>)}
              </select>
              <input className="input-sgpc" placeholder="Código Distrito" value={codigoDist} onChange={e => setCodigoDist(e.target.value)} />
              <input className="input-sgpc" placeholder="Nombre Distrito" value={nombreDist} onChange={e => setNombreDist(e.target.value)} />
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn-secundario">Cancelar</button>
              <button onClick={handleGuardar} className="btn-primario">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}