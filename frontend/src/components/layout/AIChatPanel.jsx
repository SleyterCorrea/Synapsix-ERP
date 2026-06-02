/**
 * SYNAPSIX ERP — AIChatPanel
 * Asistente IA flotante powered by Gemini.
 * Se ubica en la esquina inferior IZQUIERDA para no colisionar con el Chat.
 * Puede ejecutar acciones en el ERP (navegar, notificar).
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Bot, X, Send, Loader2, RefreshCw, Sparkles, ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import api from '@api/axios'
import useNotificationStore from '@store/notificationStore'

const SUGGESTIONS = [
  '¿Qué mesas están ocupadas?',
  '¿Cómo creo un usuario nuevo?',
  '¿Cómo subo mi inventario?',
  '¿Cómo abro una comanda?',
  'Muéstrame el resumen del día',
]

function MarkdownText({ text }) {
  // Renderizado de markdown: **bold**, `code`, \n, bullet lists (• o -)
  const lines = text.split('\n')
  return (
    <span style={{ display: 'block' }}>
      {lines.map((line, i) => {
        const isBullet = /^[•\-\*]\s/.test(line.trimStart()) || /^\d+[️⃣]/.test(line.trimStart())
        const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
        const rendered = parts.map((p, j) => {
          if (p.startsWith('**') && p.endsWith('**')) return <strong key={j}>{p.slice(2, -2)}</strong>
          if (p.startsWith('`') && p.endsWith('`')) return <code key={j} className="bg-synapsix-surface-3 px-1 rounded text-[10px] font-mono">{p.slice(1, -1)}</code>
          return <span key={j}>{p}</span>
        })
        return (
          <span key={i} style={{
            display: 'block',
            marginTop: i === 0 ? 0 : isBullet ? 2 : 6,
            paddingLeft: isBullet ? 4 : 0,
          }}>
            {rendered}
          </span>
        )
      })}
    </span>
  )
}

export default function AIChatPanel() {
  const navigate = useNavigate()
  const { addNotification } = useNotificationStore()

  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'model', text: '¡Hola! Soy el asistente IA de Synapsix. Puedo ayudarte a gestionar tu negocio, responder preguntas o guiarte paso a paso. ¿En qué te ayudo?' }
  ])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, loading])

  const handleAction = useCallback((action) => {
    if (!action) return
    if (action.type === 'navigate' && action.path) {
      navigate(action.path)
    }
    if (action.type === 'notify') {
      addNotification({
        id:         Date.now().toString(),
        title:      action.title || 'IA Synapsix',
        message:    action.message || '',
        level:      'info',
        read:       false,
        created_at: new Date().toISOString(),
      })
    }
  }, [navigate, addNotification])

  const sendMessage = async (text) => {
    const msg = text.trim()
    if (!msg || loading) return
    setInput('')
    setError(null)
    setMessages(prev => [...prev, { role: 'user', text: msg }])
    setLoading(true)

    try {
      const history = messages.slice(-10).map(m => ({ role: m.role, text: m.text }))
      const res = await api.post('/core/ai/chat/', { message: msg, history })
      const { reply, action } = res.data
      setMessages(prev => [...prev, { role: 'model', text: reply }])
      if (action) handleAction(action)
    } catch (e) {
      const errMsg = 'El asistente está experimentando alta demanda. Intente de nuevo en unos momentos.'
      setError(errMsg)
      setMessages(prev => [...prev, { role: 'model', text: `⏳ ${errMsg}`, isError: true }])
    } finally { setLoading(false) }
  }

  const handleReset = () => {
    setMessages([{ role: 'model', text: '¡Hola! Conversación reiniciada. ¿En qué te ayudo? 😊' }])
    setError(null)
  }

  return createPortal(
    <>
      {/* Botón flotante */}
      <button
        id="btn-ai-chat"
        onClick={() => setIsOpen(o => !o)}
        className={clsx(
          'fixed bottom-4 left-4 z-[9993] w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-300',
          isOpen
            ? 'bg-synapsix-surface border border-synapsix-border-2 text-synapsix-red'
            : 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white hover:scale-110 hover:shadow-[0_0_20px_rgba(139,92,246,0.4)]'
        )}
        title="Asistente IA Synapsix">
        {isOpen ? <ChevronDown className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
      </button>

      {/* Panel */}
      <div style={{
        position: 'fixed', bottom: 68, left: 8,
        width: 360,
        height: isOpen ? 520 : 0,
        zIndex: 9992,
        transition: 'height 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease',
        opacity: isOpen ? 1 : 0,
        pointerEvents: isOpen ? 'all' : 'none',
        overflow: 'hidden',
        borderRadius: 16,
        boxShadow: '0 -4px 40px rgba(0,0,0,0.5)',
      }}
        className="bg-synapsix-surface border border-synapsix-border flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-synapsix-border flex-shrink-0 bg-gradient-to-r from-violet-600/10 to-indigo-600/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-synapsix-text">Asistente Synapsix</p>
              <p className="text-[9px] text-violet-400 font-medium">Guía Local · Siempre disponible</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handleReset} title="Nueva conversación"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-synapsix-muted hover:text-synapsix-text-2 hover:bg-synapsix-surface-2 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-synapsix-muted hover:text-synapsix-text-2 hover:bg-synapsix-surface-2 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-synapsix-dark/20">
          {messages.map((msg, i) => (
            <div key={i} className={clsx('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.role === 'model' && (
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              <div className={clsx(
                'max-w-[80%] rounded-2xl px-3 py-2.5 text-xs leading-relaxed',
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-br-sm'
                  : msg.isError
                    ? 'bg-synapsix-surface-3 border border-synapsix-border text-synapsix-muted rounded-bl-sm'
                    : 'bg-synapsix-surface-3 text-synapsix-text border border-synapsix-border rounded-bl-sm'
              )}>
                <MarkdownText text={msg.text} />
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="bg-synapsix-surface-3 border border-synapsix-border rounded-2xl rounded-bl-sm px-4 py-2.5 flex items-center gap-1">
                {[0,1,2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Sugerencias (solo si hay pocos mensajes) */}
        {messages.length <= 1 && (
          <div className="px-3 py-2 flex gap-1.5 overflow-x-auto flex-shrink-0 border-t border-synapsix-border">
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => sendMessage(s)}
                className="text-[10px] text-violet-400 border border-violet-500/30 bg-violet-500/5 rounded-xl px-2.5 py-1.5 whitespace-nowrap hover:bg-violet-500/15 transition-colors flex-shrink-0">
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-synapsix-border p-3 flex gap-2 flex-shrink-0">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
            placeholder="Pregúntame algo..."
            disabled={loading}
            className="flex-1 bg-synapsix-surface-2 border border-synapsix-border rounded-xl px-3 py-2 text-xs text-synapsix-text placeholder:text-synapsix-muted outline-none focus:border-violet-500/50 transition-colors disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center disabled:opacity-30 hover:opacity-90 transition-all flex-shrink-0">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </>,
    document.body
  )
}
