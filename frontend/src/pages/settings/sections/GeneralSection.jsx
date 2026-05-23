/**
 * SYNAPSIX ERP — General Settings Section (con Branding White-Label)
 */
import { useState, useRef } from 'react'
import { Building2, Save, Upload, X, Palette, RefreshCw } from 'lucide-react'
import { useAuth } from '@hooks/useAuth'
import useTenantStore from '@store/tenantStore'

const PRESET_COLORS = [
  { label: 'Synapsix Red',  hex: '#C0392B' },
  { label: 'Azul marino',  hex: '#1B4F72' },
  { label: 'Naranja',      hex: '#D35400' },
  { label: 'Verde',        hex: '#1E8449' },
  { label: 'Morado',       hex: '#6C3483' },
  { label: 'Teal',         hex: '#148F77' },
  { label: 'Gris antrac.', hex: '#2C3E50' },
  { label: 'Dorado',       hex: '#B7950B' },
]

export default function GeneralSection() {
  const { user } = useAuth()
  const company = user?.company
  const {
    companyName, companyTagline, logoBase64,
    primaryColor, setCompanyName, setCompanyTagline,
    setLogo, clearLogo, setPrimaryColor, resetBranding,
  } = useTenantStore()

  const logoRef = useRef(null)
  const [saved, setSaved] = useState(false)
  const [localColor, setLocalColor] = useState(primaryColor)

  const [form, setForm] = useState({
    tax_id: company?.tax_id || '',
    email: company?.email || '',
    phone: company?.phone || '',
    currency: company?.currency || 'MXN',
    timezone: company?.timezone || 'America/Mexico_City',
  })

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setLogo(ev.target.result)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleColorChange = (hex) => {
    setLocalColor(hex)
    setPrimaryColor(hex)
  }

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-synapsix-text">Ajustes generales</h1>
        <p className="text-synapsix-muted text-sm mt-1">
          Configura el nombre, logo y colores de la empresa. Estos cambios se aplican a toda la interfaz.
        </p>
      </div>

      {/* ── BRANDING ─────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-synapsix-border">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-synapsix-muted" />
            <h2 className="text-sm font-semibold text-synapsix-text-2 uppercase tracking-wider">
              Identidad de marca
            </h2>
          </div>
          <button
            onClick={resetBranding}
            className="flex items-center gap-1.5 text-xs text-synapsix-muted hover:text-synapsix-text-2 transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Restablecer Synapsix
          </button>
        </div>

        <div className="flex items-start gap-6">
          {/* Logo */}
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-20 h-20 rounded-2xl border-2 border-dashed border-synapsix-border flex items-center justify-center overflow-hidden cursor-pointer hover:border-synapsix-border-2 transition-colors relative group"
              onClick={() => !logoBase64 && logoRef.current?.click()}
              style={{ backgroundColor: logoBase64 ? 'transparent' : `rgba(${localColor.replace('#','').match(/.{2}/g).map(h=>parseInt(h,16)).join(',')},0.1)` }}
            >
              {logoBase64 ? (
                <>
                  <img src={logoBase64} alt="Logo" className="w-full h-full object-contain p-1" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); logoRef.current?.click() }} className="p-1 text-white hover:text-white/80">
                      <Upload className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); clearLogo() }} className="p-1 text-white hover:text-red-300">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <Upload className="w-6 h-6 text-synapsix-muted mx-auto mb-1" />
                  <span className="text-[10px] text-synapsix-muted">Logo</span>
                </div>
              )}
            </div>
            <span className="text-[10px] text-synapsix-muted-2 text-center">PNG, SVG recomendado</span>
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          </div>

          {/* Nombre y tagline */}
          <div className="flex-1 space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-synapsix-muted uppercase tracking-wider">
                Nombre de la empresa
              </label>
              <input
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                className="input-field"
                placeholder="Mi Empresa"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-synapsix-muted uppercase tracking-wider">
                Tagline / Sistema
              </label>
              <input
                value={companyTagline}
                onChange={e => setCompanyTagline(e.target.value)}
                className="input-field"
                placeholder="ERP · Restaurante · etc."
              />
            </div>
          </div>
        </div>

        {/* Vista previa del header */}
        <div className="rounded-xl border border-synapsix-border bg-synapsix-surface-2 p-3">
          <p className="text-[10px] text-synapsix-muted-2 uppercase tracking-wider mb-2">Vista previa del header</p>
          <div className="flex items-center gap-2 bg-synapsix-surface rounded-lg px-3 py-2 border border-synapsix-border">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
              style={{ backgroundColor: `${localColor}20`, border: `1px solid ${localColor}50` }}
            >
              {logoBase64
                ? <img src={logoBase64} alt="" className="w-full h-full object-contain p-0.5" />
                : <span className="text-sm font-black" style={{ color: localColor }}>{companyName?.[0] || 'S'}</span>
              }
            </div>
            <span className="text-sm font-bold text-synapsix-text">{companyName || 'Mi Empresa'}</span>
            <span className="text-xs text-synapsix-muted font-mono">{companyTagline || 'ERP'}</span>
          </div>
        </div>
      </section>

      {/* ── COLOR PRIMARIO ──────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-synapsix-border">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: localColor }} />
          <h2 className="text-sm font-semibold text-synapsix-text-2 uppercase tracking-wider">
            Color primario
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map(c => (
            <button
              key={c.hex}
              onClick={() => handleColorChange(c.hex)}
              title={c.label}
              className="w-8 h-8 rounded-xl transition-transform hover:scale-110 border-2"
              style={{
                backgroundColor: c.hex,
                borderColor: localColor === c.hex ? 'white' : 'transparent',
                outline: localColor === c.hex ? `2px solid ${c.hex}` : 'none',
                outlineOffset: 2,
              }}
            />
          ))}
          {/* Custom color picker */}
          <div className="relative">
            <input
              type="color"
              value={localColor}
              onChange={e => handleColorChange(e.target.value)}
              className="w-8 h-8 rounded-xl cursor-pointer border-2 border-synapsix-border overflow-hidden"
              title="Color personalizado"
            />
          </div>
        </div>
      </section>

      {/* ── EMPRESA ─────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-synapsix-border">
          <Building2 className="w-4 h-4 text-synapsix-muted" />
          <h2 className="text-sm font-semibold text-synapsix-text-2 uppercase tracking-wider">Datos de la empresa</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { key: 'tax_id', label: 'RFC / RUC / NIT', placeholder: 'XAXX010101000' },
            { key: 'email', label: 'Correo', placeholder: 'contacto@empresa.com', type: 'email' },
            { key: 'phone', label: 'Teléfono', placeholder: '+52 55 0000 0000' },
            { key: 'currency', label: 'Moneda', type: 'select', options: [
              { v: 'MXN', l: 'MXN — Peso Mexicano' }, { v: 'USD', l: 'USD — Dólar' },
              { v: 'COP', l: 'COP — Peso Colombiano' }, { v: 'PEN', l: 'PEN — Sol Peruano' },
            ]},
          ].map(({ key, label, placeholder, type, options }) => (
            <div key={key} className="space-y-1.5">
              <label className="text-xs font-medium text-synapsix-muted uppercase tracking-wider">{label}</label>
              {type === 'select' ? (
                <select value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} className="input-field">
                  {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              ) : (
                <input
                  type={type || 'text'}
                  value={form[key]}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                  placeholder={placeholder}
                  className="input-field"
                />
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end pt-2">
        <button onClick={handleSave} className="btn-primary gap-2">
          <Save className="w-4 h-4" />
          {saved ? '¡Guardado!' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}
