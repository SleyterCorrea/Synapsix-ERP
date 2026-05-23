/**
 * SYNAPSIX ERP — Settings Layout
 * Shell principal de ajustes con sidebar izquierdo.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Settings2, Paintbrush, Users, ShieldCheck,
  Building2, Wrench, Save, X
} from 'lucide-react'
import clsx from 'clsx'
import useSettingsStore from '@store/settingsStore'
import AppearanceSection from './sections/AppearanceSection'
import GeneralSection from './sections/GeneralSection'
import UsersSection from './sections/UsersSection'
import PermissionsSection from './sections/PermissionsSection'

const SECTIONS = [
  { id: 'general',     label: 'Ajustes generales', icon: Settings2 },
  { id: 'appearance',  label: 'Apariencia',         icon: Paintbrush },
  { id: 'users',       label: 'Usuarios',           icon: Users },
  { id: 'permissions', label: 'Permisos',           icon: ShieldCheck },
]

export default function SettingsPage() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('general')
  const { getBackgroundStyle } = useSettingsStore()

  const SectionComponent = {
    general:     GeneralSection,
    appearance:  AppearanceSection,
    users:       UsersSection,
    permissions: PermissionsSection,
  }[activeSection]

  return (
    <div
      className="min-h-screen relative"
      style={{ background: getBackgroundStyle() }}
    >
      <div className="absolute inset-0 noise-bg pointer-events-none" />

      {/* ─── Top bar ──────────────────────────────────────────────── */}
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

          <span className="text-synapsix-text font-semibold text-sm">Ajustes</span>
        </div>
      </div>

      {/* ─── Body ─────────────────────────────────────────────────── */}
      <div className="relative flex h-[calc(100vh-48px)]">

        {/* Sidebar */}
        <aside className="w-56 border-r border-synapsix-border bg-synapsix-surface/60 backdrop-blur-sm flex-shrink-0 overflow-y-auto">
          <nav className="p-2 space-y-0.5">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                id={`settings-nav-${id}`}
                onClick={() => setActiveSection(id)}
                className={clsx(
                  'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-left transition-all duration-150',
                  activeSection === id
                    ? 'bg-synapsix-red/15 text-synapsix-red border border-synapsix-red/25 font-medium'
                    : 'text-synapsix-muted hover:text-synapsix-text-2 hover:bg-synapsix-surface-2'
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-3xl mx-auto">
            <SectionComponent />
          </div>
        </main>
      </div>
    </div>
  )
}
