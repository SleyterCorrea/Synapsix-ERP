/**
 * SYNAPSIX ERP — Detalle de Factura
 * Pantalla dividida 50/50: izquierda = gestión, derecha = visor PDF.
 * Estilo Odoo Enterprise: pipeline de estados, chatter, apuntes contables.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Send, Printer, Eye, FileX, ArrowLeft, CheckCircle2, XCircle,
  AlertCircle, RefreshCw, Download, FileText, CreditCard,
  ChevronRight, User2, Clock, MessageSquare, BookOpen,
  Landmark, Receipt, Loader2,
} from 'lucide-react'
import api from '@api/axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (v, currency = 'MXN') =>
  parseFloat(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })

const STATE_PIPELINE = ['draft', 'posted', 'paid', 'cancelled']
const STATE_LABELS = {
  draft:     'Borrador',
  posted:    'Registrado',
  paid:      'Pagado',
  cancelled: 'Cancelado',
}
const STATE_COLORS = {
  draft:     '#94a3b8',
  posted:    '#a78bfa',
  paid:      '#34d399',
  cancelled: '#f87171',
}

// ─── Pipeline de estados ──────────────────────────────────────────────────────
const StatePipeline = ({ current }) => (
  <div className="flex items-center gap-1">
    {STATE_PIPELINE.filter(s => s !== 'cancelled').map((s, i) => {
      const idx      = STATE_PIPELINE.indexOf(current)
      const thisIdx  = STATE_PIPELINE.indexOf(s)
      const isPast   = thisIdx < idx && current !== 'cancelled'
      const isCurrent= s === current
      const isFuture = thisIdx > idx || current === 'cancelled'

      return (
        <div key={s} className="flex items-center gap-1">
          <div className="flex flex-col items-center">
            <div
              className="w-2 h-2 rounded-full transition-all"
              style={{
                background: isFuture ? 'rgba(255,255,255,0.1)' : STATE_COLORS[current],
                boxShadow: isCurrent ? `0 0 8px ${STATE_COLORS[current]}60` : 'none',
                transform: isCurrent ? 'scale(1.3)' : 'scale(1)',
              }}
            />
            <span
              className="text-[9px] mt-1 whitespace-nowrap font-medium"
              style={{ color: isFuture ? '#475569' : isCurrent ? STATE_COLORS[current] : '#94a3b8' }}
            >
              {STATE_LABELS[s]}
            </span>
          </div>
          {i < 2 && (
            <div
              className="w-8 h-px mb-3 transition-all"
              style={{ background: thisIdx < idx && current !== 'cancelled' ? STATE_COLORS[current] : 'rgba(255,255,255,0.08)' }}
            />
          )}
        </div>
      )
    })}
    {current === 'cancelled' && (
      <div className="flex items-center gap-1 ml-2">
        <XCircle size={12} className="text-red-400" />
        <span className="text-[9px] text-red-400 font-medium">Cancelado</span>
      </div>
    )}
  </div>
)

// ─── Chatter Item ─────────────────────────────────────────────────────────────
const ChatterItem = ({ item }) => {
  const isChange = item.entry_type === 'change'
  const isSystem = item.entry_type === 'system'
  const date     = new Date(item.created_at)
  const dateStr  = date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
  const timeStr  = date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className={`flex gap-3 ${isSystem ? 'items-center' : 'items-start'}`}>
      {isSystem ? (
        <div className="w-6 h-px bg-white/10 flex-1" />
      ) : (
        <div
          className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
          style={{
            background: isChange ? 'rgba(167,139,250,0.2)' : 'rgba(100,116,139,0.2)',
            border: `1px solid ${isChange ? 'rgba(167,139,250,0.3)' : 'rgba(100,116,139,0.2)'}`,
            color: isChange ? '#a78bfa' : '#94a3b8',
          }}
        >
          {item.author_initials}
        </div>
      )}

      {!isSystem && (
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[11px] font-semibold text-slate-300">{item.author_name}</span>
            <span className="text-[10px] text-slate-600">{dateStr} · {timeStr}</span>
          </div>
          <p
            className="text-xs text-slate-400 leading-relaxed"
            style={{ color: isChange ? '#c4b5fd' : '#94a3b8' }}
          >
            {isChange && '🔄 '}{item.body}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Tabla de Líneas ──────────────────────────────────────────────────────────
const InvoiceLines = ({ lines = [] }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {['Concepto', 'Cuenta', 'Cant.', 'P. Unit.', 'Desc.%', 'IVA%', 'Total'].map(h => (
            <th key={h} className="text-left px-3 py-2 text-[10px] text-slate-500 uppercase tracking-wider font-medium">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {lines.length === 0 && (
          <tr>
            <td colSpan={7} className="px-3 py-6 text-center text-slate-600 text-xs">
              No hay líneas. Edita la factura para agregar conceptos.
            </td>
          </tr>
        )}
        {lines.map((line, i) => (
          <tr
            key={line.id}
            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}
          >
            <td className="px-3 py-2 text-slate-300 font-medium">{line.product_name}</td>
            <td className="px-3 py-2 text-slate-600 font-mono text-[10px]">
              {line.account || '—'}
            </td>
            <td className="px-3 py-2 text-slate-400 tabular-nums">{parseFloat(line.quantity).toLocaleString()}</td>
            <td className="px-3 py-2 text-slate-400 tabular-nums">${fmt(line.price_unit)}</td>
            <td className="px-3 py-2 text-slate-500">{line.discount}%</td>
            <td className="px-3 py-2 text-slate-500">{line.tax_percentage}%</td>
            <td className="px-3 py-2 font-semibold text-white tabular-nums text-right">${fmt(line.amount_total)}</td>
          </tr>
        ))}
      </tbody>
      {lines.length > 0 && (
        <tfoot>
          <tr style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <td colSpan={5} />
            <td className="px-3 py-2 text-[10px] text-slate-500 text-right">Subtotal</td>
            <td className="px-3 py-2 text-slate-400 tabular-nums text-right">
              ${fmt(lines.reduce((s, l) => s + parseFloat(l.amount_subtotal || 0), 0))}
            </td>
          </tr>
          <tr>
            <td colSpan={5} />
            <td className="px-3 py-2 text-[10px] text-slate-500 text-right">IVA</td>
            <td className="px-3 py-2 text-slate-400 tabular-nums text-right">
              ${fmt(lines.reduce((s, l) => s + parseFloat(l.amount_tax || 0), 0))}
            </td>
          </tr>
          <tr style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <td colSpan={5} />
            <td className="px-3 py-2 text-xs font-bold text-white text-right">Total</td>
            <td className="px-3 py-2 text-sm font-bold text-white tabular-nums text-right">
              ${fmt(lines.reduce((s, l) => s + parseFloat(l.amount_total || 0), 0))}
            </td>
          </tr>
        </tfoot>
      )}
    </table>
  </div>
)

// ─── Apuntes Contables ───────────────────────────────────────────────────────
const JournalItems = ({ entry }) => {
  if (!entry) return (
    <div className="py-8 text-center">
      <BookOpen size={28} className="text-slate-700 mx-auto mb-2" />
      <p className="text-xs text-slate-600">El asiento se generará al confirmar la factura.</p>
    </div>
  )
  const items = entry.items || []
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] text-slate-600 font-mono">Asiento: {entry.reference}</span>
        <span className="text-[10px]" style={{ color: entry.is_balanced ? '#34d399' : '#f87171' }}>
          {entry.is_balanced ? '✓ Cuadrado' : '✗ Descuadrado'}
        </span>
      </div>
      <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {['Cuenta', 'Descripción', 'Débito', 'Crédito'].map(h => (
              <th key={h} className="text-left px-3 py-2 text-[10px] text-slate-500 uppercase tracking-wider font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <td className="px-3 py-2 font-mono text-[10px] text-slate-400">
                {item.account_code} — {item.account_name}
              </td>
              <td className="px-3 py-2 text-slate-500">{item.name || '—'}</td>
              <td className="px-3 py-2 tabular-nums text-emerald-400 text-right">
                {parseFloat(item.debit) > 0 ? `$${fmt(item.debit)}` : '—'}
              </td>
              <td className="px-3 py-2 tabular-nums text-red-400 text-right">
                {parseFloat(item.credit) > 0 ? `$${fmt(item.credit)}` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <tr>
            <td colSpan={2} className="px-3 py-2 text-[10px] font-bold text-slate-400">TOTAL</td>
            <td className="px-3 py-2 font-bold text-emerald-400 tabular-nums text-right">${fmt(entry.total_debit)}</td>
            <td className="px-3 py-2 font-bold text-red-400 tabular-nums text-right">${fmt(entry.total_credit)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function InvoiceDetailPage() {
  const { id }       = useParams()
  const navigate     = useNavigate()
  const chatterRef   = useRef(null)

  const [invoice, setInvoice]   = useState(null)
  const [entry, setEntry]       = useState(null)
  const [chatter, setChatter]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [actionLoad, setActionLoad] = useState(false)
  const [error, setError]       = useState(null)
  const [activeTab, setActiveTab]   = useState('lines')
  const [chatMsg, setChatMsg]   = useState('')
  const [msgLoading, setMsgLoading] = useState(false)

  const fetchInvoice = useCallback(async () => {
    setLoading(true)
    try {
      const [invRes, chatRes] = await Promise.all([
        api.get(`/facturacion/invoices/${id}/`),
        api.get(`/facturacion/invoices/${id}/chatter/`),
      ])
      setInvoice(invRes.data)
      // Cargar asiento si existe
      if (invRes.data.state !== 'draft') {
        try {
          const entryRes = await api.get(`/facturacion/entries/?invoice=${id}`)
          const items = Array.isArray(entryRes.data) ? entryRes.data : (entryRes.data.results || [])
          setEntry(items[0] || null)
        } catch { setEntry(null) }
      }
      const chatItems = Array.isArray(chatRes.data) ? chatRes.data : (chatRes.data.results || [])
      setChatter(chatItems)
    } catch (e) {
      setError('No se pudo cargar la factura.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchInvoice() }, [fetchInvoice])

  const handleAction = async (action) => {
    setActionLoad(true)
    try {
      await api.post(`/facturacion/invoices/${id}/action/`, { action })
      await fetchInvoice()
    } catch (e) {
      const msg = e.response?.data?.detail || 'Error al ejecutar la acción.'
      alert(msg)
    } finally {
      setActionLoad(false)
    }
  }

  const sendChatterMsg = async () => {
    const body = chatMsg.trim()
    if (!body) return
    setMsgLoading(true)
    try {
      await api.post(`/facturacion/invoices/${id}/chatter/`, { body, entry_type: 'message' })
      setChatMsg('')
      await fetchInvoice()
      setTimeout(() => chatterRef.current?.scrollIntoView({ behavior: 'smooth' }), 200)
    } catch { /* ignore */ }
    finally { setMsgLoading(false) }
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0d0d14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={28} className="text-violet-400 animate-spin" />
    </div>
  )

  if (error || !invoice) return (
    <div style={{ minHeight: '100vh', background: '#0d0d14', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <AlertCircle size={32} className="text-red-400" />
      <p className="text-sm text-slate-400">{error || 'Factura no encontrada.'}</p>
      <button onClick={() => navigate('/facturacion/facturas')} className="text-xs text-violet-400 underline">
        Volver a la lista
      </button>
    </div>
  )

  const isPaid      = invoice.state === 'paid'
  const isDraft     = invoice.state === 'draft'
  const isPosted    = invoice.state === 'posted'
  const isCancelled = invoice.state === 'cancelled'
  const stateColor  = STATE_COLORS[invoice.state] || '#94a3b8'

  const TABS = [
    { key: 'lines',   label: 'Líneas de factura', icon: Receipt },
    { key: 'entries', label: 'Apuntes contables', icon: BookOpen },
    { key: 'fiscal',  label: 'CFDI / Fiscal',     icon: Landmark },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d14', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header global ──────────────────────────────────────────────────── */}
      <header
        className="border-b flex-shrink-0 sticky top-0 z-20"
        style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(13,13,20,0.95)', backdropFilter: 'blur(12px)' }}
      >
        <div className="px-6 h-13 flex items-center gap-4 py-2.5">
          <button
            onClick={() => navigate('/facturacion/facturas')}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors"
          >
            <ArrowLeft size={13} />
            Facturas
          </button>
          <span className="text-slate-700">/</span>
          <span className="text-sm font-semibold text-white font-mono">
            {invoice.invoice_number || 'BORRADOR'}
          </span>

          {/* Pipeline de estado */}
          <div className="ml-4">
            <StatePipeline current={invoice.state} />
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {isDraft && (
              <>
                <ActionBtn
                  icon={Send}
                  label="Confirmar"
                  color="#a78bfa"
                  loading={actionLoad}
                  onClick={() => handleAction('confirm')}
                />
              </>
            )}
            {isPosted && (
              <ActionBtn
                icon={CheckCircle2}
                label="Registrar pago"
                color="#34d399"
                loading={actionLoad}
                onClick={() => handleAction('pay')}
              />
            )}
            {!isPaid && !isCancelled && (
              <ActionBtn
                icon={FileX}
                label="Cancelar"
                color="#f87171"
                loading={actionLoad}
                ghost
                onClick={() => {
                  if (window.confirm('¿Cancelar esta factura?')) handleAction('cancel')
                }}
              />
            )}
            <button
              title="Imprimir"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Printer size={14} />
            </button>
            <button
              title="Actualizar"
              onClick={fetchInvoice}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
            >
              <RefreshCw size={13} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Split panel ────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 52px)' }}>

        {/* ── PANEL IZQUIERDO ───────────────────────────────────────────── */}
        <div
          className="flex flex-col overflow-y-auto flex-shrink-0"
          style={{ width: '50%', borderRight: '1px solid rgba(255,255,255,0.06)' }}
        >
          {/* Listón PAGADO */}
          {isPaid && (
            <div
              className="flex items-center justify-center gap-2 py-2 text-xs font-bold tracking-widest uppercase"
              style={{
                background: 'linear-gradient(90deg, rgba(52,211,153,0.15) 0%, rgba(52,211,153,0.08) 100%)',
                borderBottom: '1px solid rgba(52,211,153,0.2)',
                color: '#34d399',
              }}
            >
              <CheckCircle2 size={14} />
              PAGADO — LIQUIDADO
            </div>
          )}
          {isCancelled && (
            <div
              className="flex items-center justify-center gap-2 py-2 text-xs font-bold tracking-widest uppercase"
              style={{
                background: 'rgba(239,68,68,0.08)',
                borderBottom: '1px solid rgba(239,68,68,0.15)',
                color: '#f87171',
              }}
            >
              <XCircle size={14} />
              CANCELADO
            </div>
          )}

          {/* Info de la factura */}
          <div className="px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Cliente / Proveedor" value={invoice.partner_data?.name || '—'} />
              <Field label="Diario" value={invoice.journal_data?.name || '—'} />
              <Field label="Fecha Emisión"   value={invoice.date || '—'} />
              <Field label="Fecha Vencimiento" value={invoice.due_date || '—'} highlight={invoice.state === 'posted' && invoice.is_overdue} />
              <Field label="UUID Fiscal" value={String(invoice.uuid_fiscal || '').slice(0, 18) + '…'} mono />
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-600 uppercase tracking-wider">Total a pagar</span>
                <span className="text-xl font-bold" style={{ color: stateColor }}>
                  ${fmt(invoice.total)}
                </span>
                {parseFloat(invoice.amount_due) > 0 && invoice.state !== 'paid' && (
                  <span className="text-[10px] text-slate-500">
                    Saldo: ${fmt(invoice.amount_due)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors"
                style={{
                  color: activeTab === tab.key ? stateColor : '#64748b',
                  borderBottom: activeTab === tab.key ? `2px solid ${stateColor}` : '2px solid transparent',
                }}
              >
                <tab.icon size={12} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Contenido de tabs */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {activeTab === 'lines'   && <InvoiceLines lines={invoice.lines || []} />}
            {activeTab === 'entries' && <JournalItems entry={entry} />}
            {activeTab === 'fiscal'  && (
              <FiscalTab invoice={invoice} />
            )}
          </div>

          {/* ── CHATTER ───────────────────────────────────────────────────── */}
          <div
            className="flex-shrink-0 border-t px-5 py-4"
            style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare size={13} className="text-slate-500" />
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                Historial de cambios
              </span>
            </div>

            {/* Mensajes */}
            <div className="space-y-3 max-h-40 overflow-y-auto mb-3 pr-1">
              {chatter.length === 0 && (
                <p className="text-xs text-slate-700 italic">Sin mensajes aún.</p>
              )}
              {[...chatter].reverse().map(item => (
                <ChatterItem key={item.id} item={item} />
              ))}
              <div ref={chatterRef} />
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Añadir nota o comentario…"
                value={chatMsg}
                onChange={e => setChatMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChatterMsg()}
                className="flex-1 text-xs px-3 py-2 rounded-xl text-slate-300 placeholder:text-slate-600 outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
              <button
                onClick={sendChatterMsg}
                disabled={!chatMsg.trim() || msgLoading}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
              >
                {msgLoading ? <Loader2 size={12} className="text-white animate-spin" /> : <Send size={12} className="text-white" />}
              </button>
            </div>
          </div>
        </div>

        {/* ── PANEL DERECHO: Visor PDF ──────────────────────────────────── */}
        <div
          className="flex-1 flex flex-col"
          style={{ background: '#1a1a28' }}
        >
          {invoice.pdf_url ? (
            <>
              <div
                className="flex items-center justify-between px-4 py-2.5 border-b flex-shrink-0"
                style={{ borderColor: 'rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-center gap-2">
                  <FileText size={13} className="text-red-400" />
                  <span className="text-xs text-slate-400">Vista previa del PDF</span>
                </div>
                <a
                  href={invoice.pdf_url}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-white transition-colors"
                >
                  <Download size={11} />
                  Descargar
                </a>
              </div>
              <iframe
                src={invoice.pdf_url}
                title="Factura PDF"
                className="flex-1 w-full border-0"
                style={{ background: '#fff' }}
              />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)' }}
              >
                <FileText size={32} className="text-slate-700" />
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Sin PDF generado</p>
                <p className="text-xs text-slate-700 max-w-xs">
                  El PDF de la factura se generará o podrás subir uno manualmente una vez confirmada.
                </p>
              </div>

              {/* Preview de los datos de la factura como documento */}
              <div
                className="mt-4 text-left rounded-xl p-5 w-full max-w-sm"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="text-center mb-4">
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Comprobante</p>
                  <p className="text-2xl font-black text-white font-mono mt-1">
                    {invoice.invoice_number || 'BORRADOR'}
                  </p>
                </div>
                <div className="space-y-2 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Cliente:</span>
                    <span className="text-slate-300">{invoice.partner_data?.name || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Fecha:</span>
                    <span className="text-slate-300">{invoice.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Subtotal:</span>
                    <span className="text-slate-300">${fmt(invoice.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">IVA:</span>
                    <span className="text-slate-300">${fmt(invoice.tax_amount)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1.5 mt-1.5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    <span className="text-slate-400 font-bold">TOTAL:</span>
                    <span className="font-bold text-white">${fmt(invoice.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Componentes auxiliares ───────────────────────────────────────────────────
const Field = ({ label, value, mono, highlight }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[10px] text-slate-600 uppercase tracking-wider">{label}</span>
    <span
      className={`text-xs font-medium ${mono ? 'font-mono' : ''}`}
      style={{ color: highlight ? '#f87171' : '#cbd5e1' }}
    >
      {value}
    </span>
  </div>
)

const ActionBtn = ({ icon: Icon, label, color, loading, ghost, onClick }) => (
  <button
    onClick={onClick}
    disabled={loading}
    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
    style={ghost
      ? { color, border: `1px solid ${color}40`, background: `${color}10` }
      : { background: `linear-gradient(135deg, ${color}dd, ${color}99)`, color: '#fff' }
    }
  >
    {loading ? <Loader2 size={12} className="animate-spin" /> : <Icon size={12} />}
    {label}
  </button>
)

const FiscalTab = ({ invoice }) => (
  <div className="space-y-3">
    <Field label="UUID Fiscal" value={invoice.uuid_fiscal} mono />
    <Field label="Tipo de comprobante" value={invoice.type_display} />
    <Field label="RFC / RUC del cliente" value={invoice.partner_data?.tax_id || '—'} mono />
    <Field label="Dirección fiscal" value={invoice.partner_data?.address || '—'} />
    {invoice.xml_url && (
      <div className="mt-4">
        <a
          href={invoice.xml_url}
          download
          className="flex items-center gap-2 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          <Download size={13} />
          Descargar XML / CFDI
        </a>
      </div>
    )}
    {!invoice.xml_url && (
      <p className="text-xs text-slate-700 mt-3">Sin archivo XML generado.</p>
    )}
  </div>
)
