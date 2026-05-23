/**
 * SYNAPSIX ERP — GeneralSection v3
 * - Logo grande y guardado correcto
 * - PATCH /core/company/ con FormData
 * - Campos completos de empresa
 */
import { useState, useEffect } from 'react'
import {
  Building2, Globe, Phone, Mail, CreditCard, Clock,
  Save, Loader2, AlertCircle, CheckCircle, Upload, X, ImageOff,
} from 'lucide-react'
import clsx from 'clsx'
import api from '@api/axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const CURRENCIES = ['MXN', 'USD', 'EUR', 'COP', 'PEN', 'CLP', 'ARS', 'VES']
const TIMEZONES = [
  { value: 'America/Mexico_City',  label: 'Ciudad de México (UTC-6)' },
  { value: 'America/Bogota',       label: 'Bogotá (UTC-5)' },
  { value: 'America/Lima',         label: 'Lima (UTC-5)' },
  { value: 'America/Santiago',     label: 'Santiago (UTC-4)' },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires (UTC-3)' },
  { value: 'America/New_York',     label: 'Nueva York (UTC-5)' },
  { value: 'Europe/Madrid',        label: 'Madrid (UTC+1)' },
  { value: 'UTC',                  label: 'UTC' },
]

function Field({ label, error, children, required, hint }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium flex gap-1">
        {label}{required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[10px] text-synapsix-muted-2">{hint}</p>}
      {error && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3 flex-shrink-0" />{error}</p>}
    </div>
  )
}

// Resuelve la URL correcta del logo (absoluta si viene del backend, relativa si es blob)
function resolveLogoUrl(url) {
  if (!url) return null
  if (url.startsWith('blob:') || url.startsWith('data:')) return url
  if (url.startsWith('http')) return url
  // Ruta relativa del backend → hacerla absoluta
  return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`
}

export default function GeneralSection() {
  const [company, setCompany]     = useState(null)
  const [form, setForm]           = useState({})
  const [logoFile, setLogoFile]   = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [removeLogo, setRemoveLogo]   = useState(false)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [errors, setErrors]       = useState({})
  const [toast, setToast]         = useState(null)

  const showToast = (type, msg) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => {
    api.get('/core/company/').then(r => {
      const c = r.data
      setCompany(c)
      setForm({
        name:     c.name     || '',
        tax_id:   c.tax_id   || '',
        address:  c.address  || '',
        phone:    c.phone    || '',
        email:    c.email    || '',
        website:  c.website  || '',
        currency: c.currency || 'MXN',
        timezone: c.timezone || 'America/Mexico_City',
      })
      // El backend devuelve logo_url (URL absoluta) o logo (ruta relativa)
      const logoUrl = c.logo_url || (c.logo ? resolveLogoUrl(c.logo) : null)
      setLogoPreview(logoUrl)
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
    const allowed = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) {
      setErrors(er => ({ ...er, logo: 'Solo PNG, JPG, SVG, WebP o GIF.' }))
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      setErrors(er => ({ ...er, logo: 'Máximo 3 MB.' }))
      return
    }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
    setRemoveLogo(false)
    setErrors(er => ({ ...er, logo: undefined }))
  }

  const handleRemoveLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
    setRemoveLogo(true)
  }

  const validate = () => {
    const e = {}
    if (!form.name?.trim()) e.name = 'El nombre es requerido'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email inválido'
    if (form.website && !/^https?:\/\//.test(form.website)) e.website = 'Debe comenzar con https://'
    if (form.phone && !/^\+?[\d\s\-().]{7,20}$/.test(form.phone)) e.phone = 'Formato inválido'
    return e
  }

  const handleSave = async () => {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      const fd = new FormData()
      // Todos los campos de texto
      Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ''))
      // Logo
      if (logoFile) {
        fd.append('logo', logoFile)
      } else if (removeLogo) {
        fd.append('logo', '')   // vacío = quitar logo
      }

      const r = await api.patch('/core/company/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setCompany(r.data)
      setLogoFile(null)
      setRemoveLogo(false)
      // Actualizar preview con la URL que devuelve el backend
      const newLogoUrl = r.data.logo_url || (r.data.logo ? resolveLogoUrl(r.data.logo) : null)
      setLogoPreview(newLogoUrl)
      showToast('success', '¡Ajustes guardados correctamente!')
    } catch (err) {
      const d = err.response?.data || {}
      if (typeof d === 'object' && !Array.isArray(d)) setErrors(d)
      else showToast('error', 'Error al guardar los ajustes.')
    } finally { setSaving(false) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-synapsix-muted" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">

      {/* Toast */}
      {toast && (
        <div className={clsx(
          'fixed top-4 right-4 z-[9999] flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl text-sm font-medium pointer-events-none',
          toast.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        )}>
          {toast.type === 'success'
            ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
            : <AlertCircle className="w-4 h-4 flex-shrink-0" />
          }
          {toast.msg}
        </div>
      )}

      <div>
        <h2 className="text-xl font-black text-synapsix-text">Ajustes generales</h2>
        <p className="text-sm text-synapsix-muted mt-0.5">Información de tu empresa y configuración del sistema</p>
      </div>

      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <section className="glass rounded-2xl border border-synapsix-border p-6 space-y-4">
        <h3 className="text-sm font-bold text-synapsix-text-2">Logo de la empresa</h3>
        <div className="flex items-start gap-6">
          {/* Preview grande */}
          <div className={clsx(
            'w-28 h-28 rounded-2xl border-2 flex items-center justify-center overflow-hidden flex-shrink-0 transition-all',
            logoPreview
              ? 'border-synapsix-border-2 bg-white/5'
              : 'border-dashed border-synapsix-border bg-synapsix-surface-2'
          )}>
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Logo empresa"
                className="w-full h-full object-contain p-2"
                onError={() => setLogoPreview(null)}
              />
            ) : (
              <div className="flex flex-col items-center gap-1 text-synapsix-muted opacity-40">
                <Building2 className="w-10 h-10" />
                <span className="text-[9px]">Sin logo</span>
              </div>
            )}
          </div>

          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap gap-2">
              <label className="btn-secondary cursor-pointer gap-2 text-sm inline-flex items-center">
                <Upload className="w-4 h-4" />
                {logoPreview ? 'Cambiar logo' : 'Subir logo'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
                  onChange={handleLogo}
                  className="hidden"
                />
              </label>
              {logoPreview && (
                <button
                  onClick={handleRemoveLogo}
                  className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 px-3 py-2 rounded-xl border border-red-500/20 hover:bg-red-500/10 transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Quitar
                </button>
              )}
            </div>
            <p className="text-[11px] text-synapsix-muted leading-relaxed">
              Formatos: PNG, JPG, SVG, WebP · Máximo 3 MB<br />
              Recomendado: 256×256 px o más, fondo transparente
            </p>
            {errors.logo && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.logo}
              </p>
            )}
          </div>
        </div>

        {/* Nombre visible debajo del logo */}
        <div className="flex items-center gap-4 p-3 rounded-xl bg-synapsix-surface-2 border border-synapsix-border">
          <div className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden border border-synapsix-border flex items-center justify-center bg-synapsix-surface-3">
            {logoPreview
              ? <img src={logoPreview} alt="" className="w-full h-full object-contain p-1" onError={() => setLogoPreview(null)} />
              : <span className="text-synapsix-text font-black text-lg">{form.name?.[0]?.toUpperCase() || '?'}</span>
            }
          </div>
          <div>
            <p className="text-sm font-semibold text-synapsix-text">{form.name || '(sin nombre)'}</p>
            <p className="text-[10px] text-synapsix-muted">Así se verá en el Launchpad</p>
          </div>
        </div>
      </section>

      {/* ── Información ──────────────────────────────────────────────────── */}
      <section className="glass rounded-2xl border border-synapsix-border p-6 space-y-5">
        <h3 className="text-sm font-bold text-synapsix-text-2 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-synapsix-muted" /> Información de la empresa
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nombre de la empresa" required error={errors.name}>
            <input
              value={form.name || ''}
              onChange={e => set('name', e.target.value)}
              className={clsx('input-field', errors.name && 'border-red-500/50')}
              placeholder="Mi Empresa S.A. de C.V."
              autoFocus
            />
          </Field>
          <Field label="RFC / RUC / NIT" error={errors.tax_id} hint="Identificación fiscal">
            <input
              value={form.tax_id || ''}
              onChange={e => set('tax_id', e.target.value)}
              className="input-field"
              placeholder="XAXX010101000"
            />
          </Field>
          <Field label="Teléfono" error={errors.phone}>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-synapsix-muted" />
              <input
                value={form.phone || ''}
                onChange={e => set('phone', e.target.value)}
                className={clsx('input-field pl-9', errors.phone && 'border-red-500/50')}
                placeholder="+52 55 1234 5678"
              />
            </div>
          </Field>
          <Field label="Email de contacto" error={errors.email}>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-synapsix-muted" />
              <input
                type="email"
                value={form.email || ''}
                onChange={e => set('email', e.target.value)}
                className={clsx('input-field pl-9', errors.email && 'border-red-500/50')}
                placeholder="contacto@empresa.com"
              />
            </div>
          </Field>
          <Field label="Sitio web" error={errors.website} hint="Incluye https://">
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-synapsix-muted" />
              <input
                value={form.website || ''}
                onChange={e => set('website', e.target.value)}
                className={clsx('input-field pl-9', errors.website && 'border-red-500/50')}
                placeholder="https://miempresa.com"
              />
            </div>
          </Field>
          <Field label="Dirección" error={errors.address}>
            <input
              value={form.address || ''}
              onChange={e => set('address', e.target.value)}
              className="input-field"
              placeholder="Calle 123, Ciudad, País"
            />
          </Field>
        </div>
      </section>

      {/* ── Preferencias ─────────────────────────────────────────────────── */}
      <section className="glass rounded-2xl border border-synapsix-border p-6 space-y-4">
        <h3 className="text-sm font-bold text-synapsix-text-2 flex items-center gap-2">
          <Clock className="w-4 h-4 text-synapsix-muted" /> Preferencias del sistema
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Moneda" error={errors.currency}>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-synapsix-muted" />
              <select
                value={form.currency || 'MXN'}
                onChange={e => set('currency', e.target.value)}
                className="input-field pl-9 cursor-pointer"
              >
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </Field>
          <Field label="Zona horaria" error={errors.timezone}>
            <select
              value={form.timezone || 'America/Mexico_City'}
              onChange={e => set('timezone', e.target.value)}
              className="input-field cursor-pointer"
            >
              {TIMEZONES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
        </div>
      </section>

      {/* ── Guardar ──────────────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn-primary gap-2 px-6">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}
