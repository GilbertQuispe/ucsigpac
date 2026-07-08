'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/client';
import Link from 'next/link';

const EyeIcon = ({ open }: { open: boolean }) => open? (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primario)" strokeWidth="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>) : (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primario)" strokeWidth="1.5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>);
const MailIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primario)" strokeWidth="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>)
const SearchIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primario)" strokeWidth="1.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>)

export default function RegisterPage() {
  const [dni, setDni] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingDni, setCheckingDni] = useState(false);
  const [isDniValid, setIsDniValid] = useState(false);
  const [idPersona, setIdPersona] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null);
  const router = useRouter();
  const supabase = createClient();
  const dniRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, type: 'error' | 'success' = 'error') => {
    if(!msg || msg === '{}') msg = 'Ocurrió un error inesperado'; // <-- FIX del {/}
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleCancel = () => {
    setDni(''); setEmail(''); setPassword(''); setConfirmPassword('');
    setIsDniValid(false); setIdPersona(null);
    dniRef.current?.focus();
  }

  useEffect(() => {
    if (dni.length !== 8) { setIsDniValid(false); setIdPersona(null); return; }
    const timer = setTimeout(async () => {
      setCheckingDni(true);
      const { data: persona } = await supabase.from('persona').select('idpersona, dni, apellidos, nombres').eq('dni', dni).maybeSingle();
      if (!persona) { showToast('DNI no encontrado, consulte con su gestora'); setIsDniValid(false); setCheckingDni(false); return; }
      setIdPersona(persona.idpersona);
      const { data: usuario } = await supabase.from('usuario').select('idusuario').eq('idpersona', persona.idpersona).maybeSingle();
      if (usuario) { showToast('Usuario existente'); setIsDniValid(false); setCheckingDni(false); return; }
      // FIX: nombre de vista sin espacio
      const { data: vUsuario } = await supabase.from('v_usuario_completo').select('dni').eq('dni', dni).maybeSingle(); 
      if (vUsuario) { showToast('Usuario existente'); setIsDniValid(false); setCheckingDni(false); return; }
      setIsDniValid(true); setCheckingDni(false);
      showToast(`DNI validado: ${persona.nombres} ${persona.apellidos}`, 'success'); // <-- YA CON APELLIDOS
    }, 600);
    return () => clearTimeout(timer);
  }, [dni, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) return showToast('Las contraseñas no coinciden');
    if (!idPersona) return showToast('Error: No se encontró el ID de persona');

    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email, password,
      options: { 
        emailRedirectTo: `${location.origin}/dashboard`,
        data: { dni: dni, idpersona: idPersona }
      }
    });

    if (authError) {
      showToast(authError.message || 'Error al crear usuario', 'error'); // <-- FIX
      setLoading(false);
      return;
    }

    showToast('Revisa tu correo para activar tu cuenta', 'success');
    handleCancel(); // <-- AHORA SI LIMPIA
    setTimeout(() => router.push('/login'), 2000);
    setLoading(false);
  };

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-fondo)' }}>
      <header style={{ backgroundColor: 'var(--color-primario)', color: 'var(--color-blanco)', padding: '1.6rem' }}>
        <div style={{ maxWidth: '120rem', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}><div style={{ width: '3.2rem', height: '3.2rem', backgroundImage: 'var(--logo-header-url)', backgroundSize: 'contain' }} /><h1 style={{ fontSize: 'var(--text-2xl)', margin: 0 }}>SIGPAC</h1></div>
          <Link href="/" style={{ color: 'var(--color-blanco)', fontSize: 'var(--text-sm)', textDecoration: 'none' }}>Volver al Portal</Link>
        </div>
      </header>
      <section style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="card-sgpc" style={{ maxWidth: '42rem', width: '100%', padding: '3.2rem' }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-texto)', marginBottom: '0.8rem' }}>Crear Cuenta</p>
          <h2 style={{ fontSize: 'var(--text-3xl)', marginBottom: '2.4rem', color: 'var(--color-primario)', textAlign:'center', fontFamily: 'var(--font-titulos)' }}>Sistema de Gestión de <br /> Prácticas Clínicas</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ position: 'relative' }}><label style={{ position: 'absolute', top: '-0.9rem', left: '1.2rem', backgroundColor: 'var(--color-blanco)', padding: '0 0.4rem', fontSize: 'var(--text-sm)', color: 'var(--color-primario)', fontWeight: 500 }}>DNI</label><input ref={dniRef} type="text" maxLength={8} value={dni} onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))} required placeholder="Ingresa tu DNI" className="input-login" /><div style={{ position: 'absolute', right: '1.4rem', top: '50%', transform: 'translateY(-50%)' }}>{checkingDni ? '...' : <SearchIcon />}</div></div>
            <div style={{ position: 'relative' }}><label style={{ position: 'absolute', top: '-0.9rem', left: '1.2rem', backgroundColor: 'var(--color-blanco)', padding: '0 0.4rem', fontSize: 'var(--text-sm)', color: isDniValid ? 'var(--color-primario)' : 'var(--color-secundario)', fontWeight: 500 }}>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="example@mail.com" className="input-login" disabled={!isDniValid} style={{ backgroundColor: !isDniValid ? 'var(--color-fondo)' : 'var(--color-blanco)' }} /><div style={{ position: 'absolute', right: '1.4rem', top: '50%', transform: 'translateY(-50%)', opacity: isDniValid ? 1 : 0.5 }}><MailIcon /></div></div>
            <div style={{ position: 'relative' }}><label style={{ position: 'absolute', top: '-0.9rem', left: '1.2rem', backgroundColor: 'var(--color-blanco)', padding: '0 0.4rem', fontSize: 'var(--text-sm)', color: isDniValid ? 'var(--color-primario)' : 'var(--color-secundario)', fontWeight: 500 }}>Contraseña</label><input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="********" className="input-login" disabled={!isDniValid} style={{ backgroundColor: !isDniValid ? 'var(--color-fondo)' : 'var(--color-blanco)' }} /><button type="button" onClick={() => setShowPassword(!showPassword)} disabled={!isDniValid} style={{ position: 'absolute', right: '1.4rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', opacity: isDniValid ? 1 : 0.5 }}><EyeIcon open={showPassword} /></button></div>
            <div style={{ position: 'relative' }}><label style={{ position: 'absolute', top: '-0.9rem', left: '1.2rem', backgroundColor: 'var(--color-blanco)', padding: '0 0.4rem', fontSize: 'var(--text-sm)', color: isDniValid ? 'var(--color-primario)' : 'var(--color-secundario)', fontWeight: 500 }}>Confirmar contraseña</label><input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="********" className="input-login" disabled={!isDniValid} style={{ backgroundColor: !isDniValid ? 'var(--color-fondo)' : 'var(--color-blanco)' }} /><button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} disabled={!isDniValid} style={{ position: 'absolute', right: '1.4rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', opacity: isDniValid ? 1 : 0.5 }}><EyeIcon open={showConfirmPassword} /></button></div>
            <div style={{ display: 'flex', gap: '1.2rem' }}><button type="button" onClick={handleCancel} style={{ width: '100%', backgroundColor: 'var(--color-blanco)', color: 'var(--color-primario)', border: '1px solid var(--color-primario)', borderRadius: '0.8rem', padding: '1.2rem', fontSize: 'var(--text-base)', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button><button type="submit" disabled={loading || !isDniValid} className="btn-primario" style={{ width: '100%', opacity: !isDniValid ? 0.5 : 1, cursor: !isDniValid ? 'not-allowed' : 'pointer' }}>{loading ? 'Creando...' : 'Crear'}</button></div>
            <p style={{ textAlign: 'center', fontSize: 'var(--text-sm)' }}>¿Ya eres miembro? <Link href="/login" style={{ color: 'var(--color-primario)', fontWeight: 600, textDecoration: 'none' }}>Inicia Sesión</Link></p>
          </form>
        </div>
      </section>
      {toast && (<div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: toast.type === 'success' ? '#22c55e' : '#ef4444', color: 'var(--color-blanco)', padding: '1.6rem 3.2rem', borderRadius: '0.8rem', fontSize: 'var(--text-base)', fontWeight: 600, zIndex: 1000, boxShadow: '0 10px 25px rgba(0,0,0,0.2)', textAlign: 'center' }}>{toast.msg}</div>)}
      <footer style={{ backgroundColor: 'var(--color-primario)', color: 'var(--color-blanco)', textAlign: 'center', padding: '1.6rem', fontSize: 'var(--text-sm)' }}>© 2026 GAQE</footer>
    </main>
  )
}