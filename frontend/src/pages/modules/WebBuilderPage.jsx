/**
 * SYNAPSIX — Website Builder
 *
 * Arquitectura:
 *  - GrapesJS maneja su propio layout (panel izquierdo de bloques/estilos/capas + canvas)
 *  - React maneja: barra superior + overlay de Páginas + overlay de Plantillas
 *  - El canvas muestra las 3 zonas juntas: HEADER | CONTENIDO | FOOTER
 *  - Header y Footer son compartidos entre todas las páginas (WebSiteConfig)
 *  - El Contenido (body) es único por página
 *
 * Correcciones v2:
 *  - CSS se guarda y se restaura correctamente (fix Bug #2)
 *  - Vista previa guarda y abre /preview/:slug (fix Bug #1)
 *  - Paneles separados de plantillas para Header y Footer (fix Bug #3)
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '@api/axios'

/* ─── SVG Icon helper ───────────────────────────────────────────────────────── */
const S = (d, size = 18) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`

/* ─── Block icons (strings for GrapesJS labels) ────────────────────────────── */
const IC = {
  hero:    S('<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>'),
  grid:    S('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>'),
  chart:   S('<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>'),
  menu:    S('<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>'),
  footer:  S('<rect x="2" y="16" width="20" height="6" rx="1"/>'),
  form:    S('<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="12" y2="14"/>'),
  email:   S('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/>'),
  text:    S('<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>'),
  image:   S('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>'),
  button:  S('<rect x="3" y="8" width="18" height="8" rx="4"/>'),
  divider: S('<line x1="3" y1="12" x2="21" y2="12"/>'),
  video:   S('<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>'),
  map:     S('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>'),
  quote:   S('<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/>'),
  cols:    S('<rect x="2" y="3" width="8" height="18" rx="1"/><rect x="14" y="3" width="8" height="18" rx="1"/>'),
  test:    S('<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>'),
  award:   S('<circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>'),
  code:    S('<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>'),
  header:  S('<rect x="2" y="3" width="20" height="6" rx="1"/>'),
}

const lbl = (icon, name) =>
  `<div style="display:flex;flex-direction:column;align-items:center;gap:5px;padding:4px 2px">
    <div style="opacity:.75">${icon}</div>
    <span style="font-size:10px;font-weight:700;letter-spacing:.03em;line-height:1.2">${name}</span>
  </div>`

/* ─── Blocks ────────────────────────────────────────────────────────────────── */
const BLOCKS = [
  // Secciones
  { id:'hero', label:lbl(IC.hero,'Hero'), category:'Secciones',
    content:`<section style="padding:88px 24px;background:linear-gradient(135deg,#0f172a,#1e3a5f);text-align:center;font-family:Inter,sans-serif"><h1 style="font-size:clamp(2rem,5vw,3.5rem);font-weight:800;color:#fff;margin:0 0 16px;line-height:1.15">Tu Título Principal</h1><p style="font-size:1.1rem;color:rgba(255,255,255,.75);max-width:560px;margin:0 auto 36px;line-height:1.75">Subtítulo descriptivo que convierte visitantes en clientes.</p><a href="#contacto" style="display:inline-block;background:#e11d48;color:#fff;padding:14px 40px;border-radius:50px;text-decoration:none;font-weight:700;font-size:1rem">Comenzar ahora →</a></section>` },
  { id:'features', label:lbl(IC.grid,'Servicios'), category:'Secciones',
    content:`<section style="padding:72px 24px;background:#f8fafc;font-family:Inter,sans-serif"><h2 style="text-align:center;font-size:2rem;font-weight:700;margin:0 0 48px;color:#0f172a">Nuestros Servicios</h2><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:24px;max-width:1100px;margin:0 auto"><div style="background:#fff;border-radius:16px;padding:32px 24px;box-shadow:0 1px 3px rgba(0,0,0,.08);text-align:center"><div style="width:52px;height:52px;background:#fef2f2;border-radius:14px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:26px">🚀</div><h3 style="font-weight:700;margin:0 0 10px;color:#0f172a">Velocidad</h3><p style="color:#64748b;margin:0;line-height:1.7;font-size:.9rem">Optimizado desde el primer día.</p></div><div style="background:#fff;border-radius:16px;padding:32px 24px;box-shadow:0 1px 3px rgba(0,0,0,.08);text-align:center"><div style="width:52px;height:52px;background:#eff6ff;border-radius:14px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:26px">🔒</div><h3 style="font-weight:700;margin:0 0 10px;color:#0f172a">Seguridad</h3><p style="color:#64748b;margin:0;line-height:1.7;font-size:.9rem">Protección de máximo nivel.</p></div><div style="background:#fff;border-radius:16px;padding:32px 24px;box-shadow:0 1px 3px rgba(0,0,0,.08);text-align:center"><div style="width:52px;height:52px;background:#f0fdf4;border-radius:14px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:26px">❤️</div><h3 style="font-weight:700;margin:0 0 10px;color:#0f172a">Soporte</h3><p style="color:#64748b;margin:0;line-height:1.7;font-size:.9rem">Disponibles 24/7.</p></div></div></section>` },
  { id:'stats', label:lbl(IC.chart,'Estadísticas'), category:'Secciones',
    content:`<section style="padding:72px 24px;background:#0f172a;font-family:Inter,sans-serif"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:40px;max-width:900px;margin:0 auto;text-align:center"><div><div style="font-size:3.5rem;font-weight:900;color:#e11d48;line-height:1">+500</div><div style="color:rgba(255,255,255,.6);font-size:.95rem;margin-top:8px;font-weight:500">Clientes</div></div><div><div style="font-size:3.5rem;font-weight:900;color:#e11d48;line-height:1">100%</div><div style="color:rgba(255,255,255,.6);font-size:.95rem;margin-top:8px;font-weight:500">Garantía</div></div><div><div style="font-size:3.5rem;font-weight:900;color:#e11d48;line-height:1">24/7</div><div style="color:rgba(255,255,255,.6);font-size:.95rem;margin-top:8px;font-weight:500">Soporte</div></div></div></section>` },
  { id:'twocol', label:lbl(IC.cols,'2 Columnas'), category:'Secciones',
    content:`<section style="padding:72px 24px;background:#fff;font-family:Inter,sans-serif"><div style="display:grid;grid-template-columns:1fr 1fr;gap:56px;max-width:1100px;margin:0 auto;align-items:center"><div><h2 style="font-size:2rem;font-weight:700;color:#0f172a;margin:0 0 16px;line-height:1.3">Título de Sección</h2><p style="color:#475569;line-height:1.8;margin:0 0 28px">Párrafo descriptivo. Haz clic para editar.</p><a href="#" style="display:inline-block;background:#0f172a;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Saber más →</a></div><div style="background:linear-gradient(135deg,#f1f5f9,#e2e8f0);border-radius:20px;height:300px;display:flex;align-items:center;justify-content:center;color:#94a3b8;border:2px dashed #cbd5e1;font-size:.9rem">[ Imagen ]</div></div></section>` },
  { id:'testimonials', label:lbl(IC.test,'Testimonios'), category:'Secciones',
    content:`<section style="padding:72px 24px;background:#f8fafc;font-family:Inter,sans-serif"><h2 style="text-align:center;font-size:2rem;font-weight:700;margin:0 0 48px;color:#0f172a">Lo que dicen nuestros clientes</h2><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;max-width:1000px;margin:0 auto"><div style="background:#fff;border-radius:20px;padding:32px;border:1px solid #f1f5f9;box-shadow:0 1px 4px rgba(0,0,0,.06)"><div style="font-size:1.4rem;color:#fbbf24;margin-bottom:16px">★★★★★</div><p style="color:#334155;line-height:1.75;margin:0 0 24px;font-style:italic">"Excelente servicio, superó todas mis expectativas."</p><div style="display:flex;align-items:center;gap:12px"><div style="width:40px;height:40px;background:linear-gradient(135deg,#e11d48,#f43f5e);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800">A</div><div><strong style="color:#0f172a;font-size:.95rem;display:block">Ana García</strong><span style="color:#94a3b8;font-size:.8rem">CEO, TechCorp</span></div></div></div><div style="background:#fff;border-radius:20px;padding:32px;border:1px solid #f1f5f9;box-shadow:0 1px 4px rgba(0,0,0,.06)"><div style="font-size:1.4rem;color:#fbbf24;margin-bottom:16px">★★★★★</div><p style="color:#334155;line-height:1.75;margin:0 0 24px;font-style:italic">"La mejor inversión que hemos hecho este año."</p><div style="display:flex;align-items:center;gap:12px"><div style="width:40px;height:40px;background:linear-gradient(135deg,#2563eb,#3b82f6);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800">C</div><div><strong style="color:#0f172a;font-size:.95rem;display:block">Carlos López</strong><span style="color:#94a3b8;font-size:.8rem">Director, InnovateMX</span></div></div></div></div></section>` },
  // Navegación
  { id:'navbar', label:lbl(IC.menu,'Navbar'), category:'Navegación',
    content:`<nav style="display:flex;align-items:center;justify-content:space-between;padding:0 48px;height:68px;background:#fff;box-shadow:0 1px 0 #e2e8f0;font-family:Inter,sans-serif;position:sticky;top:0;z-index:100"><div style="font-size:1.4rem;font-weight:900;color:#0f172a">Mi Empresa</div><div style="display:flex;gap:32px;align-items:center"><a href="#" style="text-decoration:none;color:#475569;font-weight:500;font-size:.9rem">Inicio</a><a href="#" style="text-decoration:none;color:#475569;font-weight:500;font-size:.9rem">Servicios</a><a href="#" style="text-decoration:none;color:#475569;font-weight:500;font-size:.9rem">Nosotros</a><a href="#contacto" style="background:#e11d48;color:#fff;padding:10px 24px;border-radius:50px;text-decoration:none;font-weight:700;font-size:.875rem">Contacto</a></div></nav>` },
  { id:'footer-block', label:lbl(IC.footer,'Footer'), category:'Navegación',
    content:`<footer style="padding:56px 24px 32px;background:#0f172a;color:#94a3b8;font-family:Inter,sans-serif"><div style="max-width:1100px;margin:0 auto 40px;display:grid;grid-template-columns:2fr 1fr 1fr;gap:48px"><div><div style="font-size:1.3rem;font-weight:800;color:#fff;margin-bottom:12px">Mi Empresa</div><p style="margin:0;line-height:1.7;font-size:.875rem">Descripción breve de la empresa.</p></div><div><h4 style="color:#e2e8f0;margin:0 0 16px;font-size:.8rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em">Páginas</h4><div style="display:flex;flex-direction:column;gap:10px"><a href="/" style="color:#94a3b8;text-decoration:none;font-size:.875rem">Inicio</a><a href="#" style="color:#94a3b8;text-decoration:none;font-size:.875rem">Servicios</a><a href="#" style="color:#94a3b8;text-decoration:none;font-size:.875rem">Contacto</a></div></div><div><h4 style="color:#e2e8f0;margin:0 0 16px;font-size:.8rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em">Legal</h4><div style="display:flex;flex-direction:column;gap:10px"><a href="#" style="color:#94a3b8;text-decoration:none;font-size:.875rem">Privacidad</a><a href="#" style="color:#94a3b8;text-decoration:none;font-size:.875rem">Términos</a></div></div></div><div style="max-width:1100px;margin:0 auto;padding-top:24px;border-top:1px solid #1e293b;text-align:center;font-size:.8rem;color:#475569">© 2025 Mi Empresa · Todos los derechos reservados</div></footer>` },
  // Formularios
  { id:'contact-form', label:lbl(IC.form,'Contacto'), category:'Formularios',
    content:`<section id="contacto" style="padding:72px 24px;background:#fff;font-family:Inter,sans-serif"><div style="max-width:560px;margin:0 auto"><h2 style="font-size:2rem;font-weight:700;text-align:center;margin:0 0 40px;color:#0f172a">¿Hablamos?</h2><form style="display:flex;flex-direction:column;gap:14px"><input type="text" placeholder="Tu nombre" style="padding:14px 18px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:.95rem;outline:none;font-family:inherit;background:#f8fafc"><input type="email" placeholder="tu@email.com" style="padding:14px 18px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:.95rem;outline:none;font-family:inherit;background:#f8fafc"><textarea placeholder="Tu mensaje" rows="4" style="padding:14px 18px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:.95rem;outline:none;resize:vertical;font-family:inherit;background:#f8fafc"></textarea><button type="submit" style="background:#e11d48;color:#fff;padding:15px;border:none;border-radius:10px;font-size:1rem;font-weight:700;cursor:pointer;font-family:inherit">Enviar mensaje →</button></form></div></section>` },
  { id:'newsletter', label:lbl(IC.email,'Newsletter'), category:'Formularios',
    content:`<section style="padding:64px 24px;background:linear-gradient(135deg,#e11d48,#f43f5e);font-family:Inter,sans-serif;text-align:center"><h2 style="color:#fff;font-size:1.875rem;font-weight:800;margin:0 0 12px">Mantente al día</h2><p style="color:rgba(255,255,255,.88);margin:0 0 32px">Suscríbete y recibe las últimas novedades.</p><form style="display:flex;gap:10px;max-width:440px;margin:0 auto"><input type="email" placeholder="tu@email.com" style="flex:1;padding:14px 18px;border:none;border-radius:50px;font-size:.95rem;outline:none;font-family:inherit"><button type="submit" style="padding:14px 28px;background:#fff;color:#e11d48;border:none;border-radius:50px;font-weight:800;cursor:pointer;font-size:.95rem;font-family:inherit;white-space:nowrap">Suscribirme</button></form></section>` },
  // Básicos
  { id:'heading', label:lbl(IC.text,'Título'), category:'Básicos',
    content:`<div style="padding:32px 24px;font-family:Inter,sans-serif;text-align:center"><h2 style="font-size:2.25rem;font-weight:700;color:#0f172a;margin:0 0 12px;line-height:1.2">Tu Título de Sección</h2><div style="width:48px;height:3px;background:#e11d48;border-radius:2px;margin:0 auto"></div></div>` },
  { id:'paragraph', label:lbl(IC.text,'Texto'), category:'Básicos',
    content:`<div style="padding:24px;font-family:Inter,sans-serif;max-width:720px;margin:0 auto"><p style="font-size:1rem;color:#475569;line-height:1.85;margin:0">Haz clic para editar este párrafo. Puedes describir tu empresa, servicios o cualquier contenido relevante.</p></div>` },
  { id:'img', label:lbl(IC.image,'Imagen'), category:'Básicos',
    content:`<div style="padding:16px;text-align:center"><img src="https://placehold.co/960x400/1e293b/94a3b8?text=Tu+imagen+aqui&font=inter" alt="Imagen" style="max-width:100%;border-radius:16px;display:inline-block"></div>` },
  { id:'btn', label:lbl(IC.button,'Botón'), category:'Básicos',
    content:`<div style="padding:16px;text-align:center"><a href="#" style="display:inline-block;background:#e11d48;color:#fff;padding:14px 36px;border-radius:50px;text-decoration:none;font-weight:700;font-size:1rem;font-family:Inter,sans-serif">Llamada a la acción</a></div>` },
  { id:'hr', label:lbl(IC.divider,'Divisor'), category:'Básicos',
    content:`<div style="padding:16px 24px"><hr style="border:none;border-top:1px solid #e2e8f0;max-width:80%;margin:0 auto"></div>` },
  // Media
  { id:'video-block', label:lbl(IC.video,'Video'), category:'Media',
    content:`<div style="padding:24px"><div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:16px"><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" allowfullscreen loading="lazy"></iframe></div></div>` },
  { id:'map-block', label:lbl(IC.map,'Mapa'), category:'Media',
    content:`<div style="padding:24px"><iframe src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d120899.48694040942!2d-99.1332!3d19.4326!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTnCsDI1JzU3LjQiTiA5OcKwMDcnNTkuNSJX!5e0!3m2!1ses!2smx!4v1620000000000" style="width:100%;height:360px;border:0;border-radius:16px" allowfullscreen loading="lazy"></iframe></div>` },
  // Avanzado
  { id:'html-block', label:lbl(IC.code,'HTML Libre'), category:'Avanzado',
    content:`<div style="padding:16px;background:#1e293b;border-radius:10px;border-left:3px solid #e11d48;font-family:'Courier New',monospace;font-size:.85rem;color:#94a3b8"><!-- Tu código HTML personalizado --></div>` },
]

