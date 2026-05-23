"""
SYNAPSIX ERP — Settings de Desarrollo
"""
from .base import *

DEBUG = True

# Herramientas de desarrollo
INSTALLED_APPS += ['django_extensions']

# Correo en consola durante desarrollo
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Logging detallado en desarrollo
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'DEBUG',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'apps': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}
