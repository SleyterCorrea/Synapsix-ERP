/**
 * SYNAPSIX ERP — ProductModal
 * Crear y editar productos del inventario.
 */
import { useState } from 'react'
import { X, Package, Save, Loader2, AlertCircle, Trash2, Camera } from 'lucide-react'
import api from '@api/axios'

const PRODUCT_TYPES = [
  { value: 'product',    label: 'Producto Físico' },
  { value: 'service',    label: 'Servicio'         },
  { value: 'consumable', label: 'Consumible'       },
  { value: 'digital',    label: 'Digital'          },
]

export default function ProductModal({ product, categories, onClose, onSave, onDelete }) {
  const isEdit = !!product
  const [form, setForm] = useState(product || {
    name: '', sku: '', barcode: '', description: '',
    product_type: 'product', category: '',
    cost_price: '0', sale_price: '0', tax_rate: '16',
    track_stock: true, stock_quantity: '0', min_stock: '0', max_stock: '0',
    is_active: true, is_available: true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [tab, setTab]         = useState('basic')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) { setError('El nombre es requerido'); return }
    setLoading(true); setError(null)
    try {
      const payload = { ...form, category: form.category || null }
      if (isEdit) {
        const r = await api.patch(`/inventario/products/${product.id}/`, payload)
        onSave(r.data, true)
      } else {
        const r = await api.post('/inventario/products/', payload)
        onSave(r.data, false)
      }
      onClose()
    } catch(e) { setError(JSON.stringify(e.response?.data) || 'Error al guardar.') }
    finally { setLoading(false) }
  }

  const handleDelete = async () => {
    if (!confirm(`¿Desactivar "${product.name}"?`)) return
    setLoading(true)
    try {
      await api.delete(`/inventario/products/${product.id}/`)
      onDelete(product.id); onClose()
    } catch { setError('Error.') } finally { setLoading(false) }
  }

  const margin = form.cost_price > 0
    ? (((form.sale_price - form.cost_price) / form.sale_price) * 100).toFixed(1)
    : 0

  const TABS = [
    { id: 'basic', label: 'General' },
    { id: 'price', label: 'Precios' },
    { id: 'stock', label: 'Stock'   },
  ]

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
        <div className="bg-synapsix-surface border border-synapsix-border rounded-2xl shadow-spotlight overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-synapsix-border flex-shrink-0">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-synapsix-muted" />
              <span className="text-sm font-bold text-synapsix-text">{isEdit ? 'Editar producto' : 'Nuevo producto'}</span>
            </div>
            <button onClick={onClose}><X className="w-4 h-4 text-synapsix-muted" /></button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-5 pt-3 flex-shrink-0">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-synapsix-surface-3 text-synapsix-text border border-synapsix-border' : 'text-synapsix-muted hover:text-synapsix-text-2'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="p-5 overflow-y-auto flex-1 space-y-4">
            {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2"><AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{error}</p>}

            {tab === 'basic' && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium">Nombre *</label>
                  <input autoFocus value={form.name} onChange={e => set('name', e.target.value)} className="input-field" placeholder="Nombre del producto..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium">SKU</label>
                    <input value={form.sku} onChange={e => set('sku', e.target.value)} className="input-field font-mono" placeholder="PRD-001" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium">Código de barras</label>
                    <input value={form.barcode} onChange={e => set('barcode', e.target.value)} className="input-field font-mono" placeholder="7501234..." />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium">Tipo</label>
                    <select value={form.product_type} onChange={e => set('product_type', e.target.value)} className="input-field text-sm">
                      {PRODUCT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium">Categoría</label>
                    <select value={form.category || ''} onChange={e => set('category', e.target.value)} className="input-field text-sm">
                      <option value="">Sin categoría</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium">Descripción</label>
                  <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} className="input-field resize-none" placeholder="Descripción del producto..." />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="w-4 h-4 rounded" />
                    <span className="text-xs text-synapsix-text-2">Activo</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.is_available} onChange={e => set('is_available', e.target.checked)} className="w-4 h-4 rounded" />
                    <span className="text-xs text-synapsix-text-2">Disponible para venta</span>
                  </label>
                </div>
              </>
            )}

            {tab === 'price' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium">Precio de Costo</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-synapsix-muted text-sm">$</span>
                      <input type="number" min="0" step="0.01" value={form.cost_price} onChange={e => set('cost_price', e.target.value)} className="input-field pl-7" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium">Precio de Venta</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-synapsix-muted text-sm">$</span>
                      <input type="number" min="0" step="0.01" value={form.sale_price} onChange={e => set('sale_price', e.target.value)} className="input-field pl-7" />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium">IVA / Impuesto (%)</label>
                  <input type="number" min="0" max="100" step="0.01" value={form.tax_rate} onChange={e => set('tax_rate', e.target.value)} className="input-field w-32" />
                </div>
                {/* Summary */}
                <div className="glass rounded-xl border border-synapsix-border p-4 space-y-2">
                  <p className="text-xs text-synapsix-muted uppercase tracking-wider font-semibold">Resumen de precios</p>
                  {[
                    { label: 'Costo', value: `$${parseFloat(form.cost_price || 0).toFixed(2)}` },
                    { label: 'Precio sin IVA', value: `$${parseFloat(form.sale_price || 0).toFixed(2)}` },
                    { label: `IVA (${form.tax_rate}%)`, value: `$${(parseFloat(form.sale_price || 0) * parseFloat(form.tax_rate || 0) / 100).toFixed(2)}` },
                    { label: 'Precio final', value: `$${(parseFloat(form.sale_price || 0) * (1 + parseFloat(form.tax_rate || 0) / 100)).toFixed(2)}`, bold: true },
                    { label: 'Margen bruto', value: `${margin}%`, colored: true },
                  ].map(({ label, value, bold, colored }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-synapsix-muted">{label}</span>
                      <span className={bold ? 'font-black text-synapsix-text' : colored ? (margin > 0 ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold') : 'text-synapsix-text-2'}>{value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {tab === 'stock' && (
              <>
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-synapsix-border hover:bg-synapsix-surface-2">
                  <input type="checkbox" checked={form.track_stock} onChange={e => set('track_stock', e.target.checked)} className="w-4 h-4 rounded" />
                  <div>
                    <p className="text-sm font-medium text-synapsix-text">Controlar inventario</p>
                    <p className="text-xs text-synapsix-muted">Registra entradas, salidas y alertas de stock</p>
                  </div>
                </label>
                {form.track_stock && (
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { key: 'stock_quantity', label: 'Stock actual', disabled: isEdit },
                      { key: 'min_stock',      label: 'Mínimo (alerta)' },
                      { key: 'max_stock',      label: 'Máximo' },
                    ].map(({ key, label, disabled }) => (
                      <div key={key} className="space-y-1.5">
                        <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium">{label}</label>
                        <input type="number" min="0" step="0.001" value={form[key]} onChange={e => set(key, e.target.value)}
                          disabled={disabled} className={`input-field ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} />
                        {disabled && <p className="text-[10px] text-synapsix-muted-2">Usa movimientos de stock</p>}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-synapsix-border flex items-center gap-2 flex-shrink-0">
            {isEdit && <button onClick={handleDelete} disabled={loading} className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 px-3 py-2 rounded-xl hover:bg-red-500/10 transition-colors"><Trash2 className="w-3.5 h-3.5" />Desactivar</button>}
            <div className="flex-1" />
            <button onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
            <button onClick={handleSave} disabled={loading} className="btn-primary text-sm gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {loading ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear producto'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
