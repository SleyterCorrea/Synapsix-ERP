/**
 * SYNAPSIX ERP — Chat Store v2
 * Estado del chat: contactos con presencia real WS + historial en memoria.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const STATUSES = {
  online:  { label: 'En línea',     color: '#22c55e' },
  away:    { label: 'Ausente',      color: '#eab308' },
  busy:    { label: 'Ocupado',      color: '#ef4444' },
  offline: { label: 'Desconectado', color: '#6b7280' },
}

// Contactos de demostración — se actualizarán con presencia real vía WS
const INITIAL_CONTACTS = [
  { id: '2', name: 'María García',  initials: 'MG', role: 'Inventarista',  status: 'offline' },
  { id: '3', name: 'Carlos López',  initials: 'CL', role: 'Cajero',        status: 'offline' },
  { id: '4', name: 'Ana Martínez',  initials: 'AM', role: 'Administrador', status: 'offline' },
  { id: '5', name: 'Pedro Sánchez', initials: 'PS', role: 'Mesero',        status: 'offline' },
]

const useChatStore = create(
  persist(
    (set, get) => ({
      isOpen:          false,
      activeContactId: null,
      contacts:        INITIAL_CONTACTS,
      messages:        {},      // { [contactId]: Message[] } — en memoria por sesión
      myStatus:        'online',
      unreadCounts:    {},

      // ── Acciones UI ────────────────────────────────────────────────────────
      toggle:  () => set(s => ({ isOpen: !s.isOpen })),
      close:   () => set({ isOpen: false }),
      goBack:  () => set({ activeContactId: null }),

      openChat: (contactId) => set(s => ({
        isOpen:          true,
        activeContactId: contactId,
        unreadCounts:    { ...s.unreadCounts, [contactId]: 0 },
      })),

      clearUnread: (contactId) => set(s => ({
        unreadCounts: { ...s.unreadCounts, [contactId]: 0 },
      })),

      setMyStatus: (status) => set({ myStatus: status }),

      // ── Presencia (WebSocket) ──────────────────────────────────────────────
      setContactStatus: (userId, status) => set(s => ({
        contacts: s.contacts.map(c => c.id === userId ? { ...c, status } : c),
      })),

      // Agrega contacto dinámico si no existe
      ensureContact: (userId, name) => set(s => {
        if (s.contacts.find(c => c.id === userId)) return {}
        const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
        return {
          contacts: [...s.contacts, { id: userId, name, initials, role: 'Usuario', status: 'online' }],
        }
      }),

      // ── Mensajes ──────────────────────────────────────────────────────────
      addMessage: (contactId, msg) => set(s => {
        const prev = s.messages[contactId] || []
        const newMessages = { ...s.messages, [contactId]: [...prev, msg] }
        // Incrementar no-leídos si no es la conversación activa
        const unread = s.activeContactId === contactId || msg.mine
          ? s.unreadCounts
          : { ...s.unreadCounts, [contactId]: (s.unreadCounts[contactId] || 0) + 1 }
        return { messages: newMessages, unreadCounts: unread }
      }),

      // Compatibilidad con v1
      sendMessage: (text) => {
        const { activeContactId, messages } = get()
        if (!activeContactId || !text.trim()) return
        const msg = {
          id:   Date.now(),
          text: text.trim(),
          time: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
          mine: true,
        }
        set({ messages: { ...messages, [activeContactId]: [...(messages[activeContactId] || []), msg] } })
      },
    }),
    {
      name: 'synapsix-chat-v2',
      // Solo persistir preferencias — los mensajes son en memoria
      partialize: (s) => ({ myStatus: s.myStatus }),
    }
  )
)

export default useChatStore