/* ─── Plantillas completas de página ────────────────────────────────────────── */
const PAGE_TEMPLATES = [
  {
    id:'corporate', name:'Corporativo', accent:'#2563eb', desc:'Para empresas y negocios',
    header:`<nav style="display:flex;align-items:center;justify-content:space-between;padding:0 48px;height:68px;background:#fff;box-shadow:0 1px 0 #e2e8f0;font-family:Inter,sans-serif;position:sticky;top:0;z-index:100"><div style="font-size:1.3rem;font-weight:900;color:#0f172a">Mi Empresa</div><div style="display:flex;gap:28px;align-items:center"><a href="/" style="text-decoration:none;color:#475569;font-weight:500;font-size:.9rem">Inicio</a><a href="/nosotros" style="text-decoration:none;color:#475569;font-weight:500;font-size:.9rem">Nosotros</a><a href="#contacto" style="background:#2563eb;color:#fff;padding:10px 22px;border-radius:50px;text-decoration:none;font-weight:700;font-size:.875rem">Contacto</a></div></nav>`,
    body:`<section style="padding:88px 24px;background:linear-gradient(135deg,#0f172a,#1e3a5f);text-align:center;font-family:Inter,sans-serif"><h1 style="font-size:clamp(2rem,5vw,3.5rem);font-weight:800;color:#fff;margin:0 0 16px;line-height:1.15">Soluciones Empresariales de Alto Nivel</h1><p style="font-size:1.1rem;color:rgba(255,255,255,.75);max-width:600px;margin:0 auto 36px;line-height:1.75">Servicios profesionales adaptados a cada empresa.</p><a href="#contacto" style="display:inline-block;background:#2563eb;color:#fff;padding:14px 40px;border-radius:50px;text-decoration:none;font-weight:700">Ver Soluciones →</a></section>`,
    footer:`<footer style="padding:56px 24px 32px;background:#0f172a;font-family:Inter,sans-serif"><div style="max-width:1100px;margin:0 auto 40px;display:grid;grid-template-columns:2fr 1fr 1fr;gap:48px"><div><div style="font-size:1.3rem;font-weight:900;color:#fff;margin-bottom:12px">Mi Empresa</div><p style="color:#94a3b8;font-size:.875rem;line-height:1.7;margin:0">Soluciones para empresas que buscan crecer.</p></div><div><h4 style="color:#e2e8f0;margin:0 0 14px;font-size:.8rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em">Empresa</h4><div style="display:flex;flex-direction:column;gap:10px"><a href="/" style="color:#94a3b8;text-decoration:none;font-size:.875rem">Inicio</a><a href="#" style="color:#94a3b8;text-decoration:none;font-size:.875rem">Nosotros</a></div></div><div><h4 style="color:#e2e8f0;margin:0 0 14px;font-size:.8rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em">Legal</h4><div style="display:flex;flex-direction:column;gap:10px"><a href="#" style="color:#94a3b8;text-decoration:none;font-size:.875rem">Privacidad</a></div></div></div><div style="max-width:1100px;margin:0 auto;padding-top:24px;border-top:1px solid #1e293b;text-align:center;font-size:.8rem;color:#475569">© 2025 Mi Empresa</div></footer>`,
  },
  {
    id:'restaurant', name:'Restaurante', accent:'#d97706', desc:'Gastronomía y hostelería',
    header:`<nav style="display:flex;align-items:center;justify-content:space-between;padding:0 48px;height:72px;background:#1c1917;font-family:Inter,sans-serif"><div style="font-size:1.4rem;font-weight:900;color:#fbbf24;font-style:italic">Sabor &amp; Arte</div><div style="display:flex;gap:28px;align-items:center"><a href="/" style="text-decoration:none;color:rgba(255,255,255,.8);font-weight:500;font-size:.9rem">Inicio</a><a href="#menu" style="text-decoration:none;color:rgba(255,255,255,.8);font-weight:500;font-size:.9rem">Menú</a><a href="#reserva" style="background:#d97706;color:#fff;padding:10px 24px;border-radius:4px;text-decoration:none;font-weight:700;font-size:.875rem;text-transform:uppercase">Reservar</a></div></nav>`,
    body:`<section style="padding:96px 24px;background:linear-gradient(to bottom,rgba(0,0,0,.6),rgba(0,0,0,.4)),url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=80') center/cover;text-align:center;font-family:Georgia,serif"><h1 style="font-size:clamp(2.5rem,6vw,4rem);font-weight:700;color:#fff;margin:0 0 16px;line-height:1.1">Una experiencia gastronómica única</h1><p style="font-size:1.1rem;color:rgba(255,255,255,.85);max-width:520px;margin:0 auto 36px;font-style:italic">Sabores auténticos con ingredientes frescos.</p><a href="#reserva" style="display:inline-block;background:#d97706;color:#fff;padding:15px 44px;border-radius:4px;text-decoration:none;font-weight:700;font-size:1rem;text-transform:uppercase;font-family:Inter,sans-serif">Reservar Mesa</a></section>`,
    footer:`<footer style="padding:48px 24px;background:#1c1917;font-family:Inter,sans-serif;text-align:center"><div style="font-size:1.4rem;font-weight:900;color:#fbbf24;margin-bottom:16px;font-style:italic">Sabor &amp; Arte</div><p style="color:#78716c;font-size:.875rem;margin:0 0 24px">Av. Principal 123 · Tel: (55) 1234-5678</p><p style="color:#57534e;font-size:.8rem;margin:0">© 2025 Sabor &amp; Arte</p></footer>`,
  },
  {
    id:'landing', name:'Landing Page', accent:'#4f46e5', desc:'Optimizada para conversión',
    header:`<nav style="display:flex;align-items:center;justify-content:space-between;padding:0 48px;height:64px;background:#fff;border-bottom:1px solid #e2e8f0;font-family:Inter,sans-serif"><div style="font-size:1.2rem;font-weight:900;color:#4f46e5">Product<span style="color:#0f172a">App</span></div><div style="display:flex;gap:24px;align-items:center"><a href="#" style="text-decoration:none;color:#475569;font-weight:500;font-size:.875rem">Características</a><a href="#precios" style="text-decoration:none;color:#475569;font-weight:500;font-size:.875rem">Precios</a><a href="#" style="background:#4f46e5;color:#fff;padding:9px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:.875rem">Empezar gratis</a></div></nav>`,
    body:`<section style="padding:96px 24px;background:linear-gradient(135deg,#4f46e5,#7c3aed);text-align:center;font-family:Inter,sans-serif"><h1 style="font-size:clamp(2.2rem,5vw,3.75rem);font-weight:900;color:#fff;margin:0 0 16px;line-height:1.1">Transforma tu negocio con nuestra solución</h1><p style="font-size:1.1rem;color:rgba(255,255,255,.82);max-width:560px;margin:0 auto 40px;line-height:1.75">Lista en minutos. Sin curva de aprendizaje.</p><div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap"><a href="#" style="display:inline-block;background:#fff;color:#4f46e5;padding:15px 36px;border-radius:12px;text-decoration:none;font-weight:800;font-size:1rem">Probar 14 días gratis</a><a href="#demo" style="display:inline-block;background:rgba(255,255,255,.15);color:#fff;padding:15px 36px;border-radius:12px;text-decoration:none;font-weight:600;font-size:1rem;border:1px solid rgba(255,255,255,.3)">Ver demo →</a></div></section>`,
    footer:`<footer style="padding:48px 24px;background:#0f172a;font-family:Inter,sans-serif;text-align:center"><div style="font-size:1.2rem;font-weight:900;color:#818cf8;margin-bottom:12px">Product<span style="color:#fff">App</span></div><p style="color:#334155;font-size:.8rem;margin:0">© 2025 ProductApp · Privacidad · Términos</p></footer>`,
  },
  {
    id:'minimal', name:'Minimalista', accent:'#0ea5e9', desc:'Diseño limpio y elegante',
    header:`<nav style="display:flex;align-items:center;justify-content:space-between;padding:0 64px;height:72px;background:#fff;font-family:Inter,sans-serif"><div style="font-size:1.5rem;font-weight:300;color:#0f172a;letter-spacing:-.02em">Studio<span style="font-weight:800">Ox</span></div><div style="display:flex;gap:36px;align-items:center"><a href="/" style="text-decoration:none;color:#64748b;font-size:.875rem;letter-spacing:.04em;text-transform:uppercase">Trabajo</a><a href="#" style="text-decoration:none;color:#64748b;font-size:.875rem;letter-spacing:.04em;text-transform:uppercase">Sobre</a><a href="#contacto" style="text-decoration:none;color:#0ea5e9;font-size:.875rem;letter-spacing:.04em;text-transform:uppercase;font-weight:600">Contacto</a></div></nav>`,
    body:`<section style="min-height:90vh;display:flex;align-items:center;justify-content:center;padding:80px 24px;background:#fff;font-family:Inter,sans-serif"><div style="max-width:800px;text-align:center"><p style="font-size:.85rem;color:#0ea5e9;letter-spacing:.12em;text-transform:uppercase;font-weight:600;margin:0 0 24px">Diseño & Creatividad</p><h1 style="font-size:clamp(3rem,7vw,5rem);font-weight:800;color:#0f172a;margin:0 0 24px;line-height:1.05;letter-spacing:-.03em">Creamos experiencias<br/>que importan.</h1><p style="font-size:1.15rem;color:#64748b;max-width:480px;margin:0 auto 48px;line-height:1.8">Diseño minimalista que comunica lo esencial.</p><a href="#trabajo" style="display:inline-flex;align-items:center;gap:8px;color:#0f172a;font-weight:700;text-decoration:none;font-size:1rem;border-bottom:2px solid #0ea5e9;padding-bottom:4px">Ver proyectos <span>→</span></a></div></section>`,
    footer:`<footer style="padding:48px 64px;background:#f8fafc;font-family:Inter,sans-serif;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #e2e8f0"><div style="font-size:1.1rem;font-weight:800;color:#0f172a">Studio<span style="color:#0ea5e9">Ox</span></div><p style="color:#94a3b8;font-size:.8rem;margin:0">© 2025 StudioOx</p><div style="display:flex;gap:20px"><a href="#" style="color:#64748b;font-size:.8rem;text-decoration:none">Privacidad</a><a href="#" style="color:#64748b;font-size:.8rem;text-decoration:none">Términos</a></div></footer>`,
  },
]

