/**
 * SYNAPSIX ERP — Chat Store v3
 *
 * Contactos: se cargan del backend (GET /core/users/) al abrir el panel.
 * Presencia real vía WebSocket.
 * Historial en memoria por sesión (no persiste — privacidad).
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const STATUSES = {
  online:  { label: 'En línea',     color: '#22c55e' },
  away:    { label: 'Ausente',      color: '#eab308' },
  busy:    { label: 'Ocupado',      color: '#ef4444' },
  offline: { label: 'Desconectado', color: '#6b7280' },
}

const useChatStore = create(
  persist(
    (set, get) => ({
      isOpen:          false,
      activeContactId: null,

      // Contactos reales del sistema (se cargan del API)
      contacts:        [],
      contactsLoaded:  false,
      contactsLoading: false,

      messages:        {},   // { [contactId]: Message[] }
      myStatus:        'online',
      unreadCounts:    {},

      // ── Cargar contactos del backend ─────────────────────────────────────
      loadContacts: async (currentUserId) => {
        if (get().contactsLoading) return
        set({ contactsLoading: true })
        try {
          // Importar api dinámicamente para evitar circular deps
          const { default: api } = await import('@api/axios')
          const res = await api.get('/core/users/')
          const users = Array.isArray(res.data) ? res.data : (res.data?.results || [])
          const contacts = users
            .filter(u => String(u.id) !== String(currentUserId) && u.is_active !== false)
            .map(u => {
              const firstName = u.first_name || ''
              const lastName  = u.last_name  || ''
              const fullName  = u.full_name  || `${firstName} ${lastName}`.trim() || u.email || 'Usuario'
              const initials  = fullName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??'
              return {
                id:       String(u.id),
                name:     fullName,
                initials,
                role:     u.role?.name || u.role || 'Usuario',
                email:    u.email || '',
                avatar:   u.avatar || u.photo || null,
                status:   'offline',
              }
            })
          set({ contacts, contactsLoaded: true, contactsLoading: false })
        } catch {
          set({ contactsLoading: false })
        }
      },

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
        contacts: s.contacts.map(c => c.id === String(userId) ? { ...c, status } : c),
      })),

      // Añade contacto dinámico si llega un mensaje de alguien no listado
      ensureContact: (userId, name, role = 'Usuario') => set(s => {
        if (s.contacts.find(c => c.id === String(userId))) return {}
        const initials = (name || '??').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
        return {
          contacts: [...s.contacts, {
            id: String(userId), name: name || 'Usuario', initials, role, status: 'online',
          }],
        }
      }),

      // ── Mensajes ──────────────────────────────────────────────────────────
      addMessage: (contactId, msg) => set(s => {
        const prev = s.messages[contactId] || []
        const newMessages = { ...s.messages, [contactId]: [...prev, msg] }
        const unread = s.activeContactId === contactId || msg.mine
          ? s.unreadCounts
          : { ...s.unreadCounts, [contactId]: (s.unreadCounts[contactId] || 0) + 1 }
        return { messages: newMessages, unreadCounts: unread }
      }),
    }),
    {
      name: 'synapsix-chat-v3',
      // Solo persistir estado de presencia propio — mensajes son en memoria
      partialize: (s) => ({ myStatus: s.myStatus }),
    }
  )
)

export default useChatStore
