/**
 * SYNAPSIX ERP — UserDetailPage v2
 * Formulario completo de usuario: datos personales, rol, password, estado.
 * Carga datos reales del backend y guarda con PATCH.
 */
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Save, Loader2, AlertCircle, CheckCircle,
  User, Mail, Lock, ShieldCheck, Trash2, Eye, EyeOff,
  RefreshCw, Calendar, Clock,
} from 'lucide-react'
import clsx from 'clsx'
import api from '@api/axios'
import useSettingsStore from '@store/settingsStore'

const ROLE_OPTS = [
  { value: '', label: 'Sin rol' },
  { value: 'admin',        label: 'Administrador' },
  { value: 'cajero',       label: 'Cajero' },
  { value: 'mozo',         label: 'Mozo / Mesero' },
  { value: 'inventarista', label: 'Inventarista' },
  { value: 'viewer',       label: 'Solo Lectura' },
]

function Field({ label, required, error, children, hint }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[10px] text-synapsix-muted-2">{hint}</p>}
      {error && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
    </div>
  )
}

function Toggle({ label, desc, checked, onChange }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-synapsix-surface-2 border border-synapsix-border">
      <div>
        <p className="text-sm font-medium text-synapsix-text-2">{label}</p>
        {desc && <p className="text-[10px] text-synapsix-muted">{desc}</p>}
      </div>
      <button type="button" onClick={() => onChange(!checked)}
        className={clsx('relative rounded-full transition-colors flex-shrink-0', checked ? 'bg-emerald-500' : 'bg-synapsix-surface-3')}
        style={{ width: 40, height: 22 }}>
        <span className={clsx('absolute top-0.5 rounded-full bg-white shadow transition-all')}
          style={{ width: 17, height: 17, left: checked ? 20 : 3 }} />
      </button>
    </div>
  )
}

