/**
 * SYNAPSIX ERP — UserDetailPage v3 (estilo Odoo)
 *
 * Header: Avatar grande + nombre + email + estado
 * Tabs: Permisos de acceso | Preferencias | Seguridad
 *
 * Tab Permisos: rol + permisos granulares por módulo
 * Tab Preferencias: nombre, apellido, idioma, timezone, teléfono
 * Tab Seguridad: cambiar contraseña, is_staff, activar/desactivar
 */
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Save, Loader2, AlertCircle, CheckCircle,
  Mail, Lock, ShieldCheck, Trash2, Eye, EyeOff,
  RefreshCw, Calendar, Clock, User, Phone, ChevronLeft, ChevronRight,
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

const PERMS = [
  { key: 'can_access_admin',      label: 'Panel de Administración', desc: 'Ver y editar configuración del sistema',  icon: '⚙️', group: 'SISTEMA' },
  { key: 'can_manage_users',      label: 'Gestionar Usuarios',      desc: 'Crear, editar y desactivar usuarios',     icon: '👥', group: 'SISTEMA' },
  { key: 'can_access_inventory',  label: 'Inventario',              desc: 'Ver y gestionar productos y stock',       icon: '📦', group: 'MÓDULOS' },
  { key: 'can_access_billing',    label: 'Facturación',             desc: 'Emitir y ver facturas',                   icon: '🧾', group: 'MÓDULOS' },
  { key: 'can_access_restaurant', label: 'Restaurante',             desc: 'Mesas, comandas y cocina',                icon: '🍽️', group: 'MÓDULOS' },
]

function Toggle({ checked, onChange, disabled }) {
  return (
    <button type="button" onClick={() => !disabled && onChange(!checked)} disabled={disabled}
      className={clsx(
        'relative flex-shrink-0 rounded-full transition-colors',
        checked ? 'bg-emerald-500' : 'bg-synapsix-surface-3',
        disabled && 'opacity-40 cursor-not-allowed'
      )}
      style={{ width: 40, height: 22 }}>
      <span className="absolute top-[2px] rounded-full bg-white shadow transition-all"
        style={{ width: 18, height: 18, left: checked ? 20 : 2 }} />
    </button>
  )
}

function Field({ label, required, error, children, hint }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[10px] text-synapsix-muted-2">{hint}</p>}
      {error && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
    </div>
  )
}

const TABS = [
  { id: 'permisos',     label: 'Permisos de acceso' },
  { id: 'preferencias', label: 'Preferencias' },
  { id: 'seguridad',    label: 'Seguridad' },
]

