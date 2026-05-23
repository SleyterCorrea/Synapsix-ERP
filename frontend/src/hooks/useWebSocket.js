/**
 * SYNAPSIX ERP — useWebSocket Hook
 * Conexión WebSocket con reconexión automática y auth JWT.
 */
import { useEffect, useRef, useCallback, useState } from 'react'

const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

export function useWebSocket(endpoint, { onMessage, onOpen, onClose, enabled = true } = {}) {
  const ws         = useRef(null)
  const reconnect  = useRef(null)
  const attempts   = useRef(0)
  const [status, setStatus] = useState('disconnected') // connected | connecting | disconnected

  const getToken = () => localStorage.getItem('access_token') || ''

  const connect = useCallback(() => {
    if (!enabled) return
    const token = getToken()
    if (!token) return

    setStatus('connecting')
    const url = `${WS_BASE}${endpoint}?token=${token}`
    const socket = new WebSocket(url)
    ws.current = socket

    socket.onopen = () => {
      attempts.current = 0
      setStatus('connected')
      onOpen?.()
    }

    socket.onmessage = (e) => {
      try { onMessage?.(JSON.parse(e.data)) } catch {}
    }

    socket.onclose = (e) => {
      setStatus('disconnected')
      onClose?.()
      if (e.code !== 1000 && e.code !== 4001) {
        // Reconexión exponencial: 1s, 2s, 4s, 8s, max 30s
        const delay = Math.min(1000 * 2 ** attempts.current, 30000)
        attempts.current++
        reconnect.current = setTimeout(connect, delay)
      }
    }

    socket.onerror = () => socket.close()
  }, [endpoint, enabled, onMessage, onOpen, onClose])

  const send = useCallback((data) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data))
    }
  }, [])

  const disconnect = useCallback(() => {
    clearTimeout(reconnect.current)
    ws.current?.close(1000)
    ws.current = null
    setStatus('disconnected')
  }, [])

  useEffect(() => {
    connect()
    return disconnect
  }, [connect, disconnect])

  return { send, status, disconnect, reconnect: connect }
}

export { WS_BASE }
