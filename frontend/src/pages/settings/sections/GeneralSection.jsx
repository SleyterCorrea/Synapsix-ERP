/**
 * SYNAPSIX ERP — GeneralSection v2
 * Ajustes de empresa que se guardan realmente en backend.
 */
import { useState, useEffect } from 'react'
import {
  Building2, Globe, Phone, Mail, CreditCard, Clock,
  Save, Loader2, AlertCircle, CheckCircle, Upload, X,
} from 'lucide-react'
import clsx from 'clsx'
import api from '@api/axios'

const CURRENCIES = ['MXN', 'USD', 'EUR', 'COP', 'PEN', 'CLP', 'ARS', 'VES']
const TIMEZONES  = [
  { value: 'America/Mexico_City', label: 'Ciudad de México (UTC-6)' },
  { value: 'America/Bogota',      label: 'Bogotá (UTC-5)' },
  { value: 'America/Lima',        label: 'Lima (UTC-5)' },
  { value: 'America/Santiago',    label: 'Santiago (UTC-4)' },
  { value: 'America/Buenos_Aires',label: 'Buenos Aires (UTC-3)' },
  { value: 'America/New_York',    label: 'Nueva York (UTC-5)' },
  { value: 'Europe/Madrid',       label: 'Madrid (UTC+1)' },
  { value: 'UTC',                 label: 'UTC' },
]

function Field({ label, error, children, required, hint }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium flex items-center gap-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[10px] text-synapsix-muted-2">{hint}</p>}
      {error && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
    </div>
  )
}

