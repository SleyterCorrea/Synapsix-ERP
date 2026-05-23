/**
 * SYNAPSIX ERP — RestaurantePage
 * Vista de mesas en tiempo real + gestión de comandas.
 * WebSocket: ws://localhost:8000/ws/restaurante/?token=<jwt>
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Utensils, Plus, RefreshCw, Users, Clock,
  ChevronRight, X, Loader2, AlertCircle, CheckCircle,
  ShoppingCart, ChefHat, Receipt, Wifi, WifiOff,
} from 'lucide-react'
import clsx from 'clsx'
import api from '@api/axios'
import { useWebSocket } from '@hooks/useWebSocket'
import useTenantStore from '@store/tenantStore'
import ComandaModal from '@components/restaurante/ComandaModal'

// ─── Estado → estilos ───────────────────────────────────────────────────────
const MESA_ESTADO = {
  libre:     { label: 'Libre',         color: '#27AE60', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  ocupada:   { label: 'Ocupada',       color: '#C0392B', bg: 'bg-red-500/10 border-red-500/30'     },
  reservada: { label: 'Reservada',     color: '#F39C12', bg: 'bg-amber-500/10 border-amber-500/30'  },
  cuenta:    { label: 'Pidiendo Cuenta',color:'#8E44AD', bg: 'bg-purple-500/10 border-purple-500/30'},
  limpieza:  { label: 'En Limpieza',   color: '#2980B9', bg: 'bg-blue-500/10 border-blue-500/30'   },
}

function MesaCard({ mesa, onSelect }) {
  const cfg = MESA_ESTADO[mesa.estado] || MESA_ESTADO.libre
  const isOcupada = mesa.estado === 'ocupada' || mesa.estado === 'cuenta'
  return (
    <div
      onClick={() => onSelect(mesa)}
      className={clsx(
        'rounded-2xl border-2 p-5 cursor-pointer flex flex-col gap-3 transition-all duration-200',
        'hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] select-none',
        cfg.bg
      )}
    >
      {/* Número + estado */}
      <div className="flex items-center justify-between">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black"
          style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}>
          {mesa.numero}
        </div>
        <span className="text-[10px] font-bold px-2 py-1 rounded-full border"
          style={{ color: cfg.color, borderColor: `${cfg.color}50`, backgroundColor: `${cfg.color}15` }}>
          {cfg.label}
        </span>
      </div>

      {/* Info */}
      <div>
        {mesa.nombre && <p className="text-sm font-bold text-synapsix-text">{mesa.nombre}</p>}
        <div className="flex items-center gap-3 text-xs text-synapsix-muted">
          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{mesa.capacidad}</span>
          {mesa.zona && <span>{mesa.zona}</span>}
        </div>
      </div>

      {/* Acción */}
      <div className="flex items-center justify-between pt-1 border-t border-white/5">
        <span className="text-xs text-synapsix-muted">
          {isOcupada ? 'Ver comanda' : 'Abrir comanda'}
        </span>
        <ChevronRight className="w-4 h-4 text-synapsix-border-2" />
      </div>
    </div>
  )
}

