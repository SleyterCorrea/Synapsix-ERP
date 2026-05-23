/**
 * SYNAPSIX ERP — LoginPage
 * Página de inicio de sesión con diseño premium oscuro
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react'
import { useAuth } from '@hooks/useAuth'
import useSettingsStore from '@store/settingsStore'
import clsx from 'clsx'

// ─── Logo SVG inline (Synapsix) ───────────────────────────────────────────
const SynapsixLogo = () => (
  <svg width="48" height="48" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 10 C70 10, 90 25, 85 50 C80 70, 60 75, 50 70 C35 65, 20 55, 25 35 C30 15, 45 10, 50 10Z"
      fill="#C0392B" opacity="0.15"/>
    <text x="50" y="62" textAnchor="middle" fontSize="52" fontWeight="bold"
      fontFamily="sans-serif" fill="#C0392B">S</text>
    <path d="M62 25 L78 25 L72 15" stroke="#C0392B" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated, isLoading, error, clearError } = useAuth()
  const { getBackgroundStyle } = useSettingsStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [shake, setShake] = useState(false)

  // Si ya está autenticado, redirigir al launchpad
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/launchpad', { replace: true })
    }
  }, [isAuthenticated, navigate])

  // Efecto shake cuando hay error
  useEffect(() => {
    if (error) {
      setShake(true)
      const t = setTimeout(() => setShake(false), 500)
      return () => clearTimeout(t)
    }
  }, [error])

  const handleSubmit = async (e) => {
    e.preventDefault()
    clearError()
    if (!email.trim() || !password.trim()) return

    const result = await login(email.trim(), password)
    if (result.success) {
      navigate('/launchpad', { replace: true })
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: getBackgroundStyle() }}
    >

      {/* ─── Fondo con textura y gradiente sutil ─────────────────────────── */}
      <div className="absolute inset-0 noise-bg pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(192,57,43,0.08) 0%, transparent 60%)',
        }}
      />

      {/* ─── Card de Login ────────────────────────────────────────────────── */}
      <div className={clsx(
        'relative w-full max-w-md animate-fade-in-scale',
        shake && 'animate-shake'
      )}>

        {/* Glow sutil detrás del card */}
        <div className="absolute -inset-1 rounded-3xl opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(192,57,43,0.3) 0%, transparent 70%)' }}
        />

        <div className="relative glass rounded-3xl p-8 shadow-spotlight">

          {/* ── Logo y título ────────────────────────────────────────────── */}
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-synapsix-surface-2 border border-synapsix-border flex items-center justify-center">
              <SynapsixLogo />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-synapsix-text tracking-tight">
                Synapsix <span className="text-gradient-red">ERP</span>
              </h1>
              <p className="text-synapsix-muted text-sm mt-1">
                Inicia sesión para continuar
              </p>
            </div>
          </div>

          {/* ── Formulario ───────────────────────────────────────────────── */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Error banner */}
            {error && (
              <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/25 rounded-xl p-3 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-medium text-synapsix-muted uppercase tracking-wider">
                Correo Electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@synapsix.com"
                autoComplete="email"
                required
                className="input-field"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-medium text-synapsix-muted uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="input-field pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-synapsix-muted hover:text-synapsix-text-2 transition-colors"
                >
                  {showPassword
                    ? <EyeOff className="w-4 h-4" />
                    : <Eye className="w-4 h-4" />
                  }
                </button>
              </div>
            </div>

            {/* Botón submit */}
            <button
              id="btn-login"
              type="submit"
              disabled={isLoading || !email || !password}
              className="btn-primary w-full mt-2 h-12 text-base"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  Ingresar al Sistema
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* ── Footer del card ───────────────────────────────────────────── */}
          <p className="text-center text-synapsix-muted-2 text-xs mt-6">
            Synapsix ERP v0.1.0 · Motor interno
          </p>
        </div>
      </div>
    </div>
  )
}