/* ─── Logo placeholder SVG ─────────────────────────────────────────────────── */
const LOGO_PLACEHOLDER = `<div style="display:flex;align-items:center;gap:8px;cursor:pointer" title="Haz clic para editar el logo">
  <div style="width:36px;height:36px;background:linear-gradient(135deg,#e11d48,#f43f5e);border-radius:8px;display:flex;align-items:center;justify-content:center">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15 15 0 010 20M12 2a15 15 0 000 20"/></svg>
  </div>
  <span style="font-weight:800;font-size:1.1rem;color:inherit">Mi Empresa</span>
</div>`

const LOGO_DARK = `<div style="display:flex;align-items:center;gap:8px;cursor:pointer" title="Haz clic para editar el logo">
  <div style="width:36px;height:36px;background:linear-gradient(135deg,#e11d48,#f43f5e);border-radius:8px;display:flex;align-items:center;justify-content:center">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15 15 0 010 20M12 2a15 15 0 000 20"/></svg>
  </div>
  <span style="font-weight:800;font-size:1.1rem;color:#fff">Mi Empresa</span>
</div>`

/* ─── Plantillas de Header ───────────────────────────────────────────────────── */
const HEADER_TEMPLATES = [
  {
    id:'h-corporate', name:'Corporativo', accent:'#2563eb', desc:'Navbar clásico con logo y menú',
    preview:'🏢',
    html:`<nav style="display:flex;align-items:center;justify-content:space-between;padding:0 48px;height:68px;background:#fff;box-shadow:0 1px 0 #e2e8f0;font-family:Inter,sans-serif;position:sticky;top:0;z-index:100">${LOGO_PLACEHOLDER}<div style="display:flex;gap:28px;align-items:center"><a href="/" style="text-decoration:none;color:#475569;font-weight:500;font-size:.9rem">Inicio</a><a href="#servicios" style="text-decoration:none;color:#475569;font-weight:500;font-size:.9rem">Servicios</a><a href="#nosotros" style="text-decoration:none;color:#475569;font-weight:500;font-size:.9rem">Nosotros</a><a href="#contacto" style="background:#2563eb;color:#fff;padding:10px 22px;border-radius:50px;text-decoration:none;font-weight:700;font-size:.875rem">Contacto</a></div></nav>`,
  },
  {
    id:'h-dark', name:'Dark Navbar', accent:'#e11d48', desc:'Fondo oscuro, ideal para diseños premium',
    preview:'🌑',
    html:`<nav style="display:flex;align-items:center;justify-content:space-between;padding:0 48px;height:70px;background:#0f172a;font-family:Inter,sans-serif;position:sticky;top:0;z-index:100">${LOGO_DARK}<div style="display:flex;gap:28px;align-items:center"><a href="/" style="text-decoration:none;color:rgba(255,255,255,.7);font-weight:500;font-size:.9rem">Inicio</a><a href="#servicios" style="text-decoration:none;color:rgba(255,255,255,.7);font-weight:500;font-size:.9rem">Servicios</a><a href="#contacto" style="text-decoration:none;color:rgba(255,255,255,.7);font-weight:500;font-size:.9rem">Contacto</a><a href="#" style="background:#e11d48;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:.875rem">Comenzar</a></div></nav>`,
  },
  {
    id:'h-restaurant', name:'Restaurante', accent:'#d97706', desc:'Elegante para negocios gastronómicos',
    preview:'🍽️',
    html:`<nav style="display:flex;align-items:center;justify-content:space-between;padding:0 48px;height:72px;background:#1c1917;font-family:Inter,sans-serif;position:sticky;top:0;z-index:100"><div style="font-size:1.4rem;font-weight:900;color:#fbbf24;font-style:italic">Sabor &amp; Arte</div><div style="display:flex;gap:28px;align-items:center"><a href="/" style="text-decoration:none;color:rgba(255,255,255,.8);font-weight:500;font-size:.9rem">Inicio</a><a href="#menu" style="text-decoration:none;color:rgba(255,255,255,.8);font-weight:500;font-size:.9rem">Menú</a><a href="#galeria" style="text-decoration:none;color:rgba(255,255,255,.8);font-weight:500;font-size:.9rem">Galería</a><a href="#reserva" style="background:#d97706;color:#fff;padding:10px 24px;border-radius:4px;text-decoration:none;font-weight:700;font-size:.875rem;text-transform:uppercase;letter-spacing:.04em">Reservar</a></div></nav>`,
  },
  {
    id:'h-landing', name:'SaaS / App', accent:'#4f46e5', desc:'Para productos digitales y startups',
    preview:'🚀',
    html:`<nav style="display:flex;align-items:center;justify-content:space-between;padding:0 48px;height:64px;background:#fff;border-bottom:1px solid #e2e8f0;font-family:Inter,sans-serif;position:sticky;top:0;z-index:100"><div style="font-size:1.2rem;font-weight:900;color:#4f46e5">Product<span style="color:#0f172a">App</span></div><div style="display:flex;gap:24px;align-items:center"><a href="#" style="text-decoration:none;color:#475569;font-weight:500;font-size:.875rem">Características</a><a href="#precios" style="text-decoration:none;color:#475569;font-weight:500;font-size:.875rem">Precios</a><a href="#" style="text-decoration:none;color:#475569;font-weight:500;font-size:.875rem">Blog</a><a href="#" style="color:#475569;font-size:.875rem;text-decoration:none;font-weight:500">Iniciar sesión</a><a href="#" style="background:#4f46e5;color:#fff;padding:9px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:.875rem">Empezar gratis →</a></div></nav>`,
  },
  {
    id:'h-minimal', name:'Minimalista', accent:'#0ea5e9', desc:'Limpio y elegante, menos es más',
    preview:'✨',
    html:`<nav style="display:flex;align-items:center;justify-content:space-between;padding:0 64px;height:72px;background:#fff;border-bottom:1px solid #f1f5f9;font-family:Inter,sans-serif">${LOGO_PLACEHOLDER}<div style="display:flex;gap:36px;align-items:center"><a href="/" style="text-decoration:none;color:#64748b;font-size:.85rem;letter-spacing:.06em;text-transform:uppercase">Trabajo</a><a href="#" style="text-decoration:none;color:#64748b;font-size:.85rem;letter-spacing:.06em;text-transform:uppercase">Sobre</a><a href="#contacto" style="text-decoration:none;color:#0ea5e9;font-size:.85rem;letter-spacing:.06em;text-transform:uppercase;font-weight:700;border-bottom:2px solid #0ea5e9;padding-bottom:2px">Contacto</a></div></nav>`,
  },
  {
    id:'h-centered', name:'Centrado', accent:'#7c3aed', desc:'Logo centrado, ideal para marcas premium',
    preview:'⚜️',
    html:`<nav style="display:flex;flex-direction:column;align-items:center;padding:20px 48px 16px;background:#fff;border-bottom:1px solid #e2e8f0;font-family:Inter,sans-serif"><div style="font-size:1.8rem;font-weight:900;color:#7c3aed;margin-bottom:14px;letter-spacing:-.03em">LUXE BRAND</div><div style="display:flex;gap:36px;align-items:center"><a href="/" style="text-decoration:none;color:#475569;font-size:.85rem;letter-spacing:.08em;text-transform:uppercase">Inicio</a><a href="#coleccion" style="text-decoration:none;color:#475569;font-size:.85rem;letter-spacing:.08em;text-transform:uppercase">Colección</a><a href="#tienda" style="text-decoration:none;color:#475569;font-size:.85rem;letter-spacing:.08em;text-transform:uppercase">Tienda</a><a href="#contacto" style="text-decoration:none;color:#7c3aed;font-size:.85rem;letter-spacing:.08em;text-transform:uppercase;font-weight:700">Contacto</a></div></nav>`,
  },
]

