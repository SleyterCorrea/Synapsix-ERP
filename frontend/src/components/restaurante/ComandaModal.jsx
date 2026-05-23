/**
 * SYNAPSIX ERP — ComandaModal
 * Panel completo de una mesa: abrir comanda, agregar productos, cambiar estados.
 */
import { useState, useEffect } from 'react'
import { X, Plus, Minus, ShoppingCart, ChefHat, CheckCircle,
         Loader2, AlertCircle, Trash2, Receipt, Search } from 'lucide-react'
import clsx from 'clsx'
import api from '@api/axios'

const ITEM_ESTADO_COLOR = {
  pendiente: '#F39C12', en_cocina: '#2980B9', listo: '#27AE60', servido: '#7F8C8D', cancelado: '#C0392B',
}

export default function ComandaModal({ mesa, onClose, onUpdate }) {
  const [comanda, setComanda]     = useState(null)
  const [productos, setProductos] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState(null)
  const [tab, setTab]             = useState('comanda') // comanda | productos

  useEffect(() => {
    loadData()
  }, [mesa.id])

  const loadData = async () => {
    setLoading(true)
    try {
      const [prodRes, cmdRes] = await Promise.all([
        api.get('/inventario/products/?is_available=true'),
        mesa.comanda_activa_id
          ? api.get(`/restaurante/comandas/${mesa.comanda_activa_id}/`)
          : Promise.resolve(null),
      ])
      setProductos(Array.isArray(prodRes.data) ? prodRes.data : prodRes.data.results || [])
      setComanda(cmdRes?.data || null)
    } catch { } finally { setLoading(false) }
  }

  const abrirComanda = async () => {
    setSaving(true); setError(null)
    try {
      const res = await api.post('/restaurante/comandas/', { mesa: mesa.id, comensales: 1 })
      setComanda(res.data)
      onUpdate({ ...mesa, estado: 'ocupada', comanda_activa_id: res.data.id })
    } catch(e) { setError(e.response?.data?.detail || 'Error al abrir comanda.') }
    finally { setSaving(false) }
  }

  const agregarProducto = async (producto) => {
    if (!comanda) return
    setSaving(true); setError(null)
    try {
      const res = await api.post(`/restaurante/comandas/${comanda.id}/items/`, {
        producto: producto.id,
        cantidad: 1,
        precio_unit: producto.sale_price,
      })
      setComanda(res.data)
    } catch(e) { setError('Error al agregar producto.') }
    finally { setSaving(false) }
  }

  const cambiarEstadoItem = async (itemId, nuevoEstado) => {
    try {
      await api.patch(`/restaurante/comandas/${comanda.id}/items/${itemId}/`, { estado: nuevoEstado })
      const res = await api.get(`/restaurante/comandas/${comanda.id}/`)
      setComanda(res.data)
    } catch { setError('Error al actualizar item.') }
  }

  const cambiarEstadoComanda = async (nuevoEstado) => {
    setSaving(true)
    try {
      const res = await api.patch(`/restaurante/comandas/${comanda.id}/`, { estado: nuevoEstado })
      setComanda(res.data)
      if (nuevoEstado === 'pagada') {
        onUpdate({ ...mesa, estado: 'limpieza', comanda_activa_id: null })
        onClose()
      }
    } catch { setError('Error al cambiar estado.') }
    finally { setSaving(false) }
  }

  const filteredProductos = productos.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.includes(search)
  )

  const COMANDA_STATES = [
    { from: ['abierta'],            to: 'en_cocina',  label: 'Enviar a cocina',  icon: ChefHat,       color: '#2980B9' },
    { from: ['en_cocina'],          to: 'lista',      label: 'Lista para servir', icon: CheckCircle,  color: '#27AE60' },
    { from: ['lista'],              to: 'servida',    label: 'Servida',           icon: CheckCircle,  color: '#7F8C8D' },
    { from: ['servida','en_cocina','lista'], to: 'cuenta', label: 'Pedir cuenta', icon: Receipt,      color: '#8E44AD' },
    { from: ['cuenta','servida'],   to: 'pagada',     label: '✓ Cobrar',         icon: Receipt,      color: '#27AE60' },
  ]

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-2xl z-50 flex flex-col bg-synapsix-surface border-l border-synapsix-border shadow-spotlight" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center gap-4 px-5 py-4 border-b border-synapsix-border flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-synapsix-red/10 border border-synapsix-red/20 flex items-center justify-center font-black text-synapsix-red">
            {mesa.numero}
          </div>
          <div className="flex-1">
            <p className="font-bold text-synapsix-text">{mesa.nombre || `Mesa ${mesa.numero}`}</p>
            <p className="text-xs text-synapsix-muted">{mesa.zona} · {mesa.capacidad} personas</p>
          </div>
          <button onClick={onClose} className="text-synapsix-muted hover:text-synapsix-text-2 p-2 rounded-lg hover:bg-synapsix-surface-2 transition-colors"><X className="w-4 h-4" /></button>
        </div>

        {/* Tabs */}
        {comanda && (
          <div className="flex gap-1 px-5 pt-3 flex-shrink-0">
            {[{ id: 'comanda', label: 'Comanda', icon: ShoppingCart }, { id: 'productos', label: 'Agregar productos', icon: Plus }].map(t => {
              const Icon = t.icon
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={clsx('flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                    tab === t.id ? 'bg-synapsix-surface-3 text-synapsix-text border border-synapsix-border' : 'text-synapsix-muted hover:text-synapsix-text-2')}>
                  <Icon className="w-3.5 h-3.5" />{t.label}
                </button>
              )
            })}
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 text-synapsix-muted animate-spin" /></div>
        ) : !comanda ? (
          /* Sin comanda activa */
          <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <ShoppingCart className="w-10 h-10 text-emerald-400" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-synapsix-text">Mesa libre</h3>
              <p className="text-sm text-synapsix-muted mt-1">¿Abrir una nueva comanda para esta mesa?</p>
            </div>
            {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{error}</p>}
            <button onClick={abrirComanda} disabled={saving} className="btn-primary gap-2 text-base px-8 py-3">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              {saving ? 'Abriendo...' : 'Abrir Comanda'}
            </button>
          </div>
        ) : tab === 'comanda' ? (
          /* Vista de comanda */
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">{error}</p>}

              {/* Folio + estado */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-synapsix-muted">Folio</span>
                  <p className="font-black text-synapsix-text text-lg">{comanda.folio}</p>
                </div>
                <span className="text-sm font-bold px-3 py-1.5 rounded-xl border capitalize" style={{
                  color: ITEM_ESTADO_COLOR[comanda.estado] || '#7F8C8D',
                  borderColor: `${ITEM_ESTADO_COLOR[comanda.estado] || '#7F8C8D'}40`,
                  backgroundColor: `${ITEM_ESTADO_COLOR[comanda.estado] || '#7F8C8D'}15`,
                }}>{comanda.estado.replace('_',' ')}</span>
              </div>

              {/* Items */}
              {comanda.items?.length === 0 ? (
                <div className="py-8 text-center text-synapsix-muted">
                  <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Sin productos. Agrega desde la pestaña "Agregar productos".</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {comanda.items?.filter(i => !i.cancelado).map(item => (
                    <div key={item.id} className="flex items-center gap-3 glass rounded-xl border border-synapsix-border px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-synapsix-text">{item.producto_nombre}</p>
                        {item.notas && <p className="text-xs text-synapsix-muted">{item.notas}</p>}
                      </div>
                      <span className="text-xs text-synapsix-muted">×{parseFloat(item.cantidad).toFixed(0)}</span>
                      <span className="text-sm font-bold text-synapsix-text min-w-[60px] text-right">${parseFloat(item.subtotal).toFixed(2)}</span>
                      {/* Estado del item */}
                      <select value={item.estado} onChange={e => cambiarEstadoItem(item.id, e.target.value)}
                        className="text-[10px] rounded-lg px-1.5 py-1 border border-synapsix-border bg-synapsix-surface-2 text-synapsix-text-2 outline-none cursor-pointer"
                        style={{ color: ITEM_ESTADO_COLOR[item.estado] }}>
                        {['pendiente','en_cocina','listo','servido'].map(s =>
                          <option key={s} value={s}>{s.replace('_',' ')}</option>
                        )}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer con totales y acciones */}
            <div className="border-t border-synapsix-border p-5 flex-shrink-0 space-y-4">
              <div className="space-y-1.5 text-sm">
                {[
                  { label: 'Subtotal', value: comanda.subtotal },
                  { label: 'IVA (16%)', value: comanda.impuestos },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-synapsix-muted">
                    <span>{label}</span>
                    <span>${parseFloat(value).toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-black text-synapsix-text text-base border-t border-synapsix-border pt-1.5">
                  <span>Total</span>
                  <span>${parseFloat(comanda.total).toFixed(2)}</span>
                </div>
              </div>

              {/* Botones de estado */}
              <div className="flex gap-2 flex-wrap">
                {COMANDA_STATES.filter(s => s.from.includes(comanda.estado)).map(action => {
                  const Icon = action.icon
                  return (
                    <button key={action.to} onClick={() => cambiarEstadoComanda(action.to)}
                      disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: action.color }}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
                      {action.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        ) : (
          /* Tab: Agregar productos */
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-synapsix-muted" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar producto..."
                className="input-field pl-9 text-sm" autoFocus />
            </div>
            {filteredProductos.map(prod => (
              <button key={prod.id} onClick={() => agregarProducto(prod)} disabled={saving}
                className="w-full flex items-center gap-3 glass rounded-xl border border-synapsix-border px-4 py-3 hover:border-synapsix-border-2 hover:bg-synapsix-surface-2 transition-all text-left group">
                <div className="w-10 h-10 rounded-xl bg-synapsix-surface-3 flex items-center justify-center text-xl flex-shrink-0">📦</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-synapsix-text">{prod.name}</p>
                  {prod.sku && <p className="text-xs text-synapsix-muted font-mono">{prod.sku}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-synapsix-text">${parseFloat(prod.sale_price).toFixed(2)}</p>
                </div>
                <Plus className="w-5 h-5 text-synapsix-border-2 group-hover:text-synapsix-text-2 transition-colors flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
