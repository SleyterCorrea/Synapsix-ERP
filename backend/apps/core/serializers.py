"""
SYNAPSIX ERP — Core Serializers (v2 — completo)
Incluye: JWT, Company, Role (CRUD), User (completo), módulos, calendario, tareas, horas, IA.
"""
import re
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User, Company, Role, Module, Event, Task, TimeEntry

TIMEZONES = [
    'America/Mexico_City', 'America/Bogota', 'America/Lima',
    'America/Santiago', 'America/Buenos_Aires', 'America/Caracas',
    'America/New_York', 'America/Los_Angeles', 'Europe/Madrid',
    'Europe/London', 'UTC',
]

CURRENCIES = ['MXN', 'USD', 'EUR', 'COP', 'PEN', 'CLP', 'ARS', 'VES']


# ─── JWT ─────────────────────────────────────────────────────────────────────
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email']        = user.email
        token['full_name']    = user.get_full_name()
        token['role']         = user.role_name
        token['company_id']   = str(user.company.id) if user.company else None
        token['company_name'] = user.company.name if user.company else None
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = {
            'id':         str(self.user.id),
            'email':      self.user.email,
            'full_name':  self.user.get_full_name(),
            'first_name': self.user.first_name,
            'last_name':  self.user.last_name,
            'role':       self.user.role_name,
            'is_staff':   self.user.is_staff,
            'is_superuser': self.user.is_superuser,
            'avatar':     self.user.avatar.url if self.user.avatar else None,
            'company': {
                'id':       str(self.user.company.id),
                'name':     self.user.company.name,
                'slug':     self.user.company.slug,
                'logo':     self.user.company.logo.url if self.user.company.logo else None,
                'currency': self.user.company.currency,
                'timezone': self.user.company.timezone,
            } if self.user.company else None,
        }
        return data


# ─── Company ─────────────────────────────────────────────────────────────────
class CompanySerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model  = Company
        fields = [
            'id', 'name', 'slug', 'logo', 'logo_url',
            'tax_id', 'address', 'phone', 'email', 'website',
            'currency', 'timezone', 'is_active',
        ]
        read_only_fields = ['id', 'slug']
        extra_kwargs = {'logo': {'required': False}}

    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.logo.url) if request else obj.logo.url
        return None

    def validate_currency(self, v):
        if v not in CURRENCIES:
            raise serializers.ValidationError(f'Moneda inválida. Opciones: {", ".join(CURRENCIES)}')
        return v

    def validate_timezone(self, v):
        if v not in TIMEZONES:
            raise serializers.ValidationError('Zona horaria inválida.')
        return v

    def validate_phone(self, v):
        if v and not re.match(r'^\+?[\d\s\-\(\)]{7,20}$', v):
            raise serializers.ValidationError('Formato de teléfono inválido.')
        return v


# ─── Role ────────────────────────────────────────────────────────────────────
class RoleSerializer(serializers.ModelSerializer):
    user_count = serializers.SerializerMethodField()

    class Meta:
        model  = Role
        fields = [
            'id', 'name', 'description',
            'can_access_admin', 'can_manage_users',
            'can_access_inventory', 'can_access_billing', 'can_access_restaurant',
            'user_count', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_user_count(self, obj):
        return obj.users.count()


class RoleCreateSerializer(serializers.ModelSerializer):
    """Para crear y actualizar roles."""
    class Meta:
        model  = Role
        fields = [
            'name', 'description',
            'can_access_admin', 'can_manage_users',
            'can_access_inventory', 'can_access_billing', 'can_access_restaurant',
        ]

    def validate_name(self, v):
        valid = [c for c, _ in Role.RoleName.choices]
        if v not in valid:
            raise serializers.ValidationError(f'Rol inválido. Opciones: {", ".join(valid)}')
        return v


# ─── User ─────────────────────────────────────────────────────────────────────
class UserSerializer(serializers.ModelSerializer):
    role      = RoleSerializer(read_only=True)
    company   = CompanySerializer(read_only=True)
    full_name = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'avatar', 'avatar_url', 'role', 'company',
            'is_active', 'is_staff', 'date_joined', 'last_login',
        ]
        read_only_fields = ['id', 'date_joined', 'last_login']

    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_avatar_url(self, obj):
        if obj.avatar:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.avatar.url) if request else obj.avatar.url
        return None


