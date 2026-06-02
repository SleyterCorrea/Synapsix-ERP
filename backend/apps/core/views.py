"""
SYNAPSIX ERP — Core Views v2 (completo)
Empresa, Roles CRUD, Usuarios, IA Chat, Notificaciones, Dashboard.
"""
from datetime import date, timedelta
from rest_framework import generics, status, permissions, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.db import models
from django.db.models import Sum, Q

from .models import User, Company, Module, Role, Event, Task, TimeEntry
from .serializers import (
    CustomTokenObtainPairSerializer,
    UserSerializer, UserCreateSerializer,
    CompanySerializer, RoleSerializer, RoleCreateSerializer,
    ModuleSerializer, EventSerializer, TaskSerializer, TimeEntrySerializer,
)


# ─── AUTH ─────────────────────────────────────────────────────────────────────
class LoginView(TokenObtainPairView):
    serializer_class  = CustomTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]

class RefreshView(TokenRefreshView):
    permission_classes = [permissions.AllowAny]

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def logout_view(request):
    try:
        token = RefreshToken(request.data.get('refresh'))
        token.blacklist()
        return Response({'message': 'Sesión cerrada.'})
    except TokenError as e:
        return Response({'error': str(e)}, status=400)


# ─── PERFIL ───────────────────────────────────────────────────────────────────
@api_view(['GET', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def me_view(request):
    if request.method == 'GET':
        return Response(UserSerializer(request.user, context={'request': request}).data)
    serializer = UserCreateSerializer(request.user, data=request.data, partial=True, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response(UserSerializer(request.user, context={'request': request}).data)
    return Response(serializer.errors, status=400)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def change_password_view(request):
    """POST /api/v1/auth/change-password/"""
    user = request.user
    old_pwd = request.data.get('old_password', '')
    new_pwd = request.data.get('new_password', '')
    confirm = request.data.get('confirm_password', '')
    if not user.check_password(old_pwd):
        return Response({'old_password': 'Contraseña actual incorrecta.'}, status=400)
    if len(new_pwd) < 8:
        return Response({'new_password': 'Mínimo 8 caracteres.'}, status=400)
    if new_pwd != confirm:
        return Response({'confirm_password': 'No coinciden.'}, status=400)
    user.set_password(new_pwd)
    user.save()
    return Response({'message': 'Contraseña actualizada.'})


# ─── EMPRESA ──────────────────────────────────────────────────────────────────
@api_view(['GET', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def company_view(request):
    """GET|PATCH /api/v1/core/company/"""
    company = request.user.company
    if not company:
        return Response({'detail': 'Sin empresa asignada.'}, status=404)
    if request.method == 'GET':
        return Response(CompanySerializer(company, context={'request': request}).data)
    # Solo admin puede editar
    if not (request.user.is_superuser or request.user.is_staff or
            (request.user.role and request.user.role.can_access_admin)):
        return Response({'detail': 'Sin permiso.'}, status=403)
    serializer = CompanySerializer(company, data=request.data, partial=True, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


# ─── ROLES ────────────────────────────────────────────────────────────────────
@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def roles_view(request):
    """GET /api/v1/core/roles/  — lista todos los roles del sistema
       POST — crear rol (solo admin)"""
    if request.method == 'GET':
        roles = Role.objects.all().prefetch_related('users')
        return Response(RoleSerializer(roles, many=True).data)
    # POST
    if not (request.user.is_superuser or request.user.is_staff or
            (request.user.role and request.user.role.can_manage_users)):
        return Response({'detail': 'Sin permiso.'}, status=403)
    serializer = RoleCreateSerializer(data=request.data)
    if serializer.is_valid():
        role = serializer.save()
        return Response(RoleSerializer(role).data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([permissions.IsAuthenticated])
def role_detail_view(request, pk):
    """GET|PATCH|DELETE /api/v1/core/roles/<pk>/"""
    try:
        role = Role.objects.get(pk=pk)
    except Role.DoesNotExist:
        return Response({'detail': 'Rol no encontrado.'}, status=404)

    if request.method == 'GET':
        return Response(RoleSerializer(role).data)

    if not (request.user.is_superuser or request.user.is_staff or
            (request.user.role and request.user.role.can_manage_users)):
        return Response({'detail': 'Sin permiso.'}, status=403)

    if request.method == 'PATCH':
        serializer = RoleSerializer(role, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    if request.method == 'DELETE':
        if role.users.exists():
            return Response({'detail': f'No se puede eliminar: {role.users.count()} usuario(s) asignado(s).'}, status=400)
        role.delete()
        return Response({'message': 'Rol eliminado.'})


# ─── USUARIOS ─────────────────────────────────────────────────────────────────
class UserListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    filter_backends    = [filters.SearchFilter, filters.OrderingFilter]
    search_fields      = ['first_name', 'last_name', 'email']
    ordering_fields    = ['first_name', 'email', 'date_joined']
    ordering           = ['first_name']

    def get_serializer_class(self):
        return UserCreateSerializer if self.request.method == 'POST' else UserSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.is_staff or (user.role and user.role.can_manage_users):
            qs = User.objects.filter(company=user.company).select_related('role', 'company')
        else:
            qs = User.objects.filter(id=user.id)
        # Filtros opcionales
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == 'true')
        role_id = self.request.query_params.get('role')
        if role_id:
            qs = qs.filter(role_id=role_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)

    def get_serializer_context(self):
        return {'request': self.request}


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        return UserCreateSerializer if self.request.method in ['PUT', 'PATCH'] else UserSerializer

    def get_queryset(self):
        return User.objects.filter(company=self.request.user.company).select_related('role', 'company')

    def get_serializer_context(self):
        return {'request': self.request}

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance == request.user:
            return Response({'detail': 'No puedes desactivarte a ti mismo.'}, status=400)
        instance.is_active = False
        instance.save()
        return Response({'message': 'Usuario desactivado.'})


# ─── MÓDULOS ──────────────────────────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def modules_view(request):
    # Módulos globales (company=None)
    modules = Module.objects.filter(company=None).order_by('order', 'name')
    return Response({'count': modules.count(), 'results': ModuleSerializer(modules, many=True).data})

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def active_modules_view(request):
    modules = Module.objects.filter(company=None, is_active=True).order_by('order')
    return Response(ModuleSerializer(modules, many=True).data)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def toggle_module_view(request, slug):
    try:
        module = Module.objects.get(company=None, slug=slug)
        module.is_active = not module.is_active
        module.save()
        return Response({'slug': module.slug, 'is_active': module.is_active})
    except Module.DoesNotExist:
        return Response({'error': 'Módulo no encontrado.'}, status=404)


# ─── IA CHAT — Sistema Experto + HuggingFace (sin cuotas de Gemini) ──────────
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def ai_chat_view(request):
    """
    POST /api/v1/core/ai/chat/
    1. Sistema Experto: responde con datos reales de la BD para preguntas ERP comunes.
    2. HuggingFace Inference API (gratuita) como fallback para preguntas generales.
    """
    import os, json, re, requests as http_requests

    user    = request.user
    company = getattr(user, 'company', None)
    message = request.data.get('message', '').strip()

    if not message:
        return Response({'error': 'Mensaje vacío.'}, status=400)

    msg_lower = message.lower()

    # ── SISTEMA EXPERTO: respuestas directas desde la BD ─────────────────────
    # Responde sin llamar a ninguna API externa cuando reconoce la intención.

    def expert_response(text, action=None):
        return Response({'reply': text, 'action': action})

    # → Mesas (restaurante)
    if any(w in msg_lower for w in ['mesa', 'mesas', 'salon', 'salón', 'comanda', 'ocupada', 'libre']):
        try:
            from apps.modulo_restaurante.models import Mesa
            libres   = Mesa.objects.filter(company=company, estado='libre',   is_active=True)
            ocupadas = Mesa.objects.filter(company=company, estado='ocupada', is_active=True)
            total    = Mesa.objects.filter(company=company, is_active=True).count()

            ocupadas_list = ', '.join([f'Mesa {m.nombre}' for m in ocupadas[:8]])
            reply = (
                f"📊 **Estado del salón ahora mismo:**\n"
                f"• 🟢 Mesas libres: {libres.count()} de {total}\n"
                f"• 🔴 Mesas ocupadas: {ocupadas.count()} de {total}\n"
            )
            if ocupadas_list:
                reply += f"• Ocupadas: {ocupadas_list}\n"
            reply += "\n¿Quieres que te lleve al módulo de Restaurante?"
            return expert_response(reply, {'type': 'navigate', 'path': '/restaurante'})
        except Exception:
            pass

    # → Inventario / stock
    if any(w in msg_lower for w in ['inventario', 'stock', 'producto', 'productos', 'existencia', 'agotado']):
        try:
            from apps.inventario.models import Product
            from django.db import models as dj_models
            total     = Product.objects.filter(company=company).count()
            bajo_stock = Product.objects.filter(
                company=company, track_stock=True,
                stock_quantity__lte=dj_models.F('min_stock')
            ).count()
            sin_stock = Product.objects.filter(company=company, track_stock=True, stock_quantity=0).count()

            reply = (
                f"📦 **Resumen de inventario:**\n"
                f"• Total de productos: {total}\n"
                f"• Productos con stock bajo: {bajo_stock}\n"
                f"• Productos sin stock: {sin_stock}\n"
            )
            if bajo_stock > 0:
                reply += "\n⚠️ Hay productos que necesitan reabastecimiento. ¿Quieres revisar el inventario?"
            return expert_response(reply, {'type': 'navigate', 'path': '/inventario'})
        except Exception:
            pass

    # → Tareas / proyectos
    if any(w in msg_lower for w in ['tarea', 'tareas', 'pendiente', 'kanban', 'proyecto']):
        try:
            pendientes  = Task.objects.filter(company=company, status='todo').count()
            en_progreso = Task.objects.filter(company=company, status='in_progress').count()
            completadas = Task.objects.filter(company=company, status='done').count()
            reply = (
                f"✅ **Resumen de tareas:**\n"
                f"• Pendientes: {pendientes}\n"
                f"• En progreso: {en_progreso}\n"
                f"• Completadas: {completadas}\n"
                f"\n¿Quieres ir al tablero Kanban?"
            )
            return expert_response(reply, {'type': 'navigate', 'path': '/tareas'})
        except Exception:
            pass

    # → Usuarios / equipo
    if any(w in msg_lower for w in ['usuario', 'usuarios', 'equipo', 'empleado', 'empleados', 'personal']):
        try:
            activos = company.users.filter(is_active=True).count() if company else 0
            reply = (
                f"👥 **Tu equipo en {company.name if company else 'la empresa'}:**\n"
                f"• Usuarios activos: {activos}\n"
                f"\n¿Quieres gestionar usuarios desde Configuración?"
            )
            return expert_response(reply, {'type': 'navigate', 'path': '/settings'})
        except Exception:
            pass

    # → Navegación directa
    nav_map = {
        'launchpad':     ('/launchpad',  'Yendo al Launchpad…'),
        'dashboard':     ('/dashboard',  'Abriendo el Dashboard…'),
        'inventario':    ('/inventario', 'Abriendo Inventario…'),
        'restaurante':   ('/restaurante','Abriendo el Restaurante…'),
        'cocina':        ('/restaurante/cocina', 'Abriendo la vista de Cocina…'),
        'calendario':    ('/calendario', 'Abriendo el Calendario…'),
        'tareas':        ('/tareas',     'Abriendo el tablero de Tareas…'),
        'horas':         ('/hoja-horas', 'Abriendo la Hoja de Horas…'),
        'sitio web':     ('/sitio-web',  'Abriendo el Constructor Web…'),
        'configuracion': ('/settings',   'Abriendo Configuración…'),
        'configuración': ('/settings',   'Abriendo Configuración…'),
        'perfil':        ('/perfil',     'Abriendo tu Perfil…'),
    }
    for keyword, (path, text) in nav_map.items():
        if keyword in msg_lower and any(v in msg_lower for v in ['ir', 'abrir', 'lleva', 'llévame', 'muestra', 'ver', 'acceder', 'navegar']):
            return expert_response(text, {'type': 'navigate', 'path': path})

    # ── FALLBACK: HuggingFace Inference API (gratuita) ───────────────────────
    HF_TOKEN = os.environ.get('HF_TOKEN', '')
    HF_MODEL = os.environ.get(
        'HF_MODEL',
        'mistralai/Mistral-7B-Instruct-v0.2'   # Modelo gratuito, sin cuotas agresivas
    )
    HF_URL = f'https://api-inference.huggingface.co/models/{HF_MODEL}'

    # Contexto del sistema para inyectar en el prompt
    active_mods   = list(Module.objects.filter(is_active=True).values_list('name', flat=True))
    system_ctx = (
        f"Eres SynapsiX IA, asistente del ERP Synapsix para {company.name if company else 'la empresa'}. "
        f"Módulos activos: {', '.join(active_mods) or 'Ninguno'}. "
        f"Responde siempre en español, de forma concisa y profesional."
    )

    # Formato de prompt para Mistral Instruct
    history = request.data.get('history', [])
    history_text = ''
    for h in history[-6:]:
        role = 'user' if h.get('role') == 'user' else 'assistant'
        history_text += f"[{role.upper()}]: {h.get('text', '')}\n"

    prompt = f"[INST] {system_ctx}\n\n{history_text}[USER]: {message} [/INST]"

    headers = {'Content-Type': 'application/json'}
    if HF_TOKEN:
        headers['Authorization'] = f'Bearer {HF_TOKEN}'

    try:
        hf_response = http_requests.post(
            HF_URL,
            headers=headers,
            json={
                'inputs': prompt,
                'parameters': {
                    'max_new_tokens': 400,
                    'temperature': 0.6,
                    'return_full_text': False,
                },
            },
            timeout=30,
        )

        if hf_response.status_code == 200:
            data = hf_response.json()
            if isinstance(data, list) and data:
                reply = data[0].get('generated_text', '').strip()
            elif isinstance(data, dict):
                reply = data.get('generated_text', str(data)).strip()
            else:
                reply = str(data).strip()

            # Limpiar el prompt del reply si HF lo incluye
            if '[/INST]' in reply:
                reply = reply.split('[/INST]')[-1].strip()

            if not reply:
                reply = 'No pude generar una respuesta. Por favor, reformula tu pregunta.'

            return Response({'reply': reply, 'action': None})

        elif hf_response.status_code == 503:
            # Modelo cargando (cold start)
            return Response({
                'reply': (
                    '⏳ El asistente está experimentando alta demanda. '
                    'Intente de nuevo en unos momentos.\n\n'
                    'Mientras tanto, puedo ayudarte con preguntas sobre '
                    'mesas, inventario, tareas o empleados directamente.'
                ),
                'action': None,
            })
        else:
            error_detail = hf_response.text[:200]
            return Response({
                'reply': (
                    'El asistente está experimentando alta demanda. '
                    f'Intente de nuevo en unos momentos. (HTTP {hf_response.status_code})'
                ),
                'action': None,
            })

    except http_requests.exceptions.Timeout:
        return Response({
            'reply': (
                '⏳ El asistente está experimentando alta demanda. '
                'Intente de nuevo en unos momentos.'
            ),
            'action': None,
        })
    except Exception as e:
        return Response({
            'reply': (
                'El asistente está experimentando alta demanda. '
                'Intente de nuevo en unos momentos.'
            ),
            'action': None,
        })







# ─── NOTIFICACIONES ───────────────────────────────────────────────────────────


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def send_notification(request, user_id):
    """POST /api/v1/core/notify/<user_id>/ — Enviar notificación push WS."""
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync
    try:
        target = User.objects.get(id=user_id, company=request.user.company)
        layer  = get_channel_layer()
        async_to_sync(layer.group_send)(
            f'notifications_{target.id}',
            {
                'type':    'push_notification',
                'title':   request.data.get('title', 'Notificación'),
                'message': request.data.get('message', ''),
                'level':   request.data.get('level', 'info'),
                'ts':      str(__import__('datetime').datetime.now().isoformat()),
            }
        )
        return Response({'sent': True})
    except User.DoesNotExist:
        return Response({'detail': 'Usuario no encontrado.'}, status=404)
    except Exception as e:
        return Response({'detail': str(e)}, status=500)


# ─── CALENDARIO ───────────────────────────────────────────────────────────────
class EventListCreateView(generics.ListCreateAPIView):
    serializer_class   = EventSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Event.objects.filter(company=self.request.user.company)
        year  = self.request.query_params.get('year')
        month = self.request.query_params.get('month')
        if year and month:
            qs = qs.filter(start_datetime__year=year, start_datetime__month=month)
        return qs.order_by('start_datetime')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, company=self.request.user.company)

class EventDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = EventSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        return Event.objects.filter(company=self.request.user.company)


# ─── TAREAS ───────────────────────────────────────────────────────────────────
class TaskListCreateView(generics.ListCreateAPIView):
    serializer_class   = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Task.objects.filter(company=self.request.user.company)
        if self.request.query_params.get('status'):
            qs = qs.filter(status=self.request.query_params['status'])
        if self.request.query_params.get('mine') == 'true':
            qs = qs.filter(assigned_to=self.request.user)
        return qs.select_related('assigned_to', 'created_by').order_by('order', '-created_at')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, company=self.request.user.company)

class TaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        return Task.objects.filter(company=self.request.user.company)
    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)


# ─── HOJA DE HORAS ────────────────────────────────────────────────────────────
class TimeEntryListCreateView(generics.ListCreateAPIView):
    serializer_class   = TimeEntrySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = TimeEntry.objects.filter(company=self.request.user.company)
        if self.request.query_params.get('mine', 'true') == 'true':
            qs = qs.filter(user=self.request.user)
        ws = self.request.query_params.get('week_start')
        we = self.request.query_params.get('week_end')
        if ws: qs = qs.filter(date__gte=ws)
        if we: qs = qs.filter(date__lte=we)
        return qs.select_related('user', 'task').order_by('date')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user, company=self.request.user.company)

class TimeEntryDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = TimeEntrySerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        return TimeEntry.objects.filter(user=self.request.user)
    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)


# ─── DASHBOARD ────────────────────────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def dashboard_view(request):
    user      = request.user
    company   = user.company
    today     = date.today()
    week_start = today - timedelta(days=today.weekday())
    week_end   = week_start + timedelta(days=6)

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
    today_events    = Event.objects.filter(company=company, start_datetime__date=today).order_by('start_datetime')[:5]
    upcoming_events = Event.objects.filter(company=company, start_datetime__date__gt=today, start_datetime__date__lte=today+timedelta(days=7)).order_by('start_datetime')[:5]
    week_qs   = TimeEntry.objects.filter(user=user, date__gte=week_start, date__lte=week_end)
    week_hours = week_qs.aggregate(total=Sum('hours'))['total'] or 0
    hours_by_day = list(week_qs.values('date').annotate(hours=Sum('hours')).order_by('date'))

    return Response({
        'task_stats':      task_stats,
        'my_tasks':        TaskSerializer(my_tasks, many=True).data,
        'today_events':    EventSerializer(today_events, many=True).data,
        'upcoming_events': EventSerializer(upcoming_events, many=True).data,
        'week_hours':      float(week_hours),
        'hours_by_day':    [{'date': str(h['date']), 'hours': float(h['hours'])} for h in hours_by_day],
        'week_start':      str(week_start),
        'week_end':        str(week_end),
        'team_count':      company.users.filter(is_active=True).count() if company else 1,
        'today':           str(today),
    })


# ─── AJUSTES POR MÓDULO ──────────────────────────────────────────────────────
@api_view(['GET', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def module_settings_view(request, module_slug):
    """
    GET|PATCH /api/v1/core/settings/<module_slug>/

    Almacena y recupera ajustes JSON de cualquier módulo.
    Los settings se guardan en Module.settings (JSONField) de la empresa.
    """
    company = getattr(request.user, 'company', None)

    try:
        # Busca módulo específico de la empresa primero, luego global
        module = Module.objects.filter(
            slug=module_slug
        ).filter(
            models.Q(company=company) | models.Q(company=None)
        ).order_by('company').first()   # company-specific primero
        if module is None:
            if request.method == 'GET':
                return Response({})
            return Response({'detail': 'Módulo no encontrado.'}, status=404)
    except Exception:
        if request.method == 'GET':
            return Response({})
        return Response({'detail': 'Error al buscar módulo.'}, status=500)


    if request.method == 'GET':
        return Response(module.settings or {})

    # PATCH — guardar ajustes (solo admin)
    if not (request.user.is_superuser or request.user.is_staff or
            (request.user.role and request.user.role.can_access_admin)):
        return Response({'detail': 'Sin permiso.'}, status=403)

    current = module.settings or {}
    current.update(request.data)
    module.settings = current
    module.save(update_fields=['settings'])
    return Response(module.settings)

