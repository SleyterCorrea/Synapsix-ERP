"""
SYNAPSIX ERP — Core Models
Modelos fundamentales: Company, User (RBAC), Module.
"""
import uuid
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


# ─────────────────────────────────────────────────────────────────────────────
# EMPRESA (Tenant base)
# ─────────────────────────────────────────────────────────────────────────────
class Company(models.Model):
    """Empresa u organización que usa el sistema."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(_('Nombre'), max_length=255)
    slug = models.SlugField(_('Slug'), unique=True, max_length=100)
    logo = models.ImageField(_('Logo'), upload_to='company/logos/', blank=True, null=True)
    tax_id = models.CharField(_('RFC / RUC / NIT'), max_length=50, blank=True)
    address = models.TextField(_('Dirección'), blank=True)
    phone = models.CharField(_('Teléfono'), max_length=30, blank=True)
    email = models.EmailField(_('Email'), blank=True)
    website = models.URLField(_('Sitio Web'), blank=True)
    currency = models.CharField(_('Moneda'), max_length=3, default='MXN')
    timezone = models.CharField(_('Zona Horaria'), max_length=50, default='America/Mexico_City')
    is_active = models.BooleanField(_('Activa'), default=True)
    created_at = models.DateTimeField(_('Creada'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Actualizada'), auto_now=True)

    class Meta:
        verbose_name = _('Empresa')
        verbose_name_plural = _('Empresas')
        ordering = ['name']

    def __str__(self):
        return self.name


# ─────────────────────────────────────────────────────────────────────────────
# ROLES (RBAC)
# ─────────────────────────────────────────────────────────────────────────────
class Role(models.Model):
    """
    Roles del sistema. Define permisos de acceso a módulos y acciones.
    Roles predefinidos: admin, cajero, mozo, inventarista
    """
    class RoleName(models.TextChoices):
        ADMIN = 'admin', _('Administrador')
        CAJERO = 'cajero', _('Cajero')
        MOZO = 'mozo', _('Mozo / Mesero')
        INVENTARISTA = 'inventarista', _('Inventarista')
        VIEWER = 'viewer', _('Solo Lectura')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(
        _('Rol'),
        max_length=30,
        choices=RoleName.choices,
        unique=True
    )
    description = models.TextField(_('Descripción'), blank=True)
    # Permisos granulares por módulo (extensible)
    can_access_admin = models.BooleanField(_('Acceso Admin'), default=False)
    can_manage_users = models.BooleanField(_('Gestionar Usuarios'), default=False)
    can_access_inventory = models.BooleanField(_('Acceso Inventario'), default=False)
    can_access_billing = models.BooleanField(_('Acceso Facturación'), default=False)
    can_access_restaurant = models.BooleanField(_('Acceso Restaurante'), default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('Rol')
        verbose_name_plural = _('Roles')

    def __str__(self):
        return self.get_name_display()


# ─────────────────────────────────────────────────────────────────────────────
# USUARIO PERSONALIZADO
# ─────────────────────────────────────────────────────────────────────────────
class UserManager(BaseUserManager):
    """Manager personalizado con email como identificador único."""

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError(_('El email es obligatorio'))
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Usuario del sistema Synapsix.
    Reemplaza el modelo de usuario de Django con email como login.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(_('Email'), unique=True)
    first_name = models.CharField(_('Nombre'), max_length=100)
    last_name = models.CharField(_('Apellido'), max_length=100)
    avatar = models.ImageField(_('Avatar'), upload_to='users/avatars/', blank=True, null=True)

    # Relaciones
    company = models.ForeignKey(
        Company,
        on_delete=models.PROTECT,
        related_name='users',
        verbose_name=_('Empresa'),
        null=True,
        blank=True
    )
    role = models.ForeignKey(
        Role,
        on_delete=models.SET_NULL,
        related_name='users',
        verbose_name=_('Rol'),
        null=True,
        blank=True
    )

    # Estado
    is_active = models.BooleanField(_('Activo'), default=True)
    is_staff = models.BooleanField(_('Staff'), default=False)
    date_joined = models.DateTimeField(_('Fecha de Registro'), default=timezone.now)
    last_login = models.DateTimeField(_('Último Acceso'), null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    class Meta:
        verbose_name = _('Usuario')
        verbose_name_plural = _('Usuarios')
        ordering = ['first_name', 'last_name']

    def __str__(self):
        return f"{self.get_full_name()} <{self.email}>"

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def get_short_name(self):
        return self.first_name

    @property
    def role_name(self):
        return self.role.name if self.role else None


# ─────────────────────────────────────────────────────────────────────────────
# MÓDULOS DEL SISTEMA
# ─────────────────────────────────────────────────────────────────────────────
class Module(models.Model):
    """
    Módulo de negocio del ERP.
    La API devuelve esta lista al Launchpad del frontend.
    Los módulos se activan/desactivan sin tocar código fuente.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(_('Nombre'), max_length=100)
    slug = models.SlugField(_('Slug'), unique=True, max_length=50)
    description = models.TextField(_('Descripción'), blank=True)
    icon = models.CharField(_('Ícono (SVG key)'), max_length=50, default='grid')
    color = models.CharField(_('Color de Acento'), max_length=7, default='#C0392B')
    route = models.CharField(_('Ruta Frontend'), max_length=100, blank=True)
    is_active = models.BooleanField(_('Activo'), default=False)
    is_core = models.BooleanField(_('Módulo Core'), default=False)
    order = models.PositiveSmallIntegerField(_('Orden'), default=100)
    version = models.CharField(_('Versión'), max_length=20, default='0.1.0')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('Módulo')
        verbose_name_plural = _('Módulos')
        ordering = ['order', 'name']

    def __str__(self):
        status = "✓" if self.is_active else "○"
        return f"{status} {self.name} (v{self.version})"


