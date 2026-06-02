/**
 * SYNAPSIX ERP — ProtectedRoute Component
 * Redirige al login si el usuario no está autenticado.
 * Muestra un spinner mientras se verifica el token inicial
 * para evitar la pantalla negra / parpadeo al recargar.
 */
import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading, fetchMe, user } = useAuth()

  // Estado local que indica si ya terminamos de verificar la sesión
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const verify = async () => {
      // Si hay token pero aún no cargamos el user, intentamos fetchMe
      if (isAuthenticated && !user) {
        try { await fetchMe() } catch (_) {}
      }
      setChecking(false)
    }
    verify()
    // Solo se ejecuta una vez al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Mientras verificamos la sesión → spinner (nunca pantalla negra)
  if (checking || isLoading) {
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
          Cargando Synapsix ERP…
        </span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