export default function UserDetailPage() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const { getBackgroundStyle } = useSettingsStore()

  const [user, setUser]     = useState(null)
  const [roles, setRoles]   = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [errors, setErrors]   = useState({})
  const [toast, setToast]     = useState(null)
  const [showPwd, setShowPwd] = useState(false)

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '',
    role_id: '', is_active: true, is_staff: false,
    password: '', password_confirm: '',
  })

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 4000) }
  const setF = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })) }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [userRes, rolesRes] = await Promise.all([
        api.get(`/core/users/${id}/`),
        api.get('/core/roles/'),
      ])
      const u = userRes.data
      setUser(u)
      setForm({
        first_name:       u.first_name || '',
        last_name:        u.last_name  || '',
        email:            u.email      || '',
        role_id:          u.role?.id   || '',
        is_active:        u.is_active,
        is_staff:         u.is_staff   || false,
        password:         '',
        password_confirm: '',
      })
      setRoles(Array.isArray(rolesRes.data) ? rolesRes.data : [])
    } catch (e) {
      showToast('error', e.response?.data?.detail || 'Error al cargar el usuario.')
    } finally { setLoading(false) }
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  const validate = () => {
    const e = {}
    if (!form.first_name.trim()) e.first_name = 'Requerido'
    if (!form.email.trim())      e.email      = 'Requerido'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email inválido'
    if (form.password) {
      if (form.password.length < 8) e.password = 'Mínimo 8 caracteres'
      if (form.password !== form.password_confirm) e.password_confirm = 'No coinciden'
    }
    return e
  }

  const handleSave = async () => {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      const payload = {
        first_name: form.first_name.trim(),
        last_name:  form.last_name.trim(),
        email:      form.email.trim().toLowerCase(),
        role_id:    form.role_id || null,
        is_active:  form.is_active,
        is_staff:   form.is_staff,
      }
      if (form.password) {
        payload.password         = form.password
        payload.password_confirm = form.password_confirm
      }
      const r = await api.patch(`/core/users/${id}/`, payload)
      setUser(r.data)
      setForm(f => ({ ...f, password: '', password_confirm: '' }))
      showToast('success', '¡Usuario actualizado correctamente!')
    } catch (e) {
      const d = e.response?.data || {}
      if (typeof d === 'object' && !Array.isArray(d)) setErrors(d)
      else showToast('error', 'Error al guardar.')
    } finally { setSaving(false) }
  }

  const handleDeactivate = async () => {
    if (!confirm('¿Desactivar este usuario?')) return
    try {
      await api.delete(`/core/users/${id}/`)
      showToast('success', 'Usuario desactivado.')
      setTimeout(() => navigate('/settings?section=users'), 1500)
    } catch (e) {
      showToast('error', e.response?.data?.detail || 'Error.')
    }
  }

  const fmtDate = (iso) => iso ? new Date(iso).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
  const initials = user ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || user.email?.[0]?.toUpperCase() : '?'

  return (
    <div className="min-h-screen" style={{ background: getBackgroundStyle() }}>
      <div className="absolute inset-0 noise-bg pointer-events-none" />

      {/* Toast */}
      {toast && (
        <div className={clsx(
          'fixed top-4 right-4 z-[9999] flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl text-sm font-medium',
          toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
        )}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="relative border-b border-synapsix-border glass sticky top-0 z-40">
        <div className="flex items-center gap-3 px-4 h-12">
          <button onClick={() => navigate('/settings?section=users')}
            className="flex items-center gap-1.5 text-synapsix-muted hover:text-synapsix-text-2 transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Usuarios
          </button>
          <div className="w-px h-4 bg-synapsix-border mx-1" />
          <span className="text-synapsix-text font-semibold text-sm truncate">
            {loading ? 'Cargando...' : user?.email || id}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="w-10 h-10 animate-spin text-synapsix-muted" />
        </div>
      ) : !user ? (
        <div className="flex items-center justify-center h-[80vh] flex-col gap-3">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-synapsix-muted">Usuario no encontrado</p>
          <button onClick={() => navigate('/settings?section=users')} className="btn-secondary text-sm">Volver</button>
        </div>
      ) : (
        <div className="relative max-w-3xl mx-auto px-4 py-8 space-y-6">
          {/* Avatar + info */}
          <div className="glass rounded-2xl border border-synapsix-border p-5 flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-synapsix-red/15 border border-synapsix-red/25 flex items-center justify-center flex-shrink-0">
              <span className="text-synapsix-red text-xl font-black">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-synapsix-text">{user.full_name || user.email}</p>
              <p className="text-sm text-synapsix-muted">{user.email}</p>
              <div className="flex items-center gap-3 mt-2 text-[10px] text-synapsix-muted-2">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Registro: {fmtDate(user.date_joined)}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Último login: {fmtDate(user.last_login)}</span>
              </div>
            </div>
            <span className={clsx(
              'text-xs px-2.5 py-1 rounded-full border font-semibold flex-shrink-0',
              user.is_active ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
            )}>
              {user.is_active ? 'Activo' : 'Inactivo'}
            </span>
          </div>

          {/* Datos personales */}
          <div className="glass rounded-2xl border border-synapsix-border p-5 space-y-4">
            <h3 className="text-sm font-bold text-synapsix-text-2 flex items-center gap-2"><User className="w-4 h-4 text-synapsix-muted" /> Datos personales</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nombre" required error={errors.first_name}>
                <input value={form.first_name} onChange={e => setF('first_name', e.target.value)}
                  className={clsx('input-field', errors.first_name && 'border-red-500/50')} placeholder="Juan" />
              </Field>
              <Field label="Apellido">
                <input value={form.last_name} onChange={e => setF('last_name', e.target.value)}
                  className="input-field" placeholder="García" />
              </Field>
              <Field label="Correo electrónico" required error={errors.email} hint="Es el identificador de acceso">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-synapsix-muted" />
                  <input type="email" value={form.email} onChange={e => setF('email', e.target.value)}
                    className={clsx('input-field pl-9', errors.email && 'border-red-500/50')}
                    placeholder="usuario@empresa.com" />
                </div>
              </Field>
              <Field label="Rol" error={errors.role_id} hint="Define los permisos de acceso">
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-synapsix-muted" />
                  <select value={form.role_id} onChange={e => setF('role_id', e.target.value)}
                    className={clsx('input-field pl-9 cursor-pointer', errors.role_id && 'border-red-500/50')}>
                    <option value="">Sin rol</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>
                        {ROLE_OPTS.find(o => o.value === r.name)?.label || r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>
            </div>
          </div>

          {/* Estado */}
          <div className="glass rounded-2xl border border-synapsix-border p-5 space-y-3">
            <h3 className="text-sm font-bold text-synapsix-text-2 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-synapsix-muted" /> Estado y acceso</h3>
            <Toggle label="Cuenta activa" desc="El usuario puede iniciar sesión"
              checked={form.is_active} onChange={v => setF('is_active', v)} />
            <Toggle label="Acceso de staff" desc="Puede acceder al panel de administración de Django"
              checked={form.is_staff} onChange={v => setF('is_staff', v)} />
          </div>

          {/* Cambiar contraseña */}
          <div className="glass rounded-2xl border border-synapsix-border p-5 space-y-4">
            <h3 className="text-sm font-bold text-synapsix-text-2 flex items-center gap-2"><Lock className="w-4 h-4 text-synapsix-muted" /> Cambiar contraseña</h3>
            <p className="text-xs text-synapsix-muted">Deja en blanco para no cambiar la contraseña actual.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nueva contraseña" error={errors.password} hint="Mínimo 8 caracteres">
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} value={form.password}
                    onChange={e => setF('password', e.target.value)}
                    className={clsx('input-field pr-9', errors.password && 'border-red-500/50')}
                    placeholder="Nueva contraseña" />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-synapsix-muted hover:text-synapsix-text-2">
                    {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </Field>
              <Field label="Confirmar contraseña" error={errors.password_confirm}>
                <input type={showPwd ? 'text' : 'password'} value={form.password_confirm}
                  onChange={e => setF('password_confirm', e.target.value)}
                  className={clsx('input-field', errors.password_confirm && 'border-red-500/50')}
                  placeholder="Repetir contraseña" />
              </Field>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-between gap-3">
            <button onClick={handleDeactivate} disabled={!user.is_active}
              className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <Trash2 className="w-4 h-4" />
              {user.is_active ? 'Desactivar usuario' : 'Ya está desactivado'}
            </button>
            <div className="flex gap-2">
              <button onClick={fetchData} className="btn-secondary text-sm gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" /> Restablecer
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-primary text-sm gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
