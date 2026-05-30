# 🧠 SYNAPSIX ERP — Documento de Contexto del Sistema

> **Para el asistente de IA (Antigravity / Gemini):**
> Lee este archivo antes de continuar trabajando en el proyecto.
> Contiene el estado actual del sistema, las decisiones técnicas tomadas y el roadmap.

---

## 📌 ¿Qué es Synapsix ERP?

Synapsix ERP es un **sistema de gestión empresarial modular** (ERP) diseñado para pequeñas y medianas empresas que quieren escalar. El sistema se compone de módulos de negocio independientes que se pueden activar/desactivar según las necesidades del cliente.

**Dueño del proyecto:** Sleyter Correa  
**Repositorio:** https://github.com/SleyterCorrea/Synapsix-ERP.git  
**Estado actual:** v0.1.x — Core funcional + Módulos en desarrollo

---

## 🏗️ Arquitectura del Sistema

```
synapsix-erp/
├── backend/                     # Python 3.12 + Django 4.2 + DRF + JWT
│   └── apps/
│       ├── core/               ✅ Autenticación JWT, RBAC, Módulos, Empresas
│       ├── inventario/         ✅ Catálogo maestro de productos, stock
│       ├── modulo_web/         ✅ Constructor de sitios web (Web Builder)
│       ├── modulo_restaurante/ 🔜 Mesas, comandas, cocina (KDS)
│       └── modulo_facturacion/ 🔜 Facturas, clientes, pagos
├── frontend/                    # React 18 + Vite + Tailwind CSS
│   └── src/
│       ├── api/               # Axios con interceptores JWT automáticos
│       ├── hooks/             # useAuth, useModules, useSpotlight
│       ├── pages/             # Todas las páginas de la SPA
│       │   ├── LoginPage.jsx
│       │   ├── LaunchpadPage.jsx
│       │   ├── DashboardPage.jsx
│       │   ├── ProfilePage.jsx
│       │   ├── settings/      # SettingsPage, UserDetailPage
│       │   ├── modules/       # Módulos de negocio
│       │   │   ├── InventoryPage.jsx
│       │   │   ├── RestaurantePage.jsx
│       │   │   ├── CocinaPage.jsx
│       │   │   ├── CalendarPage.jsx
│       │   │   ├── TasksPage.jsx
│       │   │   ├── TimesheetPage.jsx
│       │   │   └── WebBuilderPage.jsx  ← Constructor web drag & drop
│       │   └── web/           # PublicWebsite.jsx (sitio público del cliente)
│       └── store/             # Zustand (auth state)
└── docker-compose.yml          # 3 servicios: db (PostgreSQL), backend, frontend
```

---

## 🔐 Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | Python 3.12, Django 4.2, Django REST Framework 3.15 |
| Autenticación | JWT (djangorestframework-simplejwt), tokens access + refresh |
| Base de Datos | PostgreSQL (via psycopg2) |
| Tiempo Real | Django Channels 4.1, channels-redis, Daphne 4.1 |
| IA / Gemini | google-generativeai 0.7.2 |
| Frontend | React 18, Vite, Tailwind CSS, Zustand |
| Web Builder | GrapesJS (drag & drop) con carga lazy |
| Contenedores | Docker Compose (3 servicios) |
| Producción | Gunicorn + WhiteNoise |

---

## 🌐 API Endpoints Actuales

### Autenticación (`/api/v1/auth/`)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/v1/auth/login/` | Login → Access + Refresh tokens |
| POST | `/api/v1/auth/refresh/` | Renovar access token |
| POST | `/api/v1/auth/logout/` | Invalidar refresh token |
| GET | `/api/v1/auth/me/` | Datos del usuario actual |

### Core (`/api/v1/core/`)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/core/modules/` | Todos los módulos (Launchpad) |
| GET | `/api/v1/core/modules/active/` | Solo módulos activos |
| GET | `/api/v1/core/users/` | Lista de usuarios |

### Inventario (`/api/v1/inventario/`)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET/POST | `/api/v1/inventario/products/` | Catálogo de productos |
| GET/POST | `/api/v1/inventario/categories/` | Categorías |
| GET/POST | `/api/v1/inventario/stock-movements/` | Movimientos de stock |

### Módulo Web (`/api/v1/web/`)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/web/siteconfig/` | Configuración del sitio (header/footer) |
| PATCH | `/api/v1/web/siteconfig/update/` | Actualizar header/footer/global_css |
| GET/POST/PUT/DELETE | `/api/v1/web/pages/` | CRUD de páginas del sitio web |
| GET | `/api/v1/web/public/<slug>/` | Renderizar página pública |
| GET | `/api/v1/web/public/pages/` | Listar páginas publicadas |
| POST | `/api/v1/web/contact/` | Formulario de contacto público |

### Módulo Restaurante (`/api/v1/restaurante/`)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| (en desarrollo) | — | Mesas, comandas, KDS |

---

## 📦 Modelos de Base de Datos

### apps.core
- `Company` — Empresa/tenant (multitenancy)
- `User` — Usuario con FK a Company, roles
- `Module` — Módulos del sistema (catálogo)
- `UserModulePermission` — Permisos por usuario/módulo

### apps.inventario
- `Category` — Categorías de productos
- `Product` — Productos (nombre, precio, stock, imagen)
- `StockMovement` — Entradas/salidas de stock

