/**
 * SYNAPSIX ERP — UsersSection v3
 * Lista de usuarios con búsqueda, filtros, crear con ROL incluido.
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, Search, UserPlus, RefreshCw, X, Eye, EyeOff,
  CheckCircle, XCircle, AlertCircle, Loader2, ChevronRight,
  Mail, User, Lock, ShieldCheck, Filter,
} from 'lucide-react'
import clsx from 'clsx'
import api from '@api/axios'

const ROLE_LABELS = {
  admin:        'Administrador',
  cajero:       'Cajero',
  mozo:         'Mozo / Mesero',
  inventarista: 'Inventarista',
  viewer:       'Solo Lectura',
}

const ROLE_OPTIONS = [
  { value: '',             label: 'Sin rol' },
  { value: 'admin',        label: 'Administrador' },
  { value: 'cajero',       label: 'Cajero' },
  { value: 'mozo',         label: 'Mozo / Mesero' },
  { value: 'inventarista', label: 'Inventarista' },
  { value: 'viewer',       label: 'Solo Lectura' },
]

// ─── Modal Crear Usuario ──────────────────────────────────────────────────────
function CreateUserModal({ onClose, onCreated, roles }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '',
    password: '', password_confirm: '',
    role_id: '', is_active: true,
  })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors]   = useState({})

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => ({ ...e, [k]: undefined }))
  }

  const validate = () => {
    const e = {}
    if (!form.first_name.trim()) e.first_name = 'Requerido'
    if (!form.email.trim())      e.email      = 'Requerido'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email inválido'
    if (!form.password)               e.password = 'Requerido'
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
        first_name:       form.first_name.trim(),
        last_name:        form.last_name.trim(),
        email:            form.email.trim().toLowerCase(),
        password:         form.password,
        password_confirm: form.password_confirm,
        is_active:        form.is_active,
        role_id:          form.role_id || null,
      }
      const res = await api.post('/core/users/', payload)
      onCreated(res.data)
      onClose()
    } catch (err) {
      const d = err.response?.data || {}
      if (typeof d === 'object') setErrors(d)
      else setErrors({ general: 'Error al crear el usuario.' })
    } finally { setLoading(false) }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg mx-4">
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
            <button type="button" onClick={onClose} className="text-synapsix-muted hover:text-synapsix-text-2 p-1 rounded-lg hover:bg-synapsix-surface-2 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            {errors.general && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {errors.general}
              </div>
            )}

            {/* Nombre */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium">Nombre *</label>
                <input value={form.first_name} onChange={e => set('first_name', e.target.value)}
                  className={clsx('input-field text-sm', errors.first_name && 'border-red-500/50')}
                  placeholder="Juan" autoFocus />
                {errors.first_name && <p className="text-xs text-red-400">{errors.first_name}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium">Apellido</label>
                <input value={form.last_name} onChange={e => set('last_name', e.target.value)}
                  className="input-field text-sm" placeholder="García" />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium flex items-center gap-1">
                <Mail className="w-3 h-3" /> Correo electrónico *
              </label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                className={clsx('input-field text-sm', errors.email && 'border-red-500/50')}
                placeholder="usuario@empresa.com" />
              {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
            </div>

            {/* Rol */}
            <div className="space-y-1.5">
              <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Rol de acceso
              </label>
              <select value={form.role_id} onChange={e => set('role_id', e.target.value)}
                className="input-field text-sm cursor-pointer">
                <option value="">Sin rol asignado</option>
                {(roles || []).map(r => (
                  <option key={r.id} value={r.id}>
                    {ROLE_LABELS[r.name] || r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Contraseñas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Contraseña *
                </label>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} value={form.password}
                    onChange={e => set('password', e.target.value)}
                    className={clsx('input-field text-sm pr-8', errors.password && 'border-red-500/50')}
                    placeholder="Mín. 8 caracteres" />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-synapsix-muted hover:text-synapsix-text-2">
                    {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium">Confirmar *</label>
                <input type={showPwd ? 'text' : 'password'} value={form.password_confirm}
                  onChange={e => set('password_confirm', e.target.value)}
                  className={clsx('input-field text-sm', errors.password_confirm && 'border-red-500/50')}
                  placeholder="Repetir contraseña" />
                {errors.password_confirm && <p className="text-xs text-red-400">{errors.password_confirm}</p>}
              </div>
            </div>

            {/* Estado */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-synapsix-surface-2 border border-synapsix-border">
              <div>
                <p className="text-xs font-medium text-synapsix-text-2">Cuenta activa</p>
                <p className="text-[10px] text-synapsix-muted">El usuario podrá iniciar sesión inmediatamente</p>
              </div>
              <button type="button" onClick={() => set('is_active', !form.is_active)}
                className={clsx('relative rounded-full transition-colors flex-shrink-0', form.is_active ? 'bg-emerald-500' : 'bg-synapsix-surface-3')}
                style={{ width: 40, height: 22 }}>
                <span className="absolute top-0.5 rounded-full bg-white shadow transition-all"
                  style={{ width: 17, height: 17, left: form.is_active ? 20 : 3 }} />
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

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function UsersSection() {
  const navigate     = useNavigate()
  const [users, setUsers]       = useState([])
  const [roles, setRoles]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [query, setQuery]       = useState('')
  const [filterActive, setFilterActive] = useState('all') // all | active | inactive
  const [showCreate, setShowCreate] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [uRes, rRes] = await Promise.all([
        api.get('/core/users/'),
        api.get('/core/roles/'),
      ])
      const list = Array.isArray(uRes.data) ? uRes.data : (uRes.data.results || [])
      setUsers(list)
      setRoles(Array.isArray(rRes.data) ? rRes.data : [])
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al cargar usuarios.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const filtered = users.filter(u => {
    const q  = query.toLowerCase()
    const ok = !q || [u.first_name, u.last_name, u.email, u.role?.name]
      .filter(Boolean).some(v => v.toLowerCase().includes(q))
    const activeOk = filterActive === 'all'
      || (filterActive === 'active' && u.is_active)
      || (filterActive === 'inactive' && !u.is_active)
    return ok && activeOk
  })

  const activeCount   = users.filter(u => u.is_active).length
  const inactiveCount = users.length - activeCount

  const handleToggle = async (userId, cur) => {
    try {
      await api.patch(`/core/users/${userId}/`, { is_active: !cur })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !cur } : u))
    } catch {}
  }

  const initials = u => `${u.first_name?.[0] || ''}${u.last_name?.[0] || ''}`.toUpperCase() || u.email?.[0]?.toUpperCase() || '?'

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-black text-synapsix-text">Usuarios</h2>
          <p className="text-sm text-synapsix-muted mt-0.5">Gestiona los usuarios de tu empresa</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary gap-2">
          <UserPlus className="w-4 h-4" /> Nuevo usuario
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total', value: users.length, icon: Users, color: 'text-synapsix-muted', filter: 'all' },
          { label: 'Activos', value: activeCount, icon: CheckCircle, color: 'text-emerald-400', filter: 'active' },
          { label: 'Inactivos', value: inactiveCount, icon: XCircle, color: 'text-red-400', filter: 'inactive' },
        ].map(({ label, value, icon: Icon, color, filter }) => (
          <button key={label} onClick={() => setFilterActive(f => f === filter ? 'all' : filter)}
            className={clsx(
              'glass rounded-xl p-4 flex items-center gap-3 text-left transition-all border',
              filterActive === filter ? 'border-synapsix-border-2' : 'border-synapsix-border hover:border-synapsix-border-2'
            )}>
            <Icon className={clsx('w-5 h-5 flex-shrink-0', color)} />
            <div>
              <p className="text-lg font-bold text-synapsix-text leading-none">{loading ? '—' : value}</p>
              <p className="text-xs text-synapsix-muted mt-0.5">{label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-synapsix-muted" />
        <input type="text" value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Buscar por nombre, email o rol..."
          className="input-field pl-10 w-full" />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-synapsix-muted hover:text-synapsix-text-2">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Lista */}
      {loading && (
        <div className="flex flex-col items-center py-12 gap-2">
          <Loader2 className="w-8 h-8 text-synapsix-muted animate-spin" />
          <p className="text-synapsix-muted text-sm">Cargando usuarios...</p>
        </div>
      )}
      {error && (
        <div className="flex flex-col items-center py-8 gap-3">
          <AlertCircle className="w-8 h-8 text-red-400/60" />
          <p className="text-synapsix-muted text-sm">{error}</p>
          <button onClick={fetchAll} className="btn-secondary gap-2 text-sm"><RefreshCw className="w-3.5 h-3.5" /> Reintentar</button>
        </div>
      )}
      {!loading && !error && (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-synapsix-muted text-sm">
              {query ? 'Sin resultados.' : 'No hay usuarios. ¡Crea el primero!'}
            </div>
          ) : filtered.map(u => {
            const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email
            const roleLabel = u.role ? (ROLE_LABELS[u.role.name] || u.role.name) : null
            return (
              <div key={u.id}
                className="flex items-center gap-3 glass rounded-xl px-4 py-3 group hover:bg-synapsix-surface-2 transition-colors cursor-pointer"
                onClick={() => navigate(`/settings/users/${u.id}`)}>
                {/* Avatar */}
                <div className="w-9 h-9 rounded-xl bg-synapsix-red/15 border border-synapsix-red/25 flex items-center justify-center flex-shrink-0">
                  <span className="text-synapsix-red text-sm font-bold">{initials(u)}</span>
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-synapsix-text">{name}</p>
                    <span className={clsx(
                      'text-[10px] px-1.5 py-0.5 rounded-full border',
                      u.is_active
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                    )}>
                      {u.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                    {roleLabel && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-synapsix-border bg-synapsix-surface-2 text-synapsix-muted-2">
                        {roleLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-synapsix-muted truncate">{u.email}</p>
                </div>
                {/* Acciones */}
                <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => handleToggle(u.id, u.is_active)}
                    className={clsx(
                      'text-xs px-2.5 py-1 rounded-lg border transition-colors',
                      u.is_active
                        ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                        : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                    )}
                  >
                    {u.is_active ? 'Desactivar' : 'Activar'}
                  </button>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-synapsix-muted group-hover:text-synapsix-text-2 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showCreate && (
        <CreateUserModal
          roles={roles}
          onClose={() => setShowCreate(false)}
          onCreated={u => { setUsers(prev => [u, ...prev]); setShowCreate(false) }}
        />
      )}
    </div>
  )
}
