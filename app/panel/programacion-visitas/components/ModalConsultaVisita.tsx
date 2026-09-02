'use client'
import React, { useEffect, useState } from 'react'
import { X, Check, Phone, AlertTriangle, FileText, ClipboardList, Building2, GraduationCap, User, MapPin } from 'lucide-react'
import { createClient } from '@/lib/client'
import toast from 'react-hot-toast'

export default function ModalConsultaVisita({ show, onClose, visita, onAbrirFicha, onRefresh }: any) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [headerData, setHeaderData] = useState<any>(null)

  const idvisitas = visita?.idvisitas
  const tienePermiso = visita?.solicitud_permiso?.[0]?.estado === 'APROBADO'

  useEffect(() => {
    if(show && idvisitas) fetchHeader()
  }, [show, idvisitas])

  const fetchHeader = async () => {
    setLoading(true)
    const { data: v } = await supabase
    .from('visitasupervision')
    .select(`idvisitas, asignacionsupervision!inner(asignacion_nrc_supervisor!inner(cargaacademica!inner(idcargaacad)))`)
    .eq('idvisitas', idvisitas).single()

    const idcargaacad = v?.asignacionsupervision?.asignacion_nrc_supervisor?.cargaacademica?.idcargaacad
    if(!idcargaacad) { setLoading(false); return }

    const { data: carga } = await supabase
    .from('cargaacademica')
    .select(`idcargaacad, nrc, asignatura!inner(nombre), campoclinico!inner(filial!inner(nombrefilial), eps!inner(razonsocial), docente!inner(persona(dni, apellidos, nombres)))`)
    .eq('idcargaacad', idcargaacad).single()

    setHeaderData(carga)
    setLoading(false)
  }

  const registrarContacto = async () => {
    setLoading(true)
    await supabase.from('incidencia').insert({idvisitas, tipo: 'CONTACTO_TELEFONICO', descripcion: 'Se coordinó con el docente vía teléfono/WhatsApp.', estado: 'ATENDIDO'})
    await supabase.from('visitasupervision').update({condicion: 'PENDIENTE'}).eq('idvisitas', idvisitas)
    toast.success("Contacto registrado")
    setLoading(false); onRefresh(); onClose()
  }

  const registrarIncidencia = async () => {
    setLoading(true)
    await supabase.from('incidencia').insert({idvisitas, tipo: 'INASISTENCIA', descripcion: 'Docente no se encontró en campo.', estado: 'PENDIENTE'})
    await supabase.from('visitasupervision').update({condicion: 'INCIDENCIA'}).eq('idvisitas', idvisitas)
    toast.error("Incidencia registrada")
    setLoading(false); onRefresh(); onClose()
  }

  if(!show) return null
  const carga = headerData
  const cc = carga?.campoclinico
  const docente = cc?.docente?.persona

  return (
    <div className="modal-overlay" style={{zIndex: 3000}} onClick={onClose}>
      <div className="modal-content card-sgpc" style={{maxWidth: '60rem', padding: '0', borderRadius: '1.2rem', overflow: 'hidden'}} onClick={e => e.stopPropagation()}>

        {/* HEADER AZUL */}
        <div className="modal-header" style={{background: 'var(--color-primario)', color: '#fff', padding: '1.5rem 2rem'}}>
          <h2 style={{color:'#fff', display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '1.6rem', margin: 0}}>
            <ClipboardList size={22}/> Registro de Visita en Campo
          </h2>          
          <button 
  onClick={onClose} 
  onMouseEnter={e => {
    e.currentTarget.style.background = '#FEE2E2';
    e.currentTarget.style.color = '#DC2626';
    e.currentTarget.style.transform = 'rotate(90deg)';
  }}
  onMouseLeave={e => {
    e.currentTarget.style.background = 'transparent';
    e.currentTarget.style.color = '#fff';
    e.currentTarget.style.transform = 'rotate(0deg)';
  }}
  style={{
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '0.8rem',
    borderRadius: '0.6rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    transition: 'all 0.2s ease'
  }}
>
  <X size={20}/>
</button>
        </div>

        <div className="modal-body" style={{padding: '2rem'}}>
          {loading? <p>Cargando...</p> :
          <>
            {/* CARDS DE INFO */}
            <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '2rem'}}>

              <div style={{display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.2rem', background: '#EFF6FF', borderRadius: '0.8rem', borderLeft: '4px solid #3B82F6'}}>
                <GraduationCap size={20} color="#3B82F6"/>
                <div>
                  <div style={{fontSize: '1.1rem', color: '#64748b'}}>Asignatura</div>
                  <div style={{fontSize: '1.4rem', fontWeight: 700, color: '#1E293B'}}>{carga?.asignatura?.nombre}</div>
                </div>
              </div>

              <div style={{display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.2rem', background: '#F0FDF4', borderRadius: '0.8rem', borderLeft: '4px solid #22C55E'}}>
                <User size={20} color="#22C55E"/>
                <div>
                  <div style={{fontSize: '1.1rem', color: '#64748b'}}>Docente</div>
                  <div style={{fontSize: '1.4rem', fontWeight: 700, color: '#1E293B'}}>{docente?.apellidos}, {docente?.nombres}</div>
                </div>
              </div>

              <div style={{display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.2rem', background: '#FFFBEB', borderRadius: '0.8rem', borderLeft: '4px solid #F59E0B'}}>
                <Building2 size={20} color="#F59E0B"/>
                <div>
                  <div style={{fontSize: '1.1rem', color: '#64748b'}}>EPS</div>
                  <div style={{fontSize: '1.4rem', fontWeight: 700, color: '#1E293B'}}>{cc?.eps?.razonsocial}</div>
                </div>
              </div>

              <div style={{display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.2rem', background: '#F8FAFC', borderRadius: '0.8rem', borderLeft: '4px solid #94A3B8'}}>
                <MapPin size={20} color="#64748b"/>
                <div>
                  <div style={{fontSize: '1.1rem', color: '#64748b'}}>NRC / Filial</div>
                  <div style={{fontSize: '1.4rem', fontWeight: 700, color: '#1E293B'}}>{carga?.nrc} | {cc?.filial?.nombrefilial}</div>
                </div>
              </div>

            </div>

            {/* ALERTA PERMISO */}
            {tienePermiso && (
              <div style={{background: '#FEF3C7', padding: '1.2rem', borderRadius: '0.8rem', marginBottom: '2rem', borderLeft: '4px solid #F59E0B', display: 'flex', gap: '0.8rem'}}>
                <FileText size={18} color="#D97706"/>
                <div>
                  <b style={{color: '#92400E'}}>Permiso Aprobado</b>
                  <p style={{margin: '0.4rem 0 0 0', fontSize: '1.2rem', color: '#92400E'}}>{visita.solicitud_permiso[0].motivo}</p>
                </div>
              </div>
            )}
          </>}
        </div>

{/* FOOTER BOTONES */}
<div style={{display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem 2rem', background: '#F8FAFC', borderTop: '1px solid #E2E8F0'}}>

  {tienePermiso? (
    <button disabled style={{width: '100%', height: '4.8rem', borderRadius: '0.8rem', border: '1.5px solid #CBD5E1', background: '#E2E8F0', color: '#64748b', fontSize: '1.4rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', opacity: 0.6}}>
      <FileText size={16}/> Visita con Permiso Aprobado
    </button>
  ) : (
    <button 
      disabled={loading} 
      onClick={() => {onAbrirFicha(visita, false); onClose()}} 
      onMouseEnter={e => {e.currentTarget.style.background = '#1E40AF'; e.currentTarget.style.transform = 'translateY(-2px)'}}
      onMouseLeave={e => {e.currentTarget.style.background = 'var(--color-primario)'; e.currentTarget.style.transform = 'translateY(0)'}}
      style={{
        width: '100%', height: '4.8rem', borderRadius: '0.8rem', border: '1.5px solid var(--color-primario)', 
        background: 'var(--color-primario)', color: 'var(--color-blanco)', fontSize: '1.4rem', fontWeight: 600, 
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', cursor: 'pointer',
        transition: 'all 0.2s ease'
      }}
    >
      <Check size={16}/> 1. Docente Presente → Llenar Ficha
    </button>
  )}

  <button 
    disabled={loading} 
    onClick={registrarContacto} 
    onMouseEnter={e => {e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.transform = 'translateY(-2px)'}}
    onMouseLeave={e => {e.currentTarget.style.background = 'var(--color-blanco)'; e.currentTarget.style.transform = 'translateY(0)'}}
    style={{
      width: '100%', height: '4.8rem', borderRadius: '0.8rem', border: '1.5px solid rgb(131, 127, 127)', 
      background: 'var(--color-blanco)', color: 'rgb(131, 127, 127)', fontSize: '1.4rem', fontWeight: 600, 
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', cursor: 'pointer',
      transition: 'all 0.2s ease'
    }}
  >
    <Phone size={16}/> 2. Se contactó vía Tel/WhatsApp
  </button>

  <button 
    disabled={loading} 
    onClick={registrarIncidencia} 
    onMouseEnter={e => {e.currentTarget.style.background = '#FECACA'; e.currentTarget.style.transform = 'translateY(-2px)'}}
    onMouseLeave={e => {e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.transform = 'translateY(0)'}}
    style={{
      width: '100%', height: '4.8rem', borderRadius: '0.8rem', border: '1.5px solid #FECACA', 
      background: '#FEE2E2', color: '#DC2626', fontSize: '1.4rem', fontWeight: 600, 
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', cursor: 'pointer',
      transition: 'all 0.2s ease'
    }}
  >
    <AlertTriangle size={16}/> 3. No se ubicó al docente
  </button>
</div>

      </div>
<style jsx>{`
  @media (max-width: 768px) {
    /* Modal más pegado a los bordes en cel */
    .modal-content {
      width: 95% !important;
      max-width: 95% !important;
      margin: 1rem !important;
    }

    /* Reducir padding del header y body */
    .modal-header, .modal-body, .modal-footer {
      padding: 1.2rem 1.5rem !important;
    }

    /* Título más pequeño */
    .modal-header h2 {
      font-size: 1.4rem !important;
    }

    /* Botones más altos para dedo gordo */
    .modal-footer button {
      height: 5.2rem !important; /* Más alto en cel */
      font-size: 1.3rem !important;
    }

    /* Info cards: texto no se desborde */
    .info-card {
      padding: 1rem !important;
    }
    .info-card .valor {
      font-size: 1.3rem !important;
      word-break: break-word; /* Para HOSPITAL NACIONAL... */
    }
  }
`}</style>
    </div>
  )
}