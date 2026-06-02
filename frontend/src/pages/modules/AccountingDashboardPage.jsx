/**
 * SYNAPSIX ERP — Tablero de Contabilidad
 * Diseño inspirado en Odoo Enterprise: tarjetas oscuras por diario,
 * bancos dinámicos con saldos reales y accesos rápidos.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, Landmark, Plus, ArrowRight,
  FileText, AlertCircle, Clock, CheckCircle2, RefreshCw,
  CreditCard, Building2, ReceiptText, ChevronRight,
} from 'lucide-react'
import api from '@api/axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// ─── Mini gráfico de barras inline ──────────────────────────────────────────
const MiniBarChart = ({ values = [], colors = [] }) => {
  const max = Math.max(...values, 1)
  return (
    <div className="flex items-end gap-0.5 h-8">
      {values.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm transition-all duration-500"
          style={{
            height: `${Math.max((v / max) * 100, 5)}%`,
            backgroundColor: colors[i] || '#475569',
            opacity: 0.85,
          }}
          title={`${v}`}
        />
      ))}
    </div>
  )
}

// ─── Tarjeta de Estado ───────────────────────────────────────────────────────
const StatPill = ({ label, count, amount, color }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</span>
    <span className="text-lg font-bold" style={{ color }}>{count}</span>
    <span className="text-[11px] text-slate-400">
      ${parseFloat(amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
    </span>
  </div>
)

// ─── Tarjeta de Diario ───────────────────────────────────────────────────────
const JournalCard = ({ data, icon: Icon, accentColor, onClick }) => {
  const barValues = [data.draft_count, data.posted_count, data.overdue_count]
  const barColors = ['#475569', accentColor, '#ef4444']

  return (
    <div
      onClick={onClick}
      className="group relative rounded-2xl p-5 cursor-pointer transition-all duration-200 hover:scale-[1.01]"
      style={{
        background: 'linear-gradient(135deg, #1a1a24 0%, #141420 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${accentColor}20`, border: `1px solid ${accentColor}30` }}
          >
            <Icon size={18} style={{ color: accentColor }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{data.journal_name}</p>
            <p className="text-[10px] text-slate-500 font-mono">[{data.journal_code}]</p>
          </div>
        </div>
        <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors mt-1" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatPill
          label="Por validar"
          count={data.draft_count}
          amount={data.draft_amount}
          color="#94a3b8"
        />
        <StatPill
          label="Sin pagar"
          count={data.posted_count}
          amount={data.posted_amount}
          color={accentColor}
        />
        <StatPill
          label="Atrasado"
          count={data.overdue_count}
          amount={data.overdue_amount}
          color="#ef4444"
        />
      </div>

      {/* Mini chart */}
      <MiniBarChart values={barValues} colors={barColors} />
    </div>
  )
}