### apps.modulo_web
- `WebSiteConfig` — Configuración global del sitio (header/footer/css compartido)
  - `company` (FK) — empresa propietaria
  - `header_html`, `header_css`, `header_components` (JSON)
  - `footer_html`, `footer_css`, `footer_components` (JSON)
  - `global_css`
- `WebPage` — Página individual del sitio
  - `company` (FK), `title`, `slug`
  - `html_content`, `css_content`, `components_json`, `styles_json`
  - `is_published`, `is_home`, `order`
- `WebContact` — Mensajes de formulario de contacto

### apps.modulo_restaurante (en desarrollo)
- Mesas, comandas, items de comanda, categorías de menú

---

## 🖥️ Rutas del Frontend (React Router)

| Ruta | Componente | Acceso |
|------|-----------|--------|
| `/` | `PublicWebsite` | Público (sitio web del cliente) |
| `/preview/:slug` | `PublicWebsite` | Público (preview de página) |
| `/login` | `LoginPage` | Público |
| `/launchpad` | `LaunchpadPage` | Autenticado |
| `/dashboard` | `DashboardPage` | Autenticado |
| `/perfil` | `ProfilePage` | Autenticado |
| `/settings` | `SettingsPage` | Autenticado |
| `/settings/users/:id` | `UserDetailPage` | Autenticado |
| `/inventario` | `InventoryPage` | Autenticado |
| `/restaurante` | `RestaurantePage` | Autenticado |
| `/restaurante/cocina` | `CocinaPage` | Autenticado |
| `/calendario` | `CalendarPage` | Autenticado |
| `/tareas` | `TasksPage` | Autenticado |
| `/hoja-horas` | `TimesheetPage` | Autenticado |
| `/sitio-web` | `WebBuilderPage` (lazy) | Autenticado |

---

## 🌿 Política de Ramas Git

```
main          ← Producción estable (solo PR aprobados)
  └── Sleyter ← Rama de desarrollo principal de Sleyter Correa
  └── develop ← Integración de features (rama alternativa)
        └── feature/<nombre>  ← Features específicos
        └── hotfix/<nombre>   ← Correcciones críticas
```

**Flujo de trabajo:**
1. Se trabaja en la rama `Sleyter`
2. Cuando el trabajo está listo, se hace merge a `main`

---

## 🚀 Acceso al Sistema (Desarrollo Local)

### Prerrequisitos
- Docker Desktop instalado y corriendo

### Levantar el sistema
```bash
docker-compose up --build
```

### URLs de acceso
| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000/api/v1/ |
| Django Admin | http://localhost:8000/admin/ |
| PostgreSQL | localhost:5432 |

### Credenciales por defecto
```
Email:    admin@synapsix.com
Password: Admin1234!
```

---

## 🗺️ Roadmap

| Versión | Estado | Descripción |
|---------|--------|-------------|
| v0.1.0 | ✅ Completo | Core (Auth JWT, RBAC, Launchpad, Inventario base) |
| v0.1.x | ✅ Completo | Módulo Web Builder (GrapesJS drag & drop, páginas públicas) |
| v0.2.0 | 🔜 Próximo | Módulo Facturación (clientes, facturas, pagos) |
| v0.3.0 | 🔜 Futuro | Módulo Restaurante (mesas, comandas, KDS) |
| v0.4.0 | 🔜 Futuro | Módulo Tienda Web (E-commerce completo) |
| v1.0.0 | 🔜 Futuro | Sistema completo + Multi-tenant real |

---

## 🔧 Comandos Útiles

```bash
# Migraciones
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate

# Shell de Django
docker-compose exec backend python manage.py shell

# Logs en tiempo real
docker-compose logs -f backend
docker-compose logs -f frontend

# Reiniciar un servicio
docker-compose restart backend
docker-compose restart frontend

# Reconstruir imágenes
docker-compose up --build
```

---

## 💡 Notas Importantes para el Asistente

1. **Web Builder**: El módulo más complejo actualmente. `WebBuilderPage.jsx` usa GrapesJS con carga lazy. El backend tiene `WebSiteConfig` para header/footer compartidos y `WebPage` para páginas individuales.

2. **Multi-tenancy**: Cada `User` tiene una FK a `Company`. Las consultas deben filtrar siempre por `company` del usuario autenticado.

3. **JWT**: El frontend usa Axios con interceptores que inyectan automáticamente el `Authorization: Bearer <token>` y renuevan el token si expira.

4. **Docker**: Todo corre en contenedores. Los 3 servicios son: `db` (PostgreSQL), `backend` (Django+Daphne), `frontend` (Vite dev server).

5. **Canales WebSocket**: El sistema tiene Django Channels configurado para tiempo real (Daphne como servidor ASGI). Pendiente de implementar funcionalidades en tiempo real.

6. **Google Gemini AI**: La dependencia `google-generativeai` está instalada. La integración de IA está planificada para módulos futuros.

7. **Diseño**: El frontend usa **Tailwind CSS** para estilos. Las páginas siguen un patrón oscuro (dark mode) consistente en toda la app.

---

*Synapsix ERP — Construido con ❤️ por Sleyter Correa*
*Última actualización del contexto: Mayo 2026*
