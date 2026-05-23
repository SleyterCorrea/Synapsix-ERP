/**
 * SYNAPSIX ERP — useAuth Hook
 */
import useAuthStore from '@store/authStore'

export const useAuth = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    fetchMe,
    clearError,
  } = useAuthStore()

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    fetchMe,
    clearError,
  }
}
