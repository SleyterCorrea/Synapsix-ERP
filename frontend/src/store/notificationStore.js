/**
 * SYNAPSIX ERP — Notification Store
 * Notificaciones con timestamps reales para timeAgo dinámico.
 */
import { create } from 'zustand'

const now = () => Date.now()
const minsAgo = (m) => now() - m * 60 * 1000
const hrsAgo  = (h) => now() - h * 3600 * 1000

const INITIAL = [
  {
    id: 1, type: 'info', read: false,
    title: 'Bienvenido al sistema',
    body:  'Synapsix ERP v0.1.0 está listo. ¡Configura tu empresa!',
    ts: now(),
  },
  {
    id: 2, type: 'success', read: false,
    title: 'Módulos cargados',
    body:  '10 módulos registrados correctamente en el catálogo.',
    ts: minsAgo(2),
  },
  {
    id: 3, type: 'warning', read: true,
    title: 'Configura tu empresa',
    body:  'Ve a Ajustes → General para personalizar el sistema con tu branding.',
    ts: minsAgo(5),
  },
  {
    id: 4, type: 'info', read: true,
    title: 'Nuevos módulos disponibles',
    body:  'Calendario, Tareas y Hoja de Horas ya están activos.',
    ts: hrsAgo(1),
  },
]

const useNotificationStore = create((set, get) => ({
  notifications: INITIAL,
  isOpen: false,

  toggle: () => set(s => ({ isOpen: !s.isOpen })),
  close:  () => set({ isOpen: false }),

  markRead: (id) => set(s => ({
    notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n),
  })),

  markAllRead: () => set(s => ({
    notifications: s.notifications.map(n => ({ ...n, read: true })),
  })),

  add: (notification) => set(s => ({
    notifications: [
      { id: Date.now(), read: false, ts: Date.now(), ...notification },
      ...s.notifications,
    ],
  })),

  remove: (id) => set(s => ({
    notifications: s.notifications.filter(n => n.id !== id),
  })),
}))

export default useNotificationStore
