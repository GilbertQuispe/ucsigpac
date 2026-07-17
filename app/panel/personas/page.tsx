'use client'
import { useEffect, useState, useMemo, useRef } from 'react'
import { createClient } from '@/lib/client'
import { Plus, Edit, Trash2, X, Search, Upload, Phone, User, IdCard, Users, Shield, AlertTriangle, Check, Ban } from 'lucide-react'
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
  estado: string // <-- NUEVO
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
  const [showConfirm, setShowConfirm] = useState(false)
  const [idAEliminar, setIdAEliminar] = useState<number | null>(null)
  const [editing, setEditing] = useState<Persona | null>(null)
  const [form, setForm] = useState<Partial<Persona>>({})
  const [search, setSearch] = useState('')
  const [filtroSexo, setFiltroSexo] = useState('')
  const [dniInputBloqueado, setDniInputBloqueado] = useState(true)
  const [camposBloqueados, setCamposBloqueados] = useState(true)
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null)
  const dniInputRef = useRef<HTMLInputElement>(null)
  const apellidosInputRef = useRef<HTMLInputElement>(null)

  const [previewData, setPreviewData] = useState<any[]>([])
  const [showPreviewModal, setShowPreviewModal] = useState(false)

  const showToast = (msg: string, type: 'error' | 'success' = 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const toTitleCase = (str: string) =>
    str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase())

  const fetchPersonas = async () => {
    setLoading(true)
    const { data: personasData } = await supabase
     .from('persona')
     .select('*')
     .eq('estado', 'ACTIVO') // <-- SOLO TRAE ACTIVOS
     .order('idpersona')
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
    const { data } = await supabase.from('persona').select('idpersona, estado').eq('dni', dniValue).maybeSingle() // <-- AGREGUE ESTADO
    setLoading(false)

    if (data) {
      if(data.estado === 'ANULADO'){
        showToast('Este DNI está ANULADO. Reactívelo primero', 'error')
      } else {
        showToast('Este Nro. De DNI ya está registrado', 'error')
      }
      setDniInputBloqueado(false)
      setCamposBloqueados(true)
      setTimeout(() => {
        setForm(prev => ({...prev, dni: '', apellidos: '', nombres: '', telefono: '', sexo: '' }))
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

  const puedeGuardar = useMemo(() => {
    return!camposBloqueados
      && form.dni?.length === 8
      && form.nombres?.trim()
      && form.apellidos?.trim()
      && (form.sexo === 'M' || form.sexo === 'F')
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
            estado: 'ACTIVO' // <-- NUEVO
          });

        if (error) throw error;
        mensaje = 'Persona registrada correctamente';
      }

      showToast(mensaje, 'success');
      await fetchPersonas();
      closeModal();

    } catch (err: any) {
      showToast(err.message || 'Error al guardar', 'error');
    }
  }

  const handleDelete = (id: number) => { // Ahora es Anular
    setIdAEliminar(id)
    setShowConfirm(true)
  }

  // CAMBIO CLAVE: YA NO BORRA, AHORA ANULA
  const confirmarEliminar = async () => {
    if (!idAEliminar) return
    
    const { error } = await supabase
     .from('persona')
     .update({ estado: 'ANULADO' }) // <-- ANULACION LOGICA
     .eq('idpersona', idAEliminar)
      
    if (error) {
      showToast('Error al anular: ' + error.message, 'error')
    } else {
      showToast('Registro anulado correctamente', 'success')
      fetchPersonas()
    }
    setShowConfirm(false)
    setIdAEliminar(null)
  }

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (evt) => {
      setLoading(true)
      const bstr = evt.target?.result
      const wb = XLSX.read(bstr, { type: 'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      const filas = data.slice(1)

      const { data: personasExistentes } = await supabase.from('persona').select('dni, estado')
      const dnisExistentes = new Set(personasExistentes?.filter(p=>p.estado==='ACTIVO').map(p => p.dni)) // <-- SOLO ACTIVOS

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
          fila: index + 2,
          dni,
          apellidos,
          nombres,
          telefono,
          sexo: ['M','F'].includes(sexoRaw)? sexoRaw : '',
          idrol,
          estadoRegistro: 'ACTIVO', // <-- NUEVO
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
        estado: 'ACTIVO' // <-- NUEVO
      }))

    if (paraGrabar.length === 0) {
      showToast('No hay registros válidos para importar', 'error')
      return
    }

    setLoading(true)
    const { error } = await supabase.from('persona').insert(paraGrabar)
    setLoading(false)

    if (error) {
      showToast('Error al importar: ' + error.message, 'error')
      console.error(error)
    } else {
      showToast(`Se importaron ${paraGrabar.length} personas correctamente`, 'success')
      fetchPersonas()
    }
    setShowPreviewModal(false)
    setPreviewData([])
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
    <div>
      <div className="header-responsive">
        <div>
          <h1>Registro de Personas</h1>
          <p>Total: {personasFiltradas.length} registros ACTIVOS</p> {/* <-- CAMBIO */}
        </div>
        <div style={{ display: 'flex', gap: '1.2rem' }}>
          <label htmlFor="import-excel" className="btn-secundario" style={{ cursor: 'pointer' }}>
            <Upload size={18} />
            Importar Excel
          </label>
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
          <table className='tabla-sgpc'>
            <thead>
              <tr >
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
                    <button className="btn-icon btn-icon-editar" onClick={() => openModal(p)}><Edit size={15} /></button>
                    <button className="btn-icon btn-icon-eliminar" onClick={() => handleDelete(p.idpersona)}><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content card-sgpc" onClick={(e) => e.stopPropagation()}>
            {toast && (<div className={`toast-sgpc ${toast.type}`}>{toast.msg}</div>)}
            <div className="modal-header">
              <h2>{editing? 'Editar Persona' : 'Nueva Persona'}</h2>
              <button onClick={closeModal} className="btn-cerrar"><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="input-wrapper">
                <label className="input-label">DNI</label>
                <input ref={dniInputRef} className="input-sgpc-floating" placeholder="12345678" type="text" inputMode="numeric" value={form.dni || ''} onChange={e => handleDniChange(e.target.value)} onKeyDown={handleDniKeyDown} onBlur={() => validarDNI(form.dni || '')} maxLength={8} disabled={dniInputBloqueado} />
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
                <label className="input-label">Sexo *</label>
                <select className="input-sgpc-floating" value={form.sexo || ''} onChange={e => setForm({...form, sexo: e.target.value as 'M' | 'F' | '' })} disabled={camposBloqueados}>
                  <option value="">Seleccione</option>
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
            <div className="modal-footer">
              <button className="btn-secundario" onClick={() => {
                setForm({ dni: '', nombres: '', apellidos: '', telefono: '', sexo: '', idrol: 4 });
                setDniInputBloqueado(false);
                setCamposBloqueados(true);
                setTimeout(() => dniInputRef.current?.focus(), 100);
              }}>
                Cancelar
              </button>
              <button className="btn-primario" onClick={handleSave} disabled={!puedeGuardar}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR ANULACION */}
      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal-content card-sgpc" style={{ maxWidth: '40rem' }}>
            <div className="modal-header">
              <h2><AlertTriangle size={20} style={{ marginRight: '0.8rem', color: '#f59e0b' }} />Confirmar Anulación</h2> {/* <-- CAMBIO COLOR */}
              <button onClick={() => setShowConfirm(false)} className="btn-cerrar"><X size={20} /></button>
            </div>
            <div className="modal-body">
              <p style={{ textAlign: 'center', fontSize: 'var(--text-base)', color: 'var(--color-texto)' }}>
                ¿Está seguro de ANULAR este registro? <br />
                <span style={{ fontWeight: 600 }}>El registro no se borrará, solo se ocultará de la lista.</span>
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-secundario" onClick={() => setShowConfirm(false)}>
                Cancelar
              </button>
              <button className="btn-primario" style={{ background: '#f59e0b' }} onClick={confirmarEliminar}> {/* <-- BOTON NARANJA */}
                Anular
              </button>
            </div>
          </div>
        </div>
      )}

      {showPreviewModal && (
        <div className="modal-overlay">
          <div className="modal-content card-sgpc" style={{ maxWidth: '95rem' }}>
            <div className="modal-header">
              <h2>Vista Previa de Importación</h2>
              <button onClick={() => setShowPreviewModal(false)} className="btn-cerrar"><X size={20} /></button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem' }}>
                Total: {previewData.length} |
                Válidos: <span style={{color:'#22c55e', fontWeight: 600}}>{previewData.filter(p=>p.estado==='ok').length}</span> |
                Rechazados: <span style={{color:'#ef4444', fontWeight: 600}}>{previewData.filter(p=>p.estado==='error').length}</span>
              </p>
              <div style={{ maxHeight: '40rem', overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                  <thead>
                    <tr style={{ borderBottom: '0.2rem solid var(--color-borde)' }}>
                      <th style={{ padding: '0.8rem' }}>Estado</th>
                      <th style={{ padding: '0.8rem' }}>Fila</th>
                      <th style={{ padding: '0.8rem' }}>DNI</th>
                      <th style={{ padding: '0.8rem' }}>Apellidos</th>
                      <th style={{ padding: '0.8rem' }}>Nombres</th>
                      <th style={{ padding: '0.8rem' }}>Teléfono</th>
                      <th style={{ padding: '0.8rem' }}>Sexo</th>
                      <th style={{ padding: '0.8rem' }}>Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((p, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--color-borde)', background: p.estado==='error'? '#fef2f2' : '#f0fdf4' }}>
                        <td style={{ padding: '0.8rem', textAlign: 'center' }}>
                          {p.estado==='ok'? <Check size={18} color="#22c55e" /> : <Ban size={18} color="#ef4444" />}
                        </td>
                        <td style={{ padding: '0.8rem' }}>{p.fila}</td>
                        <td style={{ padding: '0.8rem' }}>{p.dni}</td>
                        <td style={{ padding: '0.8rem' }}>{p.apellidos}</td>
                        <td style={{ padding: '0.8rem' }}>{p.nombres}</td>
                        <td style={{ padding: '0.8rem' }}>{p.telefono}</td>
                        <td style={{ padding: '0.8rem' }}>{p.sexo}</td>
                        <td style={{ padding: '0.8rem', color: '#ef4444', fontSize: '1.2rem' }}>{p.motivo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secundario" onClick={() => setShowPreviewModal(false)}>Cancelar</button>
              <button className="btn-primario" onClick={handleConfirmImport}>
                Grabar {previewData.filter(p=>p.estado==='ok').length} Registros
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
 
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
          position: relative;
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
      `}</style>
    </div>
  )
}