/**
 * SYNAPSIX ERP — LaunchpadPage
 * Panel principal post-login con grid de módulos dinámico
 */
import { useNavigate } from 'react-router-dom'
import {
  Search, LogOut, Package, Receipt,
  Utensils, ShoppingBag, BarChart2, Grid,
  Settings, Bell, ChevronRight, Zap,
  AlertCircle, RefreshCw
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '@hooks/useAuth'
import { useModules } from '@hooks/useModules'
import { useSpotlight } from '@hooks/useSpotlight'
import SpotlightSearch from '@components/layout/SpotlightSearch'

// ─── Mapa de íconos ────────────────────────────────────────────────────────
const ICON_MAP = {
  inventario:   Package,
  facturacion:  Receipt,
  restaurante:  Utensils,
  'tienda-web': ShoppingBag,
  reportes:     BarChart2,
  default:      Grid,
}

const ModuleIconComponent = ({ slug, size = 32 }) => {
  const Icon = ICON_MAP[slug] || ICON_MAP.default
  return <Icon style={{ width: size, height: size }} />
}

// ─── Avatar inicial ────────────────────────────────────────────────────────
const UserAvatar = ({ user }) => {
  const initials = user
    ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()
    : '?'

  return (
    <div className="w-9 h-9 rounded-xl bg-synapsix-red/20 border border-synapsix-red/30 flex items-center justify-center">
      <span className="text-synapsix-red text-sm font-bold">{initials}</span>
    </div>
  )
}

// ─── Card de Módulo ────────────────────────────────────────────────────────
const ModuleCard = ({ module, index }) => {
  const navigate = useNavigate()

  const handleClick = () => {
    if (!module.is_active) return
    navigate(module.route || `/${module.slug}`)
  }

  return (
    <div
      className={clsx(
        'module-card group',
        'animate-slide-in-up',
        module.is_active ? 'active' : 'opacity-60'
      )}
      style={{
        animationDelay: `${index * 60}ms`,
        animationFillMode: 'both',
      }}
      onClick={handleClick}
      role="button"
      tabIndex={module.is_active ? 0 : -1}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      id={`module-card-${module.slug}`}
    >
      {/* Badge de estado */}
      {!module.is_active && (
        <div className="absolute top-3 right-3">
          <span className="badge-inactive text-[10px]">Próximamente</span>
        </div>
      )}

      {/* Core badge */}
      {module.is_core && module.is_active && (
        <div className="absolute top-3 right-3">
          <span className="badge badge-active text-[10px]">
            <Zap className="w-2.5 h-2.5" /> Core
          </span>
        </div>
      )}

      {/* Ícono */}
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-1
                   transition-transform duration-300 group-hover:scale-110"
        style={{
          backgroundColor: `${module.color}18`,
          border: `1.5px solid ${module.color}35`,
          color: module.color,
        }}
      >
        <ModuleIconComponent slug={module.slug} size={28} />
      </div>

      {/* Nombre */}
      <h3 className="text-synapsix-text font-semibold text-sm text-center leading-tight">
        {module.name}
      </h3>

      {/* Descripción */}
      {module.description && (
        <p className="text-synapsix-muted text-xs text-center leading-relaxed line-clamp-2 px-1">
          {module.description}
        </p>
      )}

      {/* Flecha de acceso — solo en módulos activos */}
      {module.is_active && (
        <ChevronRight
          className="absolute bottom-3 right-3 w-4 h-4 text-synapsix-border-2
                     group-hover:text-synapsix-muted transition-colors"
        />
      )}

      {/* Hover glow */}
      {module.is_active && (
        <div
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${module.color}08 0%, transparent 70%)`,
          }}
        />
      )}
    </div>
  )
}

// ─── Skeleton loader ──────────────────────────────────────────────────────
const ModuleSkeleton = () => (
  <div className="module-card animate-pulse">
    <div className="w-16 h-16 rounded-2xl bg-synapsix-surface-3 mb-1" />
    <div className="w-20 h-3 bg-synapsix-surface-3 rounded" />
    <div className="w-28 h-2 bg-synapsix-surface-3 rounded" />
  </div>
)

// ─── LAUNCHPAD PAGE ────────────────────────────────────────────────────────
export default function LaunchpadPage() {
  const { user, logout } = useAuth()
  const { modules, isLoading, error, refetch } = useModules()
  const { isOpen, query, setQuery, results, open, close } = useSpotlight(modules)

  const handleLogout = async () => {
    await logout()
  }

  const activeModules = modules.filter((m) => m.is_active)
  const inactiveModules = modules.filter((m) => !m.is_active)

  return (
    <div className="min-h-screen bg-synapsix-dark-2 relative">

      {/* ─── Spotlight Modal ─────────────────────────────────────────────── */}
      <SpotlightSearch
        isOpen={isOpen}
        query={query}
        setQuery={setQuery}
        results={results}
        onClose={close}
      />

      {/* ─── Fondo con textura ───────────────────────────────────────────── */}
      <div className="absolute inset-0 noise-bg pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% -10%, rgba(192,57,43,0.06) 0%, transparent 70%)',
        }}
      />

      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <header className="relative border-b border-synapsix-border glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

          {/* Logo + nombre */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-synapsix-red/15 border border-synapsix-red/30
                            flex items-center justify-center">
              <span className="text-synapsix-red font-black text-sm">S</span>
            </div>
            <div className="hidden sm:block">
              <span className="text-synapsix-text font-bold text-sm">Synapsix</span>
              <span className="text-synapsix-muted text-xs ml-1 font-mono">ERP</span>
            </div>
          </div>

          {/* Buscador central (Ctrl+K) */}
          <button
            id="btn-spotlight"
            onClick={open}
            className="flex items-center gap-2 bg-synapsix-surface border border-synapsix-border
                       hover:border-synapsix-border-2 rounded-xl px-3 py-2 text-sm
                       text-synapsix-muted hover:text-synapsix-text-2
                       transition-all duration-200 group w-full max-w-xs"
          >
            <Search className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-left text-xs">Buscar módulos...</span>
            <div className="flex items-center gap-1 flex-shrink-0">
              <kbd className="text-[10px] bg-synapsix-surface-3 border border-synapsix-border px-1.5 py-0.5 rounded font-mono">
                Ctrl
              </kbd>
              <kbd className="text-[10px] bg-synapsix-surface-3 border border-synapsix-border px-1.5 py-0.5 rounded font-mono">
                K
              </kbd>
            </div>
          </button>

          {/* Acciones del usuario */}
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 rounded-lg flex items-center justify-center
                               text-synapsix-muted hover:text-synapsix-text-2 hover:bg-synapsix-surface-2
                               transition-colors">
              <Bell className="w-4 h-4" />
            </button>
            <button className="w-8 h-8 rounded-lg flex items-center justify-center
                               text-synapsix-muted hover:text-synapsix-text-2 hover:bg-synapsix-surface-2
                               transition-colors">
              <Settings className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-synapsix-border mx-1" />

            {/* Avatar + info */}
            <div className="flex items-center gap-2">
              <UserAvatar user={user} />
              <div className="hidden md:block text-left">
                <p className="text-xs font-medium text-synapsix-text leading-none">
                  {user?.full_name || user?.first_name || 'Usuario'}
                </p>
                <p className="text-[10px] text-synapsix-muted capitalize mt-0.5">
                  {user?.role || 'admin'}
                </p>
              </div>
            </div>

            <button
              id="btn-logout"
              onClick={handleLogout}
              title="Cerrar sesión"
              className="w-8 h-8 rounded-lg flex items-center justify-center
                         text-synapsix-muted hover:text-red-400 hover:bg-red-500/10
                         transition-colors ml-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ─── Contenido Principal ─────────────────────────────────────────── */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-10">

        {/* Saludo + empresa */}
        <div className="mb-10 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl sm:text-4xl font-bold text-gradient">
              Hola, {user?.first_name || 'Bienvenido'} 👋
            </h1>
          </div>
          <p className="text-synapsix-muted">
            {user?.company?.name
              ? `${user.company.name} · Panel de Control`
              : 'Selecciona un módulo para comenzar'
            }
          </p>
        </div>

        {/* ── Módulos Activos ───────────────────────────────────────────── */}
        {!isLoading && !error && activeModules.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-synapsix-red" />
              <h2 className="text-sm font-semibold text-synapsix-text-2 uppercase tracking-wider">
                Módulos Activos
              </h2>
              <span className="badge-active ml-1">{activeModules.length}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {activeModules.map((module, i) => (
                <ModuleCard key={module.id} module={module} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* ── Estado: Cargando ─────────────────────────────────────────── */}
        {isLoading && (
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-4 h-4 rounded-full bg-synapsix-surface-3 animate-pulse" />
              <div className="w-24 h-3 rounded bg-synapsix-surface-3 animate-pulse" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => <ModuleSkeleton key={i} />)}
            </div>
          </section>
        )}

        {/* ── Estado: Error ─────────────────────────────────────────────── */}
        {error && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <AlertCircle className="w-12 h-12 text-red-400/50" />
            <p className="text-synapsix-muted">{error}</p>
            <button onClick={refetch} className="btn-secondary gap-2">
              <RefreshCw className="w-4 h-4" /> Reintentar
            </button>
          </div>
        )}

        {/* ── Módulos Próximamente ─────────────────────────────────────── */}
        {!isLoading && !error && inactiveModules.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-4 h-4 rounded-full border border-synapsix-border-2" />
              <h2 className="text-sm font-semibold text-synapsix-muted uppercase tracking-wider">
                Próximamente
              </h2>
              <span className="badge-inactive ml-1">{inactiveModules.length}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {inactiveModules.map((module, i) => (
                <ModuleCard key={module.id} module={module} index={i} />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* ─── Footer ──────────────────────────────────────────────────────── */}
      <footer className="relative border-t border-synapsix-border mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <span className="text-synapsix-muted-2 text-xs">
            Synapsix ERP v0.1.0 · Core
          </span>
          <span className="text-synapsix-muted-2 text-xs">
            {user?.company?.name || 'Sistema'}
          </span>
        </div>
      </footer>
    </div>
  )
}
