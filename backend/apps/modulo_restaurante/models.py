"""
SYNAPSIX ERP — Restaurante Models
Mesas, Comandas, Items y control de cocina.
Multi-tenant: cada registro tiene company FK.
"""
import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.core.models import Company, User
from apps.inventario.models import Product


class Mesa(models.Model):
    """Mesa o punto de venta del restaurante."""
    class Estado(models.TextChoices):
        LIBRE      = 'libre',      _('Libre')
        OCUPADA    = 'ocupada',    _('Ocupada')
        RESERVADA  = 'reservada',  _('Reservada')
        CUENTA     = 'cuenta',     _('Pidiendo Cuenta')
        LIMPIEZA   = 'limpieza',   _('En Limpieza')

    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company    = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='mesas')
    numero     = models.PositiveSmallIntegerField(_('Número de Mesa'))
    nombre     = models.CharField(_('Nombre'), max_length=50, blank=True)
    capacidad  = models.PositiveSmallIntegerField(_('Capacidad'), default=4)
    zona       = models.CharField(_('Zona'), max_length=50, blank=True, default='Principal')
    estado     = models.CharField(_('Estado'), max_length=20, choices=Estado.choices, default=Estado.LIBRE)
    is_active  = models.BooleanField(_('Activa'), default=True)

    class Meta:
        verbose_name = _('Mesa')
        ordering = ['numero']
        unique_together = [['company', 'numero']]

    def __str__(self):
        return f"Mesa {self.numero}{f' ({self.nombre})' if self.nombre else ''}"


class Comanda(models.Model):
    """Orden completa de una mesa."""
    class Estado(models.TextChoices):
        ABIERTA    = 'abierta',    _('Abierta')
        EN_COCINA  = 'en_cocina',  _('En Cocina')
        LISTA      = 'lista',      _('Lista para Servir')
        SERVIDA    = 'servida',    _('Servida')
        PAGADA     = 'pagada',     _('Pagada')
        CANCELADA  = 'cancelada',  _('Cancelada')

    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company      = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='comandas')
    mesa         = models.ForeignKey(Mesa, on_delete=models.PROTECT, related_name='comandas')
    folio        = models.CharField(_('Folio'), max_length=20)
    estado       = models.CharField(_('Estado'), max_length=20, choices=Estado.choices, default=Estado.ABIERTA)
    mesero       = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='comandas_mesero')
    comensales   = models.PositiveSmallIntegerField(_('Comensales'), default=1)
    notas        = models.TextField(_('Notas'), blank=True)
    subtotal     = models.DecimalField(_('Subtotal'), max_digits=12, decimal_places=2, default=0)
    impuestos    = models.DecimalField(_('Impuestos'), max_digits=12, decimal_places=2, default=0)
    total        = models.DecimalField(_('Total'), max_digits=12, decimal_places=2, default=0)
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)
    pagada_at    = models.DateTimeField(_('Pagada en'), null=True, blank=True)

    class Meta:
        verbose_name = _('Comanda')
        ordering = ['-created_at']

    def __str__(self):
        return f"Comanda #{self.folio} - {self.mesa}"

    def recalcular_totales(self):
        items = self.items.filter(cancelado=False)
        self.subtotal = sum(i.subtotal for i in items)
        self.impuestos = self.subtotal * 16 / 100
        self.total = self.subtotal + self.impuestos
        self.save(update_fields=['subtotal', 'impuestos', 'total'])


class ItemComanda(models.Model):
    """Producto dentro de una comanda."""
    class Estado(models.TextChoices):
        PENDIENTE  = 'pendiente',  _('Pendiente')
        EN_COCINA  = 'en_cocina',  _('En Cocina')
        LISTO      = 'listo',      _('Listo')
        SERVIDO    = 'servido',    _('Servido')
        CANCELADO  = 'cancelado',  _('Cancelado')

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    comanda     = models.ForeignKey(Comanda, on_delete=models.CASCADE, related_name='items')
    producto    = models.ForeignKey(Product, on_delete=models.PROTECT)
    cantidad    = models.DecimalField(_('Cantidad'), max_digits=8, decimal_places=2, default=1)
    precio_unit = models.DecimalField(_('Precio Unitario'), max_digits=12, decimal_places=2)
    subtotal    = models.DecimalField(_('Subtotal'), max_digits=12, decimal_places=2)
    estado      = models.CharField(_('Estado'), max_length=20, choices=Estado.choices, default=Estado.PENDIENTE)
    notas       = models.CharField(_('Notas'), max_length=255, blank=True)
    cancelado   = models.BooleanField(default=False)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('Item de Comanda')

    def save(self, *args, **kwargs):
        self.subtotal = self.cantidad * self.precio_unit
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.cantidad}x {self.producto.name}"
