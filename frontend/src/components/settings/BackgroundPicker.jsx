/**
 * SYNAPSIX ERP — BackgroundPicker (con upload + posición de imagen)
 */
import { useRef, useState } from 'react'
import { Check, Upload, X, Image } from 'lucide-react'
import clsx from 'clsx'
import useSettingsStore, { BACKGROUNDS } from '@store/settingsStore'
import useTenantStore from '@store/tenantStore'

// Posiciones de imagen: grilla 3x3
const POSITIONS = [
  { v: 'top left',    label: '↖' }, { v: 'top center',   label: '↑' }, { v: 'top right',    label: '↗' },
  { v: 'center left', label: '←' }, { v: 'center',       label: '●' }, { v: 'center right', label: '→' },
  { v: 'bottom left', label: '↙' }, { v: 'bottom center',label: '↓' }, { v: 'bottom right', label: '↘' },
]

export default function BackgroundPicker() {
  const { backgroundKey, customBgValue, setBackground } = useSettingsStore()
  const { launchpadBg, launchpadBgPos, setLaunchpadBg, setLaunchpadBgPos, clearLaunchpadBg } = useTenantStore()
  const [customInput, setCustomInput] = useState(customBgValue || '')
  const fileRef = useRef(null)

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (ev) => setLaunchpadBg(ev.target.result)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleCustomApply = () => {
    if (customInput.trim()) setBackground('custom', customInput.trim())
  }

  return (
    <div className="space-y-6">

      {/* ── Imagen de fondo del escritorio ──────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-synapsix-text-2 uppercase tracking-wider">
          Imagen de fondo (solo escritorio)
        </h3>
        <p className="text-xs text-synapsix-muted">
          Esta imagen aparece únicamente en el Launchpad. El login usa el gradiente de color.
        </p>

        {launchpadBg ? (
          <div className="space-y-3">
            {/* Preview */}
            <div className="relative rounded-2xl overflow-hidden border border-synapsix-border" style={{ height: 160 }}>
              <img
                src={launchpadBg}
                alt="Fondo actual"
                className="w-full h-full object-cover"
                style={{ objectPosition: launchpadBgPos || 'center' }}
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <div className="flex gap-2">
                  <button onClick={() => fileRef.current?.click()} className="btn-secondary gap-1.5 text-xs">
                    <Upload className="w-3.5 h-3.5" /> Cambiar
                  </button>
                  <button
                    onClick={clearLaunchpadBg}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/80 text-white text-xs hover:bg-red-600 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" /> Quitar
                  </button>
                </div>
              </div>
              <div className="absolute top-2 right-2">
                <span className="badge-active text-[10px]">✓ Activa</span>
              </div>
            </div>

            {/* Control de posición */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-synapsix-muted-2 uppercase tracking-wider">
                Posición de la imagen
              </p>
              <div className="grid grid-cols-3 gap-1 w-24">
                {POSITIONS.map(pos => (
                  <button
                    key={pos.v}
                    onClick={() => setLaunchpadBgPos(pos.v)}
                    title={pos.v}
                    className={clsx(
                      'h-7 rounded text-sm font-mono transition-all',
                      launchpadBgPos === pos.v || (!launchpadBgPos && pos.v === 'center')
                        ? 'bg-synapsix-red text-white'
                        : 'bg-synapsix-surface-3 border border-synapsix-border text-synapsix-muted hover:border-synapsix-border-2'
                    )}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full h-24 rounded-2xl border-2 border-dashed border-synapsix-border hover:border-synapsix-border-2 flex flex-col items-center justify-center gap-2 transition-colors group"
          >
            <Upload className="w-6 h-6 text-synapsix-muted group-hover:text-synapsix-text-2 transition-colors" />
            <span className="text-xs text-synapsix-muted group-hover:text-synapsix-text-2 transition-colors">
              Haz click para subir una imagen (JPG, PNG, WebP)
            </span>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
      </div>

      {/* Divisor */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-synapsix-border" />
        <span className="text-xs text-synapsix-muted-2">o elige un color/gradiente</span>
        <div className="flex-1 h-px bg-synapsix-border" />
      </div>

      {/* ── Swatches predefinidos ───────────────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-synapsix-text-2 uppercase tracking-wider">
          Gradiente de color (Login + Escritorio)
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {Object.entries(BACKGROUNDS).filter(([k]) => k !== 'custom').map(([key, bg]) => {
            const isActive = backgroundKey === key && !launchpadBg
            return (
              <button
                key={key}
                onClick={() => { setBackground(key); clearLaunchpadBg() }}
                className={clsx(
                  'relative group rounded-2xl overflow-hidden border-2 transition-all duration-200 aspect-square',
                  isActive ? 'border-synapsix-red scale-[1.04]' : 'border-synapsix-border hover:border-synapsix-border-2 hover:scale-[1.02]'
                )}
                title={bg.label}
              >
                <div className="w-full h-full" style={{ background: bg.preview }} />
                <div className="absolute inset-0 noise-bg opacity-60" />
                <div className="absolute inset-x-0 bottom-0 py-1.5 bg-black/50 backdrop-blur-sm text-center">
                  <span className="text-[10px] text-white/80 font-medium">{bg.label}</span>
                </div>
                {isActive && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-synapsix-red flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── URL / CSS personalizado ─────────────────────────────────── */}
      <div className="border border-synapsix-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Image className="w-4 h-4 text-synapsix-muted" />
          <span className="text-sm font-medium text-synapsix-text-2">URL o CSS personalizado</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={customInput}
            onChange={e => setCustomInput(e.target.value)}
            placeholder="https://... ó #1a1a2e ó linear-gradient(...)"
            className="input-field flex-1 text-xs"
          />
          <button onClick={handleCustomApply} disabled={!customInput.trim()} className="btn-primary px-4 text-xs">
            Aplicar
          </button>
        </div>
      </div>

      <p className="text-xs text-synapsix-muted-2">
        💡 Los cambios se aplican en tiempo real y se guardan en este dispositivo.
      </p>
    </div>
  )
}
