/**
 * SYNAPSIX ERP — SpotlightSearch Component
 * Modal de búsqueda global tipo Spotlight (Ctrl+K)
 */
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Package, Receipt, Utensils, ShoppingBag, BarChart2, Grid, X } from 'lucide-react'
import clsx from 'clsx'

// Mapa de íconos por slug de módulo
const ICON_MAP = {
  inventario:      Package,
  facturacion:     Receipt,
  restaurante:     Utensils,
  'tienda-web':    ShoppingBag,
  reportes:        BarChart2,
  default:         Grid,
}

const ModuleIcon = ({ slug, className }) => {
  const Icon = ICON_MAP[slug] || ICON_MAP.default
  return <Icon className={className} />
}

export default function SpotlightSearch({ isOpen, query, setQuery, results, onClose }) {
  const navigate = useNavigate()
  const inputRef = useRef(null)

  // Focus automático al abrir
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSelect = (module) => {
    if (!module.is_active) return
    onClose()
    navigate(module.route || `/${module.slug}`)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 animate-spotlight-open">
        <div className="glass rounded-2xl shadow-spotlight overflow-hidden border border-synapsix-border-2">

          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-synapsix-border">
            <Search className="w-5 h-5 text-synapsix-muted flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar módulos, acciones..."
              className="flex-1 bg-transparent text-synapsix-text placeholder:text-synapsix-muted text-base outline-none"
            />
            <div className="flex items-center gap-1">
              <kbd className="text-xs text-synapsix-muted-2 bg-synapsix-surface-3 px-1.5 py-0.5 rounded border border-synapsix-border font-mono">
                ESC
              </kbd>
              <button onClick={onClose} className="text-synapsix-muted hover:text-synapsix-text-2 transition-colors ml-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Resultados */}
          <div className="max-h-80 overflow-y-auto p-2">
            {results.length === 0 ? (
              <div className="text-center py-8 text-synapsix-muted text-sm">
                No se encontraron resultados para "{query}"
              </div>
            ) : (
              <>
                <p className="text-xs text-synapsix-muted-2 uppercase tracking-wider px-3 pb-2 pt-1">
                  Módulos del sistema
                </p>
                {results.map((module) => (
                  <button
                    key={module.id}
                    onClick={() => handleSelect(module)}
                    disabled={!module.is_active}
                    className={clsx(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150',
                      module.is_active
                        ? 'hover:bg-synapsix-surface-3 cursor-pointer'
                        : 'opacity-40 cursor-not-allowed'
                    )}
                  >
                    {/* Ícono */}
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${module.color}20`, border: `1px solid ${module.color}40` }}
                    >
                      <ModuleIcon slug={module.slug} className="w-4 h-4" style={{ color: module.color }} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-synapsix-text text-sm font-medium">
                          {module.name}
                        </span>
                        {!module.is_active && (
                          <span className="badge-inactive text-xs">Próximamente</span>
                        )}
                      </div>
                      {module.description && (
                        <p className="text-synapsix-muted text-xs truncate mt-0.5">
                          {module.description}
                        </p>
                      )}
                    </div>

                    {/* Versión */}
                    <span className="text-synapsix-muted-2 text-xs font-mono flex-shrink-0">
                      v{module.version}
                    </span>
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-synapsix-border flex items-center gap-4 text-xs text-synapsix-muted-2">
            <span><kbd className="font-mono">↑↓</kbd> navegar</span>
            <span><kbd className="font-mono">↵</kbd> abrir</span>
            <span><kbd className="font-mono">Ctrl+K</kbd> cerrar</span>
          </div>
        </div>
      </div>
    </>
  )
}
