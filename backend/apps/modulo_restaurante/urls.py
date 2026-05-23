"""SYNAPSIX ERP — Restaurante URLs · Prefijo: /api/v1/restaurante/"""
from django.urls import path
from .views import (
    MesaListCreateView, MesaDetailView,
    ComandaListCreateView, ComandaDetailView,
    agregar_item, update_item,
)

urlpatterns = [
    path('mesas/',                                  MesaListCreateView.as_view()),
    path('mesas/<uuid:pk>/',                        MesaDetailView.as_view()),
    path('comandas/',                               ComandaListCreateView.as_view()),
    path('comandas/<uuid:pk>/',                     ComandaDetailView.as_view()),
    path('comandas/<uuid:comanda_id>/items/',        agregar_item),
    path('comandas/<uuid:comanda_id>/items/<uuid:item_id>/', update_item),
]
