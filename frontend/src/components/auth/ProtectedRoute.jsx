/**
 * SYNAPSIX ERP — ProtectedRoute Component
 * Redirige al login si el usuario no está autenticado
 */
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'

const ProtectedRoute = () => {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
