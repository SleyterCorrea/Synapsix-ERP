"""SYNAPSIX ERP — Restaurante Serializers"""
from rest_framework import serializers
from .models import Mesa, Comanda, ItemComanda
from apps.inventario.models import Product


class MesaSerializer(serializers.ModelSerializer):
    comanda_activa_id = serializers.SerializerMethodField()

    class Meta:
        model = Mesa
        fields = ['id','numero','nombre','capacidad','zona','estado','is_active','comanda_activa_id']
        read_only_fields = ['id']

    def get_comanda_activa_id(self, obj):
        c = obj.comandas.filter(estado__in=['abierta','en_cocina','lista','servida']).first()
        return str(c.id) if c else None


class ItemComandaSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.name', read_only=True)

    class Meta:
        model = ItemComanda
        fields = ['id','producto','producto_nombre','cantidad','precio_unit','subtotal','estado','notas','cancelado','created_at']
        read_only_fields = ['id','subtotal','created_at']

    def validate_producto(self, value):
        return value

    def to_internal_value(self, data):
        ret = super().to_internal_value(data)
        if 'producto' in ret and 'precio_unit' not in ret:
            ret['precio_unit'] = ret['producto'].sale_price
        return ret


class ComandaSerializer(serializers.ModelSerializer):
    items        = ItemComandaSerializer(many=True, read_only=True)
    mesa_numero  = serializers.IntegerField(source='mesa.numero', read_only=True)
    mesero_name  = serializers.CharField(source='mesero.get_full_name', read_only=True)

    class Meta:
        model = Comanda
        fields = ['id','mesa','mesa_numero','folio','estado','mesero','mesero_name',
                  'comensales','notas','subtotal','impuestos','total','items','created_at','updated_at']
        read_only_fields = ['id','folio','subtotal','impuestos','total','created_at','updated_at']


class ComandaListSerializer(serializers.ModelSerializer):
    mesa_numero = serializers.IntegerField(source='mesa.numero', read_only=True)
    item_count  = serializers.SerializerMethodField()

    class Meta:
        model = Comanda
        fields = ['id','mesa','mesa_numero','folio','estado','comensales','total','item_count','created_at']

    def get_item_count(self, obj):
        return obj.items.filter(cancelado=False).count()
