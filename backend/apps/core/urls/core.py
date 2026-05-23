"""
SYNAPSIX ERP — URLs del Core
Prefijo: /api/v1/core/
"""
from django.urls import path
from apps.core.views import (
    UserListCreateView,
    UserDetailView,
    modules_view,
    active_modules_view,
)

urlpatterns = [
    # Usuarios
    path('users/', UserListCreateView.as_view(), name='user-list'),
    path('users/<uuid:pk>/', UserDetailView.as_view(), name='user-detail'),

    # Módulos (Launchpad)
    path('modules/', modules_view, name='module-list'),
    path('modules/active/', active_modules_view, name='module-active-list'),
]
