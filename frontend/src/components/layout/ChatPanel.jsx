/**
 * SYNAPSIX ERP — ChatPanel v2
 * Panel flotante fijo en la esquina inferior derecha.
 * NO desplaza el contenido. Usa transform para ocultar/mostrar.
 * createPortal para evitar z-index issues.
 */
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MessageSquare, X, ArrowLeft, Send, Search, Phone, Video, MoreHorizontal } from 'lucide-react'
import clsx from 'clsx'
import useChatStore, { STATUSES } from '@store/chatStore'

const StatusDot = ({ status, size = 'sm' }) => {
  const color = STATUSES[status]?.color || '#6b7280'
  const sz = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'
  return (
    <span
      className={clsx(sz, 'rounded-full flex-shrink-0 ring-2 ring-synapsix-surface')}
      style={{ backgroundColor: color }}
      title={STATUSES[status]?.label}
    />
  )
}

const ContactAvatar = ({ contact, size = 'md' }) => {
  const sz = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
  return (
    <div className="relative flex-shrink-0">
      <div className={clsx(sz, 'rounded-xl bg-synapsix-surface-3 border border-synapsix-border flex items-center justify-center font-bold text-synapsix-text-2')}>
        {contact.initials}
      </div>
      <div className="absolute -bottom-0.5 -right-0.5">
        <StatusDot status={contact.status} />
      </div>
    </div>
  )
}

function ChatPanelContent() {
  const {
    isOpen, close, contacts, messages,
    activeContactId, openChat, goBack, sendMessage,
    myStatus, setMyStatus, unreadCounts,
  } = useChatStore()

  const [input, setInput]       = useState('')
  const [search, setSearch]     = useState('')
  const messagesEndRef = useRef(null)

  const activeContact  = contacts.find(c => c.id === activeContactId)
  const activeMessages = activeContactId ? (messages[activeContactId] || []) : []
  const filteredContacts = search
    ? contacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : contacts

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeMessages.length])

  const handleSend = () => {
    if (!input.trim()) return
    sendMessage(input.trim())
    setInput('')
  }

  const STATUS_OPTIONS = Object.entries(STATUSES).map(([k, v]) => ({ key: k, ...v }))

  // Panel fijo esquina inferior derecha — NO sidebar
  return createPortal(
    <>
      {/* Backdrop suave al hacer click fuera */}
      {isOpen && activeContactId && (
        <div className="fixed inset-0 z-[9990]" style={{ background: 'transparent' }} onClick={close} />
      )}

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          right: 0,
          width: 360,
          height: isOpen ? (activeContactId ? 520 : 440) : 0,
          zIndex: 9995,
          transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'all' : 'none',
          overflow: 'hidden',
          borderRadius: '16px 16px 0 0',
          boxShadow: '0 -4px 40px rgba(0,0,0,0.5)',
        }}
        className="bg-synapsix-surface border border-synapsix-border border-b-0 flex flex-col"
      >
        {/* ── Header ── */}
        {!activeContactId ? (
          <div className="border-b border-synapsix-border flex-shrink-0">
            {/* Título + cerrar */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-synapsix-muted" />
                <span className="font-semibold text-sm text-synapsix-text">Chat interno</span>
              </div>
              <button onClick={close} className="text-synapsix-muted hover:text-synapsix-text-2 transition-colors p-1 rounded-lg hover:bg-synapsix-surface-2">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mi estado */}
            <div className="flex items-center gap-2 px-4 pb-2">
              <StatusDot status={myStatus} size="md" />
              <select
                value={myStatus}
                onChange={e => setMyStatus(e.target.value)}
                className="flex-1 text-xs bg-synapsix-surface-2 border border-synapsix-border rounded-lg px-2 py-1.5 text-synapsix-text-2 outline-none focus:border-synapsix-border-2"
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Buscador */}
            <div className="px-4 pb-3 relative">
              <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-synapsix-muted" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar contactos..."
                className="w-full bg-synapsix-surface-2 border border-synapsix-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-synapsix-text placeholder:text-synapsix-muted outline-none focus:border-synapsix-border-2"
              />
            </div>
          </div>
        ) : (
          /* Header de conversación activa */
          <div className="border-b border-synapsix-border p-3 flex items-center gap-3 flex-shrink-0">
            <button onClick={goBack} className="text-synapsix-muted hover:text-synapsix-text-2 transition-colors p-1 rounded-lg hover:bg-synapsix-surface-2">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <ContactAvatar contact={activeContact} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-synapsix-text truncate">{activeContact?.name}</p>
              <div className="flex items-center gap-1.5">
                <StatusDot status={activeContact?.status} />
                <p className="text-[10px] text-synapsix-muted">{STATUSES[activeContact?.status]?.label}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button title="Llamada" className="w-7 h-7 rounded-lg flex items-center justify-center text-synapsix-muted hover:text-synapsix-text-2 hover:bg-synapsix-surface-2 transition-colors">
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
            {filteredContacts.length === 0 ? (
              <div className="py-8 text-center text-synapsix-muted text-xs">Sin resultados</div>
            ) : (
              ['online', 'away', 'busy', 'offline'].map(status => {
                const group = filteredContacts.filter(c => c.status === status)
                if (!group.length) return null
                return (
                  <div key={status}>
                    <p className="text-[10px] text-synapsix-muted-2 uppercase tracking-wider px-4 py-2 font-semibold bg-synapsix-surface-2/50">
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
                          <ContactAvatar contact={contact} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-synapsix-text truncate">{contact.name}</p>
                              {unread > 0 && (
                                <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                                  {unread}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-synapsix-muted truncate">{contact.role}</p>
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

        {/* ── Conversación ── */}
        {activeContactId && (
          <>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-synapsix-dark/30">
              {activeMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                  <MessageSquare className="w-10 h-10 text-synapsix-muted opacity-20 mb-3" />
                  <p className="text-xs text-synapsix-muted">¡Inicia la conversación!</p>
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
                    <p className={clsx('text-[10px] mt-0.5', msg.mine ? 'text-white/60' : 'text-synapsix-muted-2')}>
                      {msg.time}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-synapsix-border p-3 flex gap-2 flex-shrink-0">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Escribe un mensaje..."
                autoFocus
                className="flex-1 bg-synapsix-surface-2 border border-synapsix-border rounded-xl px-3 py-2 text-xs text-synapsix-text placeholder:text-synapsix-muted outline-none focus:border-synapsix-border-2 transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
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

export default function ChatPanel() {
  const { isOpen, toggle, unreadCounts } = useChatStore()
  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0)

  return (
    <>
      {/* Botón en el header */}
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

      {/* Panel flotante via portal */}
      <ChatPanelContent />
    </>
  )
}
