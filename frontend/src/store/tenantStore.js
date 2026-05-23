/**
 * SYNAPSIX ERP — Tenant Store
 * Maneja el branding white-label por cliente/empresa.
 * Cada tenant puede tener: logo, nombre, color primario, fondo.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Aplica el color primario como CSS custom property en tiempo real
const applyPrimaryColor = (hex) => {
  if (!hex) return
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  document.documentElement.style.setProperty('--color-primary', `${r}, ${g}, ${b}`)
}

const useTenantStore = create(
  persist(
    (set, get) => ({
      // Branding
      companyName:    'Synapsix',
      companyTagline: 'ERP',
      logoBase64:     null,   // base64 string o null (usa letra)
      primaryColor:   '#C0392B',

      // Fondo del Launchpad (solo escritorio principal)
      launchpadBg:    null,   // base64 de imagen subida
      launchpadBgPos: 'center', // posición CSS: 'center', 'top left', etc.

      // Inicializar CSS variables al arrancar
      initTheme: () => {
        const { primaryColor } = get()
        applyPrimaryColor(primaryColor)
      },

      setCompanyName: (name) => set({ companyName: name }),
      setCompanyTagline: (tagline) => set({ companyTagline: tagline }),

      setLogo: (base64) => set({ logoBase64: base64 }),
      clearLogo: () => set({ logoBase64: null }),

      setPrimaryColor: (hex) => {
        set({ primaryColor: hex })
        applyPrimaryColor(hex)
      },

      setLaunchpadBg: (base64) => set({ launchpadBg: base64 }),
      setLaunchpadBgPos: (pos) => set({ launchpadBgPos: pos }),
      clearLaunchpadBg: () => set({ launchpadBg: null, launchpadBgPos: 'center' }),

      // Reset a valores por defecto (para demo/nuevos tenants)
      resetBranding: () => {
        set({
          companyName: 'Synapsix',
          companyTagline: 'ERP',
          logoBase64: null,
          primaryColor: '#C0392B',
          launchpadBg: null,
        })
        applyPrimaryColor('#C0392B')
      },
    }),
    { name: 'synapsix-tenant' }
  )
)

export { applyPrimaryColor }
export default useTenantStore
