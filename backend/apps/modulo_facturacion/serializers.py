"""
SYNAPSIX ERP — Facturación Serializers
Garantiza alineación estricta de campos entre Django y React.
"""
from decimal import Decimal
from django.db import models as dj_models
from rest_framework import serializers
from .models import (
    Account, Journal, BankAccount, Partner,
    Invoice, InvoiceLine, JournalEntry, JournalItem, InvoiceChatter
)


# ─────────────────────────────────────────────────────────────────────────────
class AccountSerializer(serializers.ModelSerializer):
    account_type_display = serializers.CharField(
        source='get_account_type_display', read_only=True
    )

    class Meta:
        model  = Account
        fields = ['id', 'code', 'name', 'account_type', 'account_type_display', 'is_active']


# ─────────────────────────────────────────────────────────────────────────────
class JournalSerializer(serializers.ModelSerializer):
    journal_type_display = serializers.CharField(
        source='get_journal_type_display', read_only=True
    )

    class Meta:
        model  = Journal
        fields = ['id', 'name', 'code', 'journal_type', 'journal_type_display', 'currency', 'is_active']


# ─────────────────────────────────────────────────────────────────────────────
class BankAccountSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source='account.name', read_only=True)
    account_code = serializers.CharField(source='account.code', read_only=True)
    balance      = serializers.SerializerMethodField()

    class Meta:
        model  = BankAccount
        fields = [
            'id', 'name', 'bank_name', 'account_number', 'currency',
            'account', 'account_name', 'account_code',
            'journal', 'balance', 'is_active',
        ]

    def get_balance(self, obj):
        """Calcula el saldo real desde los apuntes contables."""
        try:
            items = JournalItem.objects.filter(account=obj.account)
            debits  = items.aggregate(t=dj_models.Sum('debit'))['t']  or Decimal('0')
            credits = items.aggregate(t=dj_models.Sum('credit'))['t'] or Decimal('0')
            return float(debits - credits)
        except Exception:
            return 0.0


# ─────────────────────────────────────────────────────────────────────────────
class PartnerSerializer(serializers.ModelSerializer):
    partner_type_display = serializers.CharField(
        source='get_partner_type_display', read_only=True
    )

    class Meta:
        model  = Partner
        fields = [
            'id', 'name', 'tax_id', 'email', 'phone', 'address',
            'partner_type', 'partner_type_display', 'is_active',
        ]


# ─────────────────────────────────────────────────────────────────────────────
class InvoiceLineSerializer(serializers.ModelSerializer):
    class Meta:
        model  = InvoiceLine
        fields = [
            'id', 'product_name', 'description', 'account',
            'quantity', 'price_unit', 'tax_percentage', 'discount',
            'amount_subtotal', 'amount_tax', 'amount_total', 'order',
        ]


# ─────────────────────────────────────────────────────────────────────────────
class InvoiceListSerializer(serializers.ModelSerializer):
    """Serializer ligero para listas de facturas."""
    partner_name         = serializers.CharField(source='partner.name',               read_only=True, default='—')
    state_display        = serializers.CharField(source='get_state_display',           read_only=True)
    invoice_type_display = serializers.CharField(source='get_invoice_type_display',    read_only=True)
    has_pdf              = serializers.SerializerMethodField()
    has_xml              = serializers.SerializerMethodField()
    is_overdue           = serializers.SerializerMethodField()

    class Meta:
        model  = Invoice
        fields = [
            'id', 'invoice_number', 'invoice_type', 'invoice_type_display',
            'partner_name', 'date', 'due_date',
            'subtotal', 'tax_amount', 'total', 'amount_due',
            'state', 'state_display',
            'has_pdf', 'has_xml', 'is_overdue',
        ]

    def get_has_pdf(self, obj):
        return bool(obj.pdf_file)

    def get_has_xml(self, obj):
        return bool(obj.xml_file)

    def get_is_overdue(self, obj):
        if obj.state in ['posted'] and obj.due_date:
            from django.utils import timezone
            return obj.due_date < timezone.now().date()
        return False


