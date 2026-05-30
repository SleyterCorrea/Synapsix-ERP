from rest_framework import serializers
from .models import WebSiteConfig, WebPage, WebContact


class WebSiteConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model  = WebSiteConfig
        fields = '__all__'
        read_only_fields = ['id', 'company', 'updated_at']


class WebPageSerializer(serializers.ModelSerializer):
    class Meta:
        model  = WebPage
        fields = '__all__'
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']


class WebContactSerializer(serializers.ModelSerializer):
    class Meta:
        model  = WebContact
        fields = '__all__'
        read_only_fields = ['id', 'company', 'created_at']
