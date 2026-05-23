"""
SYNAPSIX ERP — Core Views
Autenticación JWT + Perfil de usuario + Módulos del Launchpad
"""
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .models import User, Module
from .serializers import (
    CustomTokenObtainPairSerializer,
    UserSerializer,
    UserCreateSerializer,
    ModuleSerializer,
)


# ─────────────────────────────────────────────────────────────────────────────
# AUTENTICACIÓN JWT
# ─────────────────────────────────────────────────────────────────────────────

class LoginView(TokenObtainPairView):
    """
    POST /api/v1/auth/login/
    Retorna access + refresh tokens con datos del usuario embebidos.
    """
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]


class RefreshView(TokenRefreshView):
    """
    POST /api/v1/auth/refresh/
    Renueva el access token usando el refresh token.
    """
    permission_classes = [permissions.AllowAny]


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def logout_view(request):
    """
    POST /api/v1/auth/logout/
    Invalida el refresh token (blacklist) para cerrar sesión de forma segura.
    """
    try:
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response(
                {'error': 'Se requiere el refresh token.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        token = RefreshToken(refresh_token)
        token.blacklist()
        return Response({'message': 'Sesión cerrada exitosamente.'}, status=status.HTTP_200_OK)
    except TokenError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────────────────────────────────────────
# PERFIL DE USUARIO
# ─────────────────────────────────────────────────────────────────────────────

@api_view(['GET', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def me_view(request):
    """
    GET  /api/v1/auth/me/ → Datos completos del usuario autenticado
    PATCH /api/v1/auth/me/ → Actualiza perfil (nombre, avatar)
    """
    if request.method == 'GET':
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    elif request.method == 'PATCH':
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────────────────────────────────────────
# USUARIOS (Admin)
# ─────────────────────────────────────────────────────────────────────────────

class UserListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/core/users/ → Lista usuarios de la empresa
    POST /api/v1/core/users/ → Crea un nuevo usuario
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        return UserSerializer

    def get_queryset(self):
        user = self.request.user
        # Admin ve todos los usuarios de su empresa
        if user.role and user.role.can_manage_users:
            return User.objects.filter(company=user.company).select_related('role', 'company')
        # Otros solo se ven a sí mismos
        return User.objects.filter(id=user.id)


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/v1/core/users/<id>/ → Detalle de usuario
    PUT    /api/v1/core/users/<id>/ → Actualizar usuario
    DELETE /api/v1/core/users/<id>/ → Desactivar usuario
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return User.objects.filter(company=self.request.user.company)

    def destroy(self, request, *args, **kwargs):
        # Soft delete: desactivar en lugar de eliminar
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        return Response({'message': 'Usuario desactivado.'}, status=status.HTTP_200_OK)


# ─────────────────────────────────────────────────────────────────────────────
# MÓDULOS — API DEL LAUNCHPAD
# ─────────────────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def modules_view(request):
    """
    GET /api/v1/core/modules/
    Retorna todos los módulos del sistema (activos e inactivos).
    El frontend dibuja el Launchpad dinámicamente con esta respuesta.
    Los módulos inactivos se muestran como 'Próximamente'.
    """
    modules = Module.objects.all().order_by('order', 'name')
    serializer = ModuleSerializer(modules, many=True)
    return Response({
        'count': modules.count(),
        'results': serializer.data
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def active_modules_view(request):
    """
    GET /api/v1/core/modules/active/
    Solo módulos activos (para navegación y permisos).
    """
    modules = Module.objects.filter(is_active=True).order_by('order')
    serializer = ModuleSerializer(modules, many=True)
    return Response(serializer.data)
