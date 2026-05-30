import uuid
from django.db import models
from apps.core.models import Company


class WebSiteConfig(models.Model):
    """
    Configuración global del sitio web.
    Header y footer compartidos entre TODAS las páginas del sitio.
    """
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company    = models.OneToOneField(Company, on_delete=models.CASCADE,
                                      null=True, blank=True, related_name='web_config')
    # ── Header (compartido) ───────────────────────────────────────────────
    header_html       = models.TextField(blank=True, default='')
    header_css        = models.TextField(blank=True, default='')
    header_components = models.JSONField(default=dict, blank=True)
    # ── Footer (compartido) ───────────────────────────────────────────────
    footer_html       = models.TextField(blank=True, default='')
    footer_css        = models.TextField(blank=True, default='')
    footer_components = models.JSONField(default=dict, blank=True)
    # ── CSS global opcional ───────────────────────────────────────────────
    global_css        = models.TextField(blank=True, default='')
    updated_at        = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Configuración del sitio'

    def __str__(self):
        return f'Config — {self.company or "Global"}'


class WebPage(models.Model):
    """
    Página individual del sitio web.
    Solo almacena el BODY (el header/footer vienen de WebSiteConfig).
    """
    id       = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company  = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)
    title    = models.CharField(max_length=200)
    slug     = models.SlugField(max_length=100)

    # Body de la página
    html_content    = models.TextField(blank=True)
    css_content     = models.TextField(blank=True)
    components_json = models.JSONField(default=dict, blank=True)
    styles_json     = models.JSONField(default=dict, blank=True)

    is_published = models.BooleanField(default=False)
    is_home      = models.BooleanField(default=False)   # página raíz "/"
    order        = models.PositiveIntegerField(default=0)
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [['company', 'slug']]
        ordering = ['order', 'slug']

    def __str__(self):
        return self.title


class WebContact(models.Model):
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company    = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)
    name       = models.CharField(max_length=200)
    email      = models.EmailField()
    phone      = models.CharField(max_length=50, blank=True)
    message    = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} ({self.email})'
