"""
SYNAPSIX ERP — Core Admin
Registro de modelos en el panel de administración Django.
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from .models import Company, Role, User, Module


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'tax_id', 'email', 'currency', 'is_active', 'created_at']
    list_filter = ['is_active', 'currency']
    search_fields = ['name', 'tax_id', 'email']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ['name', 'can_access_admin', 'can_manage_users', 'can_access_inventory']
    list_filter = ['can_access_admin']


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ['email']
    list_display = ['email', 'first_name', 'last_name', 'role', 'company', 'is_active', 'is_staff']
    list_filter = ['is_active', 'is_staff', 'role', 'company']
    search_fields = ['email', 'first_name', 'last_name']
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        (_('Información Personal'), {'fields': ('first_name', 'last_name', 'avatar')}),
        (_('Empresa & Rol'), {'fields': ('company', 'role')}),
        (_('Permisos'), {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        (_('Fechas'), {'fields': ('date_joined', 'last_login')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'password1', 'password2', 'role', 'company'),
        }),
    )
    readonly_fields = ['date_joined', 'last_login']


@admin.register(Module)
class ModuleAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'version', 'is_active', 'is_core', 'order']
    list_filter = ['is_active', 'is_core']
    list_editable = ['is_active', 'order']
    search_fields = ['name', 'slug']
    prepopulated_fields = {'slug': ('name',)}


# Personalizar el panel de admin
admin.site.site_header = 'Synapsix ERP — Administración'
admin.site.site_title = 'Synapsix Admin'
admin.site.index_title = 'Panel de Control'
