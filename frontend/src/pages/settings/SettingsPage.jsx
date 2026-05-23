/**
 * SYNAPSIX ERP — SettingsPage v4 (estilo Odoo)
 *
 * Sidebar izquierdo dinámico:
 *  • Secciones estáticas: General, Apariencia, Usuarios, Roles
 *  • Secciones de módulos activos: Calendario, Inventario, Mesas, etc.
 *
 * Los módulos inactivos NO aparecen en el sidebar.
 */
import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, Settings2, Paintbrush, Users, ShieldCheck,
  Utensils, Package, Receipt, Calendar, CheckSquare, Clock,
  BarChart2, ChevronRight, Loader2, Search,
} from 'lucide-react'
import clsx from 'clsx'
import useSettingsStore from '@store/settingsStore'
import api from '@api/axios'

// ── Secciones lazy ────────────────────────────────────────────────────────────
import GeneralSection           from './sections/GeneralSection'
import AppearanceSection        from './sections/AppearanceSection'
import UsersSection             from './sections/UsersSection'
import PermissionsSection       from './sections/PermissionsSection'
import MesasSection             from './sections/MesasSection'
import CalendarSettingsSection  from './sections/CalendarSettingsSection'
import InventarioSettingsSection from './sections/InventarioSettingsSection'

// ── Mapa sección → componente ─────────────────────────────────────────────────
const SECTION_MAP = {
  general:     GeneralSection,
  appearance:  AppearanceSection,
  users:       UsersSection,
  permissions: PermissionsSection,
  // Módulos
  mesas:                MesasSection,
  'cal-sync':           CalendarSettingsSection,
  'inv-settings':       InventarioSettingsSection,
}

// ── Ajustes por módulo slug → secciones en sidebar ───────────────────────────
const MODULE_SECTION_MAP = {
  restaurante: [
    { id: 'mesas',        label: 'Mesas y zonas',  icon: Utensils },
  ],
  calendario: [
    { id: 'cal-sync',     label: 'Sincronización',  icon: Calendar },
  ],
  inventario: [
    { id: 'inv-settings', label: 'Inventario',      icon: Package },
  ],
  // Se puede agregar más módulos aquí
}

// ── Secciones estáticas (siempre visibles) ────────────────────────────────────
const STATIC_GROUPS = [
  {
    group: 'CONFIGURACIÓN',
    items: [
      { id: 'general',    label: 'Ajustes generales', icon: Settings2 },
      { id: 'appearance', label: 'Apariencia',        icon: Paintbrush },
    ],
  },
  {
    group: 'USUARIOS',
    items: [
      { id: 'users',       label: 'Usuarios',         icon: Users },
      { id: 'permissions', label: 'Roles y permisos', icon: ShieldCheck },
    ],
  },
]

