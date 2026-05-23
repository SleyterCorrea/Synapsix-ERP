"""
SYNAPSIX ERP — Inventario Models
Catálogo maestro de productos. ÚNICA fuente de verdad del sistema.
Todos los módulos (Restaurante, E-commerce, Facturación) consumen datos
exclusivamente de este catálogo para evitar duplicidad de información.
"""
import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.core.models import Company, User


# ─────────────────────────────────────────────────────────────────────────────
# CATEGORÍAS
# ─────────────────────────────────────────────────────────────────────────────
class Category(models.Model):
    """Categoría de producto. Soporta jerarquía (subcategorías)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name='categories', verbose_name=_('Empresa')
    )
    name = models.CharField(_('Nombre'), max_length=150)
    slug = models.SlugField(_('Slug'), max_length=150)
    description = models.TextField(_('Descripción'), blank=True)
    icon = models.CharField(_('Ícono'), max_length=50, blank=True)
    color = models.CharField(_('Color'), max_length=7, default='#C0392B')
    parent = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='children',
        verbose_name=_('Categoría Padre')
    )
    order = models.PositiveSmallIntegerField(_('Orden'), default=0)
    is_active = models.BooleanField(_('Activa'), default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('Categoría')
        verbose_name_plural = _('Categorías')
        ordering = ['order', 'name']
        unique_together = [['company', 'slug']]

    def __str__(self):
        return self.name


# ─────────────────────────────────────────────────────────────────────────────
# UNIDADES DE MEDIDA
# ─────────────────────────────────────────────────────────────────────────────
class UnitOfMeasure(models.Model):
    """Unidades de medida: kg, L, pza, caja, etc."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(_('Nombre'), max_length=50)
    abbreviation = models.CharField(_('Abreviatura'), max_length=10)

    class Meta:
        verbose_name = _('Unidad de Medida')
        verbose_name_plural = _('Unidades de Medida')
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.abbreviation})"


# ─────────────────────────────────────────────────────────────────────────────
# PRODUCTO (Catálogo Maestro)
# ─────────────────────────────────────────────────────────────────────────────
class Product(models.Model):
    """
    Producto del catálogo maestro de Synapsix.
    Este es el registro canónico de cada artículo.
    Los módulos de restaurante, e-commerce y facturación referencian
    este modelo directamente — nunca duplican la información.
    """
    class ProductType(models.TextChoices):
        PRODUCT = 'product', _('Producto Físico')
        SERVICE = 'service', _('Servicio')
        CONSUMABLE = 'consumable', _('Consumible')
        DIGITAL = 'digital', _('Digital')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name='products', verbose_name=_('Empresa')
    )

    # Identificadores
    sku = models.CharField(_('SKU'), max_length=100, blank=True)
    barcode = models.CharField(_('Código de Barras'), max_length=100, blank=True)
    name = models.CharField(_('Nombre'), max_length=255)
    description = models.TextField(_('Descripción'), blank=True)
    product_type = models.CharField(
        _('Tipo de Producto'),
        max_length=20,
        choices=ProductType.choices,
        default=ProductType.PRODUCT
    )

    # Categorización
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='products',
        verbose_name=_('Categoría')
    )
    unit = models.ForeignKey(
        UnitOfMeasure,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        verbose_name=_('Unidad')
    )

    # Precios
    cost_price = models.DecimalField(_('Precio de Costo'), max_digits=12, decimal_places=2, default=0)
    sale_price = models.DecimalField(_('Precio de Venta'), max_digits=12, decimal_places=2, default=0)
    tax_rate = models.DecimalField(_('% IVA/Impuesto'), max_digits=5, decimal_places=2, default=16.00)

    # Inventario
    track_stock = models.BooleanField(_('Controlar Stock'), default=True)
    stock_quantity = models.DecimalField(_('Stock Actual'), max_digits=12, decimal_places=3, default=0)
    min_stock = models.DecimalField(_('Stock Mínimo'), max_digits=12, decimal_places=3, default=0)
    max_stock = models.DecimalField(_('Stock Máximo'), max_digits=12, decimal_places=3, default=0)

    # Imagen
    image = models.ImageField(_('Imagen'), upload_to='products/', blank=True, null=True)

    # Estado
    is_active = models.BooleanField(_('Activo'), default=True)
    is_available = models.BooleanField(_('Disponible para Venta'), default=True)

    # Auditoría
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='products_created', verbose_name=_('Creado por')
    )
    created_at = models.DateTimeField(_('Creado'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Actualizado'), auto_now=True)

    class Meta:
        verbose_name = _('Producto')
        verbose_name_plural = _('Productos')
        ordering = ['name']
        unique_together = [['company', 'sku']]
        indexes = [
            models.Index(fields=['company', 'is_active']),
            models.Index(fields=['company', 'category']),
            models.Index(fields=['sku']),
            models.Index(fields=['barcode']),
        ]

    def __str__(self):
        return f"[{self.sku}] {self.name}" if self.sku else self.name

    @property
    def is_low_stock(self):
        return self.track_stock and self.stock_quantity <= self.min_stock

    @property
    def final_price(self):
        """Precio con impuesto incluido."""
        return self.sale_price * (1 + self.tax_rate / 100)


# ─────────────────────────────────────────────────────────────────────────────
# MOVIMIENTOS DE STOCK
# ─────────────────────────────────────────────────────────────────────────────
class StockMovement(models.Model):
    """
    Registro inmutable de todos los movimientos de inventario.
    Cada entrada, salida, ajuste o transferencia queda registrada aquí.
    """
    class MovementType(models.TextChoices):
        IN = 'in', _('Entrada')
        OUT = 'out', _('Salida')
        ADJUSTMENT = 'adjustment', _('Ajuste')
        TRANSFER = 'transfer', _('Transferencia')
        RETURN = 'return', _('Devolución')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name='movements',
        verbose_name=_('Producto')
    )
    movement_type = models.CharField(
        _('Tipo'), max_length=20, choices=MovementType.choices
    )
    quantity = models.DecimalField(_('Cantidad'), max_digits=12, decimal_places=3)
    quantity_before = models.DecimalField(_('Stock Antes'), max_digits=12, decimal_places=3)
    quantity_after = models.DecimalField(_('Stock Después'), max_digits=12, decimal_places=3)
    unit_cost = models.DecimalField(_('Costo Unitario'), max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(_('Notas'), blank=True)
    reference = models.CharField(_('Referencia'), max_length=100, blank=True)  # Ej: Factura #001
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True,
        verbose_name=_('Registrado por')
    )
    created_at = models.DateTimeField(_('Fecha'), auto_now_add=True)

    class Meta:
        verbose_name = _('Movimiento de Stock')
        verbose_name_plural = _('Movimientos de Stock')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_movement_type_display()} | {self.product.name} | {self.quantity}"

    def save(self, *args, **kwargs):
        """Actualiza el stock del producto al registrar el movimiento."""
        if not self.pk:  # Solo en creación
            self.quantity_before = self.product.stock_quantity
            if self.movement_type == self.MovementType.IN:
                self.quantity_after = self.quantity_before + self.quantity
            elif self.movement_type in [self.MovementType.OUT, self.MovementType.RETURN]:
                self.quantity_after = self.quantity_before - self.quantity
            else:
                self.quantity_after = self.quantity  # Ajuste directo

            # Actualizar stock del producto
            self.product.stock_quantity = self.quantity_after
            self.product.save(update_fields=['stock_quantity'])

        super().save(*args, **kwargs)