class UserCreateSerializer(serializers.ModelSerializer):
    password         = serializers.CharField(write_only=True, min_length=8, required=False, allow_blank=True)
    password_confirm = serializers.CharField(write_only=True, required=False, allow_blank=True)
    role_id          = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    role             = RoleSerializer(read_only=True)
    full_name        = serializers.SerializerMethodField(read_only=True)
    avatar_url       = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model  = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'avatar', 'avatar_url',
            'password', 'password_confirm',
            'role_id', 'role',
            'is_active', 'is_staff',
            'date_joined', 'last_login',
        ]
        read_only_fields = ['id', 'date_joined', 'last_login']

    def get_full_name(self, obj):
        return obj.get_full_name() if obj.pk else ''

    def get_avatar_url(self, obj):
        if obj.pk and obj.avatar:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.avatar.url) if request else obj.avatar.url
        return None

    def validate_email(self, v):
        v = v.strip().lower()
        if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', v):
            raise serializers.ValidationError('Email inválido.')
        # En update excluir al mismo usuario
        qs = User.objects.filter(email=v)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('Ya existe un usuario con este email.')
        return v

    def validate(self, data):
        p, pc = data.get('password'), data.get('password_confirm')
        if p or pc:
            if not p:
                raise serializers.ValidationError({'password': 'Ingresa la contraseña.'})
            if len(p) < 8:
                raise serializers.ValidationError({'password': 'Mínimo 8 caracteres.'})
            if p != pc:
                raise serializers.ValidationError({'password_confirm': 'Las contraseñas no coinciden.'})
        return data

    def create(self, validated_data):
        validated_data.pop('password_confirm', None)
        role_id  = validated_data.pop('role_id', None)
        password = validated_data.pop('password', None)
        if not password:
            raise serializers.ValidationError({'password': 'La contraseña es requerida.'})
        user = User(**validated_data)
        user.set_password(password)
        if role_id:
            try:
                user.role = Role.objects.get(id=role_id)
            except Role.DoesNotExist:
                raise serializers.ValidationError({'role_id': 'Rol no encontrado.'})
        user.save()
        return user

    def update(self, instance, validated_data):
        validated_data.pop('password_confirm', None)
        role_id  = validated_data.pop('role_id', None)
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if role_id is not None:
            try:
                instance.role = Role.objects.get(id=role_id) if role_id else None
            except Role.DoesNotExist:
                raise serializers.ValidationError({'role_id': 'Rol no encontrado.'})
        if password:
            instance.set_password(password)
        instance.save()
        return instance


# ─── Module ───────────────────────────────────────────────────────────────────
class ModuleSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Module
        fields = ['id', 'name', 'slug', 'description', 'icon', 'color',
                  'route', 'is_active', 'is_core', 'order', 'version']


# ─── Event ───────────────────────────────────────────────────────────────────
class EventSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model  = Event
        fields = ['id', 'title', 'description', 'location',
                  'start_datetime', 'end_datetime', 'all_day',
                  'color', 'created_by_name', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() if obj.created_by else ''

    def validate(self, data):
        if data.get('end_datetime') and data.get('start_datetime'):
            if data['end_datetime'] < data['start_datetime']:
                raise serializers.ValidationError({'end_datetime': 'La fecha fin debe ser posterior a la de inicio.'})
        return data

    def create(self, validated_data):
        return Event.objects.create(**validated_data)


# ─── Task ─────────────────────────────────────────────────────────────────────
class TaskSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.SerializerMethodField()
    created_by_name  = serializers.SerializerMethodField()
    assigned_to_id   = serializers.UUIDField(write_only=True, required=False, allow_null=True)

    class Meta:
        model  = Task
        fields = ['id', 'title', 'description', 'status', 'priority',
                  'assigned_to_id', 'assigned_to_name', 'created_by_name',
                  'due_date', 'order', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_assigned_to_name(self, obj):
        return obj.assigned_to.get_full_name() if obj.assigned_to else None

    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() if obj.created_by else ''

    def validate_title(self, v):
        if not v.strip():
            raise serializers.ValidationError('El título no puede estar vacío.')
        return v.strip()

    def create(self, validated_data):
        assigned_id = validated_data.pop('assigned_to_id', None)
        task = Task(**validated_data)
        if assigned_id:
            task.assigned_to_id = assigned_id
        task.save()
        return task

    def update(self, instance, validated_data):
        assigned_id = validated_data.pop('assigned_to_id', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if assigned_id is not None:
            instance.assigned_to_id = assigned_id if assigned_id else None
        instance.save()
        return instance


# ─── TimeEntry ────────────────────────────────────────────────────────────────
class TimeEntrySerializer(serializers.ModelSerializer):
    user_name  = serializers.SerializerMethodField()
    task_title = serializers.SerializerMethodField()

    class Meta:
        model  = TimeEntry
        fields = ['id', 'date', 'hours', 'description', 'task', 'task_title', 'user_name', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_user_name(self, obj):
        return obj.user.get_full_name()

    def get_task_title(self, obj):
        return obj.task.title if obj.task else None

    def validate_hours(self, v):
        if v <= 0 or v > 24:
            raise serializers.ValidationError('Las horas deben estar entre 0.1 y 24.')
        return v
