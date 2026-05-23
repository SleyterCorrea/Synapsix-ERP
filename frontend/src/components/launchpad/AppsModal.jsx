/**
 * SYNAPSIX ERP — AppsModal
 * Modal que muestra todos los módulos disponibles para activar/desactivar.
 * Se abre desde la card "Apps" en el Launchpad.
 */
import { useState } from 'react'
import { X, LayoutGrid, Package, Receipt, Utensils, ShoppingBag, BarChart2,
         Calendar, Clock, CheckSquare, MessageSquare, Users, Zap, ToggleLeft, ToggleRight } from 'lucide-react'
import clsx from 'clsx'
import api from '@api/axios'

const ICON_MAP = {
  inventario: Package, facturacion: Receipt, restaurante: Utensils,
  'tienda-web': ShoppingBag, reportes: BarChart2, calendario: Calendar,
  'hoja-horas': Clock, tareas: CheckSquare, chat: MessageSquare, crm: Users,
  default: LayoutGrid,
}

export default function AppsModal({ isOpen, onClose, modules, onToggle }) {
  const [loading, setLoading] = useState({})

  if (!isOpen) return null

  const handleToggle = async (module) => {
    setLoading(prev => ({ ...prev, [module.slug]: true }))
    try {
      await api.post(`/core/modules/${module.slug}/toggle/`)
      onToggle(module.slug)
    } catch (err) {
      console.error('Error toggling module:', err)
    } finally {
      setLoading(prev => ({ ...prev, [module.slug]: false }))
    }
  }

  // Separar por categoría
  const coreModules = modules.filter(m => m.is_core)
  const businessModules = modules.filter(m => !m.is_core)

  const ModuleRow = ({ module }) => {
    const Icon = ICON_MAP[module.slug] || ICON_MAP.default
    const isLoading = loading[module.slug]
    return (
      <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-synapsix-surface-2 transition-colors">
        {/* Ícono */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${module.color}20`, border: `1px solid ${module.color}30`, color: module.color }}
        >
          <Icon className="w-5 h-5" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-synapsix-text">{module.name}</p>
            {module.is_core && (
              <span className="badge-active text-[9px]"><Zap className="w-2.5 h-2.5" /> Core</span>
            )}
            <span className="text-[10px] text-synapsix-muted-2 font-mono">v{module.version}</span>
          </div>
          <p className="text-xs text-synapsix-muted truncate">{module.description}</p>
        </div>

        {/* Toggle */}
        <button
          onClick={() => handleToggle(module)}
          disabled={isLoading}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
            module.is_active
              ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
              : 'border-synapsix-border text-synapsix-muted hover:border-synapsix-border-2 hover:text-synapsix-text-2',
            isLoading && 'opacity-50 cursor-wait'
          )}
        >
          {module.is_active
            ? <><ToggleRight className="w-3.5 h-3.5" /> Activo</>
            : <><ToggleLeft className="w-3.5 h-3.5" /> Inactivo</>
          }
        </button>
      </div>
    )
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fade-in" onClick={onClose} />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg mx-4 animate-slide-in-up">
        <div className="bg-synapsix-surface border border-synapsix-border rounded-2xl shadow-spotlight overflow-hidden max-h-[80vh] flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-synapsix-border flex-shrink-0">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-synapsix-muted" />
              <h2 className="text-base font-bold text-synapsix-text">Aplicaciones</h2>
              <span className="text-xs text-synapsix-muted">Gestiona los módulos del sistema</span>
            </div>
            <button onClick={onClose} className="text-synapsix-muted hover:text-synapsix-text-2 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1 p-4 space-y-6">
            {coreModules.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] text-synapsix-muted uppercase tracking-wider font-semibold px-1 mb-2">
                  Módulos Core
                </p>
                {coreModules.map(m => <ModuleRow key={m.slug} module={m} />)}
              </div>
            )}
            {businessModules.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] text-synapsix-muted uppercase tracking-wider font-semibold px-1 mb-2">
                  Módulos de Negocio
                </p>
                {businessModules.map(m => <ModuleRow key={m.slug} module={m} />)}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-synapsix-border flex-shrink-0 flex items-center justify-between">
            <p className="text-xs text-synapsix-muted">
              {modules.filter(m => m.is_active).length} de {modules.length} módulos activos
            </p>
            <button onClick={onClose} className="btn-primary h-8 text-xs px-4">
              Listo
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
