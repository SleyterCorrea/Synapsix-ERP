/**
 * SYNAPSIX ERP — CocinaPage
 * Vista de cocina en tiempo real: todas las comandas activas con sus items.
 * WebSocket: recibe cocina_alert y comanda_update para actualizarse automáticamente.
 * Items agrupados por comanda — la cocina marca como "listo".
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChefHat, ArrowLeft, RefreshCw, Wifi, WifiOff,
  Clock, CheckCircle, Utensils, Loader2, Volume2,
} from 'lucide-react'
import clsx from 'clsx'
import api from '@api/axios'
import { useWebSocket } from '@hooks/useWebSocket'

// ─── Colores por estado de item ────────────────────────────────────────────────
const ITEM_ESTADOS = {
  pendiente: { label: 'Pendiente', color: '#F39C12', bg: 'bg-amber-500/10 border-amber-500/30' },
  en_cocina: { label: 'En cocina', color: '#2980B9', bg: 'bg-blue-500/10 border-blue-500/30'  },
  listo:     { label: 'Listo ✓',   color: '#27AE60', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  servido:   { label: 'Servido',   color: '#7F8C8D', bg: 'bg-gray-500/10 border-gray-500/20'  },
}

function fmtAge(isoStr) {
  const mins = Math.floor((Date.now() - new Date(isoStr)) / 60000)
  if (mins < 1) return 'ahora'
  if (mins === 1) return '1 min'
  return `${mins} min`
}

// ─── Tarjeta de comanda para cocina ──────────────────────────────────────────
function ComandaCard({ comanda, onItemUpdate }) {
  const items = (comanda.items || []).filter(i => !i.cancelado && i.estado !== 'servido')
  const hasUrgent = items.some(i => {
    const mins = Math.floor((Date.now() - new Date(i.created_at)) / 60000)
    return mins > 10 && i.estado !== 'listo'
  })

  return (
    <div className={clsx(
      'glass rounded-2xl border flex flex-col gap-0 overflow-hidden transition-all',
      hasUrgent ? 'border-red-500/50 shadow-[0_0_20px_rgba(192,57,43,0.2)]' : 'border-synapsix-border',
    )}>
      {/* Header de la comanda */}
      <div className={clsx(
        'px-4 py-3 flex items-center justify-between border-b border-synapsix-border',
        hasUrgent ? 'bg-red-500/10' : 'bg-synapsix-surface-2/50'
      )}>
        <div className="flex items-center gap-3">
          <div className={clsx(
            'w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg',
            hasUrgent ? 'bg-red-500/20 text-red-400' : 'bg-synapsix-red/10 text-synapsix-red'
          )}>
            {comanda.mesa_numero}
          </div>
          <div>
            <p className="text-sm font-bold text-synapsix-text">{comanda.folio}</p>
            <p className="text-[10px] text-synapsix-muted flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {fmtAge(comanda.created_at)}
              {hasUrgent && <span className="text-red-400 font-semibold ml-1">⚠ Urgente</span>}
            </p>
          </div>
        </div>
        <span className="text-xs font-bold text-synapsix-muted">
          {items.filter(i => i.estado === 'listo').length}/{items.length} listos
        </span>
      </div>

      {/* Items */}
      <div className="divide-y divide-synapsix-border">
        {items.length === 0 ? (
          <p className="text-xs text-synapsix-muted text-center py-4">Sin items pendientes</p>
        ) : (
          items.map(item => {
            const cfg = ITEM_ESTADOS[item.estado] || ITEM_ESTADOS.pendiente
            const mins = Math.floor((Date.now() - new Date(item.created_at)) / 60000)
            return (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-synapsix-text">
                      × {parseFloat(item.cantidad).toFixed(0)}
                    </span>
                    <span className="text-sm text-synapsix-text-2 truncate">{item.producto_nombre}</span>
                  </div>
                  {item.notas && (
                    <p className="text-xs text-amber-400 mt-0.5">📝 {item.notas}</p>
                  )}
                  <p className="text-[10px] text-synapsix-muted mt-0.5">{fmtAge(item.created_at)}</p>
                </div>

                {/* Botón de estado */}
                {item.estado === 'pendiente' && (
                  <button onClick={() => onItemUpdate(comanda.id, item.id, 'en_cocina')}
                    className="text-xs px-3 py-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors font-semibold whitespace-nowrap">
                    → Cocinar
                  </button>
                )}
                {item.estado === 'en_cocina' && (
                  <button onClick={() => onItemUpdate(comanda.id, item.id, 'listo')}
                    className="text-xs px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors font-semibold whitespace-nowrap flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Listo
                  </button>
                )}
                {item.estado === 'listo' && (
                  <span className="text-xs px-3 py-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 font-semibold">
                    ✓ Listo
                  </span>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ─── COCINA PAGE ──────────────────────────────────────────────────────────────
export default function CocinaPage() {
  const navigate = useNavigate()
  const [comandas, setComandas]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)
  const audioRef = useRef(null)

  const fetchComandas = useCallback(async () => {
    try {
      const res = await api.get('/restaurante/comandas/?estado=en_cocina')
      const data = Array.isArray(res.data) ? res.data : res.data.results || []
      // También traer abiertas que tienen items en cocina
      const res2 = await api.get('/restaurante/comandas/?estado=abierta')
      const data2 = Array.isArray(res2.data) ? res2.data : res2.data.results || []
      const all = [...data, ...data2].filter(c =>
        (c.items || []).some(i => ['pendiente', 'en_cocina'].includes(i.estado) && !i.cancelado)
      )
      setComandas(all)
      setLastUpdate(new Date())
    } catch { } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchComandas()
    // Polling de respaldo cada 30s
    const interval = setInterval(fetchComandas, 30000)
    return () => clearInterval(interval)
  }, [fetchComandas])

  // ─── WebSocket ───────────────────────────────────────────────────────────
  const { status: wsStatus } = useWebSocket('/ws/restaurante/', {
    onMessage: (msg) => {
      if (msg.type === 'cocina_alert' || msg.type === 'comanda_update') {
        const comanda = msg.comanda
        if (!comanda) return
        const hasWork = (comanda.items || []).some(
          i => ['pendiente', 'en_cocina'].includes(i.estado) && !i.cancelado
        )
        setComandas(prev => {
          const filtered = prev.filter(c => c.id !== comanda.id)
          return hasWork ? [comanda, ...filtered] : filtered
        })
        setLastUpdate(new Date())
        // Notificación sonora en nueva comanda
        if (msg.type === 'cocina_alert') {
          audioRef.current?.play?.().catch(() => {})
        }
      }
    },
  })

  const handleItemUpdate = async (comandaId, itemId, nuevoEstado) => {
    // Optimistic update
    setComandas(prev => prev.map(c => c.id === comandaId ? {
      ...c,
      items: c.items.map(i => i.id === itemId ? { ...i, estado: nuevoEstado } : i)
    } : c))

    try {
      await api.patch(`/restaurante/comandas/${comandaId}/items/${itemId}/`, { estado: nuevoEstado })
    } catch {
      // Revertir si falla
      fetchComandas()
    }
  }

  // Columnas: pendiente / en_cocina / todos listos
  const pendientes = comandas.filter(c => (c.items || []).some(i => i.estado === 'pendiente' && !i.cancelado))
  const enCocina   = comandas.filter(c =>
    !(c.items || []).some(i => i.estado === 'pendiente' && !i.cancelado) &&
    (c.items || []).some(i => i.estado === 'en_cocina' && !i.cancelado)
  )
  const listos = comandas.filter(c =>
    (c.items || []).filter(i => !i.cancelado && i.estado !== 'servido').every(i => i.estado === 'listo')
    && (c.items || []).some(i => !i.cancelado)
  )

  return (
    <div className="min-h-screen bg-synapsix-dark">
      {/* Audio oculto para alerta sonora */}
      <audio ref={audioRef} preload="none">
        <source src="/notification.mp3" type="audio/mpeg" />
      </audio>

      {/* Header */}
      <header className="border-b border-synapsix-border glass sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-4 h-14 flex items-center gap-4">
          <button onClick={() => navigate('/restaurante')} className="text-synapsix-muted hover:text-synapsix-text-2 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <ChefHat className="w-5 h-5 text-orange-400" />
          <h1 className="text-base font-black text-synapsix-text flex-1">Vista Cocina</h1>

          {/* Última actualización */}
          {lastUpdate && (
            <span className="text-xs text-synapsix-muted">
              Actualizado {lastUpdate.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}

          {/* WS status */}
          <div className={clsx('flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl',
            wsStatus === 'connected' ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10')}>
            {wsStatus === 'connected'
              ? <><Wifi className="w-3.5 h-3.5" /> Tiempo real</>
              : <><WifiOff className="w-3.5 h-3.5" /> Reconectando...</>
            }
          </div>

          <button onClick={fetchComandas} className="text-synapsix-muted hover:text-synapsix-text-2 p-2 rounded-xl hover:bg-synapsix-surface-2 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-center space-y-3">
            <Loader2 className="w-10 h-10 text-synapsix-muted animate-spin mx-auto" />
            <p className="text-synapsix-muted text-sm">Cargando comandas...</p>
          </div>
        </div>
      ) : comandas.length === 0 ? (
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-center space-y-4">
            <ChefHat className="w-16 h-16 text-synapsix-muted opacity-20 mx-auto" />
            <p className="text-xl font-bold text-synapsix-text">Sin pedidos activos</p>
            <p className="text-synapsix-muted text-sm">Los nuevos pedidos aparecerán aquí automáticamente</p>
          </div>
        </div>
      ) : (
        <main className="max-w-[1600px] mx-auto px-4 py-5">
          {/* Contador rápido */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Nuevos pedidos',  count: pendientes.length, color: '#F39C12', icon: '🔴' },
              { label: 'En preparación', count: enCocina.length,   color: '#2980B9', icon: '🔵' },
              { label: 'Listos p/ servir', count: listos.length,   color: '#27AE60', icon: '✅' },
            ].map(({ label, count, color, icon }) => (
              <div key={label} className="glass rounded-2xl border border-synapsix-border p-4 flex items-center gap-4">
                <span className="text-3xl">{icon}</span>
                <div>
                  <p className="text-3xl font-black" style={{ color }}>{count}</p>
                  <p className="text-xs text-synapsix-muted font-semibold uppercase tracking-wider">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Grid de columnas tipo Kanban */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Pendientes */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-amber-500/30">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider">Nuevos ({pendientes.length})</h2>
              </div>
              {pendientes.length === 0
                ? <p className="text-xs text-synapsix-muted text-center py-8">Sin nuevos pedidos 🎉</p>
                : pendientes.map(c => <ComandaCard key={c.id} comanda={c} onItemUpdate={handleItemUpdate} />)
              }
            </div>

            {/* En cocina */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-blue-500/30">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider">En preparación ({enCocina.length})</h2>
              </div>
              {enCocina.length === 0
                ? <p className="text-xs text-synapsix-muted text-center py-8">Sin items en cocina</p>
                : enCocina.map(c => <ComandaCard key={c.id} comanda={c} onItemUpdate={handleItemUpdate} />)
              }
            </div>

            {/* Listos */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-emerald-500/30">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">Listos para servir ({listos.length})</h2>
              </div>
              {listos.length === 0
                ? <p className="text-xs text-synapsix-muted text-center py-8">Nada listo aún</p>
                : listos.map(c => <ComandaCard key={c.id} comanda={c} onItemUpdate={handleItemUpdate} />)
              }
            </div>
          </div>
        </main>
      )}
    </div>
  )
}
