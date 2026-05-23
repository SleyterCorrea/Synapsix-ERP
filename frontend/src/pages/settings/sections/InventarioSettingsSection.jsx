/**
 * SYNAPSIX ERP — InventarioSettingsSection
 * Ajustes de inventario con importación/exportación masiva
 */
import { useState, useRef } from 'react'
import {
  Package, Upload, Download, FileText, AlertCircle, CheckCircle,
  Loader2, Save, Trash2, ToggleLeft, HardDrive,
} from 'lucide-react'
import clsx from 'clsx'
import api from '@api/axios'

function Toggle({ checked, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={clsx('relative flex-shrink-0 rounded-full transition-colors', checked ? 'bg-emerald-500' : 'bg-synapsix-surface-3')}
      style={{ width: 42, height: 24 }}>
      <span className="absolute top-[3px] rounded-full bg-white shadow transition-all" style={{ width: 18, height: 18, left: checked ? 21 : 3 }} />
    </button>
  )
}

export default function InventarioSettingsSection() {
  const [importing, setImporting]   = useState(false)
  const [exporting, setExporting]   = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [toast, setToast]           = useState(null)
  const [settings, setSettings]     = useState({
    track_serial:     false,
    track_lot:        false,
    track_location:   true,
    negative_stock:   false,
    auto_reorder:     false,
    reorder_threshold: 5,
    default_uom:      'unit',
  })
  const fileRef = useRef(null)

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 4500) }
  const set = (k, v) => setSettings(s => ({ ...s, [k]: v }))

  // ── Exportar productos como CSV ──────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await api.get('/inventario/products/export/', { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a   = document.createElement('a')
      a.href    = url
      a.download = `inventario_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      showToast('success', 'Exportación completada.')
    } catch {
      showToast('error', 'Error al exportar. Intenta de nuevo.')
    } finally { setExporting(false) }
  }

  // ── Importar productos desde CSV ─────────────────────────────────────────
  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowed = ['text/csv', 'application/vnd.ms-excel', 'text/plain']
    if (!allowed.includes(file.type) && !file.name.endsWith('.csv')) {
      showToast('error', 'Solo archivos CSV son aceptados.')
      return
    }
    setImporting(true); setImportResult(null)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await api.post('/inventario/products/import/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setImportResult({ type: 'success', created: res.data.created, updated: res.data.updated, errors: res.data.errors || [] })
      showToast('success', `✓ ${res.data.created} creados, ${res.data.updated} actualizados.`)
    } catch (err) {
      setImportResult({ type: 'error', msg: err.response?.data?.detail || 'Error al importar.' })
      showToast('error', 'Error al importar.')
    } finally { setImporting(false); e.target.value = '' }
  }

  const handleSaveSettings = async () => {
    try {
      await api.patch('/core/settings/inventario/', settings)
      showToast('success', '¡Ajustes guardados!')
    } catch { showToast('error', 'Error al guardar.') }
  }

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
        <h2 className="text-xl font-black text-synapsix-text">Ajustes de Inventario</h2>
        <p className="text-sm text-synapsix-muted mt-0.5">Configuración de seguimiento, alertas e importación masiva</p>
      </div>

      {/* ── Importar / Exportar ──────────────────────────────────────────── */}
      <div className="glass rounded-2xl border border-synapsix-border p-6 space-y-4">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-synapsix-muted" />
          <h3 className="text-sm font-bold text-synapsix-text-2">Importar / Exportar masivo</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Importar */}
          <div className="rounded-2xl border border-dashed border-synapsix-border p-5 space-y-3 hover:border-synapsix-border-2 transition-colors">
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-emerald-400" />
              <p className="text-sm font-semibold text-synapsix-text">Importar productos</p>
            </div>
            <p className="text-xs text-synapsix-muted">
              Sube un archivo CSV con columnas:<br />
              <code className="text-synapsix-muted-2">nombre, sku, precio, costo, stock, categoria, unidad</code>
            </p>
            <div className="flex gap-2">
              <button onClick={() => fileRef.current?.click()} disabled={importing}
                className="btn-secondary gap-2 text-sm flex-1">
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {importing ? 'Importando...' : 'Elegir archivo CSV'}
              </button>
              <a href="/plantilla_inventario.csv" download
                className="btn-secondary text-sm px-3" title="Descargar plantilla">
                <FileText className="w-4 h-4" />
              </a>
            </div>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleImport} />

            {/* Resultado de importación */}
            {importResult && (
              <div className={clsx(
                'rounded-xl p-3 text-xs space-y-1',
                importResult.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'
              )}>
                {importResult.type === 'success' ? (
                  <>
                    <p className="font-bold">✓ Importación exitosa</p>
                    <p>Creados: <strong>{importResult.created}</strong> · Actualizados: <strong>{importResult.updated}</strong></p>
                    {importResult.errors?.length > 0 && (
                      <p className="text-yellow-400">Filas con error: {importResult.errors.length}</p>
                    )}
                  </>
                ) : <p>{importResult.msg}</p>}
              </div>
            )}
          </div>

          {/* Exportar */}
          <div className="rounded-2xl border border-synapsix-border p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-400" />
              <p className="text-sm font-semibold text-synapsix-text">Exportar productos</p>
            </div>
            <p className="text-xs text-synapsix-muted">
              Descarga todo el catálogo en formato CSV. Incluye nombre, SKU, precios, stock y categorías.
            </p>
            <button onClick={handleExport} disabled={exporting}
              className="btn-secondary gap-2 text-sm w-full">
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {exporting ? 'Exportando...' : 'Descargar CSV completo'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Configuración de seguimiento ─────────────────────────────────── */}
      <div className="glass rounded-2xl border border-synapsix-border p-6 space-y-4">
        <h3 className="text-sm font-bold text-synapsix-text-2 flex items-center gap-2">
          <Package className="w-4 h-4 text-synapsix-muted" /> Seguimiento y control
        </h3>
        <div className="space-y-3">
          {[
            { key: 'track_serial',   label: 'Seguimiento por número de serie',    desc: 'Rastrea cada unidad individualmente con número único' },
            { key: 'track_lot',      label: 'Seguimiento por lote',               desc: 'Agrupa productos en lotes para trazabilidad' },
            { key: 'track_location', label: 'Seguimiento de ubicaciones',          desc: 'Gestiona ubicaciones específicas dentro del almacén' },
            { key: 'negative_stock', label: 'Permitir stock negativo',             desc: 'Permite ventas aunque el stock sea 0 (bajo riesgo)' },
            { key: 'auto_reorder',   label: 'Reabastecimiento automático',         desc: 'Crea órdenes de compra cuando el stock baja del umbral' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-synapsix-surface-2 border border-synapsix-border">
              <div>
                <p className="text-sm font-medium text-synapsix-text-2">{label}</p>
                <p className="text-[10px] text-synapsix-muted">{desc}</p>
              </div>
              <Toggle checked={settings[key]} onChange={v => set(key, v)} />
            </div>
          ))}
        </div>

        {settings.auto_reorder && (
          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-medium text-synapsix-muted uppercase tracking-wider">Umbral de reabastecimiento</label>
            <div className="flex items-center gap-3">
              <input type="number" min="1" max="1000"
                value={settings.reorder_threshold}
                onChange={e => set('reorder_threshold', parseInt(e.target.value) || 5)}
                className="input-field max-w-[120px] text-center text-lg font-bold"
              />
              <span className="text-xs text-synapsix-muted">unidades mínimas antes de reordenar</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button onClick={handleSaveSettings} className="btn-primary gap-2 px-6">
          <Save className="w-4 h-4" /> Guardar ajustes
        </button>
      </div>
    </div>
  )
}
