/**
 * SYNAPSIX ERP — useModules Hook
 * Carga y cachea los módulos del sistema para el Launchpad
 */
import { useState, useEffect } from 'react'
import { modulesApi } from '@api/modules'

export const useModules = () => {
  const [modules, setModules] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchModules = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await modulesApi.getAll()
      setModules(response.data.results || response.data)
    } catch (err) {
      setError('No se pudieron cargar los módulos.')
      console.error('[useModules]', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchModules()
  }, [])

  return { modules, isLoading, error, refetch: fetchModules }
}
