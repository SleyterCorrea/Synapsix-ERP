"""
SYNAPSIX ERP — Facturación Views
Dashboard contable, CRUD de facturas, acciones de flujo y partida doble.
"""
from decimal import Decimal
from django.db import models as dj_models, transaction
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend

from .models import (
    Account, Journal, BankAccount, Partner,
    Invoice, InvoiceLine, JournalEntry, JournalItem, InvoiceChatter
)
from .serializers import (
    AccountSerializer, JournalSerializer, BankAccountSerializer, PartnerSerializer,
    InvoiceListSerializer, InvoiceDetailSerializer,
    JournalEntrySerializer, InvoiceChatterSerializer,
)


# ─────────────────────────────────────────────────────────────────────────────
# PLAN DE CUENTAS
# ─────────────────────────────────────────────────────────────────────────────
class AccountListView(generics.ListCreateAPIView):
    serializer_class   = AccountSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends    = [SearchFilter]
    search_fields      = ['code', 'name']

    def get_queryset(self):
        qs = Account.objects.filter(company=self.request.user.company, is_active=True)
        account_type = self.request.query_params.get('type')
        if account_type:
            qs = qs.filter(account_type=account_type)
        return qs

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class AccountDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = AccountSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Account.objects.filter(company=self.request.user.company)


# ─────────────────────────────────────────────────────────────────────────────
# DIARIOS
# ─────────────────────────────────────────────────────────────────────────────
class JournalListView(generics.ListCreateAPIView):
    serializer_class   = JournalSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Journal.objects.filter(company=self.request.user.company, is_active=True)
        journal_type = self.request.query_params.get('type')
        if journal_type:
            qs = qs.filter(journal_type=journal_type)
        return qs

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


# ─────────────────────────────────────────────────────────────────────────────
# BANCOS
# ─────────────────────────────────────────────────────────────────────────────
class BankAccountListView(generics.ListCreateAPIView):
    serializer_class   = BankAccountSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return BankAccount.objects.filter(
            company=self.request.user.company, is_active=True
        ).select_related('account', 'journal')

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class BankAccountDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = BankAccountSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return BankAccount.objects.filter(company=self.request.user.company)


# ─────────────────────────────────────────────────────────────────────────────
# CONTACTOS (Partners)
# ─────────────────────────────────────────────────────────────────────────────
class PartnerListView(generics.ListCreateAPIView):
    serializer_class   = PartnerSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends    = [SearchFilter]
    search_fields      = ['name', 'tax_id', 'email']

    def get_queryset(self):
        qs = Partner.objects.filter(company=self.request.user.company, is_active=True)
        ptype = self.request.query_params.get('type')
        if ptype:
            qs = qs.filter(partner_type__in=[ptype, 'both'])
        return qs

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


# ─────────────────────────────────────────────────────────────────────────────
# FACTURAS
# ─────────────────────────────────────────────────────────────────────────────
class InvoiceListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields   = ['state', 'invoice_type']
    search_fields      = ['invoice_number', 'partner__name']
    ordering_fields    = ['date', 'total', 'created_at']
    ordering           = ['-date', '-created_at']

    def get_serializer_class(self):
        return InvoiceDetailSerializer if self.request.method == 'POST' else InvoiceListSerializer

    def get_queryset(self):
        return Invoice.objects.filter(
            company=self.request.user.company
        ).select_related('partner', 'journal')

    def perform_create(self, serializer):
        serializer.save(
            company=self.request.user.company,
            created_by=self.request.user,
        )


class InvoiceDetailView(generics.RetrieveUpdateAPIView):
    serializer_class   = InvoiceDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Invoice.objects.filter(
            company=self.request.user.company
        ).select_related('partner', 'journal').prefetch_related('lines', 'chatter')

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


