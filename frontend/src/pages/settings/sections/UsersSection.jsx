/**
 * SYNAPSIX ERP — UsersSection
 * Gestión de usuarios con API real: lista, búsqueda, crear, activar/desactivar.
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, Search, UserPlus, RefreshCw, X, Eye, EyeOff,
  CheckCircle, XCircle, AlertCircle, Loader2, ChevronRight,
  Mail, User, Lock, ShieldCheck,
} from 'lucide-react'
import clsx from 'clsx'
import api from '@api/axios'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const STATUS_BADGE = {
  true:  { label: 'Activo',      cls: 'badge-active' },
  false: { label: 'Inactivo',    cls: 'badge-inactive' },
}

const ROLES_DISPLAY = [
  { value: '', label: 'Sin rol asignado' },
  { value: 'admin', label: 'Administrador' },
  { value: 'employee', label: 'Empleado' },
  { value: 'portal', label: 'Portal / Cliente' },
]

// ─── Modal de Creación de Usuario ────────────────────────────────────────────
function CreateUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '',
    password: '', password_confirm: '', is_active: true,
  })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }))
    setErrors(e => ({ ...e, [key]: undefined }))
  }

  const validate = () => {
    const e = {}
    if (!form.first_name.trim()) e.first_name = 'Requerido'
    if (!form.email.trim()) e.email = 'Requerido'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email inválido'
    if (!form.password) e.password = 'Mínimo 8 caracteres'
    else if (form.password.length < 8) e.password = 'Mínimo 8 caracteres'
    if (form.password !== form.password_confirm) e.password_confirm = 'No coinciden'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    try {
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        password_confirm: form.password_confirm,
        is_active: form.is_active,
      }
      const res = await api.post('/core/users/', payload)
      onCreated(res.data)
      onClose()
    } catch (err) {
      const apiErrors = err.response?.data || {}
      if (typeof apiErrors === 'object') {
        setErrors(apiErrors)
      } else {
        setErrors({ general: 'Error al crear el usuario. Intenta de nuevo.' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4">
        <form
          onSubmit={handleSubmit}
          className="bg-synapsix-surface border border-synapsix-border rounded-2xl shadow-spotlight overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-synapsix-border">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-synapsix-muted" />
              <h2 className="text-sm font-bold text-synapsix-text">Nuevo Usuario</h2>
            </div>
            <button type="button" onClick={onClose} className="text-synapsix-muted hover:text-synapsix-text-2 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {errors.general && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {errors.general}
              </div>
            )}

            {/* Nombre y Apellido */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium flex items-center gap-1">
                  <User className="w-3 h-3" /> Nombre *
                </label>
                <input
                  value={form.first_name}
                  onChange={e => set('first_name', e.target.value)}
                  className={clsx('input-field text-sm', errors.first_name && 'border-red-500/50')}
                  placeholder="Juan"
                  autoFocus
                />
                {errors.first_name && <p className="text-xs text-red-400">{errors.first_name}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium">Apellido</label>
                <input
                  value={form.last_name}
                  onChange={e => set('last_name', e.target.value)}
                  className="input-field text-sm"
                  placeholder="García"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium flex items-center gap-1">
                <Mail className="w-3 h-3" /> Correo electrónico *
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                className={clsx('input-field text-sm', errors.email && 'border-red-500/50')}
                placeholder="usuario@empresa.com"
              />
              {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
            </div>

            {/* Contraseña */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Contraseña *
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => set('password', e.target.value)}
                    className={clsx('input-field text-sm pr-8', errors.password && 'border-red-500/50')}
                    placeholder="Mín. 8 caracteres"
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-synapsix-muted hover:text-synapsix-text-2">
                    {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium">Confirmar *</label>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={form.password_confirm}
                  onChange={e => set('password_confirm', e.target.value)}
                  className={clsx('input-field text-sm', errors.password_confirm && 'border-red-500/50')}
                  placeholder="Repetir contraseña"
                />
                {errors.password_confirm && <p className="text-xs text-red-400">{errors.password_confirm}</p>}
              </div>
            </div>

            {/* Estado activo */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-synapsix-surface-2 border border-synapsix-border">
              <ShieldCheck className="w-4 h-4 text-synapsix-muted flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-medium text-synapsix-text-2">Cuenta activa</p>
                <p className="text-[10px] text-synapsix-muted">El usuario podrá iniciar sesión de inmediato</p>
              </div>
              <button
                type="button"
                onClick={() => set('is_active', !form.is_active)}
                className={clsx(
                  'relative w-10 h-5.5 rounded-full transition-colors flex-shrink-0',
                  form.is_active ? 'bg-emerald-500' : 'bg-synapsix-surface-3'
                )}
                style={{ height: '22px', width: '40px' }}
              >
                <span className={clsx(
                  'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all',
                  form.is_active ? 'left-5' : 'left-0.5'
                )} />
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-synapsix-border flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary text-sm gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {loading ? 'Creando...' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

// ─── MAIN: UsersSection ───────────────────────────────────────────────────────
export default function UsersSection() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/core/users/')
      // El endpoint puede devolver array o { results: [...] }
      const list = Array.isArray(res.data) ? res.data : res.data.results || []
      setUsers(list)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al cargar usuarios.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const filtered = users.filter(u => {
    const q = query.toLowerCase()
    return !q
      || u.first_name?.toLowerCase().includes(q)
      || u.last_name?.toLowerCase().includes(q)
      || u.email?.toLowerCase().includes(q)
  })

  const activeCount = users.filter(u => u.is_active).length

  const handleToggleActive = async (userId, currentStatus) => {
    try {
      await api.patch(`/core/users/${userId}/`, { is_active: !currentStatus })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u))
    } catch (err) {
      console.error('Error updating user:', err)
    }
  }

  const handleCreated = (newUser) => {
    setUsers(prev => [newUser, ...prev])
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-synapsix-text">Usuarios</h1>
          <p className="text-synapsix-muted text-sm mt-1">
            Gestiona los usuarios de tu empresa. Crea, activa o desactiva cuentas.
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary gap-2">
          <UserPlus className="w-4 h-4" /> Nuevo usuario
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total usuarios', value: users.length, icon: Users, color: 'text-synapsix-muted' },
          { label: 'Activos', value: activeCount, icon: CheckCircle, color: 'text-emerald-400' },
          { label: 'Inactivos', value: users.length - activeCount, icon: XCircle, color: 'text-red-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass rounded-xl p-4 flex items-center gap-3">
            <Icon className={clsx('w-5 h-5 flex-shrink-0', color)} />
            <div>
              <p className="text-lg font-bold text-synapsix-text leading-none">{loading ? '—' : value}</p>
              <p className="text-xs text-synapsix-muted mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-synapsix-muted" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar por nombre o correo..."
          className="input-field pl-10 w-full"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-synapsix-muted hover:text-synapsix-text-2">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tabla */}
      {loading && (
        <div className="flex flex-col items-center gap-2 py-12">
          <Loader2 className="w-8 h-8 text-synapsix-muted animate-spin" />
          <p className="text-synapsix-muted text-sm">Cargando usuarios...</p>
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <AlertCircle className="w-8 h-8 text-red-400/60" />
          <p className="text-synapsix-muted text-sm">{error}</p>
          <button onClick={fetchUsers} className="btn-secondary gap-2 text-sm">
            <RefreshCw className="w-3.5 h-3.5" /> Reintentar
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-synapsix-muted text-sm">
              {query ? 'Sin resultados para tu búsqueda.' : 'No hay usuarios. ¡Crea el primero!'}
            </div>
          ) : filtered.map((u) => {
            const initials = `${u.first_name?.[0] || ''}${u.last_name?.[0] || ''}`.toUpperCase() || u.email?.[0]?.toUpperCase() || '?'
            const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email
            const status = STATUS_BADGE[String(u.is_active)] || STATUS_BADGE.false
            return (
              <div key={u.id} className="flex items-center gap-4 glass rounded-xl px-4 py-3 group hover:bg-synapsix-surface-2 transition-colors">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-xl bg-synapsix-red/15 border border-synapsix-red/25 flex items-center justify-center flex-shrink-0">
                  <span className="text-synapsix-red text-sm font-bold">{initials}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-synapsix-text">{fullName}</p>
                    <span className={clsx('text-[10px] px-1.5 py-0.5 rounded-full border', status.cls)}>
                      {status.label}
                    </span>
                  </div>
                  <p className="text-xs text-synapsix-muted truncate">{u.email}</p>
                  {u.role && (
                    <p className="text-[10px] text-synapsix-muted-2 mt-0.5">{u.role.name}</p>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleToggleActive(u.id, u.is_active)}
                    title={u.is_active ? 'Desactivar' : 'Activar'}
                    className={clsx(
                      'text-xs px-2.5 py-1 rounded-lg border transition-colors',
                      u.is_active
                        ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                        : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                    )}
                  >
                    {u.is_active ? 'Desactivar' : 'Activar'}
                  </button>
                  <button
                    onClick={() => navigate(`/settings/users/${u.id}`)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-synapsix-muted hover:text-synapsix-text-2 hover:bg-synapsix-surface-3 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal crear */}
      {showCreate && (
        <CreateUserModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}
    </div>
  )
}
