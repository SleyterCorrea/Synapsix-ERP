/**
 * SYNAPSIX ERP — BackgroundPicker v3
 *
 * Secciones:
 * 1. Tema (Oscuro / Claro)
 * 2. Imagen de fondo del Launchpad (INDEPENDIENTE del gradiente)
 * 3. Gradiente/color (NO borra la imagen)
 */
import { useRef, useState } from 'react'
import { Check, Upload, X, Image, Sun, Moon } from 'lucide-react'
import clsx from 'clsx'
import useSettingsStore, { BACKGROUNDS, THEMES } from '@store/settingsStore'

const POSITIONS = [
  { v: 'top left',     label: '↖' }, { v: 'top center',    label: '↑' }, { v: 'top right',    label: '↗' },
  { v: 'center left',  label: '←' }, { v: 'center',        label: '●' }, { v: 'center right', label: '→' },
  { v: 'bottom left',  label: '↙' }, { v: 'bottom center', label: '↓' }, { v: 'bottom right', label: '↘' },
]

export default function BackgroundPicker() {
  const {
    theme, setTheme,
    backgroundKey, setBackground,
    wallpaperUrl, wallpaperPos, setWallpaper, setWallpaperPos, clearWallpaper,
  } = useSettingsStore()

  const fileRef = useRef(null)

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (ev) => setWallpaper(ev.target.result, wallpaperPos || 'center')
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div className="space-y-8">

      {/* ── 1. Modo (oscuro/claro) ─────────────────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-synapsix-text-2 uppercase tracking-wider">Modo de interfaz</h3>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(THEMES).map(([key, t]) => {
            const isLight = key === 'light'
            const Icon = isLight ? Sun : Moon
            return (
              <button key={key} onClick={() => setTheme(key)}
                className={clsx(
                  'flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all',
                  theme === key
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-synapsix-border hover:border-synapsix-border-2'
                )}>
                {/* Mini preview */}
                <div className={clsx(
                  'w-full h-16 rounded-xl border flex items-center justify-center gap-3 transition-colors',
                  isLight
                    ? 'bg-[#f5f5f5] border-gray-200'
                    : 'bg-[#0A0A0C] border-[#252530]'
                )}>
                  {/* Mini sidebar */}
                  <div className={clsx('w-8 h-full rounded-l-xl flex-shrink-0', isLight ? 'bg-white border-r border-gray-200' : 'bg-[#14141A] border-r border-[#252530]')} />
                  {/* Mini content */}
                  <div className="flex-1 pr-2 space-y-1">
                    <div className={clsx('h-2 rounded-full w-16', isLight ? 'bg-gray-300' : 'bg-[#252530]')} />
                    <div className={clsx('h-1.5 rounded-full w-10', isLight ? 'bg-gray-200' : 'bg-[#1A1A22]')} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Icon className={clsx('w-4 h-4', theme === key ? 'text-red-400' : 'text-synapsix-muted')} />
                  <span className={clsx('text-sm font-semibold', theme === key ? 'text-red-400' : 'text-synapsix-muted')}>
                    {t.label}
                  </span>
                  {theme === key && <Check className="w-3.5 h-3.5 text-red-400" />}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── 2. Imagen de fondo ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-synapsix-text-2 uppercase tracking-wider">Imagen de fondo</h3>
            <p className="text-xs text-synapsix-muted mt-0.5">Solo aparece en el Launchpad. No afecta el gradiente.</p>
          </div>
          {wallpaperUrl && (
            <button onClick={clearWallpaper} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors">
              <X className="w-3 h-3" /> Quitar
            </button>
          )}
        </div>

        {wallpaperUrl ? (
          <div className="space-y-3">
            <div className="relative rounded-2xl overflow-hidden border border-synapsix-border group" style={{ height: 140 }}>
              <img src={wallpaperUrl} alt="Fondo" className="w-full h-full object-cover" style={{ objectPosition: wallpaperPos || 'center' }} />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button onClick={() => fileRef.current?.click()} className="btn-secondary gap-1.5 text-xs py-1.5 px-3">
                  <Upload className="w-3.5 h-3.5" /> Cambiar
                </button>
              </div>
              <div className="absolute top-2 right-2">
                <span className="badge-active text-[10px]">✓ Activa</span>
              </div>
            </div>
            {/* Posición */}
            <div>
              <p className="text-xs font-medium text-synapsix-muted-2 uppercase tracking-wider mb-2">Posición</p>
              <div className="grid grid-cols-3 gap-1 w-24">
                {POSITIONS.map(pos => (
                  <button key={pos.v} onClick={() => setWallpaperPos(pos.v)} title={pos.v}
                    className={clsx(
                      'h-7 rounded text-sm font-mono transition-all',
                      (wallpaperPos === pos.v || (!wallpaperPos && pos.v === 'center'))
                        ? 'bg-red-500 text-white'
                        : 'bg-synapsix-surface-3 border border-synapsix-border text-synapsix-muted hover:border-synapsix-border-2'
                    )}>
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()}
            className="w-full h-24 rounded-2xl border-2 border-dashed border-synapsix-border hover:border-synapsix-border-2 flex flex-col items-center justify-center gap-2 transition-colors group">
            <Upload className="w-6 h-6 text-synapsix-muted group-hover:text-synapsix-text-2 transition-colors" />
            <span className="text-xs text-synapsix-muted group-hover:text-synapsix-text-2 transition-colors">
              Haz click para subir una imagen (JPG, PNG, WebP)
            </span>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
      </div>

      {/* ── 3. Gradiente de color ──────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 pb-2">
          <div className="flex-1 h-px bg-synapsix-border" />
          <span className="text-xs text-synapsix-muted-2">o elige un color de fondo</span>
          <div className="flex-1 h-px bg-synapsix-border" />
        </div>
        <h3 className="text-sm font-bold text-synapsix-text-2 uppercase tracking-wider">Color de fondo</h3>
        <p className="text-xs text-synapsix-muted">Se aplica cuando no hay imagen. No borra el wallpaper.</p>
        <div className="grid grid-cols-4 sm:grid-cols-4 gap-3">
          {Object.entries(BACKGROUNDS).filter(([k]) => k !== 'custom').map(([key, bg]) => {
            const isActive = backgroundKey === key
            return (
              <button key={key}
                onClick={() => setBackground(key)}  /* NO llama clearWallpaper */
                className={clsx(
                  'relative group rounded-2xl overflow-hidden border-2 transition-all duration-200',
                  'aspect-square',
                  isActive ? 'border-red-500 scale-[1.04]' : 'border-synapsix-border hover:border-synapsix-border-2 hover:scale-[1.02]'
                )}
                title={bg.label}>
                <div className="w-full h-full" style={{ background: bg.preview || '#ccc' }} />
                <div className="absolute inset-x-0 bottom-0 py-1 bg-black/60 text-center">
                  <span className="text-[10px] text-white/90 font-medium">{bg.label}</span>
                </div>
                {isActive && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <p className="text-xs text-synapsix-muted-2">💡 Los cambios se aplican en tiempo real y se guardan en este dispositivo.</p>
    </div>
  )
}
