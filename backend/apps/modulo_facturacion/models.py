"""
SYNAPSIX ERP — Módulo Facturación / Contabilidad
Modelos de contabilidad de partida doble con aislamiento estricto multi-tenant.
Patrón: company = ForeignKey(Company) en cada modelo (igual que inventario/).
"""
import uuid
from decimal import Decimal
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from apps.core.models import Company, User


# ─────────────────────────────────────────────────────────────────────────────
# CUENTA CONTABLE (Plan de Cuentas)
# ─────────────────────────────────────────────────────────────────────────────
class Account(models.Model):
    """
    Cuenta del Plan de Cuentas de la empresa.
    El code es único por empresa (ej: '101.01', '401.01').
    """
    class AccountType(models.TextChoices):
        ASSET     = 'asset',     _('Activo')
        LIABILITY = 'liability', _('Pasivo')
        EQUITY    = 'equity',    _('Patrimonio')
        INCOME    = 'income',    _('Ingreso')
        EXPENSE   = 'expense',   _('Gasto')
        BANK      = 'bank',      _('Banco / Efectivo')

    id      = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name='accounts',
        verbose_name=_('Empresa')
    )
    code = models.CharField(_('Código'), max_length=20)
    name = models.CharField(_('Nombre'), max_length=255)
    account_type = models.CharField(
        _('Tipo'), max_length=20,
        choices=AccountType.choices, default=AccountType.ASSET
    )
    is_active = models.BooleanField(_('Activa'), default=True)
    notes     = models.TextField(_('Notas'), blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name        = _('Cuenta Contable')
        verbose_name_plural = _('Cuentas Contables')
        ordering            = ['code']
        unique_together     = [['company', 'code']]
        indexes             = [models.Index(fields=['company', 'account_type'])]

    def __str__(self):
        return f"{self.code} — {self.name}"


# ─────────────────────────────────────────────────────────────────────────────
# DIARIO CONTABLE
# ─────────────────────────────────────────────────────────────────────────────
class Journal(models.Model):
    """
    Diario contable de la empresa.
    Cada tipo de operación se registra en un diario distinto.
    """
    class JournalType(models.TextChoices):
        SALE     = 'sale',     _('Ventas')
        PURCHASE = 'purchase', _('Compras')
        BANK     = 'bank',     _('Banco')
        CASH     = 'cash',     _('Efectivo')
        GENERAL  = 'general',  _('Diario General')

    id      = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name='journals',
        verbose_name=_('Empresa')
    )
    name         = models.CharField(_('Nombre'), max_length=100)
    code         = models.CharField(_('Código'), max_length=10)   # INV, BILL, BANK
    journal_type = models.CharField(
        _('Tipo'), max_length=20,
        choices=JournalType.choices, default=JournalType.GENERAL
    )
    # Cuenta contable predeterminada para este diario
    default_account = models.ForeignKey(
        Account, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='default_journals', verbose_name=_('Cuenta Predeterminada')
    )
    currency    = models.CharField(_('Moneda'), max_length=3, default='MXN')
    is_active   = models.BooleanField(_('Activo'), default=True)
    sequence    = models.PositiveIntegerField(_('Orden'), default=10)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name        = _('Diario Contable')
        verbose_name_plural = _('Diarios Contables')
        ordering            = ['sequence', 'name']
        unique_together     = [['company', 'code']]

    def __str__(self):
        return f"[{self.code}] {self.name}"


