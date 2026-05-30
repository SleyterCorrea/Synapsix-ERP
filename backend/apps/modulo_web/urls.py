from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WebSiteConfigView, WebPageViewSet, get_public_page, list_public_pages, submit_contact

router = DefaultRouter()
router.register(r'builder', WebPageViewSet, basename='webpage')

urlpatterns = [
    # ── Admin / builder ──────────────────────────────────────────────────
    path('', include(router.urls)),

    # Site config (header/footer): GET list, PATCH update/{pk}/
    path('siteconfig/',           WebSiteConfigView.as_view({'get': 'list'})),
    path('siteconfig/update/',    WebSiteConfigView.as_view({'patch': 'partial_update'})),

    # ── Públicos ─────────────────────────────────────────────────────────
    path('public/pages/',         list_public_pages,  name='public-pages'),
    path('public/page/<slug:slug>/', get_public_page,  name='public-page'),
    path('public/contact/',       submit_contact,     name='submit-contact'),
]
