'use client'
import { useEffect, useState, useMemo, useRef } from 'react'
import { createClient } from '@/lib/client'
import { Plus, Edit, Trash2, X, Search, Upload, Phone, User, IdCard, Users, Shield } from 'lucide-react'
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
  const [editing, setEditing] = useState<Persona | null>(null)
  const [form, setForm] = useState<Partial<Persona>>({})
  const [search, setSearch] = useState('')
  const [filtroSexo, setFiltroSexo] = useState('')
  const [dniInputBloqueado, setDniInputBloqueado] = useState(true)
  const [camposBloqueados, setCamposBloqueados] = useState(true)
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null)
  const dniInputRef = useRef<HTMLInputElement>(null)
  const apellidosInputRef = useRef<HTMLInputElement>(null)

  const showToast = (msg: string, type: 'error' | 'success' = 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

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
      showToast('Este Nro. De DNI ya está registrado', 'error')
      setDniInputBloqueado(false)
      setCamposBloqueados(true)
      setTimeout(() => {
        setForm(prev => ({...prev, dni: '', apellidos: '', nombres: '', telefono: '', sexo: null }))
        dniInputRef.current?.focus()
      }, 1500)
    } else {
      showToast('Nro. De DNI Nuevo', 'success')
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

  // Validar si el botón guardar debe estar habilitado
  const puedeGuardar = useMemo(() => {
    return!camposBloqueados && form.dni?.length === 8 && form.nombres?.trim() && form.apellidos?.trim()
  }, [camposBloqueados, form])

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

 /*  const handleSave = async () => {
    if (!form.dni ||!form.nombres ||!form.apellidos) {
      showToast('Complete los campos obligatorios', 'error')
      return
    }
    if (editing) {
      await supabase.from('persona').update(form).eq('idpersona', editing.idpersona)
      showToast('Registro actualizado', 'success')
    } else {
      await supabase.from('persona').insert(form)
      showToast('Persona registrada', 'success')
    }
    closeModal()
    fetchPersonas()
  } */

const handleSave = async () => {
  if (!puedeGuardar) return;

  try {
    let mensaje = '';

    if (editing) {
      // ACTUALIZAR
      const { error } = await supabase
       .from('persona')
       .update({
          dni: form.dni,
          nombres: form.nombres,
          apellidos: form.apellidos,
          telefono: form.telefono,
          sexo: form.sexo,
          idrol: form.idrol
        })
       .eq('idpersona', editing.idpersona);

      if (error) throw error;
      mensaje = 'Datos actualizados correctamente';
    } else {
      // CREAR
      const { error } = await supabase
       .from('persona')
       .insert([form]);

      if (error) throw error;
      mensaje = 'Persona registrada correctamente';
    }

    // 1. TOAST
    setToast({ msg: mensaje, type: 'success' });
    setTimeout(() => setToast(null), 3000);

    // 2. ACTUALIZAR TABLA
    await fetchPersonas();

    // 3. CERRAR MODAL Y LIMPIAR
    closeModal();

  } catch (err: any) {
    setToast({ msg: err.message || 'Error al guardar', type: 'error' });
    setTimeout(() => setToast(null), 3000);
  }
}

  const handleDelete = async (id: number) => {
    if (!confirm('¿Seguro de eliminar este registro?')) return
    await supabase.from('persona').delete().eq('idpersona', id)
    showToast('Registro eliminado', 'success')
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
        dni: row.DNI?.toString().replace(/\D/g, '').slice(0, 8),
        apellidos: row.Apellidos,
        nombres: row.Nombres,
        telefono: row.Telefono?.toString(),
        sexo: row.Sexo,
        idrol: row.IDRol || 4
      })).filter(p => p.dni && p.nombres && p.apellidos)
      const { error } = await supabase.from('persona').insert(personasToInsert)
      if (error) {
        showToast('Error al importar: ' + error.message, 'error')
      } else {
        showToast('Importado correctamente!', 'success')
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
      {/* HEADER */}
      <div className="header-responsive">
        <div>
          <h1>Registro de Personas</h1>
          <p>Total: {personasFiltradas.length} registros</p>
        </div>
        <div style={{ display: 'flex', gap: '1.2rem' }}>
          <label className="btn-secundario" style={{ cursor: 'pointer' }}>
            <Upload size={18} />
            Importar Excel
            <input type="file" accept=".xlsx,.xls" onChange={handleImportExcel} style={{ display: 'none' }} />
          </label>
          <button className="btn-primario" onClick={() => openModal()}>
            <Plus size={18} />
            Nueva Persona
          </button>
        </div>
      </div>

      {/* FILTROS */}
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

      {/* TABLA */}
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

      {/* MODAL FORMULARIO */}
      {showModal && (
  <div className="modal-overlay">
    <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()}>

      {/* TOAST ESTANDAR SIGPAC */}
      {toast && (
        <div className={`toast-sgpc ${toast.type}`}>
          {toast.msg}
        </div>
      )}

      {/* HEADER */}
      <div className="modal-header">
        <h2>{editing? 'Editar Persona' : 'Nueva Persona'}</h2>
        <button onClick={closeModal} className="btn-cerrar"><X size={20} /></button>
      </div>

      {/* BODY */}
      <div className="modal-body">
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
          <div className="input-icon-wrapper"><IdCard size={18} strokeWidth={1.5} /></div>
        </div>

        <div className="input-wrapper">
          <label className="input-label">Apellidos</label>
          <input ref={apellidosInputRef} className="input-sgpc-floating" placeholder="Pérez García" value={form.apellidos || ''} onChange={e => setForm({...form, apellidos: e.target.value })} disabled={camposBloqueados} />
          <div className="input-icon-wrapper"><User size={18} strokeWidth={1.5} /></div>
        </div>

        <div className="input-wrapper">
          <label className="input-label">Nombres</label>
          <input className="input-sgpc-floating" placeholder="Juan Carlos" value={form.nombres || ''} onChange={e => setForm({...form, nombres: e.target.value })} disabled={camposBloqueados} />
          <div className="input-icon-wrapper"><User size={18} strokeWidth={1.5} /></div>
        </div>

        <div className="input-wrapper">
          <label className="input-label">Teléfono</label>
          <input className="input-sgpc-floating" placeholder="987654321" value={form.telefono || ''} onChange={e => setForm({...form, telefono: e.target.value })} disabled={camposBloqueados} />
          <div className="input-icon-wrapper"><Phone size={18} strokeWidth={1.5} /></div>
        </div>

        <div className="input-wrapper">
          <label className="input-label">Sexo</label>
          <select className="input-sgpc-floating" value={form.sexo || ''} onChange={e => setForm({...form, sexo: e.target.value as 'M' | 'F' })} disabled={camposBloqueados}>
            
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
          </select>
          <div className="input-icon-wrapper"><Users size={18} strokeWidth={1.5} /></div>
        </div>

        <div className="input-wrapper">
          <label className="input-label">Rol</label>
          <select className="input-sgpc-floating" value={form.idrol || ''} onChange={e => setForm({...form, idrol: Number(e.target.value) })} disabled={camposBloqueados}>
            
            {roles.map(r => (<option key={r.idrol} value={r.idrol}>{r.nombrerol}</option>))}
          </select>
          <div className="input-icon-wrapper"><Shield size={18} strokeWidth={1.5} /></div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="modal-footer">
        <button 
          className="btn-secundario" 
          onClick={() => {
            setForm({ dni: '', nombres: '', apellidos: '', telefono: '', sexo: null, idrol: 4 });
            setDniInputBloqueado(false);
            setCamposBloqueados(true);
            setTimeout(() => dniInputRef.current?.focus(), 100);
          }}
        >
          Cancelar
        </button>
        <button className="btn-primario" onClick={handleSave} disabled={!puedeGuardar}>
          Guardar
        </button>
      </div>

    </div>
  </div>
)}

      <style jsx>{`
     .btn-icon {
          background: var(--color-acento);
          border: none;
          padding: 0.8rem;
          border-radius: 0.6rem;
          cursor: pointer;
          color: var(--color-texto);
          display: flex;
        }
     .btn-icon:hover { opacity: 0.8; }
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
          padding: 3.2rem;
          position: relative; /* CLAVE PARA QUE EL TOAST SE CENTRE AQUI */
          
          display:flex;
          flex-direction:column;
          max-height:90vh;
        }

     .input-wrapper { position: relative; width: 100%; }
     .input-sgpc-floating {
          width: 100%;
          box-sizing: border-box;
          padding: 1.8rem 4.2rem 0.8rem 1.6rem;
          border: 1px solid var(--color-secundario);
          border-radius: 0.8rem;
          font-size: var(--text-base);
          font-family: var(--font-principal);
          background: var(--color-blanco);
          outline: none;
          transition: all 0.2s ease;
          color: var(--color-texto);
          height: 5.2rem;
        }
     .input-sgpc-floating:focus {
          border: 2px solid var(--color-primario);
          padding: 1.7rem 4.1rem 0.7rem 1.5rem;
        }
     .input-sgpc-floating:disabled {
          background: #f3f4f6;
          cursor: not-allowed;
          opacity: 0.7;
        }
     .input-label {
          position: absolute;
          left: 1.4rem;
          top: -0.8rem;
          font-size: 1.2rem;
          color: var(--color-primario);
          font-weight: 600;
          background: var(--color-blanco);
          padding: 0 0.6rem;
          pointer-events: none;
          z-index: 1;
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
          position: absolute; /* CAMBIO: Ahora es absolute al modal */
          top: 50%; /* Sale arriba del modal */
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
      `}</style>
    </div>
  )
}