# ─────────────────────────────────────────────────────────────────────────────
# CUENTA BANCARIA DINÁMICA
# ─────────────────────────────────────────────────────────────────────────────
class BankAccount(models.Model):
    """
    Cuenta bancaria de la empresa.
    Completamente dinámica — cada tenant crea sus propios bancos sin hardcoding.
    """
    CURRENCY_CHOICES = [
        ('MXN', 'Peso Mexicano (MXN)'),
        ('PEN', 'Sol Peruano (PEN)'),
        ('USD', 'Dólar Americano (USD)'),
        ('COP', 'Peso Colombiano (COP)'),
        ('EUR', 'Euro (EUR)'),
        ('GTQ', 'Quetzal Guatemalteco (GTQ)'),
    ]

    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company    = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name='bank_accounts',
        verbose_name=_('Empresa')
    )
    name           = models.CharField(_('Nombre de la cuenta'), max_length=200)
    bank_name      = models.CharField(_('Banco'), max_length=100)
    account_number = models.CharField(_('Número de cuenta / CLABE'), max_length=50, blank=True)
    currency       = models.CharField(_('Moneda'), max_length=3, choices=CURRENCY_CHOICES, default='MXN')
    # Cuenta contable asociada (tipo=bank)
    account        = models.ForeignKey(
        Account, on_delete=models.PROTECT, related_name='bank_accounts',
        verbose_name=_('Cuenta Contable')
    )
    journal        = models.ForeignKey(
        Journal, on_delete=models.PROTECT, related_name='bank_accounts',
        verbose_name=_('Diario Bancario'), null=True, blank=True
    )
    is_active  = models.BooleanField(_('Activa'), default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name        = _('Cuenta Bancaria')
        verbose_name_plural = _('Cuentas Bancarias')
        ordering            = ['bank_name', 'name']

    def __str__(self):
        return f"{self.bank_name} — {self.name}"

    @property
    def balance(self):
        """Saldo real calculado desde los apuntes contables."""
        credits = self.account.journal_items.filter(
            entry__company=self.company
        ).aggregate(total=models.Sum('credit'))['total'] or Decimal('0')
        debits  = self.account.journal_items.filter(
            entry__company=self.company
        ).aggregate(total=models.Sum('debit'))['total'] or Decimal('0')
        # Para cuentas de activo/banco: saldo = débito - crédito
        return debits - credits


# ─────────────────────────────────────────────────────────────────────────────
# PARTNER (Cliente / Proveedor)
# ─────────────────────────────────────────────────────────────────────────────
class Partner(models.Model):
    """Cliente o proveedor de la empresa."""
    class PartnerType(models.TextChoices):
        CUSTOMER = 'customer', _('Cliente')
        SUPPLIER = 'supplier', _('Proveedor')
        BOTH     = 'both',     _('Ambos')

    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company    = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name='partners',
        verbose_name=_('Empresa')
    )
    name         = models.CharField(_('Nombre / Razón social'), max_length=255)
    tax_id       = models.CharField(_('RFC / RUC / NIT'), max_length=20, blank=True)
    email        = models.EmailField(_('Email'), blank=True)
    phone        = models.CharField(_('Teléfono'), max_length=30, blank=True)
    address      = models.TextField(_('Dirección'), blank=True)
    partner_type = models.CharField(
        _('Tipo'), max_length=20,
        choices=PartnerType.choices, default=PartnerType.CUSTOMER
    )
    is_active  = models.BooleanField(_('Activo'), default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name        = _('Contacto')
        verbose_name_plural = _('Contactos')
        ordering            = ['name']

    def __str__(self):
        return f"{self.name} ({self.get_partner_type_display()})"


# ─────────────────────────────────────────────────────────────────────────────
# FACTURA
# ─────────────────────────────────────────────────────────────────────────────
class Invoice(models.Model):
    """
    Factura de venta o compra.
    Al confirmarse (estado 'posted'), genera automáticamente su JournalEntry.
    """
    class InvoiceType(models.TextChoices):
        SALE     = 'sale',     _('Factura de Venta')
        PURCHASE = 'purchase', _('Factura de Compra')
        CREDIT   = 'credit',   _('Nota de Crédito')
        DEBIT    = 'debit',    _('Nota de Débito')

    class State(models.TextChoices):
        DRAFT     = 'draft',     _('Borrador')
        POSTED    = 'posted',    _('Registrado')
        PAID      = 'paid',      _('Pagado')
        CANCELLED = 'cancelled', _('Cancelado')

    id      = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name='invoices',
        verbose_name=_('Empresa')
    )

    # Identificación
    invoice_number = models.CharField(_('Número de Factura'), max_length=20, blank=True)
    invoice_type   = models.CharField(
        _('Tipo'), max_length=20,
        choices=InvoiceType.choices, default=InvoiceType.SALE
    )

    # Relaciones principales
    partner = models.ForeignKey(
        Partner, on_delete=models.PROTECT, related_name='invoices',
        verbose_name=_('Cliente / Proveedor'), null=True, blank=True
    )
    journal = models.ForeignKey(
        Journal, on_delete=models.PROTECT, related_name='invoices',
        verbose_name=_('Diario'), null=True, blank=True
    )

    # Fechas
    date     = models.DateField(_('Fecha de Emisión'), default=timezone.now)
    due_date = models.DateField(_('Fecha de Vencimiento'), null=True, blank=True)

    # Estado
    state = models.CharField(
        _('Estado'), max_length=20,
        choices=State.choices, default=State.DRAFT
    )

    # Fiscal (multi-país — opcional)
    uuid_fiscal = models.UUIDField(
        _('UUID Fiscal'), default=uuid.uuid4, editable=False,
        help_text=_('UUID legal del comprobante fiscal (CFDI/FEL/etc.)')
    )

    # Archivos
    pdf_file = models.FileField(
        _('PDF'), upload_to='facturacion/pdf/', blank=True, null=True
    )
    xml_file = models.FileField(
        _('XML / CFDI'), upload_to='facturacion/xml/', blank=True, null=True
    )

    # Totales (calculados, guardados para rendimiento)
    subtotal      = models.DecimalField(_('Subtotal'), max_digits=14, decimal_places=2, default=0)
    tax_amount    = models.DecimalField(_('Impuestos'), max_digits=14, decimal_places=2, default=0)
    total         = models.DecimalField(_('Total'), max_digits=14, decimal_places=2, default=0)
    amount_due    = models.DecimalField(_('Saldo Pendiente'), max_digits=14, decimal_places=2, default=0)

    # Notas
    notes         = models.TextField(_('Notas / Términos'), blank=True)
    internal_note = models.TextField(_('Nota Interna'), blank=True)

    # Auditoría
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='invoices_created', verbose_name=_('Creado por')
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = _('Factura')
        verbose_name_plural = _('Facturas')
        ordering            = ['-date', '-created_at']
        indexes             = [
            models.Index(fields=['company', 'state']),
            models.Index(fields=['company', 'invoice_type']),
            models.Index(fields=['company', 'date']),
        ]

    def __str__(self):
        return f"{self.invoice_number or 'BORRADOR'} — {self.partner}"

    def save(self, *args, **kwargs):
        """Auto-genera el número de factura en la primera confirmación."""
        if not self.invoice_number and self.state != self.State.DRAFT:
            prefix = 'ST' if self.invoice_type == self.InvoiceType.SALE else 'CP'
            last = Invoice.objects.filter(
                company=self.company,
                invoice_type=self.invoice_type,
                invoice_number__startswith=prefix
            ).count()
            self.invoice_number = f"{prefix}{str(last + 1).zfill(3)}"
        super().save(*args, **kwargs)

    def recalculate_totals(self):
        """Recalcula y guarda subtotal, impuestos y total desde las líneas."""
        subtotal   = Decimal('0')
        tax_amount = Decimal('0')
        for line in self.lines.all():
            line_subtotal = line.quantity * line.price_unit * (1 - line.discount / 100)
            line_tax      = line_subtotal * (line.tax_percentage / 100)
            subtotal   += line_subtotal
            tax_amount += line_tax
        self.subtotal   = subtotal
        self.tax_amount = tax_amount
        self.total      = subtotal + tax_amount
        if self.state != self.State.PAID:
            self.amount_due = self.total
        Invoice.objects.filter(pk=self.pk).update(
            subtotal=self.subtotal,
            tax_amount=self.tax_amount,
            total=self.total,
            amount_due=self.amount_due,
        )