export default function UserDetailPage() {
  const { id }   = useParams()
  const navigate = useNavigate()

  const [user, setUser]   = useState(null)
  const [roles, setRoles] = useState([])
  const [tab, setTab]     = useState('permisos')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [errors, setErrors]   = useState({})
  const [toast, setToast]     = useState(null)
  const [showPwd, setShowPwd] = useState(false)

  // Formularios por tab
  const [formPermisos, setFormPermisos] = useState({ role_id: '' })
  const [formPref, setFormPref] = useState({ first_name: '', last_name: '', phone: '' })
  const [formSec, setFormSec]   = useState({ is_active: true, is_staff: false, password: '', password_confirm: '' })

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 4000) }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [uRes, rRes] = await Promise.all([
        api.get(`/core/users/${id}/`),
        api.get('/core/roles/'),
      ])
      const u = uRes.data
      setUser(u)
      setRoles(Array.isArray(rRes.data) ? rRes.data : [])
      setFormPermisos({ role_id: u.role?.id || '' })
      setFormPref({ first_name: u.first_name || '', last_name: u.last_name || '', phone: u.phone || '' })
      setFormSec({ is_active: u.is_active, is_staff: u.is_staff || false, password: '', password_confirm: '' })
    } catch (e) {
      showToast('error', e.response?.data?.detail || 'Error al cargar el usuario.')
    } finally { setLoading(false) }
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  const saveTab = async (payload) => {
    setSaving(true); setErrors({})
    try {
      const r = await api.patch(`/core/users/${id}/`, payload)
      setUser(r.data)
      setFormPref(f => ({ ...f, first_name: r.data.first_name, last_name: r.data.last_name }))
      setFormSec(f => ({ ...f, is_active: r.data.is_active, is_staff: r.data.is_staff, password: '', password_confirm: '' }))
      showToast('success', 'Cambios guardados.')
    } catch (e) {
      const d = e.response?.data || {}
      if (typeof d === 'object') setErrors(d)
      else showToast('error', 'Error al guardar.')
    } finally { setSaving(false) }
  }

  // ── Guardar Permisos ───────────────────────────────────────────────────────
  const handleSavePermisos = () => saveTab({ role_id: formPermisos.role_id || null })

  // ── Guardar Preferencias ───────────────────────────────────────────────────
  const handleSavePref = () => {
    if (!formPref.first_name.trim()) { setErrors({ first_name: 'Requerido' }); return }
    saveTab({ first_name: formPref.first_name.trim(), last_name: formPref.last_name.trim() })
  }

  // ── Guardar Seguridad ──────────────────────────────────────────────────────
  const handleSaveSec = () => {
    const e = {}
    if (formSec.password) {
      if (formSec.password.length < 8) e.password = 'Mínimo 8 caracteres'
      if (formSec.password !== formSec.password_confirm) e.password_confirm = 'No coinciden'
    }
    if (Object.keys(e).length) { setErrors(e); return }
    const payload = { is_active: formSec.is_active, is_staff: formSec.is_staff }
    if (formSec.password) {
      payload.password         = formSec.password
      payload.password_confirm = formSec.password_confirm
    }
    saveTab(payload)
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

  const fmtDate = iso => iso ? new Date(iso).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
  const initials = u => `${u?.first_name?.[0] || ''}${u?.last_name?.[0] || ''}`.toUpperCase() || u?.email?.[0]?.toUpperCase() || '?'

  const selectedRole = roles.find(r => r.id === formPermisos.role_id)

  return (
    <div className="min-h-screen bg-synapsix-dark">

      {/* Toast */}
      {toast && (
        <div className={clsx(
          'fixed top-4 right-4 z-[9999] flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl text-sm font-medium pointer-events-none',
          toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
        )}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="border-b border-synapsix-border glass sticky top-0 z-40">
        <div className="flex items-center gap-2 px-4 h-12">
          <button onClick={() => navigate('/settings?section=users')}
            className="flex items-center gap-1.5 text-synapsix-muted hover:text-synapsix-text-2 text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" /> Usuarios
          </button>
          <span className="text-synapsix-border-2">/</span>
          <span className="text-synapsix-text text-sm font-semibold truncate">
            {loading ? '...' : user ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email : 'No encontrado'}
          </span>
          {user && (
            <span className={clsx(
              'ml-2 text-[10px] px-2 py-0.5 rounded-full border font-medium',
              user.is_active ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
            )}>
              {user.is_active ? 'Confirmado' : 'Inactivo'}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[80vh]"><Loader2 className="w-10 h-10 animate-spin text-synapsix-muted" /></div>
      ) : !user ? (
        <div className="flex flex-col items-center justify-center h-[80vh] gap-3">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-synapsix-muted">Usuario no encontrado</p>
          <button onClick={() => navigate('/settings?section=users')} className="btn-secondary text-sm">Volver</button>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

          {/* ── Header usuario (estilo Odoo) ──────────────────────────── */}
          <div className="glass rounded-2xl border border-synapsix-border overflow-hidden">
            <div className="p-6 flex items-start gap-6 flex-wrap">
              {/* Avatar grande */}
              <div className="w-24 h-24 rounded-2xl bg-synapsix-red/15 border-2 border-synapsix-red/30 flex items-center justify-center flex-shrink-0">
                <span className="text-synapsix-red text-3xl font-black">{initials(user)}</span>
              </div>
              {/* Datos principales */}
              <div className="flex-1 min-w-0 space-y-1">
                <h1 className="text-2xl font-black text-synapsix-text">
                  {[user.first_name, user.last_name].filter(Boolean).join(' ') || '(sin nombre)'}
                </h1>
                <div className="flex items-center gap-1.5 text-synapsix-muted text-sm">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{user.email}</span>
                </div>
                {user.role && (
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-synapsix-muted" />
                    <span className="text-sm text-synapsix-muted-2">{ROLE_LABELS[user.role.name] || user.role.name}</span>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-4 mt-3 text-[11px] text-synapsix-muted-2">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Registro: {fmtDate(user.date_joined)}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Último login: {fmtDate(user.last_login)}</span>
                </div>
              </div>
              {/* Acciones rápidas */}
              <div className="flex items-center gap-2">
                <button onClick={fetchData} title="Recargar" className="btn-secondary gap-1.5 text-sm py-1.5">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                {user.is_active && (
                  <button onClick={handleDeactivate} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> Desactivar
                  </button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="border-t border-synapsix-border flex">
              {TABS.map(t => (
                <button key={t.id} onClick={() => { setTab(t.id); setErrors({}) }}
                  className={clsx(
                    'flex-1 py-3 text-sm font-medium transition-all border-b-2',
                    tab === t.id
                      ? 'border-synapsix-red text-synapsix-red bg-synapsix-red/5'
                      : 'border-transparent text-synapsix-muted hover:text-synapsix-text-2 hover:bg-synapsix-surface-2'
                  )}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Tab: Permisos ──────────────────────────────────────────── */}
          {tab === 'permisos' && (
            <div className="space-y-4">
              {/* Selector de Rol */}
              <div className="glass rounded-2xl border border-synapsix-border p-5 space-y-4">
                <h3 className="text-sm font-bold text-synapsix-text-2">Función / Rol</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Radio de roles */}
                  {roles.map(r => (
                    <button key={r.id} type="button"
                      onClick={() => setFormPermisos({ role_id: r.id })}
                      className={clsx(
                        'flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                        formPermisos.role_id === r.id
                          ? 'border-synapsix-red/40 bg-synapsix-red/8 text-synapsix-red'
                          : 'border-synapsix-border hover:border-synapsix-border-2 text-synapsix-text'
                      )}>
                      <div className={clsx(
                        'w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center',
                        formPermisos.role_id === r.id ? 'border-synapsix-red' : 'border-synapsix-muted'
                      )}>
                        {formPermisos.role_id === r.id && <div className="w-2 h-2 rounded-full bg-synapsix-red" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{ROLE_LABELS[r.name] || r.name}</p>
                        {r.description && <p className="text-[10px] text-synapsix-muted">{r.description}</p>}
                        <p className="text-[10px] text-synapsix-muted-2">{r.user_count} usuarios</p>
                      </div>
                    </button>
                  ))}
                  {/* Sin rol */}
                  <button type="button"
                    onClick={() => setFormPermisos({ role_id: '' })}
                    className={clsx(
                      'flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                      formPermisos.role_id === ''
                        ? 'border-synapsix-border-2 bg-synapsix-surface-2'
                        : 'border-synapsix-border hover:border-synapsix-border-2'
                    )}>
                    <div className={clsx(
                      'w-4 h-4 rounded-full border-2 flex-shrink-0',
                      formPermisos.role_id === '' ? 'border-synapsix-text-2' : 'border-synapsix-muted'
                    )}>
                      {formPermisos.role_id === '' && <div className="w-2 h-2 rounded-full bg-synapsix-muted m-[1px]" />}
                    </div>
                    <p className="text-sm text-synapsix-muted">Sin rol asignado</p>
                  </button>
                </div>
              </div>

              {/* Permisos del rol seleccionado (solo lectura) */}
              {selectedRole && (
                <div className="glass rounded-2xl border border-synapsix-border p-5 space-y-3">
                  <h3 className="text-sm font-bold text-synapsix-text-2">
                    Permisos del rol "{ROLE_LABELS[selectedRole.name] || selectedRole.name}"
                  </h3>
                  <p className="text-[11px] text-synapsix-muted">Para editar los permisos del rol ve a Ajustes → Roles y permisos.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PERMS.map(p => (
                      <div key={p.key} className={clsx(
                        'flex items-center gap-2 p-2.5 rounded-xl border text-xs',
                        selectedRole[p.key]
                          ? 'bg-emerald-500/8 border-emerald-500/20 text-emerald-400'
                          : 'bg-synapsix-surface-2 border-synapsix-border text-synapsix-muted-2'
                      )}>
                        <span>{p.icon}</span>
                        <span className={selectedRole[p.key] ? '' : 'line-through'}>{p.label}</span>
                        {selectedRole[p.key] ? <CheckCircle className="w-3 h-3 ml-auto" /> : null}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button onClick={handleSavePermisos} disabled={saving} className="btn-primary gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Guardando...' : 'Guardar permisos'}
                </button>
              </div>
            </div>
          )}

          {/* ── Tab: Preferencias ─────────────────────────────────────── */}
          {tab === 'preferencias' && (
            <div className="space-y-4">
              <div className="glass rounded-2xl border border-synapsix-border p-5 space-y-4">
                <h3 className="text-sm font-bold text-synapsix-text-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-synapsix-muted" /> Datos personales
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Nombre" required error={errors.first_name}>
                    <input value={formPref.first_name}
                      onChange={e => { setFormPref(f => ({ ...f, first_name: e.target.value })); setErrors(err => ({ ...err, first_name: undefined })) }}
                      className={clsx('input-field', errors.first_name && 'border-red-500/50')}
                      placeholder="Juan" />
                  </Field>
                  <Field label="Apellido">
                    <input value={formPref.last_name}
                      onChange={e => setFormPref(f => ({ ...f, last_name: e.target.value }))}
                      className="input-field" placeholder="García" />
                  </Field>
                  <Field label="Correo electrónico" hint="El email es el identificador de acceso y no se puede cambiar aquí">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-synapsix-muted" />
                      <input value={user.email} disabled
                        className="input-field pl-9 opacity-50 cursor-not-allowed" />
                    </div>
                  </Field>
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={handleSavePref} disabled={saving} className="btn-primary gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Guardando...' : 'Guardar preferencias'}
                </button>
              </div>
            </div>
          )}

          {/* ── Tab: Seguridad ────────────────────────────────────────── */}
          {tab === 'seguridad' && (
            <div className="space-y-4">
              {/* Estado de cuenta */}
              <div className="glass rounded-2xl border border-synapsix-border p-5 space-y-3">
                <h3 className="text-sm font-bold text-synapsix-text-2">Estado de la cuenta</h3>
                {[
                  { key: 'is_active', label: 'Cuenta activa', desc: 'El usuario puede iniciar sesión en el sistema' },
                  { key: 'is_staff',  label: 'Acceso de staff', desc: 'Permite acceder al panel de administración de Django' },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-synapsix-surface-2 border border-synapsix-border">
                    <div>
                      <p className="text-sm font-medium text-synapsix-text-2">{label}</p>
                      <p className="text-[10px] text-synapsix-muted">{desc}</p>
                    </div>
                    <Toggle
                      checked={formSec[key]}
                      onChange={v => setFormSec(f => ({ ...f, [key]: v }))}
                    />
                  </div>
                ))}
              </div>

              {/* Cambiar contraseña */}
              <div className="glass rounded-2xl border border-synapsix-border p-5 space-y-4">
                <h3 className="text-sm font-bold text-synapsix-text-2 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-synapsix-muted" /> Cambiar contraseña
                </h3>
                <p className="text-xs text-synapsix-muted">Deja en blanco para conservar la contraseña actual.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Nueva contraseña" error={errors.password} hint="Mínimo 8 caracteres">
                    <div className="relative">
                      <input type={showPwd ? 'text' : 'password'} value={formSec.password}
                        onChange={e => { setFormSec(f => ({ ...f, password: e.target.value })); setErrors(err => ({ ...err, password: undefined })) }}
                        className={clsx('input-field pr-9', errors.password && 'border-red-500/50')}
                        placeholder="Nueva contraseña" />
                      <button type="button" onClick={() => setShowPwd(!showPwd)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-synapsix-muted hover:text-synapsix-text-2">
                        {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </Field>
                  <Field label="Confirmar contraseña" error={errors.password_confirm}>
                    <input type={showPwd ? 'text' : 'password'} value={formSec.password_confirm}
                      onChange={e => { setFormSec(f => ({ ...f, password_confirm: e.target.value })); setErrors(err => ({ ...err, password_confirm: undefined })) }}
                      className={clsx('input-field', errors.password_confirm && 'border-red-500/50')}
                      placeholder="Repetir contraseña" />
                  </Field>
                </div>
              </div>

              <div className="flex justify-end">
                <button onClick={handleSaveSec} disabled={saving} className="btn-primary gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Guardando...' : 'Guardar seguridad'}
                </button>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
