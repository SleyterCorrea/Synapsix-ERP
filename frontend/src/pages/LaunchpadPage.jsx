/**
 * SYNAPSIX ERP — LaunchpadPage
 * - Solo módulos activos en el escritorio (sin Chat que es ícono del header)
 * - Card "Apps" que abre modal de gestión de módulos
 * - Fondo: imagen subida o gradiente del store
 * - Logo dinámico del tenant (imagen o letra, sin cuadradito)
 */
import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, LogOut, Package, Receipt, Utensils, ShoppingBag,
  BarChart2, Grid, Calendar, Clock, CheckSquare, Users,
  Settings, ChevronRight, Zap, AlertCircle, RefreshCw, LayoutGrid, LayoutDashboard,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '@hooks/useAuth'
import { useModules } from '@hooks/useModules'
import { useSpotlight } from '@hooks/useSpotlight'
import SpotlightSearch from '@components/layout/SpotlightSearch'
import NotificationPanel from '@components/layout/NotificationPanel'
import ChatPanel from '@components/layout/ChatPanel'
import AppsModal from '@components/launchpad/AppsModal'
import useSettingsStore from '@store/settingsStore'
import useTenantStore from '@store/tenantStore'

// ─── Módulos que son herramientas internas (NO aparecen en el grid) ──────────
const INTERNAL_SLUGS = ['chat']

// ─── Mapa de íconos ──────────────────────────────────────────────────────────
const ICON_MAP = {
  inventario:    Package,
  facturacion:   Receipt,
  restaurante:   Utensils,
  'tienda-web':  ShoppingBag,
  reportes:      BarChart2,
  calendario:    Calendar,
  'hoja-horas':  Clock,
  tareas:        CheckSquare,
  crm:           Users,
  dashboard:     LayoutDashboard,
  default:       Grid,
}

const ModuleIconComponent = ({ slug, size = 28 }) => {
  const Icon = ICON_MAP[slug] || ICON_MAP.default
  return <Icon style={{ width: size, height: size }} />
}

// ─── Logo del Tenant (imagen natural, sin cuadradito) ────────────────────────
const TenantLogo = ({ logoBase64, companyName, primaryColor }) => {
  if (logoBase64) {
    return (
      <img
        src={logoBase64}
        alt={companyName}
        style={{ maxHeight: 32, maxWidth: 140 }}
        className="w-auto object-contain"
      />
    )
  }
  return (
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center"
      style={{ backgroundColor: `${primaryColor}20`, border: `1px solid ${primaryColor}40` }}
    >
      <span className="font-black text-sm" style={{ color: primaryColor }}>
        {companyName?.[0] || 'S'}
      </span>
    </div>
  )
}

// ─── Avatar del usuario ──────────────────────────────────────────────────────
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

