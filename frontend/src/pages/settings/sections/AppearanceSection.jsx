/**
 * SYNAPSIX ERP — Appearance Settings Section
 */
import { Paintbrush } from 'lucide-react'
import BackgroundPicker from '@components/settings/BackgroundPicker'

export default function AppearanceSection() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-synapsix-text">Apariencia</h1>
        <p className="text-synapsix-muted text-sm mt-1">
          Personaliza el aspecto visual del sistema.
        </p>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-synapsix-border">
          <Paintbrush className="w-4 h-4 text-synapsix-muted" />
          <h2 className="text-sm font-semibold text-synapsix-text-2 uppercase tracking-wider">
            Fondo del sistema
          </h2>
        </div>
        <BackgroundPicker />
      </section>
    </div>
  )
}
