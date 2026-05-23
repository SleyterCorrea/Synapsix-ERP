# Synapsix ERP 🚀

> Sistema de gestión empresarial modular — Core v0.1.0

[![Python](https://img.shields.io/badge/Python-3.12-blue)](https://python.org)
[![Django](https://img.shields.io/badge/Django-4.2-green)](https://djangoproject.com)
[![React](https://img.shields.io/badge/React-18-61DAFB)](https://reactjs.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED)](https://docker.com)

---

## 🏗️ Arquitectura

```
synapsix-erp/
├── backend/          # Python + Django + DRF + JWT
│   └── apps/
│       ├── core/           ✅ Autenticación, RBAC, Módulos
│       ├── inventario/     ✅ Catálogo maestro de productos
│       ├── modulo_facturacion/  🔜 Placeholder
│       ├── modulo_restaurante/  🔜 Placeholder
│       └── modulo_web/          🔜 Placeholder
├── frontend/         # React 18 + Vite + Tailwind CSS
│   └── src/
│       ├── api/           # Axios + interceptores JWT
│       ├── hooks/         # useAuth, useModules, useSpotlight
│       ├── pages/         # LoginPage, LaunchpadPage
│       └── store/         # Zustand (auth state)
└── docker-compose.yml   # 3 servicios: db, backend, frontend
```

## 🚀 Inicio Rápido

### Prerrequisitos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y corriendo

### 1. Clonar y configurar
```bash
git clone https://github.com/tu-org/synapsix-erp.git
cd synapsix-erp

# Copiar y configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores (especialmente DB_PASSWORD y DJANGO_SECRET_KEY)
```

### 2. Levantar el sistema
```bash
docker-compose up --build
```

Al arrancar, automáticamente:
- ✅ Crea la base de datos PostgreSQL
- ✅ Ejecuta las migraciones de Django
- ✅ Crea el superusuario inicial (admin@synapsix.com / Admin1234!)
- ✅ Carga el catálogo de módulos
- ✅ Levanta el servidor de desarrollo

### 3. Acceder al sistema
| Servicio | URL |
|---|---|
| Frontend (Synapsix ERP) | http://localhost:5173 |
| Backend API | http://localhost:8000/api/v1/ |
| Django Admin | http://localhost:8000/admin/ |
| PostgreSQL | localhost:5432 |

**Credenciales por defecto:**
```
Email:    admin@synapsix.com
Password: Admin1234!
```

---

## 📋 API Endpoints

### Autenticación
| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/api/v1/auth/login/` | Login → Access + Refresh tokens |
| POST | `/api/v1/auth/refresh/` | Renovar access token |
| POST | `/api/v1/auth/logout/` | Invalidar refresh token |
| GET | `/api/v1/auth/me/` | Datos del usuario actual |

### Core
| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/v1/core/modules/` | Todos los módulos (Launchpad) |
| GET | `/api/v1/core/modules/active/` | Solo módulos activos |
| GET | `/api/v1/core/users/` | Lista de usuarios |

### Inventario
| Método | Endpoint | Descripción |
|---|---|---|
| GET/POST | `/api/v1/inventario/products/` | Catálogo de productos |
| GET/POST | `/api/v1/inventario/categories/` | Categorías |
| GET/POST | `/api/v1/inventario/stock-movements/` | Movimientos de stock |

---

## 🌿 Política de Ramas Git

```
main          ← Producción estable (protegida, solo PR)
  └── develop ← Integración de features
        └── feature/<nombre>  ← Desarrollo de módulos
        └── hotfix/<nombre>   ← Correcciones críticas
```

---

## 🔧 Comandos Útiles

```bash
# Migraciones
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate

# Shell de Django
docker-compose exec backend python manage.py shell

# Logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Reiniciar un servicio
docker-compose restart backend
```

---

## 🗺️ Roadmap

- [x] **v0.1.0** — Core (Auth JWT, RBAC, Launchpad, Inventario base)
- [ ] **v0.2.0** — Módulo Facturación
- [ ] **v0.3.0** — Módulo Restaurante (mesas, comandas, KDS)
- [ ] **v0.4.0** — Módulo Tienda Web (E-commerce)
- [ ] **v1.0.0** — Sistema completo + Multi-tenant

---

*Synapsix ERP — Construido con ❤️ para negocios que escalan.*