// ─── Card de Módulo ──────────────────────────────────────────────────────────
const ModuleCard = ({ module, index }) => {
  const navigate = useNavigate()
  const handleClick = () => {
    if (!module.is_active) return
    navigate(module.route || `/${module.slug}`)
  }

  return (
    <div
      className={clsx('module-card group animate-slide-in-up', module.is_active ? 'active' : 'opacity-60')}
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
      onClick={handleClick}
      role="button"
      tabIndex={module.is_active ? 0 : -1}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      id={`module-card-${module.slug}`}
    >
      {module.is_core && module.is_active && (
        <div className="absolute top-3 right-3">
          <span className="badge badge-active text-[10px]"><Zap className="w-2.5 h-2.5" /> Core</span>
        </div>
      )}
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-1 transition-transform duration-300 group-hover:scale-110"
        style={{ backgroundColor: `${module.color}18`, border: `1.5px solid ${module.color}35`, color: module.color }}
      >
        <ModuleIconComponent slug={module.slug} size={28} />
      </div>
      <h3 className="text-synapsix-text font-semibold text-sm text-center leading-tight">{module.name}</h3>
      {module.description && (
        <p className="text-synapsix-muted text-xs text-center leading-relaxed line-clamp-2 px-1">{module.description}</p>
      )}
      <ChevronRight className="absolute bottom-3 right-3 w-4 h-4 text-synapsix-border-2 group-hover:text-synapsix-muted transition-colors" />
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 50%, ${module.color}08 0%, transparent 70%)` }}
      />
    </div>
  )
}

// ─── Card de Apps ────────────────────────────────────────────────────────────
const AppsCard = ({ onClick, inactiveCount, index }) => (
  <div
    className="module-card group animate-slide-in-up cursor-pointer"
    style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
    onClick={onClick}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => e.key === 'Enter' && onClick()}
    id="module-card-apps"
  >
    {inactiveCount > 0 && (
      <span className="absolute top-3 right-3 badge-inactive text-[10px]">{inactiveCount}</span>
    )}
    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-1 transition-transform duration-300 group-hover:scale-110 bg-synapsix-surface-3 border border-synapsix-border-2 text-synapsix-muted group-hover:text-synapsix-text-2">
      <LayoutGrid size={28} />
    </div>
    <h3 className="text-synapsix-text font-semibold text-sm text-center leading-tight">Apps</h3>
    <p className="text-synapsix-muted text-xs text-center leading-relaxed line-clamp-2 px-1">
      Ver y activar más aplicaciones
    </p>
    <ChevronRight className="absolute bottom-3 right-3 w-4 h-4 text-synapsix-border-2 group-hover:text-synapsix-muted transition-colors" />
  </div>
)

// ─── Skeleton loader ─────────────────────────────────────────────────────────
const ModuleSkeleton = () => (
  <div className="module-card animate-pulse">
    <div className="w-16 h-16 rounded-2xl bg-synapsix-surface-3 mb-1" />
    <div className="w-20 h-3 bg-synapsix-surface-3 rounded" />
    <div className="w-28 h-2 bg-synapsix-surface-3 rounded" />
  </div>
)

// ─── LAUNCHPAD PAGE ──────────────────────────────────────────────────────────
export default function LaunchpadPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { modules, isLoading, error, refetch } = useModules()
  const { isOpen: spotlightOpen, query, setQuery, results, open, close } = useSpotlight(modules)
  const { getBackgroundStyle } = useSettingsStore()
  const { companyName, companyTagline, logoBase64, primaryColor, launchpadBg, launchpadBgPos } = useTenantStore()

  const [appsOpen, setAppsOpen] = useState(false)
  const [localModules, setLocalModules] = useState(null)

  const allModules = localModules || modules

  // Módulos visibles en el grid: activos, sin los internos (chat, etc.)
  const visibleModules = allModules.filter(m => m.is_active && !INTERNAL_SLUGS.includes(m.slug))
  // Módulos inactivos (los que aparecen en el modal Apps)
  const inactiveModules = allModules.filter(m => !m.is_active)

  const handleToggle = useCallback((slug) => {
    const base = localModules || modules
    setLocalModules(base.map(m => m.slug === slug ? { ...m, is_active: !m.is_active } : m))
  }, [localModules, modules])

  const handleLogout = async () => await logout()

  // Fondo del launchpad
  const launchpadBackground = launchpadBg
    ? `url("${launchpadBg}") ${launchpadBgPos || 'center'}/cover no-repeat`
    : getBackgroundStyle()

  return (
    <div className="min-h-screen relative" style={{ background: launchpadBackground }}>

      {/* Modal de Apps */}
      <AppsModal
        isOpen={appsOpen}
        onClose={() => setAppsOpen(false)}
        modules={allModules}
        onToggle={handleToggle}
      />

      {/* Spotlight Search */}
      <SpotlightSearch isOpen={spotlightOpen} query={query} setQuery={setQuery} results={results} onClose={close} />

      {/* Overlays de fondo */}
      <div className="absolute inset-0 noise-bg pointer-events-none" />
      {launchpadBg ? (
        <div className="absolute inset-0 bg-black/50 pointer-events-none" />
      ) : (
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 60% 40% at 50% -10%, ${primaryColor}10 0%, transparent 70%)` }}
        />
      )}

      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <header className="relative border-b border-synapsix-border glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

          {/* Logo + nombre del tenant */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <TenantLogo logoBase64={logoBase64} companyName={companyName} primaryColor={primaryColor} />
            <div className="hidden sm:block">
              <span className="text-synapsix-text font-bold text-sm">{companyName}</span>
              <span className="text-synapsix-muted text-xs ml-1 font-mono">{companyTagline}</span>
            </div>
          </div>

          {/* Buscador central */}
          <button
            id="btn-spotlight"
            onClick={open}
            className="flex items-center gap-2 bg-synapsix-surface border border-synapsix-border hover:border-synapsix-border-2 rounded-xl px-3 py-2 text-sm text-synapsix-muted hover:text-synapsix-text-2 transition-all duration-200 w-full max-w-xs"
          >
            <Search className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-left text-xs">Buscar módulos...</span>
            <div className="flex items-center gap-1 flex-shrink-0">
              <kbd className="text-[10px] bg-synapsix-surface-3 border border-synapsix-border px-1.5 py-0.5 rounded font-mono">Ctrl</kbd>
              <kbd className="text-[10px] bg-synapsix-surface-3 border border-synapsix-border px-1.5 py-0.5 rounded font-mono">K</kbd>
            </div>
          </button>

          {/* Acciones */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <NotificationPanel />
            <ChatPanel />
            <button
              id="btn-settings"
              onClick={() => navigate('/settings')}
              title="Ajustes"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-synapsix-muted hover:text-synapsix-text-2 hover:bg-synapsix-surface-2 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-synapsix-border mx-1" />

            {/* Avatar + info */}
            <div
              className="flex items-center gap-2 cursor-pointer group"
              onClick={() => navigate('/perfil')}
              title="Mi perfil"
            >
              <div className="w-9 h-9 rounded-xl bg-synapsix-red/20 border border-synapsix-red/30 flex items-center justify-center group-hover:border-synapsix-red/60 transition-colors">
                <span className="text-synapsix-red text-sm font-bold">
                  {user ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() : '?'}
                </span>
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-medium text-synapsix-text leading-none group-hover:text-synapsix-text-2 transition-colors">
                  {user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Usuario'}
                </p>
                <p className="text-[10px] text-synapsix-muted capitalize mt-0.5">{user?.role || 'Admin'}</p>
              </div>
            </div>

            <button
              id="btn-logout"
              onClick={handleLogout}
              title="Cerrar sesión"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-synapsix-muted hover:text-red-400 hover:bg-red-500/10 transition-colors ml-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ─── Contenido Principal ─────────────────────────────────────────────── */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-10">

        {/* Saludo */}
        <div className="mb-10 animate-fade-in">
          <h1 className="text-3xl sm:text-4xl font-bold text-gradient mb-2">
            Hola, {user?.first_name || 'Bienvenido'} 👋
          </h1>
          <p className="text-synapsix-muted">
            {user?.company?.name ? `${user.company.name} · Panel de Control` : 'Selecciona un módulo para comenzar'}
          </p>
        </div>

        {/* Cargando */}
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => <ModuleSkeleton key={i} />)}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <AlertCircle className="w-12 h-12 text-red-400/50" />
            <p className="text-synapsix-muted">{error}</p>
            <button onClick={refetch} className="btn-secondary gap-2">
              <RefreshCw className="w-4 h-4" /> Reintentar
            </button>
          </div>
        )}

        {/* Grid de módulos activos + card Apps */}
        {!isLoading && !error && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-synapsix-red" />
              <h2 className="text-sm font-semibold text-synapsix-text-2 uppercase tracking-wider">
                Módulos Activos
              </h2>
              <span className="badge-active ml-1">{visibleModules.length}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {visibleModules.map((module, i) => (
                <ModuleCard key={module.id} module={module} index={i} />
              ))}
              {/* Siempre hay una card Apps al final */}
              <AppsCard
                onClick={() => setAppsOpen(true)}
                inactiveCount={inactiveModules.length}
                index={visibleModules.length}
              />
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="relative border-t border-synapsix-border mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <span className="text-synapsix-muted-2 text-xs">Synapsix ERP v0.1.0 · Core</span>
          <span className="text-synapsix-muted-2 text-xs">{user?.company?.name || companyName}</span>
        </div>
      </footer>
    </div>
  )
}
