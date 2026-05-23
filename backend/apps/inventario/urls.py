"""
SYNAPSIX ERP — Inventario URLs
Prefijo: /api/v1/inventario/
"""
from django.urls import path
from .views import (
    CategoryListCreateView, CategoryDetailView,
    ProductListCreateView, ProductDetailView,
    StockMovementListCreateView,
    UnitOfMeasureListView,
)

urlpatterns = [
    # Categorías
    path('categories/', CategoryListCreateView.as_view(), name='category-list'),
    path('categories/<uuid:pk>/', CategoryDetailView.as_view(), name='category-detail'),

    # Productos
    path('products/', ProductListCreateView.as_view(), name='product-list'),
    path('products/<uuid:pk>/', ProductDetailView.as_view(), name='product-detail'),

    # Movimientos de Stock
    path('stock-movements/', StockMovementListCreateView.as_view(), name='stock-movement-list'),

    # Unidades de Medida
    path('units/', UnitOfMeasureListView.as_view(), name='unit-list'),
]
