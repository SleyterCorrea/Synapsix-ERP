from django.contrib import admin
from .models import WebPage, WebContact

@admin.register(WebPage)
class WebPageAdmin(admin.ModelAdmin):
    list_display = ['title', 'slug', 'is_published', 'updated_at']
    list_filter = ['is_published']
    search_fields = ['title', 'slug']

@admin.register(WebContact)
class WebContactAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'phone', 'created_at']
    readonly_fields = ['created_at']
    search_fields = ['name', 'email']
