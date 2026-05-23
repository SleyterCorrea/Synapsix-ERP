/**
 * SYNAPSIX ERP — Notification Store v2
 * Persistencia con zustand/persist + lógica de unreadCount.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useNotificationStore = create(
  persist(
    (set, get) => ({
      notifications: [],

      get unreadCount() {
        return get().notifications.filter(n => !n.read).length
      },

      addNotification: (notif) => set(s => ({
        // Evitar duplicados por id
        notifications: s.notifications.find(n => n.id === notif.id)
          ? s.notifications
          : [notif, ...s.notifications].slice(0, 100), // máx 100
      })),

      markRead: (id) => set(s => ({
        notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n),
      })),

      markAllRead: () => set(s => ({
        notifications: s.notifications.map(n => ({ ...n, read: true })),
      })),

      removeNotification: (id) => set(s => ({
        notifications: s.notifications.filter(n => n.id !== id),
      })),

      clearAll: () => set({ notifications: [] }),
    }),
    {
      name: 'synapsix-notifications-v2',
      partialize: (s) => ({ notifications: s.notifications.slice(0, 50) }),
    }
  )
)

export default useNotificationStore