/* ─── Plantillas de Footer ───────────────────────────────────────────────────── */
const FOOTER_TEMPLATES = [
  {
    id:'f-corporate', name:'Corporativo', accent:'#2563eb', desc:'Columnas con links y copyright',
    preview:'🏢',
    html:`<footer style="padding:56px 24px 32px;background:#0f172a;color:#94a3b8;font-family:Inter,sans-serif"><div style="max-width:1100px;margin:0 auto 40px;display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:48px"><div><div style="font-size:1.3rem;font-weight:800;color:#fff;margin-bottom:12px">Mi Empresa</div><p style="margin:0 0 20px;line-height:1.7;font-size:.875rem">Tu descripción de empresa aquí. Breve y clara.</p><div style="display:flex;gap:12px"><a href="#" style="width:34px;height:34px;background:rgba(255,255,255,.08);border-radius:8px;display:flex;align-items:center;justify-content:center;color:#94a3b8;text-decoration:none;font-size:14px">in</a><a href="#" style="width:34px;height:34px;background:rgba(255,255,255,.08);border-radius:8px;display:flex;align-items:center;justify-content:center;color:#94a3b8;text-decoration:none;font-size:14px">tw</a></div></div><div><h4 style="color:#e2e8f0;margin:0 0 16px;font-size:.8rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em">Empresa</h4><div style="display:flex;flex-direction:column;gap:10px"><a href="/" style="color:#94a3b8;text-decoration:none;font-size:.875rem">Inicio</a><a href="#" style="color:#94a3b8;text-decoration:none;font-size:.875rem">Nosotros</a><a href="#" style="color:#94a3b8;text-decoration:none;font-size:.875rem">Blog</a></div></div><div><h4 style="color:#e2e8f0;margin:0 0 16px;font-size:.8rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em">Servicios</h4><div style="display:flex;flex-direction:column;gap:10px"><a href="#" style="color:#94a3b8;text-decoration:none;font-size:.875rem">Consultoría</a><a href="#" style="color:#94a3b8;text-decoration:none;font-size:.875rem">Desarrollo</a><a href="#" style="color:#94a3b8;text-decoration:none;font-size:.875rem">Diseño</a></div></div><div><h4 style="color:#e2e8f0;margin:0 0 16px;font-size:.8rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em">Legal</h4><div style="display:flex;flex-direction:column;gap:10px"><a href="#" style="color:#94a3b8;text-decoration:none;font-size:.875rem">Privacidad</a><a href="#" style="color:#94a3b8;text-decoration:none;font-size:.875rem">Términos</a></div></div></div><div style="max-width:1100px;margin:0 auto;padding-top:24px;border-top:1px solid #1e293b;text-align:center;font-size:.8rem;color:#475569">© 2025 Mi Empresa · Todos los derechos reservados</div></footer>`,
  },
  {
    id:'f-simple', name:'Simple', accent:'#e11d48', desc:'Pie mínimo con copyright centrado',
    preview:'📄',
    html:`<footer style="padding:40px 24px;background:#0f172a;font-family:Inter,sans-serif;text-align:center"><div style="font-size:1.2rem;font-weight:800;color:#fff;margin-bottom:20px">Mi Empresa</div><div style="display:flex;justify-content:center;gap:28px;margin-bottom:24px;flex-wrap:wrap"><a href="/" style="color:#64748b;text-decoration:none;font-size:.85rem">Inicio</a><a href="#" style="color:#64748b;text-decoration:none;font-size:.85rem">Servicios</a><a href="#" style="color:#64748b;text-decoration:none;font-size:.85rem">Contacto</a><a href="#" style="color:#64748b;text-decoration:none;font-size:.85rem">Privacidad</a></div><p style="color:#334155;font-size:.8rem;margin:0">© 2025 Mi Empresa · Todos los derechos reservados</p></footer>`,
  },
  {
    id:'f-restaurant', name:'Restaurante', accent:'#d97706', desc:'Para bares y restaurantes',
    preview:'🍽️',
    html:`<footer style="padding:56px 24px 32px;background:#1c1917;font-family:Inter,sans-serif"><div style="max-width:900px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr 1fr;gap:48px;text-align:center"><div><div style="font-size:1.4rem;font-weight:900;color:#fbbf24;margin-bottom:10px;font-style:italic">Sabor &amp; Arte</div><p style="color:#78716c;font-size:.875rem;margin:0">Cocina de autor desde 1995</p></div><div><h4 style="color:#e7e5e4;margin:0 0 12px;font-size:.8rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em">Horario</h4><p style="color:#78716c;font-size:.875rem;margin:0;line-height:1.8">Lun – Vie: 12:00 – 23:00<br/>Sáb – Dom: 12:00 – 01:00</p></div><div><h4 style="color:#e7e5e4;margin:0 0 12px;font-size:.8rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em">Contacto</h4><p style="color:#78716c;font-size:.875rem;margin:0;line-height:1.8">Av. Principal 123<br/>Tel: (55) 1234-5678</p></div></div><div style="max-width:900px;margin:32px auto 0;padding-top:24px;border-top:1px solid #292524;text-align:center;font-size:.8rem;color:#57534e">© 2025 Sabor &amp; Arte · Todos los derechos reservados</div></footer>`,
  },
  {
    id:'f-saas', name:'SaaS / App', accent:'#4f46e5', desc:'Para productos de software y apps',
    preview:'💻',
    html:`<footer style="padding:64px 24px 32px;background:#020617;font-family:Inter,sans-serif"><div style="max-width:1100px;margin:0 auto"><div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:48px;margin-bottom:48px"><div><div style="font-size:1.2rem;font-weight:900;color:#818cf8;margin-bottom:8px">Product<span style="color:#fff">App</span></div><p style="color:#475569;font-size:.875rem;line-height:1.7;margin:0 0 20px;max-width:260px">La herramienta que tu equipo necesitaba. Lista en minutos.</p><div style="display:inline-flex;align-items:center;gap:8px;background:rgba(129,140,248,.1);border:1px solid rgba(129,140,248,.2);border-radius:20px;padding:6px 14px"><div style="width:8px;height:8px;background:#22c55e;border-radius:50%"></div><span style="color:#94a3b8;font-size:11px;font-weight:600">99.9% uptime</span></div></div><div><h4 style="color:#e2e8f0;margin:0 0 16px;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em">Producto</h4><div style="display:flex;flex-direction:column;gap:10px"><a href="#" style="color:#64748b;text-decoration:none;font-size:.875rem">Características</a><a href="#precios" style="color:#64748b;text-decoration:none;font-size:.875rem">Precios</a><a href="#" style="color:#64748b;text-decoration:none;font-size:.875rem">Changelog</a></div></div><div><h4 style="color:#e2e8f0;margin:0 0 16px;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em">Empresa</h4><div style="display:flex;flex-direction:column;gap:10px"><a href="#" style="color:#64748b;text-decoration:none;font-size:.875rem">Acerca de</a><a href="#" style="color:#64748b;text-decoration:none;font-size:.875rem">Blog</a><a href="#" style="color:#64748b;text-decoration:none;font-size:.875rem">Empleo</a></div></div><div><h4 style="color:#e2e8f0;margin:0 0 16px;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em">Legal</h4><div style="display:flex;flex-direction:column;gap:10px"><a href="#" style="color:#64748b;text-decoration:none;font-size:.875rem">Privacidad</a><a href="#" style="color:#64748b;text-decoration:none;font-size:.875rem">Términos</a><a href="#" style="color:#64748b;text-decoration:none;font-size:.875rem">Cookies</a></div></div></div><div style="padding-top:24px;border-top:1px solid #0f172a;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px"><p style="color:#1e293b;font-size:.8rem;margin:0">© 2025 ProductApp Inc.</p><p style="color:#1e293b;font-size:.8rem;margin:0">Hecho con ❤️ en México</p></div></div></footer>`,
  },
  {
    id:'f-minimal', name:'Minimalista', accent:'#0ea5e9', desc:'Limpio y sutil, fondo claro',
    preview:'✨',
    html:`<footer style="padding:48px 64px;background:#f8fafc;font-family:Inter,sans-serif;border-top:1px solid #e2e8f0"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:20px"><div style="font-size:1.1rem;font-weight:800;color:#0f172a">Studio<span style="color:#0ea5e9">Ox</span></div><div style="display:flex;gap:28px"><a href="#" style="color:#64748b;text-decoration:none;font-size:.85rem">Trabajo</a><a href="#" style="color:#64748b;text-decoration:none;font-size:.85rem">Sobre</a><a href="#" style="color:#64748b;text-decoration:none;font-size:.85rem">Privacidad</a></div><p style="color:#94a3b8;font-size:.8rem;margin:0">© 2025 StudioOx</p></div></footer>`,
  },
]

/* ─── Build full-page HTML for the canvas ───────────────────────────────────── */
const buildPageHTML = (headerHtml, bodyHtml, footerHtml, pageTitle = 'Inicio') => `
  <div id="snx-header" data-snx-zone="header">
    ${headerHtml || `<div style="background:#f1f5f9;border:2px dashed #94a3b8;border-radius:8px;padding:20px;text-align:center;font-family:Inter,sans-serif;color:#64748b;font-size:.875rem">
      <strong>Header</strong> — Arrastra un bloque Navbar aquí o elige una plantilla de Header. Se comparte en <strong>todas</strong> las páginas.
    </div>`}
  </div>
  <div id="snx-body" data-snx-zone="body">
    ${bodyHtml || `<div style="background:#f8fafc;border:2px dashed #94a3b8;border-radius:8px;padding:40px;text-align:center;font-family:Inter,sans-serif;color:#64748b;font-size:.875rem;min-height:200px;display:flex;align-items:center;justify-content:center">
      <div><div style="font-size:2rem;margin-bottom:12px">📄</div><strong style="display:block;margin-bottom:8px;font-size:1rem;color:#475569">Página: ${pageTitle}</strong>Arrastra bloques desde el panel izquierdo para construir tu página.</div>
    </div>`}
  </div>
  <div id="snx-footer" data-snx-zone="footer">
    ${footerHtml || `<div style="background:#f1f5f9;border:2px dashed #94a3b8;border-radius:8px;padding:20px;text-align:center;font-family:Inter,sans-serif;color:#64748b;font-size:.875rem">
      <strong>Footer</strong> — Arrastra un bloque Footer aquí o elige una plantilla de Footer. Se comparte en <strong>todas</strong> las páginas.
    </div>`}
  </div>
`

/* ─── Canvas indicator CSS (injected in iframe) ─────────────────────────────── */
const CANVAS_ZONE_CSS = `
  [data-snx-zone] { position: relative; min-height: 56px; }
  [data-snx-zone]::before {
    display: block;
    font: 700 10px/22px 'Inter', sans-serif;
    text-transform: uppercase;
    letter-spacing: .07em;
    padding: 0 12px;
    color: #fff;
    position: sticky;
    top: 0;
    z-index: 9999;
    pointer-events: none;
  }
  [data-snx-zone="header"]::before {
    content: '▸ HEADER — compartido en todas las páginas';
    background: #2563eb;
  }
  [data-snx-zone="body"]::before {
    content: '▸ CONTENIDO — editable por página';
    background: #e11d48;
  }
  [data-snx-zone="footer"]::before {
    content: '▸ FOOTER — compartido en todas las páginas';
    background: #2563eb;
  }
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; font-family: Inter, sans-serif; }
`

