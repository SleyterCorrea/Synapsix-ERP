/**
 * SYNAPSIX ERP — StockModal
 * Registrar entradas, salidas y ajustes de inventario.
 */
import { useState } from 'react'
import { X, TrendingUp, TrendingDown, RefreshCw, Loader2, AlertCircle } from 'lucide-react'
import clsx from 'clsx'
import api from '@api/axios'

const MOVEMENT_TYPES = [
  { value: 'in',          label: 'Entrada',        icon: TrendingUp,   color: '#27AE60' },
  { value: 'out',         label: 'Salida',          icon: TrendingDown, color: '#C0392B' },
  { value: 'adjustment',  label: 'Ajuste directo',  icon: RefreshCw,    color: '#F39C12' },
]

export default function StockModal({ product, onClose, onSave }) {
  const [form, setForm] = useState({
    movement_type: 'in',
    quantity: '',
    unit_cost: product.cost_price || '0',
    notes: '',
    reference: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const currentType = MOVEMENT_TYPES.find(t => t.value === form.movement_type)
  const qty = parseFloat(form.quantity) || 0
  const stockAfter = form.movement_type === 'in'
    ? parseFloat(product.stock_quantity) + qty
    : form.movement_type === 'out'
    ? parseFloat(product.stock_quantity) - qty
    : qty // adjustment

  const handleSave = async () => {
    if (!form.quantity || qty <= 0) { setError('Ingresa una cantidad válida'); return }
    setLoading(true); setError(null)
    try {
      await api.post('/inventario/stock-movements/', {
        product: product.id,
        ...form,
        quantity: qty,
      })
      onSave({ ...product, stock_quantity: stockAfter })
    } catch(e) { setError(JSON.stringify(e.response?.data) || 'Error.') }
    finally { setLoading(false) }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="bg-synapsix-surface border border-synapsix-border rounded-2xl shadow-spotlight overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-synapsix-border">
            <div>
              <p className="text-sm font-bold text-synapsix-text">Movimiento de stock</p>
              <p className="text-xs text-synapsix-muted">{product.name}</p>
            </div>
            <button onClick={onClose}><X className="w-4 h-4 text-synapsix-muted" /></button>
          </div>

          <div className="p-5 space-y-4">
            {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}

            {/* Stock actual */}
            <div className="glass rounded-xl border border-synapsix-border p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-synapsix-muted uppercase tracking-wider font-semibold">Stock actual</p>
                <p className="text-2xl font-black text-synapsix-text">{parseFloat(product.stock_quantity).toFixed(0)} <span className="text-sm text-synapsix-muted font-normal">unidades</span></p>
              </div>
              {qty > 0 && (
                <div className="text-right">
                  <p className="text-xs text-synapsix-muted uppercase tracking-wider font-semibold">Resultado</p>
                  <p className={clsx('text-2xl font-black', stockAfter < 0 ? 'text-red-400' : 'text-emerald-400')}>{stockAfter.toFixed(0)}</p>
                </div>
              )}
            </div>

            {/* Tipo de movimiento */}
            <div className="space-y-2">
              <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium">Tipo de movimiento</label>
              <div className="grid grid-cols-3 gap-2">
                {MOVEMENT_TYPES.map(t => {
                  const Icon = t.icon
                  return (
                    <button key={t.value} onClick={() => set('movement_type', t.value)}
                      className={clsx('p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1',
                        form.movement_type === t.value
                          ? 'border-current bg-opacity-10'
                          : 'border-synapsix-border hover:border-synapsix-border-2'
                      )}
                      style={form.movement_type === t.value ? { color: t.color, borderColor: t.color, backgroundColor: `${t.color}15` } : {}}>
                      <Icon className="w-5 h-5" />
                      <span className="text-[10px] font-semibold">{t.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Cantidad */}
            <div className="space-y-1.5">
              <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium">Cantidad</label>
              <input autoFocus type="number" min="0.001" step="0.001" value={form.quantity}
                onChange={e => set('quantity', e.target.value)}
                className="input-field text-xl font-bold text-center" placeholder="0" />
            </div>

            {/* Costo (solo en entradas) */}
            {form.movement_type === 'in' && (
              <div className="space-y-1.5">
                <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium">Costo unitario</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-synapsix-muted">$</span>
                  <input type="number" min="0" step="0.01" value={form.unit_cost}
                    onChange={e => set('unit_cost', e.target.value)} className="input-field pl-7" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium">Referencia</label>
                <input value={form.reference} onChange={e => set('reference', e.target.value)} className="input-field" placeholder="Factura #..." />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium">Notas</label>
                <input value={form.notes} onChange={e => set('notes', e.target.value)} className="input-field" placeholder="Opcional..." />
              </div>
            </div>
          </div>

          <div className="px-5 py-4 border-t border-synapsix-border flex items-center gap-2">
            <div className="flex-1" />
            <button onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
            <button onClick={handleSave} disabled={loading || !form.quantity}
              className="btn-primary text-sm gap-2"
              style={currentType ? { backgroundColor: currentType.color } : {}}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <currentType.icon className="w-4 h-4" />}
              {loading ? 'Registrando...' : `Registrar ${currentType?.label}`}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