# ─────────────────────────────────────────────────────────────────────────────
# LÍNEAS DE FACTURA
# ─────────────────────────────────────────────────────────────────────────────
class InvoiceLine(models.Model):
    """Línea de detalle de la factura (concepto, cantidad, precio)."""
    id      = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(
        Invoice, on_delete=models.CASCADE, related_name='lines',
        verbose_name=_('Factura')
    )
    account = models.ForeignKey(
        Account, on_delete=models.PROTECT, related_name='invoice_lines',
        verbose_name=_('Cuenta Contable'), null=True, blank=True
    )
    product_name   = models.CharField(_('Concepto / Producto'), max_length=255)
    description    = models.TextField(_('Descripción'), blank=True)
    quantity       = models.DecimalField(_('Cantidad'), max_digits=12, decimal_places=3, default=1)
    price_unit     = models.DecimalField(_('Precio Unitario'), max_digits=12, decimal_places=2, default=0)
    tax_percentage = models.DecimalField(_('% Impuesto'), max_digits=5, decimal_places=2, default=Decimal('16.00'))
    discount       = models.DecimalField(_('% Descuento'), max_digits=5, decimal_places=2, default=0)

    # Calculado y guardado para rendimiento
    amount_subtotal = models.DecimalField(_('Subtotal Línea'), max_digits=14, decimal_places=2, default=0)
    amount_tax      = models.DecimalField(_('IVA Línea'), max_digits=14, decimal_places=2, default=0)
    amount_total    = models.DecimalField(_('Total Línea'), max_digits=14, decimal_places=2, default=0)

    order = models.PositiveSmallIntegerField(_('Orden'), default=0)

    class Meta:
        verbose_name        = _('Línea de Factura')
        verbose_name_plural = _('Líneas de Factura')
        ordering            = ['order', 'id']

    def __str__(self):
        return f"{self.product_name} × {self.quantity}"

    def save(self, *args, **kwargs):
        """Calcula subtotal, IVA y total de la línea antes de guardar."""
        subtotal          = self.quantity * self.price_unit * (1 - self.discount / 100)
        tax               = subtotal * (self.tax_percentage / 100)
        self.amount_subtotal = subtotal
        self.amount_tax      = tax
        self.amount_total    = subtotal + tax
        super().save(*args, **kwargs)
        # Actualizar totales de la factura padre
        self.invoice.recalculate_totals()


