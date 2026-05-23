/**
 * SYNAPSIX ERP — PermissionsSection v2
 * CRUD real de Roles con todos los permisos por módulo.
 */
import { useState, useEffect, useCallback } from 'react'
import {
  ShieldCheck, Plus, Edit3, Trash2, Save, X,
  Users, Loader2, AlertCircle, CheckCircle, ChevronDown,
} from 'lucide-react'
import clsx from 'clsx'
import api from '@api/axios'

const ROLE_OPTIONS = [
  { value: 'admin',         label: 'Administrador' },
  { value: 'cajero',        label: 'Cajero' },
  { value: 'mozo',          label: 'Mozo / Mesero' },
  { value: 'inventarista',  label: 'Inventarista' },
  { value: 'viewer',        label: 'Solo Lectura' },
]

const PERMS = [
  { key: 'can_access_admin',       label: 'Panel de Administración', desc: 'Ver y editar configuración del sistema', icon: '⚙️' },
  { key: 'can_manage_users',       label: 'Gestionar Usuarios',      desc: 'Crear, editar y desactivar usuarios',    icon: '👥' },
  { key: 'can_access_inventory',   label: 'Módulo Inventario',       desc: 'Ver y gestionar productos y stock',      icon: '📦' },
  { key: 'can_access_billing',     label: 'Módulo Facturación',      desc: 'Emitir y ver facturas',                  icon: '🧾' },
  { key: 'can_access_restaurant',  label: 'Módulo Restaurante',      desc: 'Mesas, comandas y cocina',               icon: '🍽️' },
]

const EMPTY_FORM = {
  name: '', description: '',
  can_access_admin: false, can_manage_users: false,
  can_access_inventory: false, can_access_billing: false,
  can_access_restaurant: false,
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <button type="button" onClick={() => !disabled && onChange(!checked)} disabled={disabled}
      className={clsx(
        'relative flex-shrink-0 transition-colors rounded-full',
        checked ? 'bg-emerald-500' : 'bg-synapsix-surface-3',
        disabled && 'opacity-40 cursor-not-allowed'
      )}
      style={{ width: 40, height: 22 }}>
      <span className={clsx(
        'absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-all',
        checked ? 'left-[18px]' : 'left-[3px]'
      )} style={{ width: 17, height: 17 }} />
    </button>
  )
}

