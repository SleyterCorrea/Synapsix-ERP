/**
 * SYNAPSIX ERP — ChatPanel v4
 *
 * Contactos: cargados del backend (usuarios reales del sistema).
 * Presencia: WebSocket en tiempo real.
 * Sin usuarios falsos hardcodeados.
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  MessageSquare, X, ArrowLeft, Send, Search,
  Phone, WifiOff, Loader2, RefreshCw, Users,
} from 'lucide-react'
import clsx from 'clsx'
import { useWebSocket } from '@hooks/useWebSocket'
import useChatStore, { STATUSES } from '@store/chatStore'
import { useAuth } from '@hooks/useAuth'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────
const StatusDot = ({ status, size = 'sm' }) => {
  const color = STATUSES[status]?.color || '#6b7280'
  return (
    <span
      className={clsx(size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3', 'rounded-full flex-shrink-0 ring-2 ring-synapsix-surface')}
      style={{ backgroundColor: color }}
      title={STATUSES[status]?.label}
    />
  )
}

const Avatar = ({ contact, size = 'md' }) => {
  const dim = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
  return (
    <div className="relative flex-shrink-0">
      {contact.avatar ? (
        <img
          src={contact.avatar}
          alt={contact.name}
          className={clsx(dim, 'rounded-xl object-cover border border-synapsix-border')}
          onError={e => { e.currentTarget.style.display = 'none' }}
        />
      ) : (
        <div className={clsx(dim, 'rounded-xl bg-synapsix-surface-3 border border-synapsix-border flex items-center justify-center font-bold text-synapsix-text-2')}>
          {contact.initials || contact.name?.[0]?.toUpperCase() || '?'}
        </div>
      )}
      <div className="absolute -bottom-0.5 -right-0.5">
        <StatusDot status={contact.status} />
      </div>
    </div>
  )
}

// ─── Panel interno ────────────────────────────────────────────────────────────
function ChatPanelContent() {
  const {
    isOpen, close,
    contacts, contactsLoaded, contactsLoading, loadContacts,
    setContactStatus, ensureContact,
    messages, addMessage,
    activeContactId, openChat, goBack,
    myStatus, setMyStatus, unreadCounts, clearUnread,
  } = useChatStore()

  const { user } = useAuth()
  const [input, setInput]   = useState('')
  const [search, setSearch] = useState('')
  const [typing, setTyping] = useState(null)
  const messagesEndRef = useRef(null)
  const typingTimer    = useRef(null)

  const activeContact  = contacts.find(c => c.id === activeContactId)
  const activeMessages = activeContactId ? (messages[activeContactId] || []) : []

  const filteredContacts = search
    ? contacts.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.role?.toLowerCase().includes(search.toLowerCase())
      )
    : contacts

  // Scroll al final de mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeMessages.length])

  // Limpiar no leídos al abrir chat
  useEffect(() => {
    if (activeContactId) clearUnread(activeContactId)
  }, [activeContactId, clearUnread])

  // Cargar contactos reales al abrir el panel
  useEffect(() => {
    if (isOpen && !contactsLoaded && !contactsLoading && user?.id) {
      loadContacts(user.id)
    }
  }, [isOpen, contactsLoaded, contactsLoading, loadContacts, user?.id])

  // ─── WebSocket ────────────────────────────────────────────────────────────
  const handleWsMessage = useCallback((msg) => {
    switch (msg.type) {
      case 'chat_message': {
        if (msg.mine) return
        const contactId = String(msg.from_user)
        // Si el remitente no está en la lista, añadirlo
        ensureContact(contactId, msg.from_name, msg.from_role)
        addMessage(contactId, {
          id:   Date.now(),
          text: msg.text,
          time: fmtTime(msg.timestamp || new Date().toISOString()),
          mine: false,
        })
        break
      }
      case 'user_status':
        setContactStatus(msg.user_id, msg.status)
        break
      case 'typing_indicator':
        if (String(msg.user_id) !== String(user?.id)) {
          setTyping(msg.is_typing ? msg.user_name : null)
          clearTimeout(typingTimer.current)
          if (msg.is_typing) typingTimer.current = setTimeout(() => setTyping(null), 3000)
        }
        break
      // Cuando el WS envía la lista de usuarios conectados al conectar
      case 'presence_list':
        if (Array.isArray(msg.users)) {
          msg.users.forEach(u => {
            if (String(u.id) !== String(user?.id)) {
              setContactStatus(String(u.id), u.status || 'online')
            }
          })
        }
        break
    }
  }, [addMessage, setContactStatus, ensureContact, user?.id])

  const { send, status: wsStatus } = useWebSocket('/ws/chat/', {
    onMessage: handleWsMessage,
    enabled: isOpen,
  })

  const handleSend = () => {
    if (!input.trim() || !activeContactId) return
    const text = input.trim()
    const now  = new Date().toISOString()
    addMessage(activeContactId, { id: Date.now(), text, time: fmtTime(now), mine: true })
    send({ type: 'chat', to_user: activeContactId, text })
    setInput('')
  }

  const handleTyping = (val) => {
    setInput(val)
    if (activeContactId) send({ type: 'typing', is_typing: val.length > 0 })
  }

  const STATUS_OPTIONS = Object.entries(STATUSES).map(([k, v]) => ({ key: k, ...v }))

  // Agrupar por status con orden fijo
  const STATUS_ORDER = ['online', 'away', 'busy', 'offline']

  return createPortal(
    <>
      <div
        style={{
          position: 'fixed', bottom: 0, right: 0,
          width: 360,
          height: isOpen ? (activeContactId ? 520 : 460) : 0,
          zIndex: 9995,
          transition: 'height 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'all' : 'none',
          overflow: 'hidden',
          borderRadius: '16px 16px 0 0',
          boxShadow: '0 -4px 40px rgba(0,0,0,0.5)',
        }}
        className="bg-synapsix-surface border border-synapsix-border border-b-0 flex flex-col"
      >
        {/* ── Header lista ── */}
        {!activeContactId ? (
          <div className="border-b border-synapsix-border flex-shrink-0">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-synapsix-muted" />
                <span className="font-semibold text-sm text-synapsix-text">Chat interno</span>
                {/* WS status badge */}
                <span className={clsx(
                  'w-2 h-2 rounded-full',
                  wsStatus === 'connected'   ? 'bg-emerald-400' :
                  wsStatus === 'connecting'  ? 'bg-amber-400 animate-pulse' : 'bg-red-400'
                )} title={wsStatus} />
                <span className="text-[10px] text-synapsix-muted-2">{contacts.length} usuarios</span>
              </div>
              <div className="flex items-center gap-1">
                {/* Recargar contactos */}
                <button
                  onClick={() => { useChatStore.setState({ contactsLoaded: false }); loadContacts(user?.id) }}
                  disabled={contactsLoading}
                  title="Recargar usuarios"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-synapsix-muted hover:text-synapsix-text-2 hover:bg-synapsix-surface-2 transition-colors"
                >
                  <RefreshCw className={clsx('w-3.5 h-3.5', contactsLoading && 'animate-spin')} />
                </button>
                <button onClick={close} className="w-7 h-7 rounded-lg flex items-center justify-center text-synapsix-muted hover:text-synapsix-text-2 hover:bg-synapsix-surface-2 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mi estado */}
            <div className="flex items-center gap-2 px-4 pb-2">
              <StatusDot status={myStatus} size="md" />
              <select
                value={myStatus} onChange={e => setMyStatus(e.target.value)}
                className="flex-1 text-xs bg-synapsix-surface-2 border border-synapsix-border rounded-lg px-2 py-1.5 text-synapsix-text-2 outline-none focus:border-synapsix-border-2"
              >
                {STATUS_OPTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>

            {/* Buscador */}
            <div className="px-4 pb-3 relative">
              <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-synapsix-muted" />
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar usuarios..."
                className="w-full bg-synapsix-surface-2 border border-synapsix-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-synapsix-text placeholder:text-synapsix-muted outline-none focus:border-synapsix-border-2"
              />
            </div>
          </div>
        ) : (
          /* Header conversación */
          <div className="border-b border-synapsix-border p-3 flex items-center gap-3 flex-shrink-0">
            <button onClick={goBack} className="text-synapsix-muted hover:text-synapsix-text-2 p-1 rounded-lg hover:bg-synapsix-surface-2 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            {activeContact && <Avatar contact={activeContact} size="sm" />}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-synapsix-text truncate">{activeContact?.name}</p>
              {typing ? (
                <p className="text-[10px] text-emerald-400 animate-pulse">escribiendo...</p>
              ) : (
                <div className="flex items-center gap-1.5">
                  <StatusDot status={activeContact?.status} />
                  <p className="text-[10px] text-synapsix-muted">{STATUSES[activeContact?.status]?.label}</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              {wsStatus !== 'connected' && (
                wsStatus === 'connecting'
                  ? <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  : <WifiOff className="w-3.5 h-3.5 text-red-400" title="Sin conexión" />
              )}
              <button title="Llamar" className="w-7 h-7 rounded-lg flex items-center justify-center text-synapsix-muted hover:text-synapsix-text-2 hover:bg-synapsix-surface-2 transition-colors">
                <Phone className="w-3.5 h-3.5" />
              </button>
              <button onClick={close} className="w-7 h-7 rounded-lg flex items-center justify-center text-synapsix-muted hover:text-synapsix-text-2 hover:bg-synapsix-surface-2 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Lista de contactos ── */}
        {!activeContactId && (
          <div className="flex-1 overflow-y-auto">

            {/* Cargando */}
            {contactsLoading && (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Loader2 className="w-6 h-6 text-synapsix-muted animate-spin" />
                <p className="text-xs text-synapsix-muted">Cargando usuarios...</p>
              </div>
            )}

            {/* Sin usuarios en el sistema */}
            {!contactsLoading && contactsLoaded && contacts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 gap-3 px-4 text-center">
                <Users className="w-10 h-10 text-synapsix-muted opacity-30" />
                <p className="text-sm text-synapsix-muted">No hay otros usuarios en el sistema</p>
                <p className="text-xs text-synapsix-muted-2">
                  Ve a <strong>Ajustes → Usuarios</strong> para agregar compañeros al equipo
                </p>
              </div>
            )}

            {/* Sin resultados en búsqueda */}
            {!contactsLoading && search && filteredContacts.length === 0 && (
              <div className="py-8 text-center text-synapsix-muted text-xs">
                Sin resultados para "<strong>{search}</strong>"
              </div>
            )}

            {/* Lista agrupada por estado */}
            {!contactsLoading && filteredContacts.length > 0 && (
              STATUS_ORDER.map(status => {
                const group = filteredContacts.filter(c => c.status === status)
                if (!group.length) return null
                return (
                  <div key={status}>
                    <p className="text-[10px] text-synapsix-muted-2 uppercase tracking-wider px-4 py-2 font-semibold bg-synapsix-surface-2/50 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUSES[status].color }} />
                      {STATUSES[status]?.label} ({group.length})
                    </p>
                    {group.map(contact => {
                      const unread = unreadCounts[contact.id] || 0
                      return (
                        <button
                          key={contact.id}
                          onClick={() => openChat(contact.id)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-synapsix-surface-2 transition-colors text-left"
                        >
                          <Avatar contact={contact} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-synapsix-text truncate">{contact.name}</p>
                              {unread > 0 && (
                                <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                                  {unread > 9 ? '9+' : unread}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-synapsix-muted truncate">{contact.role}</p>
                            {contact.email && (
                              <p className="text-[10px] text-synapsix-muted-2 truncate">{contact.email}</p>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ── Mensajes ── */}
        {activeContactId && (
          <>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-synapsix-dark/30">
              {activeMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                  <MessageSquare className="w-10 h-10 text-synapsix-muted opacity-20 mb-3" />
                  <p className="text-xs text-synapsix-muted">¡Inicia la conversación!</p>
                  {wsStatus !== 'connected' && (
                    <p className="text-[10px] text-amber-400 mt-2 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Conectando...
                    </p>
                  )}
                </div>
              )}
              {activeMessages.map(msg => (
                <div key={msg.id} className={clsx('flex', msg.mine ? 'justify-end' : 'justify-start')}>
                  <div className={clsx(
                    'max-w-[80%] rounded-2xl px-3 py-2 text-xs',
                    msg.mine
                      ? 'bg-synapsix-red text-white rounded-br-sm'
                      : 'bg-synapsix-surface-3 text-synapsix-text border border-synapsix-border rounded-bl-sm'
                  )}>
                    <p className="leading-relaxed">{msg.text}</p>
                    <p className={clsx('text-[10px] mt-0.5', msg.mine ? 'text-white/60' : 'text-synapsix-muted-2')}>{msg.time}</p>
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex justify-start">
                  <div className="bg-synapsix-surface-3 border border-synapsix-border rounded-2xl rounded-bl-sm px-4 py-2.5 flex items-center gap-1">
                    {[0,1,2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 bg-synapsix-muted rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-synapsix-border p-3 flex gap-2 flex-shrink-0">
              <input
                type="text" value={input}
                onChange={e => handleTyping(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder={wsStatus === 'connected' ? 'Escribe un mensaje...' : 'Conectando...'}
                autoFocus
                disabled={wsStatus !== 'connected'}
                className="flex-1 bg-synapsix-surface-2 border border-synapsix-border rounded-xl px-3 py-2 text-xs text-synapsix-text placeholder:text-synapsix-muted outline-none focus:border-synapsix-border-2 transition-colors disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || wsStatus !== 'connected'}
                className="w-9 h-9 rounded-xl bg-synapsix-red text-white flex items-center justify-center disabled:opacity-30 hover:bg-red-600 transition-colors flex-shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}
      </div>
    </>,
    document.body
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────
export default function ChatPanel() {
  const { isOpen, toggle, unreadCounts } = useChatStore()
  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0)

  return (
    <>
      <button
        id="btn-chat"
        onClick={toggle}
        className={clsx(
          'w-8 h-8 rounded-lg flex items-center justify-center transition-colors relative',
          isOpen
            ? 'text-synapsix-text bg-synapsix-surface-3'
            : 'text-synapsix-muted hover:text-synapsix-text-2 hover:bg-synapsix-surface-2'
        )}
      >
        <MessageSquare className="w-4 h-4" />
        {totalUnread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>
      <ChatPanelContent />
    </>
  )
}
