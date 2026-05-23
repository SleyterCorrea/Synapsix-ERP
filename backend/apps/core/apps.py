"""SYNAPSIX ERP — Core App Config"""
from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.core'
    verbose_name = 'Synapsix Core'

    def ready(self):
        """Registrar señales al iniciar la app."""
        import apps.core.signals  # noqa
