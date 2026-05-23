"""
SYNAPSIX ERP — Core Views (Calendario, Tareas, Hoja de Horas)
"""
from datetime import date
from rest_framework import generics, status, permissions, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .models import User, Module, Role, Event, Task, TimeEntry
from .serializers import (
    CustomTokenObtainPairSerializer, UserSerializer, UserCreateSerializer,
    ModuleSerializer, RoleSerializer, EventSerializer, TaskSerializer, TimeEntrySerializer,
)


# ─────────────────────────────────────────────────────────────────────────────
# AUTENTICACIÓN JWT
# ─────────────────────────────────────────────────────────────────────────────

class LoginView(TokenObtainPairView):
    """POST /api/v1/auth/login/"""
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]


class RefreshView(TokenRefreshView):
    """POST /api/v1/auth/refresh/"""
    permission_classes = [permissions.AllowAny]


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def logout_view(request):
    """POST /api/v1/auth/logout/"""
    try:
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({'error': 'Se requiere el refresh token.'}, status=status.HTTP_400_BAD_REQUEST)
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
    """GET|PATCH /api/v1/auth/me/"""
    if request.method == 'GET':
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
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
        # Superusuario, staff o admin con permiso → ve todos
        if user.is_superuser or user.is_staff or (user.role and user.role.can_manage_users):
            return User.objects.filter(company=user.company).select_related('role', 'company').order_by('first_name')
        return User.objects.filter(id=user.id)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/v1/core/users/<id>/
    PATCH  /api/v1/core/users/<id>/
    DELETE /api/v1/core/users/<id>/ → soft delete (desactivar)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserCreateSerializer
        return UserSerializer

    def get_queryset(self):
        return User.objects.filter(company=self.request.user.company).select_related('role', 'company')

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        return Response({'message': 'Usuario desactivado.'}, status=status.HTTP_200_OK)


# ─────────────────────────────────────────────────────────────────────────────
# ROLES
# ─────────────────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def roles_view(request):
    """GET /api/v1/core/roles/"""
    roles = Role.objects.filter(company=request.user.company)
    serializer = RoleSerializer(roles, many=True)
    return Response(serializer.data)


# ─────────────────────────────────────────────────────────────────────────────
# MÓDULOS — LAUNCHPAD
# ─────────────────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def modules_view(request):
    """GET /api/v1/core/modules/ → Todos los módulos"""
    modules = Module.objects.all().order_by('order', 'name')
    serializer = ModuleSerializer(modules, many=True)
    return Response({'count': modules.count(), 'results': serializer.data})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def active_modules_view(request):
    """GET /api/v1/core/modules/active/ → Solo módulos activos"""
    modules = Module.objects.filter(is_active=True).order_by('order')
    serializer = ModuleSerializer(modules, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def toggle_module_view(request, slug):
    """POST /api/v1/core/modules/<slug>/toggle/ → Activa/desactiva módulo"""
    try:
        module = Module.objects.get(slug=slug)
        module.is_active = not module.is_active
        module.save()
        return Response({
            'slug': module.slug,
            'is_active': module.is_active,
            'message': f'Módulo {module.name} {"activado" if module.is_active else "desactivado"}.'
        })
    except Module.DoesNotExist:
        return Response({'error': 'Módulo no encontrado.'}, status=status.HTTP_404_NOT_FOUND)


# ─────────────────────────────────────────────────────────────────────────────
# CALENDARIO — Eventos
# ─────────────────────────────────────────────────────────────────────────────

class EventListCreateView(generics.ListCreateAPIView):
    """GET|POST /api/v1/core/events/"""
    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Event.objects.filter(company=self.request.user.company)
        # Filtrar por mes/año si se pasan como query params
        year  = self.request.query_params.get('year')
        month = self.request.query_params.get('month')
        if year and month:
            qs = qs.filter(start_datetime__year=year, start_datetime__month=month)
        return qs.order_by('start_datetime')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, company=self.request.user.company)


class EventDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET|PATCH|DELETE /api/v1/core/events/<id>/"""
    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Event.objects.filter(company=self.request.user.company)


# ─────────────────────────────────────────────────────────────────────────────
# TAREAS — Kanban
# ─────────────────────────────────────────────────────────────────────────────

class TaskListCreateView(generics.ListCreateAPIView):
    """GET|POST /api/v1/core/tasks/"""
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Task.objects.filter(company=self.request.user.company)
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        assigned = self.request.query_params.get('mine')
        if assigned == 'true':
            qs = qs.filter(assigned_to=self.request.user)
        return qs.select_related('assigned_to', 'created_by').order_by('order', '-created_at')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, company=self.request.user.company)


class TaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET|PATCH|DELETE /api/v1/core/tasks/<id>/"""
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Task.objects.filter(company=self.request.user.company)

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)


# ─────────────────────────────────────────────────────────────────────────────
# HOJA DE HORAS
# ─────────────────────────────────────────────────────────────────────────────

class TimeEntryListCreateView(generics.ListCreateAPIView):
    """GET|POST /api/v1/core/timesheets/"""
    serializer_class = TimeEntrySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = TimeEntry.objects.filter(company=self.request.user.company)
        # Sólo las del usuario actual por defecto
        mine = self.request.query_params.get('mine', 'true')
        if mine == 'true':
            qs = qs.filter(user=self.request.user)
        # Filtrar por semana
        week_start = self.request.query_params.get('week_start')
        week_end   = self.request.query_params.get('week_end')
        if week_start:
            qs = qs.filter(date__gte=week_start)
        if week_end:
            qs = qs.filter(date__lte=week_end)
        return qs.select_related('user', 'task').order_by('date')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user, company=self.request.user.company)


class TimeEntryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET|PATCH|DELETE /api/v1/core/timesheets/<id>/"""
    serializer_class = TimeEntrySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return TimeEntry.objects.filter(user=self.request.user)

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)


# ─────────────────────────────────────────────────────────────────────────────
# DASHBOARD — Datos agregados en una sola llamada
# ─────────────────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def dashboard_view(request):
    """GET /api/v1/core/dashboard/ — Métricas agregadas para el Home."""
    from datetime import date, timedelta
    from django.db.models import Sum, Q

    user    = request.user
    company = user.company
    today   = date.today()
    week_start = today - timedelta(days=today.weekday())
    week_end   = week_start + timedelta(days=6)

    # ── Tareas ──────────────────────────────────────────────────────────────
    all_tasks = Task.objects.filter(company=company)
    task_stats = {
        'todo':        all_tasks.filter(status='todo').count(),
        'in_progress': all_tasks.filter(status='in_progress').count(),
        'done':        all_tasks.filter(status='done').count(),
        'total':       all_tasks.count(),
    }
    my_tasks = (
        all_tasks
        .filter(Q(assigned_to=user) | Q(created_by=user))
        .filter(status__in=['todo', 'in_progress'])
        .order_by('order', '-created_at')[:6]
    )

    # ── Eventos ─────────────────────────────────────────────────────────────
    today_events = Event.objects.filter(
        company=company, start_datetime__date=today
    ).order_by('start_datetime')[:5]

    upcoming_events = Event.objects.filter(
        company=company,
        start_datetime__date__gt=today,
        start_datetime__date__lte=today + timedelta(days=7)
    ).order_by('start_datetime')[:5]

    # ── Horas ───────────────────────────────────────────────────────────────
    week_qs = TimeEntry.objects.filter(
        user=user, date__gte=week_start, date__lte=week_end
    )
    week_hours = week_qs.aggregate(total=Sum('hours'))['total'] or 0

    hours_by_day = list(
        week_qs.values('date').annotate(hours=Sum('hours')).order_by('date')
    )

    # ── Usuarios conectados (placeholder) ───────────────────────────────────
    team_count = user.company.users.filter(is_active=True).count() if company else 1

    return Response({
        'task_stats':      task_stats,
        'my_tasks':        TaskSerializer(my_tasks, many=True).data,
        'today_events':    EventSerializer(today_events, many=True).data,
        'upcoming_events': EventSerializer(upcoming_events, many=True).data,
        'week_hours':      float(week_hours),
        'hours_by_day':    [{'date': str(h['date']), 'hours': float(h['hours'])} for h in hours_by_day],
        'team_count':      team_count,
        'today':           str(today),
        'week_start':      str(week_start),
        'week_end':        str(week_end),
    })
