import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import LoginPage from '@pages/LoginPage'
import LaunchpadPage from '@pages/LaunchpadPage'
import SettingsPage from '@pages/settings/SettingsPage'
import UserDetailPage from '@pages/settings/UserDetailPage'
import ProfilePage from '@pages/ProfilePage'
import DashboardPage from '@pages/DashboardPage'
import InventoryPage from '@pages/modules/InventoryPage'
import RestaurantePage from '@pages/modules/RestaurantePage'
import CocinaPage from '@pages/modules/CocinaPage'
import CalendarPage from '@pages/modules/CalendarPage'
import TasksPage from '@pages/modules/TasksPage'
import TimesheetPage from '@pages/modules/TimesheetPage'
import AccountingDashboardPage from '@pages/modules/AccountingDashboardPage'
import InvoiceListPage from '@pages/modules/InvoiceListPage'
import InvoiceDetailPage from '@pages/modules/InvoiceDetailPage'
import ProtectedRoute from '@components/auth/ProtectedRoute'
import PublicWebsite from '@pages/web/PublicWebsite'

// Lazy load para que GrapesJS solo se cargue cuando se accede al módulo
const WebBuilderPage = lazy(() => import('@pages/modules/WebBuilderPage'))

const BuilderFallback = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#141414', flexDirection: 'column', gap: 16, fontFamily: 'Inter, sans-serif' }}>
    <div style={{ width: 44, height: 44, border: '3px solid #333', borderTopColor: '#c0392b', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    <span style={{ color: '#666', fontSize: 13 }}>Cargando constructor web…</span>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
)

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Pública */}
        <Route path="/login" element={<LoginPage />} />

        {/* Sitio Web público — reemplaza la raíz cuando el módulo está activo */}
        <Route path="/" element={<PublicWebsite />} />

        {/* Vista previa del builder — carga la página por slug */}
        <Route path="/preview/:slug" element={<PublicWebsite />} />

        {/* Protegidas */}
        <Route element={<ProtectedRoute />}>
          <Route path="/launchpad"   element={<LaunchpadPage />} />
          <Route path="/settings"    element={<SettingsPage />} />
          <Route path="/settings/users/:id" element={<UserDetailPage />} />
          <Route path="/perfil"      element={<ProfilePage />} />
          <Route path="/dashboard"   element={<DashboardPage />} />
          <Route path="/inventario"  element={<InventoryPage />} />
          <Route path="/restaurante"        element={<RestaurantePage />} />
          <Route path="/restaurante/cocina"  element={<CocinaPage />} />

          {/* ── Módulos Core ── */}
          <Route path="/calendario"  element={<CalendarPage />} />
          <Route path="/tareas"      element={<TasksPage />} />
          <Route path="/hoja-horas"  element={<TimesheetPage />} />

          {/* Módulo Sitio Web Builder */}
          <Route
            path="/sitio-web"
            element={
              <Suspense fallback={<BuilderFallback />}>
                <WebBuilderPage />
              </Suspense>
            }
          />

          {/* ── Módulo Facturación / Contabilidad ── */}
          <Route path="/facturacion"                  element={<AccountingDashboardPage />} />
          <Route path="/facturacion/facturas"         element={<InvoiceListPage />} />
          <Route path="/facturacion/facturas/:id"     element={<InvoiceDetailPage />} />
        </Route>

        {/* Redirect catch-all */}
        <Route path="*" element={<Navigate to="/launchpad" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
