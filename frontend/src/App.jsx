/**
 * SYNAPSIX ERP — App.jsx
 * Router principal con rutas protegidas
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from '@pages/LoginPage'
import LaunchpadPage from '@pages/LaunchpadPage'
import ProtectedRoute from '@components/auth/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta pública */}
        <Route path="/login" element={<LoginPage />} />

        {/* Rutas protegidas (requieren autenticación) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/launchpad" element={<LaunchpadPage />} />
          {/* Aquí se irán añadiendo rutas de módulos */}
          {/* <Route path="/inventario/*" element={<InventarioModule />} /> */}
        </Route>

        {/* Redirecciones */}
        <Route path="/" element={<Navigate to="/launchpad" replace />} />
        <Route path="*" element={<Navigate to="/launchpad" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
