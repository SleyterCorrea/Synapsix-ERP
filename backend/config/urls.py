"""
SYNAPSIX ERP — URL Configuration Central
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # Panel de administración Django
    path('admin/', admin.site.urls),

    # ─── API v1 ───────────────────────────────────────────────────────────────
    path('api/v1/', include([
        # Autenticación JWT
        path('auth/', include('apps.core.urls.auth')),

        # Core: usuarios, roles, módulos, empresa
        path('core/', include('apps.core.urls.core')),

        # Inventario: productos, categorías, stock
        path('inventario/', include('apps.inventario.urls')),

        # Módulos de negocio
        path('restaurante/', include('apps.modulo_restaurante.urls')),
        path('facturacion/', include('apps.modulo_facturacion.urls')),
        path('web/', include('apps.modulo_web.urls')),
    ])),
]

# Archivos media — siempre (desarrollo y producción en contenedor)
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Archivos estáticos solo en DEBUG
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

