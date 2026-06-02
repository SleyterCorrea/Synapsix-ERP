/**
 * SYNAPSIX ERP — ProtectedRoute Component
 * Guarda de autenticación robusta. Nunca produce pantalla negra.
 * - Si isAuthenticated=true → renderiza directamente sin esperar fetchMe
 * - Solo muestra spinner si isLoading está activo globalmente
 * - Timeout máximo de 3 segundos para evitar bloqueos infinitos
 */
import { useEffect, useRef, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth()

  // Timeout de seguridad: si isLoading no se resuelve en 3s, pasamos igual
  const [timedOut, setTimedOut] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (isLoading) {
      timerRef.current = setTimeout(() => setTimedOut(true), 3000)
    } else {
      clearTimeout(timerRef.current)
      setTimedOut(false)
    }
    return () => clearTimeout(timerRef.current)
  }, [isLoading])

  // Si hay token → renderiza SIEMPRE (Launchpad nunca debe bloquearse)
  // El fetchMe se maneja en paralelo en otros componentes
  if (isAuthenticated) {
    return <Outlet />
  }

  // Cargando auth (máximo 3s de espera)
  if (isLoading && !timedOut) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0d0d10',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{
          width: 44, height: 44,
          border: '3px solid rgba(255,255,255,.08)',
          borderTopColor: '#e11d48',
          borderRadius: '50%',
          animation: 'spin .7s linear infinite',
        }} />
        <span style={{ color: '#475569', fontSize: 13, letterSpacing: '.01em' }}>
          Verificando sesión…
        </span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // Sin sesión → login
  return <Navigate to="/login" replace />
}

export default ProtectedRoute