export default function RestaurantePage() {
  const navigate = useNavigate()
  const { primaryColor } = useTenantStore()
  const [mesas, setMesas]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [selMesa, setSelMesa]   = useState(null)
  const [zonaFilter, setZona]   = useState('todas')

  const fetchMesas = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/restaurante/mesas/')
      setMesas(Array.isArray(res.data) ? res.data : res.data.results || [])
    } catch { } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchMesas() }, [fetchMesas])

  // ─── WebSocket: actualización en tiempo real ─────────────────────────────
  const { status: wsStatus } = useWebSocket('/ws/restaurante/', {
    onMessage: (msg) => {
      if (msg.type === 'mesa_update') {
        setMesas(prev => prev.map(m => m.id === msg.mesa.id ? msg.mesa : m))
      }
    },
  })

  const zonas = ['todas', ...new Set(mesas.map(m => m.zona || 'Principal').filter(Boolean))]
  const filteredMesas = zonaFilter === 'todas' ? mesas : mesas.filter(m => (m.zona || 'Principal') === zonaFilter)

  const stats = {
    total: mesas.length,
    libres: mesas.filter(m => m.estado === 'libre').length,
    ocupadas: mesas.filter(m => ['ocupada','cuenta'].includes(m.estado)).length,
  }

  return (
    <div className="min-h-screen bg-synapsix-dark">
      {/* Header */}
      <header className="border-b border-synapsix-border glass sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <button onClick={() => navigate('/launchpad')} className="text-synapsix-muted hover:text-synapsix-text-2 transition-colors"><ArrowLeft className="w-5 h-5" /></button>
          <Utensils className="w-5 h-5" style={{ color: primaryColor }} />
          <h1 className="text-base font-bold text-synapsix-text flex-1">Restaurante</h1>

          {/* WS status */}
          <div className={clsx('flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg',
            wsStatus === 'connected' ? 'text-emerald-400 bg-emerald-500/10' : 'text-synapsix-muted bg-synapsix-surface-2')}>
            {wsStatus === 'connected' ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {wsStatus === 'connected' ? 'Tiempo real' : 'Offline'}
          </div>

          <button onClick={fetchMesas} className="text-synapsix-muted hover:text-synapsix-text-2 p-2 rounded-xl hover:bg-synapsix-surface-2 transition-colors"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => navigate('/restaurante/cocina')} className="btn-secondary gap-2 text-sm h-9"><ChefHat className="w-4 h-4" />Cocina</button>
          <button onClick={() => navigate('/restaurante/comandas')} className="btn-primary gap-2 text-sm h-9"><ShoppingCart className="w-4 h-4" />Comandas</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total mesas',  value: stats.total,    color: primaryColor },
            { label: 'Libres',       value: stats.libres,   color: '#27AE60'    },
            { label: 'Ocupadas',     value: stats.ocupadas, color: '#C0392B'    },
            { label: 'Ocupación',    value: `${stats.total > 0 ? Math.round(stats.ocupadas/stats.total*100) : 0}%`, color: '#F39C12' },
          ].map(({ label, value, color }) => (
            <div key={label} className="glass rounded-xl border border-synapsix-border p-4">
              <p className="text-xl font-black" style={{ color }}>{value}</p>
              <p className="text-[10px] text-synapsix-muted uppercase tracking-wider font-semibold">{label}</p>
            </div>
          ))}
        </div>

        {/* Filtro por zona */}
        {zonas.length > 2 && (
          <div className="flex gap-2 flex-wrap">
            {zonas.map(z => (
              <button key={z} onClick={() => setZona(z)}
                className={clsx('px-4 py-1.5 rounded-xl text-sm font-medium border transition-colors capitalize',
                  zonaFilter === z ? 'bg-synapsix-surface-3 text-synapsix-text border-synapsix-border-2'
                    : 'text-synapsix-muted border-synapsix-border hover:border-synapsix-border-2')}>
                {z}
              </button>
            ))}
          </div>
        )}

        {/* Mapa de mesas */}
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-synapsix-muted animate-spin" /></div>
        ) : filteredMesas.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <Utensils className="w-14 h-14 text-synapsix-muted opacity-20 mx-auto" />
            <p className="text-synapsix-muted">Sin mesas configuradas</p>
            <button onClick={() => navigate('/settings')} className="btn-secondary">Ir a Configuración</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredMesas.map(mesa => (
              <MesaCard key={mesa.id} mesa={mesa} onSelect={setSelMesa} />
            ))}
          </div>
        )}
      </main>

      {selMesa && (
        <ComandaModal
          mesa={selMesa}
          onClose={() => setSelMesa(null)}
          onUpdate={(updatedMesa) => {
            setMesas(prev => prev.map(m => m.id === updatedMesa.id ? updatedMesa : m))
            setSelMesa(updatedMesa)
          }}
        />
      )}
    </div>
  )
}
