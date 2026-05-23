"""
SYNAPSIX ERP — URLs del Core v2
Prefijo: /api/v1/core/
"""
from django.urls import path
from apps.core.views import (
    UserListCreateView, UserDetailView,
    modules_view, active_modules_view, toggle_module_view,
    roles_view, role_detail_view,
    company_view,
    ai_chat_view, send_notification,
    EventListCreateView, EventDetailView,
    TaskListCreateView, TaskDetailView,
    TimeEntryListCreateView, TimeEntryDetailView,
    dashboard_view,
)

urlpatterns = [
    # Empresa
    path('company/',                    company_view,               name='company'),

    # Usuarios
    path('users/',                      UserListCreateView.as_view(), name='user-list'),
    path('users/<uuid:pk>/',            UserDetailView.as_view(),     name='user-detail'),

    # Roles
    path('roles/',                      roles_view,                 name='role-list'),
    path('roles/<uuid:pk>/',            role_detail_view,           name='role-detail'),

    # Módulos (Launchpad)
    path('modules/',                    modules_view,               name='module-list'),
    path('modules/active/',             active_modules_view,        name='module-active-list'),
    path('modules/<str:slug>/toggle/',  toggle_module_view,         name='module-toggle'),

    # IA Chat
    path('ai/chat/',                    ai_chat_view,               name='ai-chat'),

    # Notificaciones push
    path('notify/<uuid:user_id>/',      send_notification,          name='send-notification'),

    # Calendario
    path('events/',                     EventListCreateView.as_view(),  name='event-list'),
    path('events/<uuid:pk>/',           EventDetailView.as_view(),      name='event-detail'),

    # Tareas (Kanban)
    path('tasks/',                      TaskListCreateView.as_view(),   name='task-list'),
    path('tasks/<uuid:pk>/',            TaskDetailView.as_view(),       name='task-detail'),

    # Hoja de Horas
    path('timesheets/',                 TimeEntryListCreateView.as_view(), name='timeentry-list'),
    path('timesheets/<uuid:pk>/',       TimeEntryDetailView.as_view(),     name='timeentry-detail'),

    # Dashboard
    path('dashboard/',                  dashboard_view,             name='dashboard'),
]