# ─────────────────────────────────────────────────────────────────────────────
# ASIENTO CONTABLE (Partida Doble)
# ─────────────────────────────────────────────────────────────────────────────
class JournalEntry(models.Model):
    """
    Asiento contable (partida doble).
    Regla de oro: suma(debit) == suma(credit) — validado en clean().
    Se genera automáticamente al confirmar una Factura.
    """
    class EntryState(models.TextChoices):
        DRAFT  = 'draft',  _('Borrador')
        POSTED = 'posted', _('Confirmado')

    id      = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name='journal_entries',
        verbose_name=_('Empresa')
    )
    journal   = models.ForeignKey(
        Journal, on_delete=models.PROTECT, related_name='entries',
        verbose_name=_('Diario')
    )
    invoice   = models.OneToOneField(
        Invoice, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='journal_entry', verbose_name=_('Factura Origen')
    )
    reference = models.CharField(_('Referencia'), max_length=100, blank=True)
    date      = models.DateField(_('Fecha'), default=timezone.now)
    state     = models.CharField(
        _('Estado'), max_length=20,
        choices=EntryState.choices, default=EntryState.DRAFT
    )
    narration  = models.TextField(_('Narración'), blank=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='journal_entries', verbose_name=_('Creado por')
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name        = _('Asiento Contable')
        verbose_name_plural = _('Asientos Contables')
        ordering            = ['-date', '-created_at']

    def __str__(self):
        return f"Asiento {self.reference or str(self.pk)[:8]} — {self.date}"

    def clean(self):
        """Valida que el asiento esté cuadrado (partida doble)."""
        items = self.items.all()
        if items.exists():
            total_debit  = sum(i.debit  for i in items)
            total_credit = sum(i.credit for i in items)
            if total_debit != total_credit:
                raise ValidationError(
                    _(f'Asiento descuadrado: Débito={total_debit} ≠ Crédito={total_credit}')
                )

    @property
    def total_debit(self):
        return self.items.aggregate(t=models.Sum('debit'))['t'] or Decimal('0')

    @property
    def total_credit(self):
        return self.items.aggregate(t=models.Sum('credit'))['t'] or Decimal('0')

    @property
    def is_balanced(self):
        return self.total_debit == self.total_credit


# ─────────────────────────────────────────────────────────────────────────────
# APUNTE CONTABLE (Línea del Asiento)
# ─────────────────────────────────────────────────────────────────────────────
class JournalItem(models.Model):
    """Línea de un asiento contable. Debit XOR Credit en cada línea."""
    id      = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    entry   = models.ForeignKey(
        JournalEntry, on_delete=models.CASCADE, related_name='items',
        verbose_name=_('Asiento')
    )
    account = models.ForeignKey(
        Account, on_delete=models.PROTECT, related_name='journal_items',
        verbose_name=_('Cuenta')
    )
    partner = models.ForeignKey(
        Partner, on_delete=models.SET_NULL, null=True, blank=True,
        verbose_name=_('Contacto')
    )
    name    = models.CharField(_('Descripción'), max_length=255, blank=True)
    debit   = models.DecimalField(_('Débito'), max_digits=14, decimal_places=2, default=0)
    credit  = models.DecimalField(_('Crédito'), max_digits=14, decimal_places=2, default=0)
    date    = models.DateField(_('Fecha'), null=True, blank=True)

    class Meta:
        verbose_name        = _('Apunte Contable')
        verbose_name_plural = _('Apuntes Contables')
        ordering            = ['entry', 'id']

    def __str__(self):
        return f"{self.account.code} | D:{self.debit} C:{self.credit}"

    def clean(self):
        """Un apunte no puede tener debit Y credit simultáneamente."""
        if self.debit > 0 and self.credit > 0:
            raise ValidationError(_('Un apunte no puede tener débito y crédito al mismo tiempo.'))
        if self.debit < 0 or self.credit < 0:
            raise ValidationError(_('Los valores de débito y crédito deben ser ≥ 0.'))


# ─────────────────────────────────────────────────────────────────────────────
# CHATTER DE FACTURA (Log de Auditoría)
# ─────────────────────────────────────────────────────────────────────────────
class InvoiceChatter(models.Model):
    """
    Historial cronológico de cambios y mensajes en una factura.
    Replica el Chatter de Odoo.
    """
    class EntryType(models.TextChoices):
        NOTE    = 'note',    _('Nota')
        CHANGE  = 'change',  _('Cambio de Estado')
        SYSTEM  = 'system',  _('Sistema')
        MESSAGE = 'message', _('Mensaje')

    id      = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(
        Invoice, on_delete=models.CASCADE, related_name='chatter',
        verbose_name=_('Factura')
    )
    author    = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='chatter_entries', verbose_name=_('Autor')
    )
    entry_type = models.CharField(
        _('Tipo'), max_length=20,
        choices=EntryType.choices, default=EntryType.NOTE
    )
    body       = models.TextField(_('Contenido'))
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name        = _('Mensaje del Chatter')
        verbose_name_plural = _('Mensajes del Chatter')
        ordering            = ['-created_at']

    def __str__(self):
        return f"[{self.get_entry_type_display()}] {self.invoice} — {self.created_at:%Y-%m-%d %H:%M}"
