/**
 * SYNAPSIX ERP — CalendarSettingsSection
 * Sincronización con Outlook y Google Calendar (estilo Odoo)
 */
import { useState, useEffect } from 'react'
import {
  Calendar, CheckCircle, AlertCircle, Loader2, Save,
  ExternalLink, RefreshCw, Unplug, Globe,
} from 'lucide-react'
import clsx from 'clsx'
import api from '@api/axios'

function Toggle({ checked, onChange, disabled }) {
  return (
    <button type="button" onClick={() => !disabled && onChange(!checked)} disabled={disabled}
      className={clsx(
        'relative flex-shrink-0 rounded-full transition-colors',
        checked ? 'bg-blue-500' : 'bg-synapsix-surface-3',
        disabled && 'opacity-40 cursor-not-allowed'
      )}
      style={{ width: 42, height: 24 }}>
      <span className="absolute top-[3px] rounded-full bg-white shadow transition-all"
        style={{ width: 18, height: 18, left: checked ? 21 : 3 }} />
    </button>
  )
}

function Field({ label, children, hint, error }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-synapsix-muted uppercase tracking-wider">{label}</label>
      {children}
      {hint && !error && <p className="text-[10px] text-synapsix-muted-2">{hint}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

function SyncCard({ title, subtitle, icon: Icon, color, connected, fields, onToggle, toggleKey, children }) {
  return (
    <div className={clsx(
      'glass rounded-2xl border p-5 space-y-4 transition-all',
      connected ? 'border-blue-500/30 bg-blue-500/5' : 'border-synapsix-border'
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          <div>
            <p className="text-sm font-bold text-synapsix-text">{title}</p>
            <p className="text-xs text-synapsix-muted">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {connected && <span className="badge-active text-[10px]">✓ Conectado</span>}
          <Toggle checked={connected} onChange={onToggle} />
        </div>
      </div>
      {connected && children}
    </div>
  )
}

export default function CalendarSettingsSection() {
  const [settings, setSettings] = useState({
    outlook_enabled:      false,
    outlook_client_id:    '',
    outlook_client_secret:'',
    outlook_pause:        false,
    google_enabled:       false,
    google_client_id:     '',
    google_client_secret: '',
    google_pause:         false,
  })
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [toast, setToast]       = useState(null)

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 4000) }

  useEffect(() => {
    api.get('/core/settings/calendario/').then(r => {
      setSettings(s => ({ ...s, ...r.data }))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const set = (k, v) => setSettings(s => ({ ...s, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.patch('/core/settings/calendario/', settings)
      showToast('success', '¡Ajustes del calendario guardados!')
    } catch {
      showToast('error', 'Error al guardar.')
    } finally { setSaving(false) }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-synapsix-muted" /></div>

  return (
    <div className="space-y-6 animate-fade-in">

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

      <div>
        <h2 className="text-xl font-black text-synapsix-text">Ajustes del Calendario</h2>
        <p className="text-sm text-synapsix-muted mt-0.5">Sincroniza el calendario con servicios externos</p>
      </div>

      {/* ── Outlook ─────────────────────────────────────────────────────── */}
      <SyncCard
        title="Calendario de Outlook"
        subtitle="Sincronice su calendario con Microsoft Outlook / Office 365"
        icon={Globe} color="#0078D4"
        connected={settings.outlook_enabled}
        onToggle={v => set('outlook_enabled', v)}
      >
        <div className="space-y-4 pt-2 border-t border-synapsix-border">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="ID de cliente (Client ID)" hint="Obtén esto en el portal de Azure AD">
              <input
                value={settings.outlook_client_id}
                onChange={e => set('outlook_client_id', e.target.value)}
                className="input-field font-mono text-xs"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
            </Field>
            <Field label="Secreto de cliente (Client Secret)">
              <input
                type="password"
                value={settings.outlook_client_secret}
                onChange={e => set('outlook_client_secret', e.target.value)}
                className="input-field font-mono text-xs"
                placeholder="••••••••••••••••••••••••••••••"
              />
            </Field>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-synapsix-surface-2 border border-synapsix-border">
            <div>
              <p className="text-xs font-medium text-synapsix-text-2">Pausar sincronización</p>
              <p className="text-[10px] text-synapsix-muted">Detiene la sincronización sin desconectar la cuenta</p>
            </div>
            <Toggle checked={settings.outlook_pause} onChange={v => set('outlook_pause', v)} />
          </div>
          <a href="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
            <ExternalLink className="w-3.5 h-3.5" /> Abrir portal de Azure para registrar la app
          </a>
        </div>
      </SyncCard>

      {/* ── Google ──────────────────────────────────────────────────────── */}
      <SyncCard
        title="Calendario de Google"
        subtitle="Sincronice su calendario con Google Calendar"
        icon={Calendar} color="#4285F4"
        connected={settings.google_enabled}
        onToggle={v => set('google_enabled', v)}
      >
        <div className="space-y-4 pt-2 border-t border-synapsix-border">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="ID de cliente (Client ID)" hint="Obtén esto en Google Cloud Console">
              <input
                value={settings.google_client_id}
                onChange={e => set('google_client_id', e.target.value)}
                className="input-field font-mono text-xs"
                placeholder="123456789-abc.apps.googleusercontent.com"
              />
            </Field>
            <Field label="Secreto de cliente (Client Secret)">
              <input
                type="password"
                value={settings.google_client_secret}
                onChange={e => set('google_client_secret', e.target.value)}
                className="input-field font-mono text-xs"
                placeholder="GOCSPX-••••••••••••••••"
              />
            </Field>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-synapsix-surface-2 border border-synapsix-border">
            <div>
              <p className="text-xs font-medium text-synapsix-text-2">Pausar sincronización</p>
              <p className="text-[10px] text-synapsix-muted">Detiene la sincronización sin desconectar la cuenta</p>
            </div>
            <Toggle checked={settings.google_pause} onChange={v => set('google_pause', v)} />
          </div>
          <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
            <ExternalLink className="w-3.5 h-3.5" /> Abrir Google Cloud Console para credenciales
          </a>
        </div>
      </SyncCard>

      {/* Información */}
      <div className="glass rounded-xl border border-synapsix-border p-4 space-y-2">
        <p className="text-xs font-bold text-synapsix-text-2">¿Cómo funciona?</p>
        <ol className="text-xs text-synapsix-muted space-y-1 list-decimal list-inside">
          <li>Registra la app en el portal del proveedor (Azure o Google Cloud)</li>
          <li>Copia el Client ID y Client Secret aquí</li>
          <li>Activa la sincronización y guarda</li>
          <li>Los eventos se sincronizarán automáticamente</li>
        </ol>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn-primary gap-2 px-6">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Guardando...' : 'Guardar ajustes'}
        </button>
      </div>
    </div>
  )
}
