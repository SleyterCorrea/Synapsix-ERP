"""
SYNAPSIX ERP — WebSocket URL Routing
"""
from django.urls import path
from .consumers import ChatConsumer, NotificationConsumer, RestauranteConsumer

websocket_urlpatterns = [
    path('ws/chat/',          ChatConsumer.as_asgi()),
    path('ws/notifications/', NotificationConsumer.as_asgi()),
    path('ws/restaurante/',   RestauranteConsumer.as_asgi()),
]
