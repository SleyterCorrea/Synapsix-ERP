# ===========================================
# SYNAPSIX ERP — Dockerfile Backend
# Python 3.12 + Django + DRF
# ===========================================
FROM python:3.12-slim

# Variables de entorno
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=config.settings.development

WORKDIR /app

# Instalar dependencias del sistema
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Copiar e instalar dependencias Python
COPY requirements/ /app/requirements/
RUN pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements/development.txt

# Copiar código fuente
COPY . /app/

# Crear directorio para archivos estáticos y media
RUN mkdir -p /app/staticfiles /app/media

# Puerto del servidor Django
EXPOSE 8000

# El comando de inicio se define en docker-compose.yml
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
