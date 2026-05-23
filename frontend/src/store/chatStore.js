/**
 * SYNAPSIX ERP — Chat Store
 * Estado del chat interno: contactos, conversaciones, status de conexión.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const STATUSES = {
  online:  { label: 'En línea',  color: '#22c55e' },
  away:    { label: 'Ausente',   color: '#eab308' },
  busy:    { label: 'Ocupado',   color: '#ef4444' },
  offline: { label: 'Desconectado', color: '#6b7280' },
}

const MOCK_CONTACTS = [
  { id: '2', name: 'María García',  initials: 'MG', role: 'Inventarista',  status: 'online',   lastSeen: null },
  { id: '3', name: 'Carlos López',  initials: 'CL', role: 'Cajero',        status: 'away',     lastSeen: '5 min' },
  { id: '4', name: 'Ana Martínez',  initials: 'AM', role: 'Administrador', status: 'busy',     lastSeen: null },
  { id: '5', name: 'Pedro Sánchez', initials: 'PS', role: 'Mesero',        status: 'offline',  lastSeen: '2h' },
]

const MOCK_MESSAGES = {
  '2': [
    { id: 1, from: '2', text: '¡Hola! ¿Cómo va el sistema?', time: '10:30', mine: false },
    { id: 2, from: 'me', text: 'Todo bien, recién instalado 🎉', time: '10:31', mine: true },
    { id: 3, from: '2', text: 'Excelente, me parece muy bueno el diseño', time: '10:32', mine: false },
  ],
}

const useChatStore = create(
  persist(
    (set, get) => ({
      isOpen: false,
      activeContactId: null,
      contacts: MOCK_CONTACTS,
      messages: MOCK_MESSAGES,
      myStatus: 'online',
      unreadCounts: { '2': 1 },

      get totalUnread() {
        return Object.values(get().unreadCounts).reduce((a, b) => a + b, 0)
      },

      toggle: () => set(s => ({ isOpen: !s.isOpen })),
      close: () => set({ isOpen: false }),

      openChat: (contactId) => {
        set(s => ({
          isOpen: true,
          activeContactId: contactId,
          unreadCounts: { ...s.unreadCounts, [contactId]: 0 },
        }))
      },

      goBack: () => set({ activeContactId: null }),

      sendMessage: (text) => {
        const { activeContactId, messages } = get()
        if (!activeContactId || !text.trim()) return
        const prev = messages[activeContactId] || []
        const msg = { id: Date.now(), from: 'me', text: text.trim(), time: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }), mine: true }
        set({ messages: { ...messages, [activeContactId]: [...prev, msg] } })
      },

      setMyStatus: (status) => set({ myStatus: status }),
    }),
    { name: 'synapsix-chat', partialize: (s) => ({ myStatus: s.myStatus }) }
  )
)

export { STATUSES }
export default useChatStore
