"""
SYNAPSIX ERP — Facturación URL Configuration
"""
from django.urls import path
from . import views

urlpatterns = [
    # ── Tablero Contable ──────────────────────────────────────────────────────
    path('dashboard/',                    views.AccountingDashboardView.as_view(),    name='accounting-dashboard'),

    # ── Plan de Cuentas ───────────────────────────────────────────────────────
    path('accounts/',                     views.AccountListView.as_view(),            name='account-list'),
    path('accounts/<uuid:pk>/',           views.AccountDetailView.as_view(),          name='account-detail'),

    # ── Diarios ───────────────────────────────────────────────────────────────
    path('journals/',                     views.JournalListView.as_view(),            name='journal-list'),

    # ── Bancos ────────────────────────────────────────────────────────────────
    path('banks/',                        views.BankAccountListView.as_view(),        name='bank-list'),
    path('banks/<uuid:pk>/',              views.BankAccountDetailView.as_view(),      name='bank-detail'),

    # ── Contactos ─────────────────────────────────────────────────────────────
    path('partners/',                     views.PartnerListView.as_view(),            name='partner-list'),

    # ── Facturas ──────────────────────────────────────────────────────────────
    path('invoices/',                     views.InvoiceListCreateView.as_view(),      name='invoice-list'),
    path('invoices/<uuid:pk>/',           views.InvoiceDetailView.as_view(),          name='invoice-detail'),
    path('invoices/<uuid:pk>/action/',    views.InvoiceActionView.as_view(),          name='invoice-action'),

    # ── Chatter de Factura ────────────────────────────────────────────────────
    path('invoices/<uuid:invoice_pk>/chatter/', views.InvoiceChatterListView.as_view(), name='invoice-chatter'),

    # ── Asientos Contables ────────────────────────────────────────────────────
    path('entries/',                      views.JournalEntryListView.as_view(),       name='journal-entry-list'),
]
