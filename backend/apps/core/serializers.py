"""
SYNAPSIX ERP — Core Serializers
JWT personalizado + User + Module
"""
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User, Company, Role, Module


# ─── JWT Personalizado ────────────────────────────────────────────────────────
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Extiende el JWT para incluir datos del usuario en el payload.
    El frontend puede leer el token y mostrar el nombre del usuario
    sin necesidad de una llamada adicional a /me/.
    """
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Claims personalizados en el payload del JWT
        token['email'] = user.email
        token['full_name'] = user.get_full_name()
        token['role'] = user.role_name
        token['company_id'] = str(user.company.id) if user.company else None
        token['company_name'] = user.company.name if user.company else None
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        # Agregar info extra en la respuesta del login
        data['user'] = {
            'id': str(self.user.id),
            'email': self.user.email,
            'full_name': self.user.get_full_name(),
            'first_name': self.user.first_name,
            'last_name': self.user.last_name,
            'role': self.user.role_name,
            'avatar': self.user.avatar.url if self.user.avatar else None,
            'company': {
                'id': str(self.user.company.id),
                'name': self.user.company.name,
                'slug': self.user.company.slug,
            } if self.user.company else None,
        }
        return data


# ─── Company ─────────────────────────────────────────────────────────────────
class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = [
            'id', 'name', 'slug', 'logo', 'tax_id',
            'phone', 'email', 'currency', 'timezone', 'is_active'
        ]


# ─── Role ─────────────────────────────────────────────────────────────────────
class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = [
            'id', 'name', 'description',
            'can_access_admin', 'can_manage_users',
            'can_access_inventory', 'can_access_billing', 'can_access_restaurant'
        ]


# ─── User ─────────────────────────────────────────────────────────────────────
class UserSerializer(serializers.ModelSerializer):
    role = RoleSerializer(read_only=True)
    company = CompanySerializer(read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'avatar', 'role', 'company', 'is_active', 'date_joined', 'last_login'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login']

    def get_full_name(self, obj):
        return obj.get_full_name()


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    role_id = serializers.UUIDField(write_only=True, required=False)
    company_id = serializers.UUIDField(write_only=True, required=False)

    class Meta:
        model = User
        fields = [
            'email', 'first_name', 'last_name',
            'password', 'password_confirm',
            'role_id', 'company_id'
        ]

    def validate(self, data):
        if data['password'] != data.pop('password_confirm'):
            raise serializers.ValidationError({'password_confirm': 'Las contraseñas no coinciden.'})
        return data

    def create(self, validated_data):
        role_id = validated_data.pop('role_id', None)
        company_id = validated_data.pop('company_id', None)
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        if role_id:
            user.role_id = role_id
        if company_id:
            user.company_id = company_id
        user.save()
        return user


# ─── Module ───────────────────────────────────────────────────────────────────
class ModuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Module
        fields = [
            'id', 'name', 'slug', 'description',
            'icon', 'color', 'route', 'is_active', 'is_core',
            'order', 'version'
        ]