# ─────────────────────────────────────────────────────────────────────────────
# ACCIÓN DE FACTURA (confirm / pay / cancel)
# ─────────────────────────────────────────────────────────────────────────────
class InvoiceActionView(APIView):
    """
    POST /api/v1/facturacion/invoices/<id>/action/
    Body: { "action": "confirm" | "pay" | "cancel" }

    - confirm → draft  → posted  (genera JournalEntry)
    - pay     → posted → paid    (marca amount_due = 0)
    - cancel  → any   → cancelled
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            invoice = Invoice.objects.select_related('partner', 'journal').get(
                pk=pk, company=request.user.company
            )
        except Invoice.DoesNotExist:
            return Response({'detail': 'Factura no encontrada.'}, status=404)

        action = request.data.get('action', '')

        with transaction.atomic():
            if action == 'confirm':
                if invoice.state != Invoice.State.DRAFT:
                    return Response({'detail': 'Solo se pueden confirmar borradores.'}, status=400)
                invoice.state = Invoice.State.POSTED
                invoice.save()
                self._create_journal_entry(invoice, request.user)
                self._log_chatter(invoice, request.user, 'change',
                                  f'Estado cambiado: Borrador → Registrado')

            elif action == 'pay':
                if invoice.state not in [Invoice.State.POSTED]:
                    return Response({'detail': 'Solo se pueden pagar facturas registradas.'}, status=400)
                invoice.state      = Invoice.State.PAID
                invoice.amount_due = Decimal('0')
                invoice.save()
                self._log_chatter(invoice, request.user, 'change',
                                  f'Estado de pago: Sin pagar → Pagado')

            elif action == 'cancel':
                if invoice.state == Invoice.State.PAID:
                    return Response({'detail': 'No se puede cancelar una factura pagada.'}, status=400)
                invoice.state = Invoice.State.CANCELLED
                invoice.save()
                self._log_chatter(invoice, request.user, 'change',
                                  f'Factura cancelada')

            else:
                return Response({'detail': f'Acción "{action}" no válida.'}, status=400)

        return Response(InvoiceDetailSerializer(invoice, context={'request': request}).data)

    def _create_journal_entry(self, invoice: Invoice, user):
        """
        Genera el asiento de partida doble al confirmar la factura.
        Venta: Debit → Cuenta por Cobrar / Credit → Cuenta de Ingresos
        Compra: Debit → Cuenta de Gasto / Credit → Cuenta por Pagar
        """
        if not invoice.journal:
            return

        entry = JournalEntry.objects.create(
            company   = invoice.company,
            journal   = invoice.journal,
            invoice   = invoice,
            reference = invoice.invoice_number or str(invoice.pk)[:8],
            date      = invoice.date,
            state     = JournalEntry.EntryState.POSTED,
            narration = f'Asiento generado automáticamente por {invoice.invoice_type}: {invoice.invoice_number}',
            created_by= user,
        )

        # Obtener o crear cuentas por defecto según tipo de diario
        if invoice.journal.default_account:
            income_account = invoice.journal.default_account
        else:
            # Fallback: primera cuenta de tipo income/expense de la empresa
            account_type = 'income' if invoice.invoice_type == Invoice.InvoiceType.SALE else 'expense'
            income_account = Account.objects.filter(
                company=invoice.company, account_type=account_type
            ).first()

        receivable_account = Account.objects.filter(
            company=invoice.company,
            account_type='asset'
        ).first()

        if not income_account or not receivable_account:
            # Sin cuentas configuradas, crear apunte simple de referencia
            JournalItem.objects.create(
                entry   = entry,
                account = income_account or receivable_account,
                name    = f'Factura {invoice.invoice_number}',
                debit   = invoice.total if invoice.invoice_type == Invoice.InvoiceType.SALE else Decimal('0'),
                credit  = Decimal('0') if invoice.invoice_type == Invoice.InvoiceType.SALE else invoice.total,
            )
            return

        # Asiento de venta: DR Cuentas por Cobrar / CR Ingresos + IVA
        if invoice.invoice_type == Invoice.InvoiceType.SALE:
            JournalItem.objects.create(
                entry=entry, account=receivable_account, partner=invoice.partner,
                name=f'Por cobrar — {invoice.partner}',
                debit=invoice.total, credit=Decimal('0')
            )
            JournalItem.objects.create(
                entry=entry, account=income_account, partner=invoice.partner,
                name=f'Ingresos — {invoice.invoice_number}',
                debit=Decimal('0'), credit=invoice.subtotal
            )
            # IVA si existe cuenta fiscal
            if invoice.tax_amount > 0:
                tax_account = Account.objects.filter(
                    company=invoice.company, account_type='liability'
                ).first()
                if tax_account:
                    JournalItem.objects.create(
                        entry=entry, account=tax_account,
                        name=f'IVA por pagar',
                        debit=Decimal('0'), credit=invoice.tax_amount
                    )
        # Asiento de compra: DR Gastos / CR Cuentas por Pagar
        else:
            payable_account = Account.objects.filter(
                company=invoice.company, account_type='liability'
            ).first() or receivable_account

            JournalItem.objects.create(
                entry=entry, account=income_account, partner=invoice.partner,
                name=f'Gasto — {invoice.invoice_number}',
                debit=invoice.subtotal, credit=Decimal('0')
            )
            JournalItem.objects.create(
                entry=entry, account=payable_account, partner=invoice.partner,
                name=f'Por pagar — {invoice.partner}',
                debit=Decimal('0'), credit=invoice.total
            )

    def _log_chatter(self, invoice, user, entry_type, body):
        InvoiceChatter.objects.create(
            invoice=invoice, author=user, entry_type=entry_type, body=body
        )


# ─────────────────────────────────────────────────────────────────────────────
# LÍNEAS DE FACTURA
# ─────────────────────────────────────────────────────────────────────────────
class InvoiceLineListView(generics.ListCreateAPIView):
    serializer_class   = InvoiceDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return InvoiceLine.objects.filter(
            invoice__company=self.request.user.company,
            invoice__pk=self.kwargs['invoice_pk']
        )


# ─────────────────────────────────────────────────────────────────────────────
# CHATTER
# ─────────────────────────────────────────────────────────────────────────────
class InvoiceChatterListView(generics.ListCreateAPIView):
    serializer_class   = InvoiceChatterSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return InvoiceChatter.objects.filter(
            invoice__company=self.request.user.company,
            invoice__pk=self.kwargs['invoice_pk']
        )

    def perform_create(self, serializer):
        invoice = Invoice.objects.get(
            pk=self.kwargs['invoice_pk'],
            company=self.request.user.company
        )
        serializer.save(author=self.request.user, invoice=invoice, entry_type='message')


# ─────────────────────────────────────────────────────────────────────────────
# ASIENTOS CONTABLES
# ─────────────────────────────────────────────────────────────────────────────
class JournalEntryListView(generics.ListAPIView):
    serializer_class   = JournalEntrySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, OrderingFilter]
    filterset_fields   = ['state', 'journal']
    ordering           = ['-date']

    def get_queryset(self):
        return JournalEntry.objects.filter(
            company=self.request.user.company
        ).select_related('journal').prefetch_related('items__account')


# ─────────────────────────────────────────────────────────────────────────────
# TABLERO CONTABLE
# ─────────────────────────────────────────────────────────────────────────────
class AccountingDashboardView(APIView):
    """
    GET /api/v1/facturacion/dashboard/
    Retorna resumen financiero completo del tenant:
    - Ventas y Compras: conteos y montos por estado
    - Bancos: saldos reales calculados desde apuntes
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        company = request.user.company
        today   = timezone.now().date()

        def journal_summary(journal_type: str):
            journals = Journal.objects.filter(company=company, journal_type=journal_type, is_active=True)
            result = []
            for j in journals:
                base = Invoice.objects.filter(company=company, journal=j)

                draft_qs  = base.filter(state='draft')
                posted_qs = base.filter(state='posted')
                overdue_qs= base.filter(state='posted', due_date__lt=today, due_date__isnull=False)

                def agg(qs):
                    return qs.aggregate(
                        count=dj_models.Count('id'),
                        amount=dj_models.Sum('total')
                    )

                d = agg(draft_qs)
                p = agg(posted_qs)
                o = agg(overdue_qs)

                result.append({
                    'journal_id':    str(j.id),
                    'journal_name':  j.name,
                    'journal_code':  j.code,
                    'journal_type':  j.journal_type,
                    'draft_count':   d['count'] or 0,
                    'draft_amount':  d['amount'] or Decimal('0'),
                    'posted_count':  p['count'] or 0,
                    'posted_amount': p['amount'] or Decimal('0'),
                    'overdue_count': o['count'] or 0,
                    'overdue_amount':o['amount'] or Decimal('0'),
                })
            return result

        # Bancos con saldo real
        banks = BankAccount.objects.filter(
            company=company, is_active=True
        ).select_related('account', 'journal')

        banks_data = []
        for bank in banks:
            items = JournalItem.objects.filter(account=bank.account)
            debits  = items.aggregate(t=dj_models.Sum('debit'))['t']  or Decimal('0')
            credits = items.aggregate(t=dj_models.Sum('credit'))['t'] or Decimal('0')
            balance = float(debits - credits)
            banks_data.append({
                'id':             str(bank.id),
                'name':           bank.name,
                'bank_name':      bank.bank_name,
                'account_number': bank.account_number,
                'currency':       bank.currency,
                'balance':        balance,
                'account_name':   bank.account.name,
                'account_code':   bank.account.code,
                'journal':        str(bank.journal.id) if bank.journal else None,
                'is_active':      bank.is_active,
            })

        return Response({
            'sales':     journal_summary('sale'),
            'purchases': journal_summary('purchase'),
            'banks':     banks_data,
        })
