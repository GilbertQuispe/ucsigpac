'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/client';
import Link from 'next/link';
import { Toaster, toast } from 'react-hot-toast'

const EyeIcon = ({ open }: { open: boolean }) => open? (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primario)" strokeWidth="1.5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
) : (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primario)" strokeWidth="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
);

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Verificar que el link del correo sea válido
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        toast.error('Link inválido o expirado. Solicita uno nuevo.');
        setTimeout(() => router.push('/login'), 2000);
      }
    });
  }, [router, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 6) {
      toast.error('La contraseña debe tener mínimo 6 caracteres');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    
    if (error) toast.error(error.message);
    else {
      toast.success('Contraseña actualizada correctamente');
      setTimeout(() => router.push('/login'), 1500);
    }
    setLoading(false);
  };

  return (
    <main style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: 'var(--color-fondo)'
    }}>
      
      <Toaster 
        position="top-right" 
        toastOptions={{
          duration: 3000,
          style: {
            background: '#fff',
            color: '#1e293b',
            border: '1px solid #e2e8f0',
            borderRadius: '0.8rem',
            fontSize: '1.4rem',
            fontWeight: 600,
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } }
        }}
      />

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
            Restablecer Contraseña
          </p>

          <h2 style={{ fontSize: 'var(--text-3xl)', marginBottom: '2.4rem', color: 'var(--color-primario)', textAlign:'center', fontFamily: 'var(--font-titulos)' }}>
            Sistema de Gestión de <br /> Prácticas Clínicas
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* NUEVA CONTRASEÑA */}
            <div style={{ position: 'relative', width:'100%'}}>
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
                Nueva Contraseña
              </label>
              <input 
                id="password"
                type={showPassword? 'text' : 'password'} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                minLength={6}
                placeholder="Mínimo 6 caracteres"
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

            {/* CONFIRMAR CONTRASEÑA */}
            <div style={{ position: 'relative', width:'100%' }}>
              <label htmlFor="confirmPassword" style={{ 
                position: 'absolute', 
                top: '-0.9rem', 
                left: '1.2rem', 
                backgroundColor: 'var(--color-blanco)', 
                padding: '0 0.4rem', 
                fontSize: 'var(--text-sm)', 
                color: 'var(--color-primario)',
                fontWeight: 500
              }}>
                Confirmar Contraseña
              </label>
              <input 
                id="confirmPassword"
                type={showPassword? 'text' : 'password'} 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                required 
                minLength={6}
                placeholder="Repite la contraseña"
                className="input-login"
              />
            </div>

           <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)} 
              style={{ position: 'absolute', right: '1.2rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primario)', padding:0 }}
            >
              <EyeIcon open={showPassword} />
              {loading? 'Guardando...' : 'Guardar Contraseña'}
            </button>

            <p style={{ textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--color-texto)' }}>
              ¿Recordaste tu contraseña?
              <Link href="/login" style={{ color: 'var(--color-primario)', fontWeight: 600, marginLeft: '0.4rem', textDecoration: 'none' }}>
                Iniciar sesión
              </Link>
            </p>

          </form>

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