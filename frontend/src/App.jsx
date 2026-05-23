import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
import ProtectedRoute from '@components/auth/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Pública */}
        <Route path="/login" element={<LoginPage />} />

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
        </Route>

        {/* Redirects */}
        <Route path="/" element={<Navigate to="/launchpad" replace />} />
        <Route path="*" element={<Navigate to="/launchpad" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
