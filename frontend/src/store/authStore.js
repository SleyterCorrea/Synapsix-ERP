/**
 * SYNAPSIX ERP — Auth Store (Zustand)
 * Estado global de autenticación con persistencia en localStorage
 */
import { create } from 'zustand'
import { authApi } from '@api/auth'

const useAuthStore = create((set, get) => ({
  // ─── State ──────────────────────────────────────────────────────────────
  user: null,
  accessToken: localStorage.getItem('synapsix_access_token') || null,
  refreshToken: localStorage.getItem('synapsix_refresh_token') || null,
  isAuthenticated: !!localStorage.getItem('synapsix_access_token'),
  isLoading: false,
  error: null,

  // ─── Actions ─────────────────────────────────────────────────────────────
  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const response = await authApi.login(email, password)
      const { access, refresh, user } = response.data

      // Persistir tokens
      localStorage.setItem('synapsix_access_token', access)
      localStorage.setItem('synapsix_refresh_token', refresh)

      set({
        accessToken: access,
        refreshToken: refresh,
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })

      return { success: true, user }
    } catch (error) {
      const message =
        error.response?.data?.detail ||
        error.response?.data?.non_field_errors?.[0] ||
        'Credenciales incorrectas. Verifica tu email y contraseña.'

      set({ isLoading: false, error: message, isAuthenticated: false })
      return { success: false, error: message }
    }
  },

  logout: async () => {
    const { refreshToken } = get()
    try {
      if (refreshToken) {
        await authApi.logout(refreshToken)
      }
    } catch (_) {
      // Ignorar errores en logout — limpiar de todas formas
    } finally {
      localStorage.removeItem('synapsix_access_token')
      localStorage.removeItem('synapsix_refresh_token')
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        error: null,
      })
    }
  },

  fetchMe: async () => {
    try {
      const response = await authApi.me()
      set({ user: response.data })
    } catch (_) {
      // Si falla, el interceptor de axios ya maneja el logout
    }
  },

  clearError: () => set({ error: null }),
}))

export default useAuthStore
