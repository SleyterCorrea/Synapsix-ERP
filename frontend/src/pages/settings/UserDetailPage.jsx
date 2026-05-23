/**
 * SYNAPSIX ERP — User Detail Page
 * Perfil completo del usuario con tabs: Permisos | Preferencias | Seguridad
 */
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Save, CheckCircle, Camera, Mail,
  ShieldCheck, Settings, Lock, Briefcase
} from 'lucide-react'
import clsx from 'clsx'
import useSettingsStore from '@store/settingsStore'
import PermissionMatrix from '@components/settings/PermissionMatrix'
import { useModules } from '@hooks/useModules'

const PROFILE_TYPES = [
  {
    value: 'admin',
    label: 'Administrador',
    description: 'Acceso completo al sistema. Puede gestionar usuarios y configuración.',
    color: 'border-synapsix-red/30 bg-synapsix-red/10 text-synapsix-red-light',
  },
  {
    value: 'employee',
    label: 'Empleado',
    description: 'Empleado interno. Accede a módulos según los permisos de su rol.',
    color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  },
  {
    value: 'portal',
    label: 'Portal',
    description: 'Usuario externo (cliente, proveedor). Acceso limitado a áreas específicas.',
    color: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  },
]

const TABS = ['Permisos de Acceso', 'Preferencias', 'Seguridad']

// Datos mock del usuario actual (admin)
const MOCK_USER = {
  id: '1',
  first_name: 'Super',
  last_name: 'Admin',
  email: 'admin@synapsix.com',
  profile_type: 'admin',
  role: 'admin',
  is_active: true,
  last_login: new Date().toISOString(),
  job_position: '',
  department: '',
  phone: '',
  language: 'es',
  timezone: 'America/Mexico_City',
}

const DEFAULT_PERMS = {
  inventario: 'admin', facturacion: 'admin',
  restaurante: 'admin', 'tienda-web': 'admin', reportes: 'admin',
}

