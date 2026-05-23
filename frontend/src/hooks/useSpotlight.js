/**
 * SYNAPSIX ERP — useSpotlight Hook
 * Buscador tipo Spotlight (Ctrl+K) con fuzzy search entre módulos
 */
import { useState, useEffect, useCallback } from 'react'

export const useSpotlight = (modules = []) => {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')

  // Escuchar Ctrl+K globalmente
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
        setQuery('')
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
        setQuery('')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const open = useCallback(() => {
    setIsOpen(true)
    setQuery('')
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    setQuery('')
  }, [])

  // Filtrar módulos por nombre o descripción
  const results = query.trim()
    ? modules.filter(
        (m) =>
          m.name.toLowerCase().includes(query.toLowerCase()) ||
          m.description?.toLowerCase().includes(query.toLowerCase())
      )
    : modules

  return {
    isOpen,
    query,
    setQuery,
    results,
    open,
    close,
  }
}