export default function GeneralSection() {
  const [form, setForm]       = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [errors, setErrors]   = useState({})
  const [toast, setToast]     = useState(null)

  const showToast = (type, msg) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => {
    api.get('/core/company/').then(r => {
      setForm(r.data)
      setLogoPreview(r.data.logo_url)
    }).catch(() => {
      showToast('error', 'No se pudieron cargar los ajustes.')
    }).finally(() => setLoading(false))
  }, [])

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => ({ ...e, [k]: undefined }))
  }

  const handleLogo = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'].includes(file.type)) {
      setErrors(er => ({ ...er, logo: 'Solo PNG, JPG, SVG o WebP.' }))
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrors(er => ({ ...er, logo: 'Máximo 2 MB.' }))
      return
    }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
    setErrors(er => ({ ...er, logo: undefined }))
  }

  const validate = () => {
    const e = {}
    if (!form?.name?.trim())  e.name  = 'Requerido'
    if (form?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email inválido'
    if (form?.website && !/^https?:\/\//.test(form.website)) e.website = 'Debe comenzar con https://'
    return e
  }

  const handleSave = async () => {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      const fd = new FormData()
      const fields = ['name', 'tax_id', 'address', 'phone', 'email', 'website', 'currency', 'timezone']
      fields.forEach(f => { if (form[f] !== undefined) fd.append(f, form[f]) })
      if (logoFile) fd.append('logo', logoFile)
      const r = await api.patch('/core/company/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setForm(r.data)
      setLogoPreview(r.data.logo_url)
      setLogoFile(null)
      showToast('success', '¡Ajustes guardados correctamente!')
    } catch (err) {
      const apiErrors = err.response?.data || {}
      if (typeof apiErrors === 'object') setErrors(apiErrors)
      else showToast('error', 'Error al guardar.')
    } finally { setSaving(false) }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-synapsix-muted" /></div>
  if (!form)   return <p className="text-red-400 text-sm">No se pudo cargar la configuración.</p>

  return (
    <div className="space-y-8">
      {/* Toast */}
      {toast && (
        <div className={clsx(
          'fixed top-4 right-4 z-[9999] flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl text-sm font-medium',
          toast.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        )}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div>
        <h2 className="text-lg font-black text-synapsix-text">Ajustes Generales</h2>
        <p className="text-sm text-synapsix-muted mt-0.5">Información de tu empresa y preferencias del sistema</p>
      </div>

      {/* Logo */}
      <div className="glass rounded-2xl border border-synapsix-border p-5 space-y-4">
        <h3 className="text-sm font-bold text-synapsix-text-2">Logo de la empresa</h3>
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl border border-synapsix-border bg-synapsix-surface-2 flex items-center justify-center overflow-hidden">
            {logoPreview
              ? <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-2" />
              : <Building2 className="w-8 h-8 text-synapsix-muted opacity-40" />
            }
          </div>
          <div className="space-y-2">
            <label className="btn-secondary cursor-pointer gap-2 text-sm inline-flex items-center">
              <Upload className="w-4 h-4" /> Subir logo
              <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={handleLogo} className="hidden" />
            </label>
            {logoPreview && (
              <button onClick={() => { setLogoFile(null); setLogoPreview(null) }}
                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300">
                <X className="w-3 h-3" /> Quitar logo
              </button>
            )}
            <p className="text-[10px] text-synapsix-muted">PNG, JPG, SVG o WebP — máx. 2 MB</p>
            {errors.logo && <p className="text-xs text-red-400">{errors.logo}</p>}
          </div>
        </div>
      </div>

      {/* Información */}
      <div className="glass rounded-2xl border border-synapsix-border p-5 space-y-4">
        <h3 className="text-sm font-bold text-synapsix-text-2 flex items-center gap-2"><Building2 className="w-4 h-4 text-synapsix-muted" /> Información de la empresa</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nombre de la empresa" required error={errors.name}>
            <input value={form.name || ''} onChange={e => set('name', e.target.value)}
              className={clsx('input-field', errors.name && 'border-red-500/50')}
              placeholder="Mi Restaurante S.A." />
          </Field>
          <Field label="RFC / RUC / NIT" error={errors.tax_id} hint="Identificación fiscal">
            <input value={form.tax_id || ''} onChange={e => set('tax_id', e.target.value)}
              className="input-field" placeholder="XAXX010101000" />
          </Field>
          <Field label="Teléfono" error={errors.phone}>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-synapsix-muted" />
              <input value={form.phone || ''} onChange={e => set('phone', e.target.value)}
                className={clsx('input-field pl-9', errors.phone && 'border-red-500/50')}
                placeholder="+52 55 1234 5678" />
            </div>
          </Field>
          <Field label="Email" error={errors.email}>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-synapsix-muted" />
              <input type="email" value={form.email || ''} onChange={e => set('email', e.target.value)}
                className={clsx('input-field pl-9', errors.email && 'border-red-500/50')}
                placeholder="contacto@empresa.com" />
            </div>
          </Field>
          <Field label="Sitio web" error={errors.website} hint="Incluye https://">
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-synapsix-muted" />
              <input value={form.website || ''} onChange={e => set('website', e.target.value)}
                className={clsx('input-field pl-9', errors.website && 'border-red-500/50')}
                placeholder="https://miempresa.com" />
            </div>
          </Field>
          <Field label="Dirección" error={errors.address}>
            <input value={form.address || ''} onChange={e => set('address', e.target.value)}
              className="input-field" placeholder="Calle, Ciudad, País" />
          </Field>
        </div>
      </div>

      {/* Preferencias */}
      <div className="glass rounded-2xl border border-synapsix-border p-5 space-y-4">
        <h3 className="text-sm font-bold text-synapsix-text-2 flex items-center gap-2"><Clock className="w-4 h-4 text-synapsix-muted" /> Preferencias del sistema</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Moneda" error={errors.currency}>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-synapsix-muted" />
              <select value={form.currency || 'MXN'} onChange={e => set('currency', e.target.value)}
                className="input-field pl-9 cursor-pointer">
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </Field>
          <Field label="Zona Horaria" error={errors.timezone}>
            <select value={form.timezone || 'America/Mexico_City'} onChange={e => set('timezone', e.target.value)}
              className="input-field cursor-pointer">
              {TIMEZONES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
        </div>
      </div>

      {/* Guardar */}
      <div className="flex justify-end gap-3">
        <button onClick={handleSave} disabled={saving} className="btn-primary gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}
