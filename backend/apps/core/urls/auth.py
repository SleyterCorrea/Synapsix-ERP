"""
SYNAPSIX ERP — URLs de Autenticación
Prefijo: /api/v1/auth/
"""
from django.urls import path
from apps.core.views import LoginView, RefreshView, logout_view, me_view, change_password_view

urlpatterns = [
    path('login/',           LoginView.as_view(),    name='auth-login'),
    path('refresh/',         RefreshView.as_view(),  name='auth-refresh'),
    path('logout/',          logout_view,            name='auth-logout'),
    path('me/',              me_view,                name='auth-me'),
    path('change-password/', change_password_view,   name='auth-change-password'),
]
