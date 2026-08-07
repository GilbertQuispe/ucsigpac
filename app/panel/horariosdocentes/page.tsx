'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/client'
import { Search, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import ModalHorarioDocente from '../camposclinicos/components/ModalHorarioDocente'

type Fila = {
  idcampocli: number
  eps: string
  distrito: string
  provincia: string
  servicio: string
  dni: string
  docente: string
  especialidad: string
  periodo: string
  filial: string
  estado: string
}

const ITEMS_POR_PAGINA = 10

export default function HorariosDocentesPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<Fila[]>([])
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null)
  
  const [busqueda, setBusqueda] = useState('')
  const [filtroPeriodo, setFiltroPeriodo] = useState('')
  const [filtroFilial, setFiltroFilial] = useState('')
  
  const [periodos, setPeriodos] = useState<any[]>([])
  const [filiales, setFiliales] = useState<any[]>([])
  const [paginaActual, setPaginaActual] = useState(1)

  const [showModal, setShowModal] = useState(false)
  const [dataParaEditar, setDataParaEditar] = useState<any>(null)

  const showToast = (msg: string, type: 'error' | 'success' = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => { fetchData() }, [])
  useEffect(() => { setPaginaActual(1) }, [busqueda, filtroPeriodo, filtroFilial])

  const fetchData = async () => {
    setLoading(true)
    const [{data: p}, {data: f}] = await Promise.all([
      supabase.from('periodoacademico').select('idpa, codigo'),
      supabase.from('filial').select('idfilial, nombrefilial')
    ])
    setPeriodos(p || [])
    setFiliales(f || [])

    // USAMOS ALIAS PARA CADA JOIN Y QUITAMOS !inner
    const { data: campos, error } = await supabase
     .from('campoclinico')
     .select(`
        idcampocli,
        estado,
        eps:eps!fk_campoclinico_ideps(razonsocial, 
          distrito:distrito!fk_eps_iddistrito(nombrep, 
            provincia:provincia!fk_provincia_iddepartamento(nombred, 
              departamento:departamento!fk_departamento_iddepartamento(nombred)
            )
          )
        ),
        servicio:serviciosalud!fk_campoclinico_idservicios(nombre),
        periodo:periodoacademico!fk_campoclinico_idpa(codigo),
        filial:filial!fk_campoclinico_idfilial(nombrefilial),
        docente:docente!fk_campoclinico_iddocente(
          dni:persona!fk_docente_idpersona(dni), 
          nombres:persona!fk_docente_idpersona(nombres), 
          apellidos:persona!fk_docente_idpersona(apellidos), 
          especialidad:especialidad!fk_docente_idespecialidad(especialidad)
        )
      `)
      // .eq('estado', 'ACTIVO')  QUITAMOS ESTO POR AHORA PARA PROBAR

    console.log("DATA:", campos)
    console.log("ERROR:", error)
    
    if(error) { showToast(error.message); setLoading(false); return }

    const formateado: Fila[] = campos?.map((c: any) => ({
      idcampocli: c.idcampocli,
      eps: c.eps?.razonsocial || '-',
      distrito: c.eps?.distrito?.nombrep || '-',
      provincia: c.eps?.distrito?.provincia?.nombred || '-',
      servicio: c.servicio?.nombre || '-',
      dni: c.docente?.dni?.dni || '-',
      docente: c.docente? `${c.docente.apellidos?.apellidos}, ${c.docente.nombres?.nombres}` : '-',
      especialidad: c.docente?.especialidad?.especialidad || 'MEDICINA HUMANA',
      periodo: c.periodo?.codigo || '-',
      filial: c.filial?.nombrefilial || '-',
      estado: c.estado || '-'
    })) || []
    
    setData(formateado)
    setLoading(false)
  }

  const dataFiltrada = useMemo(() => {
    return data.filter(item => {
      const texto = `${item.dni} ${item.docente} ${item.eps} ${item.servicio}`.toLowerCase()
      const matchBusqueda = texto.includes(busqueda.toLowerCase())
      const matchPeriodo =!filtroPeriodo || item.periodo === periodos.find(p => p.idpa === parseInt(filtroPeriodo))?.codigo
      const matchFilial =!filtroFilial || item.filial === filiales.find(f => f.idfilial === parseInt(filtroFilial))?.nombrefilial
      return matchBusqueda && matchPeriodo && matchFilial
    })
  }, [data, busqueda, filtroPeriodo, filtroFilial, periodos, filiales])

  const totalPaginas = Math.ceil(dataFiltrada.length / ITEMS_POR_PAGINA)
  const dataPaginada = useMemo(() => {
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA
    return dataFiltrada.slice(inicio, inicio + ITEMS_POR_PAGINA)
  }, [dataFiltrada, paginaActual])

  const handleEditar = async (idcampocli: number) => {
    const {data: horarios} = await supabase.from('horariodocente').select('*').eq('idcampocli', idcampocli)
    const item = data.find(d => d.idcampocli === idcampocli)
    setDataParaEditar({...item, horarios})
    setShowModal(true)
  }

  const handleEliminar = async (idcampocli: number) => {
    if(!confirm('¿Eliminar este Campo Clínico y todos sus horarios?')) return
    const {error} = await supabase.from('campoclinico').delete().eq('idcampocli', idcampocli)
    if(error) showToast(error.message)
    else { showToast('Campo Clínico eliminado', 'success'); fetchData() }
  }

  return (
    <div className="sgpc-container">
      {toast && <div style={{ position: 'fixed', top: '2rem', right: '2rem', zIndex: 9999, background: toast.type === 'error'? '#EF4444' : '#22C55E', color: '#fff', padding: '1.2rem 2.4rem', borderRadius: '0.8rem' }}>{toast.msg}</div>}
      <div className="sgpc-header">
        <div><h1>Gestión de Horarios Docentes</h1><p>Administre los horarios registrados por campo clínico</p></div>
      </div>
      <div className="card-sgpc">
        <div className="filters-grid" style={{gridTemplateColumns: '1fr 1fr', marginBottom: '2rem'}}>
          <div className="form-group-sgpc"><label>Filtrar por Periodo</label>
            <select className="input-sgpc" value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)}>
              <option value="">TODOS</option>{periodos.map(p => <option key={p.idpa} value={p.idpa}>{p.codigo}</option>)}
            </select>
          </div>
          <div className="form-group-sgpc"><label>Filtrar por Filial</label>
            <select className="input-sgpc" value={filtroFilial} onChange={e => setFiltroFilial(e.target.value)}>
              <option value="">TODAS</option>{filiales.map(f => <option key={f.idfilial} value={f.idfilial}>{f.nombrefilial}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group-sgpc" style={{marginBottom: '2rem'}}>
          <div style={{position: 'relative'}}><Search size={16} style={{position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)'}}/>
            <input className="input-sgpc" placeholder="Buscar por DNI, EPS, Servicio, Docente..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{paddingLeft: '3.6rem'}}/>
          </div>
        </div>

        <div className="table-wrapper-sgpc">
          <table className="table-sgpc">
            <thead><tr>
              <th>#</th><th>EPS / CLÍNICA</th><th>SERVICIO</th><th>DOCENTE RESPONSABLE</th>
              <th>PERIODO</th><th>FILIAL</th><th>ESTADO</th><th>ACCIONES</th>
            </tr></thead>
            <tbody>
              {loading? <tr><td colSpan={8} style={{textAlign: 'center', padding: '2rem'}}>Cargando...</td></tr> :
              dataPaginada.length === 0? <tr><td colSpan={8} style={{textAlign: 'center', padding: '2rem'}}>No se encontraron registros</td></tr> :
              dataPaginada.map((item, index) => (
                <tr key={item.idcampocli}>
                  <td>{(paginaActual - 1) * ITEMS_POR_PAGINA + index + 1}</td>
                  <td>
                    <div style={{fontWeight: 600}}>{item.eps}</div>
                    <div style={{fontSize: '1.2rem', color: 'var(--color-texto-secundario)'}}>{item.distrito} - {item.provincia}</div>
                  </td>
                  <td style={{textTransform: 'uppercase'}}>{item.servicio}</td>
                  <td>
                    <div style={{fontWeight: 600}}>{item.dni}</div>
                    <div>{item.docente}</div>
                    <div style={{fontSize: '1.2rem', color: 'var(--color-texto-secundario)'}}>{item.especialidad}</div>
                  </td>
                  <td>{item.periodo}</td>
                  <td>{item.filial}</td>
                  <td><span style={{background: '#DCFCE7', color: '#166534', padding: '0.4rem 0.8rem', borderRadius: '999px', fontSize: '1.2rem', fontWeight: 600}}>{item.estado}</span></td>
                  <td>
                    <div style={{display: 'flex', gap: '0.8rem'}}>
                      <button onClick={() => handleEditar(item.idcampocli)} style={{background: '#DBEAFE', border: 'none', padding: '0.8rem', borderRadius: '0.6rem'}}><Pencil size={14} color="#2563EB"/></button>
                      <button onClick={() => handleEliminar(item.idcampocli)} style={{background: '#FEE2E2', border: 'none', padding: '0.8rem', borderRadius: '0.6rem'}}><Trash2 size={14} color="#DC2626"/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', fontSize: '1.3rem'}}>
            <span>Mostrando {dataPaginada.length} de {dataFiltrada.length} registros</span>
            <div style={{display: 'flex', gap: '0.8rem', alignItems: 'center'}}>
              <button className="btn-secundario" onClick={() => setPaginaActual(p => Math.max(1, p-1))} disabled={paginaActual === 1}><ChevronLeft size={16}/> Anterior</button>
              <span style={{fontWeight: 600}}>Pág {paginaActual} de {totalPaginas}</span>
              <button className="btn-secundario" onClick={() => setPaginaActual(p => Math.min(totalPaginas, p+1))} disabled={paginaActual === totalPaginas}>Siguiente <ChevronRight size={16}/></button>
            </div>
          </div>
      </div>
      <ModalHorarioDocente
        show={showModal}
        onClose={() => {setShowModal(false); fetchData()}}
        idcampocli={dataParaEditar?.idcampocli}
        dataHeader={dataParaEditar}
      />
    </div>
  )
}