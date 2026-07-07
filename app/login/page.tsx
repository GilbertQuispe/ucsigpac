'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/client';
/* import Link from 'next/link'; */

const EyeIcon = ({ open }: { open: boolean }) => open? (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
) : (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
);
const LogoIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="fill-[var(--color-blue-1)]"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
);

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const showToast = (msg: string, type: 'error' | 'success' = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = isLogin
    ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/dashboard` } });

    if (error) showToast(error.message, 'error');
    else {
      if (isLogin) {
        showToast('¡Login exitoso!', 'success');
        router.push('/dashboard');
      } else {
        showToast('Revisa tu correo para confirmar tu cuenta', 'success');
      }
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email) return showToast('Ingresa tu correo primero');
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}` });
    if (error) showToast(error.message);
    else showToast('Revisa tu correo para restablecer', 'success');
  };

  const handleCancel = () => {
    setEmail('');
    setPassword('');
    showToast('Formulario limpiado', 'success');
  };

  return (

/* export default function LoginPage() {
  return ( */
    <main style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: 'var(--color-fondo)'
    }}>
      
      {/* HEADER */}
      <header style={{ 
        backgroundColor: 'var(--color-primario)', 
        color: 'var(--color-blanco)', 
        padding: '1.6rem'
      }}>
        <div className="container-sgpc" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
            <div 
              style={{ 
                width: '3.2rem', 
                height: '3.2rem',
                backgroundImage: 'var(--logo-header-url)',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat'
              }} 
            />
            <h1 style={{ fontSize: 'var(--text-2xl)', margin: 0 }}>SIGPAC</h1>
          </div>
          <Link href="/" style={{ color: 'var(--color-blanco)', fontSize: 'var(--text-sm)', textDecoration: 'none' }}>
            Volver al Portal
          </Link>
        </div>
      </header>

      {/* CONTENIDO CENTRADO */}
      <section style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '2rem' /* 20px para que no pegue en cel */
      }}>
        <div className="card-sgpc">
          
          <h2 style={{ 
            fontSize: 'var(--text-3xl)', 
            textAlign: 'center', 
            marginBottom: '2.4rem',
            color: 'var(--color-primario)'
          }}>
            Iniciar Sesión
          </h2>

          {/* <form style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            <div>
              <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '0.8rem', display: 'block' }}>
                Correo Institucional
              </label>
              <input 
                type="email" 
                placeholder="usuario@ucsm.edu.pe" 
                className="input-sgpc"
                required 
              />
            </div>

            <div style={{ width: '100%', marginTop: '1.2rem' }}>
              <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '0.8rem', display: 'block' }}>
                Contraseña
              </label>
              <input 
                type="password" 
                placeholder="********" 
                className="input-sgpc"
                required 
              />
            </div>

            <button type="submit" className="btn-primario" style={{ width: '100%', marginTop: '1.2rem' }}>
              Ingresar
            </button>

          </form> */}

          <form onSubmit={handleSubmit} className="w-full max-w-sm mx-auto">
            <h2 className="text-sm text-gray-600">Bienvenido de vuelta</h2>
            <h1 className="text-3xl font-bold mt-2 mb-8 text-[var(--color-dark-1)]">
              {isLogin? 'Sistema de Gestión de Prácticas Clínicas' : 'Crear cuenta en SIGPAC'}
            </h1>

            <div className="relative mb-5">
              <label htmlFor="email" className="absolute -top-2.5 left-3 bg-[var(--color-white)] px-1 text-xs text-[var(--color-blue-1)]">Usuario</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="example@mail.com"
                className="w-full p-3.5 pr-10 border-gray-300 rounded-lg focus:border-[var(--color-blue-2)] outline-none transition"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 4h16c1.1 0 2.9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              </div>
            </div>

            <div className="relative mb-6">
              <label htmlFor="password" className="absolute -top-2.5 left-3 bg-[var(--color-white)] px-1 text-xs text-[var(--color-blue-1)]">Contraseña</label>
              <input id="password" type={showPassword? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="********"
                className="w-full p-3.5 pr-10 border-gray-300 rounded-lg focus:border-[var(--color-blue-2)] outline-none transition"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[var(--color-blue-1)]">
                <EyeIcon open={showPassword} />
              </button>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-[var(--color-blue-1)] hover:bg-[var(--color-dark-2)] disabled:bg-gray-400 text-white font-semibold py-3.5 rounded-lg transition">
              {loading? 'Cargando...' : (isLogin? 'Iniciar sesión' : 'Regístrate')}
            </button>
            <button type="button" onClick={handleCancel} className="w-full bg-gray-200 hover:bg-gray-300 text-[var(--color-dark-1)] font-semibold py-3.5 rounded-lg transition mt-2">
              Cancelar
            </button>

            <div className="flex justify-between mt-4 text-sm">
              <span>
                {isLogin? '¿No eres usuario?' : '¿Ya tienes cuenta?'}
                <a href="#" onClick={(e) => { e.preventDefault(); setIsLogin(!isLogin); }} className="text-[var(--color-blue-1)] font-semibold ml-1 hover:underline">
                  {isLogin? 'Regístrate' : 'Iniciar sesión'}
                </a>
              </span>
              <a href="#" onClick={(e) => { e.preventDefault(); handleForgotPassword(); }} className="text-[var(--color-blue-1)] font-semibold hover:underline">
                ¿Olvidaste tu contraseña?
              </a>
            </div>
          </form>

          <p style={{ 
            textAlign: 'center', 
            fontSize: 'var(--text-sm)', 
            marginTop: '2.4rem',
            color: 'var(--color-texto)'
          }}>
            ¿Problemas para ingresar? Contacte a Soporte UCS
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ 
        backgroundColor: 'var(--color-primario)', 
        color: 'var(--color-blanco)', 
        textAlign: 'center', 
        padding: '1.6rem',
        fontSize: 'var(--text-sm)'
      }}>
        © 2026 GAQE
      </footer>
    </main>
  )
}