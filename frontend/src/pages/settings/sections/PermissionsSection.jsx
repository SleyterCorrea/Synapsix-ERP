/**
 * SYNAPSIX ERP — PermissionsSection
 * Configuración simplificada por campos: tipo de usuario + rol asignado.
 * La matriz de permisos por módulo se configura en cada módulo individual.
 */
import { useState, useEffect } from 'react'
import {
  ShieldCheck, Users, UserCog, Globe, Crown, Briefcase,
  Info, ChevronRight, Loader2, AlertCircle,
} from 'lucide-react'
import clsx from 'clsx'
import api from '@api/axios'

const PROFILE_TYPES = [
  {
    id: 'admin',
    icon: Crown,
    label: 'Administrador',
    description: 'Acceso completo. Puede gestionar usuarios, módulos y configuración del sistema.',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10 border-yellow-500/30',
  },
  {
    id: 'employee',
    icon: Briefcase,
    label: 'Empleado',
    description: 'Acceso a los módulos asignados según su rol. Sin acceso a configuración general.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/30',
  },
  {
    id: 'portal',
    icon: Globe,
    label: 'Portal / Cliente',
    description: 'Acceso limitado a su panel personal. Sin visibilidad de módulos internos.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/30',
  },
]

export default function PermissionsSection() {
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState({})
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, rolesRes] = await Promise.all([
          api.get('/core/users/'),
          api.get('/core/roles/').catch(() => ({ data: [] })),
        ])
        const userList = Array.isArray(usersRes.data) ? usersRes.data : usersRes.data?.results || []
        setUsers(userList)
        setRoles(Array.isArray(rolesRes.data) ? rolesRes.data : [])
      } catch (err) {
        setError('Error al cargar usuarios.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleRoleChange = async (userId, roleId) => {
    setSaving(s => ({ ...s, [userId]: true }))
    try {
      await api.patch(`/core/users/${userId}/`, { role_id: roleId || null })
      setUsers(prev => prev.map(u => {
        if (u.id !== userId) return u
        const role = roles.find(r => r.id === roleId)
        return { ...u, role: role || null }
      }))
    } catch (err) {
      console.error('Error updating role:', err)
    } finally {
      setSaving(s => ({ ...s, [userId]: false }))
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-synapsix-text">Acceso y Permisos</h1>
        <p className="text-synapsix-muted text-sm mt-1">
          Asigna roles a los usuarios. Los permisos detallados por módulo se configuran en cada módulo.
        </p>
      </div>

      {/* Tipos de perfil (informativo) */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-synapsix-border">
          <ShieldCheck className="w-4 h-4 text-synapsix-muted" />
          <h2 className="text-sm font-semibold text-synapsix-text-2 uppercase tracking-wider">Tipos de perfil</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {PROFILE_TYPES.map(({ id, icon: Icon, label, description, color, bg }) => (
            <div key={id} className={clsx('rounded-xl border p-4 space-y-2', bg)}>
              <div className="flex items-center gap-2">
                <Icon className={clsx('w-4 h-4', color)} />
                <span className="text-sm font-semibold text-synapsix-text">{label}</span>
              </div>
              <p className="text-xs text-synapsix-muted leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Asignación de roles */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-synapsix-border">
          <UserCog className="w-4 h-4 text-synapsix-muted" />
          <h2 className="text-sm font-semibold text-synapsix-text-2 uppercase tracking-wider">Roles por usuario</h2>
        </div>

        {/* Nota informativa */}
        <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/5 border border-blue-500/15 text-xs text-synapsix-muted">
          <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <span>
            Los roles controlan el acceso a cada módulo. Los permisos granulares (crear, editar, eliminar)
            se configurarán en cada módulo a medida que se implementen.
          </span>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-8 text-synapsix-muted text-sm">
            <Loader2 className="w-5 h-5 animate-spin" /> Cargando...
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-2">
            {users.length === 0 && (
              <p className="text-center text-synapsix-muted text-sm py-8">
                No hay usuarios. Ve a Usuarios para crear el primero.
              </p>
            )}
            {users.map(u => {
              const initials = `${u.first_name?.[0] || ''}${u.last_name?.[0] || ''}`.toUpperCase() || '?'
              const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email
              const isSaving = saving[u.id]
              return (
                <div key={u.id} className="flex items-center gap-4 glass rounded-xl px-4 py-3">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-xl bg-synapsix-red/15 border border-synapsix-red/25 flex items-center justify-center flex-shrink-0">
                    <span className="text-synapsix-red text-sm font-bold">{initials}</span>
                  </div>

                  {/* Nombre */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-synapsix-text">{fullName}</p>
                    <p className="text-xs text-synapsix-muted truncate">{u.email}</p>
                  </div>

                  {/* Selector de rol */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isSaving && <Loader2 className="w-3.5 h-3.5 text-synapsix-muted animate-spin" />}
                    {roles.length > 0 ? (
                      <select
                        value={u.role?.id || ''}
                        onChange={e => handleRoleChange(u.id, e.target.value)}
                        disabled={isSaving}
                        className="text-xs bg-synapsix-surface-2 border border-synapsix-border rounded-lg px-2 py-1.5 text-synapsix-text-2 outline-none focus:border-synapsix-border-2 disabled:opacity-50"
                      >
                        <option value="">Sin rol</option>
                        {roles.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-synapsix-muted italic">
                        {u.role?.name || 'Sin rol'}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Próximamente */}
      <div className="rounded-xl border border-dashed border-synapsix-border p-6 text-center space-y-2">
        <ChevronRight className="w-6 h-6 text-synapsix-muted mx-auto" />
        <p className="text-sm font-medium text-synapsix-text-2">Permisos por módulo</p>
        <p className="text-xs text-synapsix-muted">
          Al implementar cada módulo (Restaurante, Inventario, etc.) se configurarán
          los permisos específicos (ver, crear, editar, eliminar) por rol.
        </p>
      </div>
    </div>
  )
}
