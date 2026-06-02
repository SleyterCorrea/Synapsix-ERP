from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import WebSiteConfig, WebPage, WebContact
from .serializers import WebSiteConfigSerializer, WebPageSerializer, WebContactSerializer


# ── Site Config (header / footer compartidos) ──────────────────────────────────
class WebSiteConfigView(viewsets.ViewSet):
    """
    Único endpoint para la configuración del sitio:
      GET  /api/v1/web/siteconfig/  → devuelve (o crea) la config actual
      PATCH /api/v1/web/siteconfig/update/ → actualiza header/footer/global_css
    """
    permission_classes = [permissions.IsAuthenticated]

    def _get_config(self, user):
        company = getattr(user, 'company', None)
        config, _ = WebSiteConfig.objects.get_or_create(company=company)
        return config

    def list(self, request):
        config = self._get_config(request.user)
        return Response(WebSiteConfigSerializer(config).data)

    def partial_update(self, request, pk=None):
        config = self._get_config(request.user)
        serializer = WebSiteConfigSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


# ── Pages ──────────────────────────────────────────────────────────────────────
class WebPageViewSet(viewsets.ModelViewSet):
    """CRUD para páginas del sitio web."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class   = WebPageSerializer

    def get_queryset(self):
        user    = self.request.user
        company = getattr(user, 'company', None)
        if company:
            qs = WebPage.objects.filter(company=company)
            # Si no hay páginas para esta company, mostrar páginas sin company (legacy)
            if not qs.exists():
                return WebPage.objects.filter(company=None)
            return qs
        return WebPage.objects.all()

    def perform_create(self, serializer):
        company = getattr(self.request.user, 'company', None)
        # is_home = primera página para esta company
        is_home = not WebPage.objects.filter(company=company).exists()
        serializer.save(company=company, is_home=is_home, is_published=True)


# ── Endpoints públicos ─────────────────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def get_public_page(request, slug):
    """
    Renderiza una página pública combinando:
      header (WebSiteConfig) + body (WebPage) + footer (WebSiteConfig)
    """
    page = WebPage.objects.filter(slug=slug, is_published=True).first()
    if not page:
        return Response(
            {'detail': 'Página no encontrada o no publicada.'},
            status=status.HTTP_404_NOT_FOUND
        )

    config = WebSiteConfig.objects.filter(company=page.company).first()

    return Response({
        'title':       page.title,
        'slug':        page.slug,
        'header_html': config.header_html if config else '',
        'header_css':  config.header_css  if config else '',
        'body_html':   page.html_content,
        'body_css':    page.css_content,
        'footer_html': config.footer_html if config else '',
        'footer_css':  config.footer_css  if config else '',
        'global_css':  config.global_css  if config else '',
        # Datos de empresa para logo dinámico y navegación
        'company_name': page.company.name if page.company else '',
        'company_logo': (
            request.build_absolute_uri(page.company.logo.url)
            if page.company and page.company.logo
            else ''
        ),
        # Páginas publicadas para corregir los links del header dinámicamente
        'pages': list(
            WebPage.objects.filter(company=page.company, is_published=True)
            .values('title', 'slug', 'is_home', 'order')
            .order_by('order', 'slug')
        ),
    })


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def list_public_pages(request):
    """Lista todas las páginas publicadas (para la navegación del sitio público)."""
    pages = WebPage.objects.filter(is_published=True).values(
        'title', 'slug', 'is_home', 'order'
    ).order_by('order', 'slug')
    return Response(list(pages))


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def submit_contact(request):
    """Endpoint público para formularios de contacto."""
    serializer = WebContactSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response({'detail': 'Contacto guardado exitosamente.'}, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
