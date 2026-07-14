'use client'
import { useEffect, useState } from 'react'

export default function Header() {
  const [time, setTime] = useState('')

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleString('es-PE'))
    update()
    const i = setInterval(update, 1000)
    return () => clearInterval(i)
  }, [])

  return (
    <header className="header-responsive">
      <div>
        <h1>Sistema de Gestión de Prácticas Clínicas</h1>
        <p>{time}</p>
      </div>
    </header>
  )
}