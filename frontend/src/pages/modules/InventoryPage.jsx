/**
 * SYNAPSIX ERP — InventoryPage
 * Catálogo de productos con categorías, filtros, stock y movimientos.
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Package, Plus, Search, Filter, Grid3x3, List,
  AlertTriangle, ChevronRight, Edit3, Trash2, TrendingUp,
  TrendingDown, RefreshCw, Loader2, X, Tag,
} from 'lucide-react'
import clsx from 'clsx'
import api from '@api/axios'
import useTenantStore from '@store/tenantStore'
import ProductModal from '@components/inventory/ProductModal'
import StockModal from '@components/inventory/StockModal'

const TYPE_LABELS = { product:'Físico', service:'Servicio', consumable:'Consumible', digital:'Digital' }
const TYPE_COLORS = { product:'#C0392B', service:'#2980B9', consumable:'#F39C12', digital:'#8E44AD' }

function StockBadge({ product }) {
  if (!product.track_stock) return <span className="text-[10px] text-synapsix-muted">Sin control</span>
  const pct = product.min_stock > 0 ? (product.stock_quantity / product.min_stock) : 1
  const low = product.stock_quantity <= product.min_stock
  return (
    <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full border',
      low ? 'text-red-400 bg-red-500/10 border-red-500/30 animate-pulse'
          : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20')}>
      {low && <AlertTriangle className="w-3 h-3 inline mr-0.5" />}
      {parseFloat(product.stock_quantity).toFixed(0)} uds
    </span>
  )
}

function ProductCard({ product, onEdit, onStock, view }) {
  const typeColor = TYPE_COLORS[product.product_type] || '#7F8C8D'
  if (view === 'list') return (
    <div className="flex items-center gap-4 glass rounded-xl border border-synapsix-border px-4 py-3 hover:border-synapsix-border-2 hover:bg-synapsix-surface-2 transition-all group">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
        style={{ backgroundColor: `${typeColor}18`, border: `1.5px solid ${typeColor}30` }}>
        {product.image ? <img src={product.image} className="w-full h-full object-cover rounded-xl" alt="" /> : '📦'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-synapsix-text truncate">{product.name}</p>
          {product.sku && <span className="text-[10px] text-synapsix-muted bg-synapsix-surface-3 px-1.5 py-0.5 rounded-md border border-synapsix-border font-mono">{product.sku}</span>}
        </div>
        <p className="text-xs text-synapsix-muted truncate">{product.category_name || 'Sin categoría'}</p>
      </div>
      <StockBadge product={product} />
      <div className="text-right min-w-[80px]">
        <p className="text-sm font-bold text-synapsix-text">${parseFloat(product.sale_price).toFixed(2)}</p>
        <p className="text-[10px] text-synapsix-muted">costo: ${parseFloat(product.cost_price).toFixed(2)}</p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onStock(product)} title="Movimiento stock" className="w-8 h-8 rounded-lg flex items-center justify-center text-synapsix-muted hover:text-blue-400 hover:bg-blue-500/10 transition-colors"><TrendingUp className="w-4 h-4" /></button>
        <button onClick={() => onEdit(product)} className="w-8 h-8 rounded-lg flex items-center justify-center text-synapsix-muted hover:text-synapsix-text-2 hover:bg-synapsix-surface-3 transition-colors"><Edit3 className="w-4 h-4" /></button>
      </div>
    </div>
  )
  return (
    <div className="glass rounded-2xl border border-synapsix-border overflow-hidden hover:border-synapsix-border-2 hover:scale-[1.01] transition-all duration-200 group cursor-pointer flex flex-col">
      <div className="h-32 flex items-center justify-center text-4xl relative"
        style={{ backgroundColor: `${typeColor}12` }}>
        {product.image
          ? <img src={product.image} className="w-full h-full object-cover" alt="" />
          : <span className="text-4xl">📦</span>
        }
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={e => { e.stopPropagation(); onStock(product) }} className="w-7 h-7 rounded-lg bg-synapsix-surface/90 backdrop-blur-sm text-blue-400 flex items-center justify-center hover:bg-synapsix-surface-2"><TrendingUp className="w-3.5 h-3.5" /></button>
          <button onClick={e => { e.stopPropagation(); onEdit(product) }} className="w-7 h-7 rounded-lg bg-synapsix-surface/90 backdrop-blur-sm text-synapsix-muted flex items-center justify-center hover:bg-synapsix-surface-2"><Edit3 className="w-3.5 h-3.5" /></button>
        </div>
        {product.stock_quantity <= product.min_stock && product.track_stock && (
          <div className="absolute top-2 left-2">
            <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5">
              <AlertTriangle className="w-2.5 h-2.5" /> Stock bajo
            </span>
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div>
          <p className="text-sm font-bold text-synapsix-text leading-tight">{product.name}</p>
          {product.sku && <p className="text-[10px] text-synapsix-muted font-mono mt-0.5">{product.sku}</p>}
        </div>
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-synapsix-border">
          <StockBadge product={product} />
          <p className="text-base font-black text-synapsix-text">${parseFloat(product.sale_price).toFixed(2)}</p>
        </div>
      </div>
    </div>
  )
}

export default function InventoryPage() {
  const navigate = useNavigate()
  const { primaryColor } = useTenantStore()
  const [products, setProducts]     = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [catFilter, setCatFilter]   = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [view, setView]             = useState('grid')
  const [modalProduct, setModalProduct] = useState(null) // null=closed, {}=create, product=edit
  const [stockProduct, setStockProduct] = useState(null)
  const [showLowStock, setShowLowStock] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [pRes, cRes] = await Promise.all([
        api.get('/inventario/products/'),
        api.get('/inventario/categories/'),
      ])
      setProducts(Array.isArray(pRes.data) ? pRes.data : pRes.data.results || [])
      setCategories(Array.isArray(cRes.data) ? cRes.data : cRes.data.results || [])
    } catch { } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = products.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !p.sku?.toLowerCase().includes(search.toLowerCase())) return false
    if (catFilter && p.category !== catFilter) return false
    if (typeFilter && p.product_type !== typeFilter) return false
    if (showLowStock && !(p.track_stock && p.stock_quantity <= p.min_stock)) return false
    return true
  })
  const lowStockCount = products.filter(p => p.track_stock && p.stock_quantity <= p.min_stock).length

  const handleSave = (product, isEdit) => {
    if (isEdit) setProducts(prev => prev.map(p => p.id === product.id ? product : p))
    else setProducts(prev => [product, ...prev])
  }
  const handleDelete = (id) => setProducts(prev => prev.filter(p => p.id !== id))

  return (
    <div className="min-h-screen bg-synapsix-dark">
      <header className="border-b border-synapsix-border glass sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <button onClick={() => navigate('/launchpad')} className="text-synapsix-muted hover:text-synapsix-text-2 transition-colors"><ArrowLeft className="w-5 h-5" /></button>
          <Package className="w-5 h-5" style={{ color: primaryColor }} />
          <h1 className="text-base font-bold text-synapsix-text flex-1">Inventario</h1>
          {lowStockCount > 0 && (
            <button onClick={() => setShowLowStock(!showLowStock)}
              className={clsx('flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-colors',
                showLowStock ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-red-500/10 border-red-500/20 text-red-400 hover:border-red-500/40')}>
              <AlertTriangle className="w-3.5 h-3.5" /> {lowStockCount} stock bajo
            </button>
          )}
          <button onClick={() => setModalProduct({})} className="btn-primary gap-2 h-9 text-sm">
            <Plus className="w-4 h-4" /> Nuevo producto
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Productos', value: products.length, color: primaryColor },
            { label: 'Categorías', value: categories.length, color: '#2980B9' },
            { label: 'Stock bajo', value: lowStockCount, color: '#C0392B' },
            { label: 'Valor inventario', value: `$${products.reduce((s,p)=>s+parseFloat(p.stock_quantity||0)*parseFloat(p.cost_price||0),0).toFixed(0)}`, color: '#27AE60' },
          ].map(({ label, value, color }) => (
            <div key={label} className="glass rounded-xl border border-synapsix-border p-4">
              <p className="text-xl font-black text-synapsix-text">{value}</p>
              <p className="text-[10px] text-synapsix-muted uppercase tracking-wider font-semibold">{label}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-synapsix-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre o SKU..."
              className="input-field pl-9 text-sm" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-synapsix-muted"><X className="w-3.5 h-3.5" /></button>}
          </div>
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="input-field text-sm w-auto min-w-[150px]">
            <option value="">Todas las categorías</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input-field text-sm w-auto">
            <option value="">Todos los tipos</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <div className="flex items-center gap-1 border border-synapsix-border rounded-xl p-1">
            <button onClick={() => setView('grid')} className={clsx('w-7 h-7 rounded-lg flex items-center justify-center transition-colors', view==='grid'?'bg-synapsix-surface-3 text-synapsix-text-2':'text-synapsix-muted hover:text-synapsix-text-2')}>
              <Grid3x3 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setView('list')} className={clsx('w-7 h-7 rounded-lg flex items-center justify-center transition-colors', view==='list'?'bg-synapsix-surface-3 text-synapsix-text-2':'text-synapsix-muted hover:text-synapsix-text-2')}>
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
          <button onClick={fetchData} className="text-synapsix-muted hover:text-synapsix-text-2 p-2 rounded-xl hover:bg-synapsix-surface-2 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Grid / Lista */}
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-synapsix-muted animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <Package className="w-14 h-14 text-synapsix-muted opacity-20 mx-auto" />
            <p className="text-synapsix-muted">{products.length === 0 ? 'Sin productos aún' : 'Sin resultados'}</p>
            {products.length === 0 && <button onClick={() => setModalProduct({})} className="btn-primary gap-2"><Plus className="w-4 h-4" />Agregar primer producto</button>}
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map(p => <ProductCard key={p.id} product={p} view="grid" onEdit={setModalProduct} onStock={setStockProduct} />)}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(p => <ProductCard key={p.id} product={p} view="list" onEdit={setModalProduct} onStock={setStockProduct} />)}
          </div>
        )}
      </main>

      {modalProduct !== null && (
        <ProductModal
          product={Object.keys(modalProduct).length ? modalProduct : null}
          categories={categories}
          onClose={() => setModalProduct(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
      {stockProduct && (
        <StockModal product={stockProduct} onClose={() => setStockProduct(null)} onSave={p => { setProducts(prev => prev.map(x => x.id === p.id ? { ...x, stock_quantity: p.stock_quantity } : x)); setStockProduct(null) }} />
      )}
    </div>
  )
}
