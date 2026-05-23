/**
 * SYNAPSIX ERP — ProfilePage
 * Perfil de usuario: datos personales, avatar, contraseña, historial.
 */
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, User, Mail, Lock, Camera, Save, Eye, EyeOff,
  CheckCircle, AlertCircle, Loader2, Shield, Clock, LogOut,
  Smartphone, Globe, Edit3
} from 'lucide-react'
import clsx from 'clsx'
import api from '@api/axios'
import { useAuth } from '@hooks/useAuth'
import useTenantStore from '@store/tenantStore'

const MOCK_SESSIONS = [
  { id: 1, device: 'Chrome · Windows',    location: 'Ciudad de México',   time: 'Ahora',    current: true  },
  { id: 2, device: 'Safari · iPhone',      location: 'Guadalajara, MX',    time: 'Hace 2h',  current: false },
  { id: 3, device: 'Firefox · macOS',      location: 'Monterrey, MX',      time: 'Ayer',     current: false },
]

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { primaryColor } = useTenantStore()
  const fileRef = useRef(null)

  const [tab, setTab] = useState('info')

  // Info personal
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name:  user?.last_name  || '',
    email:      user?.email      || '',
  })
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarFile, setAvatarFile]       = useState(null)
  const [savingInfo, setSavingInfo]       = useState(false)
  const [infoMsg, setInfoMsg]             = useState(null)

  // Contraseña
  const [pwdForm, setPwdForm] = useState({ current: '', password: '', password_confirm: '' })
  const [showPwd, setShowPwd]   = useState(false)
  const [savingPwd, setSavingPwd] = useState(false)
  const [pwdMsg, setPwdMsg]       = useState(null)

  const initials = `${form.first_name?.[0]||''}${form.last_name?.[0]||''}`.toUpperCase() || '?'

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = ev => setAvatarPreview(ev.target.result)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleSaveInfo = async () => {
    setSavingInfo(true); setInfoMsg(null)
    try {
      const formData = new FormData()
      formData.append('first_name', form.first_name)
      formData.append('last_name',  form.last_name)
      if (avatarFile) formData.append('avatar', avatarFile)
      await api.patch('/auth/me/', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setInfoMsg({ type: 'success', text: 'Perfil actualizado correctamente.' })
    } catch(e) {
      setInfoMsg({ type: 'error', text: e.response?.data?.detail || 'Error al guardar.' })
    } finally { setSavingInfo(false) }
  }

  const handleSavePassword = async () => {
    if (!pwdForm.password) { setPwdMsg({ type: 'error', text: 'Ingresa la nueva contraseña.' }); return }
    if (pwdForm.password !== pwdForm.password_confirm) { setPwdMsg({ type: 'error', text: 'Las contraseñas no coinciden.' }); return }
    if (pwdForm.password.length < 8) { setPwdMsg({ type: 'error', text: 'Mínimo 8 caracteres.' }); return }
    setSavingPwd(true); setPwdMsg(null)
    try {
      await api.patch('/auth/me/', {
        password: pwdForm.password,
        password_confirm: pwdForm.password_confirm,
      })
      setPwdForm({ current: '', password: '', password_confirm: '' })
      setPwdMsg({ type: 'success', text: 'Contraseña actualizada. Vuelve a iniciar sesión.' })
    } catch(e) {
      setPwdMsg({ type: 'error', text: e.response?.data?.detail || 'Error al actualizar.' })
    } finally { setSavingPwd(false) }
  }

  const tabs = [
    { id: 'info',     label: 'Información', icon: User   },
    { id: 'security', label: 'Seguridad',   icon: Shield },
    { id: 'sessions', label: 'Sesiones',    icon: Clock  },
  ]

  return (
    <div className="min-h-screen bg-synapsix-dark">
      {/* Header */}
      <header className="border-b border-synapsix-border glass sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <button onClick={()=>navigate('/launchpad')} className="text-synapsix-muted hover:text-synapsix-text-2 transition-colors">
            <ArrowLeft className="w-5 h-5"/>
          </button>
          <User className="w-5 h-5" style={{color:primaryColor}}/>
          <h1 className="text-base font-bold text-synapsix-text flex-1">Mi Perfil</h1>
          <button onClick={logout} className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 transition-colors px-3 py-1.5 rounded-xl hover:bg-red-500/10">
            <LogOut className="w-3.5 h-3.5"/> Cerrar sesión
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Card de perfil */}
        <div className="glass rounded-2xl border border-synapsix-border p-6 flex items-center gap-5">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-synapsix-border cursor-pointer"
              onClick={() => fileRef.current?.click()}
              style={{ background: avatarPreview ? 'transparent' : `${primaryColor}20` }}
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-black" style={{color: primaryColor}}>{initials}</span>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl bg-synapsix-surface border border-synapsix-border flex items-center justify-center text-synapsix-muted hover:text-synapsix-text-2 transition-colors"
            >
              <Camera className="w-3.5 h-3.5"/>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange}/>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-synapsix-text">{form.first_name} {form.last_name}</h2>
            <p className="text-sm text-synapsix-muted">{form.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="badge-active text-[10px]">{user?.role || 'Admin'}</span>
              {user?.company?.name && (
                <span className="text-xs text-synapsix-muted bg-synapsix-surface-3 px-2 py-0.5 rounded-full border border-synapsix-border">
                  {user.company.name}
                </span>
              )}
            </div>
          </div>

          <button onClick={()=>setTab('info')} className="btn-secondary gap-2 text-sm flex-shrink-0">
            <Edit3 className="w-3.5 h-3.5"/> Editar
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-synapsix-surface-2 rounded-xl border border-synapsix-border">
          {tabs.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all',
                  tab === t.id
                    ? 'bg-synapsix-surface text-synapsix-text shadow border border-synapsix-border'
                    : 'text-synapsix-muted hover:text-synapsix-text-2'
                )}
              >
                <Icon className="w-3.5 h-3.5"/>{t.label}
              </button>
            )
          })}
        </div>

        {/* ── Tab: Información ── */}
        {tab === 'info' && (
          <div className="glass rounded-2xl border border-synapsix-border p-6 space-y-5 animate-fade-in">
            <h3 className="text-sm font-semibold text-synapsix-text-2 uppercase tracking-wider">Datos personales</h3>

            {infoMsg && (
              <div className={clsx('flex items-center gap-2 p-3 rounded-xl text-xs border',
                infoMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400')}>
                {infoMsg.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0"/> : <AlertCircle className="w-4 h-4 flex-shrink-0"/>}
                {infoMsg.text}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium">Nombre</label>
                <input value={form.first_name} onChange={e=>setForm(f=>({...f,first_name:e.target.value}))}
                  className="input-field" placeholder="Juan"/>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium">Apellido</label>
                <input value={form.last_name} onChange={e=>setForm(f=>({...f,last_name:e.target.value}))}
                  className="input-field" placeholder="García"/>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium flex items-center gap-1">
                <Mail className="w-3 h-3"/> Correo electrónico
              </label>
              <input value={form.email} disabled
                className="input-field opacity-60 cursor-not-allowed" />
              <p className="text-[10px] text-synapsix-muted-2">El email no se puede cambiar desde aquí.</p>
            </div>

            {avatarPreview && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-synapsix-surface-2 border border-synapsix-border">
                <img src={avatarPreview} alt="Preview" className="w-10 h-10 rounded-xl object-cover"/>
                <div className="flex-1">
                  <p className="text-xs font-medium text-synapsix-text-2">Nueva foto de perfil lista</p>
                  <p className="text-[10px] text-synapsix-muted">Se guardará al hacer click en Guardar</p>
                </div>
                <button onClick={()=>{setAvatarPreview(null);setAvatarFile(null)}}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors">Quitar</button>
              </div>
            )}

            <div className="flex justify-end">
              <button onClick={handleSaveInfo} disabled={savingInfo} className="btn-primary gap-2">
                {savingInfo ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
                {savingInfo ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        )}

        {/* ── Tab: Seguridad ── */}
        {tab === 'security' && (
          <div className="glass rounded-2xl border border-synapsix-border p-6 space-y-5 animate-fade-in">
            <h3 className="text-sm font-semibold text-synapsix-text-2 uppercase tracking-wider">Cambiar contraseña</h3>

            {pwdMsg && (
              <div className={clsx('flex items-center gap-2 p-3 rounded-xl text-xs border',
                pwdMsg.type==='success'?'bg-emerald-500/10 border-emerald-500/20 text-emerald-400':'bg-red-500/10 border-red-500/20 text-red-400')}>
                {pwdMsg.type==='success'?<CheckCircle className="w-4 h-4 flex-shrink-0"/>:<AlertCircle className="w-4 h-4 flex-shrink-0"/>}
                {pwdMsg.text}
              </div>
            )}

            <div className="space-y-4">
              {[
                { key: 'current',          label: 'Contraseña actual', placeholder: '••••••••' },
                { key: 'password',         label: 'Nueva contraseña',  placeholder: 'Mínimo 8 caracteres' },
                { key: 'password_confirm', label: 'Confirmar nueva',   placeholder: 'Repetir contraseña' },
              ].map(({ key, label, placeholder }) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-xs text-synapsix-muted uppercase tracking-wider font-medium flex items-center gap-1">
                    <Lock className="w-3 h-3"/> {label}
                  </label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={pwdForm[key]}
                      onChange={e => setPwdForm(f => ({...f, [key]: e.target.value}))}
                      className="input-field pr-10"
                      placeholder={placeholder}
                    />
                    {key === 'password' && (
                      <button type="button" onClick={() => setShowPwd(!showPwd)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-synapsix-muted hover:text-synapsix-text-2">
                        {showPwd ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Indicador de fortaleza */}
            {pwdForm.password && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[8, 12, 16].map((len, i) => (
                    <div key={i} className={clsx('h-1 flex-1 rounded-full transition-colors',
                      pwdForm.password.length >= len ? (i===0?'bg-yellow-400':i===1?'bg-blue-400':'bg-emerald-400') : 'bg-synapsix-border')}/>
                  ))}
                </div>
                <p className="text-[10px] text-synapsix-muted-2">
                  {pwdForm.password.length < 8 ? 'Muy corta' : pwdForm.password.length < 12 ? 'Aceptable' : pwdForm.password.length < 16 ? 'Buena' : 'Muy segura'}
                </p>
              </div>
            )}

            <div className="flex justify-end">
              <button onClick={handleSavePassword} disabled={savingPwd} className="btn-primary gap-2">
                {savingPwd ? <Loader2 className="w-4 h-4 animate-spin"/> : <Shield className="w-4 h-4"/>}
                {savingPwd ? 'Actualizando...' : 'Actualizar contraseña'}
              </button>
            </div>
          </div>
        )}

        {/* ── Tab: Sesiones ── */}
        {tab === 'sessions' && (
          <div className="glass rounded-2xl border border-synapsix-border overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-synapsix-border">
              <h3 className="text-sm font-semibold text-synapsix-text-2 uppercase tracking-wider">Sesiones activas</h3>
              <p className="text-xs text-synapsix-muted mt-1">Dispositivos donde has iniciado sesión</p>
            </div>
            <div className="divide-y divide-synapsix-border">
              {MOCK_SESSIONS.map(session => (
                <div key={session.id} className="flex items-center gap-4 px-6 py-4">
                  <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                    session.current ? 'bg-emerald-500/15 border border-emerald-500/30' : 'bg-synapsix-surface-3 border border-synapsix-border')}>
                    {session.device.includes('iPhone') || session.device.includes('Android')
                      ? <Smartphone className={clsx('w-4 h-4', session.current ? 'text-emerald-400' : 'text-synapsix-muted')}/>
                      : <Globe className={clsx('w-4 h-4', session.current ? 'text-emerald-400' : 'text-synapsix-muted')}/>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-synapsix-text">{session.device}</p>
                      {session.current && <span className="badge-active text-[10px]">Esta sesión</span>}
                    </div>
                    <p className="text-xs text-synapsix-muted">{session.location} · {session.time}</p>
                  </div>
                  {!session.current && (
                    <button className="text-xs text-red-400 hover:text-red-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10">
                      Cerrar
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-synapsix-border bg-synapsix-surface-2">
              <button className="text-sm text-red-400 hover:text-red-300 transition-colors flex items-center gap-2">
                <LogOut className="w-4 h-4"/> Cerrar todas las demás sesiones
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
