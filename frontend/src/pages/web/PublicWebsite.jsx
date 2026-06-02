/**
 * SYNAPSIX ERP — PublicWebsite
 * Renderiza el sitio público combinando: Header + Body + Footer
 * guardados en el backend (WebSiteConfig + WebPage).
 *
 * Soporta dos modos:
 *   - "/" → carga la página "home" (sitio público)
 *   - "/preview/:slug" → carga la página por slug (vista previa desde el builder)
 */
import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '@api/axios'      // ← usa la instancia con baseURL=http://localhost:8000/api/v1
import useAuthStore from '@store/authStore'

export default function PublicWebsite() {
  const { slug: paramSlug } = useParams()
  const targetSlug = paramSlug || 'home'
  const isPreview  = !!paramSlug   // true cuando viene de /preview/:slug

  const [pageData, setPageData]   = useState(null)
  const [loading,  setLoading]    = useState(true)
  const [notFound, setNotFound]   = useState(false)
  const [showLogin,setShowLogin]  = useState(false)
  const [loginForm,setLoginForm]  = useState({ email: '', password: '' })
  const [loginErr, setLoginErr]   = useState('')
  const [loginBusy,setLoginBusy]  = useState(false)

  const headerRef = useRef(null)
  const bodyRef   = useRef(null)
  const footerRef = useRef(null)
  const navigate  = useNavigate()

  const { isAuthenticated, user, login, fetchMe } = useAuthStore()

  // ── Cargar página pública ─────────────────────────────────────────────
  useEffect(() => {
    setLoading(true)
    setNotFound(false)
    setPageData(null)
    // api tiene baseURL='http://localhost:8000/api/v1' → apunta al Django backend
    api.get(`/web/public/page/${targetSlug}/`)
      .then(res  => { setPageData(res.data); setLoading(false) })
      .catch(err => {
        if (err.response?.status === 404) setNotFound(true)
        setLoading(false)
      })
  }, [targetSlug])

  // ── Post-procesado del header: inyectar logo + corregir links ─────────────
  useEffect(() => {
    if (!pageData || !headerRef.current) return

    const container = headerRef.current
    const { company_logo, company_name, pages = [] } = pageData

    // 1️⃣ LOGO DINÁMICO: reemplaza cualquier elemento con data-logo o img[alt*='logo']
    //    o el texto 'Mi Empresa' / el company_name anterior
    if (company_logo) {
      // Busca img con class o alt de logo
      const logoImgs = container.querySelectorAll('img[data-logo], img[alt*="logo" i], img[alt*="empresa" i], img[src*="logo" i]')
      logoImgs.forEach(img => {
        img.src = company_logo
        img.alt = company_name
        img.style.maxHeight = '48px'
        img.style.width = 'auto'
        img.style.objectFit = 'contain'
      })

      // Busca textos que digan 'Mi Empresa' y los reemplaza por img
      container.querySelectorAll('a, div, span, p, h1, h2, h3').forEach(el => {
        if (el.children.length === 0 && el.textContent.trim() === 'Mi Empresa') {
          const img = document.createElement('img')
          img.src     = company_logo
          img.alt     = company_name
          img.style.maxHeight = '48px'
          img.style.width     = 'auto'
          img.style.objectFit = 'contain'
          el.textContent = ''
          el.appendChild(img)
        }
      })
    } else if (company_name) {
      // Sin logo: asegurar que el texto sea el nombre real
      container.querySelectorAll('a, div, span, p').forEach(el => {
        if (el.children.length === 0 && el.textContent.trim() === 'Mi Empresa') {
          el.textContent = company_name
        }
      })
    }

    // 2️⃣ CORREGIR LINKS: remapea hrefs para mantenerse dentro del sitio público
    //    /inicio → /preview/inicio (en modo preview) o / (en modo público)
    const slugSet = new Set(pages.map(p => p.slug))
    container.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href') || ''

      // Ignora anchors, externos, mailto, tel
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('http')) return

      // Extrae el slug del href: /inicio → inicio | /preview/inicio → inicio
      const hrefSlug = href.replace(/^\/preview\//, '').replace(/^\//, '') || 'home'

      // Solo corrige si el slug existe en nuestras páginas
      if (slugSet.has(hrefSlug) || hrefSlug === 'home' || hrefSlug === '') {
        const target = hrefSlug === 'home' || hrefSlug === '' ? 'home' : hrefSlug
        link.setAttribute('href', isPreview ? `/preview/${target}` : `/${target === 'home' ? '' : target}`)
        link.removeAttribute('target')
      } else if (href === '/' || href === '') {
        link.setAttribute('href', isPreview ? '/preview/home' : '/')
      }

      // Evita navegación a rutas internas del ERP
      const erpRoutes = ['/launchpad', '/dashboard', '/inventario', '/restaurante', '/settings', '/perfil']
      if (erpRoutes.some(r => href.startsWith(r))) {
        link.setAttribute('href', isPreview ? '/preview/home' : '/')
      }
    })
  }, [pageData, isPreview])


  // ── Re-ejecutar scripts del HTML guardado ─────────────────────────────
  const execScripts = (container) => {
    if (!container) return
    container.querySelectorAll('script').forEach(old => {
      const s = document.createElement('script')
      if (old.src) s.src = old.src
      else s.textContent = old.textContent
      document.body.appendChild(s)
    })
  }

  useEffect(() => {
    if (!pageData) return
    execScripts(headerRef.current)
    execScripts(bodyRef.current)
    execScripts(footerRef.current)
  }, [pageData])

  // ── Cargar sesión ─────────────────────────────────────────────────────
  useEffect(() => {
    if (isAuthenticated && !user) fetchMe()
  }, [isAuthenticated, user, fetchMe])

  // ── Login ─────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginBusy(true); setLoginErr('')
    const res = await login(loginForm.email, loginForm.password)
    setLoginBusy(false)
    if (res.success) {
      setShowLogin(false)
      // Enrutamiento inteligente según rol
      const loggedUser = res.user
      const isAdmin = loggedUser?.is_staff || loggedUser?.role === 'Administrador'
      if (isAdmin) navigate('/launchpad')
      // Si no es admin, se queda en el sitio público (no redirige)
    }
    else setLoginErr(res.error || 'Credenciales incorrectas')
  }

  // -- Loading --
  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#ffffff' }}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
        <div style={{ width:36, height:36, border:'3px solid #e2e8f0', borderTopColor:'#e11d48', borderRadius:'50%', animation:'spin .7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } } body{background:#fff!important;}`}</style>
      </div>
    </div>
  )

  // ── Sin página → "En construcción" (solo para ruta pública, no preview) ─
  if (notFound && !isPreview) return (
    <UnderConstruction
      isAuthenticated={isAuthenticated}
      onLogin={() => setShowLogin(true)}
      onEnter={() => navigate('/launchpad')}
      showLogin={showLogin}
      loginForm={loginForm}
      setLoginForm={setLoginForm}
      loginErr={loginErr}
      loginBusy={loginBusy}
      handleLogin={handleLogin}
      onCloseLogin={() => setShowLogin(false)}
    />
  )

  // ── Sin página en modo preview ────────────────────────────────────────
  if (notFound && isPreview) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0a0a0c', fontFamily:'Inter,sans-serif', flexDirection:'column', gap:16 }}>
      <div style={{ fontSize:48 }}>🔍</div>
      <p style={{ color:'#64748b', fontSize:14 }}>Página no encontrada: <code style={{color:'#f43f5e'}}>/{targetSlug}</code></p>
      <button onClick={() => window.close()} style={{ padding:'8px 20px', background:'#1f1f1f', color:'#ccc', border:'1px solid #333', borderRadius:8, cursor:'pointer', fontSize:13 }}>
        Cerrar vista previa
      </button>
    </div>
  )

  // -- Si no hay pageData (error de red, etc.) → página en blanco --
  if (!pageData) return (
    <div style={{ minHeight:'100vh', background:'#ffffff' }}>
      <style>{`body{background:#fff!important;margin:0}`}</style>
      {isPreview && (
        <div style={{ padding:'40px 24px', textAlign:'center', fontFamily:'Inter,sans-serif', color:'#94a3b8', fontSize:13 }}>
          <div style={{ fontSize:32, marginBottom:12 }}>⚠️</div>
          <p style={{ margin:0 }}>No se pudo cargar la página. Verifica que el servidor esté activo.</p>
          <button onClick={() => window.location.reload()} style={{ marginTop:16, padding:'8px 20px', background:'#e11d48', border:'none', color:'#fff', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:700 }}>Reintentar</button>
        </div>
      )}
    </div>
  )

  const {
    header_html = '', header_css = '',
    body_html   = '', body_css   = '',
    footer_html = '', footer_css = '',
    global_css  = '', title = 'Sitio Web',
  } = pageData

  const hasContent = header_html || body_html || footer_html

  // Si en modo público no hay contenido → "en construcción"
  if (!hasContent && !isPreview) return (
    <UnderConstruction
      isAuthenticated={isAuthenticated}
      onLogin={() => setShowLogin(true)}
      onEnter={() => navigate('/launchpad')}
      showLogin={showLogin}
      loginForm={loginForm}
      setLoginForm={setLoginForm}
      loginErr={loginErr}
      loginBusy={loginBusy}
      handleLogin={handleLogin}
      onCloseLogin={() => setShowLogin(false)}
    />
  )

  return (
    <>
      {/* Global styles — reset ERP dark theme then apply user CSS */}
      {/* body_css has ALL component CSS (header+body+footer IDs); global_css fallback for old saves */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body {
          margin: 0;
          font-family: Inter, sans-serif;
          background: #ffffff;
          color: #222;
        }
        ${body_css || global_css}
      `}</style>

      {/* ── Banner de vista previa (solo en modo preview) ── */}
      {isPreview && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          height: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px', background: 'rgba(14,14,20,.95)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(225,29,72,.25)', fontFamily: 'Inter, sans-serif',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'#e11d48', boxShadow:'0 0 6px #e11d48' }} />
            <span style={{ color:'rgba(255,255,255,.55)', fontSize:11, fontWeight:600 }}>
              VISTA PREVIA — <span style={{ color:'#f43f5e' }}>/{targetSlug}</span>
            </span>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => window.close()}
              style={{ padding:'5px 14px', background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.12)', borderRadius:20, color:'rgba(255,255,255,.65)', fontSize:11, cursor:'pointer' }}>
              Cerrar preview
            </button>
            <button onClick={() => navigate('/sitio-web')}
              style={{ padding:'5px 14px', background:'linear-gradient(135deg,#e11d48,#f43f5e)', border:'none', borderRadius:20, color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer' }}>
              ← Volver al editor
            </button>
          </div>
        </div>
      )}

      {/* ── Admin access bar (solo en modo público) ── */}
      {!isPreview && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          height: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px', background: 'rgba(10,10,14,.85)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,.06)', fontFamily: 'Inter, sans-serif',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:22, height:22, background:'linear-gradient(135deg,#e11d48,#f43f5e)', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></svg>
            </div>
            <span style={{ color:'rgba(255,255,255,.45)', fontSize:11, fontWeight:600 }}>Synapsix ERP</span>
          </div>

          {isAuthenticated ? (
            <button onClick={() => navigate('/launchpad')} style={{
              display:'flex', alignItems:'center', gap:6, padding:'5px 14px',
              background:'linear-gradient(135deg,#e11d48,#f43f5e)', border:'none',
              borderRadius:20, color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer',
              letterSpacing:'.02em',
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
              Ingresar al sistema
            </button>
          ) : (
            <a href="/login" style={{
              padding:'5px 14px', background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.12)',
              borderRadius:20, color:'rgba(255,255,255,.75)', fontSize:11, fontWeight:500,
              cursor:'pointer', textDecoration:'none', display:'inline-block',
            }}>
              Iniciar sesión
            </a>
          )}
        </div>
      )}

      {/* ── Page content ── */}
      <div style={{ paddingTop: 40 }}>
        {/* Header */}
        {header_html ? (
          <>
            <style dangerouslySetInnerHTML={{ __html: header_css }} />
            <div ref={headerRef} dangerouslySetInnerHTML={{ __html: header_html }} />
          </>
        ) : isPreview ? (
          <div style={{ padding:'16px 24px', background:'#f1f5f9', borderBottom:'2px dashed #cbd5e1', textAlign:'center', fontFamily:'Inter,sans-serif', color:'#94a3b8', fontSize:13 }}>
            Header vacío — Agrega un Navbar desde el editor
          </div>
        ) : null}

        {/* Body */}
        {body_html ? (
          <>
            <style dangerouslySetInnerHTML={{ __html: body_css }} />
            <div ref={bodyRef} dangerouslySetInnerHTML={{ __html: body_html }} />
          </>
        ) : isPreview ? (
          <div style={{ padding:'60px 24px', background:'#f8fafc', textAlign:'center', fontFamily:'Inter,sans-serif', color:'#94a3b8', minHeight:200, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12 }}>
            <div style={{ fontSize:36 }}>📄</div>
            <p style={{ margin:0, fontSize:14 }}>Esta página no tiene contenido aún.<br/>Arrastra bloques desde el panel izquierdo del editor.</p>
          </div>
        ) : null}

        {/* Footer */}
        {footer_html ? (
          <>
            <style dangerouslySetInnerHTML={{ __html: footer_css }} />
            <div ref={footerRef} dangerouslySetInnerHTML={{ __html: footer_html }} />
          </>
        ) : isPreview ? (
          <div style={{ padding:'16px 24px', background:'#f1f5f9', borderTop:'2px dashed #cbd5e1', textAlign:'center', fontFamily:'Inter,sans-serif', color:'#94a3b8', fontSize:13 }}>
            Footer vacío — Agrega un bloque Footer desde el editor
          </div>
        ) : null}
      </div>

      {/* ── Login modal ── */}
      {showLogin && (
        <div onClick={e => e.target === e.currentTarget && setShowLogin(false)}
          style={{ position:'fixed', inset:0, zIndex:99999, background:'rgba(0,0,0,.65)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'#16161e', border:'1px solid rgba(255,255,255,.08)', borderRadius:20, padding:'36px 32px', width:'100%', maxWidth:380, fontFamily:'Inter,sans-serif' }}>
            <div style={{ textAlign:'center', marginBottom:28 }}>
              <div style={{ width:48, height:48, background:'linear-gradient(135deg,#e11d48,#f43f5e)', borderRadius:14, display:'inline-flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></svg>
              </div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800, color:'#fff' }}>Synapsix ERP</h2>
              <p style={{ margin:'6px 0 0', color:'#64748b', fontSize:13 }}>Acceso al sistema</p>
            </div>
            {loginErr && <div style={{ background:'rgba(225,29,72,.12)', border:'1px solid rgba(225,29,72,.3)', color:'#f43f5e', borderRadius:10, padding:'10px 14px', fontSize:13, marginBottom:16 }}>{loginErr}</div>}
            <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <input type="email" required placeholder="Correo electrónico" value={loginForm.email}
                onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
                style={{ padding:'13px 16px', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', borderRadius:10, color:'#fff', fontSize:14, outline:'none', fontFamily:'inherit' }} />
              <input type="password" required placeholder="Contraseña" value={loginForm.password}
                onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                style={{ padding:'13px 16px', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', borderRadius:10, color:'#fff', fontSize:14, outline:'none', fontFamily:'inherit' }} />
              <button type="submit" disabled={loginBusy}
                style={{ marginTop:4, padding:'13px', background: loginBusy ? '#333' : 'linear-gradient(135deg,#e11d48,#f43f5e)', border:'none', borderRadius:10, color:'#fff', fontSize:15, fontWeight:700, cursor: loginBusy ? 'not-allowed':'pointer', fontFamily:'inherit' }}>
                {loginBusy ? 'Ingresando…' : '→ Ingresar al sistema'}
              </button>
            </form>
            <button onClick={() => setShowLogin(false)} style={{ display:'block', width:'100%', marginTop:14, padding:'8px', background:'transparent', border:'none', color:'#475569', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Pantalla "En Construcción" ───────────────────────────────────────────────
function UnderConstruction({ isAuthenticated, onLogin, onEnter, showLogin, loginForm, setLoginForm, loginErr, loginBusy, handleLogin, onCloseLogin }) {
  return (
    <div style={{ minHeight:'100vh', background:'#0a0a0c', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontFamily:'Inter,sans-serif', padding:20 }}>
      {/* Bar */}
      <div style={{ position:'fixed', top:0, left:0, right:0, height:40, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', background:'rgba(10,10,14,.9)', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(255,255,255,.06)', zIndex:9999 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:22, height:22, background:'linear-gradient(135deg,#e11d48,#f43f5e)', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></svg>
          </div>
          <span style={{ color:'rgba(255,255,255,.45)', fontSize:11, fontWeight:600 }}>Synapsix ERP</span>
        </div>
        {isAuthenticated
          ? <button onClick={onEnter} style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 14px', background:'linear-gradient(135deg,#e11d48,#f43f5e)', border:'none', borderRadius:20, color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
              Ingresar al sistema
            </button>
          : <button onClick={onLogin} style={{ padding:'5px 14px', background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.12)', borderRadius:20, color:'rgba(255,255,255,.75)', fontSize:11, cursor:'pointer' }}>
              Iniciar sesión
            </button>
        }
      </div>

      {/* Content */}
      <div style={{ textAlign:'center', maxWidth:480, paddingTop:40 }}>
        <div style={{ width:80, height:80, background:'rgba(225,29,72,.12)', border:'1px solid rgba(225,29,72,.2)', borderRadius:24, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 28px' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h1 style={{ fontSize:'2.25rem', fontWeight:800, color:'#fff', margin:'0 0 12px', lineHeight:1.2 }}>Sitio en construcción</h1>
        <p style={{ color:'#64748b', fontSize:'1rem', lineHeight:1.75, margin:'0 0 36px' }}>
          Estamos preparando algo increíble. Mientras tanto, puedes contactarnos directamente.
        </p>
        <button onClick={isAuthenticated ? onEnter : onLogin}
          style={{ padding:'13px 36px', background:'linear-gradient(135deg,#e11d48,#f43f5e)', border:'none', borderRadius:50, color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer' }}>
          {isAuthenticated ? 'Ir al sistema' : 'Acceder al sistema'}
        </button>
      </div>

      {/* Login modal for under-construction state */}
      {showLogin && (
        <div onClick={e => e.target === e.currentTarget && onCloseLogin()}
          style={{ position:'fixed', inset:0, zIndex:99999, background:'rgba(0,0,0,.65)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'#16161e', border:'1px solid rgba(255,255,255,.08)', borderRadius:20, padding:'36px 32px', width:'100%', maxWidth:380, fontFamily:'Inter,sans-serif' }}>
            <div style={{ textAlign:'center', marginBottom:24 }}>
              <h2 style={{ margin:0, color:'#fff', fontSize:'1.2rem', fontWeight:800 }}>Iniciar sesión</h2>
              <p style={{ margin:'6px 0 0', color:'#64748b', fontSize:12 }}>Solo administradores y personal autorizado</p>
            </div>
            {loginErr && <div style={{ background:'rgba(225,29,72,.12)', border:'1px solid rgba(225,29,72,.3)', color:'#f43f5e', borderRadius:8, padding:'8px 12px', fontSize:12, marginBottom:14 }}>{loginErr}</div>}
            <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <input type="email" required placeholder="Correo" value={loginForm.email}
                onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
                style={{ padding:'12px 14px', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', borderRadius:8, color:'#fff', fontSize:13, outline:'none', fontFamily:'inherit' }} />
              <input type="password" required placeholder="Contraseña" value={loginForm.password}
                onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                style={{ padding:'12px 14px', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', borderRadius:8, color:'#fff', fontSize:13, outline:'none', fontFamily:'inherit' }} />
              <button type="submit" disabled={loginBusy}
                style={{ padding:'12px', background: loginBusy ? '#333' : 'linear-gradient(135deg,#e11d48,#f43f5e)', border:'none', borderRadius:8, color:'#fff', fontSize:14, fontWeight:700, cursor: loginBusy ? 'not-allowed':'pointer', fontFamily:'inherit' }}>
                {loginBusy ? 'Ingresando…' : 'Ingresar →'}
              </button>
            </form>
            <button onClick={onCloseLogin} style={{ display:'block', width:'100%', marginTop:12, padding:'8px', background:'transparent', border:'none', color:'#475569', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}