// ─── Tarjeta de Banco ────────────────────────────────────────────────────────
const BankCard = ({ bank, onTransactions }) => {
  const balance  = parseFloat(bank.balance || 0)
  const positive = balance >= 0

  const currencyMap = {
    MXN: 'MX$', PEN: 'S/.', USD: 'US$', COP: 'COP$', EUR: '€', GTQ: 'Q',
  }
  const symbol = currencyMap[bank.currency] || bank.currency

  return (
    <div
      className="flex items-center justify-between rounded-xl px-4 py-3 transition-all duration-200 hover:bg-white/[0.04]"
      style={{ border: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center flex-shrink-0">
          <Landmark size={16} className="text-slate-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-white leading-tight">{bank.name}</p>
          <p className="text-[10px] text-slate-500">{bank.bank_name} · {bank.account_code}</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p
            className="text-sm font-bold tabular-nums"
            style={{ color: positive ? '#34d399' : '#f87171' }}
          >
            {symbol} {Math.abs(balance).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-600">{bank.currency}</p>
        </div>
        <button
          onClick={() => onTransactions(bank)}
          className="text-[10px] text-slate-400 border border-slate-700 hover:border-slate-500 hover:text-white px-2.5 py-1 rounded-lg transition-colors"
        >
          Transacciones
        </button>
      </div>
    </div>
  )
}

// ─── PÁGINA PRINCIPAL ────────────────────────────────────────────────────────
export default function AccountingDashboardPage() {
  const navigate = useNavigate()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const fetchDashboard = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/facturacion/dashboard/')
      setData(res.data)
    } catch (e) {
      setError('No se pudo cargar el tablero contable.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDashboard() }, [])

  const toInvoices = (type = 'sale') =>
    navigate(`/facturacion/facturas?type=${type}`)

  const toTransactions = (bank) =>
    navigate(`/facturacion/entries?account=${bank.account_code}`)

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0d0d14', fontFamily: 'Inter, sans-serif' }}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="h-8 w-48 rounded-lg bg-white/5 animate-pulse mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-44 rounded-2xl bg-white/[0.03] animate-pulse border border-white/5" />
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d14', fontFamily: 'Inter, sans-serif' }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header
        className="border-b sticky top-0 z-10"
        style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(13,13,20,0.9)', backdropFilter: 'blur(12px)' }}
      >
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/launchpad')}
              className="text-slate-500 hover:text-slate-300 transition-colors text-xs"
            >
              ← Inicio
            </button>
            <span className="text-slate-700">/</span>
            <div className="flex items-center gap-2">
              <ReceiptText size={16} className="text-violet-400" />
              <span className="text-sm font-semibold text-white">Contabilidad</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchDashboard}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Actualizar"
            >
              <RefreshCw size={14} />
            </button>
            <button
              onClick={() => navigate('/facturacion/facturas/nueva')}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff' }}
            >
              <Plus size={13} />
              Nueva Factura
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">

        {error && (
          <div className="flex items-center gap-3 rounded-xl px-4 py-3 mb-6 text-sm text-red-400 bg-red-500/10 border border-red-500/20">
            <AlertCircle size={16} />
            {error}
            <button onClick={fetchDashboard} className="ml-auto text-xs underline">Reintentar</button>
          </div>
        )}

        {data && (
          <>
            {/* ── Sección Ventas ─────────────────────────────────────────── */}
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-emerald-400" />
                  <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
                    Facturas de Clientes
                  </h2>
                  <span className="text-xs text-slate-600 ml-1">
                    ({data.sales.length} diarios)
                  </span>
                </div>
                <button
                  onClick={() => toInvoices('sale')}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Ver todas <ArrowRight size={12} />
                </button>
              </div>

              {data.sales.length === 0 ? (
                <div className="rounded-xl border border-white/5 p-6 text-center">
                  <FileText size={28} className="text-slate-700 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No hay diarios de venta configurados.</p>
                  <p className="text-xs text-slate-600 mt-1">Crea un diario de tipo "Ventas" desde Configuración.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {data.sales.map(j => (
                    <JournalCard
                      key={j.journal_id}
                      data={j}
                      icon={TrendingUp}
                      accentColor="#a78bfa"
                      onClick={() => toInvoices('sale')}
                    />
                  ))}
                  {/* Card "Nueva operación" */}
                  <button
                    onClick={() => navigate('/facturacion/facturas/nueva?type=sale')}
                    className="rounded-2xl p-5 flex flex-col items-center justify-center gap-2 text-slate-600 hover:text-slate-400 transition-all duration-200 border-2 border-dashed hover:border-slate-600 min-h-[176px]"
                    style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}
                  >
                    <Plus size={22} />
                    <span className="text-xs font-medium">Nueva factura de venta</span>
                  </button>
                </div>
              )}
            </section>

            {/* ── Sección Compras ────────────────────────────────────────── */}
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingDown size={16} className="text-orange-400" />
                  <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
                    Facturas de Proveedores
                  </h2>
                </div>
                <button
                  onClick={() => toInvoices('purchase')}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Ver todas <ArrowRight size={12} />
                </button>
              </div>

              {data.purchases.length === 0 ? (
                <div className="rounded-xl border border-white/5 p-6 text-center">
                  <FileText size={28} className="text-slate-700 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No hay diarios de compra configurados.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {data.purchases.map(j => (
                    <JournalCard
                      key={j.journal_id}
                      data={j}
                      icon={TrendingDown}
                      accentColor="#fb923c"
                      onClick={() => toInvoices('purchase')}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* ── Sección Bancos ─────────────────────────────────────────── */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Landmark size={16} className="text-cyan-400" />
                  <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
                    Cuentas Bancarias
                  </h2>
                  <span className="text-xs text-slate-600">({data.banks.length})</span>
                </div>
                <button
                  onClick={() => navigate('/facturacion/bancos')}
                  className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1"
                >
                  Administrar <ArrowRight size={12} />
                </button>
              </div>

              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #1a1a24 0%, #141420 100%)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {data.banks.length === 0 ? (
                  <div className="p-8 text-center">
                    <Landmark size={32} className="text-slate-700 mx-auto mb-3" />
                    <p className="text-sm text-slate-500 mb-1">No hay cuentas bancarias configuradas.</p>
                    <p className="text-xs text-slate-600 mb-4">
                      Crea una cuenta bancaria para ver el saldo en tiempo real.
                    </p>
                    <button
                      onClick={() => navigate('/facturacion/bancos')}
                      className="text-xs text-violet-400 border border-violet-500/30 hover:bg-violet-500/10 px-4 py-1.5 rounded-lg transition-colors"
                    >
                      + Agregar banco
                    </button>
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    {data.banks.map(bank => (
                      <BankCard
                        key={bank.id}
                        bank={bank}
                        onTransactions={toTransactions}
                      />
                    ))}
                    <div className="px-4 py-2.5">
                      <button
                        onClick={() => navigate('/facturacion/bancos')}
                        className="text-[11px] text-slate-600 hover:text-slate-400 flex items-center gap-1 transition-colors"
                      >
                        <Plus size={11} /> Agregar cuenta bancaria
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* ── Accesos rápidos ────────────────────────────────────────── */}
            <section className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Clientes', icon: Building2, path: '/facturacion/partners?type=customer', color: '#a78bfa' },
                { label: 'Proveedores', icon: CreditCard, path: '/facturacion/partners?type=supplier', color: '#fb923c' },
                { label: 'Plan de Cuentas', icon: FileText, path: '/facturacion/accounts', color: '#34d399' },
                { label: 'Asientos', icon: ReceiptText, path: '/facturacion/entries', color: '#60a5fa' },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  className="group flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm text-slate-400 hover:text-white transition-all duration-200"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <item.icon size={15} style={{ color: item.color }} />
                  <span className="text-xs font-medium">{item.label}</span>
                  <ChevronRight size={12} className="ml-auto text-slate-700 group-hover:text-slate-500" />
                </button>
              ))}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
