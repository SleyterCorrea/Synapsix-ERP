"""
SYNAPSIX ERP — Management Command: create_superuser_if_none
Crea el superusuario inicial desde variables de entorno si no existe ninguno.
Se ejecuta en el arranque del contenedor Docker.
"""
import os
from django.core.management.base import BaseCommand
from apps.core.models import User, Company, Role


class Command(BaseCommand):
    help = 'Crea el superusuario inicial desde variables de entorno si no existe ninguno.'

    def handle(self, *args, **options):
        email = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'admin@synapsix.com')
        password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', 'Admin1234!')
        first_name = os.environ.get('DJANGO_SUPERUSER_FIRST_NAME', 'Super')
        last_name = os.environ.get('DJANGO_SUPERUSER_LAST_NAME', 'Admin')

        if User.objects.filter(is_superuser=True).exists():
            self.stdout.write(self.style.WARNING('✓ Superusuario ya existe. Saltando creación.'))
            return

        # Crear empresa demo si no existe
        company, _ = Company.objects.get_or_create(
            slug='synapsix-demo',
            defaults={
                'name': 'Synapsix Demo',
                'currency': 'MXN',
                'timezone': 'America/Mexico_City',
            }
        )

        # Crear rol admin si no existe
        admin_role, _ = Role.objects.get_or_create(
            name=Role.RoleName.ADMIN,
            defaults={
                'description': 'Administrador con acceso completo al sistema.',
                'can_access_admin': True,
                'can_manage_users': True,
                'can_access_inventory': True,
                'can_access_billing': True,
                'can_access_restaurant': True,
            }
        )

        user = User.objects.create_superuser(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
        )
        user.company = company
        user.role = admin_role
        user.save()

        self.stdout.write(
            self.style.SUCCESS(f'✓ Superusuario creado: {email}')
        )