/* ─── Component ─────────────────────────────────────────────────────────────── */
export default function WebBuilderPage() {
  const navigate     = useNavigate()
  const containerRef  = useRef(null)   // GrapesJS full editor container
  const editorRef     = useRef(null)
  const initDone      = useRef(false)
  const dataRef      = useRef({ pages: [], page: null, config: null })

  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)
  const [pages,         setPages]         = useState([])
  const [currentPage,   setCurrentPage]   = useState(null)
  const [siteConfig,    setSiteConfig]    = useState(null)
  const [showPages,     setShowPages]     = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showHeaderTpl, setShowHeaderTpl] = useState(false)  // panel plantillas header
  const [showFooterTpl, setShowFooterTpl] = useState(false)  // panel plantillas footer
  const [saving,        setSaving]        = useState(false)
  const [saveStatus,    setSaveStatus]    = useState(null)   // null | 'ok' | 'err'
  const [device,        setDevice]        = useState('Desktop')
  const [newPageName,   setNewPageName]   = useState('')
  const [showNewPage,   setShowNewPage]   = useState(false)
  const [tplConfirm,    setTplConfirm]    = useState(null)
  const [hdrConfirm,    setHdrConfirm]    = useState(null)
  const [ftrConfirm,    setFtrConfirm]    = useState(null)
  const [showCodeEditor, setShowCodeEditor] = useState(false)
  const [codeTab,       setCodeTab]       = useState('html') // 'html' | 'css'
  const [codeHtml,      setCodeHtml]      = useState('')
  const [codeCss,       setCodeCss]       = useState('')

  /* ── Cerrar todos los paneles al abrir uno ──────────────────────────────── */
  const openPanel = (panel) => {
    setShowPages(panel === 'pages')
    setShowTemplates(panel === 'templates')
    setShowHeaderTpl(panel === 'header')
    setShowFooterTpl(panel === 'footer')
    setTplConfirm(null)
    setHdrConfirm(null)
    setFtrConfirm(null)
  }

  /* ── Load data & init GrapesJS ─────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [pagesRes, cfgRes] = await Promise.all([
          api.get('/web/builder/'),
          api.get('/web/siteconfig/'),
        ])

        let pgList = pagesRes.data.results ?? pagesRes.data
        const cfg  = cfgRes.data
        let pg     = pgList.find(p => p.slug === 'home' || p.is_home) || pgList[0] || null

        if (!pg) {
          try {
            const r = await api.post('/web/builder/', {
              title: 'Inicio', slug: 'home', is_home: true, is_published: true,
              html_content: '', css_content: '',
            })
            pg = r.data
            pgList = [pg]
          } catch {
            const r2 = await api.get('/web/builder/')
            pgList = r2.data.results ?? r2.data
            pg = pgList.find(p => p.slug === 'home' || p.is_home) || pgList[0]
          }
        }

        if (cancelled) return

        setPages(pgList)
        setCurrentPage(pg)
        setSiteConfig(cfg)
        dataRef.current = { pages: pgList, page: pg, config: cfg }
        setLoading(false)
      } catch (e) {
        if (!cancelled) setError('Error al cargar el sitio. Verifica que el servidor esté activo.')
      }
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Init GrapesJS AFTER React re-renders the container div ─────────────── */
  useEffect(() => {
    if (loading) return
    if (initDone.current) return
    const { page, config } = dataRef.current
    if (!page || !config) return
    initGrapesJS(page, config)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  /* ── GrapesJS initialization ─────────────────────────────────────────────── */
  const initGrapesJS = useCallback(async (pg, cfg) => {
    if (initDone.current || !containerRef.current) return
    initDone.current = true

    const [{ default: grapesjs }] = await Promise.all([
      import('grapesjs'),
      import('grapesjs/dist/css/grapes.min.css'),
    ])

    if (!containerRef.current) return

    // Restore saved CSS — use css_content as primary (has all component CSS now)
    const savedCss = pg?.css_content || cfg?.global_css || ''

    const ed = grapesjs.init({
      container:      containerRef.current,
      fromElement:    false,
      height:         '100%',
      width:          'auto',
      storageManager: false,
      undoManager:    { trackSelection: false },

      components: buildPageHTML(cfg?.header_html, pg?.html_content, cfg?.footer_html, pg?.title || 'Inicio'),
      style: savedCss || undefined,

      deviceManager: {
        devices: [
          { name: 'Desktop', width: '' },
          { name: 'Tablet',  width: '768px',  widthMedia: '992px' },
          { name: 'Mobile',  width: '375px',  widthMedia: '480px' },
        ],
      },

      blockManager: { blocks: BLOCKS },

      styleManager: {
        sectors: [
          { name: 'Dimensiones', open: false, properties: ['width','max-width','height','min-height','padding','margin'] },
          { name: 'Tipografía',  open: false, properties: ['font-family','font-size','font-weight','color','text-align','line-height','letter-spacing'] },
          { name: 'Fondo',       open: false, properties: ['background-color','background-image','background-size','background-position'] },
          { name: 'Bordes',      open: false, properties: ['border-radius','border','box-shadow'] },
          { name: 'Layout',      open: false, properties: ['display','flex-direction','align-items','justify-content','gap','opacity'] },
        ],
      },
    })

    editorRef.current = ed

    // Inject zone indicator CSS + Google Fonts into canvas iframe after it loads
    const injectCanvasCSS = () => {
      try {
        const doc = ed.Canvas.getFrameEl()?.contentDocument
        if (!doc?.head) return

        // Viewport meta for proper responsive behaviour
        if (!doc.getElementById('snx-viewport')) {
          const meta = doc.createElement('meta')
          meta.id   = 'snx-viewport'
          meta.name = 'viewport'
          meta.content = 'width=device-width, initial-scale=1'
          doc.head.insertBefore(meta, doc.head.firstChild)
        }

        // Google Fonts
        if (!doc.getElementById('snx-gfonts')) {
          const link = doc.createElement('link')
          link.id = 'snx-gfonts'
          link.rel = 'stylesheet'
          link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap'
          doc.head.appendChild(link)
        }

        // Zone indicators + responsive overrides
        if (!doc.getElementById('snx-zone-css')) {
          const style = doc.createElement('style')
          style.id = 'snx-zone-css'
          style.textContent = CANVAS_ZONE_CSS
          doc.head.appendChild(style)
        }
      } catch {}
    }

    ed.on('load', injectCanvasCSS)

    // ✅ Fix: Auto-open Style Manager when a component is selected
    ed.on('component:selected', () => {
      try {
        const smBtn = ed.Panels.getButton('views', 'open-sm')
        if (smBtn && !smBtn.get('active')) smBtn.set('active', true)
      } catch {}
    })

    // Unlock snx-zone wrappers (non-removable, non-draggable)
    ed.on('component:add', (model) => {
      const zone = model.getEl()?.dataset?.snxZone
      if (zone) {
        model.set({ removable: false, draggable: false, copyable: false, badgable: false })
      }
    })
  }, [])

  /* ── Save ───────────────────────────────────────────────────────────────── */
  const handleSave = useCallback(async () => {
    const ed = editorRef.current
    const pg = currentPage
    if (!ed || !pg) return

    setSaving(true)
    setSaveStatus(null)

    try {
      const fullHtml = ed.getHtml()
      const fullCss  = ed.getCss()   // CSS completo del editor

      // Extract section content
      const temp = document.createElement('div')
      temp.innerHTML = fullHtml
      const headerEl = temp.querySelector('#snx-header')
      const bodyEl   = temp.querySelector('#snx-body')
      const footerEl = temp.querySelector('#snx-footer')

      const headerHtml = headerEl?.innerHTML?.trim() || ''
      const bodyHtml   = bodyEl?.innerHTML?.trim()   || ''
      const footerHtml = footerEl?.innerHTML?.trim() || ''

      await Promise.all([
        api.patch(`/web/builder/${pg.id}/`, {
          html_content: bodyHtml,
          css_content:  fullCss,   // CSS completo del editor (header+body+footer IDs)
          is_published: true,
        }),
        api.patch('/web/siteconfig/update/', {
          header_html: headerHtml,
          header_css:  fullCss,    // mismo CSS — contiene IDs del header
          footer_html: footerHtml,
          footer_css:  fullCss,    // mismo CSS — contiene IDs del footer
          global_css:  '',         // vacío — no necesitamos duplicar
        }),
      ])

      // Update local state
      setCurrentPage(prev => prev ? { ...prev, html_content: bodyHtml, css_content: fullCss } : prev)
      setSiteConfig(prev => prev ? {
        ...prev,
        header_html: headerHtml,
        footer_html: footerHtml,
        global_css:  fullCss,
      } : prev)
      setSaveStatus('ok')
    } catch (e) {
      console.error('[Builder] Save error:', e)
      setSaveStatus('err')
    } finally {
      setSaving(false)
      setTimeout(() => setSaveStatus(null), 3000)
    }
  }, [currentPage])

  /* ── Preview — guarda primero y abre /preview/:slug ──────────────────── */
  const handlePreview = useCallback(async () => {
    const pg = currentPage
    if (!pg) return

    setSaving(true)
    setSaveStatus(null)
    try {
      // Guardamos el estado actual
      const ed = editorRef.current
      if (ed) {
        const fullHtml = ed.getHtml()
        const fullCss  = ed.getCss()
        const temp = document.createElement('div')
        temp.innerHTML = fullHtml
        const headerHtml = temp.querySelector('#snx-header')?.innerHTML?.trim() || ''
        const bodyHtml   = temp.querySelector('#snx-body')?.innerHTML?.trim()   || ''
        const footerHtml = temp.querySelector('#snx-footer')?.innerHTML?.trim() || ''

        await Promise.all([
          api.patch(`/web/builder/${pg.id}/`, {
            html_content: bodyHtml, css_content: fullCss, is_published: true,
          }),
          api.patch('/web/siteconfig/update/', {
            header_html: headerHtml, header_css:  fullCss,
            footer_html: footerHtml, footer_css:  fullCss,
            global_css:  '',
          }),
        ])

        setCurrentPage(prev => prev ? { ...prev, html_content: bodyHtml, css_content: fullCss } : prev)
        setSiteConfig(prev => prev ? { ...prev, header_html: headerHtml, footer_html: footerHtml, global_css: fullCss } : prev)
      }
      setSaveStatus('ok')
      // ✅ Fix Bug #1: Abrir la preview con el slug correcto en lugar de "/"
      window.open(`/preview/${pg.slug}`, '_blank')
    } catch (e) {
      console.error('[Builder] Preview save error:', e)
      setSaveStatus('err')
    } finally {
      setSaving(false)
      setTimeout(() => setSaveStatus(null), 3000)
    }
  }, [currentPage])

  /* ── Switch page ────────────────────────────────────────────────────────── */
  const switchPage = useCallback(async (pg) => {
    if (!editorRef.current || pg.id === currentPage?.id) return
    setCurrentPage(pg)
    setShowPages(false)
    const cfg = siteConfig
    // ✅ Fix Bug #2: Restaurar CSS al cambiar de página
    const savedCss = [cfg?.global_css || '', pg.css_content || ''].filter(Boolean).join('\n')
    editorRef.current.setComponents(
      buildPageHTML(cfg?.header_html, pg.html_content, cfg?.footer_html, pg.title)
    )
    if (savedCss) {
      editorRef.current.setStyle(savedCss)
    }
  }, [currentPage, siteConfig])

  /* ── Add page ───────────────────────────────────────────────────────────── */
  const addPage = useCallback(async () => {
    if (!newPageName.trim()) return
    const slug = newPageName.trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    try {
      const res = await api.post('/web/builder/', {
        title: newPageName.trim(), slug, is_published: true,
        html_content: '', css_content: '',
      })
      const newPg = res.data
      setPages(prev => [...prev, newPg])
      setNewPageName('')
      setShowNewPage(false)
      await switchPage(newPg)
    } catch {
      alert('Error: el nombre de página puede estar repetido o contener caracteres inválidos.')
    }
  }, [newPageName, switchPage])

  /* ── Delete page ────────────────────────────────────────────────────────── */
  const deletePage = useCallback(async (pg, e) => {
    e.stopPropagation()
    if (!confirm(`¿Eliminar la página "${pg.title}"?`)) return
    try {
      await api.delete(`/web/builder/${pg.id}/`)
      const remaining = pages.filter(p => p.id !== pg.id)
      setPages(remaining)
      if (currentPage?.id === pg.id && remaining.length > 0) await switchPage(remaining[0])
    } catch { alert('Error al eliminar la página.') }
  }, [pages, currentPage, switchPage])

  /* ── Apply full page template ───────────────────────────────────────────── */
  const applyTemplate = useCallback((tpl) => {
    const ed = editorRef.current
    if (!ed) return
    const newHtml = buildPageHTML(tpl.header, tpl.body, tpl.footer, currentPage?.title || '')
    // CRITICAL: clear CSS BEFORE setComponents (GrapesJS converts inline styles to ID CSS rules)
    ed.setStyle('')
    ed.setComponents(newHtml)
    setSiteConfig(prev => prev ? { ...prev, header_html: tpl.header, footer_html: tpl.footer } : prev)
    setTplConfirm(null)
    setShowTemplates(false)
  }, [currentPage])

  /* ── Apply header template ──────────────────────────────────────────────── */
  const applyHeaderTemplate = useCallback((tpl) => {
    const ed  = editorRef.current
    const cfg = siteConfig
    if (!ed) return
    // Reconstruir el canvas con el nuevo header pero manteniendo body y footer
    const bodyHtml   = currentPage?.html_content || ''
    const footerHtml = cfg?.footer_html || ''
    const newHtml = buildPageHTML(tpl.html, bodyHtml, footerHtml, currentPage?.title || '')
    ed.setStyle('')
    ed.setComponents(newHtml)
    setSiteConfig(prev => prev ? { ...prev, header_html: tpl.html } : prev)
    setHdrConfirm(null)
    setShowHeaderTpl(false)
  }, [currentPage, siteConfig])

  /* ── Apply footer template ──────────────────────────────────────────────── */
  const applyFooterTemplate = useCallback((tpl) => {
    const ed  = editorRef.current
    const cfg = siteConfig
    if (!ed) return
    const headerHtml = cfg?.header_html || ''
    const bodyHtml   = currentPage?.html_content || ''
    const newHtml = buildPageHTML(headerHtml, bodyHtml, tpl.html, currentPage?.title || '')
    ed.setStyle('')
    ed.setComponents(newHtml)
    setSiteConfig(prev => prev ? { ...prev, footer_html: tpl.html } : prev)
    setFtrConfirm(null)
    setShowFooterTpl(false)
  }, [currentPage, siteConfig])

  /* ── Device change ──────────────────────────────────────────────────────── */
  const setEditorDevice = (d) => {
    editorRef.current?.setDevice(d)
    setDevice(d)
  }

  /* ── Scroll canvas to section ───────────────────────────────────────────── */
  const scrollToSection = (id) => {
    try {
      const frame = editorRef.current?.Canvas?.getFrameEl()
      frame?.contentDocument?.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch {}
  }

  /* ── Render: Loading ─────────────────────────────────────────────────────── */
  if (loading) return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#0d0d10', gap:16, fontFamily:'Inter,sans-serif' }}>
      <div style={{ width:44, height:44, border:'3px solid #1e1e2e', borderTopColor:'#e11d48', borderRadius:'50%', animation:'spin .7s linear infinite' }} />
      <p style={{ color:'#64748b', fontSize:13, margin:0 }}>Cargando el constructor...</p>
      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  )

  if (error) return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#0d0d10', gap:16, fontFamily:'Inter,sans-serif' }}>
      <div style={{ fontSize:40 }}>⚠️</div>
      <p style={{ color:'#ef4444', fontSize:14, margin:0 }}>{error}</p>
      <button onClick={() => navigate('/launchpad')} style={{ padding:'8px 20px', background:'#1f1f1f', color:'#ccc', border:'1px solid #333', borderRadius:8, cursor:'pointer', fontSize:13 }}>← Volver al sistema</button>
    </div>
  )

  /* ── Render: Builder ─────────────────────────────────────────────────────── */
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      display:'flex', flexDirection:'column', overflow:'hidden',
      fontFamily:'Inter,sans-serif', background:'#0d0d10',
    }}>

      {/* ── TOP BAR ──────────────────────────────────────────────────────── */}
      <header style={{
        height: 52, flexShrink: 0, display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 12px', background:'#111117', borderBottom:'1px solid rgba(255,255,255,.07)', gap:8, zIndex:200,
      }}>

        {/* Left: Back + Page selector + Pages toggle + Plantillas */}
        <div style={{ display:'flex', alignItems:'center', gap:6, flex:1, minWidth:0 }}>
          <button onClick={() => { handleSave().then(() => navigate('/launchpad')) }}
            style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', color:'#94a3b8', borderRadius:7, cursor:'pointer', fontSize:11, fontWeight:700, whiteSpace:'nowrap', flexShrink:0 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            Regresar al sistema
          </button>

          <button onClick={() => openPanel(showPages ? null : 'pages')}
            style={{
              display:'flex', alignItems:'center', gap:6, padding:'5px 12px',
              background: showPages ? 'rgba(225,29,72,.15)' : 'rgba(255,255,255,.06)',
              border: `1px solid ${showPages ? 'rgba(225,29,72,.3)' : 'rgba(255,255,255,.1)'}`,
              color: showPages ? '#f43f5e' : '#e2e8f0', borderRadius:7, cursor:'pointer', fontSize:11, fontWeight:700,
            }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            {currentPage?.title || 'Sin página'}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>

          <button onClick={() => openPanel(showTemplates ? null : 'templates')}
            style={{
              display:'flex', alignItems:'center', gap:5, padding:'5px 10px',
              background: showTemplates ? 'rgba(225,29,72,.15)' : 'rgba(255,255,255,.06)',
              border: `1px solid ${showTemplates ? 'rgba(225,29,72,.3)' : 'rgba(255,255,255,.1)'}`,
              color: showTemplates ? '#f43f5e' : '#94a3b8', borderRadius:7, cursor:'pointer', fontSize:11, fontWeight:700, whiteSpace:'nowrap',
            }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
            Plantillas
          </button>
        </div>

        {/* Center: Header | Contenido | Footer section tabs */}
        <div style={{ display:'flex', alignItems:'center', gap:2, background:'rgba(255,255,255,.05)', borderRadius:7, padding:'3px', border:'1px solid rgba(255,255,255,.07)' }}>
          {/* Header button → abre panel de plantillas de header */}
          <button
            onClick={() => openPanel(showHeaderTpl ? null : 'header')}
            style={{
              padding:'4px 14px', border:'none', borderRadius:5, cursor:'pointer', fontSize:11, fontWeight:700,
              background: showHeaderTpl ? 'rgba(37,99,235,.2)' : 'transparent',
              color: showHeaderTpl ? '#60a5fa' : '#64748b',
              transition:'all .15s',
            }}
            onMouseEnter={e => { if (!showHeaderTpl) { e.currentTarget.style.background = 'rgba(37,99,235,.15)'; e.currentTarget.style.color = '#60a5fa' } }}
            onMouseLeave={e => { if (!showHeaderTpl) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b' } }}
          >Header</button>

          {/* Contenido button → scroll */}
          <button
            onClick={() => scrollToSection('snx-body')}
            style={{ padding:'4px 14px', border:'none', borderRadius:5, cursor:'pointer', fontSize:11, fontWeight:700, background:'transparent', color:'#64748b', transition:'all .15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(225,29,72,.15)'; e.currentTarget.style.color = '#f43f5e' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b' }}
          >Contenido</button>

          {/* Footer button → abre panel de plantillas de footer */}
          <button
            onClick={() => openPanel(showFooterTpl ? null : 'footer')}
            style={{
              padding:'4px 14px', border:'none', borderRadius:5, cursor:'pointer', fontSize:11, fontWeight:700,
              background: showFooterTpl ? 'rgba(37,99,235,.2)' : 'transparent',
              color: showFooterTpl ? '#60a5fa' : '#64748b',
              transition:'all .15s',
            }}
            onMouseEnter={e => { if (!showFooterTpl) { e.currentTarget.style.background = 'rgba(37,99,235,.15)'; e.currentTarget.style.color = '#60a5fa' } }}
            onMouseLeave={e => { if (!showFooterTpl) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b' } }}
          >Footer</button>
        </div>

        {/* Right: Devices + Undo/Redo + Preview + Save */}
        <div style={{ display:'flex', alignItems:'center', gap:6, flex:1, justifyContent:'flex-end' }}>
          {/* Device */}
          <div style={{ display:'flex', gap:2, background:'rgba(255,255,255,.05)', borderRadius:7, padding:'3px', border:'1px solid rgba(255,255,255,.07)' }}>
            {[
              ['Desktop', <svg key="d" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>],
              ['Tablet',  <svg key="t" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>],
              ['Mobile',  <svg key="m" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>],
            ].map(([d, icon]) => (
              <button key={d} onClick={() => setEditorDevice(d)} title={d}
                style={{ padding:'4px 8px', border:'none', borderRadius:5, cursor:'pointer', display:'flex', alignItems:'center', color: device===d ? '#f43f5e' : '#64748b', background: device===d ? 'rgba(225,29,72,.12)' : 'transparent', transition:'all .15s' }}>
                {icon}
              </button>
            ))}
          </div>

          <button onClick={() => editorRef.current?.runCommand('core:undo')}
            title="Deshacer" style={{ padding:'5px 8px', background:'transparent', border:'1px solid rgba(255,255,255,.1)', color:'#64748b', borderRadius:7, cursor:'pointer', display:'flex', alignItems:'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 00-4-4H4"/></svg>
          </button>
          <button onClick={() => editorRef.current?.runCommand('core:redo')}
            title="Rehacer" style={{ padding:'5px 8px', background:'transparent', border:'1px solid rgba(255,255,255,.1)', color:'#64748b', borderRadius:7, cursor:'pointer', display:'flex', alignItems:'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 014-4h12"/></svg>
          </button>

          <button onClick={() => {
              const ed = editorRef.current
              if (!ed) return
              setCodeHtml(ed.getHtml())
              setCodeCss(ed.getCss())
              setCodeTab('html')
              setShowCodeEditor(true)
            }}
            title="Editor de código HTML/CSS"
            style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', background:'transparent', border:'1px solid rgba(255,255,255,.1)', color:'#94a3b8', borderRadius:7, cursor:'pointer', fontSize:11, fontWeight:600 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            Código
          </button>

          {/* ✅ Fix Bug #1: Preview guarda primero y abre /preview/:slug */}
          <button onClick={handlePreview}
            style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', background:'transparent', border:'1px solid rgba(255,255,255,.1)', color:'#94a3b8', borderRadius:7, cursor:'pointer', fontSize:11, fontWeight:600 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Vista previa
          </button>

          <button onClick={handleSave} disabled={saving}
            style={{
              display:'flex', alignItems:'center', gap:5, padding:'6px 16px',
              background: saveStatus==='ok' ? '#16a34a' : saveStatus==='err' ? '#dc2626' : '#e11d48',
              border:'none', color:'#fff', borderRadius:7, cursor: saving ? 'not-allowed':'pointer',
              fontSize:12, fontWeight:700, transition:'background .2s', whiteSpace:'nowrap',
            }}>
            {saving ? '⏳ Guardando…'
              : saveStatus==='ok' ? '✓ Guardado'
              : saveStatus==='err' ? '✗ Error'
              : <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                  Guardar
                </>
            }
          </button>
        </div>
      </header>

      {/* ── EDITOR AREA ── */}
      <div style={{ flex:1, position:'relative', minHeight:0, overflow:'hidden' }}>

        {/* ── Pages overlay panel ── */}
        {showPages && (
          <div style={{
            position:'absolute', top:0, left:0, width:280, height:'100%', background:'#111117',
            borderRight:'1px solid rgba(255,255,255,.07)', zIndex:100, display:'flex', flexDirection:'column',
            boxShadow:'4px 0 24px rgba(0,0,0,.4)',
          }}>
            <div style={{ padding:'14px 14px 10px', borderBottom:'1px solid rgba(255,255,255,.05)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ color:'#e2e8f0', fontWeight:700, fontSize:12 }}>Páginas del sitio</span>
              <button onClick={() => setShowPages(false)} style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', display:'flex', padding:4 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Info */}
            <div style={{ padding:'8px 14px', background:'rgba(37,99,235,.08)', borderBottom:'1px solid rgba(255,255,255,.05)', display:'flex', gap:6, alignItems:'flex-start' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" style={{flexShrink:0,marginTop:1}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <p style={{ color:'#64748b', fontSize:10.5, margin:0, lineHeight:1.5 }}>
                <strong style={{color:'#3b82f6'}}>Header</strong> y <strong style={{color:'#3b82f6'}}>Footer</strong> son compartidos en todas las páginas. Solo el contenido central cambia por página.
              </p>
            </div>

            {/* Pages list */}
            <div style={{ flex:1, overflowY:'auto', padding:'8px' }}>
              {pages.map(pg => (
                <div key={pg.id}
                  onClick={() => switchPage(pg)}
                  style={{
                    display:'flex', alignItems:'center', gap:8, padding:'9px 10px', borderRadius:9,
                    cursor:'pointer', marginBottom:2,
                    background: currentPage?.id === pg.id ? 'rgba(225,29,72,.12)' : 'transparent',
                    border:`1px solid ${currentPage?.id === pg.id ? 'rgba(225,29,72,.25)' : 'transparent'}`,
                  }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={currentPage?.id === pg.id ? '#f43f5e' : '#64748b'} strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ color: currentPage?.id === pg.id ? '#f9fafb' : '#e2e8f0', fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {pg.title}
                      {pg.is_home && <span style={{ marginLeft:5, fontSize:9, background:'rgba(225,29,72,.2)', color:'#f43f5e', padding:'1px 5px', borderRadius:4, fontWeight:700 }}>HOME</span>}
                    </div>
                    <div style={{ color:'#475569', fontSize:10, marginTop:1 }}>/{pg.slug}</div>
                  </div>
                  {!pg.is_home && (
                    <button onClick={e => deletePage(pg, e)}
                      style={{ padding:3, background:'none', border:'none', color:'#475569', cursor:'pointer', borderRadius:4, display:'flex', alignItems:'center' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add page */}
            <div style={{ padding:'10px', borderTop:'1px solid rgba(255,255,255,.05)' }}>
              {showNewPage ? (
                <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                  <input autoFocus value={newPageName} onChange={e => setNewPageName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addPage()}
                    placeholder="Nombre de la página…"
                    style={{ padding:'8px 10px', background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.12)', borderRadius:7, color:'#e2e8f0', fontSize:12, outline:'none', fontFamily:'inherit' }} />
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={addPage} style={{ flex:1, padding:'7px', background:'#e11d48', border:'none', color:'#fff', borderRadius:7, cursor:'pointer', fontSize:11, fontWeight:700 }}>Crear</button>
                    <button onClick={() => { setShowNewPage(false); setNewPageName('') }} style={{ padding:'7px 10px', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', color:'#94a3b8', borderRadius:7, cursor:'pointer', fontSize:11 }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowNewPage(true)}
                  style={{ width:'100%', padding:'8px', background:'rgba(255,255,255,.05)', border:'1px dashed rgba(255,255,255,.12)', borderRadius:7, color:'#64748b', cursor:'pointer', fontSize:11, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Nueva página
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Templates overlay panel ───────────────────────────────────── */}
        {showTemplates && (
          <div style={{
            position:'absolute', top:0, left:0, width:300, height:'100%', background:'#111117',
            borderRight:'1px solid rgba(255,255,255,.07)', zIndex:100, display:'flex', flexDirection:'column',
            boxShadow:'4px 0 24px rgba(0,0,0,.4)',
          }}>
            <div style={{ padding:'14px 14px 10px', borderBottom:'1px solid rgba(255,255,255,.05)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ color:'#e2e8f0', fontWeight:700, fontSize:12 }}>Plantillas de página completa</span>
              <button onClick={() => setShowTemplates(false)} style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', display:'flex', padding:4 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <p style={{ color:'#64748b', fontSize:11, margin:'10px 14px 6px', lineHeight:1.5 }}>
              Aplica una plantilla completa con Header, Contenido y Footer prediseñados. <strong style={{color:'#94a3b8'}}>Reemplaza todo el contenido actual.</strong>
            </p>

            <div style={{ flex:1, overflowY:'auto', padding:'0 10px 10px' }}>
              {PAGE_TEMPLATES.map(tpl => (
                <div key={tpl.id} style={{ marginBottom:8 }}>
                  {tplConfirm === tpl.id ? (
                    <div style={{ padding:'10px', background:`${tpl.accent}10`, border:`1px solid ${tpl.accent}33`, borderRadius:10 }}>
                      <p style={{ color:'#e2e8f0', fontSize:11, margin:'0 0 8px' }}>¿Reemplazar el contenido con <strong>{tpl.name}</strong>?</p>
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={() => applyTemplate(tpl)} style={{ flex:1, padding:'7px', background:'#e11d48', border:'none', color:'#fff', borderRadius:7, cursor:'pointer', fontSize:11, fontWeight:700 }}>Aplicar</button>
                        <button onClick={() => setTplConfirm(null)} style={{ padding:'7px 10px', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', color:'#94a3b8', borderRadius:7, cursor:'pointer', fontSize:11 }}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setTplConfirm(tpl.id)}
                      style={{ width:'100%', padding:'12px', textAlign:'left', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', borderRadius:10, cursor:'pointer', display:'flex', alignItems:'center', gap:12 }}
                      onMouseEnter={e => { e.currentTarget.style.background = `${tpl.accent}12`; e.currentTarget.style.borderColor = `${tpl.accent}33` }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.07)' }}>
                      <div style={{ width:40, height:40, borderRadius:10, background:`${tpl.accent}22`, border:`1px solid ${tpl.accent}44`, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <div style={{ width:18, height:3, background:tpl.accent, borderRadius:2, boxShadow:`0 4px 0 ${tpl.accent}66, 0 8px 0 ${tpl.accent}33` }} />
                      </div>
                      <div>
                        <div style={{ color:'#e2e8f0', fontSize:12, fontWeight:700, marginBottom:2 }}>{tpl.name}</div>
                        <div style={{ color:'#64748b', fontSize:10 }}>{tpl.desc}</div>
                      </div>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Header Templates Panel ────────────────────────────────────── */}
        {showHeaderTpl && (
          <ZoneTemplatePanel
            title="Plantillas de Header"
            subtitle="El header se aplica a todas las páginas del sitio."
            accentColor="#2563eb"
            templates={HEADER_TEMPLATES}
            confirm={hdrConfirm}
            onConfirmChange={setHdrConfirm}
            onApply={applyHeaderTemplate}
            onClose={() => setShowHeaderTpl(false)}
          />
        )}

        {/* ── Footer Templates Panel ────────────────────────────────────── */}
        {showFooterTpl && (
          <ZoneTemplatePanel
            title="Plantillas de Footer"
            subtitle="El footer se aplica a todas las páginas del sitio."
            accentColor="#2563eb"
            templates={FOOTER_TEMPLATES}
            confirm={ftrConfirm}
            onConfirmChange={setFtrConfirm}
            onApply={applyFooterTemplate}
            onClose={() => setShowFooterTpl(false)}
          />
        )}

        {/* GrapesJS full editor — takes all available space */}
        <div ref={containerRef} style={{ width:'100%', height:'100%' }} />
      </div>{/* end editor area */}


      {/* Global GrapesJS CSS overrides */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Editor fills its wrapper div completely ── */
        .gjs-editor {
          width: 100% !important;
          height: 100% !important;
          background: #0d0d10 !important;
          font-family: Inter,sans-serif !important;
        }
        .gjs-editor-cont {
          width: 100% !important;
          height: 100% !important;
          position: relative !important;
          overflow: hidden !important;
        }

        /* ── Override GrapesJS CSS vars — everything else auto-adjusts ── */
        .gjs-editor {
          --gjs-left-width: 280px;
          --gjs-canvas-top: 0px;
        }

        /* ── Canvas: explicit sizing + no stacking context so tools float above panels ── */
        .gjs-cv-canvas {
          top: 0 !important;
          width: calc(100% - 280px) !important;
          right: auto !important;
          z-index: auto !important;   /* no stacking context — tools can escape above panels */
          background: #d1d5db !important;
        }

        /* ── Selection toolbar & handles — above everything ── */
        .gjs-cv-canvas #gjs-tools,
        .gjs-cv-canvas .gjs-tools {
          z-index: 9999 !important;
        }

        /* ── Hide native top bars ── */
        .gjs-pn-panel.gjs-pn-commands { display: none !important; }
        .gjs-pn-panel.gjs-pn-options  { display: none !important; }
        .gjs-devices-c { display: none !important; }


        /* ── BOTH panels: IDENTICAL width so they align perfectly ── */
        .gjs-pn-panel.gjs-pn-views,
        .gjs-pn-panel.gjs-pn-views-container {
          right: 0 !important;
          left: auto !important;
          width: 280px !important;
          box-sizing: border-box !important;
        }

        /* ── Tab icon strip (fixed 52px height, on top) ── */
        .gjs-pn-panel.gjs-pn-views {
          background: #0d0d10 !important;
          border-left: 1px solid rgba(255,255,255,.08) !important;
          border-bottom: 1px solid rgba(255,255,255,.08) !important;
          height: 52px !important;
          z-index: 100 !important;
          overflow: hidden !important;
        }
        /* Center the buttons row */
        .gjs-pn-panel.gjs-pn-views .gjs-pn-buttons {
          height: 52px !important;
          padding: 0 12px !important;
          gap: 6px !important;
          justify-content: center !important;
        }

        /* ── Content area (below the 52px strip) ── */
        .gjs-pn-panel.gjs-pn-views-container {
          background: #111117 !important;
          border-left: 1px solid rgba(255,255,255,.08) !important;
          padding-top: 52px !important;
          overflow-y: auto !important;
          top: 0 !important;
          height: 100% !important;
        }

        /* ── Tab buttons ── */
        .gjs-pn-btn {
          color: #475569 !important;
          border-radius: 8px !important;
          margin: 0 !important;
          width: 40px !important;
          height: 40px !important;
          min-width: 40px !important;
          min-height: 40px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-size: 14px !important;
          transition: background .15s, color .15s !important;
          box-shadow: none !important;
        }
        .gjs-pn-btn.gjs-pn-active {
          color: #f43f5e !important;
          background: rgba(225,29,72,.15) !important;
          box-shadow: none !important;
        }
        .gjs-pn-btn:hover:not(.gjs-pn-active) {
          color: #e2e8f0 !important;
          background: rgba(255,255,255,.06) !important;
        }


        /* ── Blocks panel ── */
        .gjs-blocks-c {
          display: grid !important;
          grid-template-columns: repeat(2, 1fr) !important;
          gap: 6px !important;
          padding: 10px !important;
        }
        .gjs-block {
          width: auto !important;
          height: auto !important;
          min-height: 70px !important;
          padding: 10px 6px 8px !important;
          border-radius: 10px !important;
          border: 1px solid rgba(255,255,255,.07) !important;
          background: rgba(255,255,255,.04) !important;
          color: #94a3b8 !important;
          cursor: grab !important;
          transition: all .15s !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          box-sizing: border-box !important;
        }
        .gjs-block:hover {
          background: rgba(225,29,72,.1) !important;
          border-color: rgba(225,29,72,.3) !important;
          color: #f9fafb !important;
          transform: translateY(-1px) !important;
        }
        .gjs-block-category > .gjs-title {
          font-size: 9.5px !important;
          font-weight: 700 !important;
          text-transform: uppercase !important;
          letter-spacing: .08em !important;
          color: #475569 !important;
          padding: 12px 10px 5px !important;
          border-top: 1px solid rgba(255,255,255,.05) !important;
          margin-top: 4px !important;
          cursor: pointer !important;
          background: transparent !important;
        }

        /* ── Selection / hover highlight ── */
        .gjs-selected { outline: 2px solid #e11d48 !important; outline-offset: -2px !important; }
        .gjs-hovered  { outline: 1px dashed rgba(225,29,72,.5) !important; outline-offset: -1px !important; }

        /* ── Floating toolbar (edit/move/delete) ── */
        .gjs-toolbar {
          background: #16161e !important;
          border: 1px solid #2e2e3e !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 20px rgba(0,0,0,.5) !important;
        }
        .gjs-toolbar-item { color: #ccc !important; border-radius: 6px !important; }
        .gjs-toolbar-item:hover { background: rgba(225,29,72,.2) !important; color: #fff !important; }

        /* ── Style manager ── */
        .gjs-sm-sector { border-bottom: 1px solid rgba(255,255,255,.04) !important; }
        .gjs-sm-sector-title {
          background: rgba(255,255,255,.04) !important;
          border-radius: 7px !important;
          padding: 8px 12px !important;
          color: #94a3b8 !important;
          font-size: 11.5px !important;
          font-weight: 700 !important;
          cursor: pointer !important;
          margin-bottom: 2px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
        }
        .gjs-sm-sector-title:hover { background: rgba(225,29,72,.08) !important; color: #fff !important; }
        .gjs-sm-properties { padding: 8px !important; }
        .gjs-sm-property { margin-bottom: 8px !important; }
        .gjs-field {
          background: rgba(255,255,255,.07) !important;
          border: 1px solid rgba(255,255,255,.1) !important;
          border-radius: 6px !important;
          overflow: hidden !important;
        }
        .gjs-field input, .gjs-field select, .gjs-field textarea {
          background: transparent !important;
          color: #ddd !important;
          font-size: 12px !important;
          border: none !important;
          font-family: Inter, sans-serif !important;
        }
        .gjs-sm-label {
          color: #64748b !important;
          font-size: 10.5px !important;
          font-weight: 600 !important;
          text-transform: uppercase !important;
          letter-spacing: .04em !important;
          margin-bottom: 4px !important;
        }
        .gjs-four-color, .gjs-four-color-h:hover { color: #f43f5e !important; }
        .gjs-color-picker-i { background: #111117 !important; }

        /* ── Trait manager (Settings tab) ── */
        .gjs-trt-trait { border-bottom: 1px solid rgba(255,255,255,.04) !important; padding: 8px !important; }
        .gjs-trt-trait__label { color: #64748b !important; font-size: 11px !important; }
        .gjs-input-holder input, .gjs-input-holder select {
          background: rgba(255,255,255,.07) !important;
          border: 1px solid rgba(255,255,255,.1) !important;
          border-radius: 6px !important;
          color: #ddd !important;
          padding: 6px 8px !important;
          font-size: 12px !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }

        /* ── Layer manager ── */
        .gjs-layer { color: #cbd5e1 !important; font-size: 12px !important; }
        .gjs-layer.gjs-selected > .gjs-layer-item { background: rgba(225,29,72,.12) !important; color: #fff !important; }
        .gjs-layer-title { padding: 5px 8px !important; }
        .gjs-layer-count { color: #475569 !important; font-size: 10px !important; }

        /* ── Scrollbars ── */
        .gjs-pn-views-container ::-webkit-scrollbar { width: 4px; }
        .gjs-pn-views-container ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius: 4px; }
        .gjs-pn-views-container ::-webkit-scrollbar-track { background: transparent; }

        /* ── Color picker ── */
        .sp-container { background: #16161e !important; border: 1px solid #2e2e3e !important; border-radius: 10px !important; }
        .sp-input { background: rgba(255,255,255,.07) !important; color: #ddd !important; border: 1px solid rgba(255,255,255,.1) !important; border-radius: 6px !important; }
        .sp-button-container .sp-cancel, .sp-button-container .sp-choose {
          border-radius: 6px !important;
          padding: 6px 12px !important;
          font-family: Inter, sans-serif !important;
          font-size: 11px !important;
        }
      `}</style>

      {/* ── CODE EDITOR MODAL ─────────────────────────────────────────────── */}
      {showCodeEditor && (
        <div style={{
          position:'absolute', inset:0, zIndex:9500,
          background:'rgba(0,0,0,.92)', backdropFilter:'blur(8px)',
          display:'flex', flexDirection:'column',
        }}>
          {/* Header */}
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'10px 18px', background:'#111117',
            borderBottom:'1px solid rgba(255,255,255,.08)', flexShrink:0,
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:16 }}>
              <span style={{ color:'#e2e8f0', fontWeight:700, fontSize:13, display:'flex', alignItems:'center', gap:6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                Editor de Código
              </span>
              {/* Tabs */}
              <div style={{ display:'flex', gap:2, background:'rgba(255,255,255,.05)', borderRadius:8, padding:3 }}>
                {[['html','HTML'],['css','CSS']].map(([tab, label]) => (
                  <button key={tab} onClick={() => setCodeTab(tab)}
                    style={{
                      padding:'5px 16px', borderRadius:6, border:'none', cursor:'pointer', fontSize:11, fontWeight:700,
                      background: codeTab === tab ? '#e11d48' : 'transparent',
                      color: codeTab === tab ? '#fff' : '#64748b',
                      transition:'all .15s',
                    }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => {
                  const ed = editorRef.current
                  if (!ed) return
                  try {
                    ed.setComponents(codeHtml)
                    ed.setStyle(codeCss)
                    setShowCodeEditor(false)
                  } catch(e) {
                    alert('Error en el código HTML/CSS: ' + e.message)
                  }
                }}
                style={{ padding:'7px 18px', background:'#e11d48', border:'none', color:'#fff', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:700 }}>
                ✓ Aplicar cambios
              </button>
              <button onClick={() => setShowCodeEditor(false)}
                style={{ padding:'7px 14px', background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.12)', color:'#94a3b8', borderRadius:8, cursor:'pointer', fontSize:12 }}>
                Cancelar
              </button>
            </div>
          </div>
          {/* Textarea */}
          <textarea
            value={codeTab === 'html' ? codeHtml : codeCss}
            onChange={e => codeTab === 'html' ? setCodeHtml(e.target.value) : setCodeCss(e.target.value)}
            spellCheck={false}
            style={{
              flex:1, background:'#080810', color:'#e2e8f0', border:'none', outline:'none',
              fontFamily:'"Fira Code","Cascadia Code",Consolas,"Courier New",monospace',
              fontSize:13, lineHeight:1.75, padding:24, resize:'none', tabSize:2,
            }}
            placeholder={codeTab === 'html' ? '<!-- HTML de la página -->' : '/* CSS personalizado */'}
          />
          {/* Footer */}
          <div style={{ padding:'8px 18px', background:'#111117', borderTop:'1px solid rgba(255,255,255,.06)', flexShrink:0 }}>
            <p style={{ color:'#475569', fontSize:10.5, margin:0 }}>
              💡 Edita el HTML o CSS directamente y haz clic en <strong style={{color:'#f43f5e'}}>Aplicar cambios</strong> para actualizar el canvas. Luego presiona <strong style={{color:'#94a3b8'}}>Guardar</strong> para persistir.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── ZoneTemplatePanel — Panel reutilizable para Header / Footer ─────────── */
function ZoneTemplatePanel({ title, subtitle, accentColor, templates, confirm, onConfirmChange, onApply, onClose }) {
  return (
    <div style={{
      position:'absolute', top:0, left:0, width:320, height:'100%', background:'#111117',
      borderRight:'1px solid rgba(255,255,255,.07)', zIndex:100, display:'flex', flexDirection:'column',
      boxShadow:'4px 0 24px rgba(0,0,0,.4)',
    }}>
      {/* Header */}
      <div style={{ padding:'14px 14px 10px', borderBottom:'1px solid rgba(255,255,255,.05)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background: accentColor }} />
          <span style={{ color:'#e2e8f0', fontWeight:700, fontSize:12 }}>{title}</span>
        </div>
        <button onClick={onClose} style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', display:'flex', padding:4 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      {/* Subtitle */}
      <div style={{ padding:'8px 14px', background:`${accentColor}0d`, borderBottom:'1px solid rgba(255,255,255,.05)', display:'flex', gap:6, alignItems:'flex-start' }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" style={{flexShrink:0,marginTop:1}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <p style={{ color:'#64748b', fontSize:10.5, margin:0, lineHeight:1.5 }}>
          {subtitle} <strong style={{color:'#94a3b8'}}>No afecta el contenido de la página.</strong>
        </p>
      </div>

      {/* Templates list */}
      <div style={{ flex:1, overflowY:'auto', padding:'10px' }}>
        {templates.map(tpl => (
          <div key={tpl.id} style={{ marginBottom:8 }}>
            {confirm === tpl.id ? (
              <div style={{ padding:'12px', background:`${accentColor}0f`, border:`1px solid ${accentColor}33`, borderRadius:10 }}>
                <p style={{ color:'#e2e8f0', fontSize:11.5, margin:'0 0 10px', lineHeight:1.5 }}>
                  ¿Aplicar plantilla <strong style={{color:'#f9fafb'}}>{tpl.name}</strong>?<br/>
                  <span style={{ color:'#64748b', fontSize:10.5 }}>Se aplicará en todas las páginas del sitio.</span>
                </p>
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={() => onApply(tpl)}
                    style={{ flex:1, padding:'8px', background: accentColor, border:'none', color:'#fff', borderRadius:7, cursor:'pointer', fontSize:11, fontWeight:700 }}>
                    Aplicar
                  </button>
                  <button onClick={() => onConfirmChange(null)}
                    style={{ padding:'8px 12px', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', color:'#94a3b8', borderRadius:7, cursor:'pointer', fontSize:11 }}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => onConfirmChange(tpl.id)}
                style={{ width:'100%', padding:'12px', textAlign:'left', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', borderRadius:10, cursor:'pointer', display:'flex', alignItems:'center', gap:12, transition:'all .15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = `${accentColor}12`; e.currentTarget.style.borderColor = `${accentColor}33` }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.07)' }}>
                {/* Preview icon */}
                <div style={{ width:44, height:44, borderRadius:10, background:`${accentColor}18`, border:`1px solid ${accentColor}30`, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>
                  {tpl.preview}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ color:'#e2e8f0', fontSize:12, fontWeight:700, marginBottom:3 }}>{tpl.name}</div>
                  <div style={{ color:'#64748b', fontSize:10, lineHeight:1.4 }}>{tpl.desc}</div>
                </div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Custom section hint */}
      <div style={{ padding:'10px 14px', borderTop:'1px solid rgba(255,255,255,.05)', background:'rgba(255,255,255,.02)' }}>
        <p style={{ color:'#475569', fontSize:10, margin:0, lineHeight:1.5, textAlign:'center' }}>
          💡 También puedes arrastrar bloques directamente a la zona de <strong style={{color:'#64748b'}}>Header / Footer</strong> en el canvas para personalizarlos.
        </p>
      </div>
    </div>
  )
}