export default function UserDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { getBackgroundStyle } = useSettingsStore()
  const { modules } = useModules()
  const isNew = id === 'new'

  const [activeTab, setActiveTab] = useState(0)
  const [user, setUser] = useState(isNew ? {
    first_name: '', last_name: '', email: '',
    profile_type: 'employee', role: 'cajero',
    is_active: true, job_position: '', department: '', phone: '',
    language: 'es', timezone: 'America/Mexico_City',
  } : MOCK_USER)
  const [permissions, setPermissions] = useState(DEFAULT_PERMS)
  const [saved, setSaved] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const initials = `${user.first_name?.[0] || '?'}${user.last_name?.[0] || ''}`.toUpperCase()

  const handleSave = () => {
    // TODO: conectar con API
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="min-h-screen relative" style={{ background: getBackgroundStyle() }}>
      <div className="absolute inset-0 noise-bg pointer-events-none" />

      {/* Top bar */}
      <div className="relative border-b border-synapsix-border glass sticky top-0 z-40">
        <div className="flex items-center justify-between gap-3 px-4 h-12">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/settings')}
              className="flex items-center gap-1.5 text-synapsix-muted hover:text-synapsix-text-2 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Ajustes / Usuarios</span>
            </button>
            <div className="w-px h-4 bg-synapsix-border mx-1" />
            <span className="text-synapsix-text font-semibold text-sm">
              {isNew ? 'Nuevo Usuario' : `${user.first_name} ${user.last_name}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!isNew && (
              <span className={clsx(
                'badge border text-[11px]',
                user.is_active ? 'badge-active' : 'badge-inactive'
              )}>
                {user.is_active ? <><CheckCircle className="w-3 h-3" /> Activo</> : 'Inactivo'}
              </span>
            )}
            <button onClick={handleSave} className="btn-primary gap-2 h-8 text-xs">
              <Save className="w-3.5 h-3.5" />
              {saved ? '¡Guardado!' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>

      <div className="relative max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Header del usuario */}
        <div className="bg-synapsix-surface border border-synapsix-border rounded-2xl p-6">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-synapsix-red/15 border-2 border-synapsix-red/30 flex items-center justify-center">
                <span className="text-2xl font-bold text-synapsix-red">{initials}</span>
              </div>
              <button className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-lg bg-synapsix-surface-3 border border-synapsix-border flex items-center justify-center hover:border-synapsix-border-2 transition-colors">
                <Camera className="w-3.5 h-3.5 text-synapsix-muted" />
              </button>
            </div>

            {/* Info */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-synapsix-muted uppercase tracking-wider">Nombre</label>
                <input
                  value={user.first_name}
                  onChange={e => setUser({ ...user, first_name: e.target.value })}
                  className="input-field"
                  placeholder="Nombre"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-synapsix-muted uppercase tracking-wider">Apellido</label>
                <input
                  value={user.last_name}
                  onChange={e => setUser({ ...user, last_name: e.target.value })}
                  className="input-field"
                  placeholder="Apellido"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-medium text-synapsix-muted uppercase tracking-wider flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Email
                </label>
                <input
                  type="email"
                  value={user.email}
                  onChange={e => setUser({ ...user, email: e.target.value })}
                  className="input-field"
                  placeholder="usuario@empresa.com"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-synapsix-surface border border-synapsix-border rounded-2xl overflow-hidden">
          <div className="flex border-b border-synapsix-border">
            {TABS.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                className={clsx(
                  'flex-1 py-3 text-sm font-medium transition-colors border-b-2',
                  activeTab === i
                    ? 'text-synapsix-red border-synapsix-red'
                    : 'text-synapsix-muted border-transparent hover:text-synapsix-text-2'
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Tab 0: Permisos de Acceso */}
            {activeTab === 0 && (
              <div className="space-y-6">
                {/* Tipo de usuario */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-synapsix-muted" />
                    <h3 className="text-sm font-semibold text-synapsix-text-2 uppercase tracking-wider">
                      Tipo de usuario
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {PROFILE_TYPES.map((pt) => (
                      <button
                        key={pt.value}
                        onClick={() => setUser({ ...user, profile_type: pt.value })}
                        className={clsx(
                          'text-left p-3.5 rounded-xl border-2 transition-all duration-150',
                          user.profile_type === pt.value
                            ? pt.color
                            : 'border-synapsix-border bg-synapsix-surface-2 hover:border-synapsix-border-2'
                        )}
                      >
                        <p className="font-semibold text-sm mb-1">{pt.label}</p>
                        <p className={clsx(
                          'text-xs leading-relaxed',
                          user.profile_type === pt.value ? 'opacity-80' : 'text-synapsix-muted'
                        )}>
                          {pt.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rol */}
                {user.profile_type === 'employee' && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-synapsix-muted uppercase tracking-wider flex items-center gap-1">
                      <Briefcase className="w-3 h-3" /> Rol
                    </label>
                    <select
                      value={user.role}
                      onChange={e => setUser({ ...user, role: e.target.value })}
                      className="input-field"
                    >
                      <option value="cajero">Cajero</option>
                      <option value="mozo">Mozo / Mesero</option>
                      <option value="inventarista">Inventarista</option>
                      <option value="viewer">Solo Lectura</option>
                    </select>
                    <p className="text-xs text-synapsix-muted">
                      Los permisos de módulo del rol seleccionado se aplican a este usuario.
                      Puedes personalizarlos en Ajustes → Permisos.
                    </p>
                  </div>
                )}

                {/* Matriz de permisos (solo para admin tipo = employee) */}
                {user.profile_type === 'employee' && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-synapsix-text-2 uppercase tracking-wider">
                      Acceso a módulos
                    </h3>
                    <PermissionMatrix
                      modules={modules}
                      permissions={permissions}
                      onChange={setPermissions}
                    />
                  </div>
                )}

                {user.profile_type === 'admin' && (
                  <div className="bg-synapsix-red/8 border border-synapsix-red/20 rounded-xl px-4 py-3 text-sm text-synapsix-text-2">
                    ⚡ Los administradores tienen acceso completo a todos los módulos del sistema.
                  </div>
                )}
              </div>
            )}

            {/* Tab 1: Preferencias */}
            {activeTab === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-synapsix-muted uppercase tracking-wider">Puesto / Cargo</label>
                    <input value={user.job_position} onChange={e => setUser({ ...user, job_position: e.target.value })}
                      className="input-field" placeholder="Gerente, Cajero, etc." />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-synapsix-muted uppercase tracking-wider">Departamento</label>
                    <input value={user.department} onChange={e => setUser({ ...user, department: e.target.value })}
                      className="input-field" placeholder="Administración, Ventas, etc." />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-synapsix-muted uppercase tracking-wider">Teléfono</label>
                    <input value={user.phone} onChange={e => setUser({ ...user, phone: e.target.value })}
                      className="input-field" placeholder="+52 55 0000 0000" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-synapsix-muted uppercase tracking-wider">Idioma</label>
                    <select value={user.language} onChange={e => setUser({ ...user, language: e.target.value })} className="input-field">
                      <option value="es">Español</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium text-synapsix-muted uppercase tracking-wider">Zona horaria</label>
                    <select value={user.timezone} onChange={e => setUser({ ...user, timezone: e.target.value })} className="input-field">
                      <option value="America/Mexico_City">America/Mexico_City</option>
                      <option value="America/Bogota">America/Bogota</option>
                      <option value="America/Buenos_Aires">America/Buenos_Aires</option>
                      <option value="America/Lima">America/Lima</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Seguridad */}
            {activeTab === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Lock className="w-4 h-4 text-synapsix-muted" />
                  <h3 className="text-sm font-semibold text-synapsix-text-2 uppercase tracking-wider">
                    Cambiar contraseña
                  </h3>
                </div>
                <div className="space-y-3 max-w-sm">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-synapsix-muted uppercase tracking-wider">Nueva contraseña</label>
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                      className="input-field" placeholder="Mínimo 8 caracteres" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-synapsix-muted uppercase tracking-wider">Confirmar contraseña</label>
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                      className="input-field" placeholder="Repite la contraseña" />
                  </div>
                  {newPassword && confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-red-400">Las contraseñas no coinciden.</p>
                  )}
                  <button
                    disabled={!newPassword || newPassword !== confirmPassword}
                    className="btn-primary w-full"
                  >
                    Actualizar contraseña
                  </button>
                </div>
                <div className="border-t border-synapsix-border pt-4 mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-synapsix-text">Estado del usuario</p>
                      <p className="text-xs text-synapsix-muted mt-0.5">Desactivar impide el acceso sin eliminar los datos.</p>
                    </div>
                    <button
                      onClick={() => setUser({ ...user, is_active: !user.is_active })}
                      className={clsx(
                        'px-4 py-2 rounded-xl text-sm font-medium border transition-all',
                        user.is_active
                          ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                          : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                      )}
                    >
                      {user.is_active ? 'Desactivar usuario' : 'Activar usuario'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
