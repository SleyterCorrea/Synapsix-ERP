/**
 * SYNAPSIX ERP — Settings Store v2 (Zustand + persist)
 *
 * SEPARAMOS fondo de imagen de fondo de gradiente.
 * Cambiar gradiente NO borra la imagen de fondo y viceversa.
 * Temas: dark (default) + light (modo blanco)
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const THEMES = {
  dark:  { label: 'Oscuro',  preview: '#0A0A0C' },
  light: { label: 'Claro',   preview: '#f5f5f5' },
}

export const BACKGROUNDS = {
  default: { label: 'Predeterminado', preview: '#0A0A0C', css: '#0A0A0C' },
  cosmos:  { label: 'Cosmos',  preview: 'linear-gradient(135deg,#06060f,#0d0a1e,#060610)', css: 'linear-gradient(135deg,#06060f,#0d0a1e,#060610)' },
  forge:   { label: 'Forja',   preview: 'linear-gradient(135deg,#0f0505,#1c0a08,#0f0505)', css: 'linear-gradient(135deg,#0f0505,#1c0a08,#0f0505)' },
  abyss:   { label: 'Abismo',  preview: 'linear-gradient(135deg,#030d10,#071a20,#030d10)', css: 'linear-gradient(135deg,#030d10,#071a20,#030d10)' },
  granite: { label: 'Granito', preview: 'linear-gradient(160deg,#101014,#1a1a22)',         css: 'linear-gradient(160deg,#101014,#1a1a22)' },
  dusk:    { label: 'Crepúsculo', preview: 'linear-gradient(135deg,#0a080f,#150d1a,#0a080f)', css: 'linear-gradient(135deg,#0a080f,#150d1a,#0a080f)' },
  // Temas claros
  snow:    { label: 'Nieve',   preview: '#f8f9fa', css: '#f8f9fa' },
  cloud:   { label: 'Nube',    preview: 'linear-gradient(135deg,#e8eaf0,#f5f5f5)', css: 'linear-gradient(135deg,#e8eaf0,#f5f5f5)' },
  custom:  { label: 'Personalizado', preview: null, css: null },
}

// Detecta si un fondo es "claro" para aplicar el tema light automáticamente
export function isLightBackground(key) {
  return key === 'snow' || key === 'cloud'
}

const applyTheme = (theme) => {
  document.documentElement.setAttribute('data-theme', theme || 'dark')
}

const useSettingsStore = create(
  persist(
    (set, get) => ({
      // Tema (dark | light)
      theme: 'dark',

      // Fondo de gradiente/color
      backgroundKey: 'default',
      customBgValue: '',

      // Imagen de fondo del launchpad (base64 o URL) — INDEPENDIENTE del gradiente
      wallpaperUrl:  null,
      wallpaperPos:  'center',

      // Logo de empresa cacheado (URL absoluta del backend)
      companyLogoUrl: null,
      companyName:    'Synapsix',

      // ─── Acciones tema ───────────────────────────────────────────────
      setTheme: (t) => {
        set({ theme: t })
        applyTheme(t)
      },

      // ─── Acciones fondo (NO toca la imagen) ─────────────────────────
      setBackground: (key, customValue = '') => {
        const light = isLightBackground(key)
        set({
          backgroundKey: key,
          customBgValue: customValue,
          theme: light ? 'light' : get().theme,
        })
        if (light) applyTheme('light')
      },

      // ─── Imagen de fondo (NO toca el gradiente) ──────────────────────
      setWallpaper: (url, pos = 'center') => set({ wallpaperUrl: url, wallpaperPos: pos }),
      setWallpaperPos: (pos) => set({ wallpaperPos: pos }),
      clearWallpaper: () => set({ wallpaperUrl: null, wallpaperPos: 'center' }),

      // ─── Logo empresa ────────────────────────────────────────────────
      setCompanyLogo: (url, name) => set({ companyLogoUrl: url, companyName: name || get().companyName }),
      clearCompanyLogo: () => set({ companyLogoUrl: null }),

      // ─── getBackgroundStyle: imagen tiene prioridad, luego gradiente ─
      getBackgroundStyle: () => {
        const { wallpaperUrl, wallpaperPos, backgroundKey, customBgValue, theme } = get()
        if (wallpaperUrl) {
          return `url("${wallpaperUrl}") ${wallpaperPos || 'center'}/cover no-repeat`
        }
        if (backgroundKey === 'custom') {
          if (!customBgValue) return theme === 'light' ? '#f5f5f5' : '#0A0A0C'
          if (customBgValue.startsWith('http') || customBgValue.startsWith('/')) {
            return `url("${customBgValue}") center/cover no-repeat`
          }
          return customBgValue
        }
        return BACKGROUNDS[backgroundKey]?.css || (theme === 'light' ? '#f5f5f5' : '#0A0A0C')
      },

      // ─── Inicializar tema al arrancar ────────────────────────────────
      initTheme: () => {
        const { theme } = get()
        applyTheme(theme || 'dark')
      },
    }),
    {
      name: 'synapsix-appearance-v3',
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme || 'dark')
      },
    }
  )
)

export default useSettingsStore
