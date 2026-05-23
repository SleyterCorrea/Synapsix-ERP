/**
 * SYNAPSIX ERP — NotificationPanel v3
 * Notificaciones reales vía WebSocket + sonido Web Audio API.
 * Portal fijo, no desplaza layout.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Bell, X, CheckCheck, Trash2, Info, AlertTriangle, CheckCircle, Zap } from 'lucide-react'
import clsx from 'clsx'
import { useWebSocket } from '@hooks/useWebSocket'
import useNotificationStore from '@store/notificationStore'

// ─── Sonido Web Audio API (sin archivos externos) ────────────────────────────
function playBeep(type = 'info') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    const configs = {
      info:    { freq: 440, type: 'sine',     duration: 0.15, vol: 0.15 },
      success: { freq: 523, type: 'sine',     duration: 0.2,  vol: 0.2  },
      warning: { freq: 360, type: 'triangle', duration: 0.25, vol: 0.2  },
      error:   { freq: 200, type: 'sawtooth', duration: 0.3,  vol: 0.15 },
    }
    const cfg = configs[type] || configs.info

    osc.type = cfg.type
    osc.frequency.setValueAtTime(cfg.freq, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(cfg.freq * 0.7, ctx.currentTime + cfg.duration)
    gain.gain.setValueAtTime(cfg.vol, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + cfg.duration)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + cfg.duration)
  } catch { /* browser policy */ }
}

function timeAgo(iso) {
  const mins = Math.floor((Date.now() - new Date(iso)) / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

const LEVEL_CFG = {
  info:    { icon: Info,          color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20' },
  success: { icon: CheckCircle,   color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  warning: { icon: AlertTriangle, color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
  error:   { icon: Zap,           color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20' },
}

function NotifItem({ notif, onRead, onDelete }) {
  const cfg   = LEVEL_CFG[notif.level] || LEVEL_CFG.info
  const Icon  = cfg.icon
  return (
    <div className={clsx(
      'flex items-start gap-3 px-4 py-3 border-b border-synapsix-border last:border-0 transition-all',
      !notif.read ? 'bg-synapsix-surface-2/60' : 'opacity-60'
    )}>
      <div className={clsx('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border', cfg.bg)}>
        <Icon className={clsx('w-4 h-4', cfg.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={clsx('text-xs font-semibold leading-snug', notif.read ? 'text-synapsix-muted' : 'text-synapsix-text')}>
            {notif.title}
          </p>
          <span className="text-[10px] text-synapsix-muted-2 flex-shrink-0">{timeAgo(notif.created_at)}</span>
        </div>
        {notif.message && <p className="text-[11px] text-synapsix-muted mt-0.5 leading-relaxed">{notif.message}</p>}
        {!notif.read && (
          <button onClick={() => onRead(notif.id)} className="text-[10px] text-blue-400 hover:text-blue-300 mt-1 transition-colors">
            Marcar como leída
          </button>
        )}
      </div>
      <button onClick={() => onDelete(notif.id)} className="w-6 h-6 rounded-lg flex items-center justify-center text-synapsix-muted hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0">
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}

function NotificationPanelContent({ isOpen, close }) {
  const {
    notifications, addNotification,
    markRead, markAllRead, removeNotification, clearAll,
    unreadCount,
  } = useNotificationStore()

  // ─── WebSocket ────────────────────────────────────────────────────────────
  const handleWsMsg = useCallback((msg) => {
    if (msg.type === 'push_notification' || msg.type === 'notification') {
      const notif = {
        id:         msg.id || Date.now().toString(),
        title:      msg.title || 'Notificación',
        message:    msg.message || '',
        level:      msg.level  || 'info',
        read:       false,
        created_at: msg.ts || new Date().toISOString(),
      }
      addNotification(notif)
      playBeep(notif.level)
    }
  }, [addNotification])

  useWebSocket('/ws/notifications/', { onMessage: handleWsMsg })

  if (!isOpen) return null

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9989]" onClick={close} style={{ background: 'transparent' }} />
      <div style={{
        position: 'fixed', top: 48, right: 8,
        width: 360, maxHeight: 480,
        zIndex: 9990,
        borderRadius: 16,
        boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
      }}
        className="bg-synapsix-surface border border-synapsix-border flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-synapsix-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-synapsix-muted" />
            <span className="font-semibold text-sm text-synapsix-text">Notificaciones</span>
            {unreadCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button onClick={markAllRead} title="Marcar todas como leídas"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-synapsix-muted hover:text-synapsix-text-2 hover:bg-synapsix-surface-2 transition-colors">
                <CheckCheck className="w-4 h-4" />
              </button>
            )}
            {notifications.length > 0 && (
              <button onClick={clearAll} title="Borrar todas"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-synapsix-muted hover:text-red-400 hover:bg-red-500/10 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button onClick={close}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-synapsix-muted hover:text-synapsix-text-2 hover:bg-synapsix-surface-2 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Bell className="w-10 h-10 text-synapsix-muted opacity-20" />
              <p className="text-xs text-synapsix-muted">Sin notificaciones</p>
            </div>
          ) : (
            notifications.map(n => (
              <NotifItem key={n.id} notif={n} onRead={markRead} onDelete={removeNotification} />
            ))
          )}
        </div>
      </div>
    </>,
    document.body
  )
}

export default function NotificationPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const { unreadCount, addNotification } = useNotificationStore()

  // ─── Inyectar helper global para tests/demo ────────────────────────────────
  useEffect(() => {
    window._testNotif = (level = 'info') => addNotification({
      id: Date.now().toString(), title: 'Notificación de prueba',
      message: `Tipo: ${level}`, level, read: false, created_at: new Date().toISOString(),
    })
  }, [addNotification])

  return (
    <>
      <button id="btn-notifications" onClick={() => setIsOpen(o => !o)}
        className={clsx(
          'w-8 h-8 rounded-lg flex items-center justify-center transition-colors relative',
          isOpen ? 'text-synapsix-text bg-synapsix-surface-3' : 'text-synapsix-muted hover:text-synapsix-text-2 hover:bg-synapsix-surface-2'
        )}>
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      <NotificationPanelContent isOpen={isOpen} close={() => setIsOpen(false)} />
    </>
  )
}