// ── Fallback ──────────────────────────────────────────────────────────────────
function ComingSoonSection({ label }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-60">
      <Settings2 className="w-12 h-12 text-synapsix-muted" />
      <p className="text-synapsix-muted text-sm">
        Ajustes de <strong>{label}</strong> — próximamente
      </p>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function SettingsPage() {
  const navigate        = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { getBackgroundStyle } = useSettingsStore()

  const initialSection = searchParams.get('section') || 'general'
  const [activeSection, setActiveSection] = useState(initialSection)
  const [activeModules, setActiveModules] = useState([])
  const [loadingModules, setLoadingModules] = useState(true)
  const [sidebarQuery, setSidebarQuery]     = useState('')

  // Cargar módulos activos
  useEffect(() => {
    api.get('/core/modules/active/').then(r => {
      const mods = Array.isArray(r.data) ? r.data : (r.data?.results || [])
      setActiveModules(mods)
    }).catch(() => {}).finally(() => setLoadingModules(false))
  }, [])

  const goTo = (id) => {
    setActiveSection(id)
    setSearchParams({ section: id })
  }

  // Grupos de módulos activos
  const moduleGroups = useMemo(() => {
    const groups = []
    activeModules.forEach(mod => {
      const sections = MODULE_SECTION_MAP[mod.slug]
      if (sections && sections.length > 0) {
        groups.push({
          group: mod.name.toUpperCase(),
          items: sections,
        })
      }
    })
    return groups
  }, [activeModules])

  const allGroups = [...STATIC_GROUPS, ...moduleGroups]

  // Filtrar sidebar con búsqueda
  const filteredGroups = useMemo(() => {
    if (!sidebarQuery) return allGroups
    const q = sidebarQuery.toLowerCase()
    return allGroups
      .map(g => ({ ...g, items: g.items.filter(i => i.label.toLowerCase().includes(q)) }))
      .filter(g => g.items.length > 0)
  }, [allGroups, sidebarQuery])

  const allItems = allGroups.flatMap(g => g.items)
  const activeLabel = allItems.find(i => i.id === activeSection)?.label || ''
  const Component = SECTION_MAP[activeSection]

  return (
    <div className="min-h-screen relative" style={{ background: getBackgroundStyle() }}>
      <div className="absolute inset-0 noise-bg pointer-events-none" />

      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <div className="relative border-b border-synapsix-border glass sticky top-0 z-40">
        <div className="flex items-center gap-3 px-4 h-12">
          <button onClick={() => navigate('/launchpad')}
            className="flex items-center gap-1.5 text-synapsix-muted hover:text-synapsix-text-2 transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Synapsix ERP</span>
          </button>
          <div className="w-px h-4 bg-synapsix-border mx-1" />
          <span className="text-synapsix-muted text-sm">Ajustes</span>
          {activeSection !== 'general' && activeLabel && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-synapsix-muted-2" />
              <span className="text-synapsix-text font-semibold text-sm">{activeLabel}</span>
            </>
          )}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <div className="relative flex h-[calc(100vh-48px)]">

        {/* ── Sidebar ─────────────────────────────────────────────── */}
        <aside className="w-60 border-r border-synapsix-border bg-synapsix-surface/80 backdrop-blur-sm flex-shrink-0 flex flex-col">
          {/* Búsqueda en sidebar */}
          <div className="px-3 py-2 border-b border-synapsix-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-synapsix-muted" />
              <input
                value={sidebarQuery} onChange={e => setSidebarQuery(e.target.value)}
                placeholder="Buscar ajuste..."
                className="w-full bg-synapsix-surface-2 border border-synapsix-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-synapsix-text placeholder:text-synapsix-muted focus:outline-none focus:border-synapsix-border-2"
              />
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto py-2">
            {filteredGroups.map(({ group, items }) => (
              <div key={group} className="mb-1">
                <p className="px-4 pt-3 pb-1 text-[9px] font-bold uppercase tracking-widest text-synapsix-muted-2 select-none">
                  {group}
                </p>
                {items.map(({ id, label, icon: Icon }) => (
                  <button key={id} id={`settings-nav-${id}`} onClick={() => goTo(id)}
                    className={clsx(
                      'w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-all duration-150',
                      activeSection === id
                        ? 'bg-synapsix-red/12 text-synapsix-red font-semibold border-r-2 border-synapsix-red'
                        : 'text-synapsix-muted hover:text-synapsix-text-2 hover:bg-synapsix-surface-2'
                    )}>
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{label}</span>
                  </button>
                ))}
              </div>
            ))}

            {/* Hint cuando no hay módulos activos */}
            {!loadingModules && moduleGroups.length === 0 && (
              <div className="px-4 pt-4 pb-3">
                <div className="p-3 rounded-xl bg-synapsix-surface-2 border border-synapsix-border">
                  <p className="text-[10px] text-synapsix-muted leading-relaxed">
                    Activa módulos desde el <span className="text-synapsix-text-2 font-medium">Launchpad → Apps</span> para ver sus ajustes aquí.
                  </p>
                </div>
              </div>
            )}

            {loadingModules && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-4 h-4 text-synapsix-muted animate-spin" />
              </div>
            )}
          </nav>
        </aside>

        {/* ── Content ──────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-3xl mx-auto">
            {Component
              ? <Component />
              : <ComingSoonSection label={activeLabel || activeSection} />
            }
          </div>
        </main>
      </div>
    </div>
  )
}
