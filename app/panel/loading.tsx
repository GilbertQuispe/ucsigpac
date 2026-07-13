export default function Loading() {
  return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'60vh' }}>
      <div className="spinner"></div>
      <style>{`
       .spinner {
          border: 4px solid var(--color-fondo);
          border-top: 4px solid var(--color-primario);
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}