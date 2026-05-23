"""SYNAPSIX ERP — Restaurante Views + WebSocket broadcast"""
import uuid
from datetime import datetime
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import Mesa, Comanda, ItemComanda
from .serializers import MesaSerializer, ComandaSerializer, ComandaListSerializer, ItemComandaSerializer


def broadcast_mesa(company_id, mesa):
    """Envía update de mesa a todos los clientes WS conectados al restaurante."""
    try:
        layer = get_channel_layer()
        async_to_sync(layer.group_send)(
            f'restaurante_{company_id}',
            {
                'type': 'mesa_update',
                'mesa': MesaSerializer(mesa).data,
            }
        )
    except Exception:
        pass  # Si Redis no está listo, no falla la API


def broadcast_comanda(company_id, comanda, event_type='comanda_update'):
    try:
        layer = get_channel_layer()
        async_to_sync(layer.group_send)(
            f'restaurante_{company_id}',
            {
                'type': event_type,
                'comanda': ComandaSerializer(comanda).data,
            }
        )
    except Exception:
        pass


# ─── Mesas ───────────────────────────────────────────────────────────────────

class MesaListCreateView(generics.ListCreateAPIView):
    serializer_class = MesaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Mesa.objects.filter(company=self.request.user.company, is_active=True)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class MesaDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = MesaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Mesa.objects.filter(company=self.request.user.company)

    def perform_update(self, serializer):
        mesa = serializer.save()
        broadcast_mesa(str(self.request.user.company.id), mesa)


# ─── Comandas ─────────────────────────────────────────────────────────────────

class ComandaListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        return ComandaSerializer if self.request.method == 'POST' else ComandaListSerializer

    def get_queryset(self):
        qs = Comanda.objects.filter(company=self.request.user.company).select_related('mesa', 'mesero')
        estado = self.request.query_params.get('estado')
        if estado:
            qs = qs.filter(estado=estado)
        return qs

    def perform_create(self, serializer):
        company = self.request.user.company
        # Generar folio
        count = Comanda.objects.filter(company=company).count()
        folio = f"CMD-{str(count + 1).zfill(4)}"
        comanda = serializer.save(
            company=company,
            mesero=self.request.user,
            folio=folio
        )
        # Actualizar estado de mesa
        mesa = comanda.mesa
        mesa.estado = Mesa.Estado.OCUPADA
        mesa.save()
        broadcast_mesa(str(company.id), mesa)
        broadcast_comanda(str(company.id), comanda, 'comanda_update')


class ComandaDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = ComandaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Comanda.objects.filter(company=self.request.user.company).prefetch_related('items__producto')

    def perform_update(self, serializer):
        comanda = serializer.save()
        company_id = str(self.request.user.company.id)
        # Si pagada, liberar mesa
        if comanda.estado == Comanda.Estado.PAGADA:
            from django.utils import timezone
            comanda.pagada_at = timezone.now()
            comanda.save(update_fields=['pagada_at'])
            mesa = comanda.mesa
            mesa.estado = Mesa.Estado.LIMPIEZA
            mesa.save()
            broadcast_mesa(company_id, mesa)
        broadcast_comanda(company_id, comanda)


# ─── Items de Comanda ─────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def agregar_item(request, comanda_id):
    """Agrega producto a una comanda y actualiza totales."""
    try:
        comanda = Comanda.objects.get(id=comanda_id, company=request.user.company)
    except Comanda.DoesNotExist:
        return Response({'detail': 'Comanda no encontrada.'}, status=404)

    serializer = ItemComandaSerializer(data=request.data)
    if serializer.is_valid():
        item = serializer.save(comanda=comanda)
        comanda.recalcular_totales()
        # Estado comanda → en cocina
        if comanda.estado == Comanda.Estado.ABIERTA:
            comanda.estado = Comanda.Estado.EN_COCINA
            comanda.save(update_fields=['estado'])
        broadcast_comanda(str(request.user.company.id), comanda, 'cocina_alert')
        return Response(ComandaSerializer(comanda).data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_item(request, comanda_id, item_id):
    """Actualiza estado de un item (cocina marca como listo, mesero como servido)."""
    try:
        item = ItemComanda.objects.get(id=item_id, comanda__id=comanda_id, comanda__company=request.user.company)
    except ItemComanda.DoesNotExist:
        return Response({'detail': 'Item no encontrado.'}, status=404)

    serializer = ItemComandaSerializer(item, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        comanda = item.comanda
        comanda.recalcular_totales()
        broadcast_comanda(str(request.user.company.id), comanda, 'comanda_update')
        return Response(serializer.data)
    return Response(serializer.errors, status=400)
