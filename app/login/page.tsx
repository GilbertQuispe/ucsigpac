'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/client';
import Link from 'next/link';

const EyeIcon = ({ open }: { open: boolean }) => open? (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primario)" strokeWidth="1.5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
) : (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primario)" strokeWidth="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
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

  return (
    <main style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: 'var(--color-fondo)'
    }}>
      
      {/* HEADER AZUL */}
       <header style={{ 
        backgroundColor: 'var(--color-primario)', 
        color: 'var(--color-blanco)', 
        padding: '1.6rem'
      }}>
        <div style={{ 
          maxWidth: '120rem',
          margin: '0 auto', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          {/* LOGO + TITULO */}
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
            <Link href="/" style={{ color: 'var(--color-blanco)', fontSize: 'var(--text-sm)', textDecoration: 'none', whiteSpace:'nowrap', textAlign:'right' }}>
            Volver al Portal
            </Link>
        </div>
      </header>

      {/* CARD CENTRADA */}
      <section style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '2rem'
      }}>
        <div className="card-sgpc" style={{ maxWidth: '42rem', width: '100%', padding: '3.2rem' }}>
          
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-texto)', marginBottom: '0.8rem', textAlign:'left' }}>
            Bienvenido de vuelta
          </p>

          <h2 style={{ 
            fontSize: 'var(--text-3xl)', 
            /* fontFamily:'--font-principal', */
            marginBottom: '2.4rem',
            color: 'var(--color-dark-2)',
            textAlign:'center',
            lineHeight: 1.2
          }}>
            Sistema de Gestión de <br /> Prácticas Clínicas
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* USUARIO */}
            <div style={{ position: 'relative', width:'100%'}}>
              <label htmlFor="email" style={{ 
                position: 'absolute', 
                top: '-0.9rem', 
                left: '1.2rem', 
                backgroundColor: 'var(--color-blanco)', 
                padding: '0 0.4rem', 
                fontSize: 'var(--text-sm)', 
                color: 'var(--color-primario)',
                fontWeight: 500
              }}>
                Correo Electrónico
              </label>
              <input 
                id="email"
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                placeholder="example@mail.com"
                className="input-login"
                
              />
              <div style={{ position: 'absolute', right: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-texto)', pointerEvents: 'none' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primario)"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              </div>
            </div>

            {/* CONTRASEÑA */}
            <div style={{ position: 'relative', width:'100%' }}>
              <label htmlFor="password" style={{ 
                position: 'absolute', 
                top: '-0.9rem', 
                left: '1.2rem', 
                backgroundColor: 'var(--color-blanco)', 
                padding: '0 0.4rem', 
                fontSize: 'var(--text-sm)', 
                color: 'var(--color-primario)',
                fontWeight: 500
              }}>
                Contraseña
              </label>
              <input 
                id="password"
                type={showPassword? 'text' : 'password'} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                placeholder="********"
                className="input-login"
                
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                style={{ position: 'absolute', right: '1.2rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primario)', padding:0 }}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>

            <div style={{ textAlign: 'right', marginTop: '-1rem' }}>
              <a href="#" onClick={(e) => { e.preventDefault(); handleForgotPassword(); }} style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primario)', fontWeight: 600, textDecoration: 'none' }}>
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="btn-primario" 
              style={{ width: '100%' }}
            >
              {loading? 'Cargando...' : (isLogin? 'Iniciar sesión' : 'Regístrate')}
            </button>

            <p style={{ textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--color-texto)' }}>
              ¿Aún no eres miembro?
              <Link href="/register" style={{ color: 'var(--color-primario)', fontWeight: 600, marginLeft: '0.4rem', textDecoration: 'none' }}>
                Regístrate
              </Link>
            </p>

          </form>

          {/* TOAST */}
          {toast && (
            <div style={{
              position: 'fixed', bottom: '2rem', right: '2rem',
              backgroundColor: toast.type === 'success' ? 'var(--color-success)' : 'var(--color-error)',
              color: 'var(--color-blanco)', padding: '1.2rem 2rem', borderRadius: '0.8rem'
            }}>
              {toast.msg}
            </div>
          )}

        </div>
      </section>

      {/* FOOTER AZUL */}
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