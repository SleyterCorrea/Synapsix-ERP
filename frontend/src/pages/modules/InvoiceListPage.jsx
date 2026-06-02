/**
 * SYNAPSIX ERP — Lista de Facturas
 * Tabla completa con tabs (Cliente / Proveedor), badges de estado,
 * búsqueda en tiempo real y navegación al detalle.
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Plus, Search, FileText, Download, AlertCircle,
  Paperclip, RefreshCw, ChevronDown, X, ReceiptText,
} from 'lucide-react'
import api from '@api/axios'

// ─── Badges de estado ────────────────────────────────────────────────────────
const STATE_CONFIG = {
  draft:     { label: 'Borrador',    bg: 'rgba(100,116,139,0.15)', color: '#94a3b8', border: 'rgba(100,116,139,0.25)' },
  posted:    { label: 'Registrado',  bg: 'rgba(139,92,246,0.15)',  color: '#a78bfa', border: 'rgba(139,92,246,0.25)' },
  paid:      { label: 'Pagado',      bg: 'rgba(52,211,153,0.15)',  color: '#34d399', border: 'rgba(52,211,153,0.25)' },
  cancelled: { label: 'Cancelado',   bg: 'rgba(239,68,68,0.12)',   color: '#f87171', border: 'rgba(239,68,68,0.2)' },
}

const StateBadge = ({ state }) => {
  const cfg = STATE_CONFIG[state] || STATE_CONFIG.draft
  return (
    <span
      className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
    >
      {cfg.label}
    </span>
  )
}

// ─── Skeleton row ────────────────────────────────────────────────────────────
const SkeletonRow = () => (
  <tr>
    {[...Array(7)].map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className="h-3 bg-white/5 rounded animate-pulse" style={{ width: i === 1 ? '80%' : '60%' }} />
      </td>
    ))}
  </tr>
)

// ─── Formateo ────────────────────────────────────────────────────────────────
const fmt = (v) => parseFloat(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })

// ─── PÁGINA ──────────────────────────────────────────────────────────────────
export default function InvoiceListPage() {
  const navigate          = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const activeType = searchParams.get('type') || 'sale'
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [search, setSearch]     = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [total, setTotal]       = useState(0)

  const TABS = [
    { key: 'sale',     label: 'Facturas de Clientes',    color: '#a78bfa' },
    { key: 'purchase', label: 'Facturas de Proveedores', color: '#fb923c' },
    { key: 'credit',   label: 'Notas de Crédito',        color: '#60a5fa' },
  ]

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ invoice_type: activeType })
      if (search)      params.append('search', search)
      if (stateFilter) params.append('state', stateFilter)
      const res = await api.get(`/facturacion/invoices/?${params}`)
      // DRF puede retornar array o { count, results }
      const results = Array.isArray(res.data) ? res.data : (res.data.results || [])
      setInvoices(results)
      setTotal(Array.isArray(res.data) ? results.length : (res.data.count || results.length))
    } catch (e) {
      setError('No se pudieron cargar las facturas.')
    } finally {
      setLoading(false)
    }
  }, [activeType, search, stateFilter])

  useEffect(() => { fetchInvoices() }, [fetchInvoices])

  const handleTabChange = (key) => {
    setSearchParams({ type: key })
    setSearch('')
    setStateFilter('')
  }

  const activeTab = TABS.find(t => t.key === activeType) || TABS[0]

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d14', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header
        className="border-b sticky top-0 z-10"
        style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(13,13,20,0.9)', backdropFilter: 'blur(12px)' }}
      >
        <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/facturacion')} className="text-slate-500 hover:text-slate-300 text-xs transition-colors">
              ← Contabilidad
            </button>
            <span className="text-slate-700">/</span>
            <div className="flex items-center gap-2">
              <ReceiptText size={15} className="text-violet-400" />
              <span className="text-sm font-semibold text-white">Facturas</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchInvoices}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
            >
              <RefreshCw size={13} />
            </button>
            <button
              onClick={() => navigate(`/facturacion/facturas/nueva?type=${activeType}`)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
              style={{ background: `linear-gradient(135deg, ${activeTab.color}cc, ${activeTab.color}99)`, color: '#fff' }}
            >
              <Plus size={13} />
              Nueva {activeType === 'sale' ? 'Factura' : activeType === 'purchase' ? 'Compra' : 'Nota'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-6">

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <div className="flex border-b mt-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className="relative px-5 py-3.5 text-xs font-medium transition-colors"
              style={{
                color: activeType === tab.key ? tab.color : '#64748b',
                borderBottom: activeType === tab.key ? `2px solid ${tab.color}` : '2px solid transparent',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Barra de filtros ───────────────────────────────────────────── */}
        <div className="flex items-center gap-3 py-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por número o cliente…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs text-slate-300 rounded-xl outline-none transition-colors"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Filtro por estado */}
          <div className="relative">
            <select
              value={stateFilter}
              onChange={e => setStateFilter(e.target.value)}
              className="appearance-none text-xs text-slate-300 pl-3 pr-7 py-2 rounded-xl outline-none cursor-pointer"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <option value="">Todos los estados</option>
              <option value="draft">Borrador</option>
              <option value="posted">Registrado</option>
              <option value="paid">Pagado</option>
              <option value="cancelled">Cancelado</option>
            </select>
            <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>

          <span className="text-xs text-slate-600 ml-auto">
            {total} registro{total !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ── Error ──────────────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl px-4 py-3 mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20">
            <AlertCircle size={15} />
            {error}
          </div>
        )}

        {/* ── Tabla ──────────────────────────────────────────────────────── */}
        <div
          className="rounded-2xl overflow-hidden mb-8"
          style={{ border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <table className="w-full text-xs text-left" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Número', 'Cliente / Proveedor', 'Fecha emisión', 'Vencimiento', 'Impuesto', 'Total', 'Adj.', 'Estado'].map(col => (
                  <th key={col} className="px-4 py-3 text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && [...Array(5)].map((_, i) => <SkeletonRow key={i} />)}

              {!loading && invoices.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <div className="py-16 text-center">
                      <FileText size={32} className="text-slate-700 mx-auto mb-3" />
                      <p className="text-sm text-slate-500">No hay facturas que mostrar.</p>
                      <p className="text-xs text-slate-600 mt-1">
                        {search ? 'Prueba con otro término de búsqueda.' : 'Crea tu primera factura con el botón superior.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && invoices.map((inv, i) => (
                <tr
                  key={inv.id}
                  onClick={() => navigate(`/facturacion/facturas/${inv.id}`)}
                  className="cursor-pointer transition-colors"
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}
                >
                  {/* Número */}
                  <td className="px-4 py-3">
                    <span className="font-mono font-semibold text-white">
                      {inv.invoice_number || <span className="text-slate-600 italic">Borrador</span>}
                    </span>
                  </td>

                  {/* Partner */}
                  <td className="px-4 py-3">
                    <span className="text-slate-300">{inv.partner_name || '—'}</span>
                  </td>

                  {/* Fecha emisión */}
                  <td className="px-4 py-3 text-slate-400 tabular-nums">
                    {inv.date || '—'}
                  </td>

                  {/* Vencimiento */}
                  <td className="px-4 py-3">
                    {inv.due_date ? (
                      <span className={inv.is_overdue ? 'text-red-400 font-medium' : 'text-slate-400'}>
                        {inv.due_date}
                        {inv.is_overdue && <span className="ml-1 text-[9px] text-red-400 font-semibold">VENCIDA</span>}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>

                  {/* Impuesto */}
                  <td className="px-4 py-3 text-slate-400 tabular-nums text-right">
                    ${fmt(inv.tax_amount)}
                  </td>

                  {/* Total */}
                  <td className="px-4 py-3 font-semibold text-white tabular-nums text-right">
                    ${fmt(inv.total)}
                  </td>

                  {/* Adjuntos */}
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {inv.has_pdf && (
                        <span title="PDF" className="text-slate-500 hover:text-red-400 transition-colors">
                          <Paperclip size={12} />
                        </span>
                      )}
                      {inv.has_xml && (
                        <span title="XML" className="text-slate-500 hover:text-emerald-400 transition-colors">
                          <Download size={12} />
                        </span>
                      )}
                      {!inv.has_pdf && !inv.has_xml && (
                        <span className="text-slate-700">—</span>
                      )}
                    </div>
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-3">
                    <StateBadge state={inv.state} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