# ─────────────────────────────────────────────────────────────────────────────
# CALENDARIO — Eventos
# ─────────────────────────────────────────────────────────────────────────────
class Event(models.Model):
    """Evento del calendario. Asociado a usuario y empresa."""
    COLOR_CHOICES = [
        ('#C0392B', 'Rojo'),  ('#2980B9', 'Azul'), ('#27AE60', 'Verde'),
        ('#D35400', 'Naranja'), ('#8E44AD', 'Morado'), ('#16A085', 'Teal'),
        ('#F39C12', 'Amarillo'), ('#7F8C8D', 'Gris'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(_('Título'), max_length=200)
    description = models.TextField(_('Descripción'), blank=True)
    location = models.CharField(_('Lugar'), max_length=200, blank=True)
    start_datetime = models.DateTimeField(_('Inicio'))
    end_datetime = models.DateTimeField(_('Fin'))
    all_day = models.BooleanField(_('Todo el día'), default=False)
    color = models.CharField(_('Color'), max_length=7, default='#2980B9', choices=COLOR_CHOICES)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_events')
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='events')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('Evento')
        verbose_name_plural = _('Eventos')
        ordering = ['start_datetime']

    def __str__(self):
        return f"{self.title} ({self.start_datetime:%Y-%m-%d})"


# ─────────────────────────────────────────────────────────────────────────────
# TAREAS — Kanban
# ─────────────────────────────────────────────────────────────────────────────
class Task(models.Model):
    """Tarea del sistema de Kanban por usuario."""
    class Status(models.TextChoices):
        TODO        = 'todo',        _('Por hacer')
        IN_PROGRESS = 'in_progress', _('En progreso')
        DONE        = 'done',        _('Completado')

    class Priority(models.TextChoices):
        LOW    = 'low',    _('Baja')
        MEDIUM = 'medium', _('Media')
        HIGH   = 'high',   _('Alta')
        URGENT = 'urgent', _('Urgente')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(_('Título'), max_length=300)
    description = models.TextField(_('Descripción'), blank=True)
    status = models.CharField(_('Estado'), max_length=20, choices=Status.choices, default=Status.TODO)
    priority = models.CharField(_('Prioridad'), max_length=20, choices=Priority.choices, default=Priority.MEDIUM)
    assigned_to = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name='assigned_tasks'
    )
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_tasks')
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='tasks')
    due_date = models.DateField(_('Fecha límite'), null=True, blank=True)
    order = models.PositiveIntegerField(_('Orden'), default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('Tarea')
        verbose_name_plural = _('Tareas')
        ordering = ['order', '-created_at']

    def __str__(self):
        return f"[{self.status}] {self.title}"


# ─────────────────────────────────────────────────────────────────────────────
# HOJA DE HORAS — Time Tracking
# ─────────────────────────────────────────────────────────────────────────────
class TimeEntry(models.Model):
    """Registro de horas trabajadas por usuario y día."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='time_entries')
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='time_entries')
    date = models.DateField(_('Fecha'))
    hours = models.DecimalField(_('Horas'), max_digits=4, decimal_places=2)
    description = models.CharField(_('Descripción'), max_length=300)
    task = models.ForeignKey(
        Task, null=True, blank=True, on_delete=models.SET_NULL, related_name='time_entries'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('Registro de Horas')
        verbose_name_plural = _('Registros de Horas')
        ordering = ['-date', 'user']
        unique_together = ['user', 'date', 'description']  # evitar duplicados

    def __str__(self):
        return f"{self.user.get_short_name()} | {self.date} | {self.hours}h — {self.description}"
