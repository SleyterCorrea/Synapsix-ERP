/**
 * SYNAPSIX ERP — Settings Store (Zustand + persist)
 * Maneja preferencias de apariencia del sistema.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const BACKGROUNDS = {
  default: {
    label: 'Predeterminado',
    preview: '#0A0A0C',
    css: '#0A0A0C',
  },
  cosmos: {
    label: 'Cosmos',
    preview: 'linear-gradient(135deg, #06060f 0%, #0d0a1e 60%, #060610 100%)',
    css: 'linear-gradient(135deg, #06060f 0%, #0d0a1e 60%, #060610 100%)',
  },
  forge: {
    label: 'Forja',
    preview: 'linear-gradient(135deg, #0f0505 0%, #1c0a08 60%, #0f0505 100%)',
    css: 'linear-gradient(135deg, #0f0505 0%, #1c0a08 60%, #0f0505 100%)',
  },
  abyss: {
    label: 'Abismo',
    preview: 'linear-gradient(135deg, #030d10 0%, #071a20 60%, #030d10 100%)',
    css: 'linear-gradient(135deg, #030d10 0%, #071a20 60%, #030d10 100%)',
  },
  granite: {
    label: 'Granito',
    preview: 'linear-gradient(160deg, #101014 0%, #1a1a22 100%)',
    css: 'linear-gradient(160deg, #101014 0%, #1a1a22 100%)',
  },
  dusk: {
    label: 'Crepúsculo',
    preview: 'linear-gradient(135deg, #0a080f 0%, #150d1a 60%, #0a080f 100%)',
    css: 'linear-gradient(135deg, #0a080f 0%, #150d1a 60%, #0a080f 100%)',
  },
  custom: {
    label: 'Personalizado',
    preview: null,
    css: null,
  },
}

const useSettingsStore = create(
  persist(
    (set, get) => ({
      backgroundKey: 'default',
      customBgValue: '',   // URL de imagen o color CSS personalizado

      setBackground: (key, customValue = '') => {
        set({ backgroundKey: key, customBgValue: customValue })
      },

      getBackgroundStyle: () => {
        const { backgroundKey, customBgValue } = get()
        if (backgroundKey === 'custom') {
          if (!customBgValue) return '#0A0A0C'
          // Si parece URL de imagen
          if (customBgValue.startsWith('http') || customBgValue.startsWith('/')) {
            return `url("${customBgValue}") center/cover no-repeat`
          }
          return customBgValue
        }
        return BACKGROUNDS[backgroundKey]?.css || '#0A0A0C'
      },
    }),
    { name: 'synapsix-appearance' }
  )
)

export default useSettingsStore
