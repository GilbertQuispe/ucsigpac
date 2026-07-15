'use client'
import { useEffect, useState, useMemo, useRef } from 'react'
import { createClient } from '@/lib/client'
import { Plus, Edit, Trash2, X, Search, Upload, AlertCircle, Phone, User, IdCard, Users, Shield } from 'lucide-react'
import * as XLSX from 'xlsx'

type Persona = {
  idpersona: number
  dni: string
  apellidos: string
  nombres: string
  telefono: string | null
  sexo: 'M' | 'F' | null
  created_at: string
  idrol: number | null
  rol?: { nombrerol: string }
}

type Rol = {
  idrol: number
  nombrerol: string
}

export default function PersonasPage() {
  const supabase = createClient()
  const [personas, setPersonas] = useState<Persona[]>([])
  const [roles, setRoles] = useState<Rol[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showAlertaModal, setShowAlertaModal] = useState(false)
  const [editing, setEditing] = useState<Persona | null>(null)
  const [form, setForm] = useState<Partial<Persona>>({})
  const [search, setSearch] = useState('')
  const [filtroSexo, setFiltroSexo] = useState('')
  const [dniInputBloqueado, setDniInputBloqueado] = useState(true)
  const [camposBloqueados, setCamposBloqueados] = useState(true)
  const [alerta, setAlerta] = useState('')
  const dniInputRef = useRef<HTMLInputElement>(null)
  const apellidosInputRef = useRef<HTMLInputElement>(null)

  const fetchPersonas = async () => {
    setLoading(true)
    const { data: personasData } = await supabase.from('persona').select('*').order('idpersona')
    const { data: rolesData } = await supabase.from('rol').select('idrol, nombrerol')

    const personasConRol = (personasData || []).map(p => ({
     ...p,
      rol: rolesData?.find(r => Number(r.idrol) === Number(p.idrol))
    }))

    setPersonas(personasConRol)
    setRoles(rolesData || [])
    setLoading(false)
  }

  useEffect(() => { fetchPersonas() }, [])

  const validarDNI = async (dniValue: string) => {
    if (!dniValue || dniValue.length!== 8) return

    setLoading(true)
    const { data } = await supabase.from('persona').select('idpersona').eq('dni', dniValue).maybeSingle()
    setLoading(false)

    if (data &&!editing) {
      setAlerta('Este DNI ya está registrado en el sistema')
      setShowAlertaModal(true)
      setDniInputBloqueado(false)
      setCamposBloqueados(true)
      setTimeout(() => {
        setShowAlertaModal(false)
        setAlerta('')
        setForm(prev => ({...prev, dni: '', apellidos: '', nombres: '', telefono: '', sexo: null}))
        dniInputRef.current?.focus()
      }, 2000)
    } else {
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
    setForm({...form, dni: dniLimitado})

    if (dniLimitado.length < 8) {
      setDniInputBloqueado(false)
      setCamposBloqueados(true)
    }
  }

  const handleDniKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      validarDNI(form.dni || '')
    }
  }

  const personasFiltradas = useMemo(() => {
    return personas.filter(p => {
      const matchSearch =
        p.dni.toLowerCase().includes(search.toLowerCase()) ||
        p.nombres.toLowerCase().includes(search.toLowerCase()) ||
        p.apellidos.toLowerCase().includes(search.toLowerCase())
      const matchSexo = filtroSexo? p.sexo === filtroSexo : true
      return matchSearch && matchSexo
    })
  }, [personas, search, filtroSexo])

  const handleSave = async () => {
    if (!form.dni ||!form.nombres ||!form.apellidos) {
      setAlerta('DNI, Nombres y Apellidos son obligatorios')
      setShowAlertaModal(true)
      setTimeout(() => setShowAlertaModal(false), 2000)
      return
    }
    if (editing) {
      await supabase.from('persona').update(form).eq('idpersona', editing.idpersona)
    } else {
      await supabase.from('persona').insert(form)
    }
    closeModal()
    fetchPersonas()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Seguro de eliminar este registro?')) return
    await supabase.from('persona').delete().eq('idpersona', id)
    fetchPersonas()
  }

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (evt) => {
      const bstr = evt.target?.result
      const wb = XLSX.read(bstr, { type: 'binary' })
      const wsname = wb.SheetNames[0]
      const ws = wb.Sheets[wsname]
      const data: any[] = XLSX.utils.sheet_to_json(ws)
      const personasToInsert = data.map(row => ({
        dni: row.DNI?.toString().replace(/\D/g, '').slice(0,8),
        apellidos: row.Apellidos,
        nombres: row.Nombres,
        telefono: row.Telefono?.toString(),
        sexo: row.Sexo,
        idrol: row.IDRol || 4
      })).filter(p => p.dni && p.nombres && p.apellidos)
      const { error } = await supabase.from('persona').insert(personasToInsert)
      if (error) {
        setAlerta('Error al importar: ' + error.message)
        setShowAlertaModal(true)
        setTimeout(() => setShowAlertaModal(false), 2000)
      } else {
        setAlerta('Importado correctamente!')
        setShowAlertaModal(true)
        setTimeout(() => setShowAlertaModal(false), 1500)
        fetchPersonas()
      }
    }
    reader.readAsBinaryString(file)
    e.target.value = ''
  }

  const openModal = (persona?: Persona) => {
    if (persona) {
      setEditing(persona);
      setForm(persona);
      setDniInputBloqueado(true)
      setCamposBloqueados(false)
    } else {
      setEditing(null);
      setForm({ dni: '', nombres: '', apellidos: '', telefono: '', sexo: null, idrol: 4 });
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
    <div>
      <div className="header-responsive">
        <div>
          <h1>Registro de Personas</h1>
          <p>Total: {personasFiltradas.length} registros</p>
        </div>
        <div style={{ display: 'flex', gap: '1.2rem' }}>
          <label className="btn-secundario" style={{cursor: 'pointer'}}>
            <Upload size={18} style={{verticalAlign: 'middle', marginRight: '0.8rem'}} />
            Importar Excel
            <input type="file" accept=".xlsx,.xls" onChange={handleImportExcel} style={{display: 'none'}} />
          </label>
          <button className="btn-primario" onClick={() => openModal()}>
            <Plus size={18} style={{verticalAlign: 'middle', marginRight: '0.8rem'}} />
            Nueva Persona
          </button>
        </div>
      </div>

      <div className="card-sgpc" style={{ marginBottom: '2.4rem', display: 'flex', gap: '1.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '25rem' }}>
          <Search size={18} style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
          <input className="input-sgpc" placeholder="Buscar por DNI, Nombres, Apellidos..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '4rem' }} />
        </div>
        <select className="input-sgpc" value={filtroSexo} onChange={e => setFiltroSexo(e.target.value)} style={{ width: '20rem', minWidth: '20rem', flexShrink: 0 }}>
          <option value="">Todos los Sexos</option>
          <option value="M">Masculino</option>
          <option value="F">Femenino</option>
        </select>
      </div>

      <div className="card-sgpc" style={{ overflowX: 'auto' }}>
        {loading? <p>Cargando...</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ borderBottom: '0.2rem solid var(--color-borde)', textAlign: 'left' }}>
                <th style={{ padding: '1rem' }}>ID</th>
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
              {personasFiltradas.map(p => (
                <tr key={p.idpersona} style={{ borderBottom: '1px solid var(--color-borde)' }}>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{p.idpersona}</td>
                  <td style={{ padding: '1rem' }}>{p.dni}</td>
                  <td style={{ padding: '1rem' }}>{p.apellidos}</td>
                  <td style={{ padding: '1rem' }}>{p.nombres}</td>
                  <td style={{ padding: '1rem' }}>{p.telefono || '-'}</td>
                  <td style={{ padding: '1rem' }}>{p.sexo === 'M'? 'Masculino' : p.sexo === 'F'? 'Femenino' : '-'}</td>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{p.rol?.nombrerol || 'Sin Rol'}</td>
                  <td style={{ padding: '1rem', display: 'flex', gap: '0.8rem' }}>
                    <button className="btn-icon" onClick={() => openModal(p)}><Edit size={15} /></button>
                    <button className="btn-icon btn-danger" onClick={() => handleDelete(p.idpersona)}><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.4rem'}}>
              <h2>{editing? 'Editar Persona' : 'Nueva Persona'}</h2>
              <button onClick={closeModal} style={{background: 'none', border: 'none', cursor: 'pointer'}}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gap: '1.6rem' }}>

              <div className="input-wrapper">
                <label className="input-label">DNI</label>
                <input
                  ref={dniInputRef}
                  className="input-sgpc-floating"
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
                <IdCard size={18} className="input-icon" />
              </div>

              <div className="input-wrapper">
                <label className="input-label">Apellidos</label>
                <input ref={apellidosInputRef} className="input-sgpc-floating" placeholder="Pérez García" value={form.apellidos || ''} onChange={e => setForm({...form, apellidos: e.target.value})} disabled={camposBloqueados} />
                <User size={18} className="input-icon" />
              </div>

              <div className="input-wrapper">
                <label className="input-label">Nombres</label>
                <input className="input-sgpc-floating" placeholder="Juan Carlos" value={form.nombres || ''} onChange={e => setForm({...form, nombres: e.target.value})} disabled={camposBloqueados} />
                <User size={18} className="input-icon" />
              </div>

              <div className="input-wrapper">
                <label className="input-label">Teléfono</label>
                <input className="input-sgpc-floating" placeholder="987654321" value={form.telefono || ''} onChange={e => setForm({...form, telefono: e.target.value})} disabled={camposBloqueados} />
                <Phone size={18} className="input-icon" />
              </div>

              <div className="input-wrapper">
                <label className="input-label">Sexo</label>
                <select className="input-sgpc-floating" value={form.sexo || ''} onChange={e => setForm({...form, sexo: e.target.value as 'M' | 'F'})} disabled={camposBloqueados} style={{appearance: 'none'}}>
                  <option value="">Seleccionar</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                </select>
                <Users size={18} className="input-icon" />
              </div>

              <div className="input-wrapper">
                <label className="input-label">Rol</label>
                <select className="input-sgpc-floating" value={form.idrol || ''} onChange={e => setForm({...form, idrol: Number(e.target.value)})} disabled={camposBloqueados} style={{appearance: 'none'}}>
                  <option value="">Seleccionar Rol</option>
                  {roles.map(r => (<option key={r.idrol} value={r.idrol}>{r.nombrerol}</option>))}
                </select>
                <Shield size={18} className="input-icon" />
              </div>

              <button className="btn-primario" onClick={handleSave} disabled={camposBloqueados}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {showAlertaModal && (
        <div className="alerta-modal-overlay">
          <div className="alerta-modal-content">
            <AlertCircle size={48} color="#ef4444" />
            <h3>¡Atención!</h3>
            <p>{alerta}</p>
          </div>
        </div>
      )}

      <style jsx>{`
       .btn-secundario {
          background-color: var(--color-secundario);
          color: var(--color-blanco);
          border: none;
          border-radius: 0.8rem;
          padding: 1.2rem 2.4rem;
          font-size: var(--text-base);
          font-weight: 600;
          cursor: pointer;
        }
       .btn-icon {
          background: var(--color-acento);
          border: none;
          padding: 0.8rem;
          border-radius: 0.6rem;
          cursor: pointer;
          color: var(--color-texto);
        }
       .btn-icon:hover { opacity: 0.8; }
       .btn-danger { background: #ef4444; color: white; }

       .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(4px);
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
        }

       .input-wrapper {
          position: relative;
          width: 100%;
          display:flex;
          align-items:center;
        }
       .input-sgpc-floating {
          position:relative;
          width: 100%;
          box-sizing: border-box;
          padding: 1.8rem 4rem 0.8rem 1.6rem;
          border: 1px solid var(--color-secundario);
          border-radius: 0.8rem;
          font-size: var(--text-base);
          font-family: var(--font-principal);
          background: var(--color-blanco);
          outline: none;
          transition: all 0.2s ease;
          color: var(--color-texto);
          height:5.2rem;
        }
       .input-sgpc-floating:focus {
          border: 2px solid var(--color-primario);
          box-shadow: none;
          padding: 1.7rem 3.9rem 0.7rem 1.5rem;
        }
       .input-sgpc-floating:disabled {
          background: #f3f4f6;
          cursor: not-allowed;
          opacity: 0.7;
        }
       .input-label {
          position: absolute;
          left: 1.6rem;
          top: -1.2rem;
          font-size: var(--text-ms);
          color: var(--color-primario);
          font-weight: 600;
          background: var(--color-blanco);
          padding: 0 0.4rem;
          pointer-events: none;
          z-index:1;
        }
       .input-icon {
          position: absolute;
          right: 1.6rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--color-secundario);
          pointer-events: none;
          z-index:2;
          background:red;
        }

       .alerta-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 3000;
          animation: fadeIn 0.2s ease-in;
        }
       .alerta-modal-content {
          background: white;
          padding: 3.2rem 4rem;
          border-radius: 1.6rem;
          text-align: center;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
          animation: scaleIn 0.3s ease-out;
          max-width: 40rem;
        }
       .alerta-modal-content h3 { color: #b91c1c; font-size: var(--text-xl); margin: 1.2rem 0 0.8rem 0; font-weight: 700; }
       .alerta-modal-content p { color: var(--color-texto); font-size: var(--text-base); margin: 0; }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  )
}