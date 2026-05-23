"""
SYNAPSIX ERP — Management Command: seed_modules
Inicializa el catálogo de módulos del sistema.
Se ejecuta en el arranque del contenedor Docker.
"""
from django.core.management.base import BaseCommand
from apps.core.models import Module


MODULES_CATALOG = [
    {
        'name': 'Inventario',
        'slug': 'inventario',
        'description': 'Catálogo maestro de productos, categorías y control de stock.',
        'icon': 'package',
        'color': '#C0392B',
        'route': '/inventario',
        'is_active': True,
        'is_core': True,
        'order': 1,
        'version': '0.1.0',
    },
    {
        'name': 'Facturación',
        'slug': 'facturacion',
        'description': 'Emisión de facturas, tickets y comprobantes fiscales.',
        'icon': 'receipt',
        'color': '#2980B9',
        'route': '/facturacion',
        'is_active': False,
        'is_core': False,
        'order': 2,
        'version': '0.0.0',
    },
    {
        'name': 'Restaurante',
        'slug': 'restaurante',
        'description': 'Gestión de mesas, comandas, cocina y servicio en sala.',
        'icon': 'utensils',
        'color': '#27AE60',
        'route': '/restaurante',
        'is_active': False,
        'is_core': False,
        'order': 3,
        'version': '0.0.0',
    },
    {
        'name': 'Tienda Web',
        'slug': 'tienda-web',
        'description': 'E-commerce integrado con sincronización de inventario en tiempo real.',
        'icon': 'shopping-bag',
        'color': '#8E44AD',
        'route': '/tienda-web',
        'is_active': False,
        'is_core': False,
        'order': 4,
        'version': '0.0.0',
    },
    {
        'name': 'Reportes',
        'slug': 'reportes',
        'description': 'Análisis de ventas, inventario y rendimiento del negocio.',
        'icon': 'bar-chart',
        'color': '#D35400',
        'route': '/reportes',
        'is_active': False,
        'is_core': False,
        'order': 5,
        'version': '0.0.0',
    },
]


class Command(BaseCommand):
    help = 'Inicializa el catálogo de módulos del sistema Synapsix.'

    def handle(self, *args, **options):
        created_count = 0
        updated_count = 0

        for module_data in MODULES_CATALOG:
            slug = module_data['slug']
            obj, created = Module.objects.update_or_create(
                slug=slug,
                defaults=module_data
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'  + Módulo creado: {obj.name}'))
            else:
                updated_count += 1
                self.stdout.write(self.style.WARNING(f'  ~ Módulo actualizado: {obj.name}'))

        self.stdout.write(
            self.style.SUCCESS(
                f'\n✓ Módulos: {created_count} creados, {updated_count} actualizados.'
            )
        )
