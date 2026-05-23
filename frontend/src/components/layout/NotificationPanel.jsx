/**
 * SYNAPSIX ERP — NotificationPanel v2
 * Dropdown flotante con z-[200] (siempre encima de todo).
 * Renderiza via portal para evitar stacking context de módulos.
 */
import { useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Bell, X, CheckCheck, Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react'
import clsx from 'clsx'
import useNotificationStore from '@store/notificationStore'

const TYPE_CONFIG = {
  info:    { icon: Info,          color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20' },
  success: { icon: CheckCircle,   color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  warning: { icon: AlertTriangle, color: 'text-yellow-400',  bg: 'bg-yellow-500/10 border-yellow-500/20' },
  error:   { icon: AlertCircle,   color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20' },
}

function timeAgo(ts) {
  if (!ts) return ''
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (diff < 60) return 'Ahora'
  if (diff < 3600) return `${Math.floor(diff/60)} min`
  if (diff < 86400) return `${Math.floor(diff/3600)}h`
  return new Date(ts).toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

// Dropdown como portal (siempre encima de todo)
function NotificationDropdown({ anchorRef, onClose }) {
  const { notifications, markRead, markAllRead, remove } = useNotificationStore()
  const panelRef = useRef(null)

  // Posición absoluta basada en el botón
  const rect = anchorRef.current?.getBoundingClientRect()
  const top  = (rect?.bottom ?? 56) + 8
  const right = window.innerWidth - (rect?.right ?? window.innerWidth)

  // Cerrar al click fuera
  useEffect(() => {
    const handler = (e) => {
      if (!panelRef.current?.contains(e.target) && !anchorRef.current?.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose, anchorRef])

  const unread = notifications.filter(n => !n.read).length

  return createPortal(
    <div
      ref={panelRef}
      style={{ position: 'fixed', top, right, zIndex: 9999, width: 340 }}
      className="glass rounded-2xl shadow-spotlight border border-synapsix-border overflow-hidden animate-fade-in"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-synapsix-border">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-synapsix-muted" />
          <span className="text-sm font-semibold text-synapsix-text">Notificaciones</span>
          {unread > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-synapsix-red/20 text-synapsix-red border border-synapsix-red/30 font-semibold">
              {unread} nuevas
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unread > 0 && (
            <button onClick={markAllRead} title="Marcar todo como leído"
              className="p-1.5 text-synapsix-muted hover:text-synapsix-text-2 hover:bg-synapsix-surface-2 rounded-lg transition-colors">
              <CheckCheck className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={onClose} className="p-1.5 text-synapsix-muted hover:text-synapsix-text-2 hover:bg-synapsix-surface-2 rounded-lg transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="max-h-[420px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="py-12 text-center">
            <Bell className="w-10 h-10 mx-auto mb-3 text-synapsix-muted opacity-30" />
            <p className="text-sm text-synapsix-muted">Sin notificaciones</p>
          </div>
        ) : notifications.map((n) => {
          const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info
          const Icon = cfg.icon
          return (
            <div
              key={n.id}
              onClick={() => markRead(n.id)}
              className={clsx(
                'flex gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-synapsix-border last:border-0 group',
                'hover:bg-synapsix-surface-2',
                !n.read && 'bg-synapsix-surface/40'
              )}
            >
              {/* Ícono */}
              <div className={clsx('w-8 h-8 rounded-xl border flex items-center justify-center flex-shrink-0', cfg.bg)}>
                <Icon className={clsx('w-4 h-4', cfg.color)} />
              </div>

              {/* Contenido */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={clsx('text-xs font-semibold leading-tight', n.read ? 'text-synapsix-text-2' : 'text-synapsix-text')}>
                    {n.title}
                  </p>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[10px] text-synapsix-muted-2">{timeAgo(n.ts) || n.time}</span>
                    <button
                      onClick={e => { e.stopPropagation(); remove(n.id) }}
                      className="opacity-0 group-hover:opacity-100 text-synapsix-muted hover:text-red-400 transition-all"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-synapsix-muted mt-0.5 leading-relaxed line-clamp-2">{n.body}</p>
              </div>

              {/* Punto no leído */}
              {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-synapsix-red mt-1.5 flex-shrink-0 animate-pulse" />}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-2.5 border-t border-synapsix-border bg-synapsix-surface-2 flex items-center justify-between">
          <span className="text-[10px] text-synapsix-muted-2">{notifications.length} notificaciones</span>
          <button onClick={markAllRead} className="text-xs text-synapsix-muted hover:text-synapsix-text-2 transition-colors">
            Marcar todo leído
          </button>
        </div>
      )}
    </div>,
    document.body
  )
}

export default function NotificationPanel() {
  const { isOpen, toggle, close } = useNotificationStore()
  const { notifications } = useNotificationStore()
  const unreadCount = notifications.filter(n => !n.read).length
  const btnRef = useRef(null)

  return (
    <div className="relative">
      <button
        id="btn-notifications"
        ref={btnRef}
        onClick={toggle}
        className={clsx(
          'w-8 h-8 rounded-lg flex items-center justify-center transition-colors relative',
          isOpen
            ? 'text-synapsix-text bg-synapsix-surface-3'
            : 'text-synapsix-muted hover:text-synapsix-text-2 hover:bg-synapsix-surface-2'
        )}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-synapsix-red text-white text-[9px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && <NotificationDropdown anchorRef={btnRef} onClose={close} />}
    </div>
  )
}
