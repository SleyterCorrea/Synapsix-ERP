"""
SYNAPSIX ERP — Inventario Serializers
"""
from rest_framework import serializers
from .models import Category, Product, UnitOfMeasure, StockMovement


class CategorySerializer(serializers.ModelSerializer):
    children_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'icon', 'color',
                  'parent', 'order', 'is_active', 'children_count']

    def get_children_count(self, obj):
        return obj.children.count()


class UnitOfMeasureSerializer(serializers.ModelSerializer):
    class Meta:
        model = UnitOfMeasure
        fields = ['id', 'name', 'abbreviation']


class ProductListSerializer(serializers.ModelSerializer):
    """Serializer ligero para listados."""
    category_name = serializers.CharField(source='category.name', read_only=True)
    unit_abbreviation = serializers.CharField(source='unit.abbreviation', read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'sku', 'barcode', 'name', 'product_type',
            'category_name', 'unit_abbreviation',
            'sale_price', 'tax_rate',
            'stock_quantity', 'min_stock', 'is_low_stock',
            'is_active', 'is_available', 'image',
        ]


class ProductDetailSerializer(serializers.ModelSerializer):
    """Serializer completo para creación/edición."""
    category = CategorySerializer(read_only=True)
    unit = UnitOfMeasureSerializer(read_only=True)
    category_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    unit_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    is_low_stock = serializers.BooleanField(read_only=True)
    final_price = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'sku', 'barcode', 'name', 'description', 'product_type',
            'category', 'category_id', 'unit', 'unit_id',
            'cost_price', 'sale_price', 'tax_rate', 'final_price',
            'track_stock', 'stock_quantity', 'min_stock', 'max_stock', 'is_low_stock',
            'image', 'is_active', 'is_available',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'stock_quantity', 'created_at', 'updated_at']


class StockMovementSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = StockMovement
        fields = [
            'id', 'product', 'product_name', 'movement_type',
            'quantity', 'quantity_before', 'quantity_after',
            'unit_cost', 'notes', 'reference',
            'created_by', 'created_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'quantity_before', 'quantity_after', 'created_at']
