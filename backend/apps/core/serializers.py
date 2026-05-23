"""
SYNAPSIX ERP — Core Serializers (ampliado con Calendario, Tareas, Hoja de Horas)
"""
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User, Company, Role, Module, Event, Task, TimeEntry


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
            'avatar':     self.user.avatar.url if self.user.avatar else None,
            'company': {
                'id':   str(self.user.company.id),
                'name': self.user.company.name,
                'slug': self.user.company.slug,
            } if self.user.company else None,
        }
        return data


# ─── Company ─────────────────────────────────────────────────────────────────
class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ['id', 'name', 'slug', 'logo', 'tax_id', 'phone', 'email', 'currency', 'timezone', 'is_active']


# ─── Role ─────────────────────────────────────────────────────────────────────
class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ['id', 'name', 'description', 'can_access_admin', 'can_manage_users',
                  'can_access_inventory', 'can_access_billing', 'can_access_restaurant']


# ─── User ─────────────────────────────────────────────────────────────────────
class UserSerializer(serializers.ModelSerializer):
    role      = RoleSerializer(read_only=True)
    company   = CompanySerializer(read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'full_name',
                  'avatar', 'role', 'company', 'is_active', 'date_joined', 'last_login']
        read_only_fields = ['id', 'date_joined', 'last_login']

    def get_full_name(self, obj):
        return obj.get_full_name()


class UserCreateSerializer(serializers.ModelSerializer):
    password         = serializers.CharField(write_only=True, min_length=8, required=False, allow_blank=True)
    password_confirm = serializers.CharField(write_only=True, required=False, allow_blank=True)
    role_id          = serializers.UUIDField(write_only=True, required=False, allow_null=True)

    class Meta:
        model  = User
        fields = ['email', 'first_name', 'last_name', 'password', 'password_confirm', 'role_id', 'is_active']

    def validate(self, data):
        p, pc = data.get('password'), data.get('password_confirm')
        if p or pc:
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
            user.role_id = role_id
        user.save()
        return user

    def update(self, instance, validated_data):
        validated_data.pop('password_confirm', None)
        role_id  = validated_data.pop('role_id', None)
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if role_id is not None:
            instance.role_id = role_id if role_id else None
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
        return obj.created_by.get_full_name()

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
        return obj.created_by.get_full_name()

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
    user_name = serializers.SerializerMethodField()
    task_title = serializers.SerializerMethodField()

    class Meta:
        model  = TimeEntry
        fields = ['id', 'date', 'hours', 'description', 'task', 'task_title', 'user_name', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_user_name(self, obj):
        return obj.user.get_full_name()

    def get_task_title(self, obj):
        return obj.task.title if obj.task else None
