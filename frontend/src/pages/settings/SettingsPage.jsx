/**
 * SYNAPSIX ERP — SettingsPage v3 (estilo Odoo)
 *
 * Sidebar izquierdo con secciones:
 *  • Ajustes generales (empresa, apariencia)
 *  • Usuarios y empresas
 *  • Por cada módulo ACTIVO → sus ajustes propios
 *
 * Los módulos inactivos NO aparecen en el sidebar.
 */
import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, Settings2, Paintbrush, Users, ShieldCheck,
  Utensils, Package, Receipt, Calendar, CheckSquare, Clock,
  BarChart2, ChevronRight, Loader2,
} from 'lucide-react'
import clsx from 'clsx'
import useSettingsStore from '@store/settingsStore'
import api from '@api/axios'

// Secciones lazy
import GeneralSection   from './sections/GeneralSection'
import AppearanceSection from './sections/AppearanceSection'
import UsersSection     from './sections/UsersSection'
import PermissionsSection from './sections/PermissionsSection'
import MesasSection     from './sections/MesasSection'

// ─── Mapa de íconos de módulo ─────────────────────────────────────────────────
const MOD_ICONS = {
  restaurante:  Utensils,
  inventario:   Package,
  facturacion:  Receipt,
  calendario:   Calendar,
  tareas:       CheckSquare,
  'hoja-horas': Clock,
  reportes:     BarChart2,
}

// ─── Ajustes estáticos (siempre visibles) ────────────────────────────────────
const STATIC_SECTIONS = [
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
      { id: 'users',       label: 'Usuarios',  icon: Users },
      { id: 'permissions', label: 'Roles y permisos', icon: ShieldCheck },
    ],
  },
]

// ─── Ajustes por módulo (se muestran solo si el módulo está activo) ───────────
const MODULE_SECTIONS = {
  restaurante: [
    { id: 'mesas',   label: 'Mesas y zonas',  icon: Utensils },
  ],
  inventario: [
    // placeholder — se puede agregar InventarioSettingsSection
  ],
}

// ─── Componentes de sección por módulo ───────────────────────────────────────
const SECTION_MAP = {
  general:     GeneralSection,
  appearance:  AppearanceSection,
  users:       UsersSection,
  permissions: PermissionsSection,
  mesas:       MesasSection,
}

// Fallback para módulos sin sección implementada aún
function ComingSoonSection({ label }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-60">
      <Settings2 className="w-12 h-12 text-synapsix-muted" />
      <p className="text-synapsix-muted text-sm">Ajustes de <strong>{label}</strong> próximamente</p>
    </div>
  )
}

export default function SettingsPage() {
  const navigate  = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { getBackgroundStyle } = useSettingsStore()

  const initialSection = searchParams.get('section') || 'general'
  const [activeSection, setActiveSection] = useState(initialSection)
  const [activeModules, setActiveModules] = useState([])
  const [loadingModules, setLoadingModules] = useState(true)

  // Cargar módulos activos del backend
  useEffect(() => {
    api.get('/core/modules/active/').then(r => {
      const mods = Array.isArray(r.data) ? r.data : (r.data?.results || [])
      setActiveModules(mods)
    }).catch(() => {}).finally(() => setLoadingModules(false))
  }, [])

  // Sincronizar URL con sección activa
  const goTo = (id) => {
    setActiveSection(id)
    setSearchParams({ section: id })
  }

  // Construir secciones de módulos activos
  const moduleSections = useMemo(() => {
    const groups = []
    activeModules.forEach(mod => {
      const sections = MODULE_SECTIONS[mod.slug]
      if (sections && sections.length > 0) {
        groups.push({
          group: mod.name.toUpperCase(),
          items: sections.map(s => ({
            ...s,
            icon: s.icon || MOD_ICONS[mod.slug] || Settings2,
          })),
        })
      }
    })
    return groups
  }, [activeModules])

  const allGroups = [...STATIC_SECTIONS, ...moduleSections]

  // Componente activo
  const Component = SECTION_MAP[activeSection]
  const activeLabel = allGroups
    .flatMap(g => g.items)
    .find(i => i.id === activeSection)?.label || ''

  return (
    <div className="min-h-screen relative" style={{ background: getBackgroundStyle() }}>
      <div className="absolute inset-0 noise-bg pointer-events-none" />

      {/* ─── Top bar ─────────────────────────────────────────────────── */}
      <div className="relative border-b border-synapsix-border glass sticky top-0 z-40">
        <div className="flex items-center gap-3 px-4 h-12">
          <button
            onClick={() => navigate('/launchpad')}
            className="flex items-center gap-1.5 text-synapsix-muted hover:text-synapsix-text-2 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Synapsix ERP</span>
          </button>
          <div className="w-px h-4 bg-synapsix-border mx-1" />
          <span className="text-synapsix-muted text-sm">Ajustes</span>
          {activeSection !== 'general' && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-synapsix-border-2" />
              <span className="text-synapsix-text font-semibold text-sm">{activeLabel}</span>
            </>
          )}
        </div>
      </div>

      {/* ─── Body ────────────────────────────────────────────────────── */}
      <div className="relative flex h-[calc(100vh-48px)]">

        {/* ── Sidebar ─────────────────────────────────────────────────── */}
        <aside className="w-60 border-r border-synapsix-border bg-synapsix-surface/70 backdrop-blur-sm flex-shrink-0 overflow-y-auto">
          <nav className="py-3">
            {allGroups.map(({ group, items }) => (
              <div key={group} className="mb-1">
                <p className="px-4 pt-3 pb-1 text-[9px] font-bold uppercase tracking-widest text-synapsix-muted-2 select-none">
                  {group}
                </p>
                {items.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    id={`settings-nav-${id}`}
                    onClick={() => goTo(id)}
                    className={clsx(
                      'w-full flex items-center gap-2.5 px-4 py-2 text-sm text-left transition-all duration-150',
                      activeSection === id
                        ? 'bg-synapsix-red/12 text-synapsix-red font-semibold border-r-2 border-synapsix-red'
                        : 'text-synapsix-muted hover:text-synapsix-text-2 hover:bg-synapsix-surface-2'
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {label}
                  </button>
                ))}
              </div>
            ))}

            {/* Módulos inactivos — indicador */}
            {!loadingModules && (
              <div className="px-4 pt-4 pb-2">
                <p className="text-[9px] text-synapsix-muted-2 leading-relaxed">
                  Los ajustes de módulos aparecen aquí al activarlos desde el Launchpad.
                </p>
              </div>
            )}

            {loadingModules && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-4 h-4 text-synapsix-muted animate-spin" />
              </div>
            )}
          </nav>
        </aside>

        {/* ── Content ─────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-3xl mx-auto">
            {Component
              ? <Component />
              : <ComingSoonSection label={activeLabel} />
            }
          </div>
        </main>
      </div>
    </div>
  )
}
