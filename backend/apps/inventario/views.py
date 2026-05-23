"""
SYNAPSIX ERP — Inventario Views
CRUD completo de productos, categorías y movimientos de stock.
"""
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Category, Product, UnitOfMeasure, StockMovement
from .serializers import (
    CategorySerializer, ProductListSerializer, ProductDetailSerializer,
    UnitOfMeasureSerializer, StockMovementSerializer
)


class CategoryListCreateView(generics.ListCreateAPIView):
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [SearchFilter]
    search_fields = ['name', 'description']

    def get_queryset(self):
        return Category.objects.filter(
            company=self.request.user.company,
            is_active=True
        ).prefetch_related('children')

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class CategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Category.objects.filter(company=self.request.user.company)


class ProductListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['category', 'product_type', 'is_active', 'is_available']
    search_fields = ['name', 'sku', 'barcode', 'description']
    ordering_fields = ['name', 'sale_price', 'stock_quantity', 'created_at']
    ordering = ['name']

    def get_serializer_class(self):
        return ProductDetailSerializer if self.request.method == 'POST' else ProductListSerializer

    def get_queryset(self):
        return Product.objects.filter(
            company=self.request.user.company
        ).select_related('category', 'unit')

    def perform_create(self, serializer):
        serializer.save(
            company=self.request.user.company,
            created_by=self.request.user
        )


class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProductDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Product.objects.filter(
            company=self.request.user.company
        ).select_related('category', 'unit')

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        return Response({'message': 'Producto desactivado.'}, status=status.HTTP_200_OK)


class StockMovementListCreateView(generics.ListCreateAPIView):
    serializer_class = StockMovementSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['product', 'movement_type']
    ordering = ['-created_at']

    def get_queryset(self):
        return StockMovement.objects.filter(
            product__company=self.request.user.company
        ).select_related('product', 'created_by')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class UnitOfMeasureListView(generics.ListAPIView):
    serializer_class = UnitOfMeasureSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = UnitOfMeasure.objects.all()
