import Link from 'next/link'

export default function PortalPage() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* HEADER */}
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
          
          <p style={{ fontSize: 'var(--text-sm)', margin: 0 }}>Sistema de Gestión de Prácticas Clínicas</p>
        </div>
      </header>

      {/* HERO */}
      <section style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        textAlign: 'center', 
        padding: '4rem 2rem'
      }}>
        <div 
          style={{ 
            width: '12rem', 
            height: '12rem',
            backgroundImage: 'var(--logo-ucs-url)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            marginBottom: '2.4rem'
          }} 
        />
        
        <h2 style={{ fontSize: 'var(--text-4xl)', marginBottom: '1.6rem' }}>Bienvenido al SIGPAC</h2>
        
        <p style={{ 
          fontSize: 'var(--text-lg)',
          maxWidth: '60rem',
          marginBottom: '3.2rem',
          lineHeight: 1.6 
        }}>
          Plataforma oficial de GAQE para la gestión de prácticas clínicas para la Escuela de Medicina Humana - Universidad Continental - Huancayo.
        </p>
        
        <Link href="/login">
          <button className="btn-primario" style={{ fontSize: 'var(--text-lg)' }}>
            Ingresar al Sistema
          </button>
        </Link>
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