function RoleForm({ initial, onSave, onCancel, saving, errors }) {
  const [form, setForm] = useState(initial || { ...EMPTY_FORM })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const isEdit = !!initial?.id

  return (
    <div className="glass rounded-2xl border border-synapsix-border-2 p-5 space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-synapsix-text">{isEdit ? `Editar rol: ${initial.name}` : 'Nuevo Rol'}</p>
        <button onClick={onCancel} className="text-synapsix-muted hover:text-synapsix-text-2 p-1 rounded-lg hover:bg-synapsix-surface-2"><X className="w-4 h-4" /></button>
      </div>

      {errors?.general && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          <AlertCircle className="w-4 h-4" /> {errors.general}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium">Tipo de Rol *</label>
          <select value={form.name} onChange={e => set('name', e.target.value)}
            className={clsx('input-field cursor-pointer', errors?.name && 'border-red-500/50')}
            disabled={isEdit}>
            <option value="">Seleccionar...</option>
            {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          {errors?.name && <p className="text-xs text-red-400">{errors.name}</p>}
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium">Descripción</label>
          <input value={form.description} onChange={e => set('description', e.target.value)}
            className="input-field" placeholder="Ej: Acceso de mostrador..." />
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs text-synapsix-muted uppercase tracking-wider font-semibold">Permisos</p>
        <div className="space-y-2">
          {PERMS.map(p => (
            <div key={p.key} className="flex items-center justify-between p-3 rounded-xl bg-synapsix-surface-2 border border-synapsix-border">
              <div className="flex items-center gap-3">
                <span className="text-lg">{p.icon}</span>
                <div>
                  <p className="text-sm font-medium text-synapsix-text-2">{p.label}</p>
                  <p className="text-[10px] text-synapsix-muted">{p.desc}</p>
                </div>
              </div>
              <Toggle checked={!!form[p.key]} onChange={v => set(p.key, v)} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="btn-secondary text-sm">Cancelar</button>
        <button onClick={() => onSave(form)} disabled={saving || !form.name}
          className="btn-primary text-sm gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Guardando...' : (isEdit ? 'Actualizar Rol' : 'Crear Rol')}
        </button>
      </div>
    </div>
  )
}

export default function PermissionsSection() {
  const [roles, setRoles]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [errors, setErrors]     = useState({})
  const [toast, setToast]       = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editRole, setEditRole] = useState(null)

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 4000) }

  const fetchRoles = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/core/roles/')
      setRoles(Array.isArray(r.data) ? r.data : [])
    } catch { showToast('error', 'Error al cargar roles.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchRoles() }, [fetchRoles])

  const handleCreate = async (form) => {
    setSaving(true); setErrors({})
    try {
      const r = await api.post('/core/roles/', form)
      setRoles(prev => [...prev, r.data])
      setShowCreate(false)
      showToast('success', `Rol "${form.name}" creado.`)
    } catch (e) {
      const d = e.response?.data || {}
      setErrors(typeof d === 'object' ? d : { general: 'Error al crear.' })
    } finally { setSaving(false) }
  }

  const handleUpdate = async (form) => {
    setSaving(true); setErrors({})
    try {
      const r = await api.patch(`/core/roles/${editRole.id}/`, form)
      setRoles(prev => prev.map(ro => ro.id === editRole.id ? r.data : ro))
      setEditRole(null)
      showToast('success', 'Rol actualizado.')
    } catch (e) {
      const d = e.response?.data || {}
      setErrors(typeof d === 'object' ? d : { general: 'Error al actualizar.' })
    } finally { setSaving(false) }
  }

  const handleDelete = async (role) => {
    if (role.user_count > 0) {
      showToast('error', `No se puede eliminar: ${role.user_count} usuario(s) asignado(s).`)
      return
    }
    if (!confirm(`¿Eliminar el rol "${role.name}"?`)) return
    try {
      await api.delete(`/core/roles/${role.id}/`)
      setRoles(prev => prev.filter(r => r.id !== role.id))
      showToast('success', 'Rol eliminado.')
    } catch (e) {
      showToast('error', e.response?.data?.detail || 'Error al eliminar.')
    }
  }

  const roleName = (r) => ROLE_OPTIONS.find(o => o.value === r.name)?.label || r.name

  return (
    <div className="space-y-6">
      {toast && (
        <div className={clsx(
          'fixed top-4 right-4 z-[9999] flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl text-sm font-medium',
          toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
        )}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-black text-synapsix-text flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-synapsix-muted" /> Roles y Permisos</h2>
          <p className="text-sm text-synapsix-muted mt-0.5">Define qué puede hacer cada tipo de usuario</p>
        </div>
        <button onClick={() => { setShowCreate(true); setEditRole(null) }} className="btn-primary gap-2 text-sm">
          <Plus className="w-4 h-4" /> Nuevo Rol
        </button>
      </div>

      {showCreate && !editRole && (
        <RoleForm onSave={handleCreate} onCancel={() => setShowCreate(false)} saving={saving} errors={errors} />
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-synapsix-muted" /></div>
      ) : roles.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <ShieldCheck className="w-12 h-12 text-synapsix-muted opacity-20 mx-auto" />
          <p className="text-synapsix-muted">Sin roles configurados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {roles.map(role => (
            <div key={role.id}>
              {editRole?.id === role.id ? (
                <RoleForm initial={role} onSave={handleUpdate} onCancel={() => setEditRole(null)} saving={saving} errors={errors} />
              ) : (
                <div className="glass rounded-2xl border border-synapsix-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="text-sm font-bold text-synapsix-text">{roleName(role)}</p>
                        <span className="flex items-center gap-1 text-xs text-synapsix-muted bg-synapsix-surface-2 border border-synapsix-border px-2 py-0.5 rounded-full">
                          <Users className="w-3 h-3" /> {role.user_count} usuarios
                        </span>
                      </div>
                      {role.description && <p className="text-xs text-synapsix-muted mt-1">{role.description}</p>}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {PERMS.map(p => (
                          <span key={p.key} className={clsx(
                            'text-[10px] px-2 py-1 rounded-lg border font-medium',
                            role[p.key]
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : 'bg-synapsix-surface-2 border-synapsix-border text-synapsix-muted-2 line-through'
                          )}>
                            {p.icon} {p.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => setEditRole(role)} className="w-7 h-7 rounded-lg flex items-center justify-center text-synapsix-muted hover:text-synapsix-text-2 hover:bg-synapsix-surface-2 transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(role)} className="w-7 h-7 rounded-lg flex items-center justify-center text-synapsix-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