# ─────────────────────────────────────────────────────────────────────────────
class InvoiceDetailSerializer(serializers.ModelSerializer):
    """Serializer completo para el detalle y creación de facturas."""
    lines          = InvoiceLineSerializer(many=True, read_only=True)
    partner_data   = PartnerSerializer(source='partner', read_only=True)
    journal_data   = JournalSerializer(source='journal', read_only=True)
    state_display  = serializers.CharField(source='get_state_display',        read_only=True)
    type_display   = serializers.CharField(source='get_invoice_type_display',  read_only=True)
    pdf_url        = serializers.SerializerMethodField()
    xml_url        = serializers.SerializerMethodField()
    uuid_fiscal    = serializers.UUIDField(read_only=True)

    class Meta:
        model  = Invoice
        fields = [
            'id', 'invoice_number', 'invoice_type', 'type_display',
            'partner', 'partner_data',
            'journal', 'journal_data',
            'date', 'due_date', 'state', 'state_display',
            'subtotal', 'tax_amount', 'total', 'amount_due',
            'notes', 'internal_note',
            'uuid_fiscal', 'pdf_url', 'xml_url',
            'lines', 'created_at', 'updated_at',
        ]

    def get_pdf_url(self, obj):
        request = self.context.get('request')
        if obj.pdf_file and request:
            return request.build_absolute_uri(obj.pdf_file.url)
        return None

    def get_xml_url(self, obj):
        request = self.context.get('request')
        if obj.xml_file and request:
            return request.build_absolute_uri(obj.xml_file.url)
        return None


# ─────────────────────────────────────────────────────────────────────────────
class JournalItemSerializer(serializers.ModelSerializer):
    account_code = serializers.CharField(source='account.code', read_only=True)
    account_name = serializers.CharField(source='account.name', read_only=True)
    partner_name = serializers.CharField(source='partner.name', read_only=True, default='')

    class Meta:
        model  = JournalItem
        fields = [
            'id', 'account', 'account_code', 'account_name',
            'partner', 'partner_name', 'name', 'debit', 'credit',
        ]


class JournalEntrySerializer(serializers.ModelSerializer):
    items         = JournalItemSerializer(many=True, read_only=True)
    journal_name  = serializers.CharField(source='journal.name', read_only=True)
    total_debit   = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    total_credit  = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    is_balanced   = serializers.BooleanField(read_only=True)

    class Meta:
        model  = JournalEntry
        fields = [
            'id', 'reference', 'date', 'state', 'narration',
            'journal', 'journal_name',
            'total_debit', 'total_credit', 'is_balanced',
            'items',
        ]


# ─────────────────────────────────────────────────────────────────────────────
class InvoiceChatterSerializer(serializers.ModelSerializer):
    author_name  = serializers.SerializerMethodField()
    author_initials = serializers.SerializerMethodField()
    type_display = serializers.CharField(source='get_entry_type_display', read_only=True)

    class Meta:
        model  = InvoiceChatter
        fields = [
            'id', 'entry_type', 'type_display', 'body',
            'author', 'author_name', 'author_initials', 'created_at',
        ]
        read_only_fields = ['author', 'created_at']

    def get_author_name(self, obj):
        if obj.author:
            return obj.author.get_full_name() or obj.author.email
        return 'Sistema'

    def get_author_initials(self, obj):
        if obj.author:
            fn = obj.author.first_name or ''
            ln = obj.author.last_name  or ''
            return f"{fn[:1]}{ln[:1]}".upper() or '?'
        return 'SY'


# ─────────────────────────────────────────────────────────────────────────────
# DASHBOARD SERIALIZER
# ─────────────────────────────────────────────────────────────────────────────
class DashboardJournalSummarySerializer(serializers.Serializer):
    """Resumen de un diario para el tablero contable."""
    journal_id   = serializers.UUIDField()
    journal_name = serializers.CharField()
    journal_code = serializers.CharField()
    journal_type = serializers.CharField()
    # Conteos por estado
    draft_count  = serializers.IntegerField()
    draft_amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    posted_count = serializers.IntegerField()
    posted_amount= serializers.DecimalField(max_digits=14, decimal_places=2)
    overdue_count= serializers.IntegerField()
    overdue_amount=serializers.DecimalField(max_digits=14, decimal_places=2)


class AccountingDashboardSerializer(serializers.Serializer):
    """Payload completo del tablero contable."""
    sales     = DashboardJournalSummarySerializer(many=True)
    purchases = DashboardJournalSummarySerializer(many=True)
    banks     = BankAccountSerializer(many=True)
